import os
from langchain_mcp_adapters.client import MultiServerMCPClient
from src.db.config import db_instance
from datetime import datetime, timezone

from src.crypto_hub.utils.crypto_utils import MessageEncryptor
key = os.getenv("SECURITY_KEY").encode("utf-8")
encryptor = MessageEncryptor(key)

collection = db_instance.get_collection("user")

def create_mcp_client(jwt_token: str, origin: str) -> MultiServerMCPClient:
    """
    Creates and returns a configured MultiServerMCPClient instance.

    Args:
        jwt_token (str): The JWT token for Authorization header.
        origin (str): Origin URL to include in headers.
        mcp_url (str, optional): The MCP SSE endpoint URL. Defaults to env var or fallback URL.

    Returns:
        MultiServerMCPClient: Configured client ready to use.
    """
    mcp_url = os.getenv("MCP_URL", "http://mcp:8000/sse")

    headers = {
        "Authorization": f"{jwt_token}",
        "origin": origin,
        "X-Custom-Header": "custom-value"
    }

    client = MultiServerMCPClient(
        {
            "slack": {
                "url": mcp_url,
                "transport": "sse",
                "headers": headers
            }
        }
    )

    return client

def save_tokens(email: str, provider: str, access_token: str, expiry: datetime):
    """Save refreshed tokens to MongoDB."""
    collection.update_one(
        {f"mcpdata.{provider}.email": email},
        {
            "$set": {
                f"mcpdata.{provider}.access_token": encryptor.encrypt(access_token),
                f"mcpdata.{provider}.expiry": expiry.isoformat(),
            }
        }
    )
    print(f"✅ Tokens updated for {email} | provider: {provider}")
