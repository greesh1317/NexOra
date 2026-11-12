# NexOra — Stress-Free Team Management Platform

**NexOra** is a centralized, role-based team and project management platform designed to simplify collaboration, task tracking, progress monitoring, and team coordination.

It provides separate workspaces for Managers, Team Leaders, and Team Members, allowing each role to manage responsibilities efficiently through a single platform.

Built using the **MERN stack**, NexOra combines secure authentication, project and task management, daily reporting, notifications, file attachments, and analytics into one integrated application.

---

## Project Overview

NexOra follows a three-level role-based management structure:

- **Manager:** Creates projects, manages employees and teams, monitors overall progress, and reviews organizational analytics.
- **Team Leader:** Manages assigned projects, assigns tasks, monitors team performance, reviews daily reports, and tracks deadlines.
- **Team Member:** Views assigned tasks, updates task status, uploads proof of work, and submits daily progress reports.

Each role has access only to the information and operations permitted by its responsibilities.

## Key Features

### 1. Authentication and Access Control
- JWT-based authentication.
- Three roles: Manager, Team Leader, and Team Member.
- Protected frontend routes and backend authorization.
- Role-specific dashboards.
- Password management and secure password reset.
- Deactivated user handling.

### 2. Project and Team Management
- Create and manage projects and teams.
- Assign Team Leaders and Team Members.
- Link projects with teams.
- Manage team membership and project assignments.
- Maintain project ownership when team leadership changes.
- Prevent unsafe deletion of teams and projects.

### 3. Task Management
- Create and assign tasks.
- Set deadlines and priorities.
- Update task statuses.
- Track completed, pending, overdue, and in-progress tasks.
- Reassign tasks with notifications.
- Enforce role-based task assignment rules.

### 4. Daily Reports and Proof of Work
- Submit daily work reports.
- Track employee progress.
- Attach proof of work through links or file uploads.
- Support PDF, image, Office, and ZIP attachments (up to 5 MB).
- Validate uploaded file types and content.

### 5. Notifications and Reviews
- Notifications for task assignments.
- Notifications when reviews are received.
- Team feedback and performance reviews.
- Rating-based reviews with comments.
- In-app deadline reminders.

### 6. Analytics and Reporting
- Dedicated Analytics pages for Managers and Team Leaders.
- Project completion statistics.
- Task status distribution.
- Weekly task completion trends.
- Employee workload monitoring.
- Overdue task tracking.
- Project-wise performance comparisons.
- Date-based reporting for the last 7 or 30 days.
- CSV report downloads for spreadsheet analysis.
- PDF reports through browser print functionality.

### 7. Reliability and Security
- Server-side pagination and filtering.
- Database indexes for efficient queries.
- Input and file validation.
- Safe project and team deletion rules.
- MongoDB connection monitoring and recovery.
- Health-check endpoint.
- CSV formula-injection protection.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| API Testing | Postman, automated backend tests |
| Version Control | Git, GitHub |
| Development Tools | VS Code, npm |

---

## Project Structure

```text
nexora-team-management/
│
├── client/
│   └── src/
│       ├── api/              # API communication
│       ├── context/          # Authentication context
│       ├── components/       # Reusable UI components
│       │   ├── Navbar
│       │   └── AnalyticsPanel
│       ├── pages/            # Application pages
│       │   ├── Login
│       │   ├── ManagerDashboard
│       │   ├── TeamLeaderDashboard
│       │   ├── TeamMemberDashboard
│       │   └── AnalyticsPage
│       └── utils/            # Helper functions
│
├── server/
│   ├── config/               # Database configuration
│   ├── controllers/          # Application logic
│   ├── middleware/           # Authentication and authorization
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API routes
│   ├── tests/                # Automated backend tests
│   ├── utils/                # Analytics, CSV and report utilities
│   ├── seed.js               # Demo data generation
│   └── server.js             # Backend entry point
│
└── docs/
    └── API_LIST.md           # API documentation
```

---

## Development Journey

NexOra was developed incrementally through six major phases.

| Phase | Development Focus | Major Deliverables |
|---|---|---|
| Phase 1 | Core application | JWT authentication, role-based dashboards, tasks and daily reports |
| Phase 2 | Team management | Teams, memberships, project-team relationships and assignment rules |
| Phase 3 | Data integrity | Safe deletion, integrity rules and deactivated user handling |
| Phase 4 | Manager functionality | Overview, employee management, password reset and notifications |
| Phase 5 | Reliability and security | Pagination, filtering, file validation, database recovery and indexes |
| Phase 6 | Analytics and reporting | Analytics dashboards, workload reports, weekly trends, CSV and PDF exports |

Each phase builds on the previous implementation to make the platform more complete, reliable, and maintainable.

---

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB installed and running locally, or a MongoDB Atlas connection.
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/greesh1317/NexOra.git
cd NexOra
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
MONGO_URI=mongodb://127.0.0.1:27017/nexora
JWT_SECRET=your_long_random_secret
PORT=5000
```

Run the seed script if you want to populate the database with demo data:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 3. Set Up the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the application:

```text
http://localhost:5173
```

---

## Testing

Run the backend automated tests:

```bash
cd server
npm test
```

The Phase 6 verification included:

- 115 backend tests passed.
- Frontend production build completed successfully.
- Manager and Team Leader Analytics checked in the browser.
- CSV export opened and verified in Excel.
- PDF export generated and visually inspected.

---

## Role-Based Access

NexOra enforces role-based access at both the frontend and backend levels.

Team Leaders can access only the projects they lead, including their associated tasks, reports, reviews, files, and analytics.

Managers have organization-wide management and monitoring access, while Team Members can access their assigned work.

---

## Future Improvements

Potential future enhancements include:

- Improved PDF chart rendering.
- More detailed analytics and visual reports.
- Additional dashboard customization.
- Expanded reporting and performance insights.

---

## Repository

**GitHub:** https://github.com/greesh1317/NexOra

**Project:** NexOra — Stress-Free Team Management Platform

**Development Stack:** MERN

**Current Development Stage:** Phase 6 — Analytics and Reporting
