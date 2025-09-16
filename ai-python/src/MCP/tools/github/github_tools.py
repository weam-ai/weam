"""GitHub-related MCP tools with authentication support."""
from typing import Any, Optional
from datetime import datetime, timedelta
import httpx
from src.logger.default_logger import logger
import os 

GITHUB_API_BASE = os.environ.get("GITHUB_API_BASE", "https://api.github.com")
# You need to set this variable with your GitHub token
# This should be loaded from your environment or configuration


async def make_github_request(endpoint: str, github_token: str, params: dict = None, json_data: dict = None, method: str = "GET") -> dict[str, Any] | None:
    """Make a request to the GitHub API with proper error handling."""
    logger.debug(f"Making {method} request to GitHub API: {endpoint}")
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    url = f"{GITHUB_API_BASE}/{endpoint}"
    
    async with httpx.AsyncClient() as client:
        try:
            
            if method == "GET":
                response = await client.get(url, headers=headers, params=params, timeout=30.0)
            else:  # POST
                response = await client.post(url, headers=headers, json=json_data, timeout=30.0)
            response.raise_for_status()
            
            logger.info(f"Response of the request: {response}")
            logger.debug(f"Successfully received response from GitHub API: {endpoint}")
            return response.json()
        except Exception as e:
            logger.error(f"Error making request to GitHub API: {endpoint} - Error: {str(e)}")
            return None
        


async def get_github_repositories(
    username: str,
    access_token: Optional[str] = None,
    sort: str = "full_name"
) -> str:
    """Get repositories for a specific GitHub user with pagination support.

    Args:
        username: The GitHub username to fetch repositories for
        access_token: Optional GitHub access token. If not provided, uses global github_token
        repo_type: Type of repositories to fetch (all, owner, public, private, member)
        sort: Sorting method (created, updated, pushed, full_name)
        direction: Sorting direction (asc or desc)
        page: Page number to fetch (default is 1)
        per_page: Number of repositories per page (default is 30, max is 100)

    Returns:
        Formatted string containing repository information
    """
    logger.info(f"Fetching repositories for user: {username}, sort: {sort}")
    
    # Validate input parameters
    if not username:
        return "Error: Username is required"
    

    
    params = {
        
        "sort": sort
    }
    
    endpoint = f"users/{username}/repos"
    
    data = await make_github_request(endpoint, access_token, params=params)
    if not data:
        logger.warning(f"Failed to fetch repositories for user: {username}")
        return f"Failed to fetch repositories for user: {username}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        logger.warning(f"GitHub API error: {error_message}")
        return f"GitHub API error: {error_message}"
    
    if not isinstance(data, list) or not data:
        logger.info(f"No repositories found for user: {username}")
        return f"No repositories found for user: {username}"
    
    formatted_repos = []
    for repo in data:
        repo_info = f"""
        Name: {repo.get('name', 'unknown')}
        Full Name: {repo.get('full_name', 'unknown')}
        Description: {repo.get('description', 'No description')}
        Language: {repo.get('language', 'Not specified')}
        Stars: {repo.get('stargazers_count', 0)}
        Forks: {repo.get('forks_count', 0)}
        Private: {repo.get('private', False)}
        URL: {repo.get('html_url', 'unknown')}
        Created: {repo.get('created_at', 'unknown')}
        Updated: {repo.get('updated_at', 'unknown')}
        """
        formatted_repos.append(repo_info)
    
    logger.info(f"Successfully fetched {len(data)} repositories for user: {username}")
    return f"Found {len(data)} repositories for user '{username}':\n\n" + "\n---\n".join(formatted_repos)


async def create_github_branch(
    repo: str, 
    new_branch: str,
    access_token: Optional[str] = None,
    base_branch: str = "main"
) -> str:
    """Create a new branch in a specified GitHub repository based on an existing branch.

    Args:
        repo: The GitHub repository in the format 'owner/repo'
        new_branch: The name of the new branch to create
        access_token: Optional GitHub access token. If not provided, uses global github_token
        base_branch: The base branch from which to create the new branch (default is 'main')

    Returns:
        Status message indicating success or failure
    """
    logger.info(f"Creating branch '{new_branch}' from base branch '{base_branch}' in repo: {repo}")
    
    # Validate input parameters
    if not repo:
        return "Error: Repository name is required"
    
    if not new_branch:
        return "Error: New branch name is required"
    
    # Validate repository format
    if '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    # Get the SHA of the base branch
    base_branch_endpoint = f"repos/{repo}/git/refs/heads/{base_branch}"
    base_branch_data = await make_github_request(base_branch_endpoint, access_token)
    
    if not base_branch_data:
        logger.warning(f"Failed to get base branch information for: {base_branch}")
        return f"Failed to get base branch information: {base_branch}"
    
    # Check for error responses
    if isinstance(base_branch_data, dict) and "error" in base_branch_data:
        error_message = base_branch_data.get("message", "Unknown error")
        logger.warning(f"Error getting base branch: {error_message}")
        return f"Error getting base branch: {error_message}"
    
    base_branch_sha = base_branch_data.get("object", {}).get("sha")
    if not base_branch_sha:
        logger.warning(f"Could not retrieve SHA for base branch: {base_branch}")
        return f"Could not retrieve SHA for base branch: {base_branch}. Make sure the branch exists."
    
    logger.debug(f"Base branch SHA: {base_branch_sha}")
    
    # Create the new branch
    create_branch_endpoint = f"repos/{repo}/git/refs"
    json_data = {
        "ref": f"refs/heads/{new_branch}",
        "sha": base_branch_sha
    }
    
    create_data = await make_github_request(create_branch_endpoint, access_token, json_data=json_data, method="POST")
    
    if not create_data:
        logger.warning(f"Failed to create branch: {new_branch}")
        return f"Failed to create branch: {new_branch}"
    
    # Check for error responses
    if isinstance(create_data, dict) and "error" in create_data:
        error_message = create_data.get("message", "Unknown error")
        logger.warning(f"Error creating branch: {error_message}")
        return f"Error creating branch: {error_message}"
    
    logger.info(f"Successfully created branch '{new_branch}' in repository '{repo}'")
    return f"Branch '{new_branch}' created successfully from base branch '{base_branch}'"


async def get_git_commits(
    owner: str, 
    repo: str, 
    branch: str,
    access_token: Optional[str] = None,
    hours_back: int = 35
) -> list | str:
    """Get the latest git commits from a repository from an organization of particular branch.
    
    Args:
        owner: Repository owner/organization name
        repo: Repository name
        branch: Branch name to get commits from
        access_token: Optional GitHub access token. If not provided, uses global github_token
        hours_back: Number of hours to look back for commits (default: 35)
    
    Returns:
        List of recent commits or error message string
    """
    logger.info(f"Fetching commits for {owner}/{repo} on branch {branch}")
    
    # Validate input parameters
    if not owner:
        return "Error: Owner is required"
    if not repo:
        return "Error: Repository name is required"
    if not branch:
        return "Error: Branch name is required"
    
    params = {"sha": branch}
    endpoint = f"repos/{owner}/{repo}/commits"
    
    # Use diff accept header similar to the reference code
    data = await make_github_request(
        endpoint, 
        access_token, 
        params=params, 
        accept_header="application/vnd.github.v3+json"
    )
    
    if not data:
        return f"Failed to fetch commits for {owner}/{repo}#{branch}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        logger.warning(f"GitHub API error: {error_message}")
        return f"Error: {error_message}"
    
    if not isinstance(data, list):
        return f"Unexpected response format from GitHub API"
    
    # Filter commits from last specified hours (similar to reference code)
    now = datetime.utcnow()
    time_threshold = now - timedelta(hours=hours_back)
    
    latest_commits = []
    for commit in data:
        commit_date_str = commit.get('commit', {}).get('author', {}).get('date')
        if commit_date_str:
            try:
                commit_date = datetime.strptime(commit_date_str, "%Y-%m-%dT%H:%M:%SZ")
                if commit_date > time_threshold:
                    latest_commits.append(commit)
            except ValueError as e:
                logger.warning(f"Could not parse commit date: {commit_date_str} - {e}")
                continue
    
    logger.info(f"Found {len(latest_commits)} commits in the last {hours_back} hours")
    return latest_commits


async def get_user_info(github_token: str) -> str:
    """Get user information from GitHub.

    Args:
        github_token: GitHub token for authentication
        username: GitHub username to get information for

    Returns:
        Formatted string containing user information or error message
    """
    logger.info(f"Getting user information")

    endpoint = f"user"
    
    data = await make_github_request(endpoint, github_token)
    if not data:
        logger.warning("Failed to fetch user info from GitHub API")
        return "Failed to fetch user info from GitHub API"
    
    # Handle error response (GitHub API returns dict for both success and error)
    if isinstance(data, dict) and data.get("message"):
        error = data.get("message", "unknown error")
        logger.warning(f"Failed to get user info: {error}")
        return f"Failed to get user info: {error}"
    
    if not data:
        logger.info("No user data found")
        return f"No user data found"

    # Format the user information
    user_info = f"""
    Username: {data.get('login', 'unknown')}
    Name: {data.get('name', 'Not provided')}
    Bio: {data.get('bio', 'Not provided')}
    Company: {data.get('company', 'Not provided')}
    Location: {data.get('location', 'Not provided')}
    Email: {data.get('email', 'Not provided')}
    Blog/Website: {data.get('blog', 'Not provided')}
    Twitter: {data.get('twitter_username', 'Not provided')}
    Public Repos: {data.get('public_repos', 0)}
    Followers: {data.get('followers', 0)}
    Following: {data.get('following', 0)}
    Created: {data.get('created_at', 'unknown')}
    Updated: {data.get('updated_at', 'unknown')}
    Profile URL: {data.get('html_url', 'No URL')}
    Avatar URL: {data.get('avatar_url', 'No avatar')}
    """

    logger.info(f"Successfully retrieved user information")
    return user_info.strip()



async def get_github_repository_info(
    repo: str,
    access_token: Optional[str] = None
) -> str:
    """Get detailed information about a specific GitHub repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        access_token: Optional GitHub access token. If not provided, uses global github_token
        
    Returns:
        Formatted string containing repository information
    """
    logger.info(f"Fetching repository info for: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    endpoint = f"repos/{repo}"
    data = await make_github_request(endpoint, access_token)
    
    if not data:
        return f"Failed to fetch repository information for: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    repo_info = f"""
    Name: {data.get('name', 'unknown')}
    Full Name: {data.get('full_name', 'unknown')}
    Description: {data.get('description', 'No description')}
    Language: {data.get('language', 'Not specified')}
    Stars: {data.get('stargazers_count', 0)}
    Forks: {data.get('forks_count', 0)}
    Watchers: {data.get('watchers_count', 0)}
    Open Issues: {data.get('open_issues_count', 0)}
    Default Branch: {data.get('default_branch', 'unknown')}
    Private: {data.get('private', False)}
    Fork: {data.get('fork', False)}
    URL: {data.get('html_url', 'unknown')}
    Clone URL: {data.get('clone_url', 'unknown')}
    Created: {data.get('created_at', 'unknown')}
    Updated: {data.get('updated_at', 'unknown')}
    Size: {data.get('size', 0)} KB
    License: {data.get('license', {}).get('name', 'No license') if data.get('license') else 'No license'}
    """
    
    return f"Repository information for '{repo}':\n{repo_info}"


async def get_repository_branches(
    repo: str,
    access_token: Optional[str] = None,
    page: int = 1,
    per_page: int = 30
) -> str:
    """Get all branches for a specific repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        access_token: Optional GitHub access token. If not provided, uses global github_token
        page: Page number for pagination
        per_page: Number of branches per page (max 100)
        
    Returns:
        Formatted string containing branch information
    """
    logger.info(f"Fetching branches for repository: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    # Validate per_page limit
    per_page = min(per_page, 100)
    
    params = {
        "page": page,
        "per_page": per_page
    }
    
    endpoint = f"repos/{repo}/branches"
    data = await make_github_request(endpoint, access_token, params=params)
    
    if not data:
        return f"Failed to fetch branches for repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    if not isinstance(data, list) or not data:
        return f"No branches found for repository: {repo}"
    
    formatted_branches = []
    for branch in data:
        branch_info = f"""
        Name: {branch.get('name', 'unknown')}
        Protected: {branch.get('protected', False)}
        Commit SHA: {branch.get('commit', {}).get('sha', 'unknown')}
        Commit URL: {branch.get('commit', {}).get('url', 'unknown')}
        """
        formatted_branches.append(branch_info)
    
    logger.info(f"Successfully fetched {len(data)} branches for repository: {repo}")
    return f"Found {len(data)} branches for repository '{repo}':\n\n" + "\n---\n".join(formatted_branches)


async def get_repository_issues(
    repo: str,
    access_token: Optional[str] = None,
    state: str = "open",
    page: int = 1,
    per_page: int = 30
) -> str:
    """Get issues for a specific repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        access_token: Optional GitHub access token. If not provided, uses global github_token
        state: Issue state (open, closed, all)
        page: Page number for pagination
        per_page: Number of issues per page (max 100)
        
    Returns:
        Formatted string containing issue information
    """
    logger.info(f"Fetching {state} issues for repository: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    # Validate per_page limit
    per_page = min(per_page, 100)
    
    params = {
        "state": state,
        "page": page,
        "per_page": per_page
    }
    
    endpoint = f"repos/{repo}/issues"
    data = await make_github_request(endpoint, access_token, params=params)
    
    if not data:
        return f"Failed to fetch issues for repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    if not isinstance(data, list) or not data:
        return f"No {state} issues found for repository: {repo}"
    
    formatted_issues = []
    for issue in data:
        issue_info = f"""
        Number: #{issue.get('number', 'unknown')}
        Title: {issue.get('title', 'No title')}
        State: {issue.get('state', 'unknown')}
        Author: {issue.get('user', {}).get('login', 'unknown')}
        Labels: {', '.join([label.get('name', '') for label in issue.get('labels', [])])}
        Created: {issue.get('created_at', 'unknown')}
        Updated: {issue.get('updated_at', 'unknown')}
        URL: {issue.get('html_url', 'unknown')}
        """
        formatted_issues.append(issue_info)
    
    logger.info(f"Successfully fetched {len(data)} {state} issues for repository: {repo}")
    return f"Found {len(data)} {state} issues for repository '{repo}':\n\n" + "\n---\n".join(formatted_issues)


async def create_pull_request(
    repo: str,
    target_branch: str,
    base_branch: str = "main",
    title: str = "Update branch",
    body: str = "Merging changes from base branch.",
    access_token: Optional[str] = None
) -> str:
    """Creates a pull request in a specified GitHub repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        target_branch: The name of the branch to update (head branch)
        base_branch: The base branch from which to merge changes (default is 'main')
        title: The title of the pull request
        body: The body of the pull request
        access_token: Optional GitHub access token. If not provided, uses global github_token
        
    Returns:
        Formatted string containing pull request information or error message
    """
    logger.info(f"Creating pull request to update branch '{target_branch}' from base branch '{base_branch}' in repo: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    # Prepare the payload for the pull request
    payload = {
        "title": title,
        "head": target_branch,
        "base": base_branch,
        "body": body
    }
    
    endpoint = f"repos/{repo}/pulls"
    data = await make_github_request(endpoint, access_token, method="POST", json_data=payload)
    
    if not data:
        return f"Failed to create pull request in repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    # Format the response
    pr_info = f"""
    Pull Request Created Successfully:
    Title: {data.get('title', title)}
    Number: #{data.get('number', 'unknown')}
    State: {data.get('state', 'unknown')}
    URL: {data.get('html_url', 'unknown')}
    Created: {data.get('created_at', 'unknown')}
    """
    
    logger.info(f"Successfully created pull request in repository: {repo}")
    return pr_info


async def get_pull_request_details(
    repo: str,
    pull_number: int,
    access_token: Optional[str] = None
) -> str:
    """Fetch detailed information about a specific pull request from a GitHub repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        pull_number: The number of the pull request to retrieve details for
        access_token: Optional GitHub access token. If not provided, uses global github_token
        
    Returns:
        Formatted string containing pull request details or error message
    """
    logger.info(f"Fetching details for pull request #{pull_number} in repo: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    endpoint = f"repos/{repo}/pulls/{pull_number}"
    data = await make_github_request(endpoint, access_token)
    
    if not data:
        return f"Failed to fetch details for pull request #{pull_number} in repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    # Format the response
    pr_details = f"""
    Pull Request #{pull_number} Details:
    Title: {data.get('title', 'No title')}
    State: {data.get('state', 'unknown')}
    Author: {data.get('user', {}).get('login', 'unknown')}
    Created: {data.get('created_at', 'unknown')}
    Updated: {data.get('updated_at', 'unknown')}
    Merged: {data.get('merged_at', 'Not merged')}
    Mergeable: {data.get('mergeable', 'unknown')}
    Mergeable State: {data.get('mergeable_state', 'unknown')}
    Comments: {data.get('comments', 0)}
    Commits: {data.get('commits', 0)}
    Additions: {data.get('additions', 0)}
    Deletions: {data.get('deletions', 0)}
    Changed Files: {data.get('changed_files', 0)}
    Base Branch: {data.get('base', {}).get('ref', 'unknown')}
    Head Branch: {data.get('head', {}).get('ref', 'unknown')}
    URL: {data.get('html_url', 'unknown')}
    Body: {data.get('body', 'No description provided.')}
    """
    
    logger.info(f"Successfully fetched details for pull request #{pull_number} in repository: {repo}")
    return pr_details


async def get_pull_requests(
    repo: str,
    access_token: Optional[str] = None,
    state: str = "open",
    sort: Optional[str] = None,
    direction: Optional[str] = None,
    page: int = 1,
    per_page: int = 30
) -> str:
    """Fetch pull requests from a specified GitHub repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        access_token: Optional GitHub access token. If not provided, uses global github_token
        state: State of the pull requests (open, closed, all)
        sort: Sorting criteria (created, updated, popularity, long-running)
        direction: Order of results (asc, desc)
        page: Page number for pagination
        per_page: Number of pull requests per page (max 100)
        
    Returns:
        Formatted string containing pull request information or error message
    """
    logger.info(f"Fetching {state} pull requests for repository: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    # Validate per_page limit
    per_page = min(per_page, 100)
    
    # Prepare query parameters
    params = {
        "state": state,
        "page": page,
        "per_page": per_page
    }
    
    if sort:
        params["sort"] = sort
    if direction:
        params["direction"] = direction
    
    endpoint = f"repos/{repo}/pulls"
    data = await make_github_request(endpoint, access_token, params=params)
    
    if not data:
        return f"Failed to fetch pull requests for repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    if not isinstance(data, list) or not data:
        return f"No {state} pull requests found for repository: {repo}"
    
    formatted_prs = []
    for pr in data:
        pr_info = f"""
        Number: #{pr.get('number', 'unknown')}
        Title: {pr.get('title', 'No title')}
        State: {pr.get('state', 'unknown')}
        Author: {pr.get('user', {}).get('login', 'unknown')}
        Created: {pr.get('created_at', 'unknown')}
        Updated: {pr.get('updated_at', 'unknown')}
        Base Branch: {pr.get('base', {}).get('ref', 'unknown')}
        Head Branch: {pr.get('head', {}).get('ref', 'unknown')}
        URL: {pr.get('html_url', 'unknown')}
        """
        formatted_prs.append(pr_info)
    
    logger.info(f"Successfully fetched {len(data)} {state} pull requests for repository: {repo}")
    return f"Found {len(data)} {state} pull requests for repository '{repo}':\n\n" + "\n---\n".join(formatted_prs)


async def get_tags_or_branches(
    repo: str,
    resource_type: str,
    access_token: Optional[str] = None,
    page: int = 1,
    per_page: int = 30
) -> str:
    """List either tags or branches in a GitHub repository.
    
    Args:
        repo: Repository in format 'owner/repo'
        resource_type: Specify 'tags' to list tags or 'branches' to list branches
        access_token: Optional GitHub access token. If not provided, uses global github_token
        page: Page number for pagination
        per_page: Number of items per page (max 100)
        
    Returns:
        Formatted string containing the list of tags or branches or error message
    """
    logger.info(f"Fetching {resource_type} for repository: {repo}")
    
    if not repo or '/' not in repo:
        return "Error: Repository must be in format 'owner/repo'"
    
    if resource_type not in ["tags", "branches"]:
        return "Error: resource_type must be either 'tags' or 'branches'"
    
    # Validate per_page limit
    per_page = min(per_page, 100)
    
    # Prepare query parameters
    params = {
        "page": page,
        "per_page": per_page
    }
    
    # Prepare the URL based on the resource_type
    if resource_type == "tags":
        endpoint = f"repos/{repo}/git/refs/tags"
    else:  # resource_type == "branches"
        endpoint = f"repos/{repo}/branches"
    
    data = await make_github_request(endpoint, access_token, params=params)
    
    if not data:
        return f"Failed to fetch {resource_type} for repository: {repo}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    if not isinstance(data, list) or not data:
        return f"No {resource_type} found for repository: {repo}"
    
    formatted_items = []
    if resource_type == "tags":
        for item in data:
            item_info = f"""
            Tag: {item.get('ref', '').replace('refs/tags/', '')}
            Commit SHA: {item.get('object', {}).get('sha', 'unknown')}
            URL: {item.get('object', {}).get('url', 'unknown')}
            """
            formatted_items.append(item_info)
    else:  # resource_type == "branches"
        for item in data:
            item_info = f"""
            Name: {item.get('name', 'unknown')}
            Protected: {item.get('protected', False)}
            Commit SHA: {item.get('commit', {}).get('sha', 'unknown')}
            Commit URL: {item.get('commit', {}).get('url', 'unknown')}
            """
            formatted_items.append(item_info)
    
    logger.info(f"Successfully fetched {len(data)} {resource_type} for repository: {repo}")
    return f"Found {len(data)} {resource_type} for repository '{repo}':\n\n" + "\n---\n".join(formatted_items)


async def global_search(
    search_type: str,
    query: str,
    access_token: Optional[str] = None,
    page: int = 1,
    per_page: int = 30
) -> str:
    """Perform a global search on GitHub based on the specified search type and query string.
    
    Args:
        search_type: The type of search to perform (repositories, issues, pulls, code, commits, users)
        query: The string to search for
        access_token: Optional GitHub access token. If not provided, uses global github_token
        page: Page number for pagination
        per_page: Number of results per page (max 100)
        
    Returns:
        Formatted string containing search results or error message
    """
    logger.info(f"Searching GitHub for {search_type} matching query: {query}")
    
    valid_search_types = ["repositories", "issues", "pulls", "code", "commits", "users"]
    if search_type not in valid_search_types:
        return f"Error: Invalid search type. Please use one of: {', '.join(valid_search_types)}"
    
    # Validate per_page limit
    per_page = min(per_page, 100)
    
    # Prepare query parameters
    params = {
        "q": query,
        "page": page,
        "per_page": per_page
    }
    
    endpoint = f"search/{search_type}"
    data = await make_github_request(endpoint, access_token, params=params)
    
    if not data:
        return f"Failed to search for {search_type} matching query: {query}"
    
    # Check for error responses
    if isinstance(data, dict) and "error" in data:
        error_message = data.get("message", "Unknown error")
        return f"GitHub API error: {error_message}"
    
    # Check if we have valid search results
    if not isinstance(data, dict) or "items" not in data:
        return f"No search results found for {search_type} matching query: {query}"
    
    total_count = data.get("total_count", 0)
    items = data.get("items", [])
    
    if not items:
        return f"No {search_type} found matching query: {query}"
    
    formatted_results = []
    
    # Format results based on search type
    if search_type == "repositories":
        for item in items:
            result = f"""
            Name: {item.get('name', 'unknown')}
            Full Name: {item.get('full_name', 'unknown')}
            Description: {item.get('description', 'No description')}
            Stars: {item.get('stargazers_count', 0)}
            Forks: {item.get('forks_count', 0)}
            Language: {item.get('language', 'Not specified')}
            URL: {item.get('html_url', 'unknown')}
            """
            formatted_results.append(result)
    elif search_type in ["issues", "pulls"]:
        for item in items:
            result = f"""
            Title: {item.get('title', 'No title')}
            Number: #{item.get('number', 'unknown')}
            State: {item.get('state', 'unknown')}
            Author: {item.get('user', {}).get('login', 'unknown')}
            Repository: {item.get('repository_url', '').split('/')[-2] + '/' + item.get('repository_url', '').split('/')[-1] if item.get('repository_url') else 'unknown'}
            Created: {item.get('created_at', 'unknown')}
            Updated: {item.get('updated_at', 'unknown')}
            URL: {item.get('html_url', 'unknown')}
            """
            formatted_results.append(result)
    elif search_type == "code":
        for item in items:
            result = f"""
            Repository: {item.get('repository', {}).get('full_name', 'unknown')}
            Path: {item.get('path', 'unknown')}
            Name: {item.get('name', 'unknown')}
            URL: {item.get('html_url', 'unknown')}
            """
            formatted_results.append(result)
    elif search_type == "commits":
        for item in items:
            result = f"""
            Repository: {item.get('repository', {}).get('full_name', 'unknown')}
            SHA: {item.get('sha', 'unknown')}
            Author: {item.get('author', {}).get('login', 'unknown')}
            Message: {item.get('commit', {}).get('message', 'No message')}
            URL: {item.get('html_url', 'unknown')}
            """
            formatted_results.append(result)
    elif search_type == "users":
        for item in items:
            result = f"""
            Login: {item.get('login', 'unknown')}
            Type: {item.get('type', 'unknown')}
            URL: {item.get('html_url', 'unknown')}
            """
            formatted_results.append(result)
    
    logger.info(f"Successfully found {len(items)} results (total: {total_count}) for {search_type} matching query: {query}")
    return f"Found {len(items)} results (total: {total_count}) for {search_type} matching query: '{query}':\n\n" + "\n---\n".join(formatted_results)

