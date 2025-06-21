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

// GPT-4 prompt templates
const generateOverviewPrompt = (topic, purpose) =>
  `Explain briefly what ${topic} is and why it is useful. Consider the user wants to learn for ${purpose}. Limit the response to 200 words.`;

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

// -------------------------------------
// Submit Learning Request (Overview + Questions)
// -------------------------------------
app.post("/api/submitLearningRequest", async (req, res) => {
  const { topic, learningPurpose } = req.body;

  try {
    // Generate topic overview
    const overviewMessages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: generateOverviewPrompt(topic, learningPurpose) },
    ];

    const overviewResponse = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-12-01-preview`,
      {
        messages: overviewMessages,
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

    const overview = overviewResponse.data.choices[0].message.content.trim();

    // Generate topic questions
    const questionsMessages = [
      {
        role: "system",
        content:
          "You are a helpful assistant and an expert learning path planner. Respond only in JSON format.",
      },
      { role: "user", content: generateQuestionsPrompt(topic) },
    ];

    const questionsResponse = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-12-01-preview`,
      {
        messages: questionsMessages,
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

    const fs = require("fs"); // For file handling

    // Log questions response and save to a file
    console.log(
      "Questions Response Data:",
      questionsResponse.data.choices[0].message.content
    );

    let questions;
    try {
      const rawContent =
        questionsResponse.data.choices[0].message.content.trim();
      fs.writeFileSync("questions_response_raw.txt", rawContent, "utf-8");
      // Remove any unwanted formatting (e.g., "json\n", Markdown-style code blocks)
      const cleanedContent = rawContent
        .replace(/```json/, "") // Remove starting ```json
        .replace(/```/, "") // Remove ending ```
        .trim(); // Trim whitespace
      // Parse cleaned content
      questions = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(
        "Error parsing questions JSON:",
        parseError.message || parseError
      );
      fs.writeFileSync(
        "questions_parsing_error.txt",
        parseError.message,
        "utf-8"
      );
      return res.status(500).json({
        message: "Error parsing questions response",
        error: parseError.message,
      });
    }

    // Return generated overview and questions
    res.json({
      overview,
      questions,
    });
  } catch (error) {
    console.error(
      "Error communicating with Azure OpenAI:",
      error.message || error.response?.data
    );
    res.status(500).json({
      message: "Error generating content",
      error: error.message || error.response?.data,
    });
  }
});

// -------------------------------------
// Evaluate Knowledge + Generate Learning Path
// -------------------------------------
app.post("/api/evaluateKnowledge", async (req, res) => {
  const { answers, questions, purpose, topic } = req.body;

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

  try {
    const learningPathMessages = [
      {
        role: "system",
        content:
          "You are an expert learning path planner. Create a detailed, personalized learning path based on the user's input. Respond in JSON format.",
      },
      {
        role: "user",
        content: `The user is learning about ${topic} with the objective: ${purpose}.
        The user answered the following questions:
        ${questions
          .map(
            (q, index) =>
              `Q${index + 1}: ${q.question}\nAnswer: ${
                answers[index]
              }\nCorrect Answer: ${q.correct}\n`
          )
          .join("\n")}
        The user's knowledge level is determined to be: ${knowledgeLevel}.
        Please provide a detailed, actionable learning path for achieving the objective.
        
        sample - 
        { "learningPath": {
            "objective": "Learn React",
            "knowledgeLevel": "Intermediate",
            "modules": [
                    {"title": "React Basics", "description": "Learn the fundamentals of React, including components, state, and props.", "resources": ["https://reactjs.org/docs/getting-started.html", "https://www.freecodecamp.org/learn/front-end-development-libraries/#react"]},
                    {"title": "Advanced React", "description": "Dive deeper into React with hooks, context, and performance optimization.", "resources": ["https://reactjs.org/docs/hooks-intro.html", "https://kentcdodds.com/blog/advanced-react-hooks"]},
                ]
            }
        }
        `,
      },
    ];

    const learningPathResponse = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-12-01-preview`,
      {
        messages: learningPathMessages,
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OPENAI_API_KEY,
        },
      }
    );

    const learningPath = learningPathResponse.data.choices[0].message.content
      .replace(/```json/, "")
      .replace(/```/, "")
      .trim();
    learfningpathjson = JSON.parse(learningPath);

    // Return evaluated knowledge and learning path
    res.json({
      score,
      knowledgeLevel,
      learfningpathjson,
    });
  } catch (error) {
    console.error(
      "Error generating learning path:",
      error.message || error.response?.data
    );
    res.status(500).json({
      message: "Error generating learning path",
      error: error.message || error.response?.data,
    });
  }
});

// -------------------------------------
// Start Server
// -------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
