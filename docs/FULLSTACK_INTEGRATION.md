# Fullstack Frontend–Backend Integration

**Project:** Smart Reschedule Assistant  
**Branch:** `feat/fullstack-fe-be-integration`  
**Purpose:** Documentation and handoff reference for the Fullstack and GenAI teams.

---

## 1. Integration Overview

This branch integrates the React frontend with the Express.js and PostgreSQL backend.

The integration covers the main Customer and Admin workflows:

- Authentication and role-based navigation.
- Customer schedule retrieval.
- Available slot retrieval.
- Customer reschedule request submission.
- Admin request review and approval/rejection.
- Customer request history.
- Admin member management.

The integration uses the existing backend API. The frontend does not directly access PostgreSQL.

## 2. Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- React Router
- Fetch API
- CSS

### Backend
- Node.js
- Express.js
- PostgreSQL
- JSON Web Token (JWT)
- bcryptjs
- CORS

### API Configuration

- Backend base URL: `http://localhost:3000/api`
- Frontend development origin: `http://localhost:5173`
- Backend CORS currently allows the frontend development origin above.

The frontend API base URL is configured in `src/data/AuthAPI.js`.

## 3. Authentication and Authorization

### Authentication endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Public Customer registration |
| POST | `/api/auth/login` | Login for Customer and Admin |
| GET | `/api/auth/me` | Retrieve authenticated user |

### Registration request

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "password": "minimum-12-characters"
}
```

Public registration always creates a `CUSTOMER` account.

Password requirements:
- Minimum 12 characters.
- Maximum 72 characters.
- Passwords are hashed using bcryptjs.

### Login request

```json
{
  "email": "customer@example.com",
  "password": "minimum-12-characters"
}
```

Successful login returns:
- `token`
- `token_type`
- `expires_in`
- `user` containing `id`, `name`, `email`, and `role`.

JWT expiration is one hour.

### Authentication header

Protected endpoints require:

```http
Authorization: Bearer <token>
```

### User roles

| Role | Access |
|---|---|
| CUSTOMER | Own schedules and reschedule requests |
| ADMIN | All schedules and requests, plus member management |

The backend uses `authenticateToken` and `authorizeRoles` middleware to enforce access.

## 4. API Contract

All successful API responses use a JSON envelope containing `status`, with relevant response data inside `data`.

### 4.1 Schedules

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/schedules` | Customer, Admin | Retrieve schedules |
| GET | `/api/schedules/:id` | Customer, Admin | Retrieve schedule detail |

Customer responses are restricted to schedules owned by the authenticated customer. Admin can retrieve all schedules.

Schedule fields include:

- `id`
- `customer_name`
- `class_name`
- `schedule_date`
- `start_time`
- `end_time`
- `status`
- `created_at`
- `updated_at`

The schedule date is returned in `YYYY-MM-DD` format.

### 4.2 Available Slots

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/available-slots` | Public | Retrieve available slots |

Optional date filter:

```http
GET /api/available-slots?date=2026-11-27
```

Response data is available under:

```json
{
  "status": "success",
  "data": {
    "available_slots": []
  }
}
```

Each slot contains:

- `id`
- `slot_date`
- `start_time`
- `end_time`
- `is_booked`
- `created_at`

The backend excludes booked slots and slots already associated with active `PENDING` or `APPROVED` requests.

### 4.3 Reschedule Requests

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/reschedule-requests` | Customer | Create a request |
| GET | `/api/reschedule-requests` | Customer, Admin | Retrieve requests |
| GET | `/api/reschedule-requests/:id` | Customer, Admin | Retrieve request detail |
| PATCH | `/api/reschedule-requests/:id` | Admin | Approve or reject a request |

#### Create request

```json
{
  "schedule_id": 5,
  "available_slot_id": 707,
  "reason": "I need to change my training schedule."
}
```

The authenticated Customer ID is obtained from the JWT. The frontend must not send or choose another user's identity.

A schedule must have status `SCHEDULED` to be eligible for a new reschedule request. Only one pending request is allowed for a schedule.

Successful creation returns the new request under:

```json
{
  "status": "success",
  "data": {
    "reschedule_request": {}
  }
}
```

#### Request status

Supported statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`

Request data includes:

- `id`
- `schedule_id`
- `customer_name`
- `class_name`
- `current_schedule_date`
- `current_start_time`
- `current_end_time`
- `available_slot_id`
- `requested_schedule_date`
- `requested_start_time`
- `requested_end_time`
- `reason`
- `status`
- `created_at`
- `updated_at`

#### Admin decision

Approve:

```json
{
  "status": "APPROVED"
}
```

Reject:

```json
{
  "status": "REJECTED"
}
```

Important backend behavior:

- Only `PENDING` requests can be processed.
- Approval uses the available slot originally selected by the Customer.
- Approval updates the schedule date and time.
- The schedule status becomes `RESCHEDULED`.
- The selected slot becomes booked (`is_booked = TRUE`).
- The request status becomes `APPROVED`.
- These approval updates run inside a database transaction.
- Rejection changes the request status to `REJECTED`; it does not change the schedule.

The Admin endpoint accepts only the decision status. It does not accept a new slot selection.

### 4.4 Member Management

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | Retrieve Customer list |
| POST | `/api/users` | Admin | Create a Customer |
| GET | `/api/users/:id` | Admin | Retrieve Customer detail |

Create member request:

```json
{
  "name": "New Customer",
  "email": "new.customer@example.com",
  "password": "minimum-12-characters"
}
```

The endpoint creates a `CUSTOMER` account. The users router requires both a valid JWT and the `ADMIN` role.

## 5. Frontend Integration

### API layer

Main file:

`src/data/AuthAPI.js`

The API layer handles authenticated requests, Bearer token headers, JSON responses, and API error messages.

Integrated functions include:

- `getMySchedules()`
- `getMembers()`
- `createMember()`
- `getRescheduleRequests()`
- `getAvailableSlots(date)`
- `updateRescheduleRequest(id, status)`

The Customer Dashboard also submits a reschedule request to the backend using the authenticated token.

### Application routing

`src/App.jsx`

The application separates the Customer and Admin dashboard experiences according to the authenticated user's role.

### Customer workflow

`src/pages/CustomerDashboard.jsx`

The Customer Dashboard:

1. Retrieves the Customer's schedules.
2. Retrieves available slots.
3. Retrieves the Customer's reschedule request history.
4. Displays the reschedule action for eligible `SCHEDULED` schedules.
5. Allows the Customer to select an available slot and provide a reason.
6. Submits the request to the backend.
7. Displays the updated request status.

The reschedule action is hidden when a schedule is not `SCHEDULED` or already has a pending request.

### Admin workflow

`src/pages/DashboardPage.jsx`

The Admin Dashboard:

- Retrieves schedules, requests, and available slots.
- Displays pending request counts.
- Displays request information for review.
- Sends approval or rejection decisions.
- Reloads relevant data after a decision.

### Member management

`src/pages/MemberPage.jsx`

The member page:

- Retrieves Customer accounts.
- Supports searching the member list.
- Provides a form to create a Customer account.
- Refreshes the list after successful creation.

### Schedule and request pages

- `src/pages/SchedulePage.jsx`: Displays schedules and available slots.
- `src/pages/RequestPage.jsx`: Displays reschedule requests and selected request details.
- `src/components/RequestDetail.jsx`: Displays current and requested schedule details, reason, and Admin decision actions.

The AI integration card is currently a placeholder marked as coming soon.

## 6. End-to-End Integration Verification

The main Customer-to-Admin reschedule flow has been manually verified:

1. Customer logs in.
2. Customer views their schedule.
3. Customer selects an available slot.
4. Customer submits a reschedule request with a reason.
5. Admin sees the pending request in the Admin Dashboard.
6. Admin approves the request.
7. Backend updates the schedule and books the selected slot.
8. Customer sees the updated schedule and `APPROVED` request status.

The verification used demo data in the local PostgreSQL database.

This confirms that the core reschedule workflow is connected across the frontend, backend, and database.

## 7. Files Changed in This Integration

### Backend

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/routes/users.routes.js` (new)
- `backend/src/server.js`

### Frontend

- `package.json`
- `package-lock.json`
- `src/App.jsx`
- `src/components/RequestDetail.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/Topbar.jsx`
- `src/data/AuthAPI.js`
- `src/index.css`
- `src/main.jsx`
- `src/pages/CustomerDashboard.jsx` (new)
- `src/pages/DashboardPage.jsx` (new)
- `src/pages/MemberPage.jsx` (new)
- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/RequestPage.jsx`
- `src/pages/SchedulePage.jsx`

## 8. Notes for the GenAI Team

This branch contains the Fullstack frontend-backend integration work. It should be used as a reference when integrating the GenAI functionality.

Important integration contracts:

1. Keep the existing API field names consistent.
2. Do not change the request payload fields without coordinating with the Fullstack team.
3. Reschedule request creation uses `schedule_id`, `available_slot_id`, and `reason`.
4. Admin decisions use `status` with `APPROVED` or `REJECTED`.
5. Authentication uses JWT Bearer tokens.
6. Customer and Admin access restrictions are enforced by the backend.
7. The Admin approval process uses the slot selected by the Customer.
8. The current AI interface is a placeholder; the GenAI implementation can be connected in a coordinated follow-up.

Before changing shared API contracts, coordinate with the Fullstack team to avoid breaking the existing integration.

---

**Status:** Core Fullstack FE–BE reschedule workflow integrated and manually verified.  
**Branch:** `feat/fullstack-fe-be-integration`
