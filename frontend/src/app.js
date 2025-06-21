import React, { useState } from "react";
import axios from "axios";

function App() {
  const [step, setStep] = useState(1); // Track user steps
  const [topic, setTopic] = useState("react"); // Set default topic
  const [purpose, setPurpose] = useState(""); // User learning purpose
  const [overview, setOverview] = useState(""); // Topic overview text
  const [questions, setQuestions] = useState([]); // Questions from backend
  const [answers, setAnswers] = useState([]); // User's answers to questions
  const [result, setResult] = useState(null); // Final results and learning path

  // Submit learning request to backend
  const submitLearningRequest = async () => {
    try {
      const response = await axios.post(
        "http://135.13.8.201:5001/api/submitLearningRequest",
        {
          topic, // Topic selected by user
          learningPurpose: purpose, // Purpose input by user
        }
      );
      setOverview(response.data.overview); // Set overview text
      setQuestions(response.data.questions); // Set questions array
      setStep(2); // Move to next step (quiz)
    } catch (error) {
      console.error("Error fetching learning data:", error);
    }
  };

  // Submit user's answers to backend
  const submitAnswers = async () => {
    try {
      const response = await axios.post(
        "http://135.13.8.201:5001/api/evaluateKnowledge",
        {
          answers, // User's answers sent to backend
          questions,
          purpose,
          topic, // Pass the topic for contextual evaluation
        }
      );
      setResult(response.data); // Store result state
      console.log("Result:", response.data);
      setStep(3); // Move to result step
    } catch (error) {
      console.error("Error submitting answers:", error);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Personalized Learning Portal</h1>

      {step === 1 && (
        <>
          <h2>Step 1: Submit Your Learning Request</h2>
          <label>
            Topic:
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="react">React.js</option>
              {/* Add more topics as needed */}
            </select>
          </label>
          <br />
          <label>
            Purpose of Learning:
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </label>
          <br />
          <button onClick={submitLearningRequest}>Submit Request</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Step 2: Test Your Knowledge</h2>
          <p>
            <b>Overview:</b> {overview}
          </p>
          {questions.map((q, index) => (
            <div key={index}>
              <p>{q.question}</p>
              {q.options.map((option, i) => (
                <label key={i}>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    onChange={() => {
                      const newAnswers = [...answers];
                      newAnswers[index] = option;
                      setAnswers(newAnswers);
                    }}
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <button onClick={submitAnswers}>Submit Answers</button>
        </>
      )}

      {step === 3 && result && (
        <>
          <h2>Step 3: Your Learning Path</h2>
          <p>
            <b>Learning Score:</b> {result.score}
          </p>
          <p>
            <b>Knowledge Level:</b> {result.knowledgeLevel}
          </p>
          <h3>Modules:</h3>
          <ul>
            {result.learfningpathjson.learningPath?.modules?.map(
              (module, index) => (
                <li key={index}>
                  <p>{module.title}</p>
                </li>
              )
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
