const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config(); // For loading environment variables

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Load environment variables (Azure OpenAI API details)
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT; // e.g., https://your-openai-instance.openai.azure.com
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;

// GPT-4 prompt template
const generateOverviewPrompt = (topic) =>
  `Explain briefly what ${topic} is and why it is useful in web development. Limit the response to 200 words.`;

const generateQuestionsPrompt = (topic) =>
  `Generate 3 beginner-level multiple-choice questions about ${topic}. 
  Each question should include 4 choices, with the correct choice explicitly labeled in the response. Format it as JSON:
  [
    { 
      "question": "Question text",
      "options": ["choice1", "choice2", "choice3", "choice4"],
      "correct": "choiceX"
    }
  ]`;

// API to handle submission of learning request
app.post("/api/submitLearningRequest", async (req, res) => {
  const { topic } = req.body;

  try {
    // Generate topic overview
    const overviewPrompt = generateOverviewPrompt(topic);
    const overviewResponse = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4/completions`,
      {
        prompt: overviewPrompt,
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OPENAI_API_KEY,
        },
      }
    );

    const overview = overviewResponse.data.choices[0].text.trim();

    // Generate questions
    const questionsPrompt = generateQuestionsPrompt(topic);
    const questionsResponse = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4/completions`,
      {
        prompt: questionsPrompt,
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OPENAI_API_KEY,
        },
      }
    );

    const questions = JSON.parse(questionsResponse.data.choices[0].text.trim());

    // Respond with generated overview and questions
    res.json({
      overview,
      questions,
    });
  } catch (error) {
    console.error("Error communicating with Azure OpenAI:", error);
    res.status(500).json({ message: "Error generating content" });
  }
});

// API to evaluate knowledge
app.post("/api/evaluateKnowledge", (req, res) => {
  const { answers, questions } = req.body;

  // Evaluate score
  let score = 0;
  questions.forEach((q, index) => {
    if (answers[index] === q.correct) {
      score++;
    }
  });

  let knowledgeLevel = "Beginner";
  if (score >= Math.ceil(questions.length / 2)) knowledgeLevel = "Intermediate";
  if (score === questions.length) knowledgeLevel = "Expert";

  // Generate learning path recommendations
  const learningPath = [
    "Introduction to Basics",
    "Learn Core Concepts",
    "Apply Concepts Through Projects",
    "Advanced Topics and Optimization",
    "Prepare for Job Interviews",
  ];

  res.json({
    score,
    knowledgeLevel,
    learningPath,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
