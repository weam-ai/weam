import logging
from typing import List, Optional, Any, Union

from src.MCP.google.google_auth import get_authenticated_google_service, get_authenticated_google_service_calendar, get_authenticated_google_service_drive, get_authenticated_google_service_gmail, GoogleAuthenticationError
from src.MCP.google.scopes import (
    GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE, GMAIL_COMPOSE_SCOPE, GMAIL_MODIFY_SCOPE, GMAIL_LABELS_SCOPE,
    DRIVE_READONLY_SCOPE, DRIVE_FILE_SCOPE,
    DOCS_READONLY_SCOPE, DOCS_WRITE_SCOPE,
    CALENDAR_READONLY_SCOPE, CALENDAR_EVENTS_SCOPE,
    SHEETS_READONLY_SCOPE, SHEETS_WRITE_SCOPE,
    CHAT_READONLY_SCOPE, CHAT_WRITE_SCOPE, CHAT_SPACES_SCOPE,
    FORMS_BODY_SCOPE, FORMS_BODY_READONLY_SCOPE, FORMS_RESPONSES_READONLY_SCOPE,
    SLIDES_SCOPE, SLIDES_READONLY_SCOPE,
    TASKS_SCOPE, TASKS_READONLY_SCOPE
)

logger = logging.getLogger(__name__)

# Service configuration mapping
SERVICE_CONFIGS = {
    "gmail": {"service": "gmail", "version": "v1"},
    "drive": {"service": "drive", "version": "v3"},
    "calendar": {"service": "calendar", "version": "v3"},
    "docs": {"service": "docs", "version": "v1"},
    "sheets": {"service": "sheets", "version": "v4"},
    "chat": {"service": "chat", "version": "v1"},
    "forms": {"service": "forms", "version": "v1"},
    "slides": {"service": "slides", "version": "v1"},
    "tasks": {"service": "tasks", "version": "v1"}
}


# Scope group definitions for easy reference
SCOPE_GROUPS = {
    # Gmail scopes
    "gmail_read": GMAIL_READONLY_SCOPE,
    "gmail_send": GMAIL_SEND_SCOPE,
    "gmail_compose": GMAIL_COMPOSE_SCOPE,
    "gmail_modify": GMAIL_MODIFY_SCOPE,
    "gmail_labels": GMAIL_LABELS_SCOPE,

    # Drive scopes
    "drive_read": DRIVE_READONLY_SCOPE,
    "drive_file": DRIVE_FILE_SCOPE,

    # Docs scopes
    "docs_read": DOCS_READONLY_SCOPE,
    "docs_write": DOCS_WRITE_SCOPE,

    # Calendar scopes
    "calendar_read": CALENDAR_READONLY_SCOPE,
    "calendar_events": CALENDAR_EVENTS_SCOPE,

    # Sheets scopes
    "sheets_read": SHEETS_READONLY_SCOPE,
    "sheets_write": SHEETS_WRITE_SCOPE,

    # Chat scopes
    "chat_read": CHAT_READONLY_SCOPE,
    "chat_write": CHAT_WRITE_SCOPE,
    "chat_spaces": CHAT_SPACES_SCOPE,

    # Forms scopes
    "forms": FORMS_BODY_SCOPE,
    "forms_read": FORMS_BODY_READONLY_SCOPE,
    "forms_responses_read": FORMS_RESPONSES_READONLY_SCOPE,

    # Slides scopes
    "slides": SLIDES_SCOPE,
    "slides_read": SLIDES_READONLY_SCOPE,

    # Tasks scopes
    "tasks": TASKS_SCOPE,
    "tasks_read": TASKS_READONLY_SCOPE,
}

def _resolve_scopes(scopes: Union[str, List[str]]) -> List[str]:
    """Resolve scope names to actual scope URLs."""
    if isinstance(scopes, str):
        if scopes in SCOPE_GROUPS:
            return [SCOPE_GROUPS[scopes]]
        else:
            return [scopes]

    resolved = []
    for scope in scopes:
        if scope in SCOPE_GROUPS:
            resolved.append(SCOPE_GROUPS[scope])
        else:
            resolved.append(scope)
    return resolved


async def acquire_google_service(
    mcp_data: str,
    service_type: str,
    scopes: Union[str, List[str]],
    tool_name: str,
    version: Optional[str] = None,
) -> Any: # Returns the googleapiclient service object
    """
    Handles Google service authentication and returns an initialized service object.

    Args:
        service_type: Type of Google service ("gmail", "drive", "calendar", etc.).
        scopes: Required scopes (can be scope group names or actual URLs).
        tool_name: The name of the function/tool requesting the service (for logging/errors).
        version: Service version (defaults to a standard version for the service type).
        cache_enabled: Whether to use service caching (default: True).

    Returns:
        An authenticated Google API service object and the actual email of the authenticated user.

    Raises:
        Exception: If authentication fails or the service type is unknown.
    """
    if not mcp_data:
        raise ValueError("'mcp_data' parameter is required.")

    if service_type not in SERVICE_CONFIGS:
        raise ValueError(f"Unknown service type: {service_type}")

    # Get service configuration
    config = SERVICE_CONFIGS[service_type]
    service_name = config["service"]
    service_version = version or config["version"]
    resolved_scopes = _resolve_scopes(scopes)

    # --- Service Caching and Authentication Logic ---
    service = None
    actual_user_id = mcp_data

    if service is None:
        try:
            if service_type == "gmail":
                service, actual_user_email = await get_authenticated_google_service_gmail(
                    service_name=service_name,
                    version=service_version,
                    tool_name=tool_name,
                    user_id=mcp_data,
                    required_scopes=resolved_scopes,
                )
            elif service_type == "drive":
                service, actual_user_email = await get_authenticated_google_service_drive(
                    service_name=service_name,
                    version=service_version,
                    tool_name=tool_name,
                    user_id=mcp_data,
                    required_scopes=resolved_scopes,
                )
            elif service_type == "calendar":
                service, actual_user_email = await get_authenticated_google_service_calendar(
                    service_name=service_name,
                    version=service_version,
                    tool_name=tool_name,
                    user_id=mcp_data,
                    required_scopes=resolved_scopes,
                )
        except GoogleAuthenticationError as e:
            # Re-raise as a generic Exception to match original decorator behavior
            raise Exception(str(e))

    return service, actual_user_email

