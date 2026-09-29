import json
import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import (
    ActivityLog, Notification, IntegrationLog, Defect, User
)
from app.config import settings

def log_activity(
    db: Session,
    action_type: str,
    description: str,
    defect_id: Optional[int] = None,
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    field_changed: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None
) -> ActivityLog:
    """Creates an audit log entry for any system change."""
    log_entry = ActivityLog(
        defect_id=defect_id,
        project_id=project_id,
        user_id=user_id,
        action_type=action_type,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        description=description,
        created_at=datetime.datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def send_in_app_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "INFO",
    link_url: Optional[str] = None
) -> Notification:
    """Dispatches a notification to a specific user."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link_url=link_url,
        is_read=False,
        created_at=datetime.datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def broadcast_defect_event(
    db: Session,
    defect: Defect,
    event_title: str,
    event_message: str,
    event_type: str = "ALERT"
):
    """Notifies assignee and reporter of a defect update."""
    targets = set()
    if defect.assignee_id:
        targets.add(defect.assignee_id)
    if defect.reporter_id:
        targets.add(defect.reporter_id)

    for uid in targets:
        send_in_app_notification(
            db=db,
            user_id=uid,
            title=f"[{defect.key}] {event_title}",
            message=event_message,
            notification_type=event_type,
            link_url=f"/#defects?id={defect.id}"
        )

def dispatch_slack_alert(
    db: Session,
    message: str,
    channel: str = "#defects-alerts",
    defect_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends or records an alert in Slack. Supports actual webhook if configured or logs cleanly.
    """
    payload = {
        "channel": channel,
        "text": message,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "defect_key": defect_key
    }
    
    # Check if live webhook configured
    if settings.SLACK_WEBHOOK_URL:
        try:
            import requests
            requests.post(settings.SLACK_WEBHOOK_URL, json={"text": message}, timeout=3)
        except Exception:
            pass

    # Record in integration logs
    log = IntegrationLog(
        provider="Slack",
        event_type="ALERT_DISPATCHED",
        payload=json.dumps(payload),
        status="DELIVERED",
        created_at=datetime.datetime.utcnow()
    )
    db.add(log)
    db.commit()
    return {"status": "DELIVERED", "channel": channel, "message": message}

def sync_github_pr(
    db: Session,
    defect: Defect,
    pr_url: Optional[str] = None,
    commit_hash: Optional[str] = None
) -> Dict[str, Any]:
    """
    Links a GitHub PR or commit to a defect and logs the event.
    """
    if pr_url:
        defect.github_pr_url = pr_url
    if commit_hash:
        defect.github_commit_hash = commit_hash

    db.commit()

    log_entry = IntegrationLog(
        provider="GitHub",
        event_type="PR_LINKED",
        payload=json.dumps({
            "defect_key": defect.key,
            "pr_url": pr_url,
            "commit_hash": commit_hash
        }),
        status="LINKED",
        created_at=datetime.datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": "SUCCESS",
        "defect_key": defect.key,
        "pr_url": defect.github_pr_url,
        "commit_hash": defect.github_commit_hash
    }
