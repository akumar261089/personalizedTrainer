import React, { useState } from "react";
import axios from "axios";
import "./app.css"; // Import external CSS

function App() {
  const [step, setStep] = useState(1); // Track user steps
  const [topic, setTopic] = useState(""); // User topic (text input)
  const [purpose, setPurpose] = useState(""); // User learning purpose (dropdown)
  const [overview, setOverview] = useState(""); // Topic overview
  const [questions, setQuestions] = useState([]); // Questions from backend
  const [answers, setAnswers] = useState([]); // User answers
  const [result, setResult] = useState(null); // Final results and learning path

  // Submit learning request to backend
  const submitLearningRequest = async () => {
    try {
      const response = await axios.post(
        "http://135.13.8.201:5001/api/submitLearningRequest",
        {
          topic,
          learningPurpose: purpose,
        }
      );
      setOverview(response.data.overview); // Set overview from backend response
      setQuestions(response.data.questions); // Set questions
      setStep(2); // Move to next step (quiz)
    } catch (error) {
      console.error("Error fetching learning data:", error);
    }
  };

  // Submit answers to backend
  const submitAnswers = async () => {
    try {
      const response = await axios.post(
        "http://135.13.8.201:5001/api/evaluateKnowledge",
        {
          answers,
          questions,
          purpose,
          topic,
        }
      );
      setResult(response.data); // Store result data (learning path, etc.)
      console.log("Result:", response.data);
      setStep(3); // Move to results step
    } catch (error) {
      console.error("Error submitting answers:", error);
    }
  };

  return (
    <div className="app">
      <h1 className="app-title">Personalized Learning Portal</h1>

      {step === 1 && (
        <div className="step-container">
          <h2 className="step-title">Step 1: Submit Your Learning Request</h2>
          <label className="input-label">
            Topic:
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g., 'React.js')"
              className="text-input"
            />
          </label>
          <br />
          <label className="input-label">
            Purpose of Learning:
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="dropdown"
            >
              <option value="">Select Purpose</option>
              <option value="learning">Learning</option>
              <option value="interview">Interview Preparation</option>
              <option value="development">Development</option>
            </select>
          </label>
          <br />
          <button onClick={submitLearningRequest} className="button">
            Submit Request
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step-container">
          <h2 className="step-title">Step 2: Test Your Knowledge</h2>
          <p className="overview">
            <b>Overview:</b> {overview}
          </p>
          {questions.map((q, index) => (
            <div key={index} className="question-container">
              <p className="question-text">{q.question}</p>
              {q.options.map((option, i) => (
                <label key={i} className="option-label">
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    onChange={() => {
                      const newAnswers = [...answers];
                      newAnswers[index] = option;
                      setAnswers(newAnswers);
                    }}
                    className="radio-input"
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button onClick={submitAnswers} className="button">
            Submit Answers
          </button>
        </div>
      )}

      {step === 3 && result && (
        <div className="step-container">
          <h2 className="step-title">Step 3: Your Learning Path</h2>
          <p className="result-text">
            <b>Learning Score:</b> {result.score}
          </p>
          <p className="result-text">
            <b>Knowledge Level:</b> {result.knowledgeLevel}
          </p>
          <h3 className="modules-title">Modules:</h3>
          <ul className="module-list">
            {result.learfningpathjson.learningPath?.modules?.map(
              (module, index) => (
                <li key={index} className="module-item">
                  <h4 className="module-title">{module.title}</h4>
                  <p className="module-description">{module.description}</p>
                  <ul className="resource-list">
                    {module.activities.map((activity, i) => (
                      <li key={i} className="resource-item">
                        <span className="resource-link">{activity}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
