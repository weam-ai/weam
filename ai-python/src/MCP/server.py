"""Main MCP server application."""
import os
import argparse
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from fastapi import FastAPI
from src.gateway.jwt_decode import get_user_by_id
from src.logger.default_logger import logger
from typing import Dict, Any, List, Optional
from src.MCP.tools.slack.slack_tools import (
    list_slack_channels, send_slack_message, get_channel_messages,
    list_workspace_users, get_user_info, get_user_profile, get_channel_members,
    open_direct_message, send_direct_message, send_ephemeral_message,
    # Channel creation and management functions
    create_slack_channel, set_channel_topic, set_channel_purpose, archive_channel,
    invite_users_to_channel, kick_user_from_channel,
    # Thread management functions
    reply_to_thread, get_thread_replies, start_thread_with_message,
    reply_to_thread_with_broadcast, get_thread_info, find_threads_in_channel,get_channel_id_by_name
)   
from src.MCP.tools.github.github_tools import (
    get_git_commits, get_user_info, get_github_repositories, get_github_repository_info, 
    get_repository_branches, get_repository_issues, create_github_branch, create_pull_request, 
    get_pull_request_details, get_pull_requests, get_tags_or_branches, global_search
)
from src.MCP.tools.notion.notion_tools import (
    search_notion, get_notion_page, create_notion_page, update_notion_page,
    get_notion_database, query_notion_database, get_notion_block, get_block_children,
    append_notion_blocks, create_notion_comment, get_notion_comment,get_databases_id,get_pages_id,create_notion_database,update_notion_database
)
from src.MCP.tools.asana.asana_tools import (
    create_project, list_projects, get_project, update_project, create_task, list_tasks, update_task,
    complete_task, create_section, list_sections, add_task_to_section, add_dependencies_to_task, get_task_dependencies, get_user_info_asana,get_workspace_id,
    create_team, list_teams, get_team, list_team_ids
)
from fastapi import Request
from fastapi.responses import JSONResponse, StreamingResponse
import aiohttp
from src.crypto_hub.utils.crypto_utils import MessageDecryptor
from langchain_mcp_adapters.client import MultiServerMCPClient
key = os.getenv("SECURITY_KEY").encode("utf-8")
decryptor = MessageDecryptor(key)
# Load environment variables
load_dotenv()

mcp_port = os.getenv("MCP_PORT", 8000)

# Initialize FastMCP server
mcp = FastMCP(
    "tools",  # Name of the MCP server
    host="0.0.0.0",  # Host address (0.0.0.0 allows connections from any IP)
    port=mcp_port,  # Port number for the server
)

@mcp.custom_route("/ping", methods=["GET"])
async def health_check(request: Request):
    return JSONResponse({"message": "mcp server is running"})

@mcp.tool()
async def slack_list_channels(limit: int = 100,mcp_data:str=None) -> str:
    """List all channels in the Slack workspace.

    Args:
        limit: Maximum number of channels to return (default 100, max 1000)
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_slack_channels(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), limit)


@mcp.tool()
async def slack_send_message(channel_id: str, text: str,mcp_data:str=None) -> str:
    """Send a message to a Slack channel.

    Args:
        channel_id: The ID of the channel to send the message to
        text: The message text to send
    """
    user_data = await get_user_by_id(mcp_data)
    return await send_slack_message(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, text)

@mcp.tool()
async def get_channel_id(channel_name: str=None,mcp_data:str=None):
    """Get Channel id From Name from a Slack Workspace.

    Args:
        channel_id: The ID of the channel to get messages from
        limit: Maximum number of messages to return (default 50, max 1000)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_channel_id_by_name(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_name)

@mcp.tool()
async def slack_get_messages(channel_id: str, limit: int = 50,mcp_data:str=None) -> str:
    """Get recent messages from a Slack channel.

    Args:
        channel_id: The ID of the channel to get messages from
        limit: Maximum number of messages to return (default 50, max 1000)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_channel_messages(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, limit)


@mcp.tool()
async def slack_list_users(limit: int = 200, include_locale: bool = False,mcp_data:str=None) -> str:
    """List all users in the Slack workspace.

    Args:
        limit: Maximum number of users to return per page (default 200, max 200)
        include_locale: Whether to include user locale information
    """
    user_data = await get_user_by_id(mcp_data)    
    return await list_workspace_users(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), limit, include_locale)


@mcp.tool()
async def slack_get_user_info(user_id: str,mcp_data:str=None) -> str:
    """Get detailed information about a specific user.

    Args:
        user_id: The ID of the user to get information about
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_user_info(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), user_id)


@mcp.tool()
async def slack_get_user_profile(user_id: str,mcp_data:str=None) -> str:
    """Get user profile information including custom fields.

    Args:
        user_id: The ID of the user to get profile for
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_user_profile(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), user_id)


@mcp.tool()
async def slack_get_channel_members(channel_id: str, limit: int = 200,mcp_data:str=None) -> str:
    """Get all members of a specific channel.

    Args:
        channel_id: The ID of the channel
        limit: Maximum number of members to return per page
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_channel_members(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, limit)


@mcp.tool()
async def slack_open_dm(user_ids: list[str],mcp_data:str=None) -> str:
    """Open a direct message or multi-person direct message.

    Args:
        user_ids: List of user IDs (1 for DM, multiple for MPIM)
    """
    user_data = await get_user_by_id(mcp_data)
    return await open_direct_message(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), user_ids)


@mcp.tool()
async def slack_send_dm(user_id: str, text: str,mcp_data:str=None) -> str:
    """Send a direct message to a user.

    Args:
        user_id: The ID of the user to send DM to
        text: The message text to send
    """
    user_data = await get_user_by_id(mcp_data)
    return await send_direct_message(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), user_id, text)


@mcp.tool()
async def slack_send_ephemeral_message(channel_id: str, user_id: str, text: str,mcp_data:str=None) -> str:
    """Send an ephemeral message visible only to a specific user.

    Args:
        channel_id: The ID of the channel
        user_id: The ID of the user who will see the message
        text: The message text to send
    """
    user_data = await get_user_by_id(mcp_data)
    return await send_ephemeral_message(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, user_id, text)


# =============================================================================
# CHANNEL CREATION AND MANAGEMENT TOOLS
# =============================================================================

@mcp.tool()
async def slack_create_channel(
    channel_name: str, 
    is_private: bool = False, 
    topic: str = None, 
    purpose: str = None, 
    initial_members: list[str] = None,
    mcp_data:str=None
) -> str:
    """Create a new Slack channel.

    Args:
        channel_name: Name of the channel to create (without # symbol)
        is_private: Whether to create a private channel (default: False for public)
        topic: Optional topic for the channel
        purpose: Optional purpose description for the channel
        initial_members: Optional list of user IDs to invite to the channel
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_slack_channel(
        decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), 
        channel_name, 
        is_private, 
        topic, 
        purpose, 
        initial_members
    )


@mcp.tool()
async def slack_set_channel_topic(channel_id: str, topic: str,mcp_data:str=None) -> str:
    """Set or update the topic for a Slack channel.

    Args:
        channel_id: The ID of the channel
        topic: New topic for the channel
    """
    user_data = await get_user_by_id(mcp_data)
    return await set_channel_topic(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, topic)


@mcp.tool()
async def slack_set_channel_purpose(channel_id: str, purpose: str,mcp_data:str=None) -> str:
    """Set or update the purpose for a Slack channel.

    Args:
        channel_id: The ID of the channel
        purpose: New purpose for the channel
    """
    user_data = await get_user_by_id(mcp_data)
    return await set_channel_purpose(mcp['SLACK']['access_token'], channel_id, purpose)


@mcp.tool()
async def slack_archive_channel(channel_id: str,mcp_data:str=None) -> str:
    """Archive a Slack channel.

    Args:
        channel_id: The ID of the channel to archive
    """
    user_data = await get_user_by_id(mcp_data)
    return await archive_channel(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id)


@mcp.tool()
async def slack_invite_users_to_channel(channel_id: str, user_ids: list[str],mcp_data:str=None) -> str:
    """Invite users to a Slack channel.

    Args:
        channel_id: The ID of the channel
        user_ids: List of user IDs to invite
    """
    user_data = await get_user_by_id(mcp_data)
    return await invite_users_to_channel(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, user_ids)


@mcp.tool()
async def slack_kick_user_from_channel(channel_id: str, user_id: str,mcp_data:str=None) -> str:
    """Remove a user from a Slack channel.

    Args:
        channel_id: The ID of the channel
        user_id: The ID of the user to remove
    """
    user_data = await get_user_by_id(mcp_data)
    return await kick_user_from_channel(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, user_id)



# =============================================================================
# THREAD MANAGEMENT TOOLS - ADD TO YOUR MAIN MCP SERVER FILE
# =============================================================================


@mcp.tool()
async def slack_reply_to_thread(channel_id: str, thread_ts: str, text: str,mcp_data:str=None) -> str:
    """Reply to an existing thread in a Slack channel.

    Args:
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        text: The reply text to send
    """
    user_data = await get_user_by_id(mcp_data)
    return await reply_to_thread(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, thread_ts, text)


@mcp.tool()
async def slack_get_thread_replies(channel_id: str, thread_ts: str, limit: int = 100,mcp_data:str=None) -> str:
    """Get all replies in a specific thread.

    Args:
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        limit: Maximum number of replies to return (default 100, max 1000)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_thread_replies(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, thread_ts, limit)


@mcp.tool()
async def slack_start_thread(channel_id: str, text: str, broadcast: bool = False,mcp_data:str=None) -> str:
    """Send a message that can be used to start a thread.

    Args:
        channel_id: The ID of the channel to send the message to
        text: The message text to send
        broadcast: Whether to broadcast the thread reply to the channel (default: False)
    """
    user_data = await get_user_by_id(mcp_data)
    return await start_thread_with_message(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, text, broadcast)


@mcp.tool()
async def slack_reply_to_thread_with_broadcast(channel_id: str, thread_ts: str, text: str,mcp_data:str=None) -> str:
    """Reply to a thread and broadcast the reply to the channel.

    Args:
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
        text: The reply text to send
    """
    user_data = await get_user_by_id(mcp_data)
    return await reply_to_thread_with_broadcast(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, thread_ts, text)


@mcp.tool()
async def slack_get_thread_info(channel_id: str, thread_ts: str,mcp_data:str=None) -> str:
    """Get summary information about a thread.

    Args:
        channel_id: The ID of the channel containing the thread
        thread_ts: The timestamp of the parent message (thread identifier)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_thread_info(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, thread_ts)


@mcp.tool()
async def slack_find_threads_in_channel(channel_id: str, limit: int = 50,mcp_data:str=None) -> str:
    """Find all messages that have threads (replies) in a channel.

    Args:
        channel_id: The ID of the channel to search
        limit: Maximum number of messages to check (default 50, max 1000)
    """
    user_data = await get_user_by_id(mcp_data)
    return await find_threads_in_channel(decryptor.decrypt(user_data['mcpdata']['SLACK']['access_token']), channel_id, limit)

# =============================================================================
# GITHUB TOOLS
# =============================================================================

@mcp.tool()
async def github_get_commits(owner: str, repo: str, branch: str, hours_back: int = 24,mcp_data:str=None) -> str:
    """Get the latest git commits from a repository from an organization of particular branch.

    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        branch: Branch name to get commits from
        hours_back: Number of hours back to look for commits (default 24)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_git_commits(decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), owner, repo, branch, hours_back)

@mcp.tool()
async def github_get_user_info(mcp_data:str=None) -> str:
    """Get user information from GitHub.

    Args:
        
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_user_info(decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']))


@mcp.tool()
async def github_get_repositories(owner: str, sort: str,mcp_data:str=None) -> str:
    """Get the latest git commits from a repository from an organization of particular branch.

    Args:
        owner: Repository owner (user or organization)
        branch: Branch name to get commits from
        hours_back: Number of hours back to look for commits (default 24)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_github_repositories(owner, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), sort)



@mcp.tool()
async def github_get_repository_info(owner: str, repo: str,mcp_data:str=None) -> str:
    """Get detailed information about a specific GitHub repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        
    Returns:
        Formatted string containing repository information
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_github_repository_info(repo_path, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']))



@mcp.tool()
async def github_create_branch(owner: str, repo: str, new_branch: str, base_branch: str = "main",mcp_data:str=None) -> str:
    """Create a new branch in a specified GitHub repository based on an existing branch.

    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        new_branch: The name of the new branch to create
        base_branch: The base branch from which to create the new branch (default is 'main')

    Returns:
        Status message indicating success or failure
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await create_github_branch(repo_path, new_branch, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), base_branch)



@mcp.tool()
async def github_get_repository_branches(owner: str, repo: str, page: int = 1, per_page: int = 30,mcp_data:str=None) -> str:
    """Get all branches for a specific repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        page: Page number for pagination
        per_page: Number of branches per page (max 100)
        
    Returns:
        Formatted string containing branch information
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_repository_branches(repo_path, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), page, per_page)


@mcp.tool()
async def github_get_repository_issues(owner: str, repo: str, state: str = "open", page: int = 1, per_page: int = 30,mcp_data:str=None) -> str:
    """Get issues for a specific repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        state: Issue state (open, closed, all)
        page: Page number for pagination
        per_page: Number of issues per page (max 100)
        
    Returns:
        Formatted string containing issue information
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_repository_issues(repo_path, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), state, page, per_page)



@mcp.tool()
async def github_create_pull_request(
    owner: str,
    repo: str,
    target_branch: str,
    base_branch: str = "main",
    title: str = "Update branch",
    body: str = "Merging changes from base branch.",
    mcp_data:str=None
) -> str:
    """Creates a pull request in a specified GitHub repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        target_branch: The name of the branch to update (head branch)
        base_branch: The base branch from which to merge changes (default is 'main')
        title: The title of the pull request
        body: The body of the pull request
        
    Returns:
        Formatted string containing pull request information or error message
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await create_pull_request(repo_path, target_branch, base_branch, title, body, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']))


@mcp.tool()
async def github_get_pull_request_details(owner: str, repo: str, pull_number: int,mcp_data:str=None) -> str:
    """Fetch detailed information about a specific pull request from a GitHub repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        pull_number: The number of the pull request to retrieve details for
        
    Returns:
        Formatted string containing pull request details or error message
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_pull_request_details(repo_path, pull_number, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']))


@mcp.tool()
async def github_get_pull_requests(
    owner: str,
    repo: str,
    state: str = "open",
    sort: str = None,
    direction: str = None,
    page: int = 1,
    per_page: int = 30,
    mcp_data:str=None
) -> str:
    """Fetch pull requests from a specified GitHub repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        state: State of the pull requests (open, closed, all)
        sort: Sorting criteria (created, updated, popularity, long-running)
        direction: Order of results (asc, desc)
        page: Page number for pagination
        per_page: Number of pull requests per page (max 100)
        
    Returns:
        Formatted string containing pull request information or error message
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_pull_requests(repo_path, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), state, sort, direction, page, per_page)


@mcp.tool()
async def github_get_tags_or_branches(
    owner: str,
    repo: str,
    resource_type: str,
    page: int = 1,
    per_page: int = 30,
    mcp_data:str=None
) -> str:
    """List either tags or branches in a GitHub repository.
    
    Args:
        owner: Repository owner (user or organization)
        repo: Repository name
        resource_type: Specify 'tags' to list tags or 'branches' to list branches
        page: Page number for pagination
        per_page: Number of items per page (max 100)
        
    Returns:
        Formatted string containing the list of tags or branches or error message
    """
    
    # Combine owner and repo into the format expected by the original function
    repo_path = f"{owner}/{repo}"
    user_data = await get_user_by_id(mcp_data)
    return await get_tags_or_branches(repo_path, resource_type, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), page, per_page)


@mcp.tool()
async def github_global_search(
    search_type: str,
    query: str,
    page: int = 1,
    per_page: int = 30,
    mcp_data:str=None
) -> str:
    """Perform a global search on GitHub based on the specified search type and query string.
    
    Args:
        search_type: The type of search to perform (repositories, issues, pulls, code, commits, users)
        query: The string to search for
        page: Page number for pagination
        per_page: Number of results per page (max 100)
        
    Returns:
        Formatted string containing search results or error message
    """
    user_data = await get_user_by_id(mcp_data)
    return await global_search(search_type, query, decryptor.decrypt(user_data['mcpdata']['GITHUB']['access_token']), page, per_page)

# =============================================================================
# NOTION TOOLS
# =============================================================================

@mcp.tool()
async def notion_search(query: str = None, sort: dict = None, filter_params: dict = None, 
                      start_cursor: str = None, page_size: int = 100, mcp_data:str=None) -> str:
    """Search for objects in Notion.Usually used to find pages, databases, or blocks.Always Call this Function if have to do operation on Notion

    Args:
        query: Search query string
        sort: Sort criteria
        filter_params: Filter criteria
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)
    """
    user_data = await get_user_by_id(mcp_data)
    return await search_notion(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), query, sort, filter_params, start_cursor, page_size)

@mcp.tool()
async def notion_get_databases_id(query: str = None, sort: dict = None, filter_params: dict = None, 
                      start_cursor: str = None, page_size: int = 100,mcp_data:str=None) -> str:
    """Get all databases IDs from Notion.Used To get all Parent Database IDs from the Notion Workspace.
    Returns:
        A list of database IDs.
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_databases_id(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']),query, sort, filter_params, start_cursor, page_size)

@mcp.tool()
async def notion_get_pages_id(query: str = None, sort: dict = None, filter_params: dict = None, 
                      start_cursor: str = None, page_size: int = 100,mcp_data:str=None) -> str:
    """Get all Pages IDs from Notion.Used To get all Parent Page IDs from the Notion Workspace.
    Returns:
        A list of pages IDs.
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_pages_id(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']),query, sort, filter_params, start_cursor, page_size)

@mcp.tool()
async def notion_get_page(page_id: str, mcp_data:str=None) -> str:
    """Get a Notion page by ID.Depends on notion_get_pages_id and notion_get_pages_id function to get one single page ID.

    Args:
        page_id: ID of the page to retrieve
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_notion_page(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), page_id)

@mcp.tool()
async def notion_create_database(page_id: str, title: List[Dict[str, Any]], properties: dict,
                               parent_type: str = "page_id", mcp_data: str = None) -> str:
    """Create a new database in Notion. Depends on notion_get_pages to get parent page ID.
    Args:
        page_id: ID of the parent page
        title: Title of database as array of rich text objects
        properties: Property schema of database (required)
        parent_type: Type of parent (defaults to 'page_id')
        mcp_data: User data for authentication
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_notion_database(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), page_id, title, properties, parent_type)


@mcp.tool()
async def notion_create_page(database_id: str, parent_type: str = "database_id", 
                           properties: dict = None, content: List[Dict[str, Any]] = None, mcp_data:str=None) -> str:
    """Create a new page in Notion.Depends on notion_get_databases_id,notion_get_pages_id,notion_get_pages and notion_get_database function to get database or page ID and its properties.Use Accurate page_id or database_id to create a page according to the query of the user

    Args:
        database_id: ID of the parent (database or page)
        parent_type: Type of parent ('database_id' or 'page_id')
        properties: Page properties (required for database pages)
        content: Content blocks for the page
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_notion_page(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), database_id, parent_type, properties, content)

@mcp.tool()
async def notion_update_page(page_id: str, properties: dict, mcp_data:str=None) -> str:
    """Update a Notion page's properties.Depends on notion_get_pages_id function to get one single page ID.

    Args:
        page_id: ID of the page to update
        properties: Updated properties
    """
    user_data = await get_user_by_id(mcp_data)
    return await update_notion_page(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), page_id, properties)

@mcp.tool()
async def notion_get_database(database_id: str, mcp_data:str=None) -> str:
    """Get a Notion database by ID.Depends on notion_get_databases_id function to get one single database ID.

    Args:
        database_id: ID of the database to retrieve
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_notion_database(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), database_id)

@mcp.tool()
async def notion_query_database(database_id: str, filter_params: dict = None, 
                              sorts: list[Dict[str, Any]] = None, start_cursor: str = None, 
                              page_size: int = 100, mcp_data:str=None) -> str:
    """Query a Notion database.Depends on notion_get_databases_id function to get one single database ID.

    Args:
        database_id: ID of the database to query
        filter_params: Filter criteria
        sorts: Sort criteria
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)
    """
    user_data = await get_user_by_id(mcp_data)
    return await query_notion_database(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), database_id, filter_params, sorts, start_cursor, page_size)

@mcp.tool()
async def notion_get_block(block_id: str, mcp_data:str=None) -> str:
    """Get a Notion block by ID.Depends on notion_get_pages_id function to get one single block ID.

    Args:
        block_id: ID of the block to retrieve
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_notion_block(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), block_id)

@mcp.tool()
async def notion_get_block_children(block_id: str, start_cursor: str = None, 
                                  page_size: int = 100, mcp_data:str=None) -> str:
    """Get children blocks of a parent block.Depends on notion_get_pages_id function to get one single block ID

    Args:
        block_id: ID of the parent block
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_block_children(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), block_id, start_cursor, page_size)

@mcp.tool()
async def notion_append_blocks(block_id: str, blocks: list[Dict[str, Any]], mcp_data:str=None) -> str:
    """Append blocks to a parent block.Depends on notion_get_pages_id function to get one single block ID

    Args:
        block_id: ID of the parent block
        blocks: List of block objects to append
    """
    user_data = await get_user_by_id(mcp_data)
    return await append_notion_blocks(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), block_id, blocks)

@mcp.tool()
async def notion_create_comment(page_id: str, parent_type: str, comment_text: str, 
                              discussion_id: str = None, mcp_data:str=None) -> str:
    """Create a comment on a page or block.Depends on notion_get_pages_id or notion_get_block to get one single page or block ID.

    Args:
        page_id: ID of the parent (page or block)
        parent_type: Type of parent ('page_id' or 'block_id')
        comment_text: Text content of the comment
        discussion_id: Optional ID of an existing discussion thread
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_notion_comment(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), page_id, parent_type, comment_text, discussion_id)

@mcp.tool()
async def notion_get_comment(comment_id: str, mcp_data:str=None) -> str:
    """Get a comment by ID.

    Args:
        comment_id: ID of the comment to retrieve
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_notion_comment(decryptor.decrypt(user_data['mcpdata']['NOTION']['access_token']), comment_id)

# =============================================================================
# ASANA TOOLS
# =============================================================================

@mcp.tool()
async def asana_create_project(
    name: str,
    notes: str = "",
    color: Optional[str] = None,
    is_public: bool = True,
    workspace_id: str = None,
    team_id: str = None,
    mcp_data:str=None
) -> str:
    """Create a new project in Asana.

    Args:
        name: The name of the project
        notes: Optional notes about the project
        color: Optional color for the project (light-green, dark-green, light-blue, etc.)
        is_public: Optional flag to make the project public to the team
        workspace_id: workspace ID
        team_id: team ID (required if workspace is an organization)
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_project(
        name,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']),
        notes,
        color,
        is_public,
        workspace_id,
        team_id
    )


@mcp.tool()
async def asana_list_projects(
    workspace_id: str = None,
    mcp_data:str=None
) -> str:
    """List all projects in a workspace.

    Args:
        workspace_id: workspace ID
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_projects(
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']),
        workspace_id
    )


@mcp.tool()
async def asana_get_project(
    project_id: str,
    mcp_data:str=None
) -> str:
    """Get project details.

    Args:
        project_id: The ID of the project
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_project(
        project_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_update_project(
    project_id: str,
    updated_fields: Dict[str, Any],
    mcp_data:str=None
) -> str:
    """Update a project in Asana.

    Args:
        project_id: The ID of the project to update
        updated_fields: Fields to update (name, notes, color, etc.)
    """
    user_data = await get_user_by_id(mcp_data)
    return await update_project(
        project_id,
        updated_fields,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_create_task(
    name: str,
    notes: str = "",
    assignee: Optional[str] = None,
    due_on: Optional[str] = None,
    project_id: str = None,
    workspace_id: str = None,
    mcp_data:str=None
) -> str:
    """Create a new task in Asana.

    Args:
        name: The name of the task
        notes: Optional notes about the task
        assignee: Optional assignee email or ID
        due_on: Optional due date in YYYY-MM-DD format
        project_id: project ID to add the task to
        workspace_id: workspace ID
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_task(
        name,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']),
        notes,
        assignee,
        due_on,
        project_id,
        workspace_id
    )


@mcp.tool()
async def asana_list_tasks(
    project_id: str = None,
    workspace_id: str = None,
    assignee: Optional[str] = None,
    completed_since: Optional[str] = None,
    mcp_data:str=None
) -> str:
    """List tasks in a project or workspace.

    Args:
        project_id: project ID to list tasks from
        workspace_id: workspace ID
        assignee: Optional filter by assignee email or ID
        completed_since: Optional filter for tasks completed since a date (YYYY-MM-DD)
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_tasks(
        project_id,
        workspace_id,
        assignee,
        completed_since,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_update_task(
    task_id: str,
    updated_fields: Dict[str, Any],
    mcp_data:str=None
) -> str:
    """Update a task in Asana.

    Args:
        task_id: The ID of the task to update
        updated_fields: Fields to update (name, notes, assignee, due_on, etc.)
    """
    user_data = await get_user_by_id(mcp_data)
    return await update_task(
        task_id,
        updated_fields,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_complete_task(
    task_id: str,
    mcp_data:str=None
) -> str:
    """Mark a task as complete in Asana.

    Args:
        task_id: The ID of the task to complete
    """
    user_data = await get_user_by_id(mcp_data)
    return await complete_task(
        task_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_create_section(
    name: str,
    project_id: str,
    mcp_data:str=None
) -> str:
    """Create a new section in an Asana project.

    Args:
        name: The name of the section
        project_id: The ID of the project to add the section to
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_section(
        name,
        project_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_list_sections(
    project_id: str,
    mcp_data:str=None
) -> str:
    """List all sections in an Asana project.

    Args:
        project_id: The ID of the project
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_sections(
        project_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_add_task_to_section(
    task_id: str,
    section_id: str,
    mcp_data:str=None
) -> str:
    """Add a task to a section in Asana.

    Args:
        task_id: The ID of the task
        section_id: The ID of the section
    """
    user_data = await get_user_by_id(mcp_data)
    return await add_task_to_section(
        task_id,
        section_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_add_dependencies_to_task(
    task_id: str,
    dependency_ids: List[str],
    mcp_data:str=None
) -> str:
    """Add dependencies to a task in Asana.
    Note: This feature requires a premium Asana account.

    Args:
        task_id: The ID of the task
        dependency_ids: List of task IDs that the task depends on
    """
    user_data = await get_user_by_id(mcp_data)
    return await add_dependencies_to_task(
        task_id,
        dependency_ids,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )


@mcp.tool()
async def asana_get_task_dependencies(
    task_id: str,
    mcp_data:str=None
) -> str:
    """Get dependencies for a task in Asana.
    Note: This feature requires a premium Asana account.

    Args:
        task_id: The ID of the task
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_task_dependencies(
        task_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )

@mcp.tool()
async def asana_get_user_info(mcp_data:Optional[str]=None) -> str:
    """Get user information from Asana.

    Args:
        mcp_data: asana token data from mcp
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_user_info_asana(decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']))

@mcp.tool()
async def asana_get_workspace_id(mcp_data:Optional[str]=None) -> str:
    """Get the default workspace ID from Asana.Always call this function first to get the workspace ID

    Args:
        mcp_data: asana token data from mcp
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_workspace_id(decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']))

@mcp.tool()
async def asana_create_team(
    name: str,
    workspace_id: str,
    mcp_data:str=None,
    description: Optional[str] = "",
    html_description: Optional[str] = ""
) -> str:
    """Create a new team in Asana.

    Args:
        name: The name of the team
        workspace_id: Workspace ID
        description: Optional plain text description of the team
        html_description: Optional HTML-formatted description of the team
    """
    user_data = await get_user_by_id(mcp_data)
    return await create_team(
        name,
        workspace_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']),
        description,
        html_description
    )

@mcp.tool()
async def asana_list_teams(
    workspace_id: str,
    mcp_data:str=None
) -> str:
    """List all teams in a workspace.

    Args:
        workspace_id: Workspace ID
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_teams(
        workspace_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )

@mcp.tool()
async def asana_list_team_ids(
    workspace_id: str,
    mcp_data:str=None
) -> str:
    """List all team IDs in a workspace.

    Args:
        workspace_id: Workspace ID
    """
    user_data = await get_user_by_id(mcp_data)
    return await list_team_ids(
        workspace_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token']),
    )

@mcp.tool()
async def asana_get_team(
    team_id: str,
    mcp_data:str=None
) -> str:
    """Get details about a specific team in Asana.

    Args:
        team_id: The ID of the team
    """
    user_data = await get_user_by_id(mcp_data)
    return await get_team(
        team_id,
        decryptor.decrypt(user_data['mcpdata']['ASANA']['access_token'])
    )