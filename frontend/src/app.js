import React, { useState } from "react";
import axios from "axios";

function App() {
  const [step, setStep] = useState(1); // To track user flow
  const [topic, setTopic] = useState("react");
  const [purpose, setPurpose] = useState("");
  const [overview, setOverview] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const submitLearningRequest = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/submitLearningRequest",
        {
          topic,
          learningPurpose: purpose,
        }
      );
      setOverview(response.data.overview);
      setQuestions(response.data.questions);
      setStep(2); // Move to the test step
    } catch (error) {
      console.error("Error fetching learning data:", error);
    }
  };

  const submitAnswers = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/evaluateKnowledge",
        {
          answers,
          topic,
        }
      );
      setResult(response.data);
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
            <b>Score:</b> {result.score}
          </p>
          <p>
            <b>Knowledge Level:</b> {result.knowledgeLevel}
          </p>
          <h3>Recommended Learning Path:</h3>
          <ul>
            {result.learningPath.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
