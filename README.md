<div align="center">

# 🚀 **PrepMate AI**

### AI-Powered Interview Preparation & Recruitment Platform

Connect students with companies through AI-driven hiring, live interviews, resume analysis, skill matching, and career development tools.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)
![Status](https://img.shields.io/badge/Status-Completed-brightgreen)

</div>

---

# 📖 Overview

PrepMate AI is a full-stack AI-powered interview preparation and recruitment platform designed to simplify the hiring process for both students and companies.

Students can build professional profiles, receive AI-powered career guidance, practice interviews, and apply for jobs, while companies can intelligently screen applicants, conduct live interviews, and hire suitable candidates efficiently.

---

# ✨ Features

## 👨‍🎓 Student Portal

- Secure Login & Signup
- Email Verification
- Professional Profile Management
- Resume Builder
- AI Resume Feedback
- AI Career Resources
- AI Job Matching
- Practice Questions
- Mock Interviews
- Live Interviews
- Real-Time Notifications
- Real-Time Messaging
- Applications Tracking
- Analytics Dashboard
- Settings
- Help & Support

---

## 🏢 Company Portal

- Secure Authentication
- Company Profile
- Company Verification
- Job Posting
- Applicant Management
- AI Resume Screening
- AI Candidate Match Score
- Applicant Shortlisting
- Live Interviews
- Real-Time Messaging
- Notifications
- Analytics Dashboard
- Settings
- Help & Support

---

## 👨‍💼 Admin Panel

- Dashboard
- Student Management
- Company Management
- Company Verification
- Platform Monitoring
- Issue Management
- Report Handling
- User Activity Monitoring

---

# 🤖 AI Features

- AI Resume Screening
- AI Job Matching
- AI Career Feedback
- AI Resource Recommendations
- Intelligent Skill Matching
- Personalized Career Suggestions

---

# 🎥 Live Interview Features

- WebRTC Video Calling
- Screen Sharing
- Real-Time Communication
- Interview Management

---

# 🔐 Security Features

- JWT Authentication
- Email Verification
- Password Hashing (bcrypt)
- Protected Routes
- Input Validation
- Request Rate Limiting
- Helmet Security Headers
- Environment Variables
- Secure API Design
- Authentication Middleware
- Brute Force Protection

---

# 💳 Premium Features

- Stripe Payment Integration
- Upgrade to Pro
- Premium Interview Credits

---

# 📱 Responsive Design

Fully optimized for

- Desktop
- Laptop
- Tablet
- Mobile Devices

---

# 🛠 Tech Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

## AI

- Google Gemini API
- Groq API

## Authentication

- JWT
- bcrypt

## Real-Time

- Socket.IO
- WebRTC

## Payments

- Stripe

---

# 🚀 Getting Started

## Prerequisites

Before running the project, install:

- Node.js
- MongoDB (Local or MongoDB Atlas)
- Git

---

# 🚀 Installation & Setup

Follow the steps below to run PrepMate AI on your local machine.


## 1. Clone the Repository

```bash
git clone https://github.com/husnainnnn/PrepMate-AI.git
cd PrepMate-AI
```

---

## 2. Install Dependencies

### Backend

```bash
cd Backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## 3. Configure Environment Variables

Both the **Backend** and **Frontend** require a `.env` file.

Copy the provided `.env.example` file and rename it to `.env`.

### Backend

```bash
cd Backend
cp .env.example .env
```

### Frontend

```bash
cd ../frontend
cp .env.example .env
```

Now open both `.env` files and replace the placeholder values with your own credentials.

---

## Backend Environment Variables

Create a `.env` file inside the **Backend** directory.

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Connection String |
| `JWT_SECRET` | Secret key for JWT Authentication |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `GEMINI_AI_KEY` | Gemini AI Key |
| `GROQ_API_KEY` | Groq API Key |
| `GROQ_INTERVIEW_KEY` | Groq API Key for AI Interviews |
| `GMAIL_USER` | Gmail Account |
| `GMAIL_APP_PASSWORD` | Gmail App Password |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret |
| `CLIENT_URL` | Frontend URL |
| `ADMIN_EMAIL` | Default Admin Email |
| `ADMIN_PASSWORD` | Default Admin Password |

---

## Frontend Environment Variables

Create a `.env` file inside the **Frontend** directory.

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key |

---

## 4. Start the Project

Open **two terminals**.

### Terminal 1 (Backend)

```bash
cd Backend
npm run dev
```

### Terminal 2 (Frontend)

```bash
cd frontend
npm run dev
```

---

## 5. Open the Application

```text
http://localhost:5173
```
---

# 🔑 Required Services

To use all features of PrepMate AI, create free accounts and obtain API keys from the following services:

- MongoDB Atlas
- Google AI Studio (Gemini)
- Groq AI
- Google Cloud Console (Google OAuth)
- Gmail App Password
- Stripe Developers

---

# ⚙️ Features Requiring API Keys

| Feature | Required Service |
|----------|------------------|
| AI Mock Interviews | Gemini / Groq |
| AI Feedback | Groq |
| AI Job Matching | Gemini |
| AI Resource Recommendations | Gemini |
| Google Sign-In | Google OAuth |
| Email Verification | Gmail SMTP |
| Forgot Password | Gmail SMTP |
| Stripe Pro Plan | Stripe |
| Real-Time Interviews | WebRTC + Socket.IO |

---

# 🔗 API Key Resources

| Service | Link |
|----------|------|
| Google Gemini | https://aistudio.google.com/apikey |
| Groq | https://console.groq.com/keys |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas |
| Stripe | https://dashboard.stripe.com/apikeys |

---
## 🎉 You're Ready!

Once everything is configured, PrepMate AI will be available locally with all features enabled.

> **Note:**  
> Most core platform features work without AI keys. AI-powered features, email verification, and payment functionality require their respective API credentials.

---

# 🔒 Security

PrepMate AI follows modern backend security practices, including:

- JWT Authentication
- Password Hashing
- Email Verification
- Input Validation
- Secure HTTP Headers
- Rate Limiting
- Environment Variables
- Protected API Routes

---

# 📸 Screenshots

> Screenshots and demo GIFs will be added soon.

---

# 🚀 Future Improvements

- Docker Support
- CI/CD Pipeline
- Multi-language Support
- AI Interview Voice Analysis
- Resume PDF Parsing
- Interview Recording
- Advanced Analytics

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository

2. Create your feature branch

```bash
git checkout -b feature/NewFeature
```

3. Commit your changes

```bash
git commit -m "feat: add new feature"
```

4. Push to your branch

```bash
git push origin feature/NewFeature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---
# 👨‍💻 Developer

**Husnain Sattar**

---
<div align="center">

## ⭐ If you like this project, don't forget to give it a Star!

Made with ❤️ using React, Node.js, Express, MongoDB & AI

</div>


