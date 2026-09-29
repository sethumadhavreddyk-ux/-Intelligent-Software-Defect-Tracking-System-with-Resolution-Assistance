from app.services.ai_service import ai_service
from app.services.similarity_service import similarity_engine
from app.services.sprint_service import sprint_health_engine
from app.services.integration_service import (
    log_activity, send_in_app_notification, broadcast_defect_event,
    dispatch_slack_alert, sync_github_pr
)
