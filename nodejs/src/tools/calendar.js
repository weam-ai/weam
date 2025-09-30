/**
 * Google Calendar MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const { getAuthenticatedCalendarService, handleGoogleApiErrors, GoogleAuthenticationError } = require('../utils/google-auth');

/**
 * Correct time format for Google Calendar API (RFC3339)
 * @param {string} timeString - Time string to format
 * @returns {string} RFC3339 formatted time string
 */
function correctTimeFormatForApi(timeString) {
  if (!timeString) return null;
  
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch (error) {
    // Try to parse common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/, // YYYY-MM-DD HH:MM
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/ // YYYY-MM-DD HH:MM:SS
    ];
    
    for (const format of formats) {
      const match = timeString.match(format);
      if (match) {
        const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.toISOString();
      }
    }
    
    return timeString; // Return as-is if no format matches
  }
}

/**
 * Format calendar information
 * @param {Object} calendar - Calendar object
 * @returns {string} Formatted calendar information
 */
function formatCalendar(calendar) {
  let result = `**${calendar.summary}**\n`;
  result += `  ID: ${calendar.id}\n`;
  
  if (calendar.description) {
    result += `  Description: ${calendar.description}\n`;
  }
  
  if (calendar.timeZone) {
    result += `  Timezone: ${calendar.timeZone}\n`;
  }
  
  if (calendar.accessRole) {
    result += `  Access: ${calendar.accessRole}\n`;
  }
  
  result += '\n';
  return result;
}

/**
 * Format event information
 * @param {Object} event - Event object
 * @returns {string} Formatted event information
 */
function formatEvent(event) {
  let result = `**${event.summary || 'Untitled Event'}**\n`;
  result += `  ID: ${event.id}\n`;
  
  if (event.start) {
    const startTime = event.start.dateTime || event.start.date;
    result += `  Start: ${new Date(startTime).toLocaleString()}\n`;
  }
  
  if (event.end) {
    const endTime = event.end.dateTime || event.end.date;
    result += `  End: ${new Date(endTime).toLocaleString()}\n`;
  }
  
  if (event.description) {
    result += `  Description: ${event.description}\n`;
  }
  
  if (event.location) {
    result += `  Location: ${event.location}\n`;
  }
  
  if (event.attendees && event.attendees.length > 0) {
    const attendeeList = event.attendees.map(a => `${a.email}${a.responseStatus ? ` (${a.responseStatus})` : ''}`).join(', ');
    result += `  Attendees: ${attendeeList}\n`;
  }
  
  if (event.creator) {
    result += `  Creator: ${event.creator.email}\n`;
  }
  
  if (event.htmlLink) {
    result += `  Link: ${event.htmlLink}\n`;
  }
  
  result += '\n';
  return result;
}

/**
 * List calendars
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted calendars list
 */
async function listCalendars(userId) {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.calendarList.list({
        maxResults: 100,
        showDeleted: false,
        showHidden: false
      });
    }, 3, true, userId);
    
    const calendars = response.data.items || [];
    
    if (calendars.length === 0) {
      return 'No calendars found.';
    }
    
    let result = `**Google Calendars (${calendars.length} total)**\n\n`;
    
    // Separate primary and secondary calendars
    const primaryCalendars = calendars.filter(cal => cal.primary);
    const secondaryCalendars = calendars.filter(cal => !cal.primary);
    
    if (primaryCalendars.length > 0) {
      result += `**Primary Calendar:**\n`;
      for (const cal of primaryCalendars) {
        result += formatCalendar(cal);
      }
    }
    
    if (secondaryCalendars.length > 0) {
      result += `**Other Calendars:**\n`;
      for (const cal of secondaryCalendars) {
        result += formatCalendar(cal);
      }
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error listing calendars: ${error.message}`;
  }
}

/**
 * Get events from a calendar
 * @param {string} userId - User ID to get access token from
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @param {string} timeMin - Start time (ISO format)
 * @param {string} timeMax - End time (ISO format)
 * @param {number} maxResults - Maximum number of results
 * @returns {string} Formatted events list
 */
async function getEvents(userId, calendarId = 'primary', timeMin = null, timeMax = null, maxResults = 20) {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_read');
    
    // Set default time range if not provided (next 30 days)
    if (!timeMin) {
      timeMin = new Date().toISOString();
    } else {
      timeMin = correctTimeFormatForApi(timeMin);
    }
    
    if (!timeMax) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      timeMax = futureDate.toISOString();
    } else {
      timeMax = correctTimeFormatForApi(timeMax);
    }
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });
    }, 3, true, userId);
    
    const events = response.data.items || [];
    
    if (events.length === 0) {
      return `No events found in calendar "${calendarId}" for the specified time range.`;
    }
    
    let result = `**Calendar Events**\n`;
    result += `Calendar: ${calendarId}\n`;
    result += `Time Range: ${new Date(timeMin).toLocaleString()} - ${new Date(timeMax).toLocaleString()}\n`;
    result += `Found ${events.length} events\n\n`;
    
    for (const event of events) {
      result += formatEvent(event);
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error getting calendar events: ${error.message}`;
  }
}

/**
 * Create a calendar event
 * @param {string} userId - User ID to get access token from
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @param {string} summary - Event title
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {string} description - Event description (optional)
 * @param {string} location - Event location (optional)
 * @param {Array} attendees - Array of attendee email addresses (optional)
 * @param {Array} attachments - Array of attachment objects (optional)
 * @param {string} timezone - Timezone (optional)
 * @returns {string} Success message with event details
 */
async function createEvent(userId, calendarId = 'primary', summary, startTime, endTime, description = null, location = null, attendees = [], attachments = [], timezone = null) {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  if (!summary || !startTime || !endTime) {
    return 'Error: Summary, start time, and end time are required.';
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_write');
    
    // Format times
    const formattedStartTime = correctTimeFormatForApi(startTime);
    const formattedEndTime = correctTimeFormatForApi(endTime);
    
    // Build event object
    const event = {
      summary: summary,
      start: {
        dateTime: formattedStartTime,
        timeZone: timezone || 'UTC'
      },
      end: {
        dateTime: formattedEndTime,
        timeZone: timezone || 'UTC'
      }
    };
    
    if (description) {
      event.description = description;
    }
    
    if (location) {
      event.location = location;
    }
    
    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map(email => ({ email: email }));
    }
    
    if (attachments && attachments.length > 0) {
      event.attachments = attachments.map(attachment => {
        if (typeof attachment === 'string') {
          // If it's a string, treat it as a Google Drive file URL or ID
          const driveFileId = attachment.includes('drive.google.com') 
            ? attachment.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] 
            : attachment;
          
          return {
            fileUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
            title: `Attachment ${driveFileId}`
          };
        }
        return attachment;
      });
    }
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
        sendUpdates: 'all'
      });
    }, 3, false, userId);
    
    const createdEvent = response.data;
    
    let result = `**Event created successfully!**\n\n`;
    result += formatEvent(createdEvent);
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error creating calendar event: ${error.message}`;
  }
}

/**
 * Modify a calendar event
 * @param {string} userId - User ID to get access token from
 * @param {string} eventId - Event ID
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @param {string} summary - Event title (optional)
 * @param {string} startTime - Start time (optional)
 * @param {string} endTime - End time (optional)
 * @param {string} description - Event description (optional)
 * @param {string} location - Event location (optional)
 * @param {Array} attendees - Array of attendee email addresses (optional)
 * @param {string} timezone - Timezone (optional)
 * @returns {string} Success message with updated event details
 */
async function modifyEvent(userId, eventId, calendarId = 'primary', summary = null, startTime = null, endTime = null, description = null, location = null, attendees = null, timezone = null) {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  if (!eventId) {
    return 'Error: Event ID is required.';
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_write');
    
    // First, get the existing event
    const existingEventResponse = await handleGoogleApiErrors(async () => {
      return await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });
    }, 3, true, userId);
    
    const existingEvent = existingEventResponse.data;
    
    // Build update object with only provided fields
    const eventUpdate = { ...existingEvent };
    
    if (summary !== null) {
      eventUpdate.summary = summary;
    }
    
    if (startTime !== null) {
      eventUpdate.start = {
        dateTime: correctTimeFormatForApi(startTime),
        timeZone: timezone || existingEvent.start?.timeZone || 'UTC'
      };
    }
    
    if (endTime !== null) {
      eventUpdate.end = {
        dateTime: correctTimeFormatForApi(endTime),
        timeZone: timezone || existingEvent.end?.timeZone || 'UTC'
      };
    }
    
    if (description !== null) {
      eventUpdate.description = description;
    }
    
    if (location !== null) {
      eventUpdate.location = location;
    }
    
    if (attendees !== null) {
      eventUpdate.attendees = attendees.map(email => ({ email: email }));
    }
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: eventUpdate,
        sendUpdates: 'all'
      });
    }, 3, false, userId);
    
    const updatedEvent = response.data;
    
    let result = `**Event modified successfully!**\n\n`;
    result += formatEvent(updatedEvent);
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error modifying calendar event: ${error.message}`;
  }
}

/**
 * Delete a calendar event
 * @param {string} userId - User ID to get access token from
 * @param {string} eventId - Event ID
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @returns {string} Success or error message
 */
async function deleteEvent(userId, eventId, calendarId = 'primary') {

  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  if (!eventId) {
    return 'Error: Event ID is required.';
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_write');
    
    // First, get event details for confirmation
    const eventResponse = await handleGoogleApiErrors(async () => {
      return await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });
    }, 3, true, userId);
    
    const event = eventResponse.data;
    const eventTitle = event.summary || 'Untitled Event';
    
    // Delete the event
    await handleGoogleApiErrors(async () => {
      return await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'all'
      });
    }, 3, false, userId);
    
    return `Event "${eventTitle}" (ID: ${eventId}) deleted successfully from calendar "${calendarId}".`;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error deleting calendar event: ${error.message}`;
  }
}

/**
 * Get a single calendar event
 * @param {string} userId - User ID to get access token from
 * @param {string} eventId - Event ID
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @returns {string} Formatted event details
 */
async function getEvent(userId, eventId, calendarId = 'primary') {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  if (!eventId) {
    return 'Error: Event ID is required.';
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.events.get({
        calendarId: calendarId,
        eventId: eventId
      });
    }, 3, true, userId);
    
    const event = response.data;
    
    let result = `**Calendar Event Details**\n\n`;
    result += formatEvent(event);
    
    if (event.created) {
      result += `  Created: ${new Date(event.created).toLocaleString()}\n`;
    }
    
    if (event.updated) {
      result += `  Last Updated: ${new Date(event.updated).toLocaleString()}\n`;
    }
    
    if (event.status) {
      result += `  Status: ${event.status}\n`;
    }
    
    if (event.visibility) {
      result += `  Visibility: ${event.visibility}\n`;
    }
    
    if (event.recurrence) {
      result += `  Recurrence: ${event.recurrence.join(', ')}\n`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error getting calendar event: ${error.message}`;
  }
}

/**
 * Search calendar events
 * @param {string} userId - User ID to get access token from
 * @param {string} query - Search query
 * @param {string} calendarId - Calendar ID (defaults to 'primary')
 * @param {number} maxResults - Maximum number of results
 * @returns {string} Formatted search results
 */
async function searchEvents(userId, query, calendarId = 'primary', maxResults = 20) {
  if (!userId) {
    throw new Error('User ID is required for Calendar operations');
  }
  
  if (!query) {
    return 'Error: Search query is required.';
  }
  
  try {
    const calendar = await getAuthenticatedCalendarService(userId, 'calendar_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await calendar.events.list({
        calendarId: calendarId,
        q: query,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });
    }, 3, true, userId);
    
    const events = response.data.items || [];
    
    if (events.length === 0) {
      return `No events found for query: "${query}" in calendar "${calendarId}".`;
    }
    
    let result = `**Calendar Event Search Results**\n`;
    result += `Query: "${query}"\n`;
    result += `Calendar: ${calendarId}\n`;
    result += `Found ${events.length} events\n\n`;
    
    for (const event of events) {
      result += formatEvent(event);
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    
    // Handle timeout and connection errors specifically
    if (error.message?.includes('experiencing delays') || error.message?.includes('timeout')) {
      return `Google Calendar is currently slow to respond. This may be due to high server load. Please wait a moment and try again.`;
    }
    
    if (error.message?.includes('Unable to connect')) {
      return `Cannot connect to Google Calendar service. Please check your internet connection and try again.`;
    }
    
    return `Error searching calendar events: ${error.message}`;
  }
}

module.exports = {
  listCalendars,
  getEvents,
  createEvent,
  modifyEvent,
  deleteEvent,
  getEvent,
  searchEvents
};