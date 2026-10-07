# 🚀 Intelligent Software Defect Tracking System with Resolution Assistance

> **Capstone Project & 8-Week Implementation Roadmap**  
> *Transforming traditional defect tracking into an intelligent, AI-assisted resolution engineering platform.*

---

## 🎯 Project Overview & Vision

Modern software engineering teams manage hundreds of defects across rapid sprint cycles. Traditional systems only record static bugs and assignments. 

This platform extends the foundation of defect management into an **Intelligent Lifecycle & Resolution Assistance Platform**:
```
Report ➔ Assign ➔ Track ➔ Analyze ➔ Assist Resolution ➔ Fix ➔ Verify ➔ Close
```

---

## 🌟 Key Features & Modules

### 1. 🤖 Intelligent Defect Reporting
* **Missing Information Detector:** When a tester enters a vague summary like *"Login is not working"*, the system automatically flags missing fields (OS, browser, app version, step-by-step reproduction instructions, expected vs. actual behavior, error codes).
* **AI Report Reformatting:** Restructures raw user input into standardized, professional markdown defect reports with a **Quality & Completeness Score (0–100%)**.

### 2. 🧠 Similarity & Duplicate Defect Detection
* **Semantic Vector Search:** Uses TF-IDF and Cosine vector similarity to detect similar issues across active and closed defects, even when phrased differently (*"Payment page crashes"* vs. *"Transaction fails during checkout"*).
* **Duplicate Alert Banner:** Real-time alert banner warning testers when creating issues that have $\ge 70\%$ similarity with existing tickets.

### 3. 🛠️ Resolution Assistance & Root Cause Analysis (Signature Feature)
* **Actionable Investigation Areas:** Generates targeted checklists for developers (e.g., check API response payload, verify null-safe property access, check CORS headers).
* **Historical Resolution Retrieval:** Retrieves past resolutions from the knowledge base matching the defect symptoms, displaying the exact root cause and solution applied.
* **Root Cause Analysis (RCA) Engine:** Synthesizes root cause hypotheses, contributing factors, code inspection areas, and defensive remediation guidance.
* **Developer Guardrail:** The system provides intelligent guidance; the developer remains responsible for verifying and applying the final fix.

### 4. ⚡ Sprint Health Scorecard (0–100)
* Dynamically evaluates sprint defect backlog, severity penalties (Critical: -18 pts, High: -9 pts), completion rate, and days remaining vs. velocity target.
* Provides real-time risk classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) with actionable risk mitigation explanations.

### 5. 📋 7-Stage Drag-and-Drop Kanban Board
* Visual defect progression across all 7 lifecycle stages:  
  `Reported ➔ Assigned ➔ In Progress ➔ In Review ➔ Resolved ➔ Verified ➔ Closed` (with `Reopened` support).
* **Role-Based Access Control (RBAC) Enforcement:** Prevents unauthorized developers from verifying or closing defects without QA/Admin sign-off.

### 6. 👥 Teams & Sprints Management
* Complete CRUD for engineering squads and sprint planning.
* Assign developers to teams with custom roles (Tech Lead, Senior Engineer, QA Lead).
* Batch assign backlog defects to active sprints.

### 7. ✨ Embedded "Ask Gemini" AI Chatbot
* Context-aware assistant grounded in project and defect records.
* Quick chips for RCA synthesis, test case drafting, and sprint risk mitigation.

### 8. 🔐 Modern Authentication & Security
* **JWT & RBAC:** Enforces role permissions (Admin, Project Manager, Developer, QA / Tester, Reporter).
* **OAuth 2.0 SSO Providers:** Google, Microsoft, GitHub, LinkedIn.
* **Biometric Face Authentication:** Webcam scanner overlay with biometric confidence matching.
* **Forgot Password Flow:** Animated 6-digit OTP verification box.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| **Database** | SQLite (default portable) / PostgreSQL with pgvector |
| **Intelligence** | Scikit-learn (TF-IDF & Cosine Similarity), Google Generative AI (Gemini) |
| **Authentication** | PyJWT, SHA-256 with Salt, Role-Based Access Control (RBAC) |
| **Frontend** | HTML5, Modern CSS Glassmorphism (`backdrop-filter`, `@starting-style`), Vanilla JavaScript ES6+, Chart.js |
| **Testing & CI/CD** | Pytest, GitHub Actions, Docker, Docker Compose |

---

## 🚀 Quick Start Guide

### 1. Run Locally (FastAPI + Embedded Frontend)
```bash
# Navigate to project directory
cd defect-tracker


The system will start on :
* **Web UI:** ([https://bugflow-ai-defect-tracker-frontend.vercel.app].(https://bugflow-ai-defect-tracker-frontend.vercel.app/))
* **Interactive Swagger API Docs:** ([https://intelligent-software-defect-tracking.onrender.com/docs].(https://intelligent-software-defect-tracking.onrender.com/docs))

---

## 🔑 Pre-Seeded Demo Credentials

You can use the **1-Click Quick Demo Role Switcher** on the login screen, or sign in manually:

| Role | Username | Password | Key Permissions |
|---|---|---|---|
| **Admin** | `admin` | `Admin@123` | Full system access, User/Team management |
| **Project Manager** | `pm_sarah` | `Pm@123` | Sprints, Team creation, Defect triage |
| **Developer** | `dev_alex` | `Dev@123` | Fix defects, Add comments, Link PRs, RCA |
| **QA / Tester** | `qa_priya` | `Qa@123` | Report defects, Verify & Close defects |
| **Reporter** | `reporter_john` | `Reporter@123` | Submit defect reports, Track status |

## 🔐 Official Provider Sign-In Setup

Google, Microsoft, GitHub, and LinkedIn buttons redirect to each provider's official authorization page. Provider passwords are entered only on the provider site. OAuth is disabled until a provider's client ID and secret are configured.

1. Copy `.env.example` to `.env` in the project root and fill in the provider credentials you registered.
2. Register the matching callback URL with each provider: `http://localhost:8000/api/v1/auth/oauth/{provider}/callback` (replace `{provider}` with `google`, `microsoft`, `github`, or `linkedin`).
3. Install backend requirements with `python -m pip install -r backend/requirements.txt`, then restart the app. For Docker, recreate the API container after changing `.env`.

For production, set both OAuth base URLs to your HTTPS domain, register that exact callback URL at each provider, use a strong `SECRET_KEY`, and set `SESSION_COOKIE_SECURE=true`. Do not commit `.env` or put provider secrets in frontend files.

---

## 🧪 Running Automated Tests

Run the complete 14-test verification suite:
```bash
 cd defect-tracker
python -m pytest -v tests/
```
All tests validate:
1. Authentication & JWT Token verification
2. OTP 6-Digit Password Reset flow
3. Face Biometric verification & OAuth simulation
4. Defect creation & 7-stage lifecycle state machine
5. RBAC security guards (Developer cannot verify, QA can verify)
6. Teams CRUD & Member assignment
7. AI report formatting & missing info detection
8. Intelligent classification & confidence scoring
9. Similar and duplicate defect detection
10. Resolution assistance & historical resolution matching
11. Sprint Health score calculation

---

## 🐳 Docker Deployment

Run with PostgreSQL and pgvector using Docker Compose:
```bash
docker-compose up --build
```
* API & UI:[(https://intelligent-software-defect-tracking.onrender.com/docs)](https://intelligent-software-defect-tracking.onrender.com/docs)
* PostgreSQL:  (database: `defect_tracking_db`)

---

## 🗺️ 8-Week Capstone Roadmap Alignment

* **Milestone 1 (Weeks 1–2):** Database schema, Users & RBAC, Projects, Defects CRUD, JWT Auth, AI-assisted defect reporting with missing field detection.
* **Milestone 2 (Weeks 3–4):** Defect lifecycle (Reported ➔ Closed), Drag-and-drop Kanban, Intelligent Classification, Severity/Priority assistance, Similar defect detection, Resolution assistance.
* **Milestone 3 (Weeks 5–6):** Analytics dashboard, REST APIs, Automated testing suite, GitHub Actions CI/CD, AI Defect Summary, Root Cause Analysis, Historical Resolution Knowledge Base, GitHub & Slack integrations.
* **Milestone 4 (Weeks 7–8):** Sprint Health Scorecard (0–100), Database optimization, Security verification, Comprehensive documentation, Professional Glassmorphism UI/UX.
