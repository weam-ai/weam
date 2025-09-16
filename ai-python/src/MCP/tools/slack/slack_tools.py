"""Slack-related MCP tools."""
from typing import Any, List, Optional
from datetime import datetime
import httpx
from src.logger.default_logger import logger
import os 
SLACK_API_BASE = os.environ.get("SLACK_API_BASE", "https://slack.com/api")
async def make_slack_request(endpoint: str, bot_token: str, params: dict = None, json_data: dict = None, method: str = "GET") -> dict[str, Any] | None:
    """Make a request to the Slack API with proper error handling."""
    logger.debug(f"Making {method} request to Slack API: {endpoint}")
    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    url = f"{SLACK_API_BASE}/{endpoint}"
    
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params, timeout=30.0)
            else:  # POST
                response = await client.post(url, headers=headers, json=json_data, timeout=30.0)
            response.raise_for_status()
            logger.debug(f"Successfully received response from Slack API: {endpoint}")
            return response.json()
        except Exception as e:
            logger.error(f"Error making request to Slack API: {endpoint} - Error: {str(e)}")
            return None

# =============================================================================
# EXISTING FUNCTIONS (keeping as-is)
# =============================================================================

async def list_slack_channels(bot_token: str, limit: int = 100) -> str:
    """List all channels in the Slack workspace.

    Args:
        bot_token: Slack bot token
        limit: Maximum number of channels to return (default 100, max 1000)

    Returns:
        Formatted string containing channel information
    """
    logger.info(f"Listing Slack channels with limit: {limit}")
    params = {
        "limit": min(limit, 1000),  # Enforce maximum limit
        "exclude_archived": True
    }
    
    data = await make_slack_request("conversations.list", bot_token, params=params)
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to list channels: {error}")
        return f"Failed to list channels: {error}"
    
    channels = data.get("channels", [])
    if not channels:
        logger.info("No channels found")
        return "No channels found in the workspace"
    
    formatted_channels = []
    for channel in channels:
        channel_info = f"""
        Name: #{channel.get('name', 'unknown')}
        ID: {channel.get('id', 'unknown')}
        Topic: {channel.get('topic', {}).get('value', 'No topic set')}
        Members: {channel.get('num_members', 0)}
        """
        formatted_channels.append(channel_info)
    
    logger.info(f"Returning {len(channels)} channels")
    return "\n---\n".join(formatted_channels)

async def send_slack_message(bot_token: str, channel_id: str, text: str) -> str:
    """Send a message to a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel to send the message to
        text: The message text to send

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Sending message to channel: {channel_id}")
    json_data = {
        "channel": channel_id,
        "text": text
    }
    
    data = await make_slack_request("chat.postMessage", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to send message: {error}")
        return f"Failed to send message: {error}"
    
    logger.info(f"Successfully sent message to channel: {channel_id}")
    return "Message sent successfully"

async def get_channel_id_by_name(bot_token: str, channel_name: str) -> str:
    """Get the Slack channel ID from the channel name.

    Args:
        bot_token: Slack bot token
        channel_name: Name of the Slack channel (e.g., 'general' or '#general')

    Returns:
        The channel ID corresponding to the given channel name.
        If the channel is not found, returns an error message.
        You can use this channel ID in functions like get_channel_messages.
    """
    data = await make_slack_request("conversations.list", bot_token, params={"exclude_archived": True, "limit": 1000})
    if not data or not data.get("ok"):
        return f"Failed to fetch channels: {data.get('error', 'unknown error')}"

    for channel in data.get("channels", []):
        if channel["name"] == channel_name.lstrip("#"):
            return channel["id"]

    return f"Channel '{channel_name}' not found"

async def get_channel_messages(bot_token: str, channel_id: str, limit: int = 50) -> str:
    """Get recent messages from a Slack channel.
    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel to get messages from
        limit: Maximum number of messages to return (default 50, max 1000)
    Returns:
        Formatted string containing message history
    """
    logger.info(f"Getting messages from channel: {channel_id}")
    params = {
        "channel": channel_id,
        "limit": min(limit, 1000),  # Enforce maximum limit
        "inclusive": True,
        "include_all_metadata": True
    }
    data = await make_slack_request("conversations.history", bot_token, params=params)
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get channel messages: {error}")
        return f"Failed to get channel messages: {error}"
    messages = data.get("messages", [])
    if not messages:
        logger.info("No messages found in the channel")
        return "No messages found in the channel"
    # Get user info for all unique users in the messages
    user_ids = {msg.get("user") for msg in messages if msg.get("user")}
    user_names = {}
    for user_id in user_ids:
        user_data = await make_slack_request("users.info", bot_token, params={"user": user_id})
        if user_data and user_data.get("ok"):
            user = user_data.get("user", {})
            user_names[user_id] = user.get("real_name") or user.get("name", "Unknown")
    formatted_messages = []
    for msg in messages:
        # Convert timestamp to readable format
        ts = float(msg.get("ts", "0"))
        dt = datetime.fromtimestamp(ts)
        time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        # Get user name
        user_id = msg.get("user", "Unknown")
        user_name = user_names.get(user_id, "Unknown User")
        # Format message with reactions if any
        reactions = msg.get("reactions", [])
        reaction_str = ""
        if reactions:
            reaction_list = [f":{r['name']}: ({r['count']})" for r in reactions]
            reaction_str = f"\nReactions: {' '.join(reaction_list)}"
        # Format thread info if any
        thread_str = ""
        if msg.get("thread_ts") and msg.get("reply_count"):
            thread_str = f"\nThread: {msg.get('reply_count')} replies"
        message_text = f"""
        Time: {time_str}
        From: {user_name}
        Message: {msg.get('text', '')}
        Message TS: {msg.get('ts', '')}{"" if not reaction_str else reaction_str}{"" if not thread_str else thread_str}
                """
        formatted_messages.append(message_text)
    logger.info(f"Returning {len(messages)} messages from channel: {channel_id}")
    return "\n---\n".join(formatted_messages)

# =============================================================================
# NEW FUNCTIONS - FETCHING COLLEAGUES IN WORKSPACE
# =============================================================================

async def list_workspace_users(bot_token: str, limit: int = 200, include_locale: bool = False) -> str:
    
    """List all users in the Slack workspace.

    Args:
        bot_token: Slack bot token
        limit: Maximum number of users to return per page (default 200, max 200)
        include_locale: Whether to include user locale information

    Returns:
        Formatted string containing user information
    """
    logger.info(f"Listing workspace users with limit: {limit}")
    all_users = []
    cursor = None
    
    while True:
        params = {
            "limit": min(limit, 200),
            "include_locale": include_locale
        }
        if cursor:
            params["cursor"] = cursor
        
        
        data = await make_slack_request("users.list", bot_token, params=params)
        
        if not data or not data.get("ok"):
            error = data.get("error", "unknown error") if data else "unknown error"
            logger.warning(f"Failed to list users: {error}")
            return f"Failed to list users: {error}"
        
        users = data.get("members", [])
        all_users.extend(users)
        
        # Check for pagination
        response_metadata = data.get("response_metadata", {})
        cursor = response_metadata.get("next_cursor")
        if not cursor:
            break
    
    if not all_users:
        logger.info("No users found")
        return "No users found in the workspace"
    
    formatted_users = []
    for user in all_users:
        if user.get("deleted") or user.get("is_bot"):
            continue  # Skip deleted users and bots
            
        profile = user.get("profile", {})
        user_info = f"""
        Name: {user.get('real_name', 'Unknown')} (@{user.get('name', 'unknown')})
        ID: {user.get('id', 'unknown')}
        Email: {profile.get('email', 'Not available')}
        Title: {profile.get('title', 'Not set')}
        Status: {'Active' if not user.get('deleted') else 'Inactive'}
        Timezone: {user.get('tz_label', 'Unknown')}
        """
        formatted_users.append(user_info)
    
    logger.info(f"Returning {len(formatted_users)} active users")
    return "\n---\n".join(formatted_users)

async def get_user_info(bot_token: str, user_id: str) -> str:
    """Get detailed information about a specific user.

    Args:
        bot_token: Slack bot token
        user_id: The ID of the user to get information about

    Returns:
        Formatted string containing detailed user information
    """
    logger.info(f"Getting user info for: {user_id}")
    params = {"user": user_id}
    
    data = await make_slack_request("users.info", bot_token, params=params)
    
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get user info: {error}")
        return f"Failed to get user info: {error}"
    
    user = data.get("user", {})
    profile = user.get("profile", {})
    
    formatted_info = f"""
    User ID: {user.get('id', 'unknown')}
    Username: @{user.get('name', 'unknown')}
    Real Name: {user.get('real_name', 'Unknown')}
    Display Name: {profile.get('display_name', 'Not set')}
    Email: {profile.get('email', 'Not available')}
    Phone: {profile.get('phone', 'Not available')}
    Title: {profile.get('title', 'Not set')}
    Status Text: {profile.get('status_text', 'No status')}
    Status Emoji: {profile.get('status_emoji', 'No emoji')}
    Timezone: {user.get('tz_label', 'Unknown')} ({user.get('tz', 'Unknown')})
    Is Admin: {'Yes' if user.get('is_admin') else 'No'}
    Is Owner: {'Yes' if user.get('is_owner') else 'No'}
    Is Bot: {'Yes' if user.get('is_bot') else 'No'}
    Active: {'Yes' if not user.get('deleted') else 'No'}
    """
    
    logger.info(f"Successfully retrieved user info for: {user_id}")
    return formatted_info

async def get_user_profile(bot_token: str, user_id: str) -> str:
    """Get user profile information including custom fields.

    Args:
        bot_token: Slack bot token
        user_id: The ID of the user to get profile for

    Returns:
        Formatted string containing user profile information
    """
    logger.info(f"Getting user profile for: {user_id}")
    params = {"user": user_id}
    
    data = await make_slack_request("users.profile.get", bot_token, params=params)
    
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get user profile: {error}")
        return f"Failed to get user profile: {error}"
    
    profile = data.get("profile", {})
    
    formatted_profile = f"""
    Display Name: {profile.get('display_name', 'Not set')}
    Real Name: {profile.get('real_name', 'Unknown')}
    Email: {profile.get('email', 'Not available')}
    Image (24px): {profile.get('image_24', 'Not available')}
    Image (32px): {profile.get('image_32', 'Not available')}
    Image (48px): {profile.get('image_48', 'Not available')}
    Image (72px): {profile.get('image_72', 'Not available')}
    Image (192px): {profile.get('image_192', 'Not available')}
    Image (512px): {profile.get('image_512', 'Not available')}
    Status Text: {profile.get('status_text', 'No status')}
    Status Emoji: {profile.get('status_emoji', 'No emoji')}
    """
    
    # Add custom fields if they exist
    fields = profile.get("fields", {})
    if fields:
        formatted_profile += "\nCustom Fields:\n"
        for field_id, field_data in fields.items():
            value = field_data.get("value", "Not set")
            alt = field_data.get("alt", "")
            formatted_profile += f"    {field_id}: {value} {alt}\n"
    
    logger.info(f"Successfully retrieved user profile for: {user_id}")
    return formatted_profile

async def get_channel_members(bot_token: str, channel_id: str, limit: int = 200) -> str:
    """Get all members of a specific channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        limit: Maximum number of members to return per page

    Returns:
        Formatted string containing channel member information
    """
    logger.info(f"Getting members for channel: {channel_id}")
    all_members = []
    cursor = None
    
    while True:
        params = {
            "channel": channel_id,
            "limit": min(limit, 1000)
        }
        if cursor:
            params["cursor"] = cursor
            
        data = await make_slack_request("conversations.members", bot_token, params=params)
        
        if not data or not data.get("ok"):
            error = data.get("error", "unknown error") if data else "unknown error"
            logger.warning(f"Failed to get channel members: {error}")
            return f"Failed to get channel members: {error}"
        
        members = data.get("members", [])
        all_members.extend(members)
        
        # Check for pagination
        response_metadata = data.get("response_metadata", {})
        cursor = response_metadata.get("next_cursor")
        if not cursor:
            break
    
    if not all_members:
        return "No members found in this channel"
    
    # Get user info for all members
    formatted_members = []
    for user_id in all_members:
        user_data = await make_slack_request("users.info", bot_token, params={"user": user_id})
        if user_data and user_data.get("ok"):
            user = user_data.get("user", {})
            profile = user.get("profile", {})
            member_info = f"""
            Name: {user.get('real_name', 'Unknown')} (@{user.get('name', 'unknown')})
            ID: {user_id}
            Email: {profile.get('email', 'Not available')}
            Title: {profile.get('title', 'Not set')}
            """
            formatted_members.append(member_info)
    
    logger.info(f"Returning {len(formatted_members)} channel members")
    return "\n---\n".join(formatted_members)

# =============================================================================
# NEW FUNCTIONS - CHANNEL CREATION AND MANAGEMENT
# =============================================================================

async def create_slack_channel(bot_token: str, channel_name: str, is_private: bool = False, 
                              topic: str = None, purpose: str = None, 
                              initial_members: List[str] = None) -> str:
    """Create a new Slack channel.

    Args:
        bot_token: Slack bot token
        channel_name: Name of the channel to create (without # symbol)
        is_private: Whether to create a private channel (default: False for public)
        topic: Optional topic for the channel
        purpose: Optional purpose description for the channel
        initial_members: Optional list of user IDs to invite to the channel

    Returns:
        Formatted string containing channel creation information or error message
    """
    logger.info(f"Creating {'private' if is_private else 'public'} channel: {channel_name}")
    
    # Prepare parameters for channel creation
    json_data = {
        "name": channel_name,
        "is_private": is_private
    }
    
    # Create the channel
    data = await make_slack_request("conversations.create", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to create channel '{channel_name}': {error}")
        return f"Failed to create channel '{channel_name}': {error}"
    
    channel = data.get("channel", {})
    channel_id = channel.get("id")
    
    channel_info = f"""
    Channel Created Successfully!
    Name: #{channel.get('name', channel_name)}
    ID: {channel_id}
    Type: {'Private' if channel.get('is_private', False) else 'Public'}
    Creator: {channel.get('creator', 'Unknown')}
    Created: {channel.get('created', 'Unknown')}
    """
    
    # Set topic if provided
    if topic and channel_id:
        topic_result = await set_channel_topic(bot_token, channel_id, topic)
        if not topic_result.startswith("Failed"):
            channel_info += f"\n    Topic: {topic}"
        else:
            channel_info += f"\n    Topic Warning: {topic_result}"
    
    # Set purpose if provided
    if purpose and channel_id:
        purpose_result = await set_channel_purpose(bot_token, channel_id, purpose)
        if not purpose_result.startswith("Failed"):
            channel_info += f"\n    Purpose: {purpose}"
        else:
            channel_info += f"\n    Purpose Warning: {purpose_result}"
    
    # If initial members are provided, invite them to the channel
    if initial_members and channel_id:
        logger.info(f"Inviting {len(initial_members)} members to channel {channel_id}")
        
        # Invite members to the channel
        invite_json = {
            "channel": channel_id,
            "users": ",".join(initial_members)
        }
        
        invite_data = await make_slack_request("conversations.invite", bot_token, json_data=invite_json, method="POST")
        
        if invite_data and invite_data.get("ok"):
            channel_info += f"\n    Members Invited: {len(initial_members)} users successfully added"
        else:
            invite_error = invite_data.get("error", "unknown error") if invite_data else "unknown error"
            channel_info += f"\n    Members Invitation Warning: {invite_error}"
            logger.warning(f"Failed to invite members to channel: {invite_error}")
    
    logger.info(f"Successfully created channel: {channel_name} (ID: {channel_id})")
    return channel_info

async def set_channel_topic(bot_token: str, channel_id: str, topic: str) -> str:
    """Set or update the topic for a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        topic: New topic for the channel

    Returns:
        Success or error message
    """
    logger.info(f"Setting topic for channel: {channel_id}")
    
    json_data = {
        "channel": channel_id,
        "topic": topic
    }
    
    data = await make_slack_request("conversations.setTopic", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to set channel topic: {error}")
        return f"Failed to set channel topic: {error}"
    
    logger.info(f"Successfully set topic for channel: {channel_id}")
    return f"Channel topic updated successfully: '{topic}'"

async def set_channel_purpose(bot_token: str, channel_id: str, purpose: str) -> str:
    """Set or update the purpose for a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        purpose: New purpose for the channel

    Returns:
        Success or error message
    """
    logger.info(f"Setting purpose for channel: {channel_id}")
    
    json_data = {
        "channel": channel_id,
        "purpose": purpose
    }
    
    data = await make_slack_request("conversations.setPurpose", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to set channel purpose: {error}")
        return f"Failed to set channel purpose: {error}"
    
    logger.info(f"Successfully set purpose for channel: {channel_id}")
    return f"Channel purpose updated successfully: '{purpose}'"

async def archive_channel(bot_token: str, channel_id: str) -> str:
    """Archive a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel to archive

    Returns:
        Success or error message
    """
    logger.info(f"Archiving channel: {channel_id}")
    
    json_data = {
        "channel": channel_id
    }
    
    data = await make_slack_request("conversations.archive", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to archive channel: {error}")
        return f"Failed to archive channel: {error}"
    
    logger.info(f"Successfully archived channel: {channel_id}")
    return "Channel archived successfully"

async def invite_users_to_channel(bot_token: str, channel_id: str, user_ids: List[str]) -> str:
    """Invite users to a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        user_ids: List of user IDs to invite

    Returns:
        Success or error message
    """
    logger.info(f"Inviting {len(user_ids)} users to channel: {channel_id}")
    
    json_data = {
        "channel": channel_id,
        "users": ",".join(user_ids)
    }
    
    data = await make_slack_request("conversations.invite", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to invite users to channel: {error}")
        return f"Failed to invite users to channel: {error}"
    
    logger.info(f"Successfully invited {len(user_ids)} users to channel: {channel_id}")
    return f"Successfully invited {len(user_ids)} users to the channel"

async def kick_user_from_channel(bot_token: str, channel_id: str, user_id: str) -> str:
    """Remove a user from a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        user_id: The ID of the user to remove

    Returns:
        Success or error message
    """
    logger.info(f"Removing user {user_id} from channel: {channel_id}")
    
    json_data = {
        "channel": channel_id,
        "user": user_id
    }
    
    data = await make_slack_request("conversations.kick", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to remove user from channel: {error}")
        return f"Failed to remove user from channel: {error}"
    
    logger.info(f"Successfully removed user {user_id} from channel: {channel_id}")
    return "User successfully removed from the channel"

# =============================================================================
# EXISTING FUNCTIONS - SENDING MESSAGES TO COLLEAGUES
# =============================================================================

async def open_direct_message(bot_token: str, user_ids: List[str]) -> str:
    """Open a direct message or multi-person direct message.
    Args:
        bot_token: Slack bot token
        user_ids: List of user IDs (1 for DM, multiple for MPIM)
    Returns:
        The channel ID of the opened conversation or error message
    """
    logger.info(f"Opening DM with users: {user_ids}")
    # For conversations.open, users should be passed as a comma-separated string
    json_data = {
        "users": ",".join(user_ids)
    }
    data = await make_slack_request("conversations.open", bot_token, json_data=json_data, method="POST")
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to open DM: {error}")
        return f"Failed to open DM: {error}"
    channel = data.get("channel", {})
    channel_id = channel.get("id")
    if not channel_id:
        logger.warning("No channel ID returned from conversations.open")
        return "Failed to open DM: No channel ID returned"
    logger.info(f"Successfully opened DM with channel ID: {channel_id}")
    return channel_id

async def send_direct_message(bot_token: str, user_id: str, text: str) -> str:
    """Send a direct message to a user.

    Args:
        bot_token: Slack bot token
        user_id: The ID of the user to send DM to
        text: The message text to send

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Sending DM to user: {user_id}")
    
    # First open the DM
    channel_id = await open_direct_message(bot_token, [user_id])
    if channel_id.startswith("Failed"):
        return channel_id
    
    # Then send the message using the existing send_slack_message function
    return await send_slack_message(bot_token, channel_id, text)

async def send_ephemeral_message(bot_token: str, channel_id: str, user_id: str, text: str) -> str:
    """Send an ephemeral message visible only to a specific user.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel
        user_id: The ID of the user who will see the message
        text: The message text to send

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Sending ephemeral message to user {user_id} in channel {channel_id}")
    json_data = {
        "channel": channel_id,
        "user": user_id,
        "text": text
    }
    
    data = await make_slack_request("chat.postEphemeral", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to send ephemeral message: {error}")
        return f"Failed to send ephemeral message: {error}"
    
    logger.info(f"Successfully sent ephemeral message to user: {user_id}")
    return "Ephemeral message sent successfully"

# =============================================================================
# THREAD REPLY FUNCTIONS - ADD TO YOUR EXISTING SLACK MCP TOOLS
# =============================================================================

async def reply_to_thread(bot_token: str, channel_id: str, thread_ts: str, text: str) -> str:
    """Reply to an existing thread in a Slack channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        text: The reply text to send

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Replying to thread {thread_ts} in channel: {channel_id}")
    json_data = {
        "channel": channel_id,
        "thread_ts": thread_ts,
        "text": text
    }
    
    data = await make_slack_request("chat.postMessage", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to reply to thread: {error}")
        return f"Failed to reply to thread: {error}"
    
    message = data.get("message", {})
    message_ts = message.get("ts", "unknown")
    
    logger.info(f"Successfully replied to thread {thread_ts} with message {message_ts}")
    return f"Thread reply sent successfully (Message TS: {message_ts})"

async def get_thread_replies(bot_token: str, channel_id: str, thread_ts: str, limit: int = 100) -> str:
    """Get all replies in a specific thread.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        limit: Maximum number of replies to return (default 100, max 1000)

    Returns:
        Formatted string containing thread replies
    """
    logger.info(f"Getting thread replies for {thread_ts} in channel: {channel_id}")
    params = {
        "channel": channel_id,
        "ts": thread_ts,
        "limit": min(limit, 1000),
        "inclusive": True
    }
    
    data = await make_slack_request("conversations.replies", bot_token, params=params)
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get thread replies: {error}")
        return f"Failed to get thread replies: {error}"
    
    messages = data.get("messages", [])
    if not messages:
        logger.info("No messages found in the thread")
        return "No messages found in the thread"
    
    # Get user info for all unique users in the thread
    user_ids = {msg.get("user") for msg in messages if msg.get("user")}
    user_names = {}
    
    for user_id in user_ids:
        user_data = await make_slack_request("users.info", bot_token, params={"user": user_id})
        if user_data and user_data.get("ok"):
            user = user_data.get("user", {})
            user_names[user_id] = user.get("real_name") or user.get("name", "Unknown")
    
    formatted_messages = []
    parent_message = None
    
    for i, msg in enumerate(messages):
        # Convert timestamp to readable format
        ts = float(msg.get("ts", "0"))
        dt = datetime.fromtimestamp(ts)
        time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Get user name
        user_id = msg.get("user", "Unknown")
        user_name = user_names.get(user_id, "Unknown User")
        
        # Format message with reactions if any
        reactions = msg.get("reactions", [])
        reaction_str = ""
        if reactions:
            reaction_list = [f":{r['name']}: ({r['count']})" for r in reactions]
            reaction_str = f"\nReactions: {' '.join(reaction_list)}"
        
        # Mark the parent message
        message_type = "PARENT MESSAGE" if i == 0 else f"REPLY #{i}"
        
        message_text = f"""
        {message_type}
        Time: {time_str}
        From: {user_name}
        Message: {msg.get('text', '')}
        Message TS: {msg.get('ts', '')}{"" if not reaction_str else reaction_str}
                """
        formatted_messages.append(message_text)
    
    thread_summary = f"Thread with {len(messages)} messages (1 parent + {len(messages)-1} replies)"
    full_response = f"{thread_summary}\n\n" + "\n---\n".join(formatted_messages)
    
    logger.info(f"Returning {len(messages)} messages from thread: {thread_ts}")
    return full_response

async def start_thread_with_message(bot_token: str, channel_id: str, text: str, 
                                   broadcast: bool = False) -> str:
    """Send a message that can be used to start a thread.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel to send the message to
        text: The message text to send
        broadcast: Whether to broadcast the thread reply to the channel (default: False)

    Returns:
        Message timestamp that can be used as thread_ts for replies, or error message
    """
    logger.info(f"Starting thread in channel: {channel_id}")
    json_data = {
        "channel": channel_id,
        "text": text
    }
    
    # Add broadcast parameter if specified
    if broadcast:
        json_data["reply_broadcast"] = True
    
    data = await make_slack_request("chat.postMessage", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to start thread: {error}")
        return f"Failed to start thread: {error}"
    
    message = data.get("message", {})
    message_ts = message.get("ts")
    
    if not message_ts:
        logger.warning("No message timestamp returned")
        return "Failed to start thread: No message timestamp returned"
    
    logger.info(f"Successfully started thread with message TS: {message_ts}")
    return f"Thread started successfully. Use this timestamp for replies: {message_ts}"

async def reply_to_thread_with_broadcast(bot_token: str, channel_id: str, thread_ts: str, 
                                        text: str) -> str:
    """Reply to a thread and broadcast the reply to the channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        text: The reply text to send

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Replying to thread {thread_ts} with broadcast in channel: {channel_id}")
    json_data = {
        "channel": channel_id,
        "thread_ts": thread_ts,
        "text": text,
        "reply_broadcast": True
    }
    
    data = await make_slack_request("chat.postMessage", bot_token, json_data=json_data, method="POST")
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to reply to thread with broadcast: {error}")
        return f"Failed to reply to thread with broadcast: {error}"
    
    message = data.get("message", {})
    message_ts = message.get("ts", "unknown")
    
    logger.info(f"Successfully replied to thread {thread_ts} with broadcast, message {message_ts}")
    return f"Thread reply with broadcast sent successfully (Message TS: {message_ts})"

async def get_thread_info(bot_token: str, channel_id: str, thread_ts: str) -> str:
    """Get summary information about a thread.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)

    Returns:
        Formatted string containing thread summary information
    """
    logger.info(f"Getting thread info for {thread_ts} in channel: {channel_id}")
    
    # Get the parent message first
    params = {
        "channel": channel_id,
        "ts": thread_ts,
        "limit": 1,
        "inclusive": True
    }
    
    data = await make_slack_request("conversations.replies", bot_token, params=params)
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get thread info: {error}")
        return f"Failed to get thread info: {error}"
    
    messages = data.get("messages", [])
    if not messages:
        return "Thread not found"
    
    parent_message = messages[0]
    
    # Get user info for the parent message author
    user_id = parent_message.get("user")
    user_name = "Unknown User"
    if user_id:
        user_data = await make_slack_request("users.info", bot_token, params={"user": user_id})
        if user_data and user_data.get("ok"):
            user = user_data.get("user", {})
            user_name = user.get("real_name") or user.get("name", "Unknown")
    
    # Convert timestamp to readable format
    ts = float(parent_message.get("ts", "0"))
    dt = datetime.fromtimestamp(ts)
    time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
    
    # Get thread statistics
    reply_count = parent_message.get("reply_count", 0)
    reply_users_count = len(parent_message.get("reply_users", []))
    latest_reply = parent_message.get("latest_reply")
    
    latest_reply_str = "No replies"
    if latest_reply:
        latest_ts = float(latest_reply)
        latest_dt = datetime.fromtimestamp(latest_ts)
        latest_reply_str = latest_dt.strftime("%Y-%m-%d %H:%M:%S")
    
    thread_info = f"""
    Thread Information
    ==================
    Thread ID (TS): {thread_ts}
    Channel: {channel_id}
    Started by: {user_name}
    Started at: {time_str}
    Parent Message: {parent_message.get('text', 'No text')[:100]}{'...' if len(parent_message.get('text', '')) > 100 else ''}
    
    Thread Statistics:
    - Total Replies: {reply_count}
    - Unique Participants: {reply_users_count}
    - Latest Reply: {latest_reply_str}
    - Thread Status: {'Active' if reply_count > 0 else 'No replies yet'}
    """
    
    logger.info(f"Successfully retrieved thread info for: {thread_ts}")
    return thread_info

async def  find_threads_in_channel(bot_token: str, channel_id: str, limit: int = 50) -> str:
    """Find all messages that have threads (replies) in a channel.

    Args:
        bot_token: Slack bot token
        channel_id: The ID of the channel to search
        limit: Maximum number of messages to check (default 50, max 1000)

    Returns:
        Formatted string containing information about threads found
    """
    logger.info(f"Finding threads in channel: {channel_id}")
    params = {
        "channel": channel_id,
        "limit": min(limit, 1000),
        "inclusive": True
    }
    
    data = await make_slack_request("conversations.history", bot_token, params=params)
    
    if not data or not data.get("ok"):
        error = data.get("error", "unknown error") if data else "unknown error"
        logger.warning(f"Failed to get channel messages: {error}")
        return f"Failed to get channel messages: {error}"
    
    messages = data.get("messages", [])
    if not messages:
        return "No messages found in the channel"
    
    # Filter messages that have threads (reply_count > 0)
    threaded_messages = [msg for msg in messages if msg.get("reply_count", 0) > 0]
    
    if not threaded_messages:
        return "No threads found in the recent messages"
    
    # Get user info for thread starters
    user_ids = {msg.get("user") for msg in threaded_messages if msg.get("user")}
    user_names = {}
    
    for user_id in user_ids:
        user_data = await make_slack_request("users.info", bot_token, params={"user": user_id})
        if user_data and user_data.get("ok"):
            user = user_data.get("user", {})
            user_names[user_id] = user.get("real_name") or user.get("name", "Unknown")
    
    formatted_threads = []
    for msg in threaded_messages:
        # Convert timestamp to readable format
        ts = float(msg.get("ts", "0"))
        dt = datetime.fromtimestamp(ts)
        time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Get user name
        user_id = msg.get("user", "Unknown")
        user_name = user_names.get(user_id, "Unknown User")
        
        # Get latest reply time
        latest_reply = msg.get("latest_reply")
        latest_reply_str = "Unknown"
        if latest_reply:
            latest_ts = float(latest_reply)
            latest_dt = datetime.fromtimestamp(latest_ts)
            latest_reply_str = latest_dt.strftime("%Y-%m-%d %H:%M:%S")
        
        thread_info = f"""
        Thread ID: {msg.get('ts', 'unknown')}
        Started by: {user_name}
        Started at: {time_str}
        Message: {msg.get('text', 'No text')[:100]}{'...' if len(msg.get('text', '')) > 100 else ''}
        Replies: {msg.get('reply_count', 0)}
        Participants: {len(msg.get('reply_users', []))}
        Latest Reply: {latest_reply_str}
        """
        formatted_threads.append(thread_info)
    
    summary = f"Found {len(threaded_messages)} threads in the channel"
    full_response = f"{summary}\n\n" + "\n---\n".join(formatted_threads)
    
    logger.info(f"Found {len(threaded_messages)} threads in channel: {channel_id}")
    return full_response