const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "learning-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Configuration
const config = {
  port: process.env.PORT || 5000,
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
  },
  maxTokens: {
    overview: parseInt(process.env.MAX_TOKENS_OVERVIEW) || 200,
    questions: parseInt(process.env.MAX_TOKENS_QUESTIONS) || 500,
    learningPath: parseInt(process.env.MAX_TOKENS_LEARNING_PATH) || 1000,
  },
};

// Validate required environment variables
const requiredEnvVars = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.method === "POST" ? req.body : undefined,
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Utility functions
class OpenAIService {
  constructor() {
    this.endpoint = config.azureOpenAI.endpoint;
    this.apiKey = config.azureOpenAI.apiKey;
    this.deploymentName = config.azureOpenAI.deploymentName;
    this.apiVersion = config.azureOpenAI.apiVersion;
  }

  async makeRequest(messages, maxTokens = 500, temperature = 0.7) {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    try {
      const response = await axios.post(
        url,
        {
          messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": this.apiKey,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error("Azure OpenAI API request failed", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`OpenAI API request failed: ${error.message}`);
    }
  }

  generateOverviewPrompt(topic, purpose) {
    return `Explain briefly what ${topic} is and why it is useful. Consider the user wants to learn for ${purpose}. Limit the response to 200 words.`;
  }

  generateQuestionsPrompt(topic) {
    return `Generate 3 beginner-level multiple-choice questions about ${topic}.
    Each question should include 4 choices, with the correct choice explicitly labeled in the response. Format it as JSON:
    [
      {
        "question": "Question text",
        "options": ["choice1", "choice2", "choice3", "choice4"],
        "correct": "choiceX"
      }
    ]`;
  }

  generateLearningPathPrompt(
    topic,
    purpose,
    questions,
    answers,
    knowledgeLevel
  ) {
    const questionSummary = questions
      .map(
        (q, index) =>
          `Q${index + 1}: ${q.question}\nAnswer: ${
            answers[index]
          }\nCorrect Answer: ${q.correct}\n`
      )
      .join("\n");

    return `The user is learning about ${topic} with the objective: ${purpose}.
    The user answered the following questions:
    ${questionSummary}
    The user's knowledge level is determined to be: ${knowledgeLevel}.
    Please provide a detailed, actionable learning path for achieving the objective.
    
    Respond in JSON format:
    {
      "learningPath": {
        "objective": "Learn ${topic}",
        "knowledgeLevel": "${knowledgeLevel}",
        "modules": [
          {"title": "Module Title", "description": "Module description", "estimatedTime": "X hours"},
        ]
      }
    }`;
  }
}

// Utility function to clean and parse JSON
function cleanAndParseJSON(content) {
  try {
    const cleanedContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanedContent);
  } catch (error) {
    logger.error("JSON parsing failed", { content, error: error.message });
    throw new Error("Failed to parse JSON response");
  }
}

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validateLearningRequest = [
  body("topic")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Topic must be between 2 and 100 characters"),
  body("learningPurpose")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Learning purpose must be between 5 and 500 characters"),
];

const validateKnowledgeEvaluation = [
  body("answers")
    .isArray({ min: 1, max: 10 })
    .withMessage("Answers must be an array with 1-10 elements"),
  body("questions")
    .isArray({ min: 1, max: 10 })
    .withMessage("Questions must be an array with 1-10 elements"),
  body("purpose")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Purpose must be between 5 and 500 characters"),
  body("topic")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Topic must be between 2 and 100 characters"),
];

const openAIService = new OpenAIService();

// Routes
app.post(
  "/api/submitLearningRequest",
  validateLearningRequest,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { topic, learningPurpose } = req.body;
    const requestId = Date.now().toString();

    logger.info("Processing learning request", {
      requestId,
      topic,
      learningPurpose,
    });

    try {
      // Generate topic overview
      const overviewMessages = [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: openAIService.generateOverviewPrompt(topic, learningPurpose),
        },
      ];

      const overview = await openAIService.makeRequest(
        overviewMessages,
        config.maxTokens.overview
      );

      // Generate topic questions
      const questionsMessages = [
        {
          role: "system",
          content:
            "You are a helpful assistant and an expert learning path planner. Respond only in JSON format.",
        },
        { role: "user", content: openAIService.generateQuestionsPrompt(topic) },
      ];

      const questionsResponse = await openAIService.makeRequest(
        questionsMessages,
        config.maxTokens.questions
      );

      const questions = cleanAndParseJSON(questionsResponse);

      // Save response for debugging (optional)
      if (process.env.NODE_ENV === "development") {
        await fs.mkdir("logs", { recursive: true });
        await fs.writeFile(
          path.join("logs", `questions_${requestId}.json`),
          JSON.stringify(questions, null, 2)
        );
      }

      logger.info("Learning request processed successfully", { requestId });

      res.json({
        success: true,
        data: {
          overview,
          questions,
          requestId,
        },
      });
    } catch (error) {
      logger.error("Error processing learning request", {
        requestId,
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Error generating content",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  })
);

app.post(
  "/api/evaluateKnowledge",
  validateKnowledgeEvaluation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { answers, questions, purpose, topic } = req.body;
    const requestId = Date.now().toString();

    logger.info("Processing knowledge evaluation", {
      requestId,
      topic,
      purpose,
    });

    try {
      // Evaluate score
      let score = 0;
      questions.forEach((q, index) => {
        if (answers[index] === q.correct) {
          score++;
        }
      });

      let knowledgeLevel = "Beginner";
      const totalQuestions = questions.length;
      const scorePercentage = (score / totalQuestions) * 100;

      if (scorePercentage >= 80) knowledgeLevel = "Expert";
      else if (scorePercentage >= 50) knowledgeLevel = "Intermediate";

      // Generate learning path
      const learningPathMessages = [
        {
          role: "system",
          content:
            "You are an expert learning path planner. Create a detailed, personalized learning path based on the user's input. Respond in JSON format.",
        },
        {
          role: "user",
          content: openAIService.generateLearningPathPrompt(
            topic,
            purpose,
            questions,
            answers,
            knowledgeLevel
          ),
        },
      ];

      const learningPathResponse = await openAIService.makeRequest(
        learningPathMessages,
        config.maxTokens.learningPath
      );

      const learningPathJson = cleanAndParseJSON(learningPathResponse);

      logger.info("Knowledge evaluation completed", {
        requestId,
        score,
        knowledgeLevel,
        scorePercentage,
      });

      res.json({
        success: true,
        data: {
          score,
          totalQuestions,
          scorePercentage,
          knowledgeLevel,
          learningPath: learningPathJson,
          requestId,
        },
      });
    } catch (error) {
      logger.error("Error processing knowledge evaluation", {
        requestId,
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Error generating learning path",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  })
);

// Global error handler
app.use((error, req, res, next) => {
  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`, {
    environment: process.env.NODE_ENV || "development",
    port: config.port,
  });
});

// Handle server errors
server.on("error", (error) => {
  logger.error("Server error", { error: error.message });
  process.exit(1);
});

module.exports = app;
