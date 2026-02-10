# Access Control System - Project Description

## 1. Project Overview

The Access Control System is a secure entry/exit management solution designed for organizational premises. It combines **multi-source identification** (ALPR cameras and QR code scanners) with **human verification** (Guard Dashboard) to control a physical barrier. The system maintains a detailed audit log of all access events.

**Key Concepts:**
-   **Multi-Source Identification**: Correlates inputs from Cameras and QR Scanners. Inputs are optional and independent.
-   **Guard Authority**: The Guard is the sole authority for access decisions. Technical matches are suggestions, not approvals.
-   **Ephemeral Requests**: Access attempts are temporary. If rejected, they are discarded. Only validated entries are logged.
-   **Explicit Barrier Control**: The barrier is controlled via explicit commands from the Guard or the System (on approval).

## 2. Technology Stack

### Backend
-   **Framework**: Spring Boot 3.2.2 (Java 17+)
-   **Architecture**: Modular Monolith, Clean Architecture.
-   **Database**: MySQL (JPA/Hibernate).
-   **Communication**: REST API.

### Frontend
-   **Framework**: React (Vite).
-   **Refactoring Note**: Uses M:N relationship for Users/Plates matching PFE requirements.

## 3. Architecture & Data Flow

### 3.1 Backend Components

1.  **API Layer**:
    -   `InputController`: Raw inputs (Camera/QR).
    -   `GuardController`: Polling & Decisions.
    -   `BarrierController`: Mock Barrier API (`/open`, `/close`, `/status`).
    -   `AdminController`: CRUD for Users/Plates.

2.  **Application Layer**:
    -   `AccessControlService`:
        -   **Correlation**: Windows (2 min) for matching inputs.
        -   **Lifecycle**: PENDING -> DECISION -> DELETE.
    -   `BarrierService`: Mock implementation of barrier hardware.

3.  **Domain Layer**:
    -   **Entities**: `User` (M:N Assigned Plates), `Plate` (M:N Assigned Users, Registered flag), `AccessRequest` (Ephemeral), `Tracking`.
    -   **Enums**: `TrackingAction` (ENTER, EXIT, URGENT).

### 3.2 Access Request Lifecycle

1.  **Creation**: Camera or QR input creates a `PENDING` request.
2.  **Correlation**: Subsequent input updates the *same* request if within window.
3.  **Guard Action**:
    -   **Accept**: Log `Tracking` (ENTER/EXIT), Open Barrier, Delete Request.
    -   **Reject**: Delete Request. No log.
    -   **Urgent**: Log `Tracking` (URGENT), Open Barrier, Delete Request.

## 4. Database Schema

-   **`users`**: `id`, `name`, `type`.
-   **`plates`**: `plate_number` (PK), `vehicle_info`, `registered` (bool).
-   **`user_plates`**: Join table (`user_id`, `plate_number`).
-   **`access_requests`**: Temporary buffer.
-   **`tracking_logs`**: Permanent history.

## 5. Out of Scope (PFE Context)
-   Real hardware integration (Camera/Barrier/QR).
-   Complex Security (JWT/OAuth) - Role simulation only.
-   High Availability / Microservices.
-   Real-time messaging (WebSockets) - Polling used for simplicity.
