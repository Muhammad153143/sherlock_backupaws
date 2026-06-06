# SherLock 🔍 – Smart AI-Powered Lost & Found System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-blue)](https://www.mongodb.com/)
[![AI](https://img.shields.io/badge/AI-Computer%20Vision-red)](https://pytorch.org/)

**SherLock** is a production-grade, full-stack platform designed to automate and streamline the lost-and-found process within campus or corporate environments. By leveraging **Computer Vision (PyTorch)** and **Weighted Matching Algorithms**, SherLock reduces the manual effort required to reunite owners with their belongings.

---

## 🚀 Key Features

### 👤 User Features
- **Smart Reporting:** Guided forms for reporting lost or found items with image uploads.
- **AI Matching Engine:** Automatically suggests potential matches based on image similarity and metadata (category, color, location).
- **Real-time Notifications:** Instant email alerts when a high-probability match is detected.
- **Secure Dashboard:** Track the status of your reports (Pending, Verified, Resolved).
- **Duplicate Detection:** Prevents system clutter by identifying similar reports before submission.

### 🛡️ Admin Features
- **Centralized Management:** Comprehensive dashboard to oversee all reported items.
- **Manual Verification:** One-click verification to ensure report authenticity.
- **Match Confirmation:** Review AI-suggested matches and confirm them to trigger resolution emails.
- **Analytics & Logs:** View email delivery logs and system activity.
- **Role-Based Access (RBAC):** Secure administration area protected by JWT and middleware.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Framer Motion (Animations)
- **State Management:** React Context API / TanStack Query
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js (Express.js)
- **Real-time:** Socket.io (for instant chat/notifications)
- **Auth:** JWT (JSON Web Tokens) & Bcrypt.js
- **Middleware:** Helmet (Security), Multer (File Uploads), Rate Limiter

### AI & Data
- **Database:** MongoDB (Mongoose ODM)
- **AI Service:** Python (Flask/FastAPI) + PyTorch
- **Image Processing:** Jimp / Sharp
- **Storage:** Cloudinary (Production-grade image hosting)

---

## 🏗️ System Architecture

SherLock follows a **Microservices-inspired Monolith** architecture:

1.  **Frontend (Client Layer):** A responsive Next.js application that communicates with the REST API.
2.  **API Gateway (Express.js):** Handles authentication, routing, and business logic.
3.  **AI Worker (Python Service):** A specialized service that processes images to generate embeddings for similarity matching.
4.  **Database Layer (MongoDB):** Stores user data, item reports, and matching scores.
5.  **External Services:**
    *   **Cloudinary:** For optimized image delivery.
    *   **Nodemailer/SendGrid:** For automated email communication.

---

## 📂 Folder Structure

```text
sherlock/
├── frontend/             # Next.js Application
│   ├── app/              # App Router (Pages & Layouts)
│   ├── components/       # Reusable UI Components
│   └── public/           # Static Assets
├── backend/              # Node.js Express Server
│   ├── controllers/      # Business Logic
│   ├── models/           # MongoDB Schemas
│   ├── routes/           # API Endpoints
│   ├── middleware/       # Auth & Security
│   └── utils/            # Helper functions (AI matching, Email)
├── ai_service/           # Python AI Microservice
│   ├── app.py            # Flask/FastAPI entry point
│   └── models/           # PyTorch model logic
└── .env.example          # Environment variables template
```

---

## ⚙️ Installation Steps

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Python 3.9+ (for AI Service)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/sherlock.git
cd sherlock
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file
npm start
```

### 3. AI Service Setup
```bash
cd ai_service
pip install -r requirements.txt
python app.py
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Usage Guide

1.  **Report an Item:** Navigate to "Report Lost" or "Report Found". Upload a clear image and provide details.
2.  **AI Check:** The system will immediately show "Similar Items Found" if a match exists in the database.
3.  **Verification:** Admins verify the report from the dashboard.
4.  **Resolution:** Once a match is confirmed by the admin, both parties receive an email with instructions on how to reclaim/return the item.

---

## 🔮 Future Improvements

- **Mobile App:** Cross-platform mobile app using React Native.
- **OCR Integration:** Extract text from images (e.g., names on IDs, serial numbers on laptops).
- **Map Integration:** Interactive map to pin exact "last seen" locations using Google Maps API.
- **Blockchain Verification:** Securely log resolutions on-chain for immutable audit trails.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Developed with ❤️ for a smarter campus.*
