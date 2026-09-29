import datetime
from sqlalchemy.orm import Session
from app.models.models import (
    User, UserRole, Team, TeamMember, Project, Sprint, SprintStatus,
    Defect, DefectStatus, DefectPriority, DefectSeverity, DefectCategory, DefectType,
    DefectComment, ActivityLog, HistoricalResolution, Notification,
    KnowledgeDocument, KnowledgeChunk
)
from app.auth.security import hash_password

def seed_database(db: Session):
    print("[SEED] Ensuring BugFlow seed data is populated...")

    # Helper function to get or create user
    def get_or_create_user(username, email, full_name, role, password, avatar_url):
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=role,
                avatar_url=avatar_url
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    # 1. Users
    admin_user = get_or_create_user("admin", "admin@defecttracker.com", "System Administrator", UserRole.ADMIN, "Admin@123", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")
    pm_user = get_or_create_user("pm_sarah", "sarah.pm@defecttracker.com", "Sarah Jenkins", UserRole.PROJECT_MANAGER, "Pm@123", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150")
    alex_user = get_or_create_user("dev_alex", "alex.dev@defecttracker.com", "Alex Chen", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150")
    priya_user = get_or_create_user("qa_priya", "priya.qa@defecttracker.com", "Priya Patel", UserRole.QA, "Qa@123", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150")
    john_user = get_or_create_user("reporter_john", "john.reporter@defecttracker.com", "John Doe", UserRole.REPORTER, "Reporter@123", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150")
    elena_user = get_or_create_user("dev_elena", "elena.dev@defecttracker.com", "Elena Rostova", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")

    # Team members from mockups
    madhav_user = get_or_create_user("madhav", "madhav@bugflow.io", "K. Sethu Madhav", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150")
    rajesh_user = get_or_create_user("rajesh", "rajesh@bugflow.io", "Rajesh Kumar", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150")
    priya_s_user = get_or_create_user("priya_sharma", "priya.sharma@bugflow.io", "Priya Sharma", UserRole.QA, "Qa@123", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150")
    karthik_user = get_or_create_user("karthik", "karthik@bugflow.io", "Karthik Reddy", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150")
    anjali_user = get_or_create_user("anjali", "anjali@bugflow.io", "Anjali Verma", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150")
    suresh_user = get_or_create_user("suresh", "suresh@bugflow.io", "Suresh Babu", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150")
    sneha_user = get_or_create_user("sneha", "sneha@bugflow.io", "Sneha Rao", UserRole.DEVELOPER, "Dev@123", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150")

    # 2. Teams
    def get_or_create_team(name, desc, lead):
        t = db.query(Team).filter(Team.name == name).first()
        if not t:
            t = Team(name=name, description=desc, lead_id=lead.id)
            db.add(t)
            db.commit()
            db.refresh(t)
        return t

    team_frontend = get_or_create_team("Frontend Team", "Web application, responsive layouts, glassmorphism UI/UX.", rajesh_user)
    team_backend = get_or_create_team("Backend Team", "High-throughput APIs, authentication, microservices.", madhav_user)
    team_qa = get_or_create_team("QA Team", "Automated testing, defect triage, regression suites.", priya_s_user)
    team_devops = get_or_create_team("DevOps Team", "CI/CD pipelines, container orchestration, cluster monitoring.", suresh_user)
    team_aiml = get_or_create_team("AI/ML Team", "Vector search, root cause intelligence, Gemini integration.", karthik_user)

    # Memberships
    def add_membership(team, user, role_in_team):
        existing = db.query(TeamMember).filter(TeamMember.team_id == team.id, TeamMember.user_id == user.id).first()
        if not existing:
            tm = TeamMember(team_id=team.id, user_id=user.id, role_in_team=role_in_team)
            db.add(tm)
            db.commit()

    add_membership(team_frontend, rajesh_user, "Lead Developer")
    add_membership(team_frontend, madhav_user, "Senior Developer")
    add_membership(team_frontend, anjali_user, "Frontend Engineer")
    add_membership(team_frontend, sneha_user, "UI Specialist")
    add_membership(team_frontend, alex_user, "Fullstack Developer")

    add_membership(team_backend, madhav_user, "Lead Architect")
    add_membership(team_backend, elena_user, "Backend Developer")
    add_membership(team_backend, alex_user, "Senior Engineer")
    add_membership(team_backend, karthik_user, "Systems Engineer")

    add_membership(team_qa, priya_s_user, "QA Lead")
    add_membership(team_qa, priya_user, "Senior Test Engineer")
    add_membership(team_qa, john_user, "Triage Specialist")

    add_membership(team_devops, suresh_user, "DevOps Architect")
    add_membership(team_devops, alex_user, "Cloud Engineer")

    add_membership(team_aiml, karthik_user, "AI Research Lead")
    add_membership(team_aiml, madhav_user, "ML Integration Engineer")

    # 3. Projects
    def get_or_create_project(name, key, desc, team, lead):
        p = db.query(Project).filter(Project.key == key).first()
        if not p:
            p = Project(name=name, key=key, description=desc, team_id=team.id, lead_id=lead.id)
            db.add(p)
            db.commit()
            db.refresh(p)
        return p

    prj_bugflow = get_or_create_project("BugFlow Project - Professional Plan", "DEF", "Core intelligent defect tracking & automated resolution platform.", team_frontend, madhav_user)
    prj_acme = get_or_create_project("Acme Project", "ACME", "Enterprise SaaS product suite with distributed microservices.", team_backend, pm_user)
    prj_pay = get_or_create_project("Payment Gateway Platform", "PAY", "High-throughput payment processing engine with Stripe/PayPal.", team_backend, pm_user)

    # 4. Sprints
    now = datetime.datetime.now(datetime.UTC) if hasattr(datetime, 'UTC') else datetime.datetime.utcnow()
    def get_or_create_sprint(name, prj, goal, start_d, end_d, status, velocity):
        s = db.query(Sprint).filter(Sprint.name == name).first()
        if not s:
            s = Sprint(
                name=name,
                project_id=prj.id,
                goal=goal,
                start_date=start_d,
                end_date=end_d,
                status=status,
                velocity_target=velocity
            )
            db.add(s)
            db.commit()
            db.refresh(s)
        return s

    sprint_5 = get_or_create_sprint(
        "Sprint 5 - Release v2.1",
        prj_bugflow,
        "Zero critical defect leakage, mobile layout stabilization, and sub-second AI RCA response.",
        now - datetime.timedelta(days=12),
        now + datetime.timedelta(days=18),
        SprintStatus.ACTIVE,
        48
    )

    sprint_3 = get_or_create_sprint(
        "Sprint 3 - BugFlow MVP",
        prj_bugflow,
        "Initial MVP deployment with core defect lifecycle state machine and drag-drop kanban.",
        now - datetime.timedelta(days=40),
        now - datetime.timedelta(days=13),
        SprintStatus.COMPLETED,
        34
    )

    # 5. Historical Resolutions
    historical_data = [
        ("DEF-098", "Payment submission causes application crash", "Payment",
         "Null response property dereferenced in payment confirmation modal when gateway returned empty message.",
         "Added optional chaining and null fallback guard before accessing `response.data.transactionId`. Added unit test covering empty responses.",
         "1. Inspect payment API response structure.\n2. Review frontend error boundary logs.\n3. Add schema validation fallback.",
         "payment crash submit undefined null response"),
        ("DEF-082", "JWT token expires without automatic refresh", "Authentication",
         "Axios interceptor failed to handle 401 response loop when refresh token also expired.",
         "Updated axios response interceptor to detect 401, initiate refresh token handshake, and queue pending requests.",
         "1. Check token expiration timestamp in localStorage.\n2. Review auth interceptor middleware.\n3. Verify refresh endpoint CORS headers.",
         "jwt login token 401 auth expire refresh"),
        ("DEF-077", "Database connection pool timeout during checkout spike", "Database",
         "Missing composite index on orders table caused full table scan on `(user_id, status)` queries.",
         "Created composite B-Tree index `idx_orders_user_status` and increased pool max overflow to 20.",
         "1. Run EXPLAIN ANALYZE on query.\n2. Check DB active connections.\n3. Configure connection recycle timeout.",
         "database timeout query index slow pool postgres"),
        ("DEF-065", "Checkout total calculation NaN error with coupon discount", "Payment",
         "Discount percentage was parsed as string without parseFloat casting, producing NaN in price calculation.",
         "Explicitly cast discount values using Number() with fallback default 0.00.",
         "1. Check promo code API payload types.\n2. Add currency math precision helper.\n3. Validate cart total before submit.",
         "checkout cart discount nan total coupon"),
        ("DEF-044", "Stripe Gateway Fail on webhook signature validation", "Payment",
         "Webhook raw body stream was consumed before HMAC signature calculation in express middleware.",
         "Preserved raw binary request buffer for Stripe signature verification before JSON parsing.",
         "1. Inspect raw buffer parser.\n2. Verify endpoint webhook secret key.\n3. Replay webhook event from Stripe CLI.",
         "stripe webhook signature 400 payment fail gateway"),
        ("DEF-019", "Checkout Exception on null customer address", "Payment",
         "Guest checkout permitted submitting order when shipping address object was undefined.",
         "Added server-side Zod/Pydantic validation ensuring shipping address object is required on guest orders.",
         "1. Verify guest checkout request body.\n2. Add frontend form validation guard.\n3. Check fallback defaults.",
         "checkout exception null address shipping order fail")
    ]

    for key, title, cat, cause, res, steps, kw in historical_data:
        if not db.query(HistoricalResolution).filter(HistoricalResolution.defect_key == key).first():
            hr = HistoricalResolution(
                defect_key=key,
                defect_title=title,
                category=cat,
                root_cause=cause,
                resolution_text=res,
                investigation_steps=steps,
                keywords=kw
            )
            db.add(hr)
    db.commit()

    # 6. Defects matching mockups
    mockup_defects = [
        {
            "key": "DEF-108",
            "title": "Login page not working on mobile devices",
            "raw": "Users on iOS Safari and mobile Chrome report login button is unresponsive after entering credentials.",
            "formatted": "### Summary\nMobile touch event handler blocked by overlay z-index on login screen.\n\n### Steps to Reproduce\n1. Open mobile browser\n2. Enter valid email and password\n3. Tap 'Sign In'\n\n### Expected\nUser is authenticated and redirected to dashboard.\n\n### Actual\nNo response, console shows passive event listener warning.",
            "status": DefectStatus.IN_PROGRESS,
            "priority": DefectPriority.CRITICAL,
            "severity": DefectSeverity.CRITICAL,
            "category": DefectCategory.AUTHENTICATION,
            "type": DefectType.FUNCTIONAL,
            "reporter": priya_s_user,
            "assignee": rajesh_user,
            "hours_ago": 2,
            "root_cause": "Touch event interceptor in backdrop-filter overlay capturing pointer events.",
            "resolution_summary": "Added pointer-events: none on ambient backdrop glow elements."
        },
        {
            "key": "DEF-107",
            "title": "API response error on customer order history endpoint",
            "raw": "Order history endpoint returns HTTP 500 when orders contain legacy coupon items.",
            "formatted": "### Summary\nAPI unhandled deserialization error for archived discount schemas.\n\n### Actual\nHTTP 500 Internal Server Error: KeyError 'discount_rate'.",
            "status": DefectStatus.ASSIGNED,
            "priority": DefectPriority.HIGH,
            "severity": DefectSeverity.HIGH,
            "category": DefectCategory.API,
            "type": DefectType.REGRESSION,
            "reporter": madhav_user,
            "assignee": priya_s_user,
            "hours_ago": 4,
            "root_cause": "Missing fallback schema validator for deprecated order line items.",
            "resolution_summary": "Added Pydantic root_validator with backward compatibility support."
        },
        {
            "key": "DEF-106",
            "title": "UI alignment issue in Kanban board columns",
            "raw": "Ticket card tags overflow horizontally when ticket has more than 3 labels on 1080p displays.",
            "formatted": "### Summary\nKanban column flex container lacks flex-wrap styling.\n\n### Actual\nHorizontal scrollbar appears inside individual card.",
            "status": DefectStatus.IN_REVIEW,
            "priority": DefectPriority.MEDIUM,
            "severity": DefectSeverity.MEDIUM,
            "category": DefectCategory.UI_UX,
            "type": DefectType.VISUAL,
            "reporter": anjali_user,
            "assignee": karthik_user,
            "hours_ago": 6,
            "root_cause": "Card metadata chip row had white-space: nowrap without flex-wrap: wrap.",
            "resolution_summary": "Applied flex-wrap and gap-2 to ticket card tags container."
        },
        {
            "key": "DEF-105",
            "title": "Database connection timeout during traffic spike",
            "raw": "During 9 AM peak login rush, database pool max connections reached resulting in 30s timeout.",
            "formatted": "### Summary\nConnection leak in async health check middleware without session context manager.",
            "status": DefectStatus.REPORTED,
            "priority": DefectPriority.CRITICAL,
            "severity": DefectSeverity.CRITICAL,
            "category": DefectCategory.DATABASE,
            "type": DefectType.PERFORMANCE,
            "reporter": suresh_user,
            "assignee": None,
            "hours_ago": 8,
            "root_cause": "Unclosed database sessions in telemetry middleware.",
            "resolution_summary": "Enforced FastAPI Depends(get_db) session generator across all routes."
        },
        {
            "key": "DEF-104",
            "title": "File upload fails on attachments larger than 5MB",
            "raw": "Uploading defect screenshot PNG larger than 5MB throws HTTP 413 Payload Too Large.",
            "formatted": "### Summary\nNginx proxy client_max_body_size set to 2M default.",
            "status": DefectStatus.RESOLVED,
            "priority": DefectPriority.HIGH,
            "severity": DefectSeverity.HIGH,
            "category": DefectCategory.API,
            "type": DefectType.FUNCTIONAL,
            "reporter": john_user,
            "assignee": sneha_user,
            "hours_ago": 24,
            "root_cause": "Proxy body size limit restricted to 2MB instead of 25MB.",
            "resolution_summary": "Configured client_max_body_size 25M in nginx reverse proxy."
        },
        {
            "key": "DEF-103",
            "title": "UI alignment issue on mobile checkout payment options",
            "raw": "Radio buttons for Credit Card and UPI overlap on screens narrower than 380px.",
            "formatted": "### Summary\nPayment selector grid column template not collapsing to single column on mobile.",
            "status": DefectStatus.REPORTED,
            "priority": DefectPriority.MEDIUM,
            "severity": DefectSeverity.MEDIUM,
            "category": DefectCategory.UI_UX,
            "type": DefectType.VISUAL,
            "reporter": anjali_user,
            "assignee": madhav_user,
            "hours_ago": 26,
            "root_cause": "CSS grid-template-columns: 1fr 1fr without mobile media query.",
            "resolution_summary": "Added responsive breakpoint collapsing to 1fr on mobile viewports."
        },
        {
            "key": "DEF-101",
            "title": "Payment page crashes when user clicks Submit",
            "raw": "When submitting payment on checkout, page goes blank and application crashes with submission error.",
            "formatted": "### Summary\nPayment page unhandled exception on submission.\n\n### Actual\nPage crashes with TypeError: Cannot read properties of undefined (reading 'status').",
            "steps": "1. Add item to cart\n2. Click Submit Payment button on checkout page\n3. Observe application crash on submit",
            "expected": "Order confirmation screen displays with transaction reference.",
            "actual": "Page crashes with unhandled TypeError in PaymentForm.tsx:142.",
            "status": DefectStatus.REPORTED,
            "priority": DefectPriority.CRITICAL,
            "severity": DefectSeverity.CRITICAL,
            "category": DefectCategory.PAYMENT,
            "type": DefectType.FUNCTIONAL,
            "reporter": priya_s_user,
            "assignee": madhav_user,
            "hours_ago": 28,
            "root_cause": "Unchecked gateway response object when 3D Secure verification is skipped.",
            "resolution_summary": "Adding defensive optional chaining and fallback error boundary."
        },
        {
            "key": "DEF-098",
            "title": "API response error during high volume checkout",
            "raw": "Gateway latency spikes cause client connection drop before order ID generated.",
            "formatted": "### Summary\nPayment processing timeout triggers unhandled client exception.",
            "status": DefectStatus.ASSIGNED,
            "priority": DefectPriority.CRITICAL,
            "severity": DefectSeverity.CRITICAL,
            "category": DefectCategory.PAYMENT,
            "type": DefectType.FUNCTIONAL,
            "reporter": pm_user,
            "assignee": rajesh_user,
            "hours_ago": 30,
            "root_cause": "Gateway webhook timeout set to 5s instead of 30s.",
            "resolution_summary": "Increased webhook timeout and implemented optimistic order creation queue."
        },
        {
            "key": "DEF-094",
            "title": "Payment gateway issue with international credit cards",
            "raw": "Foreign currency transactions fail with 3D Secure 2 authentication handshake.",
            "formatted": "### Summary\nISO currency code mismatch between frontend form and payment processor.",
            "status": DefectStatus.IN_PROGRESS,
            "priority": DefectPriority.HIGH,
            "severity": DefectSeverity.HIGH,
            "category": DefectCategory.PAYMENT,
            "type": DefectType.FUNCTIONAL,
            "reporter": priya_user,
            "assignee": madhav_user,
            "hours_ago": 32,
            "root_cause": "Missing ISO-4217 currency normalization helper in payment payload.",
            "resolution_summary": "Added currency code normalizer and integrated Stripe 3DS2 sandbox testing."
        },
        {
            "key": "DEF-087",
            "title": "Dashboard chart rendering issue with zero-defect days",
            "raw": "Chart.js spline crashes with NaN value when date bucket has 0 recorded defects.",
            "formatted": "### Summary\nEmpty array division in chart moving average calculation.",
            "status": DefectStatus.IN_REVIEW,
            "priority": DefectPriority.MEDIUM,
            "severity": DefectSeverity.MEDIUM,
            "category": DefectCategory.UI_UX,
            "type": DefectType.VISUAL,
            "reporter": rajesh_user,
            "assignee": priya_s_user,
            "hours_ago": 36,
            "root_cause": "Moving average helper divided by bucket count without zero check.",
            "resolution_summary": "Added Math.max(1, count) and default 0 fallback for empty days."
        },
        {
            "key": "DEF-060",
            "title": "File upload error in defect attachment drag-drop zone",
            "raw": "Dropping HEIC images from iPhone does not convert to preview thumbnail.",
            "formatted": "### Summary\nMissing HEIC mime type support in browser image preview reader.",
            "status": DefectStatus.IN_REVIEW,
            "priority": DefectPriority.LOW,
            "severity": DefectSeverity.LOW,
            "category": DefectCategory.UI_UX,
            "type": DefectType.COMPATIBILITY,
            "reporter": john_user,
            "assignee": suresh_user,
            "hours_ago": 40,
            "root_cause": "Canvas drawImage cannot natively decode HEIC containers without heic2any.",
            "resolution_summary": "Added client-side heic2any transcode fallback before canvas render."
        }
    ]

    for item in mockup_defects:
        d = db.query(Defect).filter(Defect.key == item["key"]).first()
        created_time = now - datetime.timedelta(hours=item["hours_ago"])
        if not d:
            d = Defect(
                key=item["key"],
                title=item["title"],
                raw_description=item["raw"],
                formatted_description=item["formatted"],
                status=item["status"],
                priority=item["priority"],
                severity=item["severity"],
                category=item["category"],
                defect_type=item["type"],
                project_id=prj_bugflow.id,
                sprint_id=sprint_5.id,
                reporter_id=item["reporter"].id,
                assignee_id=item["assignee"].id if item["assignee"] else None,
                steps_to_reproduce=item.get("steps"),
                expected_result=item.get("expected"),
                actual_result=item.get("actual"),
                root_cause=item.get("root_cause"),
                resolution_summary=item.get("resolution_summary"),
                created_at=created_time,
                updated_at=created_time
            )
            db.add(d)
        else:
            d.title = item["title"]
            d.raw_description = item["raw"]
            d.formatted_description = item["formatted"]
            d.status = item["status"]
            d.priority = item["priority"]
            d.severity = item["severity"]
            d.category = item["category"]
            d.defect_type = item["type"]
            d.steps_to_reproduce = item.get("steps")
            d.expected_result = item.get("expected")
            d.actual_result = item.get("actual")
            d.assignee_id = item["assignee"].id if item["assignee"] else None
            d.root_cause = item.get("root_cause")
            d.resolution_summary = item.get("resolution_summary")
    db.commit()

    # Activity Logs & Notifications
    if db.query(ActivityLog).count() < 5:
        logs = [
            ActivityLog(defect_id=1, user_id=rajesh_user.id, action_type="STATUS_CHANGE", description="Rajesh Kumar moved DEF-108 status to In Progress (2 mins ago)"),
            ActivityLog(defect_id=2, user_id=madhav_user.id, action_type="ASSIGNED", description="New team member added to Frontend Team (15 mins ago)"),
            ActivityLog(defect_id=3, user_id=karthik_user.id, action_type="AI_ANALYSIS", description="AI analysis completed for DEF-101 (28 mins ago)"),
            ActivityLog(defect_id=4, user_id=pm_user.id, action_type="SPRINT_UPDATE", description="Sprint 5 created & backlog assigned (1 hour ago)"),
            ActivityLog(defect_id=5, user_id=priya_s_user.id, action_type="COMMENT", description="New comment added on DEF-098 (2 hours ago)")
        ]
        db.add_all(logs)
        db.commit()

    if db.query(Notification).count() < 5:
        notifs = [
            Notification(user_id=madhav_user.id, title="DEF-106 assigned to you", message="Arjun assigned defect DEF-106 to you for review.", notification_type="ALERT", link_url="/#defects"),
            Notification(user_id=madhav_user.id, title="Sprint 5 updated", message="Sprint 5 targets updated: 48 total defects scheduled.", notification_type="INFO", link_url="/#sprints"),
            Notification(user_id=madhav_user.id, title="AI analysis completed for DEF-107", message="Root Cause Analysis synthesized with 92% confidence.", notification_type="SUCCESS", link_url="/#intelligence"),
            Notification(user_id=madhav_user.id, title="New team member added", message="Sneha Rao joined Frontend Squad as UI Specialist.", notification_type="INFO", link_url="/#teams"),
            Notification(user_id=madhav_user.id, title="Critical defect alert (DEF-105)", message="Unassigned critical blocker: Database connection timeout.", notification_type="WARNING", link_url="/#defects")
        ]
        db.add_all(notifs)
        db.commit()

    # RAG Knowledge Documents & Vector Chunks
    if db.query(KnowledgeDocument).count() < 4:
        from app.services.rag_service import rag_service

        seed_docs = [
            {
                "title": "Payment Gateway Webhook Idempotency & Signature Verification",
                "category": "Payment",
                "doc_type": "architecture",
                "tags": "stripe, webhook, idempotency, sha256, payment-failure",
                "author": "K. Sethu Madhav",
                "summary": "Standard operating procedure for handling external payment webhook retries, replay attacks, and duplicate transaction prevention.",
                "content": """# Payment Gateway Webhook Idempotency Standard

## 1. Problem Statement
Third-party payment gateways (e.g. Stripe, PayPal, Razorpay) guarantee at-least-once delivery of transaction webhooks. Under high network latency or temporary 5xx spikes, duplicate events are dispatched to our payment listener.

## 2. Idempotency Key Architecture
Every incoming webhook MUST be checked against the `processed_event_ids` Redis cache before dispatching order fulfillment:
```python
def process_payment_webhook(event_id: str, signature: str, payload: dict):
    if redis_client.get(f"webhook:{event_id}"):
        logger.info(f"Duplicate event {event_id} discarded.")
        return {"status": "duplicate_handled"}
    
    # Verify HMAC SHA256 Signature
    verify_hmac_sha256(payload, signature, secret_key=SETTINGS.PAYMENT_SECRET)
    
    # Atomic Lock & Persistence
    with transaction_manager():
        update_order_status(payload["order_id"], status="CONFIRMED")
        redis_client.setex(f"webhook:{event_id}", ttl=86400, value="PROCESSED")
```

## 3. Recommended Remediation for DEF-108
When null response payloads occur due to transient network drops, wrap JSON decoding with explicit Nullable response validators and default fallback order status flags."""
            },
            {
                "title": "JWT Authentication Token Lifecycle, Rotation & Cookie Security",
                "category": "Authentication",
                "doc_type": "security",
                "tags": "jwt, tokens, rbac, refresh-token, cookies, csrf",
                "author": "Alex Chen",
                "summary": "Security guidelines for signing HS256/RS256 JWT tokens, handling sliding expiration, and mitigating token leakage.",
                "content": """# JWT Security Architecture & Role Enforcement

## 1. Token Claims & Encoding
All access tokens emitted by `/api/v1/auth/login` include the following claims:
- `sub`: User unique username or UUID
- `role`: Canonical RBAC role (Admin, Project Manager, Developer, QA, Reporter)
- `exp`: Expiration epoch timestamp (defaults to 120 minutes)
- `jti`: Unique token identification salt

## 2. RBAC Guard Implementation
In FastAPI endpoint dependencies, enforce role boundaries via `require_role` decorators:
```python
def require_qa_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.QA, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Verification requires QA role privileges.")
    return current_user
```

## 3. Biometric and QR Token Integration
Biometric Face Authentication and QR challenge codes generate ephemeral verification tokens with a 120-second TTL. Once authorized via the mobile app endpoint `/auth/qr/authenticate`, the challenge is exchanged for a production JWT session."""
            },
            {
                "title": "PostgreSQL Connection Pooling, Timeouts & Deadlock Mitigation",
                "category": "Database",
                "doc_type": "infrastructure",
                "tags": "postgresql, sqlalchemy, pgbouncer, pool-exhaustion, timeouts",
                "author": "Suresh Babu",
                "summary": "Architectural runbook for resolving database connection pool starvation and long-running transaction lockups.",
                "content": """# Database Resilience & Connection Pool Runbook

## 1. Symptoms of Pool Exhaustion
When background task workers or parallel analytical queries do not release connections back to `SessionLocal`, the application logs:
`TimeoutError: QueuePool limit of size 20 overflow 10 reached, connection timed out.`

## 2. Mitigation Strategy
Configure SQLAlchemy engine with robust recycle parameters:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=25,
    max_overflow=15,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True
)
```

## 3. Fast Session Teardown
Always use context managers or FastAPI dependency injection `get_db()` with `finally: db.close()` blocks to guarantee socket cleanup even during unhandled exceptions."""
            },
            {
                "title": "Automated Defect Triage, Root Cause Standards & SLA Rules",
                "category": "General",
                "doc_type": "process",
                "tags": "triage, rca, sla, quality-assurance, defect-lifecycle",
                "author": "Priya Sharma",
                "summary": "Engineering standards for evaluating defect severity, target resolution SLAs, and conducting blameless RCAs.",
                "content": """# Defect Lifecycle & SLA Guidelines

## 1. Severity Definitions & Target Resolution Time
- **Critical (Blocker)**: Complete system outage, data loss risk, or payment processing blocker. SLA: < 4 hours.
- **High**: Major feature impaired with no immediate workaround. SLA: < 24 hours.
- **Medium**: Functional discrepancy with available alternate user journey. SLA: 3 business days.
- **Low**: Cosmetic visual defect, minor wording typo, or non-blocking UI alignment. SLA: Scheduled in next sprint.

## 2. Mandatory Verification Gates
A resolved defect CANNOT be moved to `Closed` directly by the developer who resolved it. An independent QA Engineer or Admin must verify reproduction steps in the staging environment before signing off."""
            },
            {
                "title": "HEIC and High-Resolution Image Processing for Drag-Drop Uploads",
                "category": "UI / UX",
                "doc_type": "frontend",
                "tags": "heic, canvas, dropzone, attachments, thumbnails",
                "author": "Rajesh Kumar",
                "summary": "Technical guide for handling camera RAW and Apple HEIC photo uploads in web browsers.",
                "content": """# Browser Media Ingestion & Attachment Thumbnails

## 1. Problem
Modern iOS mobile devices capture bug report screenshots in HEIC container formats. Browsers cannot decode `.heic` directly inside standard `<img>` tags or 2D HTML5 canvas elements.

## 2. Solution
Integrate client-side transcoding using `heic2any` before rendering the dropzone preview:
```javascript
async function processDroppedFile(file) {
    if (file.type === "image/heic" || file.name.endsWith(".heic")) {
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
        return new File([convertedBlob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
    }
    return file;
}
```"""
            }
        ]

        for s_doc in seed_docs:
            doc = KnowledgeDocument(
                title=s_doc["title"],
                category=s_doc["category"],
                doc_type=s_doc["doc_type"],
                content=s_doc["content"],
                summary=s_doc["summary"],
                tags=s_doc["tags"],
                author=s_doc["author"]
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # Chunk doc
            chunks = rag_service.chunk_document(s_doc["content"], chunk_size=320, overlap=40)
            for idx, c_text in enumerate(chunks):
                chunk = KnowledgeChunk(
                    document_id=doc.id,
                    chunk_index=idx + 1,
                    chunk_text=c_text,
                    token_count=len(c_text.split()),
                    keywords=rag_service.extract_keywords(c_text)
                )
                db.add(chunk)
            db.commit()

    # Historical Resolutions
    if db.query(HistoricalResolution).count() < 4:
        hr_items = [
            HistoricalResolution(
                defect_key="DEF-102",
                defect_title="Stripe payment webhook fails on duplicate event replay",
                category="Payment",
                root_cause="Missing idempotency key check allowed duplicate order debit processing.",
                resolution_text="Implemented Redis setnx cache with event_id key and 24h expiration.",
                investigation_steps="1. Inspect webhook logs for duplicate event IDs. 2. Verify Redis cache setnx lock.",
                keywords="stripe, webhook, idempotency, duplicate, payment"
            ),
            HistoricalResolution(
                defect_key="DEF-095",
                defect_title="Database connection timeout during peak sprint burndown",
                category="Database",
                root_cause="SQLAlchemy default pool size of 5 was exhausted by unclosed session connections.",
                resolution_text="Upgraded pool_size=25, max_overflow=15, and enforced context-managed session disposal.",
                investigation_steps="1. Check active pg_stat_activity connections. 2. Verify SessionLocal context closures.",
                keywords="database, pool, timeout, connection, sqlalchemy"
            ),
            HistoricalResolution(
                defect_key="DEF-088",
                defect_title="Token expiration redirects user to 404 instead of login",
                category="Authentication",
                root_cause="Axios 401 interceptor failed to catch expired token before route change.",
                resolution_text="Added unified 401 response interceptor with automatic redirect to #auth overlay.",
                investigation_steps="1. Verify JWT expiry timestamp in payload. 2. Confirm Axios error response interceptor.",
                keywords="jwt, token, 401, redirect, auth, interceptor"
            ),
            HistoricalResolution(
                defect_key="DEF-071",
                defect_title="Drag-and-drop card state reverts after drop on Kanban column",
                category="UI / UX",
                root_cause="Optimistic UI update did not handle HTTP 403 Forbidden rejection when developer attempted QA verification.",
                resolution_text="Added rollback state handler in drag-and-drop event listener with clear toast alert.",
                investigation_steps="1. Check browser console on drop event. 2. Verify RBAC error handling and rollback.",
                keywords="kanban, drag-and-drop, rollback, rbac, forbidden"
            )
        ]
        db.add_all(hr_items)
        db.commit()

    print("[SEED] BugFlow data seed successfully updated and synchronized!")

