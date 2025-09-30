/**
 * Gmail MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const { getAuthenticatedGmailService, handleGoogleApiErrors, GoogleAuthenticationError } = require('../utils/google-auth');
const User = require('../models/user');

/**
 * Extract message body from Gmail message parts
 * @param {Object} payload - Gmail message payload
 * @returns {string} Extracted plain text body
 */
function extractMessageBody(payload) {
  let body = '';
  
  if (payload.body && payload.body.data) {
    // Single part message
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    // Multi-part message
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        // Nested parts
        body += extractMessageBody(part);
      }
    }
  }
  
  return body.trim();
}

/**
 * Extract headers from Gmail message
 * @param {Object} payload - Gmail message payload
 * @returns {Object} Extracted headers
 */
function extractHeaders(payload) {
  const headers = {};
  if (payload.headers) {
    for (const header of payload.headers) {
      headers[header.name.toLowerCase()] = header.value;
    }
  }
  return headers;
}

/**
 * Generate Gmail web URL for a message
 * @param {string} messageId - Gmail message ID
 * @returns {string} Gmail web URL
 */
function generateGmailWebUrl(messageId) {
  return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
}

/**
 * Format Gmail search results
 * @param {Array} messages - Array of Gmail messages
 * @param {string} query - Search query
 * @returns {string} Formatted results
 */
function formatGmailResults(messages, query) {
  if (!messages || messages.length === 0) {
    return `No messages found for query: "${query}"`;
  }
  
  let result = `Found ${messages.length} messages for query: "${query}"\n\n`;
  
  for (const message of messages) {
    const webUrl = generateGmailWebUrl(message.id);
    result += `• Message ID: ${message.id}\n`;
    result += `  Thread ID: ${message.threadId}\n`;
    result += `  Web Link: ${webUrl}\n\n`;
  }
  
  return result;
}

/**
 * Search Gmail messages
 * @param {string} userId - User ID to get access token from
 * @param {string} query - Gmail search query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {string} Formatted search results
 */
async function searchGmailMessages(userId = null, query, maxResults = 10) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });
    }, 3, true, userId);
    
    const messages = response.data.messages || [];
    return formatGmailResults(messages, query);
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error searching Gmail messages: ${error.message}`;
  }
}

/**
 * Get Gmail message content
 * @param {string} userId - User ID to get access token from
 * @param {string} messageId - Gmail message ID
 * @returns {string} Formatted message content
 */
async function getGmailMessageContent(userId = null, messageId) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
    }, 3, true, userId);
    
    const message = response.data;
    const headers = extractHeaders(message.payload);
    const body = extractMessageBody(message.payload);
    const webUrl = generateGmailWebUrl(messageId);
    
    let result = `**Gmail Message Content**\n\n`;
    result += `**Subject:** ${headers.subject || 'No Subject'}\n`;
    result += `**From:** ${headers.from || 'Unknown Sender'}\n`;
    result += `**To:** ${headers.to || 'Unknown Recipient'}\n`;
    result += `**Date:** ${headers.date || 'Unknown Date'}\n`;
    result += `**Message ID:** ${messageId}\n`;
    result += `**Web Link:** ${webUrl}\n\n`;
    result += `**Body:**\n${body || '[No plain text content available]'}`;
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error getting Gmail message content: ${error.message}`;
  }
}

/**
 * Get Gmail messages content in batch
 * @param {string} userId - User ID to get access token from
 * @param {Array} messageIds - Array of Gmail message IDs
 * @returns {string} Formatted batch message content
 */
async function getGmailMessagesContentBatch(userId = null, messageIds) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return 'Error: Please provide an array of message IDs.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    const results = [];
    
    // Process messages in parallel with a reasonable limit
    const batchSize = 10;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (messageId) => {
        try {
          const response = await handleGoogleApiErrors(async () => {
            return await gmail.users.messages.get({
              userId: 'me',
              id: messageId,
              format: 'full'
            });
          }, 3, true, userId);
          
          const message = response.data;
          const headers = extractHeaders(message.payload);
          const body = extractMessageBody(message.payload);
          const webUrl = generateGmailWebUrl(messageId);
          
          return {
            messageId,
            subject: headers.subject || 'No Subject',
            from: headers.from || 'Unknown Sender',
            date: headers.date || 'Unknown Date',
            body: body || '[No plain text content available]',
            webUrl
          };
        } catch (error) {
          return {
            messageId,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    let output = `**Batch Gmail Messages Content (${results.length} messages)**\n\n`;
    
    for (const result of results) {
      if (result.error) {
        output += `**Message ID:** ${result.messageId}\n`;
        output += `**Error:** ${result.error}\n\n`;
      } else {
        output += `**Message ID:** ${result.messageId}\n`;
        output += `**Subject:** ${result.subject}\n`;
        output += `**From:** ${result.from}\n`;
        output += `**Date:** ${result.date}\n`;
        output += `**Web Link:** ${result.webUrl}\n`;
        output += `**Body:** ${result.body.substring(0, 200)}${result.body.length > 200 ? '...' : ''}\n\n`;
      }
    }
    
    return output;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error getting Gmail messages content: ${error.message}`;
  }
}

/**
 * Send Gmail message
 * @param {string} userId - User ID to get access token from
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @param {string} cc - CC recipients (optional)
 * @param {string} bcc - BCC recipients (optional)
 * @returns {string} Success or error message
 */
async function sendGmailMessage(userId = null, to, subject, body, cc = null, bcc = null) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_compose');
    
    // Create email message
    let email = `To: ${to}\n`;
    if (cc) email += `Cc: ${cc}\n`;
    if (bcc) email += `Bcc: ${bcc}\n`;
    email += `Subject: ${subject}\n\n${body}`;
    
    const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
    }, 3, false, userId);
    
    const messageId = response.data.id;
    const webUrl = generateGmailWebUrl(messageId);
    
    return `Email sent successfully!\nMessage ID: ${messageId}\nWeb Link: ${webUrl}`;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error sending Gmail message: ${error.message}`;
  }
}

/**
 * Draft Gmail message
 * @param {string} userId - User ID to get access token from
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @param {string} cc - CC recipients (optional)
 * @param {string} bcc - BCC recipients (optional)
 * @returns {string} Success or error message
 */
async function draftGmailMessage(userId = null, to, subject, body, cc = null, bcc = null) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_compose');
    
    // Create email message
    let email = `To: ${to}\n`;
    if (cc) email += `Cc: ${cc}\n`;
    if (bcc) email += `Bcc: ${bcc}\n`;
    email += `Subject: ${subject}\n\n${body}`;
    
    const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage
          }
        }
      });
    }, 3, false, userId);
    
    const draftId = response.data.id;
    const messageId = response.data.message.id;
    const webUrl = generateGmailWebUrl(messageId);
    
    return `Draft created successfully!\nDraft ID: ${draftId}\nMessage ID: ${messageId}\nWeb Link: ${webUrl}`;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error creating Gmail draft: ${error.message}`;
  }
}

/**
 * Get Gmail thread content
 * @param {string} userId - User ID to get access token from
 * @param {string} threadId - Gmail thread ID
 * @returns {string} Formatted thread content
 */
async function getGmailThreadContent(userId = null, threadId) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });
    }, 3, true, userId);
    
    const thread = response.data;
    const messages = thread.messages || [];
    
    let result = `**Gmail Thread Content**\n\n`;
    result += `**Thread ID:** ${threadId}\n`;
    result += `**Messages in Thread:** ${messages.length}\n\n`;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const headers = extractHeaders(message.payload);
      const body = extractMessageBody(message.payload);
      const webUrl = generateGmailWebUrl(message.id);
      
      result += `**Message ${i + 1}:**\n`;
      result += `  **Subject:** ${headers.subject || 'No Subject'}\n`;
      result += `  **From:** ${headers.from || 'Unknown Sender'}\n`;
      result += `  **Date:** ${headers.date || 'Unknown Date'}\n`;
      result += `  **Message ID:** ${message.id}\n`;
      result += `  **Web Link:** ${webUrl}\n`;
      result += `  **Body:** ${body.substring(0, 300)}${body.length > 300 ? '...' : ''}\n\n`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error getting Gmail thread content: ${error.message}`;
  }
}

/**
 * Get Gmail threads content in batch
 * @param {string} userId - User ID to get access token from
 * @param {Array} threadIds - Array of Gmail thread IDs
 * @returns {string} Formatted batch thread content
 */
async function getGmailThreadsContentBatch(userId = null, threadIds) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  if (!Array.isArray(threadIds) || threadIds.length === 0) {
    return 'Error: Please provide an array of thread IDs.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    const results = [];
    
    // Process threads in parallel with a reasonable limit
    const batchSize = 5;
    for (let i = 0; i < threadIds.length; i += batchSize) {
      const batch = threadIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (threadId) => {
        try {
          const response = await handleGoogleApiErrors(async () => {
            return await gmail.users.threads.get({
              userId: 'me',
              id: threadId,
              format: 'full'
            });
          }, 3, true, userId);
          
          const thread = response.data;
          const messages = thread.messages || [];
          
          return {
            threadId,
            messageCount: messages.length,
            messages: messages.map(msg => {
              const headers = extractHeaders(msg.payload);
              const body = extractMessageBody(msg.payload);
              return {
                messageId: msg.id,
                subject: headers.subject || 'No Subject',
                from: headers.from || 'Unknown Sender',
                date: headers.date || 'Unknown Date',
                body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
                webUrl: generateGmailWebUrl(msg.id)
              };
            })
          };
        } catch (error) {
          return {
            threadId,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    let output = `**Batch Gmail Threads Content (${results.length} threads)**\n\n`;
    
    for (const result of results) {
      if (result.error) {
        output += `**Thread ID:** ${result.threadId}\n`;
        output += `**Error:** ${result.error}\n\n`;
      } else {
        output += `**Thread ID:** ${result.threadId}\n`;
        output += `**Messages:** ${result.messageCount}\n`;
        for (const message of result.messages) {
          output += `  • **${message.subject}** from ${message.from}\n`;
          output += `    Date: ${message.date}\n`;
          output += `    Body: ${message.body}\n`;
          output += `    Link: ${message.webUrl}\n\n`;
        }
      }
    }
    
    return output;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error getting Gmail threads content: ${error.message}`;
  }
}

/**
 * List Gmail labels
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted labels list
 */
async function listGmailLabels(userId = null) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.labels.list({
        userId: 'me'
      });
    }, 3, true, userId);
    
    const labels = response.data.labels || [];
    
    if (labels.length === 0) {
      return 'No labels found.';
    }
    
    let result = `**Gmail Labels (${labels.length} total)**\n\n`;
    
    // Separate system and user labels
    const systemLabels = labels.filter(label => label.type === 'system');
    const userLabels = labels.filter(label => label.type === 'user');
    
    if (systemLabels.length > 0) {
      result += `**System Labels:**\n`;
      for (const label of systemLabels) {
        result += `• **${label.name}** (ID: ${label.id})\n`;
      }
      result += '\n';
    }
    
    if (userLabels.length > 0) {
      result += `**User Labels:**\n`;
      for (const label of userLabels) {
        result += `• **${label.name}** (ID: ${label.id})\n`;
      }
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error listing Gmail labels: ${error.message}`;
  }
}

/**
 * Manage Gmail label (create, update, or delete)
 * @param {string} userId - User ID to get access token from
 * @param {string} action - Action to perform: 'create', 'update', or 'delete'
 * @param {string} labelName - Label name (for create/update)
 * @param {string} labelId - Label ID (for update/delete)
 * @param {string} visibility - Label visibility: 'show', 'hide', 'showIfUnread' (for create/update)
 * @returns {string} Success or error message
 */
async function manageGmailLabel(userId = null, action, labelName = null, labelId = null, visibility = 'show') {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_modify');
    
    switch (action.toLowerCase()) {
      case 'create':
        if (!labelName) {
          return 'Error: Label name is required for creating a label.';
        }
        
        const createResponse = await handleGoogleApiErrors(async () => {
          return await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
              name: labelName,
              labelListVisibility: visibility === 'hide' ? 'labelHide' : 'labelShow',
              messageListVisibility: visibility === 'showIfUnread' ? 'showIfUnread' : 'show'
            }
          });
        }, 3, false, userId);
        
        const createdLabel = createResponse.data;
        return `Label "${createdLabel.name}" created successfully with ID: ${createdLabel.id}`;
        
      case 'update':
        if (!labelId || !labelName) {
          return 'Error: Both label ID and label name are required for updating a label.';
        }
        
        const updateResponse = await handleGoogleApiErrors(async () => {
          return await gmail.users.labels.update({
            userId: 'me',
            id: labelId,
            requestBody: {
              id: labelId,
              name: labelName,
              labelListVisibility: visibility === 'hide' ? 'labelHide' : 'labelShow',
              messageListVisibility: visibility === 'showIfUnread' ? 'showIfUnread' : 'show'
            }
          });
        }, 3, false, userId);
        
        const updatedLabel = updateResponse.data;
        return `Label updated successfully: "${updatedLabel.name}" (ID: ${updatedLabel.id})`;
        
      case 'delete':
        if (!labelId) {
          return 'Error: Label ID is required for deleting a label.';
        }
        
        await handleGoogleApiErrors(async () => {
          return await gmail.users.labels.delete({
            userId: 'me',
            id: labelId
          });
        }, 3, false, userId);
        
        return `Label with ID "${labelId}" deleted successfully.`;
        
      default:
        return 'Error: Invalid action. Use "create", "update", or "delete".';
    }
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error managing Gmail label: ${error.message}`;
  }
}

/**
 * Modify Gmail message labels
 * @param {string} userId - User ID to get access token from
 * @param {string} messageId - Gmail message ID
 * @param {Array} addLabelIds - Array of label IDs to add
 * @param {Array} removeLabelIds - Array of label IDs to remove
 * @returns {string} Success or error message
 */
async function modifyGmailMessageLabels(userId = null, messageId, addLabelIds = [], removeLabelIds = []) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  if ((!addLabelIds || addLabelIds.length === 0) && (!removeLabelIds || removeLabelIds.length === 0)) {
    return 'Error: Please provide labels to add or remove.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_modify');
    
    const requestBody = {};
    if (addLabelIds && addLabelIds.length > 0) {
      requestBody.addLabelIds = addLabelIds;
    }
    if (removeLabelIds && removeLabelIds.length > 0) {
      requestBody.removeLabelIds = removeLabelIds;
    }
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody
      });
    }, 3, false, userId);
    
    let result = `Labels modified successfully for message ${messageId}.\n`;
    if (addLabelIds && addLabelIds.length > 0) {
      result += `Added labels: ${addLabelIds.join(', ')}\n`;
    }
    if (removeLabelIds && removeLabelIds.length > 0) {
      result += `Removed labels: ${removeLabelIds.join(', ')}`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error modifying Gmail message labels: ${error.message}`;
  }
}

/**
 * Batch modify Gmail message labels
 * @param {string} userId - User ID to get access token from
 * @param {Array} messageIds - Array of Gmail message IDs
 * @param {Array} addLabelIds - Array of label IDs to add
 * @param {Array} removeLabelIds - Array of label IDs to remove
 * @returns {string} Success or error message
 */
async function batchModifyGmailMessageLabels(userId = null, messageIds, addLabelIds = [], removeLabelIds = []) {
  if (!userId) {
    return 'Error: User ID is required. Please provide user authentication.';
  }
  
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return 'Error: Please provide an array of message IDs.';
  }
  
  if ((!addLabelIds || addLabelIds.length === 0) && (!removeLabelIds || removeLabelIds.length === 0)) {
    return 'Error: Please provide labels to add or remove.';
  }
  
  try {
    const gmail = await getAuthenticatedGmailService(userId, 'gmail_modify');
    
    const requestBody = {
      ids: messageIds
    };
    if (addLabelIds && addLabelIds.length > 0) {
      requestBody.addLabelIds = addLabelIds;
    }
    if (removeLabelIds && removeLabelIds.length > 0) {
      requestBody.removeLabelIds = removeLabelIds;
    }
    
    const response = await handleGoogleApiErrors(async () => {
      return await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody
      });
    }, 3, false, userId);
    
    let result = `Labels modified successfully for ${messageIds.length} messages.\n`;
    if (addLabelIds && addLabelIds.length > 0) {
      result += `Added labels: ${addLabelIds.join(', ')}\n`;
    }
    if (removeLabelIds && removeLabelIds.length > 0) {
      result += `Removed labels: ${removeLabelIds.join(', ')}`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error batch modifying Gmail message labels: ${error.message}`;
  }
}

module.exports = {
  searchGmailMessages,
  getGmailMessageContent,
  getGmailMessagesContentBatch,
  sendGmailMessage,
  draftGmailMessage,
  getGmailThreadContent,
  getGmailThreadsContentBatch,
  listGmailLabels,
  manageGmailLabel,
  modifyGmailMessageLabels,
  batchModifyGmailMessageLabels
};