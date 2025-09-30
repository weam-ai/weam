/**
 * GitHub MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const GITHUB_API_BASE = process.env.GITHUB_API_BASE || 'https://api.github.com';

/**
 * Make a request to the GitHub API
 * @param {string} endpoint - The API endpoint
 * @param {string} githubToken - GitHub access token
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST requests
 * @param {string} method - HTTP method (GET, POST)
 * @returns {Object|null} API response data
 */
async function makeGithubRequest(endpoint, githubToken, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
    };

    try {
        let response;
        const url = `${GITHUB_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params, timeout: 30000 });
        } else {
            response = await axios.post(url, jsonData, { headers, params, timeout: 30000 });
        }

        return response.data;
    } catch (error) {
        console.error('GitHub API Error:', error.message);
        return null;
    }
}

/**
 * Get GitHub access token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} GitHub access token or null if not found
 */
async function getGithubAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.GITHUB || !user.mcpdata.GITHUB.access_token) {
            return null;
        }
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(user.mcpdata.GITHUB.access_token);

        return decryptedToken;
    } catch (error) {
        console.error('Error fetching GitHub access token:', error.message);
        return null;
    }
}

/**
 * Get repositories for a specific GitHub user
 * @param {string} userId - User ID to get access token from
 * @param {string} username - GitHub username to fetch repositories for
 * @param {string} sort - Sorting method (created, updated, pushed, full_name)
 * @returns {string} Formatted repository list
 */
async function getGithubRepositories(userId = null, username, sort = 'full_name') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!username) {
        return 'Error: Username is required';
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const params = {
        sort: sort
    };

    const endpoint = `users/${username}/repos`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch repositories for user: ${username}`;
    }

    // Check for error responses
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }

    if (!Array.isArray(data) || data.length === 0) {
        return `No repositories found for user: ${username}`;
    }

    let result = `Found ${data.length} repositories for user '${username}':\n\n`;
    
    for (const repo of data) {
        result += `Name: ${repo.name || 'unknown'}\n`;
        result += `Full Name: ${repo.full_name || 'unknown'}\n`;
        result += `Description: ${repo.description || 'No description'}\n`;
        result += `Language: ${repo.language || 'Not specified'}\n`;
        result += `Stars: ${repo.stargazers_count || 0}\n`;
        result += `Forks: ${repo.forks_count || 0}\n`;
        result += `Private: ${repo.private || false}\n`;
        result += `URL: ${repo.html_url || 'unknown'}\n`;
        result += `Created: ${repo.created_at || 'unknown'}\n`;
        result += `Updated: ${repo.updated_at || 'unknown'}\n`;
        result += '---\n';
    }

    return result;
}

/**
 * Create a new branch in a specified GitHub repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} newBranch - Name of the new branch to create
 * @param {string} baseBranch - Base branch from which to create the new branch
 * @returns {string} Success or error message
 */
async function createGithubBranch(userId = null, repo, newBranch, baseBranch = 'main') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo) {
        return 'Error: Repository name is required';
    }
    
    if (!newBranch) {
        return 'Error: New branch name is required';
    }
    
    if (!repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Get the SHA of the base branch
    const baseBranchEndpoint = `repos/${repo}/git/refs/heads/${baseBranch}`;
    const baseBranchData = await makeGithubRequest(baseBranchEndpoint, accessToken);
    
    if (!baseBranchData) {
        return `Failed to get base branch information: ${baseBranch}`;
    }
    
    if (baseBranchData.error || baseBranchData.message) {
        return `Error getting base branch: ${baseBranchData.message || 'Unknown error'}`;
    }
    
    const baseBranchSha = baseBranchData.object?.sha;
    if (!baseBranchSha) {
        return `Could not retrieve SHA for base branch: ${baseBranch}. Make sure the branch exists.`;
    }
    
    // Create the new branch
    const createBranchEndpoint = `repos/${repo}/git/refs`;
    const jsonData = {
        ref: `refs/heads/${newBranch}`,
        sha: baseBranchSha
    };
    
    const createData = await makeGithubRequest(createBranchEndpoint, accessToken, null, jsonData, 'POST');
    
    if (!createData) {
        return `Failed to create branch: ${newBranch}`;
    }
    
    if (createData.error || createData.message) {
        return `Error creating branch: ${createData.message || 'Unknown error'}`;
    }
    
    return `Branch '${newBranch}' created successfully from base branch '${baseBranch}'`;
}

/**
 * Get the latest git commits from a repository branch
 * @param {string} userId - User ID to get access token from
 * @param {string} owner - Repository owner/organization name
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name to get commits from
 * @param {number} hoursBack - Number of hours to look back for commits
 * @returns {Array|string} List of recent commits or error message
 */
async function getGitCommits(userId = null, owner, repo, branch, hoursBack = 35) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!owner) {
        return 'Error: Owner is required';
    }
    
    if (!repo) {
        return 'Error: Repository name is required';
    }
    
    if (!branch) {
        return 'Error: Branch name is required';
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const params = { sha: branch };
    const endpoint = `repos/${owner}/${repo}/commits`;
    
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch commits for ${owner}/${repo}#${branch}`;
    }
    
    if (data.error || data.message) {
        return `Error: ${data.message || 'Unknown error'}`;
    }
    
    if (!Array.isArray(data)) {
        return 'Unexpected response format from GitHub API';
    }
    
    // Filter commits from last specified hours
    const now = new Date();
    const timeThreshold = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
    const latestCommits = [];
    for (const commit of data) {
        const commitDateStr = commit.commit?.author?.date;
        if (commitDateStr) {
            try {
                const commitDate = new Date(commitDateStr);
                if (commitDate > timeThreshold) {
                    latestCommits.push(commit);
                }
            } catch (error) {
                console.warn(`Could not parse commit date: ${commitDateStr} - ${error.message}`);
                continue;
            }
        }
    }
    
    return latestCommits;
}

/**
 * Get user information from GitHub
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information
 */
async function getUserInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const endpoint = 'user';
    const data = await makeGithubRequest(endpoint, accessToken);
    
    if (!data) {
        return 'Failed to fetch user info from GitHub API';
    }
    
    if (data.message) {
        return `Failed to get user info: ${data.message}`;
    }
    
    if (!data) {
        return 'No user data found';
    }

    let result = `Username: ${data.login || 'unknown'}\n`;
    result += `Name: ${data.name || 'Not provided'}\n`;
    result += `Bio: ${data.bio || 'Not provided'}\n`;
    result += `Company: ${data.company || 'Not provided'}\n`;
    result += `Location: ${data.location || 'Not provided'}\n`;
    result += `Email: ${data.email || 'Not provided'}\n`;
    result += `Blog/Website: ${data.blog || 'Not provided'}\n`;
    result += `Twitter: ${data.twitter_username || 'Not provided'}\n`;
    result += `Public Repos: ${data.public_repos || 0}\n`;
    result += `Followers: ${data.followers || 0}\n`;
    result += `Following: ${data.following || 0}\n`;
    result += `Created: ${data.created_at || 'unknown'}\n`;
    result += `Updated: ${data.updated_at || 'unknown'}\n`;
    result += `Profile URL: ${data.html_url || 'No URL'}\n`;
    result += `Avatar URL: ${data.avatar_url || 'No avatar'}`;

    return result;
}

/**
 * Get detailed information about a specific GitHub repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @returns {string} Formatted repository information
 */
async function getGithubRepositoryInfo(userId = null, repo) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const endpoint = `repos/${repo}`;
    const data = await makeGithubRequest(endpoint, accessToken);
    
    if (!data) {
        return `Failed to fetch repository information for: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }

    let result = `Repository information for '${repo}':\n`;
    result += `Name: ${data.name || 'unknown'}\n`;
    result += `Full Name: ${data.full_name || 'unknown'}\n`;
    result += `Description: ${data.description || 'No description'}\n`;
    result += `Language: ${data.language || 'Not specified'}\n`;
    result += `Stars: ${data.stargazers_count || 0}\n`;
    result += `Forks: ${data.forks_count || 0}\n`;
    result += `Watchers: ${data.watchers_count || 0}\n`;
    result += `Open Issues: ${data.open_issues_count || 0}\n`;
    result += `Default Branch: ${data.default_branch || 'unknown'}\n`;
    result += `Private: ${data.private || false}\n`;
    result += `Fork: ${data.fork || false}\n`;
    result += `URL: ${data.html_url || 'unknown'}\n`;
    result += `Clone URL: ${data.clone_url || 'unknown'}\n`;
    result += `Created: ${data.created_at || 'unknown'}\n`;
    result += `Updated: ${data.updated_at || 'unknown'}\n`;
    result += `Size: ${data.size || 0} KB\n`;
    result += `License: ${data.license?.name || 'No license'}`;

    return result;
}

/**
 * Get all branches for a specific repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {number} page - Page number for pagination
 * @param {number} perPage - Number of branches per page
 * @returns {string} Formatted branch information
 */
async function getRepositoryBranches(userId = null, repo, page = 1, perPage = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Validate per_page limit
    perPage = Math.min(perPage, 100);
    
    const params = {
        page: page,
        per_page: perPage
    };

    const endpoint = `repos/${repo}/branches`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch branches for repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        return `No branches found for repository: ${repo}`;
    }

    let result = `Found ${data.length} branches for repository '${repo}':\n\n`;
    
    for (const branch of data) {
        result += `Name: ${branch.name || 'unknown'}\n`;
        result += `Protected: ${branch.protected || false}\n`;
        result += `Commit SHA: ${branch.commit?.sha || 'unknown'}\n`;
        result += `Commit URL: ${branch.commit?.url || 'unknown'}\n`;
        result += '---\n';
    }

    return result;
}

/**
 * Get issues for a specific repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} state - Issue state (open, closed, all)
 * @param {number} page - Page number for pagination
 * @param {number} perPage - Number of issues per page
 * @returns {string} Formatted issue information
 */
async function getRepositoryIssues(userId = null, repo, state = 'open', page = 1, perPage = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Validate per_page limit
    perPage = Math.min(perPage, 100);
    
    const params = {
        state: state,
        page: page,
        per_page: perPage
    };

    const endpoint = `repos/${repo}/issues`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch issues for repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        return `No ${state} issues found for repository: ${repo}`;
    }

    let result = `Found ${data.length} ${state} issues for repository '${repo}':\n\n`;
    
    for (const issue of data) {
        result += `Number: #${issue.number || 'unknown'}\n`;
        result += `Title: ${issue.title || 'No title'}\n`;
        result += `State: ${issue.state || 'unknown'}\n`;
        result += `Author: ${issue.user?.login || 'unknown'}\n`;
        result += `Labels: ${issue.labels?.map(label => label.name).join(', ') || 'None'}\n`;
        result += `Created: ${issue.created_at || 'unknown'}\n`;
        result += `Updated: ${issue.updated_at || 'unknown'}\n`;
        result += `URL: ${issue.html_url || 'unknown'}\n`;
        result += '---\n';
    }

    return result;
}

/**
 * Create a pull request in a specified GitHub repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} targetBranch - The name of the branch to update (head branch)
 * @param {string} baseBranch - The base branch from which to merge changes
 * @param {string} title - The title of the pull request
 * @param {string} body - The body of the pull request
 * @returns {string} Formatted pull request information or error message
 */
async function createPullRequest(userId = null, repo, targetBranch, baseBranch = 'main', title = 'Update branch', body = 'Merging changes from base branch.') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const payload = {
        title: title,
        head: targetBranch,
        base: baseBranch,
        body: body
    };

    const endpoint = `repos/${repo}/pulls`;
    const data = await makeGithubRequest(endpoint, accessToken, null, payload, 'POST');
    
    if (!data) {
        return `Failed to create pull request in repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }

    let result = 'Pull Request Created Successfully:\n';
    result += `Title: ${data.title || title}\n`;
    result += `Number: #${data.number || 'unknown'}\n`;
    result += `State: ${data.state || 'unknown'}\n`;
    result += `URL: ${data.html_url || 'unknown'}\n`;
    result += `Created: ${data.created_at || 'unknown'}`;

    return result;
}

/**
 * Get detailed information about a specific pull request
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {number} pullNumber - The number of the pull request
 * @returns {string} Formatted pull request details or error message
 */
async function getPullRequestDetails(userId = null, repo, pullNumber) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }
    
    if (!pullNumber) {
        return 'Error: Pull request number is required';
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    const endpoint = `repos/${repo}/pulls/${pullNumber}`;
    const data = await makeGithubRequest(endpoint, accessToken);
    
    if (!data) {
        return `Failed to fetch pull request details for #${pullNumber} in repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }

    let result = `Pull Request #${pullNumber} Details:\n`;
    result += `Title: ${data.title || 'No title'}\n`;
    result += `State: ${data.state || 'unknown'}\n`;
    result += `Author: ${data.user?.login || 'unknown'}\n`;
    result += `Head Branch: ${data.head?.ref || 'unknown'}\n`;
    result += `Base Branch: ${data.base?.ref || 'unknown'}\n`;
    result += `Mergeable: ${data.mergeable || 'unknown'}\n`;
    result += `Merged: ${data.merged || false}\n`;
    result += `Draft: ${data.draft || false}\n`;
    result += `Additions: ${data.additions || 0}\n`;
    result += `Deletions: ${data.deletions || 0}\n`;
    result += `Changed Files: ${data.changed_files || 0}\n`;
    result += `Comments: ${data.comments || 0}\n`;
    result += `Review Comments: ${data.review_comments || 0}\n`;
    result += `Commits: ${data.commits || 0}\n`;
    result += `Created: ${data.created_at || 'unknown'}\n`;
    result += `Updated: ${data.updated_at || 'unknown'}\n`;
    result += `URL: ${data.html_url || 'unknown'}\n`;
    result += `Body: ${data.body || 'No description'}`;

    return result;
}

/**
 * Get pull requests for a specific repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} state - Pull request state (open, closed, all)
 * @param {string} sort - Sorting method (created, updated, popularity, long-running)
 * @param {string} direction - Sorting direction (asc, desc)
 * @param {number} page - Page number for pagination
 * @param {number} perPage - Number of pull requests per page
 * @returns {string} Formatted pull request list
 */
async function getPullRequests(userId = null, repo, state = 'open', sort = null, direction = null, page = 1, perPage = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Validate per_page limit
    perPage = Math.min(perPage, 100);
    
    const params = {
        state: state,
        page: page,
        per_page: perPage
    };
    
    if (sort) params.sort = sort;
    if (direction) params.direction = direction;

    const endpoint = `repos/${repo}/pulls`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch pull requests for repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        return `No ${state} pull requests found for repository: ${repo}`;
    }

    let result = `Found ${data.length} ${state} pull requests for repository '${repo}':\n\n`;
    
    for (const pr of data) {
        result += `Number: #${pr.number || 'unknown'}\n`;
        result += `Title: ${pr.title || 'No title'}\n`;
        result += `State: ${pr.state || 'unknown'}\n`;
        result += `Author: ${pr.user?.login || 'unknown'}\n`;
        result += `Head Branch: ${pr.head?.ref || 'unknown'}\n`;
        result += `Base Branch: ${pr.base?.ref || 'unknown'}\n`;
        result += `Draft: ${pr.draft || false}\n`;
        result += `Created: ${pr.created_at || 'unknown'}\n`;
        result += `Updated: ${pr.updated_at || 'unknown'}\n`;
        result += `URL: ${pr.html_url || 'unknown'}\n`;
        result += '---\n';
    }

    return result;
}

/**
 * Get tags or branches for a specific repository
 * @param {string} userId - User ID to get access token from
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} resourceType - Type of resource (tags or branches)
 * @param {number} page - Page number for pagination
 * @param {number} perPage - Number of items per page
 * @returns {string} Formatted resource list
 */
async function getTagsOrBranches(userId = null, repo, resourceType, page = 1, perPage = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!repo || !repo.includes('/')) {
        return "Error: Repository must be in format 'owner/repo'";
    }
    
    if (!resourceType || !['tags', 'branches'].includes(resourceType)) {
        return "Error: Resource type must be 'tags' or 'branches'";
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Validate per_page limit
    perPage = Math.min(perPage, 100);
    
    const params = {
        page: page,
        per_page: perPage
    };

    const endpoint = `repos/${repo}/${resourceType}`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to fetch ${resourceType} for repository: ${repo}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        return `No ${resourceType} found for repository: ${repo}`;
    }

    let result = `Found ${data.length} ${resourceType} for repository '${repo}':\n\n`;
    
    for (const item of data) {
        if (resourceType === 'tags') {
            result += `Name: ${item.name || 'unknown'}\n`;
            result += `Commit SHA: ${item.commit?.sha || 'unknown'}\n`;
            result += `Commit URL: ${item.commit?.url || 'unknown'}\n`;
            result += `Zipball URL: ${item.zipball_url || 'unknown'}\n`;
            result += `Tarball URL: ${item.tarball_url || 'unknown'}\n`;
        } else {
            result += `Name: ${item.name || 'unknown'}\n`;
            result += `Protected: ${item.protected || false}\n`;
            result += `Commit SHA: ${item.commit?.sha || 'unknown'}\n`;
            result += `Commit URL: ${item.commit?.url || 'unknown'}\n`;
        }
        result += '---\n';
    }

    return result;
}

/**
 * Perform a global search on GitHub
 * @param {string} userId - User ID to get access token from
 * @param {string} searchType - Type of search (repositories, code, commits, issues, users)
 * @param {string} query - Search query
 * @param {number} page - Page number for pagination
 * @param {number} perPage - Number of results per page
 * @returns {string} Formatted search results
 */
async function globalSearch(userId = null, searchType, query, page = 1, perPage = 30) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!searchType || !['repositories', 'code', 'commits', 'issues', 'users'].includes(searchType)) {
        return "Error: Search type must be one of: repositories, code, commits, issues, users";
    }
    
    if (!query) {
        return 'Error: Search query is required';
    }

    const accessToken = await getGithubAccessToken(userId);
    if (!accessToken) {
        return 'Error: GitHub access token not found. Please configure your GitHub integration in your profile settings.';
    }

    // Validate per_page limit
    perPage = Math.min(perPage, 100);
    
    const params = {
        q: query,
        page: page,
        per_page: perPage
    };

    const endpoint = `search/${searchType}`;
    const data = await makeGithubRequest(endpoint, accessToken, params);
    
    if (!data) {
        return `Failed to perform ${searchType} search for query: ${query}`;
    }
    
    if (data.error || data.message) {
        return `GitHub API error: ${data.message || 'Unknown error'}`;
    }
    
    const items = data.items || [];
    const totalCount = data.total_count || 0;
    
    if (items.length === 0) {
        return `No results found for ${searchType} matching query: '${query}'`;
    }

    let result = `Found ${items.length} results (total: ${totalCount}) for ${searchType} matching query: '${query}':\n\n`;
    
    for (const item of items) {
        if (searchType === 'repositories') {
            result += `Name: ${item.full_name || 'unknown'}\n`;
            result += `Description: ${item.description || 'No description'}\n`;
            result += `Language: ${item.language || 'Not specified'}\n`;
            result += `Stars: ${item.stargazers_count || 0}\n`;
            result += `Forks: ${item.forks_count || 0}\n`;
            result += `URL: ${item.html_url || 'unknown'}\n`;
        } else if (searchType === 'code') {
            result += `Name: ${item.name || 'unknown'}\n`;
            result += `Path: ${item.path || 'unknown'}\n`;
            result += `Repository: ${item.repository?.full_name || 'unknown'}\n`;
            result += `SHA: ${item.sha || 'unknown'}\n`;
            result += `URL: ${item.html_url || 'unknown'}\n`;
        } else if (searchType === 'issues') {
            result += `Title: ${item.title || 'No title'}\n`;
            result += `Number: #${item.number || 'unknown'}\n`;
            result += `State: ${item.state || 'unknown'}\n`;
            result += `Repository: ${item.repository_url?.split('/').slice(-2).join('/') || 'unknown'}\n`;
            result += `Author: ${item.user?.login || 'unknown'}\n`;
            result += `URL: ${item.html_url || 'unknown'}\n`;
        } else if (searchType === 'commits') {
            result += `Repository: ${item.repository?.full_name || 'unknown'}\n`;
            result += `SHA: ${item.sha || 'unknown'}\n`;
            result += `Author: ${item.author?.login || 'unknown'}\n`;
            result += `Message: ${item.commit?.message || 'No message'}\n`;
            result += `URL: ${item.html_url || 'unknown'}\n`;
        } else if (searchType === 'users') {
            result += `Login: ${item.login || 'unknown'}\n`;
            result += `Type: ${item.type || 'unknown'}\n`;
            result += `URL: ${item.html_url || 'unknown'}\n`;
        }
        result += '---\n';
    }

    return result;
}

module.exports = {
    getGithubRepositories,
    createGithubBranch,
    getGitCommits,
    getUserInfo,
    getGithubRepositoryInfo,
    getRepositoryBranches,
    getRepositoryIssues,
    createPullRequest,
    getPullRequestDetails,
    getPullRequests,
    getTagsOrBranches,
    globalSearch
};