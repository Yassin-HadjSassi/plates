# Access Control System

A secure entry/exit management system for vehicle access control, integrating ALPR cameras, QR scanners, and manual guard verification.

## 📌 Project Overview
- **Goal**: Manage vehicle access with dual-factor identification and human oversight.
- **Tech Stack**: Spring Boot (Backend), React (Frontend), MySQL (Database).
- **Architecture**: Modular Monolith (Clean Architecture).

## 🚀 Key Features
- **Multi-Source Identification**: Correlates independent Camera (Plate) and QR (User) inputs.
- **Guard Dashboard**: Real-time monitoring and decision making.
- **Barrier Control**: Explicit commands to Open/Close/Keep Open the barrier.
- **Admin Panel**: Manage Users (Employees, Residents, Guests) and Plates.
- **Audit Logging**: Tracks all validated entries/exits.

## 🛠️ Setup & Run

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.0 (Port 3306, Database: `access_control`)

### Backend (Spring Boot)
1. Navigate to `/backend`.
2. Run: `mvn spring-boot:run`
3. Server starts on `http://localhost:8080`.
   - Swagger Documentation: `http://localhost:8080/swagger-ui.html`

### Frontend (React)
1. Navigate to `/frontend`.
2. Run: `npm install` (first time).
3. Run: `npm run dev`.
4. App runs on `http://localhost:5173`.

## 📚 Documentation
For detailed architecture, data flow, and PFE context, see [description.md](description.md).

## ⚠️ Academic Context (PFE)
This project is an academic prototype.
- **Security**: Role-based access is simulated locally; backend endpoints are open for demonstration.
- **Hardware**: Cameras, QR scanners, and Barrier are simulated via API endpoints.
- **Concurrency**: Polling is used instead of WebSockets for simplicity.
