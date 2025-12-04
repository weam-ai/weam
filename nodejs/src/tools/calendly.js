/**
 * Calendly MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const axios = require('axios');
const User = require('../models/user');
const { decryptedData } = require('../utils/helper');
const { ENCRYPTION_KEY } = require('../config/config');

const CALENDLY_API_BASE = process.env.CALENDLY_API_BASE || 'https://api.calendly.com';

/**
 * Make a request to the Calendly API
 * @param {string} endpoint - The API endpoint
 * @param {string} calendlyToken - Calendly access token
 * @param {Object} params - Query parameters
 * @param {Object} jsonData - JSON data for POST/PATCH requests
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @returns {Object|null} API response data
 */
async function makeCalendlyRequest(endpoint, calendlyToken, params = null, jsonData = null, method = 'GET') {
    const headers = {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json'
    };

    try {
        let response;
        const url = `${CALENDLY_API_BASE}/${endpoint}`;

        if (method === 'GET') {
            response = await axios.get(url, { headers, params, timeout: 30000 });
        } else if (method === 'POST') {
            response = await axios.post(url, jsonData, { headers, params, timeout: 30000 });
        } else if (method === 'PATCH') {
            response = await axios.patch(url, jsonData, { headers, params, timeout: 30000 });
        } else if (method === 'DELETE') {
            response = await axios.delete(url, { headers, timeout: 30000 });
        }

        return response.data;
    } catch (error) {
        console.error('Calendly API Error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Get Calendly access token from user's MCP data
 * @param {string} userId - User ID
 * @returns {string|null} Calendly access token or null if not found
 */
async function getCalendlyAccessToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.mcpdata || !user.mcpdata.CALENDLY || !user.mcpdata.CALENDLY.access_token) {
            return null;
        }
        // Decrypt the access token before returning
        const decryptedToken = decryptedData(user.mcpdata.CALENDLY.access_token);
        console.log('========Calendly decryptedToken========', decryptedToken);
        return decryptedToken;
    } catch (error) {
        console.error('Error fetching Calendly access token:', error.message);
        return null;
    }
}

/**
 * Get current user information from Calendly
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted user information
 */
async function getCalendlyUserInfo(userId = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const endpoint = 'users/me';
    const data = await makeCalendlyRequest(endpoint, accessToken);
    
    if (!data) {
        return 'Failed to fetch user info from Calendly API';
    }
    
    if (data.message || data.error) {
        return `Failed to get user info: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const user = data.resource;
    if (!user) {
        return 'No user data found';
    }

    let result = `Current User Information:\n`;
    result += `Name: ${user.name || 'Not provided'}\n`;
    result += `Email: ${user.email || 'Not provided'}\n`;
    result += `Slug: ${user.slug || 'Not provided'}\n`;
    result += `URI: ${user.uri || 'Not provided'}\n`;
    result += `Scheduling URL: ${user.scheduling_url || 'Not provided'}\n`;
    result += `Timezone: ${user.timezone || 'Not provided'}\n`;
    result += `Avatar URL: ${user.avatar_url || 'Not provided'}\n`;
    result += `Created: ${user.created_at || 'Unknown'}\n`;
    result += `Updated: ${user.updated_at || 'Unknown'}\n`;
    result += `Current Organization: ${user.current_organization || 'None'}`;

    return result;
}

/**
 * List all event types for the current user
 * @param {string} userId - User ID to get access token from
 * @param {string} organizationUri - Organization URI (optional)
 * @param {number} count - Number of results per page (default 20, max 100)
 * @param {string} pageToken - Page token for pagination
 * @returns {string} Formatted event types list
 */
async function listCalendlyEventTypes(userId = null, organizationUri = null, count = 20, pageToken = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const params = {
        count: Math.min(count, 100)
    };
    
    if (organizationUri) params.organization = organizationUri;
    if (pageToken) params.page_token = pageToken;

    const endpoint = 'event_types';
    const data = await makeCalendlyRequest(endpoint, accessToken, params);
    
    if (!data) {
        return 'Failed to fetch event types from Calendly API';
    }
    
    if (data.message || data.error) {
        return `Error fetching event types: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const eventTypes = data.collection || [];
    if (eventTypes.length === 0) {
        return 'No event types found';
    }

    let result = `Found ${eventTypes.length} event types:\n\n`;
    
    for (const eventType of eventTypes) {
        result += `Name: ${eventType.name || 'Unknown'}\n`;
        result += `URI: ${eventType.uri || 'Unknown'}\n`;
        result += `Duration: ${eventType.duration || 'Unknown'} minutes\n`;
        result += `Description: ${eventType.description_plain || eventType.description_html || 'No description'}\n`;
        result += `Slug: ${eventType.slug || 'Unknown'}\n`;
        result += `Scheduling URL: ${eventType.scheduling_url || 'Not available'}\n`;
        result += `Status: ${eventType.active ? 'Active' : 'Inactive'}\n`;
        result += `Type: ${eventType.type || 'Unknown'}\n`;
        result += `Color: ${eventType.color || 'Not specified'}\n`;
        result += `Created: ${eventType.created_at || 'Unknown'}\n`;
        result += `Updated: ${eventType.updated_at || 'Unknown'}\n`;
        result += '---\n';
    }

    if (data.pagination?.next_page_token) {
        result += `\nNext page token: ${data.pagination.next_page_token}`;
    }

    return result;
}

/**
 * Get details of a specific event type
 * @param {string} userId - User ID to get access token from
 * @param {string} eventTypeUri - Event type URI
 * @returns {string} Formatted event type details
 */
async function getCalendlyEventType(userId = null, eventTypeUri) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!eventTypeUri) {
        return 'Error: Event type URI is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    // Extract UUID from URI if full URI is provided
    let eventTypeId = eventTypeUri;
    if (eventTypeUri.includes('/event_types/')) {
        eventTypeId = eventTypeUri.split('/event_types/').pop();
    }

    const endpoint = `event_types/${eventTypeId}`;
    const data = await makeCalendlyRequest(endpoint, accessToken);
    
    if (!data) {
        return `Failed to fetch event type details for: ${eventTypeUri}`;
    }
    
    if (data.message || data.error) {
        return `Error fetching event type: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const eventType = data.resource;
    if (!eventType) {
        return 'No event type data found';
    }

    let result = `Event Type Details:\n`;
    result += `Name: ${eventType.name || 'Unknown'}\n`;
    result += `URI: ${eventType.uri || 'Unknown'}\n`;
    result += `Duration: ${eventType.duration || 'Unknown'} minutes\n`;
    result += `Description: ${eventType.description_plain || eventType.description_html || 'No description'}\n`;
    result += `Slug: ${eventType.slug || 'Unknown'}\n`;
    result += `Scheduling URL: ${eventType.scheduling_url || 'Not available'}\n`;
    result += `Status: ${eventType.active ? 'Active' : 'Inactive'}\n`;
    result += `Type: ${eventType.type || 'Unknown'}\n`;
    result += `Color: ${eventType.color || 'Not specified'}\n`;
    result += `Created: ${eventType.created_at || 'Unknown'}\n`;
    result += `Updated: ${eventType.updated_at || 'Unknown'}\n`;
    
    if (eventType.profile) {
        result += `\nProfile Information:\n`;
        result += `Owner: ${eventType.profile.name || 'Unknown'}\n`;
        result += `Owner URI: ${eventType.profile.owner || 'Unknown'}\n`;
        result += `Profile Type: ${eventType.profile.type || 'Unknown'}\n`;
    }

    return result;
}

/**
 * Get scheduled events
 * @param {string} userId - User ID to get access token from
 * @param {string} organizationUri - Organization URI (optional)
 * @param {string} userUri - User URI to filter events (optional)
 * @param {string} status - Event status filter (active, canceled)
 * @param {string} minStartTime - Minimum start time (ISO 8601)
 * @param {string} maxStartTime - Maximum start time (ISO 8601)
 * @param {number} count - Number of results per page (default 20, max 100)
 * @param {string} pageToken - Page token for pagination
 * @returns {string} Formatted scheduled events list
 */
async function getScheduledCalendlyEvents(userId = null, organizationUri = null, userUri = null, status = 'active', minStartTime = null, maxStartTime = null, count = 20, pageToken = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const params = {
        count: Math.min(count, 100)
    };
    
    if (organizationUri) params.organization = organizationUri;
    if (userUri) params.user = userUri;
    if (status) params.status = status;
    if (minStartTime) params.min_start_time = minStartTime;
    if (maxStartTime) params.max_start_time = maxStartTime;
    if (pageToken) params.page_token = pageToken;

    const endpoint = 'scheduled_events';
    const data = await makeCalendlyRequest(endpoint, accessToken, params);
    
    if (!data) {
        return 'Failed to fetch scheduled events from Calendly API';
    }
    
    if (data.message || data.error) {
        return `Error fetching scheduled events: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const events = data.collection || [];
    if (events.length === 0) {
        return `No ${status} scheduled events found`;
    }

    let result = `Found ${events.length} ${status} scheduled events:\n\n`;
    
    for (const event of events) {
        result += `Name: ${event.name || 'Unknown'}\n`;
        result += `URI: ${event.uri || 'Unknown'}\n`;
        result += `Status: ${event.status || 'Unknown'}\n`;
        result += `Start Time: ${event.start_time || 'Unknown'}\n`;
        result += `End Time: ${event.end_time || 'Unknown'}\n`;
        result += `Event Type: ${event.event_type || 'Unknown'}\n`;
        result += `Location: ${event.location ? event.location.type + (event.location.location ? ` - ${event.location.location}` : '') : 'Not specified'}\n`;
        result += `Invitees Counter: ${event.invitees_counter ? `${event.invitees_counter.total} total, ${event.invitees_counter.active} active, ${event.invitees_counter.limit} limit` : 'Not available'}\n`;
        result += `Created: ${event.created_at || 'Unknown'}\n`;
        result += `Updated: ${event.updated_at || 'Unknown'}\n`;
        result += '---\n';
    }

    if (data.pagination?.next_page_token) {
        result += `\nNext page token: ${data.pagination.next_page_token}`;
    }

    return result;
}

/**
 * Get event details including invitees
 * @param {string} userId - User ID to get access token from
 * @param {string} eventUri - Event URI
 * @returns {string} Formatted event details
 */
async function getCalendlyEventDetails(userId = null, eventUri) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!eventUri) {
        return 'Error: Event URI is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    // Extract UUID from URI if full URI is provided
    let eventId = eventUri;
    if (eventUri.includes('/scheduled_events/')) {
        eventId = eventUri.split('/scheduled_events/').pop();
    }

    const endpoint = `scheduled_events/${eventId}`;
    const data = await makeCalendlyRequest(endpoint, accessToken);
    
    if (!data) {
        return `Failed to fetch event details for: ${eventUri}`;
    }
    
    if (data.message || data.error) {
        return `Error fetching event details: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const event = data.resource;
    if (!event) {
        return 'No event data found';
    }

    let result = `Event Details:\n`;
    result += `Name: ${event.name || 'Unknown'}\n`;
    result += `URI: ${event.uri || 'Unknown'}\n`;
    result += `Status: ${event.status || 'Unknown'}\n`;
    result += `Start Time: ${event.start_time || 'Unknown'}\n`;
    result += `End Time: ${event.end_time || 'Unknown'}\n`;
    result += `Event Type: ${event.event_type || 'Unknown'}\n`;
    result += `Location: ${event.location ? event.location.type + (event.location.location ? ` - ${event.location.location}` : '') : 'Not specified'}\n`;
    result += `Invitees Counter: ${event.invitees_counter ? `${event.invitees_counter.total} total, ${event.invitees_counter.active} active, ${event.invitees_counter.limit} limit` : 'Not available'}\n`;
    result += `Created: ${event.created_at || 'Unknown'}\n`;
    result += `Updated: ${event.updated_at || 'Unknown'}\n`;

    // Get invitees for this event
    try {
        const inviteesEndpoint = `scheduled_events/${eventId}/invitees`;
        const inviteesData = await makeCalendlyRequest(inviteesEndpoint, accessToken);
        
        if (inviteesData && inviteesData.collection) {
            result += `\nInvitees (${inviteesData.collection.length}):\n`;
            for (const invitee of inviteesData.collection) {
                result += `  - ${invitee.name || 'Unknown'} (${invitee.email || 'No email'})\n`;
                result += `    Status: ${invitee.status || 'Unknown'}\n`;
                result += `    URI: ${invitee.uri || 'Unknown'}\n`;
            }
        }
    } catch (error) {
        result += '\nCould not fetch invitees information.';
    }

    return result;
}

/**
 * Cancel a scheduled event
 * @param {string} userId - User ID to get access token from
 * @param {string} eventUri - Event URI
 * @param {string} reason - Cancellation reason (optional)
 * @returns {string} Cancellation result
 */
async function cancelCalendlyEvent(userId = null, eventUri, reason = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!eventUri) {
        return 'Error: Event URI is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    // Extract UUID from URI if full URI is provided
    let eventId = eventUri;
    if (eventUri.includes('/scheduled_events/')) {
        eventId = eventUri.split('/scheduled_events/').pop();
    }

    const jsonData = {};
    if (reason) {
        jsonData.reason = reason;
    }

    const endpoint = `scheduled_events/${eventId}/cancellation`;
    const data = await makeCalendlyRequest(endpoint, accessToken, null, jsonData, 'POST');
    
    if (!data) {
        return `Failed to cancel event: ${eventUri}`;
    }
    
    if (data.message || data.error) {
        return `Error canceling event: ${data.message || data.error || 'Unknown error'}`;
    }

    return `Event successfully canceled.\nCancellation URI: ${data.resource?.uri || 'Not provided'}`;
}

/**
 * Create a webhook subscription
 * @param {string} userId - User ID to get access token from
 * @param {string} url - Webhook URL to receive notifications
 * @param {Array} events - Array of events to subscribe to (invitee.created, invitee.canceled)
 * @param {string} organizationUri - Organization URI (required for organization scope)
 * @param {string} userUri - User URI (optional for user scope)
 * @param {string} scope - Subscription scope (user or organization)
 * @returns {string} Webhook subscription result
 */
async function createCalendlyWebhookSubscription(userId = null, url, events = ['invitee.created', 'invitee.canceled'], organizationUri = null, userUri = null, scope = 'user') {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!url) {
        return 'Error: Webhook URL is required';
    }
    
    if (!events || events.length === 0) {
        return 'Error: At least one event type is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const jsonData = {
        url: url,
        events: events,
        scope: scope
    };

    if (scope === 'organization' && organizationUri) {
        jsonData.organization = organizationUri;
    } else if (scope === 'user' && userUri) {
        jsonData.user = userUri;
    }

    const endpoint = 'webhook_subscriptions';
    const data = await makeCalendlyRequest(endpoint, accessToken, null, jsonData, 'POST');
    
    if (!data) {
        return 'Failed to create webhook subscription';
    }
    
    if (data.message || data.error) {
        return `Error creating webhook subscription: ${data.message || data.error || 'Unknown error'}`;
    }

    const webhook = data.resource;
    if (!webhook) {
        return 'Webhook created but no details returned';
    }

    let result = `Webhook Subscription Created:\n`;
    result += `URI: ${webhook.uri || 'Unknown'}\n`;
    result += `URL: ${webhook.url || url}\n`;
    result += `Events: ${webhook.events ? webhook.events.join(', ') : events.join(', ')}\n`;
    result += `Scope: ${webhook.scope || scope}\n`;
    result += `Organization: ${webhook.organization || 'Not specified'}\n`;
    result += `User: ${webhook.user || 'Not specified'}\n`;
    result += `State: ${webhook.state || 'Unknown'}\n`;
    result += `Created: ${webhook.created_at || 'Unknown'}\n`;
    result += `Updated: ${webhook.updated_at || 'Unknown'}`;

    return result;
}

/**
 * List webhook subscriptions
 * @param {string} userId - User ID to get access token from
 * @param {string} organizationUri - Organization URI (optional)
 * @param {string} scope - Filter by scope (user, organization)
 * @param {string} userUri - User URI (optional)
 * @param {number} count - Number of results per page (default 20, max 100)
 * @param {string} pageToken - Page token for pagination
 * @returns {string} Formatted webhook subscriptions list
 */
async function listCalendlyWebhookSubscriptions(userId = null, organizationUri = null, scope = null, userUri = null, count = 20, pageToken = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const params = {
        count: Math.min(count, 100)
    };
    
    if (organizationUri) params.organization = organizationUri;
    if (scope) params.scope = scope;
    if (userUri) params.user = userUri;
    if (pageToken) params.page_token = pageToken;

    const endpoint = 'webhook_subscriptions';
    const data = await makeCalendlyRequest(endpoint, accessToken, params);
    
    if (!data) {
        return 'Failed to fetch webhook subscriptions from Calendly API';
    }
    
    if (data.message || data.error) {
        return `Error fetching webhook subscriptions: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const webhooks = data.collection || [];
    if (webhooks.length === 0) {
        return 'No webhook subscriptions found';
    }

    let result = `Found ${webhooks.length} webhook subscriptions:\n\n`;
    
    for (const webhook of webhooks) {
        result += `URI: ${webhook.uri || 'Unknown'}\n`;
        result += `URL: ${webhook.url || 'Unknown'}\n`;
        result += `Events: ${webhook.events ? webhook.events.join(', ') : 'None'}\n`;
        result += `Scope: ${webhook.scope || 'Unknown'}\n`;
        result += `Organization: ${webhook.organization || 'Not specified'}\n`;
        result += `User: ${webhook.user || 'Not specified'}\n`;
        result += `State: ${webhook.state || 'Unknown'}\n`;
        result += `Created: ${webhook.created_at || 'Unknown'}\n`;
        result += `Updated: ${webhook.updated_at || 'Unknown'}\n`;
        result += '---\n';
    }

    if (data.pagination?.next_page_token) {
        result += `\nNext page token: ${data.pagination.next_page_token}`;
    }

    return result;
}

/**
 * Delete a webhook subscription
 * @param {string} userId - User ID to get access token from
 * @param {string} webhookUri - Webhook subscription URI
 * @returns {string} Deletion result
 */
async function deleteCalendlyWebhookSubscription(userId = null, webhookUri) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!webhookUri) {
        return 'Error: Webhook subscription URI is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    // Extract UUID from URI if full URI is provided
    let webhookId = webhookUri;
    if (webhookUri.includes('/webhook_subscriptions/')) {
        webhookId = webhookUri.split('/webhook_subscriptions/').pop();
    }

    const endpoint = `webhook_subscriptions/${webhookId}`;
    const response = await makeCalendlyRequest(endpoint, accessToken, null, null, 'DELETE');
    
    // For DELETE requests, success is typically indicated by status code (204)
    // If we get here without an error, it likely succeeded
    if (response === null || response === '') {
        return `Webhook subscription successfully deleted: ${webhookUri}`;
    }
    
    if (response && (response.message || response.error)) {
        return `Error deleting webhook subscription: ${response.message || response.error || 'Unknown error'}`;
    }

    return `Webhook subscription successfully deleted: ${webhookUri}`;
}

/**
 * Create a single-use scheduling link
 * @param {string} userId - User ID to get access token from
 * @param {string} eventTypeUri - Event type URI
 * @param {Object} prefillData - Data to prefill (name, email, etc.)
 * @returns {string} Scheduling link result
 */
async function createCalendlySchedulingLink(userId = null, eventTypeUri, prefillData = {}) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }
    
    if (!eventTypeUri) {
        return 'Error: Event type URI is required';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const jsonData = {
        max_event_count: 1, // Single-use link
        owner: eventTypeUri
    };

    // Add prefill data if provided
    if (Object.keys(prefillData).length > 0) {
        jsonData.pool = [prefillData];
    }

    const endpoint = 'scheduling_links';
    const data = await makeCalendlyRequest(endpoint, accessToken, null, jsonData, 'POST');
    
    if (!data) {
        return 'Failed to create scheduling link';
    }
    
    if (data.message || data.error) {
        return `Error creating scheduling link: ${data.message || data.error || 'Unknown error'}`;
    }

    const link = data.resource;
    if (!link) {
        return 'Scheduling link created but no details returned';
    }

    let result = `Single-use Scheduling Link Created:\n`;
    result += `URI: ${link.uri || 'Unknown'}\n`;
    result += `Booking URL: ${link.booking_url || 'Unknown'}\n`;
    result += `Owner: ${link.owner || eventTypeUri}\n`;
    result += `Max Event Count: ${link.max_event_count || 1}\n`;
    result += `Created: ${link.created_at || 'Unknown'}\n`;
    result += `Updated: ${link.updated_at || 'Unknown'}`;

    return result;
}

/**
 * List organization memberships
 * @param {string} userId - User ID to get access token from
 * @param {string} organizationUri - Organization URI (optional)
 * @param {string} email - Filter by email (optional)
 * @param {number} count - Number of results per page (default 20, max 100)
 * @param {string} pageToken - Page token for pagination
 * @returns {string} Formatted organization memberships list
 */
async function listCalendlyOrganizationMemberships(userId = null, organizationUri = null, email = null, count = 20, pageToken = null) {
    if (!userId) {
        return 'Error: User ID is required. Please provide user authentication.';
    }

    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
        return 'Error: Calendly access token not found. Please configure your Calendly integration in your profile settings.';
    }

    const params = {
        count: Math.min(count, 100)
    };
    
    if (organizationUri) params.organization = organizationUri;
    if (email) params.email = email;
    if (pageToken) params.page_token = pageToken;

    const endpoint = 'organization_memberships';
    const data = await makeCalendlyRequest(endpoint, accessToken, params);
    
    if (!data) {
        return 'Failed to fetch organization memberships from Calendly API';
    }
    
    if (data.message || data.error) {
        return `Error fetching organization memberships: ${data.message || data.error || 'Unknown error'}`;
    }
    
    const memberships = data.collection || [];
    if (memberships.length === 0) {
        return 'No organization memberships found';
    }

    let result = `Found ${memberships.length} organization memberships:\n\n`;
    
    for (const membership of memberships) {
        result += `URI: ${membership.uri || 'Unknown'}\n`;
        result += `Role: ${membership.role || 'Unknown'}\n`;
        result += `Organization: ${membership.organization || 'Unknown'}\n`;
        result += `User Name: ${membership.user?.name || 'Unknown'}\n`;
        result += `User Email: ${membership.user?.email || 'Unknown'}\n`;
        result += `User URI: ${membership.user?.uri || 'Unknown'}\n`;
        result += `User Slug: ${membership.user?.slug || 'Unknown'}\n`;
        result += `Created: ${membership.created_at || 'Unknown'}\n`;
        result += `Updated: ${membership.updated_at || 'Unknown'}\n`;
        result += '---\n';
    }

    if (data.pagination?.next_page_token) {
        result += `\nNext page token: ${data.pagination.next_page_token}`;
    }

    return result;
}

module.exports = {
    getCalendlyUserInfo,
    listCalendlyEventTypes,
    getCalendlyEventType,
    getScheduledCalendlyEvents,
    getCalendlyEventDetails,
    cancelCalendlyEvent,
    createCalendlyWebhookSubscription,
    listCalendlyWebhookSubscriptions,
    deleteCalendlyWebhookSubscription,
    createCalendlySchedulingLink,
    listCalendlyOrganizationMemberships
};