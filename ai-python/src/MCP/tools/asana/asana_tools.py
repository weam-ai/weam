"""Asana-related MCP tools with authentication support."""
from typing import Any, List, Optional, Dict
from datetime import datetime
import httpx
from src.logger.default_logger import logger
import os

# Load environment variables
ASANA_API_BASE = os.environ.get("ASANA_API_BASE", "https://app.asana.com/api/1.0")

async def make_asana_request(endpoint: str, access_token: str = None, params: dict = None, json_data: dict = None, method: str = "GET") -> dict[str, Any] | None:
    """Make a request to the Asana API with proper error handling.
    
    Args:
        endpoint: The API endpoint to call (without the base URL)
        access_token: Asana access token.
        params: Optional query parameters for the request
        json_data: Optional JSON data for POST/PUT requests
        method: HTTP method (GET, POST, PUT, DELETE)
        
    Returns:
        Response data as dictionary or None if request failed
    """
    
    logger.debug(f"Making {method} request to Asana API: {endpoint}")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    url = f"{ASANA_API_BASE}/{endpoint}"
    
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params, timeout=30.0)
            else:  # POST, PUT, DELETE
                if method == "PUT":
                    response = await client.put(url, headers=headers, json=json_data, timeout=30.0)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers, timeout=30.0)
                else:  # POST
                    response = await client.post(url, headers=headers, json=json_data, timeout=30.0)
            
            response.raise_for_status()
            
            logger.debug(f"Successfully received response from Asana API: {endpoint}")
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error making request to Asana API: {endpoint} - Status: {e.response.status_code} - Error: {str(e)}")
            # Try to parse error response
            try:
                error_data = e.response.json()
                return error_data
            except Exception:
                return {"errors": [{"message": f"HTTP error: {e.response.status_code}"}]}
        except Exception as e:
            logger.error(f"Error making request to Asana API: {endpoint} - Error: {str(e)}")
            return None


# =============================================================================
# PROJECT FUNCTIONS
# =============================================================================

async def create_project(
    name: str,
    access_token: str = None,
    notes: str = "",
    color: Optional[str] = None,
    is_public: bool = True,
    workspace_id: str = None,
    team_id: str = None
 ) -> str:
    """Create a new project in Asana Workspace.

    Args:
        name: The name of the project
        access_token: Asana access token(required)
        notes: Optional notes about the project
        color: Optional color for the project (light-green, dark-green, light-blue, etc.)
        is_public: Optional flag to make the project public to the team
        workspace_id: workspace ID
        team_id: Team ID (required and dependent on get_team/list_teams/list_team_ids tools)

    Returns:
        Formatted string containing project information or error message
    """
    logger.info(f"Creating project: {name}")
    
    # Validate required parameters
    if not name:
        return "Error: Project name is required"
    
    workspace = await make_asana_request(f"workspaces/{workspace_id}", access_token)
    if workspace.get("data").get("is_organization", False):
        project_data = {
            "name": name,
            "notes": notes,
            "workspace": workspace_id,
            "team": team_id
        }
    else:
        project_data = {
            "name": name,
            "notes": notes,
            "workspace": workspace_id
        }

    if color:
        project_data["color"] = color
    
    logger.debug(f"Creating project with data: {project_data}")
    
    data = await make_asana_request(
        "projects", 
        access_token, 
        json_data={"data": project_data}, 
        method="POST"
    )
    
    if not data:
        logger.warning(f"Failed to create project: {name}")
        return f"Failed to create project: {name}"

    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    project = data.get("data", {})
    
    formatted_project = f"""
    Project Created Successfully!
    Name: {project.get('name', name)}
    ID: {project.get('gid', 'unknown')}
    Notes: {project.get('notes', 'None')}
    Color: {project.get('color', 'None')}
    Public: {not project.get('is_private', not is_public)}
    Workspace: {project.get('workspace', {}).get('name', 'unknown') if isinstance(project.get('workspace', {}), dict) else 'unknown'}
    Team: {project.get('team', {}).get('name', 'None') if isinstance(project.get('team', {}), dict) else 'None'}
    Created At: {project.get('created_at', 'unknown')}
    """
    
    logger.info(f"Successfully created project: {name}")
    return formatted_project


async def list_projects(
    access_token: str = None,
    workspace_id: str = None
 ) -> str:
    """List all projects in a workspace.

    Args:
        access_token: Asana access token (required).
        workspace_id: workspace ID

    Returns:
        Formatted string containing project information or error message
    """
    logger.info("Listing projects")
    
    data = await make_asana_request(
        f"workspaces/{workspace_id}/projects", 
        access_token
    )
    
    if not data:
        logger.warning("Failed to list projects")
        return "Failed to list projects"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    projects = data.get("data", [])
    
    if not projects:
        logger.info("No projects found")
        return "No projects found in the workspace"
    
    formatted_projects = []
    for project in projects:
        project_info = f"""
        Name: {project.get('name', 'unknown')}
        ID: {project.get('gid', 'unknown')}
        Notes: {project.get('notes', 'None')}
        Color: {project.get('color', 'None')}
        Public: {not project.get('is_private', True)}
        """
        formatted_projects.append(project_info)
    
    logger.info(f"Found {len(projects)} projects")
    return f"Found {len(projects)} projects:\n\n" + "\n---\n".join(formatted_projects)


async def get_project(
    project_id: str,
    access_token: str = None
 ) -> str:
    """Get project details.

    Args:
        project_id: The ID of the project
        access_token: Asana access token (required).

    Returns:
        Formatted string containing project details or error message
    """
    logger.info(f"Getting project details: {project_id}")
    
    # Validate required parameters
    if not project_id:
        return "Error: Project ID is required"
    
    data = await make_asana_request(
        f"projects/{project_id}", 
        access_token
    )
    
    if not data:
        logger.warning(f"Failed to get project details: {project_id}")
        return f"Failed to get project details: {project_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    project = data.get("data", {})
    
    if not project:
        logger.info(f"No project found with ID: {project_id}")
        return f"No project found with ID: {project_id}"
    
    formatted_project = f"""
    Project Details:
    Name: {project.get('name', 'unknown')}
    ID: {project.get('gid', 'unknown')}
    Notes: {project.get('notes', 'None')}
    Color: {project.get('color', 'None')}
    Public: {not project.get('is_private', True)}
    Workspace: {project.get('workspace', {}).get('name', 'unknown')}
    Created At: {project.get('created_at', 'unknown')}
    Modified At: {project.get('modified_at', 'unknown')}
    Owner: {project.get('owner', {}).get('name', 'None')}
    """
    
    logger.info(f"Successfully retrieved project details: {project_id}")
    return formatted_project


async def update_project(
    project_id: str,
    updated_fields: Dict[str, Any],
    access_token: str = None
 ) -> str:
    """Update a project in Asana.

    Args:
        project_id: The ID of the project to update
        updated_fields: Fields to update (name, notes, color, etc.)
        access_token: Asana access token (required).

    Returns:
        Formatted string containing updated project information or error message
    """
    logger.info(f"Updating project: {project_id}")
    
    # Validate required parameters
    if not project_id:
        return "Error: Project ID is required"
    
    if not updated_fields:
        return "Error: No fields to update provided"
    
    logger.debug(f"Updating project with data: {updated_fields}")
    
    data = await make_asana_request(
        f"projects/{project_id}", 
        access_token, 
        json_data={"data": updated_fields}, 
        method="PUT"
    )
    
    if not data:
        logger.warning(f"Failed to update project: {project_id}")
        return f"Failed to update project: {project_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    project = data.get("data", {})
    
    formatted_project = f"""
    Project Updated Successfully!
    Name: {project.get('name', 'unknown')}
    ID: {project.get('gid', 'unknown')}
    Notes: {project.get('notes', 'None')}
    Color: {project.get('color', 'None')}
    Public: {not project.get('is_private', True)}
    Modified At: {project.get('modified_at', 'unknown')}
    """
    
    logger.info(f"Successfully updated project: {project_id}")
    return formatted_project


# =============================================================================
# TASK FUNCTIONS
# =============================================================================

async def create_task(
    name: str,
    access_token: str = None,
    notes: str = "",
    assignee: Optional[str] = None,
    due_on: Optional[str] = None,
    project_id: str = None,
    workspace_id: str = None
 ) -> str:
    """Create a new task in Asana.

    Args:
        name: The name of the task
        access_token: Asana access token (required).
        notes: Optional notes about the task
        assignee: Optional assignee email or ID
        due_on: Optional due date in YYYY-MM-DD format
        project_id: project ID to add the task to
        workspace_id: workspace ID
    Returns:
        Formatted string containing task information or error message
    """
    logger.info(f"Creating task: {name}")
    
    # Validate required parameters
    if not name:
        return "Error: Task name is required"
    
    task_data = {
        "name": name,
        "notes": notes
    }
    
    if workspace_id:
        task_data["workspace"] = workspace_id
    
    if project_id:
        task_data["projects"] = [project_id]
    
    if assignee:
        task_data["assignee"] = assignee
    
    if due_on:
        task_data["due_on"] = due_on
    
    logger.debug(f"Creating task with data: {task_data}")
    
    data = await make_asana_request(
        "tasks", 
        access_token, 
        json_data={"data": task_data}, 
        method="POST"
    )
    
    if not data:
        logger.warning(f"Failed to create task: {name}")
        return f"Failed to create task: {name}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    task = data.get("data", {})
    
    formatted_task = f"""
    Task Created Successfully!
    Name: {task.get('name', name)}
    ID: {task.get('gid', 'unknown')}
    Notes: {task.get('notes', 'None')}
    Assignee: {task.get('assignee', {}).get('name', 'None') if isinstance(task.get('assignee', {}), dict) else 'None'}
    Due On: {task.get('due_on', 'None')}
    Completed: {task.get('completed', False)}
    Created At: {task.get('created_at', 'unknown')}
    """
    
    logger.info(f"Successfully created task: {name}")
    return formatted_task


async def list_tasks(
    project_id: str = None,
    workspace_id: str = None,
    assignee: Optional[str] = None,
    completed_since: Optional[str] = None,
    access_token: str = None
 ) -> str:
    """List tasks in a project or workspace.

    Args:
        project_id: project ID to list tasks from
        workspace_id: workspace ID
        assignee: Optional filter by assignee email or ID
        completed_since: Optional filter for tasks completed since a date (YYYY-MM-DD)
        access_token: Asana access token (required).

    Returns:
        Formatted string containing task information or error message
    """
    logger.info("Listing tasks")
    
    params = {}
    endpoint = ""
    
    if project_id:
        endpoint = f"projects/{project_id}/tasks"
    elif workspace_id:
        endpoint = "tasks"
        params["workspace"] = workspace_id
    
    if assignee:
        params["assignee"] = assignee
    
    if completed_since:
        params["completed_since"] = completed_since
    
    data = await make_asana_request(
        endpoint, 
        access_token, 
        params=params
    )
    
    if not data:
        logger.warning("Failed to list tasks")
        return "Failed to list tasks"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    tasks = data.get("data", [])
    
    if not tasks:
        logger.info("No tasks found")
        return "No tasks found"
    
    formatted_tasks = []
    for task in tasks:
        task_info = f"""
        Name: {task.get('name', 'unknown')}
        ID: {task.get('gid', 'unknown')}
        Completed: {task.get('completed', False)}
        Due On: {task.get('due_on', 'None')}
        """
        formatted_tasks.append(task_info)
    
    logger.info(f"Found {len(tasks)} tasks")
    return f"Found {len(tasks)} tasks:\n\n" + "\n---\n".join(formatted_tasks)


async def update_task(
    task_id: str,
    updated_fields: Dict[str, Any],
    access_token: str = None
 ) -> str:
    """Update a task in Asana.

    Args:
        task_id: The ID of the task to update
        updated_fields: Fields to update (name, notes, assignee, due_on, etc.)
        access_token: Asana access token (required).

    Returns:
        Formatted string containing updated task information or error message
    """
    logger.info(f"Updating task: {task_id}")
    
    # Validate required parameters
    if not task_id:
        return "Error: Task ID is required"
    
    if not updated_fields:
        return "Error: No fields to update provided"
    
    logger.debug(f"Updating task with data: {updated_fields}")
    
    data = await make_asana_request(
        f"tasks/{task_id}", 
        access_token, 
        json_data={"data": updated_fields}, 
        method="PUT"
    )
    
    if not data:
        logger.warning(f"Failed to update task: {task_id}")
        return f"Failed to update task: {task_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    task = data.get("data", {})
    
    formatted_task = f"""
    Task Updated Successfully!
    Name: {task.get('name', 'unknown')}
    ID: {task.get('gid', 'unknown')}
    Notes: {task.get('notes', 'None')}
    Assignee: {task.get('assignee', {}).get('name', 'None') if isinstance(task.get('assignee', {}), dict) else 'None'}
    Due On: {task.get('due_on', 'None')}
    Completed: {task.get('completed', False)}
    Modified At: {task.get('modified_at', 'unknown')}
    """
    
    logger.info(f"Successfully updated task: {task_id}")
    return formatted_task


async def complete_task(
    task_id: str,
    access_token: str = None
 ) -> str:
    """Mark a task as complete in Asana.

    Args:
        task_id: The ID of the task to complete
        access_token: Asana access token (required).

    Returns:
        Success status message or error message
    """
    logger.info(f"Completing task: {task_id}")
    
    # Validate required parameters
    if not task_id:
        return "Error: Task ID is required"
    
    data = await make_asana_request(
        f"tasks/{task_id}", 
        access_token, 
        json_data={"data": {"completed": True}}, 
        method="PUT"
    )
    
    if not data:
        logger.warning(f"Failed to complete task: {task_id}")
        return f"Failed to complete task: {task_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    logger.info(f"Successfully completed task: {task_id}")
    return f"Task {task_id} marked as complete"



# =============================================================================
# SECTION FUNCTIONS
# =============================================================================

async def create_section(
    name: str,
    project_id: str,
    access_token: str = None
 ) -> str:
    """Create a new section in an Asana project.

    Args:
        name: The name of the section
        project_id: The ID of the project to add the section to
        access_token: Asana access token (required).

    Returns:
        Formatted string containing section information or error message
    """
    logger.info(f"Creating section: {name} in project: {project_id}")
    
    # Validate required parameters
    if not name:
        return "Error: Section name is required"
    
    section_data = {
        "name": name
    }
    
    logger.debug(f"Creating section with data: {section_data}")
    
    data = await make_asana_request(
        f"projects/{project_id}/sections", 
        access_token, 
        json_data={"data": section_data}, 
        method="POST"
    )
    
    if not data:
        logger.warning(f"Failed to create section: {name}")
        return f"Failed to create section: {name}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    section = data.get("data", {})
    
    formatted_section = f"""
    Section Created Successfully!
    Name: {section.get('name', name)}
    ID: {section.get('gid', 'unknown')}
    Project: {project_id}
    Created At: {section.get('created_at', 'unknown')}
    """
    
    logger.info(f"Successfully created section: {name}")
    return formatted_section


async def list_sections(
    project_id: str,
    access_token: str = None
 ) -> str:
    """List all sections in an Asana project.

    Args:
        project_id: The ID of the project
        access_token: Asana access token (required).

    Returns:
        Formatted string containing section information or error message
    """
    logger.info(f"Listing sections in project: {project_id}")
    
    data = await make_asana_request(
        f"projects/{project_id}/sections", 
        access_token
    )
    
    if not data:
        logger.warning(f"Failed to list sections in project: {project_id}")
        return f"Failed to list sections in project: {project_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    sections = data.get("data", [])
    
    if not sections:
        logger.info(f"No sections found in project: {project_id}")
        return f"No sections found in project: {project_id}"
    
    formatted_sections = []
    for section in sections:
        section_info = f"""
        Name: {section.get('name', 'unknown')}
        ID: {section.get('gid', 'unknown')}
        """
        formatted_sections.append(section_info)
    
    logger.info(f"Found {len(sections)} sections in project: {project_id}")
    return f"Found {len(sections)} sections in project {project_id}:\n\n" + "\n---\n".join(formatted_sections)


async def add_task_to_section(
    task_id: str,
    section_id: str,
    access_token: str = None
 ) -> str:
    """Add a task to a section in Asana.

    Args:
        task_id: The ID of the task
        section_id: The ID of the section
        access_token: Asana access token (required).

    Returns:
        Success status message or error message
    """
    logger.info(f"Adding task {task_id} to section {section_id}")
    
    # Validate required parameters
    if not task_id:
        return "Error: Task ID is required"
    
    if not section_id:
        return "Error: Section ID is required"
    
    data = await make_asana_request(
        f"sections/{section_id}/addTask", 
        access_token, 
        json_data={"data": {"task": task_id}}, 
        method="POST"
    )
    
    if not data:
        logger.warning(f"Failed to add task {task_id} to section {section_id}")
        return f"Failed to add task {task_id} to section {section_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    logger.info(f"Successfully added task {task_id} to section {section_id}")
    return f"Task {task_id} added to section {section_id} successfully"


# =============================================================================
# DEPENDENCY FUNCTIONS
# =============================================================================

async def add_dependencies_to_task(
    task_id: str,
    dependency_ids: List[str],
    access_token: str = None
 ) -> str:
    """Add dependencies to a task in Asana.
    Note: This feature requires a premium Asana account.

    Args:
        task_id: The ID of the task
        dependency_ids: List of task IDs that the task depends on
        access_token: Asana access token (required).

    Returns:
        Success status message or error message
    """
    logger.info(f"Adding dependencies to task: {task_id}")
    
    # Validate required parameters
    if not task_id:
        return "Error: Task ID is required"
    
    if not dependency_ids or not isinstance(dependency_ids, list):
        return "Error: Dependency IDs must be a non-empty list"
    
    success_count = 0
    error_messages = []
    
    for dep_id in dependency_ids:
        data = await make_asana_request(
            f"tasks/{task_id}/dependencies", 
            access_token, 
            json_data={"data": {"dependency": dep_id}}, 
            method="POST"
        )
        
        if not data:
            error_message = f"Failed to add dependency {dep_id} to task {task_id}"
            logger.warning(error_message)
            error_messages.append(error_message)
            continue
        
        # Check for error responses
        if isinstance(data, dict) and "errors" in data:
            error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
            logger.warning(f"Asana API error: {error_message}")
            error_messages.append(f"Dependency {dep_id}: Asana API error: {error_message}")
            continue
        
        success_count += 1
    
    if success_count == len(dependency_ids):
        logger.info(f"Successfully added all dependencies to task {task_id}")
        return f"Successfully added all {len(dependency_ids)} dependencies to task {task_id}"
    elif success_count > 0:
        logger.info(f"Added {success_count} out of {len(dependency_ids)} dependencies to task {task_id}")
        return f"Added {success_count} out of {len(dependency_ids)} dependencies to task {task_id}\n\nErrors:\n" + "\n".join(error_messages)
    else:
        logger.warning(f"Failed to add any dependencies to task {task_id}")
        return f"Failed to add any dependencies to task {task_id}\n\nErrors:\n" + "\n".join(error_messages)




async def get_task_dependencies(
    task_id: str,
    access_token: str = None
 ) -> str:
    """Get dependencies for a task in Asana.
    Note: This feature requires a premium Asana account.

    Args:
        task_id: The ID of the task
        access_token: Asana access token (required).
    Returns:
        Formatted string containing dependency information or error message
    """
    logger.info(f"Getting dependencies for task: {task_id}")
    
    # Validate required parameters
    if not task_id:
        return "Error: Task ID is required"
    
    data = await make_asana_request(
        f"tasks/{task_id}/dependencies", 
        access_token
    )
    
    if not data:
        logger.warning(f"Failed to get dependencies for task: {task_id}")
        return f"Failed to get dependencies for task: {task_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    dependencies = data.get("data", [])
    
    if not dependencies:
        logger.info(f"No dependencies found for task: {task_id}")
        return f"No dependencies found for task: {task_id}"
    
    formatted_dependencies = []
    for dependency in dependencies:
        dependency_info = f"""
        Name: {dependency.get('name', 'unknown')}
        ID: {dependency.get('gid', 'unknown')}
        Completed: {dependency.get('completed', False)}
        Due On: {dependency.get('due_on', 'None')}
        """
        formatted_dependencies.append(dependency_info)
    
    logger.info(f"Found {len(dependencies)} dependencies for task: {task_id}")
    return f"Found {len(dependencies)} dependencies for task {task_id}:\n\n" + "\n---\n".join(formatted_dependencies)

async def get_user_info_asana(asana_token: str) -> str:
    """
    Get current user information from Asana.
    Args:
        asana_token: Asana Personal Access Token for authentication
    Returns:
        Formatted string containing user information or error message.
    """
    
    logger.info("Fetching current Asana user info")
    data = await make_asana_request("users/me", asana_token)
    if not data:
        logger.warning("No response or failed request to Asana API")
        return "Failed to fetch user info from Asana API"
    # Asana wraps the object under "data"
    user = data.get("data")
    if not user:
        logger.warning("Asana API response missing 'data'")
        return "Failed to get user info: invalid response"
    # Basic error handling
    if "errors" in data:
        err_msgs = "; ".join(e.get("message", "unknown error") for e in data["errors"])
        logger.warning(f"Asana API errors: {err_msgs}")
        return f"Failed to get user info: {err_msgs}"
    # Format the user information
    user_info = f"""
Username:         {user.get('gid', 'unknown')}
Name:             {user.get('name', 'Not provided')}
Email:            {user.get('email', 'Not provided')}
Workspaces:       {user.get('workspaces', [])}
Resource Type:    {user.get('resource_type', 'unknown')}
"""
    logger.info("Successfully retrieved Asana user information")
    return user_info.strip()


async def get_workspace_id(asana_token: str) -> str:
    """
    Get Workspace Id for user Token.
    Args:
        asana_token: Asana Personal Access Token for authentication
    Returns:
        Formatted string containing user information or error message.
    """
    
    logger.info("Fetching current Asana user info")
    data = await make_asana_request("users/me", asana_token)
    if not data:
        logger.warning("No response or failed request to Asana API")
        return "Failed to fetch user info from Asana API"
    # Asana wraps the object under "data"
    user = data.get("data")
    if not user:
        logger.warning("Asana API response missing 'data'")
        return "Failed to get user info: invalid response"
    # Basic error handling
    if "errors" in data:
        err_msgs = "; ".join(e.get("message", "unknown error") for e in data["errors"])
        logger.warning(f"Asana API errors: {err_msgs}")
        return f"Failed to get user info: {err_msgs}"
    # Format the user information

    logger.info("Successfully retrieved Asana user information")
    return user.get('workspaces', [{}])[0].get('gid', 'unknown')


# =============================================================================
# TEAM FUNCTIONS
# =============================================================================

async def create_team(
    name: str,
    workspace_id: str,
    access_token: str = None,
    description: str = "",
    html_description: str = "",
) -> str:
    """Create a new team in Asana.

    Args:
        name: The name of the team
        workspace_id: Workspace ID
        access_token: Asana access token (required).
        description: Optional plain text description of the team
        html_description: Optional HTML-formatted description of the team

    Returns:
        Formatted string containing team information or error message
    """
    logger.info(f"Creating team: {name}")
    
    # Validate required parameters
    if not name:
        return "Error: Team name is required"
    
    if not workspace_id:
        return "Error: Workspace ID is required"
    
    team_data = {
        "name": name,
        "organization": workspace_id,
        "description": description,
        "html_description": html_description
    }
    
    logger.debug(f"Creating team with data: {team_data}")
    
    data = await make_asana_request(
        "teams",
        access_token,
        json_data={"data": team_data},
        method="POST"
    )
    
    if not data:
        logger.warning(f"Failed to create team: {name}")
        return f"Failed to create team: {name}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    team = data.get("data", {})
    
    formatted_team = f"""
    Team Created Successfully!
    Name: {team.get('name', name)}
    ID: {team.get('gid', 'unknown')}
    Description: {team.get('description', 'None')}
    Organization: {team.get('organization', {}).get('name', 'unknown') if isinstance(team.get('organization', {}), dict) else 'unknown'}
    """
    
    logger.info(f"Successfully created team: {name}")
    return formatted_team


async def list_team_ids(
    workspace_id: str = None,
    access_token: str = None,
) -> str:
    """List all team ids in an organization.
    Use this tool before creating a project to get the team ID.
    Args:
        workspace_id: Workspace ID
        access_token: Asana access token (required).

    Returns:
        Formatted string containing team information or error message
    """
    logger.info(f"Listing team ids in organization: {workspace_id}")
    
    # Validate required parameters
    if not workspace_id:
        return "Error: Workspace ID is required"
    
    data = await make_asana_request(
        f"workspaces/{workspace_id}/teams", 
        access_token,
    )
    
    if not data:
        logger.warning("Failed to list team ids")
        return "Failed to list team ids"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    teams = data.get("data", [])
    
    if not teams:
        logger.info("No teams found")
        return "No teams found in the organization"
    
    formatted_teams = []
    for team in teams:
        formatted_teams.append(team.get('gid', 'unknown'))

    logger.info(f"Found {len(teams)} team ids")
    return f"Found {len(teams)} sections in project {workspace_id}:\n\n" + "\n---\n".join(formatted_teams)

async def list_teams(
    workspace_id: str = None,
    access_token: str = None,
) -> str:
    """List all teams in an organization.

    Args:
        workspace_id: Workspace ID
        access_token: Asana access token (required).

    Returns:
        Formatted string containing team information or error message
    """
    logger.info(f"Listing teams in organization: {workspace_id}")
    
    # Validate required parameters
    if not workspace_id:
        return "Error: Workspace ID is required"
    
    data = await make_asana_request(
        f"workspaces/{workspace_id}/teams", 
        access_token,
    )
    
    if not data:
        logger.warning("Failed to list teams")
        return "Failed to list teams"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    teams = data.get("data", [])
    
    if not teams:
        logger.info("No teams found")
        return "No teams found in the organization"
    
    formatted_teams = []
    for team in teams:
        team_info = f"""
        Name: {team.get('name', 'unknown')}
        ID: {team.get('gid', 'unknown')}
        """
        formatted_teams.append(team_info)
    
    logger.info(f"Found {len(teams)} teams")
    return f"Found {len(teams)} sections in workspace {workspace_id}:\n\n" + "\n---\n".join(formatted_teams)


async def get_team(
    team_id: str,
    access_token: str = None
) -> str:
    """Get team details.

    Args:
        team_id: The ID of the team
        access_token: Asana access token (required).

    Returns:
        Formatted string containing team details or error message
    """
    logger.info(f"Getting team details: {team_id}")
    
    # Validate required parameters
    if not team_id:
        return "Error: Team ID is required"
    
    data = await make_asana_request(
        f"teams/{team_id}", 
        access_token
    )
    
    if not data:
        logger.warning(f"Failed to get team details: {team_id}")
        return f"Failed to get team details: {team_id}"
    
    # Check for error responses
    if isinstance(data, dict) and "errors" in data:
        error_message = data.get("errors", [{}])[0].get("message", "Unknown error")
        logger.warning(f"Asana API error: {error_message}")
        return f"Asana API error: {error_message}"
    
    team = data.get("data", {})
    
    if not team:
        logger.info(f"No team found with ID: {team_id}")
        return f"No team found with ID: {team_id}"
    
    formatted_team = f"""
    Team Details:
    Name: {team.get('name', 'unknown')}
    ID: {team.get('gid', 'unknown')}
    Description: {team.get('description', 'None')}
    HTML Description: {team.get('html_description', 'None')}
    Organization: {team.get('organization', {}).get('name', 'unknown') if isinstance(team.get('organization', {}), dict) else 'unknown'}
    """
    
    logger.info(f"Successfully retrieved team details: {team_id}")
    return formatted_team