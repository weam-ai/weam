
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');
const express = require('express');
const cors = require('cors');
const { LINK } = require('../config/config');
const mcpSessionManager = require('./mcpSessionManager');
const slackTools = require('../tools/slack');
// const jiraTools = require('../tools/jira');
const githubTools = require('../tools/github');
// const airtableTools = require('../tools/airtable');
// const asanaTools = require('../tools/asana');
const mongodbTools = require('../tools/mongodb');
// const stripeTools = require('../tools/stripe');
// const n8nTools = require('../tools/n8n');
const zoomTools = require('../tools/zoom');
// const dropboxTools = require('../tools/dropbox');
// const clickupTools = require('../tools/clickup');
// const shopifyTools = require('../tools/shopify');
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
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Send a message to a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get recent messages from a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "List all users in the Slack workspace. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get channel ID by channel name. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Create a new Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Set or update the topic for a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Set or update the purpose for a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get list of members in a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get user profile information including custom fields. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get detailed information about a specific user. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Open a direct message conversation with one or more users. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Send a direct message to a user. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Send an ephemeral message visible only to a specific user. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Archive a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Invite users to a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Remove a user from a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Reply to an existing thread in a Slack channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Get all messages in a specific thread. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."),
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
            description: "Send a message that can be used to start a thread. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."), 
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
            description: "Reply to a thread and broadcast the reply to the channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."), 
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
            description: "Get summary information about a thread. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."), 
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
            description: "Find all messages that have threads (replies) in a channel. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Slack access token from. If not provided, the default user will be used."), 
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

    // Register Jira tools
    server.registerTool(
        "get_jira_projects",
        {
            description: "Get all projects from Jira that the user has access to. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from. If not provided, the default user will be used.")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await jiraTools.getJiraProjects(user_id);
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
                        text: `Error getting Jira projects: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_jira_issues",
        {
            description: "Get issues from a Jira project with optional filtering. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from. If not provided, the default user will be used."),
                project_key: z.string().describe("The project key to get issues from"),
                jql: z.string().optional().describe("JQL query to filter issues"),
                max_results: z.number().optional().describe("Maximum number of results to return (default: 50)")
            }
        },
        async ({ user_id = null, project_key, jql, max_results = 50 }) => {
            try {
                const result = await jiraTools.getJiraIssues(user_id, project_key, jql, max_results);
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
                        text: `Error getting Jira issues: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_jira_issue",
        {
            description: "Create a new issue in Jira",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                project_key: z.string().describe("The project key where the issue will be created"),
                summary: z.string().describe("The summary/title of the issue"),
                description: z.string().optional().describe("The description of the issue"),
                issue_type: z.string().describe("The type of issue (e.g., 'Task', 'Bug', 'Story')"),
                priority: z.string().optional().describe("The priority of the issue (e.g., 'High', 'Medium', 'Low')")
            }
        },
        async ({ user_id = null, project_key, summary, description, issue_type, priority }) => {
            try {
                const result = await jiraTools.createJiraIssue(user_id, project_key, summary, description, issue_type, priority);
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
                        text: `Error creating Jira issue: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_jira_issue",
        {
            description: "Update an existing Jira issue",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to update"),
                summary: z.string().optional().describe("New summary/title of the issue"),
                description: z.string().optional().describe("New description of the issue"),
                status: z.string().optional().describe("New status of the issue"),
                priority: z.string().optional().describe("New priority of the issue")
            }
        },
        async ({ user_id = null, issue_key, summary, description, status, priority }) => {
            try {
                const result = await jiraTools.updateJiraIssue(user_id, issue_key, summary, description, status, priority);
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
                        text: `Error updating Jira issue: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_jira_issue",
        {
            description: "Get details of a specific Jira issue",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to retrieve")
            }
        },
        async ({ user_id = null, issue_key }) => {
            try {
                const result = await jiraTools.getJiraIssue(user_id, issue_key);
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
                        text: `Error getting Jira issue: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "add_jira_comment",
        {
            description: "Add a comment to a Jira issue",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to comment on"),
                comment: z.string().describe("The comment text to add")
            }
        },
        async ({ user_id = null, issue_key, comment }) => {
            try {
                const result = await jiraTools.addJiraComment(user_id, issue_key, comment);
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
                        text: `Error adding Jira comment: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "assign_jira_issue",
        {
            description: "Assign a Jira issue to a user",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to assign"),
                assignee: z.string().describe("The account ID or email of the user to assign the issue to")
            }
        },
        async ({ user_id = null, issue_key, assignee }) => {
            try {
                const result = await jiraTools.assignJiraIssue(user_id, issue_key, assignee);
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
                        text: `Error assigning Jira issue: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "transition_jira_issue",
        {
            description: "Transition a Jira issue to a different status",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to transition"),
                transition_id: z.string().describe("The ID of the transition to perform")
            }
        },
        async ({ user_id = null, issue_key, transition_id }) => {
            try {
                const result = await jiraTools.transitionJiraIssue(user_id, issue_key, transition_id);
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
                        text: `Error transitioning Jira issue: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_jira_transitions",
        {
            description: "Get available transitions for a Jira issue",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                issue_key: z.string().describe("The key of the issue to get transitions for")
            }
        },
        async ({ user_id = null, issue_key }) => {
            try {
                const result = await jiraTools.getJiraTransitions(user_id, issue_key);
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
                        text: `Error getting Jira transitions: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "search_jira_issues",
        {
            description: "Search for Jira issues using JQL (Jira Query Language)",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Jira credentials from"),
                jql: z.string().describe("JQL query to search for issues"),
                max_results: z.number().optional().describe("Maximum number of results to return (default: 50)")
            }
        },
        async ({ user_id = null, jql, max_results = 50 }) => {
            try {
                const result = await jiraTools.searchJiraIssues(user_id, jql, max_results);
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
                        text: `Error searching Jira issues: ${error.message}`
                    }]
                };
            }
        }
    );

    // Register Asana tools
    server.registerTool(
        "create_asana_project",
        {
            description: "Create a new project in Asana. This tools is depends on the get_asana_workspace_id tool. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                name: z.string().describe("Project name"),
                notes: z.string().optional().describe("Project description/notes"),
                workspace: z.string().optional().describe("Workspace GID to create project in")
            }
        },
        async ({ user_id = null, name, notes = null, workspace = null, team = null }) => {
            try {
                const result = await asanaTools.createProject(user_id, name, notes, team, workspace);
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
                        text: `Error creating Asana project: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_asana_projects",
        {
            description: "List projects in Asana workspace. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                workspace: z.string().optional().describe("Workspace GID to list projects from"),
                team: z.string().optional().describe("Team GID to filter projects by")
            }
        },
        async ({ user_id = null, workspace = null, team = null }) => {
            try {
                const result = await asanaTools.listProjects(user_id, workspace, team);
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
                        text: `Error listing Asana projects: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_asana_project",
        {
            description: "Get details of a specific Asana project. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                project_gid: z.string().describe("Project GID to retrieve")
            }
        },
        async ({ user_id = null, project_gid }) => {
            try {
                const result = await asanaTools.getProject(user_id, project_gid);
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
                        text: `Error getting Asana project: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_asana_project",
        {
            description: "Update an existing Asana project. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                project_gid: z.string().describe("Project GID to update"),
                name: z.string().optional().describe("New project name"),
                notes: z.string().optional().describe("New project description/notes")
            }
        },
        async ({ user_id = null, project_gid, name = null, notes = null }) => {
            try {
                const result = await asanaTools.updateProject(user_id, project_gid, name, notes);
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
                        text: `Error updating Asana project: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_asana_task",
        {
            description: "Create a new task in Asana. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                name: z.string().describe("Task name"),
                notes: z.string().optional().describe("Task description/notes"),
                assignee: z.string().optional().describe("Assignee user GID"),
                projects: z.array(z.string()).optional().describe("Array of project GIDs to add task to"),
                due_on: z.string().optional().describe("Due date in YYYY-MM-DD format")
            }
        },
        async ({ user_id = null, name, notes = null, assignee = null, projects = null, due_on = null }) => {
            try {
                const result = await asanaTools.createTask(user_id, name, notes, assignee, projects, due_on);
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
                        text: `Error creating Asana task: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_asana_tasks",
        {
            description: "List tasks from Asana project or assignee. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                project: z.string().optional().describe("Project GID to list tasks from"),
                assignee: z.string().optional().describe("Assignee user GID to filter tasks by"),
                completed_since: z.string().optional().describe("ISO date to filter completed tasks since")
            }
        },
        async ({ user_id = null, project = null, assignee = null, completed_since = null }) => {
            try {
                const result = await asanaTools.listTasks(user_id, project, assignee, completed_since);
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
                        text: `Error listing Asana tasks: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "update_asana_task",
        {
            description: "Update an existing Asana task. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                task_gid: z.string().describe("Task GID to update"),
                name: z.string().optional().describe("New task name"),
                notes: z.string().optional().describe("New task description/notes"),
                assignee: z.string().optional().describe("New assignee user GID"),
                due_on: z.string().optional().describe("New due date in YYYY-MM-DD format")
            }
        },
        async ({ user_id = null, task_gid, name = null, notes = null, assignee = null, due_on = null }) => {
            try {
                const result = await asanaTools.updateTask(user_id, task_gid, name, notes, assignee, due_on);
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
                        text: `Error updating Asana task: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "complete_asana_task",
        {
            description: "Mark an Asana task as completed. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                task_gid: z.string().describe("Task GID to complete")
            }
        },
        async ({ user_id = null, task_gid }) => {
            try {
                const result = await asanaTools.completeTask(user_id, task_gid);
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
                        text: `Error completing Asana task: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_asana_sections",
        {
            description: "List sections in an Asana project",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from"),
                project_gid: z.string().describe("Project GID to list sections from")
            }
        },
        async ({ user_id = null, project_gid }) => {
            try {
                const result = await asanaTools.listSections(user_id, project_gid);
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
                        text: `Error listing Asana sections: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "add_task_to_asana_section",
        {
            description: "Add a task to a specific section in Asana. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                task_gid: z.string().describe("Task GID to move"),
                section_gid: z.string().describe("Section GID to add task to")
            }
        },
        async ({ user_id = null, task_gid, section_gid }) => {
            try {
                const result = await asanaTools.addTaskToSection(user_id, task_gid, section_gid);
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
                        text: `Error adding task to Asana section: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_asana_user_info",
        {
            description: "Get current user information from Asana. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used.")
            }
        },
        async ({ user_id = null }) => {
            try {
                const result = await asanaTools.getUserInfoAsana(user_id);
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
                        text: `Error getting Asana user info: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_asana_workspace_id",
        {
            description: "Get workspace ID from Asana. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used.")
            }
        },
        async ({ user_id = null }) => {
            
            try {
                const result = await asanaTools.getWorkspaceId(user_id);
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
                        text: `Error getting Asana workspace ID: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "create_asana_team",
        {
            description: "Create a new team in Asana. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                name: z.string().describe("Team name"),
                description: z.string().optional().describe("Team description"),
                organization: z.string().describe("Organization GID to create team in")
            }
        },
        async ({ user_id = null, name, description = null, organization }) => {
            try {
                const result = await asanaTools.createTeam(user_id, name, description, organization);
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
                        text: `Error creating Asana team: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "list_asana_team_ids",
        {
            description: "List team IDs in Asana workspace. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                workspace: z.string().optional().describe("Workspace GID to list teams from")
            }
        },
        async ({ user_id = null, workspace = null }) => {
            try {
                const result = await asanaTools.listTeamIds(user_id, workspace);
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
                        text: `Error listing Asana team IDs: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_asana_team",
        {
            description: "Get details of a specific Asana team. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                team_gid: z.string().describe("Team GID to retrieve")
            }
        },
        async ({ user_id = null, team_gid }) => {
            try {
                const result = await asanaTools.getTeam(user_id, team_gid);
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
                        text: `Error getting Asana team: ${error.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_asana_task",
        {
            description: "Get details of a specific Asana task. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Asana access token from. If not provided, the default user will be used."),
                task_gid: z.string().describe("Task GID to retrieve")
            }
        },
        async ({ user_id = null, task_gid }) => {
            try {
                const result = await asanaTools.getTask(user_id, task_gid);
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
                        text: `Error getting Asana task: ${error.message}`
                    }]
                };
            }
        }
    );

    // Register GitHub tools
    server.registerTool(
        "get_github_repositories",
        {
            description: "Get repositories for a GitHub user. All the fields are optional.",
            inputSchema: {
                username: z.string().describe("GitHub username"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Create a new branch in a GitHub repository. All the fields are optional.",
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
            description: "Get recent commits from a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                branch: z.string().optional().describe("Branch name (default: main)"),
                hours_back: z.number().optional().describe("Hours to look back for commits (default: 24)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get information about a GitHub user. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get detailed information about a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get all branches in a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get issues from a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                state: z.string().optional().describe("Issue state: open, closed, or all (default: open)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Create a pull request in a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                title: z.string().optional().describe("Pull request title"),
                body: z.string().optional().describe("Pull request body"),
                head: z.string().optional().describe("Branch to merge from"),
                base: z.string().optional().describe("Branch to merge into"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.") 
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
            description: "Get details of a specific pull request. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                pull_number: z.number().describe("Pull request number"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get pull requests from a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                state: z.string().optional().describe("Pull request state: open, closed, or all (default: open)"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Get tags or branches from a GitHub repository. All the fields are optional.",
            inputSchema: {
                owner: z.string().describe("Repository owner"),
                repo: z.string().describe("Repository name"),
                type: z.string().describe("Type to get: tags or branches"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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
            description: "Search GitHub globally for repositories, users, or commits. All the fields are optional.",
            inputSchema: {
                query: z.string().describe("Search query"),
                search_type: z.string().describe("Type of search: repositories, users, or commits"),
                user_id: z.string().optional().describe("User ID to get GitHub access token from. If not provided, the default user will be used.")
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

    // CALENDLY
    // Register Calendly tools
    // server.registerTool(
    //     "get_calendly_user_info",
    //     {
    //         description: "Get current Calendly user information",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await calendlyTools.getCalendlyUserInfo(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Calendly user info: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_calendly_event_types",
    //     {
    //         description: "List all event types for the current Calendly user",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             organization_uri: z.string().optional().describe("Organization URI to filter by"),
    //             count: z.number().optional().describe("Number of results per page (default: 20, max: 100)"),
    //             page_token: z.string().optional().describe("Page token for pagination")
    //         }
    //     },
    //     async ({ user_id = null, organization_uri = null, count = 20, page_token = null }) => {
    //         try {
    //             const result = await calendlyTools.listCalendlyEventTypes(user_id, organization_uri, count, page_token);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Calendly event types: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_calendly_event_type",
    //     {
    //         description: "Get details of a specific Calendly event type",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             event_type_uri: z.string().describe("Event type URI or ID")
    //         }
    //     },
    //     async ({ user_id = null, event_type_uri }) => {
    //         try {
    //             const result = await calendlyTools.getCalendlyEventType(user_id, event_type_uri);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Calendly event type: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_scheduled_calendly_events",
    //     {
    //         description: "Get scheduled events from Calendly",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             organization_uri: z.string().optional().describe("Organization URI to filter by"),
    //             user_uri: z.string().optional().describe("User URI to filter events"),
    //             status: z.string().optional().describe("Event status filter (active, canceled) - default: active"),
    //             min_start_time: z.string().optional().describe("Minimum start time (ISO 8601)"),
    //             max_start_time: z.string().optional().describe("Maximum start time (ISO 8601)"),
    //             count: z.number().optional().describe("Number of results per page (default: 20, max: 100)"),
    //             page_token: z.string().optional().describe("Page token for pagination")
    //         }
    //     },
    //     async ({ user_id = null, organization_uri = null, user_uri = null, status = 'active', min_start_time = null, max_start_time = null, count = 20, page_token = null }) => {
    //         try {
    //             const result = await calendlyTools.getScheduledCalendlyEvents(user_id, organization_uri, user_uri, status, min_start_time, max_start_time, count, page_token);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting scheduled Calendly events: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_calendly_event_details",
    //     {
    //         description: "Get detailed information about a specific Calendly event including invitees",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             event_uri: z.string().describe("Event URI or ID")
    //         }
    //     },
    //     async ({ user_id = null, event_uri }) => {
    //         try {
    //             const result = await calendlyTools.getCalendlyEventDetails(user_id, event_uri);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Calendly event details: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "cancel_calendly_event",
    //     {
    //         description: "Cancel a scheduled Calendly event",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             event_uri: z.string().describe("Event URI or ID to cancel"),
    //             reason: z.string().optional().describe("Cancellation reason")
    //         }
    //     },
    //     async ({ user_id = null, event_uri, reason = null }) => {
    //         try {
    //             const result = await calendlyTools.cancelCalendlyEvent(user_id, event_uri, reason);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error canceling Calendly event: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_calendly_webhook_subscription",
    //     {
    //         description: "Create a webhook subscription for Calendly events",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             url: z.string().describe("Webhook URL to receive notifications"),
    //             events: z.array(z.string()).optional().describe("Array of events to subscribe to (default: invitee.created, invitee.canceled)"),
    //             organization_uri: z.string().optional().describe("Organization URI (required for organization scope)"),
    //             user_uri: z.string().optional().describe("User URI (optional for user scope)"),
    //             scope: z.string().optional().describe("Subscription scope (user or organization) - default: user")
    //         }
    //     },
    //     async ({ user_id = null, url, events = ['invitee.created', 'invitee.canceled'], organization_uri = null, user_uri = null, scope = 'user' }) => {
    //         try {
    //             const result = await calendlyTools.createCalendlyWebhookSubscription(user_id, url, events, organization_uri, user_uri, scope);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Calendly webhook subscription: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_calendly_webhook_subscriptions",
    //     {
    //         description: "List all Calendly webhook subscriptions",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             organization_uri: z.string().optional().describe("Organization URI to filter by"),
    //             scope: z.string().optional().describe("Filter by scope (user, organization)"),
    //             user_uri: z.string().optional().describe("User URI to filter by"),
    //             count: z.number().optional().describe("Number of results per page (default: 20, max: 100)"),
    //             page_token: z.string().optional().describe("Page token for pagination")
    //         }
    //     },
    //     async ({ user_id = null, organization_uri = null, scope = null, user_uri = null, count = 20, page_token = null }) => {
    //         try {
    //             const result = await calendlyTools.listCalendlyWebhookSubscriptions(user_id, organization_uri, scope, user_uri, count, page_token);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Calendly webhook subscriptions: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "delete_calendly_webhook_subscription",
    //     {
    //         description: "Delete a Calendly webhook subscription",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             webhook_uri: z.string().describe("Webhook subscription URI or ID to delete")
    //         }
    //     },
    //     async ({ user_id = null, webhook_uri }) => {
    //         try {
    //             const result = await calendlyTools.deleteCalendlyWebhookSubscription(user_id, webhook_uri);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deleting Calendly webhook subscription: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_calendly_scheduling_link",
    //     {
    //         description: "Create a single-use scheduling link for a Calendly event type",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             event_type_uri: z.string().describe("Event type URI to create link for"),
    //             prefill_data: z.object({}).optional().describe("Data to prefill (name, email, etc.)")
    //         }
    //     },
    //     async ({ user_id = null, event_type_uri, prefill_data = {} }) => {
    //         try {
    //             const result = await calendlyTools.createCalendlySchedulingLink(user_id, event_type_uri, prefill_data);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Calendly scheduling link: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_calendly_organization_memberships",
    //     {
    //         description: "List organization memberships in Calendly",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Calendly access token from"),
    //             organization_uri: z.string().optional().describe("Organization URI to filter by"),
    //             email: z.string().optional().describe("Filter by email address"),
    //             count: z.number().optional().describe("Number of results per page (default: 20, max: 100)"),
    //             page_token: z.string().optional().describe("Page token for pagination")
    //         }
    //     },
    //     async ({ user_id = null, organization_uri = null, email = null, count = 20, page_token = null }) => {
    //         try {
    //             const result = await calendlyTools.listCalendlyOrganizationMemberships(user_id, organization_uri, email, count, page_token);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Calendly organization memberships: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Register Airtable tools
    // server.registerTool(
    //     "list_airtable_bases",
    //     {
    //         description: "List all Airtable bases available to the user's PAT token.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Airtable access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await airtableTools.list_airtable_bases(user_id);
    //             return { content: [{ type: "text", text: result }] };
    //         } catch (error) {
    //             return { content: [{ type: "text", text: `Error listing Airtable bases: ${error.message}` }] };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_airtable_tables",
    //     {
    //         description: "List all tables in a specific Airtable base.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Airtable access token from"),
    //             base_id: z.string().describe("Airtable base ID")
    //         }
    //     },
    //     async ({ user_id = null, base_id }) => {
    //         try {
    //             const result = await airtableTools.list_airtable_tables(user_id, base_id);
    //             return { content: [{ type: "text", text: result }] };
    //         } catch (error) {
    //             return { content: [{ type: "text", text: `Error listing Airtable tables: ${error.message}` }] };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_airtable_records",
    //     {
    //         description: "List records from an Airtable table.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Airtable access token from"),
    //             base_id: z.string().describe("Airtable base ID"),
    //             table_name: z.string().describe("Airtable table name"),
    //             max_records: z.number().optional().describe("Maximum number of records to return (default 10)")
    //         }
    //     },
    //     async ({ user_id = null, base_id, table_name, max_records = 10 }) => {
    //         try {
    //             const result = await airtableTools.list_airtable_records(user_id, base_id, table_name, max_records);
    //             return { content: [{ type: "text", text: result }] };
    //         } catch (error) {
    //             return { content: [{ type: "text", text: `Error listing Airtable records: ${error.message}` }] };
    //         }
    //     }
    // );

    // Register MongoDB tools
    server.registerTool(
        "connect_to_mongodb",
        {
            description: "Connect to a MongoDB instance and test the connection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)")
            }
        },
        async ({ user_id = null, database_name = null }) => {

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
            description: "Find documents in a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
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
            description: "Run an aggregation pipeline on a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
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
            description: "Count documents in a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
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
            description: "Insert a single document into a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
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
            description: "Insert multiple documents into a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
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
            description: "Update a single document in a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
                filter_query: z.any().optional().describe("Query to match documents (optional)"),
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
            description: "Update multiple documents in a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
                filter_query: z.any().optional().describe("Query to match documents (optional)"),
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
            description: "Delete a single document from a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
                filter_query: z.any().optional().describe("Query to match document to delete (optional)")
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
            description: "Delete multiple documents from a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
                collection_name: z.string().optional().describe("Collection name"),
                filter_query: z.any().optional().describe("Query to match documents to delete (optional)")
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
            description: "List all databases for a MongoDB connection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used.")
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
            description: "List all collections for a given database. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)")
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
            description: "Create an index on a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
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
            description: "List all indexes for a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
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
            description: "Drop a MongoDB collection. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)"),
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
            description: "Get database statistics for a MongoDB database. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get MongoDB connection string from. If not provided, the default user will be used."),
                database_name: z.string().optional().describe("Database name (optional)")
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

    // Register Stripe tools
    // server.registerTool(
    //     "get_stripe_account_info",
    //     {
    //         description: "Get Stripe account information",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await stripeTools.getStripeAccountInfo(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Stripe account info: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "retrieve_balance",
    //     {
    //         description: "Retrieve Stripe account balance",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await stripeTools.retrieveBalance(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error retrieving Stripe balance: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_coupon",
    //     {
    //         description: "Create a new coupon in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             percent_off: z.number().optional().describe("Percent off the price (mutually exclusive with amount_off)"),
    //             amount_off: z.number().optional().describe("Amount off in cents (mutually exclusive with percent_off)"),
    //             currency: z.string().optional().describe("Currency for amount_off (default: usd)"),
    //             duration: z.string().optional().describe("Duration type (once, repeating, forever)"),
    //             duration_in_months: z.number().optional().describe("Duration in months for repeating coupons"),
    //             max_redemptions: z.number().optional().describe("Maximum number of times this coupon can be redeemed"),
    //             redeem_by: z.number().optional().describe("Timestamp after which the coupon can no longer be redeemed"),
    //             additional_params: z.object({}).optional().describe("Additional coupon parameters")
    //         }
    //     },
    //     async ({ user_id = null, percent_off = null, amount_off = null, currency = 'usd', duration = 'once', duration_in_months = null, max_redemptions = null, redeem_by = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createCoupon(user_id, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions, redeem_by, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe coupon: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_coupons",
    //     {
    //         description: "List all coupons in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of coupons to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null }) => {
    //         try {
    //             const result = await stripeTools.listCoupons(user_id, limit, starting_after, ending_before);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe coupons: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_customer",
    //     {
    //         description: "Create a new customer in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             email: z.string().optional().describe("Customer's email address"),
    //             name: z.string().optional().describe("Customer's full name"),
    //             phone: z.string().optional().describe("Customer's phone number"),
    //             description: z.string().optional().describe("Description of the customer"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the customer"),
    //             additional_params: z.object({}).optional().describe("Additional customer parameters")
    //         }
    //     },
    //     async ({ user_id = null, email = null, name = null, phone = null, description = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createCustomer(user_id, email, name, phone, description, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe customer: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_customers",
    //     {
    //         description: "List all customers in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of customers to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             email: z.string().optional().describe("Filter by email address")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, email = null }) => {
    //         try {
    //             const result = await stripeTools.listCustomers(user_id, limit, starting_after, ending_before, email);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe customers: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_disputes",
    //     {
    //         description: "List all disputes in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of disputes to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null }) => {
    //         try {
    //             const result = await stripeTools.listDisputes(user_id, limit, starting_after, ending_before);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe disputes: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "update_dispute",
    //     {
    //         description: "Update a dispute in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             dispute_id: z.string().describe("ID of the dispute to update"),
    //             evidence: z.object({}).optional().describe("Evidence to submit for the dispute"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the dispute"),
    //             additional_params: z.object({}).optional().describe("Additional dispute parameters")
    //         }
    //     },
    //     async ({ user_id = null, dispute_id, evidence = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.updateDispute(user_id, dispute_id, evidence, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error updating Stripe dispute: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_invoice",
    //     {
    //         description: "Create a new invoice in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             customer: z.string().describe("Customer ID for the invoice"),
    //             description: z.string().optional().describe("Description of the invoice"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the invoice"),
    //             additional_params: z.object({}).optional().describe("Additional invoice parameters")
    //         }
    //     },
    //     async ({ user_id = null, customer, description = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createInvoice(user_id, customer, description, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe invoice: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_invoice_item",
    //     {
    //         description: "Create a new invoice item in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             customer: z.string().describe("Customer ID for the invoice item"),
    //             amount: z.number().describe("Amount in cents"),
    //             currency: z.string().optional().describe("Currency (default: usd)"),
    //             description: z.string().optional().describe("Description of the invoice item"),
    //             invoice: z.string().optional().describe("Invoice ID to add this item to"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the invoice item"),
    //             additional_params: z.object({}).optional().describe("Additional invoice item parameters")
    //         }
    //     },
    //     async ({ user_id = null, customer, amount, currency = 'usd', description = null, invoice = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createInvoiceItem(user_id, customer, amount, currency, description, invoice, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe invoice item: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "finalize_invoice",
    //     {
    //         description: "Finalize an invoice in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             invoice_id: z.string().describe("ID of the invoice to finalize"),
    //             auto_advance: z.boolean().optional().describe("Whether to auto-advance the invoice")
    //         }
    //     },
    //     async ({ user_id = null, invoice_id, auto_advance = null }) => {
    //         try {
    //             const result = await stripeTools.finalizeInvoice(user_id, invoice_id, auto_advance);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error finalizing Stripe invoice: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_invoices",
    //     {
    //         description: "List all invoices in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of invoices to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             customer: z.string().optional().describe("Filter by customer ID")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, customer = null }) => {
    //         try {
    //             const result = await stripeTools.listInvoices(user_id, limit, starting_after, ending_before, customer);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe invoices: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_payment_link",
    //     {
    //         description: "Create a new payment link in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             line_items: z.array(z.object({})).describe("Array of line items for the payment link"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the payment link"),
    //             additional_params: z.object({}).optional().describe("Additional payment link parameters")
    //         }
    //     },
    //     async ({ user_id = null, line_items, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createPaymentLink(user_id, line_items, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe payment link: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_payment_intents",
    //     {
    //         description: "List all payment intents in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of payment intents to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             customer: z.string().optional().describe("Filter by customer ID")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, customer = null }) => {
    //         try {
    //             const result = await stripeTools.listPaymentIntents(user_id, limit, starting_after, ending_before, customer);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe payment intents: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_price",
    //     {
    //         description: "Create a new price in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             currency: z.string().describe("Currency for the price"),
    //             product: z.string().optional().describe("Product ID for the price"),
    //             unit_amount: z.number().optional().describe("Unit amount in cents"),
    //             recurring: z.object({}).optional().describe("Recurring billing configuration"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the price"),
    //             additional_params: z.object({}).optional().describe("Additional price parameters")
    //         }
    //     },
    //     async ({ user_id = null, currency, product = null, unit_amount = null, recurring = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createPrice(user_id, currency, product, unit_amount, recurring, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe price: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_prices",
    //     {
    //         description: "List all prices in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of prices to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             product: z.string().optional().describe("Filter by product ID")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, product = null }) => {
    //         try {
    //             const result = await stripeTools.listPrices(user_id, limit, starting_after, ending_before, product);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe prices: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_product",
    //     {
    //         description: "Create a new product in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             name: z.string().describe("Name of the product"),
    //             description: z.string().optional().describe("Description of the product"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the product"),
    //             additional_params: z.object({}).optional().describe("Additional product parameters")
    //         }
    //     },
    //     async ({ user_id = null, name, description = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createProduct(user_id, name, description, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe product: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_products",
    //     {
    //         description: "List all products in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of products to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null }) => {
    //         try {
    //             const result = await stripeTools.listProducts(user_id, limit, starting_after, ending_before);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe products: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_refund",
    //     {
    //         description: "Create a refund in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             charge: z.string().optional().describe("Charge ID to refund"),
    //             payment_intent: z.string().optional().describe("Payment intent ID to refund"),
    //             amount: z.number().optional().describe("Amount to refund in cents"),
    //             reason: z.string().optional().describe("Reason for the refund"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the refund"),
    //             additional_params: z.object({}).optional().describe("Additional refund parameters")
    //         }
    //     },
    //     async ({ user_id = null, charge = null, payment_intent = null, amount = null, reason = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createRefund(user_id, charge, payment_intent, amount, reason, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Stripe refund: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "cancel_subscription",
    //     {
    //         description: "Cancel a subscription in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             subscription_id: z.string().describe("ID of the subscription to cancel"),
    //             at_period_end: z.boolean().optional().describe("Whether to cancel at the end of the current period")
    //         }
    //     },
    //     async ({ user_id = null, subscription_id, at_period_end = false }) => {
    //         try {
    //             const result = await stripeTools.cancelSubscription(user_id, subscription_id, at_period_end);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error canceling Stripe subscription: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_subscriptions",
    //     {
    //         description: "List all subscriptions in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of subscriptions to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             customer: z.string().optional().describe("Filter by customer ID"),
    //             status: z.string().optional().describe("Filter by subscription status")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, customer = null, status = null }) => {
    //         try {
    //             const result = await stripeTools.listSubscriptions(user_id, limit, starting_after, ending_before, customer, status);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Stripe subscriptions: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "update_subscription",
    //     {
    //         description: "Update a subscription in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             subscription_id: z.string().describe("ID of the subscription to update"),
    //             items: z.array(z.object({})).optional().describe("Array of subscription items to update"),
    //             metadata: z.object({}).optional().describe("Additional metadata for the subscription"),
    //             additional_params: z.object({}).optional().describe("Additional subscription parameters")
    //         }
    //     },
    //     async ({ user_id = null, subscription_id, items = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.updateSubscription(user_id, subscription_id, items, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error updating Stripe subscription: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "search_documentation",
    //     {
    //         description: "Search Stripe documentation (placeholder function)",
    //         inputSchema: {
    //             query: z.string().describe("Search query for Stripe documentation")
    //         }
    //     },
    //     async ({ query }) => {
    //         try {
    //             const result = await stripeTools.searchDocumentation(query);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error searching Stripe documentation: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Payment Intent tools
    // server.registerTool(
    //     "create_payment_intent",
    //     {
    //         description: "Create a new payment intent in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             amount: z.number().describe("Amount in smallest currency unit (e.g., cents)"),
    //             currency: z.string().optional().describe("Three-letter ISO currency code (default: usd)"),
    //             customer: z.string().optional().describe("Customer ID"),
    //             description: z.string().optional().describe("Description for the payment"),
    //             metadata: z.object({}).optional().describe("Additional metadata"),
    //             additional_params: z.object({}).optional().describe("Additional payment intent parameters")
    //         }
    //     },
    //     async ({ user_id = null, amount, currency = 'usd', customer = null, description = null, metadata = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.createPaymentIntent(user_id, amount, currency, customer, description, metadata, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating payment intent: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "retrieve_payment_intent",
    //     {
    //         description: "Retrieve a payment intent from Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_intent_id: z.string().describe("ID of the payment intent to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, payment_intent_id }) => {
    //         try {
    //             const result = await stripeTools.retrievePaymentIntent(user_id, payment_intent_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error retrieving payment intent: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "confirm_payment_intent",
    //     {
    //         description: "Confirm a payment intent in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_intent_id: z.string().describe("ID of the payment intent to confirm"),
    //             payment_method: z.string().optional().describe("Payment method ID"),
    //             additional_params: z.object({}).optional().describe("Additional confirmation parameters")
    //         }
    //     },
    //     async ({ user_id = null, payment_intent_id, payment_method = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.confirmPaymentIntent(user_id, payment_intent_id, payment_method, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error confirming payment intent: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "cancel_payment_intent",
    //     {
    //         description: "Cancel a payment intent in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_intent_id: z.string().describe("ID of the payment intent to cancel"),
    //             cancellation_reason: z.string().optional().describe("Reason for cancellation")
    //         }
    //     },
    //     async ({ user_id = null, payment_intent_id, cancellation_reason = null }) => {
    //         try {
    //             const result = await stripeTools.cancelPaymentIntent(user_id, payment_intent_id, cancellation_reason);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error canceling payment intent: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Charge tools
    // server.registerTool(
    //     "retrieve_charge",
    //     {
    //         description: "Retrieve a charge from Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             charge_id: z.string().describe("ID of the charge to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, charge_id }) => {
    //         try {
    //             const result = await stripeTools.retrieveCharge(user_id, charge_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error retrieving charge: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_charges",
    //     {
    //         description: "List all charges in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of charges to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             customer: z.string().optional().describe("Filter by customer ID")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, customer = null }) => {
    //         try {
    //             const result = await stripeTools.listCharges(user_id, limit, starting_after, ending_before, customer);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing charges: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "capture_charge",
    //     {
    //         description: "Capture a charge in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             charge_id: z.string().describe("ID of the charge to capture"),
    //             amount: z.number().optional().describe("Amount to capture (optional, captures full amount if not specified)"),
    //             additional_params: z.object({}).optional().describe("Additional capture parameters")
    //         }
    //     },
    //     async ({ user_id = null, charge_id, amount = null, additional_params = {} }) => {
    //         try {
    //             const result = await stripeTools.captureCharge(user_id, charge_id, amount, additional_params);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error capturing charge: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Payment Method tools
    // server.registerTool(
    //     "create_payment_method",
    //     {
    //         description: "Create a new payment method in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             type: z.string().describe("Type of payment method (e.g., 'card')"),
    //             card: z.object({}).optional().describe("Card details for card payment methods"),
    //             billing_details: z.object({}).optional().describe("Billing details"),
    //             metadata: z.object({}).optional().describe("Additional metadata")
    //         }
    //     },
    //     async ({ user_id = null, type, card = null, billing_details = null, metadata = null }) => {
    //         try {
    //             const result = await stripeTools.createPaymentMethod(user_id, type, card, billing_details, metadata);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating payment method: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "attach_payment_method",
    //     {
    //         description: "Attach a payment method to a customer in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_method_id: z.string().describe("ID of the payment method to attach"),
    //             customer_id: z.string().describe("ID of the customer to attach to")
    //         }
    //     },
    //     async ({ user_id = null, payment_method_id, customer_id }) => {
    //         try {
    //             const result = await stripeTools.attachPaymentMethod(user_id, payment_method_id, customer_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error attaching payment method: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "detach_payment_method",
    //     {
    //         description: "Detach a payment method from a customer in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_method_id: z.string().describe("ID of the payment method to detach")
    //         }
    //     },
    //     async ({ user_id = null, payment_method_id }) => {
    //         try {
    //             const result = await stripeTools.detachPaymentMethod(user_id, payment_method_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error detaching payment method: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_payment_methods",
    //     {
    //         description: "List payment methods for a customer in Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             customer_id: z.string().describe("ID of the customer"),
    //             type: z.string().optional().describe("Filter by payment method type"),
    //             limit: z.number().optional().describe("Maximum number of payment methods to return (default: 10)")
    //         }
    //     },
    //     async ({ user_id = null, customer_id, type = null, limit = 10 }) => {
    //         try {
    //             const result = await stripeTools.listPaymentMethods(user_id, customer_id, type, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing payment methods: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "retrieve_payment_method",
    //     {
    //         description: "Retrieve a payment method from Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             payment_method_id: z.string().describe("ID of the payment method to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, payment_method_id }) => {
    //         try {
    //             const result = await stripeTools.retrievePaymentMethod(user_id, payment_method_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error retrieving payment method: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // Event and Webhook tools
    // server.registerTool(
    //     "list_events",
    //     {
    //         description: "List events from Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             limit: z.number().optional().describe("Maximum number of events to return (default: 10, max: 100)"),
    //             starting_after: z.string().optional().describe("Pagination cursor for starting after"),
    //             ending_before: z.string().optional().describe("Pagination cursor for ending before"),
    //             type: z.string().optional().describe("Filter by event type")
    //         }
    //     },
    //     async ({ user_id = null, limit = 10, starting_after = null, ending_before = null, type = null }) => {

    //         try {
    //             const result = await stripeTools.listEvents(user_id, limit, starting_after, ending_before, type);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing events: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "retrieve_event",
    //     {
    //         description: "Retrieve an event from Stripe",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Stripe secret key from"),
    //             event_id: z.string().describe("ID of the event to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, event_id }) => {
    //         try {
    //             const result = await stripeTools.retrieveEvent(user_id, event_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error retrieving event: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Register n8n tools
    // server.registerTool(
    //     "list_n8n_workflows",
    //     {
    //         description: "List all workflows in the n8n instance.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             limit: z.number().optional().describe("Maximum number of workflows to return (default: 100)")
    //         }
    //     },
    //     async ({ user_id = null, limit = 100 }) => {
    //         try {
    //             const result = await n8nTools.listN8nWorkflows(user_id, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing n8n workflows: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_n8n_workflow",
    //     {
    //         description: "Get details of a specific n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id }) => {
    //         try {
    //             const result = await n8nTools.getN8nWorkflow(user_id, workflow_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_n8n_workflow",
    //     {
    //         description: "Create a new n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             name: z.string().describe("Name of the workflow"),
    //             nodes: z.array(z.object({})).describe("List of nodes in the workflow"),
    //             connections: z.object({}).optional().describe("Connections between nodes"),
    //             active: z.boolean().optional().describe("Whether the workflow should be active (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, name, nodes, connections = null, active = false }) => {
    //         try {
    //             const result = await n8nTools.createN8nWorkflow(user_id, name, nodes, connections, active);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "update_n8n_workflow",
    //     {
    //         description: "Update an existing n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to update"),
    //             name: z.string().optional().describe("New name for the workflow"),
    //             nodes: z.array(z.object({})).optional().describe("Updated list of nodes"),
    //             connections: z.object({}).optional().describe("Updated connections"),
    //             active: z.boolean().optional().describe("Whether the workflow should be active")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id, name = null, nodes = null, connections = null, active = null }) => {
    //         try {
    //             const result = await n8nTools.updateN8nWorkflow(user_id, workflow_id, name, nodes, connections, active);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error updating n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "delete_n8n_workflow",
    //     {
    //         description: "Delete an n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to delete")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id }) => {
    //         try {
    //             const result = await n8nTools.deleteN8nWorkflow(user_id, workflow_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deleting n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "activate_n8n_workflow",
    //     {
    //         description: "Activate an n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to activate")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id }) => {
    //         try {
    //             const result = await n8nTools.activateN8nWorkflow(user_id, workflow_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error activating n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "deactivate_n8n_workflow",
    //     {
    //         description: "Deactivate an n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to deactivate")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id }) => {
    //         try {
    //             const result = await n8nTools.deactivateN8nWorkflow(user_id, workflow_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deactivating n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_n8n_executions",
    //     {
    //         description: "List workflow executions in n8n.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().optional().describe("Optional workflow ID to filter executions"),
    //             limit: z.number().optional().describe("Maximum number of executions to return (default: 100)")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id = null, limit = 100 }) => {
    //         try {
    //             const result = await n8nTools.listN8nExecutions(user_id, workflow_id, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing n8n executions: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_n8n_execution",
    //     {
    //         description: "Get details of a specific n8n execution.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             execution_id: z.string().describe("ID of the execution to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, execution_id }) => {
    //         try {
    //             const result = await n8nTools.getN8nExecution(user_id, execution_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting n8n execution: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "execute_n8n_workflow",
    //     {
    //         description: "Execute an n8n workflow.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             workflow_id: z.string().describe("ID of the workflow to execute"),
    //             input_data: z.object({}).optional().describe("Optional input data for the workflow")
    //         }
    //     },
    //     async ({ user_id = null, workflow_id, input_data = null }) => {
    //         try {
    //             const result = await n8nTools.executeN8nWorkflow(user_id, workflow_id, input_data);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error executing n8n workflow: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_n8n_credentials",
    //     {
    //         description: "List all credentials in n8n.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await n8nTools.listN8nCredentials(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing n8n credentials: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_n8n_credential",
    //     {
    //         description: "Get details of a specific n8n credential.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             credential_id: z.string().describe("ID of the credential to retrieve")
    //         }
    //     },
    //     async ({ user_id = null, credential_id }) => {
    //         try {
    //             const result = await n8nTools.getN8nCredential(user_id, credential_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting n8n credential: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_n8n_user_info",
    //     {
    //         description: "Get current n8n user information.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await n8nTools.getN8nUserInfo(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting n8n user info: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_n8n_webhooks",
    //     {
    //         description: "List all webhooks in n8n.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await n8nTools.listN8nWebhooks(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing n8n webhooks: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_n8n_tags",
    //     {
    //         description: "List all tags in n8n.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await n8nTools.listN8nTags(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing n8n tags: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_n8n_tag",
    //     {
    //         description: "Create a new tag in n8n.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get n8n API key from"),
    //             name: z.string().describe("Name of the tag")
    //         }
    //     },
    //     async ({ user_id = null, name }) => {
    //         try {
    //             const result = await n8nTools.createN8nTag(user_id, name);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating n8n tag: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

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
            description: "Create a new Zoom meeting with optional invitees. Invitees will receive email invitations automatically. All the fields are optional.",
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
            description: "Get detailed information about a specific Zoom meeting. All the fields are optional.",
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
            description: "Update an existing Zoom meeting. All the fields are optional.",
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
            description: "Delete a Zoom meeting. All the fields are optional.",
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
            description: "Generate a calendar invitation text for a Zoom meeting with invitee details and setup instructions. All the fields are optional.",
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
            description: "Invite people to an existing Zoom meeting by providing their email addresses. Attempts API invitation first, then provides manual sharing details if needed. All the fields are optional.",
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

    // // Register Dropbox tools
    // server.registerTool(
    //     "get_dropbox_account",
    //     {
    //         description: "Get current Dropbox account information.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await dropboxTools.getCurrentAccount(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Dropbox account info: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_dropbox_space_usage",
    //     {
    //         description: "Get Dropbox space usage information.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await dropboxTools.getSpaceUsage(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Dropbox space usage: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_dropbox_folder",
    //     {
    //         description: "List contents of a Dropbox folder.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().optional().describe("Folder path (empty for root folder)"),
    //             recursive: z.boolean().optional().describe("Whether to list recursively (default: false)"),
    //             limit: z.number().optional().describe("Maximum number of entries to return (default: 100)")
    //         }
    //     },
    //     async ({ user_id = null, path = '', recursive = false, limit = 100 }) => {
    //         try {
    //             const result = await dropboxTools.listFolder(user_id, path, recursive, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Dropbox folder: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_dropbox_metadata",
    //     {
    //         description: "Get metadata for a Dropbox file or folder.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().describe("File or folder path")
    //         }
    //     },
    //     async ({ user_id = null, path }) => {
    //         try {
    //             const result = await dropboxTools.getMetadata(user_id, path);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Dropbox metadata: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_dropbox_folder",
    //     {
    //         description: "Create a new folder in Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().describe("Path for the new folder"),
    //             autorename: z.boolean().optional().describe("Whether to autorename if folder exists (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, path, autorename = false }) => {
    //         try {
    //             const result = await dropboxTools.createFolder(user_id, path, autorename);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Dropbox folder: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "delete_dropbox_item",
    //     {
    //         description: "Delete a file or folder from Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().describe("Path to delete")
    //         }
    //     },
    //     async ({ user_id = null, path }) => {
    //         try {
    //             const result = await dropboxTools.deleteFileOrFolder(user_id, path);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deleting Dropbox item: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "move_dropbox_item",
    //     {
    //         description: "Move or rename a file or folder in Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             from_path: z.string().describe("Source path"),
    //             to_path: z.string().describe("Destination path"),
    //             autorename: z.boolean().optional().describe("Whether to autorename if destination exists (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, from_path, to_path, autorename = false }) => {
    //         try {
    //             const result = await dropboxTools.moveFileOrFolder(user_id, from_path, to_path, autorename);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error moving Dropbox item: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "copy_dropbox_item",
    //     {
    //         description: "Copy a file or folder in Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             from_path: z.string().describe("Source path"),
    //             to_path: z.string().describe("Destination path"),
    //             autorename: z.boolean().optional().describe("Whether to autorename if destination exists (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, from_path, to_path, autorename = false }) => {
    //         try {
    //             const result = await dropboxTools.copyFileOrFolder(user_id, from_path, to_path, autorename);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error copying Dropbox item: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "search_dropbox_files",
    //     {
    //         description: "Search for files and folders in Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             query: z.string().describe("Search query"),
    //             path: z.string().optional().describe("Path to search in (optional)"),
    //             max_results: z.number().optional().describe("Maximum number of results (default: 50)")
    //         }
    //     },
    //     async ({ user_id = null, query, path = '', max_results = 50 }) => {
    //         try {
    //             const result = await dropboxTools.searchFiles(user_id, query, path, max_results);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error searching Dropbox files: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_dropbox_shared_link",
    //     {
    //         description: "Create a shared link for a Dropbox file or folder.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().describe("Path to share"),
    //             settings: z.object({
    //                 requested_visibility: z.string().optional().describe("Visibility setting (public, team_only, password)"),
    //                 link_password: z.string().optional().describe("Password for the link"),
    //                 expires: z.string().optional().describe("Expiration date (ISO 8601 format)")
    //             }).optional().describe("Sharing settings")
    //         }
    //     },
    //     async ({ user_id = null, path, settings = {} }) => {
    //         try {
    //             const result = await dropboxTools.createSharedLink(user_id, path, settings);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Dropbox shared link: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_dropbox_shared_links",
    //     {
    //         description: "List shared links in Dropbox.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Dropbox access token from"),
    //             path: z.string().optional().describe("Path to list shared links for (optional)")
    //         }
    //     },
    //     async ({ user_id = null, path = '' }) => {
    //         try {
    //             const result = await dropboxTools.listSharedLinks(user_id, path);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Dropbox shared links: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Register ClickUp tools
    // server.registerTool(
    //     "get_clickup_workspaces",
    //     {
    //         description: "Get authorized workspaces (teams) for the user in ClickUp.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await clickupTools.getAuthorizedWorkspaces(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp workspaces: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_spaces",
    //     {
    //         description: "Get spaces in a ClickUp workspace.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             team_id: z.string().describe("Workspace (team) ID"),
    //             archived: z.boolean().optional().describe("Include archived spaces (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, team_id, archived = false }) => {
    //         try {
    //             const result = await clickupTools.getSpaces(user_id, team_id, archived);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp spaces: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_folders",
    //     {
    //         description: "Get folders in a ClickUp space.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             space_id: z.string().describe("Space ID"),
    //             archived: z.boolean().optional().describe("Include archived folders (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, space_id, archived = false }) => {
    //         try {
    //             const result = await clickupTools.getFolders(user_id, space_id, archived);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp folders: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_lists",
    //     {
    //         description: "Get lists in a ClickUp folder or space.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             folder_id: z.string().optional().describe("Folder ID (optional)"),
    //             space_id: z.string().optional().describe("Space ID (required if no folder)"),
    //             archived: z.boolean().optional().describe("Include archived lists (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, folder_id = null, space_id = null, archived = false }) => {
    //         try {
    //             const result = await clickupTools.getLists(user_id, folder_id, space_id, archived);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp lists: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_tasks",
    //     {
    //         description: "Get tasks from a ClickUp list.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             list_id: z.string().describe("List ID"),
    //             archived: z.boolean().optional().describe("Include archived tasks (default: false)"),
    //             page: z.number().optional().describe("Page number for pagination (default: 0)"),
    //             subtasks: z.boolean().optional().describe("Include subtasks (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, list_id, archived = false, page = 0, subtasks = false }) => {
    //         try {
    //             const result = await clickupTools.getTasks(user_id, list_id, archived, page, subtasks);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp tasks: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_task",
    //     {
    //         description: "Get a specific ClickUp task by ID.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             task_id: z.string().describe("Task ID"),
    //             include_subtasks: z.boolean().optional().describe("Include subtasks in response (default: false)")
    //         }
    //     },
    //     async ({ user_id = null, task_id, include_subtasks = false }) => {
    //         try {
    //             const result = await clickupTools.getTask(user_id, task_id, include_subtasks);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp task: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_clickup_task",
    //     {
    //         description: "Create a new task in ClickUp.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             list_id: z.string().describe("List ID where task will be created"),
    //             name: z.string().describe("Task name"),
    //             description: z.string().optional().describe("Task description"),
    //             assignees: z.array(z.string()).optional().describe("Array of user IDs to assign"),
    //             priority: z.number().optional().describe("Priority level (1=Urgent, 2=High, 3=Normal, 4=Low)"),
    //             due_date: z.string().optional().describe("Due date in milliseconds"),
    //             status: z.string().optional().describe("Task status")
    //         }
    //     },
    //     async ({ user_id = null, list_id, name, description = '', assignees = [], priority = null, due_date = null, status = null }) => {
    //         try {
    //             const result = await clickupTools.createTask(user_id, list_id, name, description, assignees, priority, due_date, status);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating ClickUp task: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "update_clickup_task",
    //     {
    //         description: "Update an existing ClickUp task.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             task_id: z.string().describe("Task ID to update"),
    //             updates: z.object({}).describe("Object containing fields to update")
    //         }
    //     },
    //     async ({ user_id = null, task_id, updates = {} }) => {
    //         try {
    //             const result = await clickupTools.updateTask(user_id, task_id, updates);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error updating ClickUp task: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "delete_clickup_task",
    //     {
    //         description: "Delete a ClickUp task.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             task_id: z.string().describe("Task ID to delete")
    //         }
    //     },
    //     async ({ user_id = null, task_id }) => {
    //         try {
    //             const result = await clickupTools.deleteTask(user_id, task_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deleting ClickUp task: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_task_comments",
    //     {
    //         description: "Get comments on a ClickUp task.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             task_id: z.string().describe("Task ID")
    //         }
    //     },
    //     async ({ user_id = null, task_id }) => {
    //         try {
    //             const result = await clickupTools.getTaskComments(user_id, task_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp task comments: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_clickup_task_comment",
    //     {
    //         description: "Create a comment on a ClickUp task.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             task_id: z.string().describe("Task ID"),
    //             comment_text: z.string().describe("Comment text"),
    //             assignee: z.string().optional().describe("User ID to assign (optional)")
    //         }
    //     },
    //     async ({ user_id = null, task_id, comment_text, assignee = null }) => {
    //         try {
    //             const result = await clickupTools.createTaskComment(user_id, task_id, comment_text, assignee);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating ClickUp task comment: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_workspace_members",
    //     {
    //         description: "Get workspace members in ClickUp.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from"),
    //             team_id: z.string().describe("Workspace (team) ID")
    //         }
    //     },
    //     async ({ user_id = null, team_id }) => {
    //         try {
    //             const result = await clickupTools.getWorkspaceMembers(user_id, team_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp workspace members: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_clickup_user",
    //     {
    //         description: "Get ClickUp user information.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get ClickUp access token from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await clickupTools.getUser(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting ClickUp user: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // // Register Shopify tools
    // server.registerTool(
    //     "list_shopify_products",
    //     {
    //         description: "List products from Shopify store.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             limit: z.number().optional().describe("Maximum number of products to return (default: 50)"),
    //             status: z.string().optional().describe("Product status filter: active, archived, draft (default: active)")
    //         }
    //     },
    //     async ({ user_id = null, limit = 50, status = 'active' }) => {
    //         try {
    //             const result = await shopifyTools.listShopifyProducts(user_id, limit, status);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Shopify products: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_shopify_product",
    //     {
    //         description: "Get detailed information about a specific Shopify product.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             product_id: z.string().describe("Product ID")
    //         }
    //     },
    //     async ({ user_id = null, product_id }) => {
    //         try {
    //             const result = await shopifyTools.getShopifyProduct(user_id, product_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Shopify product: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "create_shopify_product",
    //     {
    //         description: "Create a new product in Shopify.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             title: z.string().describe("Product title"),
    //             description: z.string().optional().describe("Product description"),
    //             vendor: z.string().optional().describe("Product vendor"),
    //             product_type: z.string().optional().describe("Product type"),
    //             variants: z.array(z.object({})).optional().describe("Product variants array")
    //         }
    //     },
    //     async ({ user_id = null, title, description = '', vendor = '', product_type = '', variants = [] }) => {
    //         try {
    //             const result = await shopifyTools.createShopifyProduct(user_id, title, description, vendor, product_type, variants);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error creating Shopify product: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "update_shopify_product",
    //     {
    //         description: "Update an existing Shopify product.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             product_id: z.string().describe("Product ID to update"),
    //             update_data: z.object({}).describe("Data to update")
    //         }
    //     },
    //     async ({ user_id = null, product_id, update_data }) => {
    //         try {
    //             const result = await shopifyTools.updateShopifyProduct(user_id, product_id, update_data);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error updating Shopify product: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "delete_shopify_product",
    //     {
    //         description: "Delete a Shopify product.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             product_id: z.string().describe("Product ID to delete")
    //         }
    //     },
    //     async ({ user_id = null, product_id }) => {
    //         try {
    //             const result = await shopifyTools.deleteShopifyProduct(user_id, product_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error deleting Shopify product: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_shopify_orders",
    //     {
    //         description: "List orders from Shopify store.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             limit: z.number().optional().describe("Maximum number of orders to return (default: 50)"),
    //             status: z.string().optional().describe("Order status filter (default: any)")
    //         }
    //     },
    //     async ({ user_id = null, limit = 50, status = 'any' }) => {
    //         try {
    //             const result = await shopifyTools.listShopifyOrders(user_id, limit, status);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Shopify orders: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_shopify_order",
    //     {
    //         description: "Get detailed information about a specific Shopify order.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             order_id: z.string().describe("Order ID")
    //         }
    //     },
    //     async ({ user_id = null, order_id }) => {
    //         try {
    //             const result = await shopifyTools.getShopifyOrder(user_id, order_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Shopify order: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "list_shopify_customers",
    //     {
    //         description: "List customers from Shopify store.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             limit: z.number().optional().describe("Maximum number of customers to return (default: 50)")
    //         }
    //     },
    //     async ({ user_id = null, limit = 50 }) => {
    //         try {
    //             const result = await shopifyTools.listShopifyCustomers(user_id, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error listing Shopify customers: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_shopify_customer",
    //     {
    //         description: "Get detailed information about a specific Shopify customer.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             customer_id: z.string().describe("Customer ID")
    //         }
    //     },
    //     async ({ user_id = null, customer_id }) => {
    //         try {
    //             const result = await shopifyTools.getShopifyCustomer(user_id, customer_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Shopify customer: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "get_shopify_shop_info",
    //     {
    //         description: "Get Shopify shop information.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from")
    //         }
    //     },
    //     async ({ user_id = null }) => {
    //         try {
    //             const result = await shopifyTools.getShopifyShopInfo(user_id);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error getting Shopify shop info: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // server.registerTool(
    //     "search_shopify_products",
    //     {
    //         description: "Search products in Shopify store by title or other criteria.",
    //         inputSchema: {
    //             user_id: z.string().optional().describe("User ID to get Shopify credentials from"),
    //             query: z.string().describe("Search query"),
    //             limit: z.number().optional().describe("Maximum number of results (default: 20)")
    //         }
    //     },
    //     async ({ user_id = null, query, limit = 20 }) => {
    //         try {
    //             const result = await shopifyTools.searchShopifyProducts(user_id, query, limit);
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: result
    //                 }]
    //             };
    //         } catch (error) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error searching Shopify products: ${error.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );

    // Register Gmail tools
    server.registerTool(
        "search_gmail_messages",
        {
            description: "Search Gmail messages using Gmail search syntax. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from. If not provided, the default user will be used."),
                query: z.string().optional().describe("Gmail search query. If not provided, all messages will be returned."),
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
            description: "Get the full content of a specific Gmail message. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from. If not provided, the default user will be used."),
                message_id: z.string().optional().describe("Gmail message ID")
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
            description: "Get content of multiple Gmail messages in batch. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from. If not provided, the default user will be used."),
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
            description: "Send an email through Gmail. All the fields are optional.",
            inputSchema: {
                user_id: z.string().optional().describe("User ID to get Gmail access token from. If not provided, the default user will be used."),
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
            description: "Create a draft email in Gmail. All the fields are optional.",
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
            description: "Get content of multiple Gmail threads in batch. All the fields are optional.",
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
            description: "List all Gmail labels (both system and user-created). All the fields are optional.",
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
            description: "Create, update, or delete Gmail labels. All the fields are optional.",
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
            description: "Add or remove labels from a Gmail message. All the fields are optional.",
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
            description: "Add or remove labels from multiple Gmail messages in batch. All the fields are optional.",
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
            description: "Search Google Drive files using Drive search syntax. All the fields are optional.",
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
            description: "Get the content of a specific Google Drive file. All the fields are optional.",
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
            description: "Lists files and folders, supporting shared drives. If `drive_id` is specified, lists items within that shared drive. `folder_id` is then relative to that drive (or use drive_id as folder_id for root). If `drive_id` is not specified, lists items from user's \"My Drive\" and accessible shared drives (if `include_items_from_all_drives` is True). All the fields are optional.",
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
            description: "Create a new file in Google Drive. All the fields are optional.",
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
            description: "List Google Drive shared drives. All the fields are optional.",
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
            description: "Delete a file from Google Drive. All the fields are optional.",
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
            description: "List Google Calendar calendars. All the fields are optional.",
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
            description: "Get events from a Google Calendar. All the fields are optional.",
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
            description: "Create a new event in Google Calendar. All the fields are optional.",
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
            description: "Modify an existing event in Google Calendar. All the fields are optional.",
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
            description: "Delete an event from Google Calendar. All the fields are optional.",
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
            description: "Get a specific event from Google Calendar. All the fields are optional.",
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
            description: "Search for events in Google Calendar. All the fields are optional.",
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
    app.get('/mcp', (req, res) => {
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