
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');
const express = require('express');
const cors = require('cors');
const { LINK } = require('../config/config');
const mcpSessionManager = require('./mcpSessionManager');
const slackTools = require('../tools/slack');
const githubTools = require('../tools/github');
const mongodbTools = require('../tools/mongodb');
const zoomTools = require('../tools/zoom');
const gmailTools = require('../tools/gmail');
const driveTools = require('../tools/drive');
const calendarTools = require('../tools/calendar');

async function startMCPServer() {
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    // Create MCP server
    const server = new McpServer({
        name: "weam-mcp-server",
        version: "1.0.0"
    });

    // Register weather tool
    server.registerTool(
        "get_weather",
        {
            description: "Get current weather for a location",
            inputSchema: {
                location: z.string().describe("Location to get weather for")
            }
        },
        async ({ location }) => {
            // Simulate weather data
            const weatherData = {
                location,
                temperature: Math.floor(Math.random() * 30) + 10,
                condition: ["sunny", "cloudy", "rainy", "snowy"][Math.floor(Math.random() * 4)],
                humidity: Math.floor(Math.random() * 100)
            };
            
            return {
                content: [{
                    type: "text",
                    text: `Weather in ${location}: ${weatherData.temperature}°C, ${weatherData.condition}, humidity: ${weatherData.humidity}%`
                }]
            };
        }
    );

    // Register add tool
    server.registerTool(
        "add",
        {
            description: "Add two numbers together",
            inputSchema: {
                a: z.number().describe("First number"),
                b: z.number().describe("Second number")
            }
        },
        async ({ a, b }) => {
            const result = a + b;
            return {
                content: [{
                    type: "text",
                    text: `The sum of ${a} and ${b} is ${result}`
                }]
            };
        }
    );

    // Register web search tool
    server.registerTool(
        "web_search",
        {
            description: "Search the web for information",
            inputSchema: {
                query: z.string().describe("Search query")
            }
        },
        async ({ query }) => {
            // Simulate web search results
            const searchResults = {
                query,
                results: [
                    {
                        title: `Search result for: ${query}`,
                        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
                        snippet: `This is a simulated search result for the query: ${query}. In a real implementation, this would connect to an actual search API.`
                    }
                ]
            };
            
            return {
                content: [{
                    type: "text",
                    text: `Search results for "${query}":\n\nTitle: ${searchResults.results[0].title}\nURL: ${searchResults.results[0].url}\nSnippet: ${searchResults.results[0].snippet}`
                }]
            };
        }
    );

    // Register Slack tools
    server.registerTool(
        "list_slack_channels",
        {
            description: "List all channels in the Slack workspace.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                limit: z.number().optional().describe("Maximum number of channels to return (default: 100)")
            }
        },
        async ({ user_id = null, limit = 100 }) => {

            try {
                const result = await slackTools.listSlackChannels(user_id, limit);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing Slack channels: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "send_slack_message",
        {
            description: "Send a message to a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("Channel ID or name"),
                text: z.string().describe("Message text to send")
            }
        },
        async ({ user_id = null, channel_id, text }) => {
            try {
                const result = await slackTools.sendSlackMessage(user_id, channel_id, text);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error sending Slack message: ${error.message}`
                    }]
                };
            }
        }
    );



    server.registerTool(
        "get_channel_messages",
        {
            description: "Get recent messages from a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("Channel ID"),
                limit: z.number().optional().describe("Number of messages to retrieve (default: 50)")
            }
        },
        async ({ user_id = null, channel_id, limit = 50 }) => {
            try {

                const result = await slackTools.getChannelMessages(user_id, channel_id, limit);

                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting channel messages: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_workspace_users",
        {
            description: "List all users in the Slack workspace.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                limit: z.number().optional().describe("Maximum number of users to return (default: 200)")
            }
        },
        async ({ user_id = null, limit = 200 }) => {
            try {
                const result = await slackTools.listWorkspaceUsers(user_id, limit);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing workspace users: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_channel_id_by_name",
        {
            description: "Get channel ID by channel name.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_name: z.string().describe("Channel name (with or without #)")
            }
        },
        async ({ user_id = null, channel_name }) => {
            try {
                const result = await slackTools.getChannelIdByName(user_id, channel_name);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting channel ID: ${error.message}`
                    }]
                };
            }
        }
    );

    // Register additional Slack tools
    server.registerTool(
        "create_slack_channel",
        {
            description: "Create a new Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_name: z.string().describe("Name of the channel to create"),
                is_private: z.boolean().optional().describe("Whether to create a private channel (default: false)"),
                purpose: z.string().optional().describe("Purpose description for the channel"),
                initial_members: z.array(z.string()).optional().describe("Array of user IDs to invite to the channel after creation")
            }
        },
        async ({ user_id = null, channel_name, is_private = false, purpose = '', initial_members = [] }) => {
            try {
                const result = await slackTools.createSlackChannel(user_id, channel_name, is_private, purpose, initial_members);
                
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating Slack channel: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "set_channel_topic",
        {
            description: "Set or update the topic for a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                topic: z.string().describe("New topic for the channel")
            }
        },
        async ({ user_id = null, channel_id, topic }) => {
            try {
                const result = await slackTools.setChannelTopic(user_id, channel_id, topic);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error setting channel topic: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "set_channel_purpose",
        {
            description: "Set or update the purpose for a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                purpose: z.string().describe("New purpose for the channel")
            }
        },
        async ({ user_id = null, channel_id, purpose }) => {
            try {
                const result = await slackTools.setChannelPurpose(user_id, channel_id, purpose);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error setting channel purpose: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_channel_members",
        {
            description: "Get list of members in a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                limit: z.number().optional().describe("Maximum number of members to return (default: 200)")
            }
        },
        async ({ user_id = null, channel_id, limit = 200 }) => {
            try {
                const result = await slackTools.getChannelMembers(user_id, channel_id, limit);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting channel members: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_user_profile",
        {
            description: "Get user profile information including custom fields.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                target_user_id: z.string().describe("The ID of the user to get profile for")
            }
        },
        async ({ user_id = null, target_user_id }) => {
            try {
                const result = await slackTools.getUserProfile(user_id, target_user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting user profile: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_slack_user_info",
        {
            description: "Get detailed information about a specific user.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                target_user_id: z.string().describe("The ID of the user to get information about")
            }
        },
        async ({ user_id = null, target_user_id }) => {
            try {
                const result = await slackTools.getUserInfo(user_id, target_user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting user info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "open_direct_message",
        {
            description: "Open a direct message conversation with one or more users.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                users: z.array(z.string()).describe("Array of user IDs to open DM with")
            }
        },
        async ({ user_id = null, users }) => {
            try {
                const result = await slackTools.openDirectMessage(user_id, users);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error opening direct message: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "send_direct_message",
        {
            description: "Send a direct message to a user.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                target_user_id: z.string().describe("The ID of the user to send DM to"),
                message: z.string().describe("Message content to send")
            }
        },
        async ({ user_id = null, target_user_id, message }) => {
            try {
                const result = await slackTools.sendDirectMessage(user_id, target_user_id, message);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error sending direct message: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "send_ephemeral_message",
        {
            description: "Send an ephemeral message visible only to a specific user.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                target_user_id: z.string().describe("The ID of the user who will see the ephemeral message"),
                message: z.string().describe("Message content to send")
            }
        },
        async ({ user_id = null, channel_id, target_user_id, message }) => {
            try {
                const result = await slackTools.sendEphemeralMessage(user_id, channel_id, target_user_id, message);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error sending ephemeral message: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "archive_channel",
        {
            description: "Archive a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel to archive")
            }
        },
        async ({ user_id = null, channel_id }) => {
            try {
                const result = await slackTools.archiveChannel(user_id, channel_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error archiving channel: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "invite_users_to_channel",
        {
            description: "Invite users to a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel to invite users to"),
                users: z.array(z.string()).describe("Array of user IDs to invite to the channel")
            }
        },
        async ({ user_id = null, channel_id, users }) => {
            try {
                const result = await slackTools.inviteUsersToChannel(user_id, channel_id, users);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inviting users to channel: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "kick_user_from_channel",
        {
            description: "Remove a user from a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                target_user_id: z.string().describe("The ID of the user to remove")
            }
        },
        async ({ user_id = null, channel_id, target_user_id }) => {
            try {
                const result = await slackTools.kickUserFromChannel(user_id, channel_id, target_user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error removing user from channel: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "reply_to_thread",
        {
            description: "Reply to an existing thread in a Slack channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                thread_ts: z.string().describe("Timestamp of the parent message to reply to"),
                message: z.string().describe("Reply message content")
            }
        },
        async ({ user_id = null, channel_id, thread_ts, message }) => {
            try {
                const result = await slackTools.replyToThread(user_id, channel_id, thread_ts, message);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error replying to thread: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_thread_messages",
        {
            description: "Get all messages in a specific thread.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                thread_ts: z.string().describe("Timestamp of the parent message"),
                limit: z.number().optional().describe("Maximum number of messages to return (default: 50)")
            }
        },
        async ({ user_id = null, channel_id, thread_ts, limit = 50 }) => {
            try {
                const result = await slackTools.getThreadMessages(user_id, channel_id, thread_ts, limit);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting thread messages: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "start_thread_with_message",
        {
            description: "Send a message that can be used to start a thread.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                message: z.string().describe("Message content to start the thread with")
            }
        },
        async ({ user_id = null, channel_id, message }) => {
            try {
                const result = await slackTools.startThreadWithMessage(user_id, channel_id, message);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error starting thread: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "reply_to_thread_with_broadcast",
        {
            description: "Reply to a thread and broadcast the reply to the channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                thread_ts: z.string().describe("Timestamp of the parent message to reply to"),
                message: z.string().describe("Reply message content")
            }
        },
        async ({ user_id = null, channel_id, thread_ts, message }) => {
            try {
                const result = await slackTools.replyToThreadWithBroadcast(user_id, channel_id, thread_ts, message);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error replying to thread with broadcast: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_thread_info",
        {
            description: "Get summary information about a thread.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                thread_ts: z.string().describe("Timestamp of the parent message")
            }
        },
        async ({ user_id = null, channel_id, thread_ts }) => {
            try {
                const result = await slackTools.getThreadInfo(user_id, channel_id, thread_ts);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting thread info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "find_threads_in_channel",
        {
            description: "Find all messages that have threads (replies) in a channel.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from"),
                channel_id: z.string().describe("The ID of the channel"),
                limit: z.number().optional().describe("Maximum number of messages to check (default: 100)")
            }
        },
        async ({ user_id = null, channel_id, limit = 100 }) => {
            try {
                const result = await slackTools.findThreadsInChannel(user_id, channel_id, limit);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error finding threads in channel: ${error.message}`
                    }]
                };
            }
        }
    );


    // Register GitHub tools
    server.registerTool(
        "get_github_repositories",
        {
            description: "Get repositories for a GitHub user",
            inputSchema: {
                username: z.string().describe("GitHub username"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ username, user_id = null }) => {
            try {
                const result = await githubTools.getGithubRepositories(user_id, username);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting GitHub repositories: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_github_branch",
        {
            description: "Create a new branch in a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                branch_name: z.string().describe("Name of the new branch"),
                source_branch: z.string().optional().describe("Source branch to create from (default: main)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, branch_name, source_branch = "main", user_id = null }) => {
            try {
                const result = await githubTools.createGithubBranch(user_id, `${owner}/${repo}`, branch_name, source_branch);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating GitHub branch: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_git_commits",
        {
            description: "Get recent commits from a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                branch: z.string().optional().describe("Branch name (default: main)"),
                hours_back: z.number().optional().describe("Hours to look back for commits (default: 24)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, branch = "main", hours_back = 24, user_id = null }) => {
            try {
                const result = await githubTools.getGitCommits(user_id, owner, repo, branch, hours_back);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Git commits: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_github_user_info",
        {
            description: "Get information about a GitHub user",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await githubTools.getUserInfo(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting user info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_github_repository_info",
        {
            description: "Get detailed information about a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, user_id = null }) => {
            try {
                const result = await githubTools.getGithubRepositoryInfo(user_id, `${owner}/${repo}`);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting repository info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_repository_branches",
        {
            description: "Get all branches in a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, user_id = null }) => {
            try {
                const result = await githubTools.getRepositoryBranches(user_id, `${owner}/${repo}`);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting repository branches: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_repository_issues",
        {
            description: "Get issues from a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                state: z.string().optional().describe("Issue state: open, closed, or all (default: open)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, state = "open", user_id = null }) => {
            try {
                const result = await githubTools.getRepositoryIssues(user_id, `${owner}/${repo}`, state);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting repository issues: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_pull_request",
        {
            description: "Create a pull request in a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                title: z.string().describe("Pull request title"),
                body: z.string().describe("Pull request body"),
                head: z.string().describe("Branch to merge from"),
                base: z.string().describe("Branch to merge into"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, title, body, head, base, user_id = null }) => {
            try {
                const result = await githubTools.createPullRequest(user_id, `${owner}/${repo}`, head, base, title, body);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating pull request: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_pull_request_details",
        {
            description: "Get details of a specific pull request",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                pull_number: z.number().describe("Pull request number"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, pull_number, user_id = null }) => {
            try {
                const result = await githubTools.getPullRequestDetails(user_id, `${owner}/${repo}`, pull_number);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting pull request details: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_pull_requests",
        {
            description: "Get pull requests from a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                state: z.string().optional().describe("Pull request state: open, closed, or all (default: open)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, state = "open", user_id = null }) => {
            try {
                const result = await githubTools.getPullRequests(user_id, `${owner}/${repo}`, state);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting pull requests: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_tags_or_branches",
        {
            description: "Get tags or branches from a GitHub repository",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                type: z.string().describe("Type to get: tags or branches"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ owner, repo, type, user_id = null }) => {
            try {
                const result = await githubTools.getTagsOrBranches(user_id, `${owner}/${repo}`, type);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting ${type}: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "global_search",
        {
            description: "Search GitHub globally for repositories, users, or commits",
            inputSchema: {
                query: z.string().describe("Search query"),
                search_type: z.string().describe("Type of search: repositories, users, or commits"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from")
            }
        },
        async ({ query, search_type, user_id = null }) => {
            try {
                const result = await githubTools.globalSearch(user_id, search_type, query);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error performing global search: ${error.message}`
                    }]
                };
            }
        }
    );



    // Register MongoDB tools
    server.registerTool(
        "connect_to_mongodb",
        {
            description: "Connect to a MongoDB instance and test the connection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name (optional)")
            }
        },
        async ({ user_id, database_name = null }) => {

            try {
                const result = await mongodbTools.connectToMongoDB(user_id, database_name);
                // console.log('result_at_connect_to_mongodb', result);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error connecting to MongoDB: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "find_documents",
        {
            description: "Find documents in a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name"),
                collection_name: z.string().optional().describe("Collection name"),
                query: z.any().optional().describe("Query filter (optional)"),
                limit: z.number().optional().optional().describe("Maximum number of documents to return (default: 10)"),
                projection: z.any().optional().describe("Fields to include/exclude (optional)")
            }
        },
        async ({ user_id, database_name, collection_name, query = null, limit = 10, projection = null }) => {
            try {
                const result = await mongodbTools.findDocuments(user_id, database_name, collection_name, query, limit, projection);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error finding documents: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "aggregate_documents",
        {
            description: "Run an aggregation pipeline on a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                pipeline: z.array(z.object({})).describe("Aggregation pipeline")
            }
        },
        async ({ user_id, database_name, collection_name, pipeline }) => {
            try {
                const result = await mongodbTools.aggregateDocuments(user_id, database_name, collection_name, pipeline);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error running aggregation: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "count_documents",
        {
            description: "Count documents in a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                query: z.object({}).optional().describe("Query filter (optional)")
            }
        },
        async ({ user_id, database_name, collection_name, query = null }) => {
            try {
                const result = await mongodbTools.countDocuments(user_id, database_name, collection_name, query);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error counting documents: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "insert_one_document",
        {
            description: "Insert a single document into a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                document: z.any().describe("Document to insert")
            }
        },
        async ({ user_id, database_name, collection_name, document }) => {
            try {
                const result = await mongodbTools.insertOneDocument(user_id, database_name, collection_name, document);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inserting document: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "insert_many_documents",
        {
            description: "Insert multiple documents into a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                documents: z.array(z.any()).describe("Array of documents to insert")
            }
        },
        async ({ user_id, database_name, collection_name, documents }) => {
            try {
                const result = await mongodbTools.insertManyDocuments(user_id, database_name, collection_name, documents);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inserting documents: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_one_document",
        {
            description: "Update a single document in a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                filter_query: z.any().describe("Query to match documents"),
                update: z.any().describe("Update operations"),
                upsert: z.boolean().optional().describe("Create document if not found (default: false)")
            }
        },
        async ({ user_id, database_name, collection_name, filter_query, update, upsert = false }) => {
            try {
                const result = await mongodbTools.updateOneDocument(user_id, database_name, collection_name, filter_query, update, upsert);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error updating document: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_many_documents",
        {
            description: "Update multiple documents in a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                filter_query: z.any().describe("Query to match documents"),
                update: z.any().describe("Update operations"),
                upsert: z.boolean().optional().describe("Create document if not found (default: false)")
            }
        },
        async ({ user_id, database_name, collection_name, filter_query, update, upsert = false }) => {
            try {
                const result = await mongodbTools.updateManyDocuments(user_id, database_name, collection_name, filter_query, update, upsert);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error updating documents: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_one_document",
        {
            description: "Delete a single document from a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                filter_query: z.any().describe("Query to match document to delete")
            }
        },
        async ({ user_id, database_name, collection_name, filter_query }) => {
            try {
                const result = await mongodbTools.deleteOneDocument(user_id, database_name, collection_name, filter_query);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error deleting document: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_many_documents",
        {
            description: "Delete multiple documents from a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name"),
                filter_query: z.any().describe("Query to match documents to delete")
            }
        },
        async ({ user_id, database_name, collection_name, filter_query }) => {
            try {
                const result = await mongodbTools.deleteManyDocuments(user_id, database_name, collection_name, filter_query);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error deleting documents: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_databases",
        {
            description: "List all databases for a MongoDB connection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from")
            }
        },
        async ({ user_id }) => {
            try {
                const result = await mongodbTools.listDatabases(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing databases: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_collections",
        {
            description: "List all collections for a given database. This tools is depends on the connect_to_mongodb tool.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name")
            }
        },
        async ({ user_id, database_name }) => {

            try {
                const result = await mongodbTools.listCollections(user_id, database_name);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing collections: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_index",
        {
            description: "Create an index on a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name"),
                collection_name: z.string().optional().describe("Collection name"),
                index_spec: z.object({}).describe("Index specification"),
                unique: z.boolean().optional().describe("Whether the index should be unique (default: false)")
            }
        },
        async ({ user_id, database_name, collection_name, index_spec, unique = false }) => {
            try {
                const result = await mongodbTools.createIndex(user_id, database_name, collection_name, index_spec, unique);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating index: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "collection_indexes",
        {
            description: "List all indexes for a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name"),
                collection_name: z.string().optional().describe("Collection name")
            }
        },
        async ({ user_id, database_name, collection_name }) => {
            try {
                const result = await mongodbTools.collectionIndexes(user_id, database_name, collection_name);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing indexes: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "drop_collection",
        {
            description: "Drop a MongoDB collection",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().describe("Database name"),
                collection_name: z.string().describe("Collection name to drop")
            }
        },
        async ({ user_id, database_name, collection_name }) => {
            try {
                const result = await mongodbTools.dropCollection(user_id, database_name, collection_name);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error dropping collection: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "db_stats",
        {
            description: "Get database statistics for a MongoDB database",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from"),
                database_name: z.string().optional().describe("Database name")
            }
        },
        async ({ user_id, database_name }) => {
            try {
                const result = await mongodbTools.dbStats(user_id, database_name);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting database stats: ${error.message}`
                    }]
                };
            }
        }
    );

   



 
    // Register Zoom tools
    server.registerTool(
        "get_zoom_user_info",
        {
            description: "Get current Zoom user information.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await zoomTools.getZoomUserInfo(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Zoom user info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_zoom_meetings",
        {
            description: "List all meetings for the authenticated Zoom user.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                type: z.string().optional().describe("Meeting type (scheduled, live, upcoming) - default: scheduled"),
                page_size: z.number().optional().describe("Number of meetings to return per page (default: 30)")
            }
        },
        async ({ user_id = null, type = 'scheduled', page_size = 30 }) => {
            // console.log('user_id - list zoom meetings', user_id)
            try {
                const result = await zoomTools.listZoomMeetings(user_id, type, page_size);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing Zoom meetings: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_zoom_meeting",
        {
            description: "Create a new Zoom meeting with optional invitees. Invitees will receive email invitations automatically.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                topic: z.string().optional().describe("Meeting topic"),
                start_time: z.string().optional().describe("Meeting start time (ISO 8601 format) - leave empty for instant meeting"),
                duration: z.number().optional().describe("Meeting duration in minutes (default: 60)"),
                invitees: z.array(z.string()).optional().describe("Array of email addresses to invite to the meeting")
            }
        },
        async ({ user_id = null, topic, start_time = null, duration = 60, password = null, settings = {}, invitees = [] }) => {
            try {
                const result = await zoomTools.createZoomMeeting(user_id, topic, start_time, duration, password, settings, invitees);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating Zoom meeting: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_zoom_meeting_info",
        {
            description: "Get detailed information about a specific Zoom meeting.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                meeting_id: z.string().describe("Meeting ID")
            }
        },
        async ({ user_id = null, meeting_id }) => {
            try {
                const result = await zoomTools.getZoomMeetingInfo(user_id, meeting_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Zoom meeting info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_zoom_meeting",
        {
            description: "Update an existing Zoom meeting.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                meeting_id: z.string().describe("Meeting ID to update"),
                update_data: z.object({
                    topic: z.string().optional(),
                    start_time: z.string().optional(),
                    duration: z.number().optional(),
                    password: z.string().optional(),
                    settings: z.object({}).optional()
                }).describe("Data to update")
            }
        },
        async ({ user_id = null, meeting_id, update_data }) => {
            try {
                const result = await zoomTools.updateZoomMeeting(user_id, meeting_id, update_data);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error updating Zoom meeting: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_zoom_meeting",
        {
            description: "Delete a Zoom meeting.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                meeting_id: z.string().describe("Meeting ID to delete"),
                occurrence_id: z.string().optional().describe("Occurrence ID for recurring meetings (optional)")
            }
        },
        async ({ user_id = null, meeting_id, occurrence_id = null }) => {
            try {
                const result = await zoomTools.deleteZoomMeeting(user_id, meeting_id, occurrence_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error deleting Zoom meeting: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "generate_zoom_meeting_invitation",
        {
            description: "Generate a calendar invitation text for a Zoom meeting with invitee details and setup instructions.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                meeting_id: z.string().describe("Meeting ID to generate invitation for"),
                invitees: z.array(z.string()).optional().describe("Array of email addresses to include in the invitation")
            }
        },
        async ({ user_id = null, meeting_id, invitees = [] }) => {
            try {
                const result = await zoomTools.generateMeetingInvitation(user_id, meeting_id, invitees);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error generating meeting invitation: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "invite_to_zoom_meeting",
        {
            description: "Invite people to an existing Zoom meeting by providing their email addresses. Attempts API invitation first, then provides manual sharing details if needed.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Zoom access token from"),
                meeting_id: z.string().describe("Meeting ID to invite people to"),
                invitees: z.array(z.string()).describe("Array of email addresses to invite to the meeting")
            }
        },
        async ({ user_id = null, meeting_id, invitees }) => {
            try {
                const result = await zoomTools.inviteToZoomMeeting(user_id, meeting_id, invitees);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error inviting to Zoom meeting: ${error.message}`
                    }]
                };
            }
        }
    );


    // Register Gmail tools
    server.registerTool(
        "search_gmail_messages",
        {
            description: "Search Gmail messages using Gmail search syntax.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                query: z.string().describe("Gmail search query"),
                max_results: z.number().optional().describe("Maximum number of results to return (default: 10)")
            }
        },
        async ({ user_id = null, query, max_results = 10 }) => {
            try {
                const result = await gmailTools.searchGmailMessages(user_id, query, max_results);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error searching Gmail messages: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_gmail_message_content",
        {
            description: "Get the full content of a specific Gmail message.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                message_id: z.string().describe("Gmail message ID")
            }
        },
        async ({ user_id = null, message_id }) => {
            try {
                const result = await gmailTools.getGmailMessageContent(user_id, message_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Gmail message content: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_gmail_messages_content_batch",
        {
            description: "Get content of multiple Gmail messages in batch.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                message_ids: z.array(z.string()).describe("Array of Gmail message IDs")
            }
        },
        async ({ user_id = null, message_ids }) => {
            try {
                const result = await gmailTools.getGmailMessagesContentBatch(user_id, message_ids);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Gmail messages content: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "send_gmail_message",
        {
            description: "Send an email through Gmail.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                to: z.string().describe("Recipient email address"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body"),
                cc: z.string().optional().describe("CC recipients (optional)"),
                bcc: z.string().optional().describe("BCC recipients (optional)")
            }
        },
        async ({ user_id = null, to, subject, body, cc = null, bcc = null }) => {
            try {
                const result = await gmailTools.sendGmailMessage(user_id, to, subject, body, cc, bcc);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error sending Gmail message: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "draft_gmail_message",
        {
            description: "Create a draft email in Gmail.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                to: z.string().describe("Recipient email address"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body"),
                cc: z.string().optional().describe("CC recipients (optional)"),
                bcc: z.string().optional().describe("BCC recipients (optional)")
            }
        },
        async ({ user_id = null, to, subject, body, cc = null, bcc = null }) => {
            try {
                const result = await gmailTools.draftGmailMessage(user_id, to, subject, body, cc, bcc);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating Gmail draft: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_gmail_thread_content",
        {
            description: "Get the full content of a Gmail thread (conversation).",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                thread_id: z.string().describe("Gmail thread ID")
            }
        },
        async ({ user_id = null, thread_id }) => {
            try {
                const result = await gmailTools.getGmailThreadContent(user_id, thread_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Gmail thread content: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_gmail_threads_content_batch",
        {
            description: "Get content of multiple Gmail threads in batch.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                thread_ids: z.array(z.string()).describe("Array of Gmail thread IDs")
            }
        },
        async ({ user_id = null, thread_ids }) => {
            try {
                const result = await gmailTools.getGmailThreadsContentBatch(user_id, thread_ids);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Gmail threads content: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_gmail_labels",
        {
            description: "List all Gmail labels (both system and user-created).",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await gmailTools.listGmailLabels(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing Gmail labels: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "manage_gmail_label",
        {
            description: "Create, update, or delete Gmail labels.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                action: z.string().describe("Action to perform: 'create', 'update', or 'delete'"),
                label_name: z.string().optional().describe("Label name (for create/update)"),
                label_id: z.string().optional().describe("Label ID (for update/delete)"),
                visibility: z.string().optional().describe("Label visibility: 'show', 'hide', 'showIfUnread' (for create/update)")
            }
        },
        async ({ user_id = null, action, label_name = null, label_id = null, visibility = 'show' }) => {
            try {
                const result = await gmailTools.manageGmailLabel(user_id, action, label_name, label_id, visibility);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error managing Gmail label: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "modify_gmail_message_labels",
        {
            description: "Add or remove labels from a Gmail message.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                message_id: z.string().describe("Gmail message ID"),
                add_label_ids: z.array(z.string()).optional().describe("Array of label IDs to add"),
                remove_label_ids: z.array(z.string()).optional().describe("Array of label IDs to remove")
            }
        },
        async ({ user_id = null, message_id, add_label_ids = [], remove_label_ids = [] }) => {
            try {
                const result = await gmailTools.modifyGmailMessageLabels(user_id, message_id, add_label_ids, remove_label_ids);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error modifying Gmail message labels: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "batch_modify_gmail_message_labels",
        {
            description: "Add or remove labels from multiple Gmail messages in batch.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from"),
                message_ids: z.array(z.string()).describe("Array of Gmail message IDs"),
                add_label_ids: z.array(z.string()).optional().describe("Array of label IDs to add"),
                remove_label_ids: z.array(z.string()).optional().describe("Array of label IDs to remove")
            }
        },
        async ({ user_id = null, message_ids, add_label_ids = [], remove_label_ids = [] }) => {
            try {
                const result = await gmailTools.batchModifyGmailMessageLabels(user_id, message_ids, add_label_ids, remove_label_ids);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error batch modifying Gmail message labels: ${error.message}`
                    }]
                };
            }
        }
    );

    // Register Google Drive tools
    server.registerTool(
        "search_drive_files",
        {
            description: "Search Google Drive files using Drive search syntax.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from"),
                query: z.string().describe("Drive search query"),
                page_size: z.number().optional().describe("Maximum number of results to return (default: 10)"),
                drive_id: z.string().optional().describe("ID of the shared drive. If provided, the search is scoped to this drive."),
                include_items_from_all_drives: z.boolean().optional().describe("Whether items from all accessible shared drives should be included if `drive_id` is not set. Defaults to True."),
                corpora: z.string().optional().describe("Corpus to query ('user', 'drive', 'allDrives'). If `drive_id` is set and `corpora` is None, 'drive' is used. If None and no `drive_id`, API defaults apply.")
            }
        },
        async ({ user_id = null, query, page_size = 10, drive_id = null, include_items_from_all_drives = true, corpora = null }) => {
            try {
                const result = await driveTools.searchDriveFiles(user_id, query, page_size, null, include_items_from_all_drives);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error searching Drive files: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_drive_file_content",
        {
            description: "Get the content of a specific Google Drive file.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from"),
                file_id: z.string().describe("Drive file ID")
            }
        },
        async ({ user_id = null, file_id }) => {
            try {
                const result = await driveTools.getDriveFileContent(user_id, file_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting Drive file content: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_drive_items",
        {
            description: "Lists files and folders, supporting shared drives. If `drive_id` is specified, lists items within that shared drive. `folder_id` is then relative to that drive (or use drive_id as folder_id for root). If `drive_id` is not specified, lists items from user's \"My Drive\" and accessible shared drives (if `include_items_from_all_drives` is True).",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from"),
                folder_id: z.string().optional().describe("The ID of the Google Drive folder. Defaults to 'root'. For a shared drive, this can be the shared drive's ID to list its root, or a folder ID within that shared drive."),
                page_size: z.number().optional().describe("The maximum number of items to return. Defaults to 100."),
                drive_id: z.string().optional().describe("ID of the shared drive. If provided, the listing is scoped to this drive."),
                include_items_from_all_drives: z.boolean().optional().describe("Whether items from all accessible shared drives should be included if `drive_id` is not set. Defaults to True."),
                corpora: z.string().optional().describe("Corpus to query ('user', 'drive', 'allDrives'). If `drive_id` is set and `corpora` is None, 'drive' is used. If None and no `drive_id`, API defaults apply.")
            }
        },
        async ({ user_id = null, folder_id = 'root', page_size = 100, drive_id = null, include_items_from_all_drives = true, corpora = null }) => {
            try {
                const result = await driveTools.listDriveItems(user_id, folder_id, include_items_from_all_drives);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing Drive items: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_drive_file",
        {
            description: "Create a new file in Google Drive.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from"),
                file_name: z.string().describe("File name"),
                content: z.string().optional().describe("File content (optional)"),
                folder_id: z.string().optional().describe("Parent folder ID (default: root)"),
                mime_type: z.string().optional().describe("MIME type (default: text/plain)"),
                fileUrl: z.string().optional().describe("URL to download content from (optional)")
            }
        },
        async ({ user_id = null, file_name, content = null, folder_id = 'root', mime_type = 'text/plain', fileUrl = null }) => {
            try {
                const result = await driveTools.createDriveFile(user_id, file_name, content || '', mime_type, folder_id, fileUrl);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating Drive file: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_drive_shared_drives",
        {
            description: "List Google Drive shared drives.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await driveTools.listDriveSharedDrives(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing Drive shared drives: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_drive_file",
        {
            description: "Delete a file from Google Drive.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Drive access token from"),
                file_id: z.string().describe("Drive file ID")
            }
        },
        async ({ user_id = null, file_id }) => {
            try {
                const result = await driveTools.deleteDriveFile(user_id, file_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error deleting Drive file: ${error.message}`
                    }]
                };
            }
        }
    );

    // Register Google Calendar tools
    server.registerTool(
        "list_calendars",
        {
            description: "List Google Calendar calendars.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from")
            }
        },
        async ({ user_id = null }) => {

            try {
                const result = await calendarTools.listCalendars(user_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error listing calendars: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_calendar_events",
        {
            description: "Get events from a Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().optional().describe("Calendar ID (defaults to primary)"),
                time_min: z.string().optional().describe("Start time (optional)"),
                time_max: z.string().optional().describe("End time (optional)"),
                max_results: z.number().optional().describe("Maximum number of results (default: 20)")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', time_min = null, time_max = null, max_results = 20 }) => {
            
            try {
                const result = await calendarTools.getEvents(user_id, calendar_id, time_min, time_max, max_results);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting calendar events: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_calendar_event",
        {
            description: "Create a new event in Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().optional().describe("Calendar ID (defaults to primary)"),
                summary: z.string().describe("Event title"),
                start_time: z.string().describe("Start time"),
                end_time: z.string().describe("End time"),
                description: z.string().optional().describe("Event description (optional)"),
                location: z.string().optional().describe("Event location (optional)"),
                attendees: z.array(z.string()).optional().describe("List of attendee emails (optional)"),
                attachments: z.array(z.string()).optional().describe("List of attachments (optional)"),
                timezone: z.string().optional().describe("Timezone (optional)")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', summary, start_time, end_time, description = null, location = null, attendees = [], attachments = [], timezone = null }) => {
            try {
                const result = await calendarTools.createEvent(user_id, calendar_id, summary, start_time, end_time, description, location, attendees, attachments, timezone);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error creating calendar event: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "modify_calendar_event",
        {
            description: "Modify an existing event in Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().describe("Calendar ID (defaults to primary)"),
                event_id: z.string().optional().describe("Event ID to modify"),
                summary: z.string().optional().describe("Event title (optional)"),
                start_time: z.string().optional().describe("Start time (optional)"),
                end_time: z.string().optional().describe("End time (optional)"),
                description: z.string().optional().describe("Event description (optional)"),
                location: z.string().optional().describe("Event location (optional)"),
                attendees: z.array(z.string()).optional().describe("List of attendee emails (optional)"),
                attachments: z.array(z.string()).optional().describe("List of attachments (optional)"),
                timezone: z.string().optional().describe("Timezone (optional)")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', event_id, summary = null, start_time = null, end_time = null, description = null, location = null, attendees = [], attachments = [], timezone = null }) => {

            try {
                const result = await calendarTools.modifyEvent(user_id, event_id, calendar_id, summary, start_time, end_time, description, location, attendees, timezone);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error modifying calendar event: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_calendar_event",
        {
            description: "Delete an event from Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().optional().describe("Calendar ID (defaults to primary)"),
                event_id: z.string().describe("Event ID to delete")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', event_id }) => {
            try {
                const result = await calendarTools.deleteEvent(user_id, event_id, calendar_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error deleting calendar event: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_calendar_event",
        {
            description: "Get a specific event from Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().optional().describe("Calendar ID (defaults to primary)"),
                event_id: z.string().describe("Event ID to retrieve")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', event_id }) => {
            try {
                const result = await calendarTools.getEvent(user_id, event_id, calendar_id);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting calendar event: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "search_calendar_events",
        {
            description: "Search for events in Google Calendar.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Calendar access token from"),
                calendar_id: z.string().optional().describe("Calendar ID (defaults to primary)"),
                query: z.string().describe("Search query"),
                time_min: z.string().optional().describe("Start time (optional)"),
                time_max: z.string().optional().describe("End time (optional)"),
                max_results: z.number().optional().describe("Maximum number of results (default: 20)")
            }
        },
        async ({ user_id = null, calendar_id = 'primary', query, time_min = null, time_max = null, max_results = 20 }) => {
            try {
                const result = await calendarTools.searchEvents(user_id, calendar_id, query, time_min, time_max, max_results);
                return {
                    content: [{
                        type: "text",
                        text: result
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error searching calendar events: ${error.message}`
                    }]
                };
            }
        }
    );

    // Create Express app
    const app = express();
    
    // Enable CORS
    app.use(cors());
    app.use(express.json());
    
    // Set timeout for all requests to 5 minutes to match server timeout
    app.use((req, res, next) => {
        req.setTimeout(300000); // 5 minutes
        res.setTimeout(300000); // 5 minutes
        next();
    });
    
    // Health check endpoint
    app.get('/mcp-health', (req, res) => {
        res.json({
            status: 'ok',
            server: 'Weam MCP SSE Server',
            endpoints: {
                sse: '/mcp',
                health: '/mcp-health'
            },
            description: 'Model Context Protocol server with SSE transport for Weam'
        });
    });
    
    // Store active transports with session management
    const transports = new Map();

    // MCP SSE connection endpoint
    app.get('/mcp-event', (req, res) => {
        console.log('MCP client connected via GET');
        
        // Extract user information from request (session, headers, etc.)
        const userId = req.headers['x-user-id'] || req.query.userId || 'anonymous';
        const sessionId = req.headers['x-session-id'] || req.query.sessionId || `session_${Date.now()}`;
        
        console.log(`🔗 [MCP Server] New connection - User: ${userId}, Session: ${sessionId}`);
        
        // Create SSE transport with POST endpoint path
        const transport = new SSEServerTransport('/mcp/messages', res);
        
        // Store transport by session ID
        transports.set(transport.sessionId, transport);
        
        // Register transport with session manager
        mcpSessionManager.registerTransport(transport.sessionId, userId, sessionId);
        
        // Handle client disconnect with session-based cleanup
        req.on('close', () => {
            console.log('MCP client disconnected, handling via session manager for sessionId:', transport.sessionId);
            
            // Use session manager to handle disconnect
            const cleanupInfo = mcpSessionManager.handleTransportDisconnect(transport.sessionId);
            
            if (cleanupInfo && cleanupInfo.shouldCleanup === false) {
                console.log(`🔄 [MCP Server] Transport cleanup managed by session manager (Grace period: ${cleanupInfo.gracePeriod / 1000}s)`);
                
                // If session manager indicates cleanup should happen later, 
                // we'll let it handle the cleanup timing
                if (cleanupInfo.gracePeriod > 0) {
                    // Session manager will handle cleanup after grace period
                    setTimeout(() => {
                        // Double-check if transport should still be cleaned up
                        const userFromTransport = mcpSessionManager.getUserFromTransport(transport.sessionId);
                        if (!userFromTransport || !mcpSessionManager.isUserSessionActive(userFromTransport)) {
                            console.log(`🧹 [MCP Server] Cleaning up transport ${transport.sessionId} after grace period`);
                            transports.delete(transport.sessionId);
                        }
                    }, cleanupInfo.gracePeriod);
                }
            } else {
                // Immediate cleanup if session manager says so
                console.log(`🧹 [MCP Server] Immediate transport cleanup for ${transport.sessionId}`);
                transports.delete(transport.sessionId);
            }
        });
        
        // Connect server to transport
        server.connect(transport).catch(console.error);
    });



    // MCP POST message endpoint
    app.post('/mcp/messages', async (req, res) => {
        console.log('MCP client sent message via POST');
        
        try {
            const sessionId = req.query.sessionId;
            if (!sessionId || typeof sessionId !== 'string') {
                console.log('POST request missing or invalid sessionId');
                return res.status(400).json({ error: 'Missing or invalid sessionId' });
            }
            
            // Update user activity in session manager
            const userId = mcpSessionManager.getUserFromTransport(sessionId);
            if (userId) {
                mcpSessionManager.updateUserActivity(userId);
                console.log(`🔄 [MCP Server] Updated activity for user ${userId} via transport ${sessionId}`);
            }
            
            const transport = transports.get(sessionId);
            if (!transport) {
                console.log(`No transport found for sessionId: ${sessionId}. Available sessions:`, Array.from(transports.keys()));
                
                return res.status(400).json({ 
                    error: 'No transport found for sessionId',
                    sessionId: sessionId,
                    availableSessions: Array.from(transports.keys())
                });
            }
            
            // Handle the POST message through the transport
            await transport.handlePostMessage(req, res, req.body);
        } catch (error) {
            console.error('Error handling POST message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // User logout cleanup endpoint
    app.post('/cleanup-user-session', async (req, res) => {
        console.log('🧹 [MCP Server] User logout cleanup requested');
        
        try {
            const { userId } = req.body;
            if (!userId) {
                return res.status(400).json({ error: 'Missing userId' });
            }
            
            // Clean up user session and associated transports
            const cleanedUp = mcpSessionManager.cleanupUserSession(userId);
            
            if (cleanedUp) {
                // Also clean up any transports associated with this user
                const userTransports = [];
                for (const [sessionId, transport] of transports.entries()) {
                    const transportUserId = mcpSessionManager.getUserFromTransport(sessionId);
                    if (transportUserId === userId) {
                        userTransports.push(sessionId);
                    }
                }
                
                // Remove transports for this user
                userTransports.forEach(sessionId => {
                    console.log(`🧹 [MCP Server] Cleaning up transport ${sessionId} for user ${userId}`);
                    transports.delete(sessionId);
                });
                
                console.log(`✅ [MCP Server] Successfully cleaned up session for user ${userId}, removed ${userTransports.length} transports`);
                res.json({ 
                    success: true, 
                    message: `Cleaned up session for user ${userId}`,
                    transportsRemoved: userTransports.length
                });
            } else {
                console.log(`ℹ️ [MCP Server] No active session found for user ${userId}`);
                res.json({ 
                    success: true, 
                    message: `No active session found for user ${userId}` 
                });
            }
        } catch (error) {
            console.error('Error cleaning up user session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Add MCP session statistics endpoint
    app.get('/mcp-stats', (req, res) => {
        try {
            const sessionStats = mcpSessionManager.getStats();
            const serverStats = {
                activeTransports: transports.size,
                serverUptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };
            
            res.json({
                sessionManager: sessionStats,
                server: serverStats,
                combined: {
                    totalConnections: sessionStats.activeTransports + transports.size,
                    healthStatus: 'running'
                }
            });
        } catch (error) {
            console.error('❌ [MCP Server] Error getting stats:', error);
            res.status(500).json({ error: 'Failed to get server stats' });
        }
    });

    // Start the server
    const PORT = process.env.MCP_PORT || 3006;
    const httpServer = app.listen(PORT, () => {
        console.log(`Weam MCP Server running on port ${PORT}`);
        console.log(`MCP SSE endpoint: ${LINK.MCP_SERVER_URL}/mcp-event`);
        console.log(`MCP POST endpoint: ${LINK.MCP_SERVER_URL}/mcp/messages`);
        console.log(`Health check: ${LINK.MCP_SERVER_URL}/mcp-health`);
    });
    
    // Set server timeout to 5 minutes to match client timeout
    httpServer.timeout = 300000;
    httpServer.keepAliveTimeout = 305000;
    httpServer.headersTimeout = 306000;

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down MCP server...');
        httpServer.close(() => {
            console.log('MCP Server closed');
            process.exit(0);
        });
    });

    return { server, app, httpServer };
}

module.exports = { startMCPServer };