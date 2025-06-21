# **Personalized Learning Portal (Proof of Concept)**

### 🚀 **Overview**

The Personalized Learning Portal is a Proof of Concept (PoC) that provides an intelligent system for creating custom learning paths based on user requirements, AI-generated content, and dynamic assessments. It integrates with Azure OpenAI GPT-4 to generate overviews, quizzes, and learning recommendations tailored to the user's input and goals.

---

## **Project Features**

### 💡 Main Features:

1. **Dynamic Overview Generation**:
   - Explains what the topic is and why it is useful.
2. **Custom Knowledge Assessment**:
   - Creates dynamic beginner-level quizzes using Azure OpenAI GPT-4.
3. **Personalized Learning Path**:
   - Evaluates user's knowledge level and suggests a relevant learning path based on score.
4. **Modular Architecture**:
   - Decoupled backend (Node.js) and frontend (React.js) services.

### 🛠 **Technology Used**:

- **Backend**:
  - Node.js
  - Express.js
  - Azure OpenAI GPT-4 Integration
- **Frontend**:
  - React.js
  - Axios for API requests
- **Containerization**:
  - Docker
  - Docker Compose

---

## **Project Structure**

```
personalized-learning-poc/
├── backend/
│   ├── index.js              # Main backend server file
│   ├── Dockerfile            # Dockerfile for backend service
│   ├── package.json          # Backend dependencies
│   ├── .env                  # Environment variables for Azure OpenAI
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React app
│   ├── Dockerfile            # Dockerfile for frontend service
│   ├── package.json          # Frontend dependencies
├── docker-compose.yml        # Compose file for managing containers
├── README.md                 # Documentation file
```

---

## **Getting Started**

Follow these steps to set up and run the project locally.

---

### **Prerequisites**

1. **Node.js** installed on your machine. ([Download Node.js](https://nodejs.org/))
2. **Docker** and **Docker Compose** installed on your machine. ([Install Docker & Compose](https://docs.docker.com/get-docker/))
3. **Azure OpenAI Resource**:
   - Create an Azure OpenAI account and set up an instance of GPT-4.
   - Retrieve the **API key** and **endpoint URL** from your Azure portal.

---

### **Installation and Running Locally**

#### Step 1: Clone the Repository

Clone this project using:

```bash
git clone https://github.com/your-repo-name/personalized-learning-poc.git
cd personalized-learning-poc
```

#### Step 2: Set Up Backend

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Add environment variables for Azure OpenAI service:
   - Create a `.env` file in the `backend` directory:
     ```bash
     AZURE_OPENAI_ENDPOINT=https://your-openai-instance.openai.azure.com
     AZURE_OPENAI_API_KEY=your-api-key
     ```
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Test the backend locally:
   ```bash
   node index.js
   ```
   The backend will run on `http://localhost:5000`.

#### Step 3: Set Up Frontend

1. Navigate to the `frontend/` folder:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the frontend locally:
   ```bash
   npm start
   ```
   The React frontend will run on `http://localhost:3000`.

---

### **Running the Project Using Docker**

You can containerize and run the application using Docker.

1. Navigate to the project root directory:
   ```bash
   cd personalized-learning-poc
   ```
2. Start the Docker containers:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

---

### **Endpoints**

#### **Backend API Endpoints**:

1. **Submit Learning Request**:

   - `POST /api/submitLearningRequest`
   - Request Body:
     ```json
     {
       "topic": "React"
     }
     ```
   - Response Example:
     ```json
     {
       "overview": "React.js is a JavaScript library...",
       "questions": [
         {
           "question": "What is React?",
           "options": ["A library", "A framework", "A database"],
           "correct": "A library"
         },
         ...
       ]
     }
     ```

2. **Evaluate Knowledge**:
   - `POST /api/evaluateKnowledge`
   - Request Body:
     ```json
     {
       "answers": ["A library", "JavaScript XML"],
       "questions": [
         {
           "question": "What is React?",
           "options": ["A library", "A framework", "A database"],
           "correct": "A library"
         }
       ]
     }
     ```
   - Response Example:
     ```json
     {
       "score": 2,
       "knowledgeLevel": "Intermediate",
       "learningPath": [
         "Introduction to React.js",
         "Learn JSX Syntax",
         "React Components and Props",
         "State Management with Hooks"
       ]
     }
     ```

---

## **Future Enhancements**

Here are the planned improvements for the next iterations:

1. **Advanced AI Integration**:
   - Include reinforcement learning models to adapt learning paths dynamically based on user progress.
   - Advanced question generation (coding challenges, interactive quizzes).
2. **Database for User Tracking**:
   - Integrate PostgreSQL or MongoDB for user history and progress tracking.
3. **Expand Topics**:
   - Add support for more topics like Python, Node.js, Kubernetes, etc.
4. **Deployment**:
   - Deploy the application to AWS, Azure, or Google Cloud.
5. **Responsive Design**
   - Optimize the frontend for mobile and tablet devices.

---

## **Contributing**

Contributions are welcome! Feel free to submit issues or pull requests for enhancements. Follow these steps:

1. Fork the repository.
2. Create a new feature branch.
3. Commit and push your changes.
4. Submit a pull request.

---

## **License**

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

## **Dependencies**

### **Backend**:

- [Express](https://expressjs.com/)
- [Body-Parser](https://github.com/expressjs/body-parser)
- [Cors](https://github.com/expressjs/cors)
- [Axios](https://axios-http.com/)
- [Dotenv](https://github.com/motdotla/dotenv)

### **Frontend**:

- [React](https://reactjs.org/)
- [Axios](https://axios-http.com/)

---

## **Contact**

If you have any questions or suggestions, feel free to reach out:

**Author**: [\[Abhinav Kumar\]](https://github.com/akumar261089)

---

## **Screenshots**

Add relevant screenshots of the app (frontend UI, quiz generation, etc.) to make the README visually appealing.

---
