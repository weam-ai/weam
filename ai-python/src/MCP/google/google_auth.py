# auth/google_auth.py

import asyncio
import jwt
import logging
import os

from datetime import datetime
from typing import List, Optional, Dict, Any
from src.MCP.utils import save_tokens
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from src.gateway.jwt_decode import get_user_by_id
from src.crypto_hub.utils.crypto_utils import MessageDecryptor
key = os.getenv("SECURITY_KEY").encode("utf-8")
decryptor = MessageDecryptor(key)
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_credentials_from_mcp_data(mcp_data: Dict[str, Any]) -> Optional[Credentials]:
    """Creates a Credentials object from MCP data."""
    try:
        client_id = os.getenv("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID")
        client_secret = os.getenv("NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET")
        credentials = Credentials(
            token=decryptor.decrypt(mcp_data.get("access_token")),
            refresh_token=decryptor.decrypt(mcp_data.get("refresh_token")),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=mcp_data.get("scope", []).split(),
            expiry=datetime.fromisoformat(mcp_data["expiry"].replace('Z', '+00:00')).replace(tzinfo=None) if mcp_data.get("expiry") else None
        )
        return credentials
    except Exception as e:
        logger.error(f"Error creating credentials from MCP data: {e}")
        return None

def get_credentials(
    mcp_data: Dict[str, Any],
    required_scopes: List[str],
    provider: str
) -> Optional[Credentials]:
    """
    Retrieves credentials from MCP data or session cache. Refreshes if necessary.

    Args:
        mcp_data: Dictionary containing Google credentials data
        required_scopes: List of scopes the credentials must have
        session_id: Optional MCP session ID

    Returns:
        Valid Credentials object or None
    """
    credentials = None


    # If no credentials in session, try creating from MCP data
    if not credentials and mcp_data:
        credentials = create_credentials_from_mcp_data(mcp_data)

    if not credentials:
        logger.info("[get_credentials] No credentials found in MCP data or session.")
        return None

    logger.debug(f"[get_credentials] Credentials found. Scopes: {credentials.scopes}, Valid: {credentials.valid}, Expired: {credentials.expired}")

    if not all(scope in credentials.scopes for scope in required_scopes):
        logger.warning(f"[get_credentials] Credentials lack required scopes. Need: {required_scopes}, Have: {credentials.scopes}")
        return None

    if credentials.valid:
        return credentials
    elif credentials.expired and credentials.refresh_token:
        try:
            credentials.refresh(Request())
            save_tokens(
                email=mcp_data.get("email"),
                provider=provider,
                access_token=credentials.token,
                expiry=credentials.expiry
            )
            return credentials
        except RefreshError as e:
            logger.warning(f"[get_credentials] RefreshError - token expired/revoked: {e}")
            return None
        except Exception as e:
            logger.error(f"[get_credentials] Error refreshing credentials: {e}", exc_info=True)
            return None
    else:
        logger.warning(f"[get_credentials] Credentials invalid/cannot refresh. Valid: {credentials.valid}, Refresh Token: {credentials.refresh_token is not None}")
        return None

# --- Centralized Google Service Authentication ---


class GoogleAuthenticationError(Exception):
    """Exception raised when Google authentication is required or fails."""

    def __init__(self, message: str, auth_url: Optional[str] = None):
        super().__init__(message)
        self.auth_url = auth_url

async def get_authenticated_google_service(
    service_name: str,  # "gmail", "calendar", "drive", "docs"
    version: str,  # "v1", "v3"
    tool_name: str,  # For logging/debugging
    required_scopes: List[str],
    user_id: str,  # User ID to fetch MCP data
) -> tuple[Any, str]:
    """
    Centralized Google service authentication for all MCP tools.
    Returns (service, user_email) on success or raises GoogleAuthenticationError.

    Args:
        service_name: The Google service name ("gmail", "calendar", "drive", "docs")
        version: The API version ("v1", "v3", etc.)
        tool_name: The name of the calling tool (for logging/debugging)
        required_scopes: List of required OAuth scopes
        user_id: User ID to fetch MCP data from MongoDB

    Returns:
        tuple[service, user_email] on success

    Raises:
        GoogleAuthenticationError: When authentication is required or fails
    """
    logger.info(
        f"[{tool_name}] Attempting to get authenticated {service_name} service. ID: {user_id}"
    )

    # Validate email format
    if not user_id:
        error_msg = f"Authentication required for {tool_name}. No valid 'user_id' provided. Please provide a valid Google email address."
        logger.info(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    # Fetch MCP data using user_id
    mcp_data = await get_user_by_id(user_id)
    mcp_data = mcp_data['mcpdata']['G']
    if not mcp_data:
        error_msg = f"No MCP data found for user ID: {user_id}"
        logger.error(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    credentials = await asyncio.to_thread(
        get_credentials,
        mcp_data=mcp_data,
        required_scopes=required_scopes,
        provider="G"
    )

    try:
        service = build(service_name, version, credentials=credentials)
        log_user_email = mcp_data.get("email")
        # Try to get email from credentials if needed for validation

        logger.info(
            f"[{tool_name}] Successfully authenticated {service_name} service for user: {log_user_email}"
        )
        return service, log_user_email

    except Exception as e:
        error_msg = f"[{tool_name}] Failed to build {service_name} service: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise GoogleAuthenticationError(error_msg)


async def get_authenticated_google_service_gmail(
    service_name: str,  # "gmail", "calendar", "drive", "docs"
    version: str,  # "v1", "v3"
    tool_name: str,  # For logging/debugging
    required_scopes: List[str],
    user_id: str,  # User ID to fetch MCP data
) -> tuple[Any, str]:
    """
    Centralized Google service authentication for all MCP tools.
    Returns (service, user_email) on success or raises GoogleAuthenticationError.

    Args:
        service_name: The Google service name ("gmail", "calendar", "drive", "docs")
        version: The API version ("v1", "v3", etc.)
        tool_name: The name of the calling tool (for logging/debugging)
        required_scopes: List of required OAuth scopes
        user_id: User ID to fetch MCP data from MongoDB

    Returns:
        tuple[service, user_email] on success

    Raises:
        GoogleAuthenticationError: When authentication is required or fails
    """
    logger.info(
        f"[{tool_name}] Attempting to get authenticated {service_name} service. ID: {user_id}"
    )

    # Validate email format
    if not user_id:
        error_msg = f"Authentication required for {tool_name}. No valid 'user_id' provided. Please provide a valid Google email address."
        logger.info(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    # Fetch MCP data using user_id
    mcp_data = await get_user_by_id(user_id)
    mcp_data = mcp_data['mcpdata']['GMAIL']
    if not mcp_data:
        error_msg = f"No MCP data found for user ID: {user_id}"
        logger.error(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    credentials = await asyncio.to_thread(
        get_credentials,
        mcp_data=mcp_data,
        required_scopes=required_scopes,
        provider="GMAIL"
    )

    try:
        service = build(service_name, version, credentials=credentials)
        log_user_email = mcp_data.get("email")
        # Try to get email from credentials if needed for validation

        logger.info(
            f"[{tool_name}] Successfully authenticated {service_name} service for user: {log_user_email}"
        )
        return service, log_user_email

    except Exception as e:
        error_msg = f"[{tool_name}] Failed to build {service_name} service: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise GoogleAuthenticationError(error_msg)


async def get_authenticated_google_service_drive(
    service_name: str,  # "gmail", "calendar", "drive", "docs"
    version: str,  # "v1", "v3"
    tool_name: str,  # For logging/debugging
    required_scopes: List[str],
    user_id: str,  # User ID to fetch MCP data
) -> tuple[Any, str]:
    """
    Centralized Google service authentication for all MCP tools.
    Returns (service, user_email) on success or raises GoogleAuthenticationError.

    Args:
        service_name: The Google service name ("gmail", "calendar", "drive", "docs")
        version: The API version ("v1", "v3", etc.)
        tool_name: The name of the calling tool (for logging/debugging)
        required_scopes: List of required OAuth scopes
        user_id: User ID to fetch MCP data from MongoDB

    Returns:
        tuple[service, user_email] on success

    Raises:
        GoogleAuthenticationError: When authentication is required or fails
    """
    logger.info(
        f"[{tool_name}] Attempting to get authenticated {service_name} service. ID: {user_id}"
    )

    # Validate email format
    if not user_id:
        error_msg = f"Authentication required for {tool_name}. No valid 'user_id' provided. Please provide a valid Google email address."
        logger.info(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    # Fetch MCP data using user_id
    mcp_data = await get_user_by_id(user_id)
    mcp_data = mcp_data['mcpdata']['GOOGLE_DRIVE']
    if not mcp_data:
        error_msg = f"No MCP data found for user ID: {user_id}"
        logger.error(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    credentials = await asyncio.to_thread(
        get_credentials,
        mcp_data=mcp_data,
        required_scopes=required_scopes,
        provider="GOOGLE_DRIVE"
    )

    try:
        service = build(service_name, version, credentials=credentials)
        log_user_email = mcp_data.get("email")
        # Try to get email from credentials if needed for validation

        logger.info(
            f"[{tool_name}] Successfully authenticated {service_name} service for user: {log_user_email}"
        )
        return service, log_user_email

    except Exception as e:
        error_msg = f"[{tool_name}] Failed to build {service_name} service: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise GoogleAuthenticationError(error_msg)


async def get_authenticated_google_service_calendar(
    service_name: str,  # "gmail", "calendar", "drive", "docs"
    version: str,  # "v1", "v3"
    tool_name: str,  # For logging/debugging
    required_scopes: List[str],
    user_id: str,  # User ID to fetch MCP data
) -> tuple[Any, str]:
    """
    Centralized Google service authentication for all MCP tools.
    Returns (service, user_email) on success or raises GoogleAuthenticationError.

    Args:
        service_name: The Google service name ("gmail", "calendar", "drive", "docs")
        version: The API version ("v1", "v3", etc.)
        tool_name: The name of the calling tool (for logging/debugging)
        required_scopes: List of required OAuth scopes
        user_id: User ID to fetch MCP data from MongoDB

    Returns:
        tuple[service, user_email] on success

    Raises:
        GoogleAuthenticationError: When authentication is required or fails
    """
    logger.info(
        f"[{tool_name}] Attempting to get authenticated {service_name} service. ID: {user_id}"
    )

    # Validate email format
    if not user_id:
        error_msg = f"Authentication required for {tool_name}. No valid 'user_id' provided. Please provide a valid Google email address."
        logger.info(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    # Fetch MCP data using user_id
    mcp_data = await get_user_by_id(user_id)
    mcp_data = mcp_data['mcpdata']['GOOGLE_CALENDAR']
    if not mcp_data:
        error_msg = f"No MCP data found for user ID: {user_id}"
        logger.error(f"[{tool_name}] {error_msg}")
        raise GoogleAuthenticationError(error_msg)

    credentials = await asyncio.to_thread(
        get_credentials,
        mcp_data=mcp_data,
        required_scopes=required_scopes,
        provider="GOOGLE_CALENDAR"
    )

    try:
        service = build(service_name, version, credentials=credentials)
        log_user_email = mcp_data.get("email")
        # Try to get email from credentials if needed for validation

        logger.info(
            f"[{tool_name}] Successfully authenticated {service_name} service for user: {log_user_email}"
        )
        return service, log_user_email

    except Exception as e:
        error_msg = f"[{tool_name}] Failed to build {service_name} service: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise GoogleAuthenticationError(error_msg)
