/**
 * Google Drive MCP Tools - Node.js Implementation
 * Integrated for weam-node MCP server
 */

const { getAuthenticatedDriveService, handleGoogleApiErrors, GoogleAuthenticationError, extractOfficeXmlText } = require('../utils/google-auth');
const pdfParse = require('pdf-parse');

/**
 * Drive query patterns for structured queries
 */
const DRIVE_QUERY_PATTERNS = {
  name: /name\s*[:=]\s*['"]([^'"]+)['"]/i,
  type: /type\s*[:=]\s*['"]([^'"]+)['"]/i,
  owner: /owner\s*[:=]\s*['"]([^'"]+)['"]/i,
  modified: /modified\s*[:=]\s*['"]([^'"]+)['"]/i,
  created: /created\s*[:=]\s*['"]([^'"]+)['"]/i,
  starred: /starred\s*[:=]\s*(true|false)/i,
  trashed: /trashed\s*[:=]\s*(true|false)/i,
  shared: /shared\s*[:=]\s*(true|false)/i
};

/**
 * Build Drive API list parameters from query
 * @param {string} query - Search query
 * @param {string} folderId - Folder ID to search within
 * @param {boolean} includeSharedDrives - Include shared drives
 * @returns {Object} Drive API parameters
 */
function buildDriveListParams(query, folderId = null, includeSharedDrives = true) {
  const params = {
    pageSize: 100,
    fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, owners, parents, shared, starred, trashed, webViewLink, webContentLink)',
    includeItemsFromAllDrives: includeSharedDrives,
    supportsAllDrives: includeSharedDrives
  };

  let driveQuery = '';

  // Check if it's a structured query
  let isStructuredQuery = false;
  for (const [key, pattern] of Object.entries(DRIVE_QUERY_PATTERNS)) {
    const match = query.match(pattern);
    if (match) {
      isStructuredQuery = true;
      const value = match[1] || match[0].split(/[:=]/)[1].trim();
      
      switch (key) {
        case 'name':
          driveQuery += `name contains '${value}' `;
          break;
        case 'type':
          driveQuery += `mimeType contains '${value}' `;
          break;
        case 'owner':
          driveQuery += `'${value}' in owners `;
          break;
        case 'modified':
          driveQuery += `modifiedTime > '${value}' `;
          break;
        case 'created':
          driveQuery += `createdTime > '${value}' `;
          break;
        case 'starred':
          driveQuery += `starred = ${value} `;
          break;
        case 'trashed':
          driveQuery += `trashed = ${value} `;
          break;
        case 'shared':
          driveQuery += `sharedWithMe = ${value} `;
          break;
      }
    }
  }

  if (!isStructuredQuery) {
    // Free-text search
    driveQuery = `fullText contains '${query}'`;
  }

  // Add folder constraint if specified
  if (folderId) {
    driveQuery += ` and '${folderId}' in parents`;
  }

  // Exclude trashed files by default unless explicitly searching for them
  if (!query.toLowerCase().includes('trashed')) {
    driveQuery += ' and trashed = false';
  }

  params.q = driveQuery.trim();
  return params;
}

/**
 * Format Drive file information
 * @param {Object} file - Drive file object
 * @returns {string} Formatted file information
 */
function formatDriveFile(file) {
  let result = `**${file.name}**\n`;
  result += `  ID: ${file.id}\n`;
  result += `  Type: ${file.mimeType}\n`;
  
  if (file.size) {
    const sizeInMB = (parseInt(file.size) / (1024 * 1024)).toFixed(2);
    result += `  Size: ${sizeInMB} MB\n`;
  }
  
  if (file.createdTime) {
    result += `  Created: ${new Date(file.createdTime).toLocaleString()}\n`;
  }
  
  if (file.modifiedTime) {
    result += `  Modified: ${new Date(file.modifiedTime).toLocaleString()}\n`;
  }
  
  if (file.owners && file.owners.length > 0) {
    result += `  Owner: ${file.owners[0].displayName || file.owners[0].emailAddress}\n`;
  }
  
  if (file.webViewLink) {
    result += `  View Link: ${file.webViewLink}\n`;
  }
  
  if (file.webContentLink) {
    result += `  Download Link: ${file.webContentLink}\n`;
  }
  
  result += '\n';
  return result;
}

/**
 * Search Drive files
 * @param {string} userId - User ID to get access token from
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results
 * @param {string} folderId - Folder ID to search within (optional)
 * @param {boolean} includeSharedDrives - Include shared drives
 * @returns {string} Formatted search results
 */
async function searchDriveFiles(userId, query, maxResults = 20, folderId = null, includeSharedDrives = true) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_read');
    
    const params = buildDriveListParams(query, folderId, includeSharedDrives);
    params.pageSize = Math.min(maxResults, 100);
    
    const response = await handleGoogleApiErrors(async () => {
      return await drive.files.list(params);
    }, 3, true, userId);
    
    const files = response.data.files || [];
    
    if (files.length === 0) {
      return `No files found for query: "${query}"`;
    }
    
    let result = `**Drive Search Results**\n`;
    result += `Found ${files.length} files for query: "${query}"\n\n`;
    
    for (const file of files) {
      result += formatDriveFile(file);
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error searching Drive files: ${error.message}`;
  }
}

/**
 * Get Drive file content
 * @param {string} userId - User ID to get access token from
 * @param {string} fileId - Drive file ID
 * @returns {string} File content or error message
 */
async function getDriveFileContent(userId, fileId) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_read');
    
    // First, get file metadata with additional fields to better identify file types
    const metadataResponse = await handleGoogleApiErrors(async () => {
      return await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, owners, webViewLink, originalFilename, fileExtension'
      });
    }, 3, true, userId);
    
    const file = metadataResponse.data;
    let result = `**Drive File Content**\n\n`;
    result += formatDriveFile(file);
    
    // Handle different file types
    const mimeType = file.mimeType;
    const fileName = file.name.toLowerCase();
    
    console.log(`[File Debug] Processing file: ${file.name}, MIME: ${mimeType}, Extension: ${file.fileExtension || 'none'}`);
    
    try {
      let content = '';
      
      // Check if this is actually a Google Doc (not a native Office document)
      if (mimeType === 'application/vnd.google-apps.document') {
        
        // Try to export Google Docs as DOCX first if they have office extensions
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          try {
            console.log(`[Google Doc Debug] Attempting DOCX export for: ${file.name}`);
            const exportResponse = await handleGoogleApiErrors(async () => {
              return await drive.files.export({
                fileId: fileId,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }, { responseType: 'arraybuffer' });
            }, 3, true, userId);
            
            const buffer = Buffer.from(exportResponse.data);
            console.log(`[Google Doc as DOCX] Exported buffer length: ${buffer.length}, First 10 bytes: ${Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
            
            // Verify it's a valid ZIP file (DOCX format)
            const zipSignature = buffer.slice(0, 4);
            const isZipFile = zipSignature[0] === 0x50 && zipSignature[1] === 0x4B && 
                             (zipSignature[2] === 0x03 || zipSignature[2] === 0x05 || zipSignature[2] === 0x07);
            
            if (isZipFile) {
              // Process the exported DOCX
              content = await extractOfficeXmlText(buffer);
            } else {
              throw new Error('Export did not produce valid DOCX format');
            }
          } catch (exportError) {
            console.error('Google Doc DOCX export failed, falling back to plain text:', exportError);
            // Fallback to plain text export
            const exportResponse = await handleGoogleApiErrors(async () => {
              return await drive.files.export({
                fileId: fileId,
                mimeType: 'text/plain'
              });
            }, 3, true, userId);
            content = exportResponse.data;
          }
        } else {
          // Regular Google Doc - export as plain text
          const exportResponse = await handleGoogleApiErrors(async () => {
            return await drive.files.export({
              fileId: fileId,
              mimeType: 'text/plain'
            });
          }, 3, true, userId);
          content = exportResponse.data;
        }
        
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Google Sheets - export as CSV
        const exportResponse = await handleGoogleApiErrors(async () => {
          return await drive.files.export({
            fileId: fileId,
            mimeType: 'text/csv'
          });
        }, 3, true, userId);
        content = exportResponse.data;
        
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        // Google Slides - export as plain text
        const exportResponse = await handleGoogleApiErrors(async () => {
          return await drive.files.export({
            fileId: fileId,
            mimeType: 'text/plain'
          });
        }, 3, true, userId);
        content = exportResponse.data;
        
      } else if (mimeType.startsWith('text/') || 
                 mimeType === 'application/json' || 
                 mimeType === 'application/javascript' ||
                 mimeType === 'application/xml' ||
                 mimeType === 'text/csv' ||
                 mimeType === 'application/csv' ||
                 mimeType === 'application/rtf' ||
                 mimeType === 'text/rtf' ||
                 mimeType === 'text/markdown' ||
                 mimeType === 'application/x-yaml' ||
                 mimeType === 'text/yaml') {
        // Text-based files
        const downloadResponse = await handleGoogleApiErrors(async () => {
          return await drive.files.get({
            fileId: fileId,
            alt: 'media'
          });
        }, 3, true, userId);
        content = downloadResponse.data;
        
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                 mimeType === 'application/msword' ||
                 mimeType === 'application/vnd.ms-excel' ||
                 mimeType === 'application/vnd.ms-powerpoint') {
        // Native Office XML files and legacy Office files (not Google Docs)
        try {
          console.log(`[Native Office Document Debug] Processing ${mimeType} file: ${file.name}`);
          
          const downloadResponse = await handleGoogleApiErrors(async () => {
            return await drive.files.get({
              fileId: fileId,
              alt: 'media'
            }, { responseType: 'arraybuffer' });
          }, 3, true, userId);
          
          let buffer = Buffer.from(downloadResponse.data);
          console.log(`[Native Office Document Debug] Initial buffer length: ${buffer.length}, First 10 bytes: ${Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
          
          // Check if buffer looks like a ZIP file (Office documents are ZIP archives)
          const zipSignature = buffer.slice(0, 4);
          const isZipFile = zipSignature[0] === 0x50 && zipSignature[1] === 0x4B && 
                           (zipSignature[2] === 0x03 || zipSignature[2] === 0x05 || zipSignature[2] === 0x07);
          
          if (!isZipFile) {
            console.log(`[Native Office Document Debug] ZIP signature check failed. Expected: 0x50 0x4B 0x03/0x05/0x07, Got: ${Array.from(zipSignature).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
            
            // This might be a Google Doc with wrong MIME type - try to export it
            console.log('[Native Office Document Debug] File might be a Google Doc, attempting export...');
            try {
              const exportResponse = await handleGoogleApiErrors(async () => {
                return await drive.files.export({
                  fileId: fileId,
                  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }, { responseType: 'arraybuffer' });
              }, 3, true, userId);
              
              buffer = Buffer.from(exportResponse.data);
              console.log(`[Native Office Document Debug] Export attempt - Buffer length: ${buffer.length}, First 10 bytes: ${Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
              
              // Check ZIP signature again
              const exportZipSignature = buffer.slice(0, 4);
              const exportIsZipFile = exportZipSignature[0] === 0x50 && exportZipSignature[1] === 0x4B && 
                                     (exportZipSignature[2] === 0x03 || exportZipSignature[2] === 0x05 || exportZipSignature[2] === 0x07);
              
              if (!exportIsZipFile) {
                throw new Error(`File appears to be a Google Doc but export failed. Got signature: ${Array.from(exportZipSignature).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
              }
            } catch (exportError) {
              console.error('[Native Office Document Debug] Export attempt failed:', exportError);
              throw new Error(`Downloaded file does not appear to be a valid Office document (missing ZIP signature). Got signature: ${Array.from(zipSignature).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
            }
          }
          
          const extractedText = await extractOfficeXmlText(buffer);
          
          // Format the content similar to PDF processing
          if (extractedText && extractedText.trim() && !extractedText.startsWith('[Error') && !extractedText.startsWith('[No text content found')) {
            content = `[Office Document Content from: ${file.name}]\n\n${extractedText}`;
          } else {
            content = `[Office Document: ${file.name}]\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nType: ${mimeType}\nDirect link: ${file.webViewLink}\nNote: ${extractedText.startsWith('[Error') ? extractedText : 'No extractable text found in this document.'}`;
          }
          
        } catch (officeError) {
          console.error('Office document processing error:', officeError);
          content = `[Office Document: ${file.name}]\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nType: ${mimeType}\nDirect link: ${file.webViewLink}\n\nExtraction Error: ${officeError.message}\n\nNote: This may be due to:\n- File is actually a Google Doc (try accessing via web interface)\n- Corrupted or password-protected file\n- Unsupported Office document version\n- Network issues during download\n\nPlease try downloading the file directly using the link above.`;
        }
        
      } else if (mimeType === 'application/pdf') {
        // PDF files - extract text content
        try {
          const downloadResponse = await handleGoogleApiErrors(async () => {
            return await drive.files.get({
              fileId: fileId,
              alt: 'media'
            }, { responseType: 'arraybuffer' });
          }, 3, true, userId);
          
          const buffer = Buffer.from(downloadResponse.data);
          const pdfData = await pdfParse(buffer);
          
          if (pdfData.text && pdfData.text.trim()) {
            content = `[PDF Content from: ${file.name}]\n\n${pdfData.text}`;
          } else {
            content = `[PDF file: ${file.name}]\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nDirect link: ${file.webViewLink}\nNote: No extractable text found in this PDF.`;
          }
        } catch (pdfError) {
          console.error('PDF extraction error:', pdfError);
          content = `[PDF file: ${file.name}]\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nDirect link: ${file.webViewLink}\nNote: PDF text extraction failed - ${pdfError.message}`;
        }
        
      } else if (mimeType.startsWith('image/')) {
        // Image files
        content = `[Image file: ${file.name}]\nType: ${mimeType}\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nDirect link: ${file.webViewLink}`;
        
      } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
        // Media files
        const mediaType = mimeType.startsWith('video/') ? 'Video' : 'Audio';
        content = `[${mediaType} file: ${file.name}]\nType: ${mimeType}\nSize: ${file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}\nDirect link: ${file.webViewLink}`;
        
      } else {
        // Other binary files
        const sizeInMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : 'Unknown';
        content = `[Binary file: ${file.name}]\nType: ${mimeType}\nSize: ${sizeInMB} MB\nDirect link: ${file.webViewLink}\nNote: Content preview not available for this file type.`;
      }
      
      // Ensure content is a string and handle potential encoding issues
      if (typeof content !== 'string') {
        content = String(content);
      }
      
      // Limit content length to prevent overwhelming responses
      const maxContentLength = 10000;
      if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '\n\n[Content truncated - showing first 10,000 characters]';
      }
      
      result += `**Content:**\n${content}`;
      
    } catch (contentError) {
      console.error('Content retrieval error:', contentError);
      result += `**Content:** [Unable to retrieve content: ${contentError.message}]\n`;
      result += `**Error Details:** ${contentError.stack || 'No stack trace available'}`;
    }
    
    return result;
    
  } catch (error) {
    console.error('Drive file content error:', error);
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error getting Drive file content: ${error.message}\nError Details: ${error.stack || 'No stack trace available'}`;
  }
}

/**
 * List Drive items in a folder
 * @param {string} userId - User ID to get access token from
 * @param {string} folderId - Folder ID (optional, defaults to root)
 * @param {boolean} includeSharedDrives - Include shared drives
 * @returns {string} Formatted folder contents
 */
async function listDriveItems(userId, folderId = 'root', includeSharedDrives = true) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_read');
    
    // Get folder information first
    let folderName = 'Root';
    if (folderId !== 'root') {
      try {
        const folderResponse = await handleGoogleApiErrors(async () => {
          return await drive.files.get({
            fileId: folderId,
            fields: 'name'
          });
        }, 3, true, userId);
        folderName = folderResponse.data.name;
      } catch (error) {
        return `Error: Folder with ID "${folderId}" not found or not accessible.`;
      }
    }
    
    const params = {
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 100,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, owners, shared, starred, webViewLink)',
      includeItemsFromAllDrives: includeSharedDrives,
      supportsAllDrives: includeSharedDrives,
      orderBy: 'folder,name'
    };
    
    const response = await handleGoogleApiErrors(async () => {
      return await drive.files.list(params);
    }, 3, true, userId);
    
    const files = response.data.files || [];
    
    if (files.length === 0) {
      return `**Folder: ${folderName}**\n\nNo items found in this folder.`;
    }
    
    let result = `**Folder: ${folderName}**\n`;
    result += `Found ${files.length} items\n\n`;
    
    // Separate folders and files
    const folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');
    
    if (folders.length > 0) {
      result += `**Folders (${folders.length}):**\n`;
      for (const folder of folders) {
        result += `📁 **${folder.name}**\n`;
        result += `   ID: ${folder.id}\n`;
        result += `   Link: ${folder.webViewLink}\n\n`;
      }
    }
    
    if (regularFiles.length > 0) {
      result += `**Files (${regularFiles.length}):**\n`;
      for (const file of regularFiles) {
        result += formatDriveFile(file);
      }
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error listing Drive items: ${error.message}`;
  }
}

/**
 * Create Drive file
 * @param {string} userId - User ID to get access token from
 * @param {string} name - File name
 * @param {string} content - File content (optional)
 * @param {string} mimeType - MIME type (optional)
 * @param {string} parentFolderId - Parent folder ID (optional)
 * @param {string} sourceUrl - URL to download content from (optional)
 * @returns {string} Success message with file details
 */
async function createDriveFile(userId, name, content = '', mimeType = 'text/plain', parentFolderId = null, sourceUrl = null) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_write');
    
    let fileContent = content;
    
    // If source URL is provided, download content
    if (sourceUrl) {
      try {
        const axios = require('axios');
        const response = await axios.get(sourceUrl, { timeout: 30000 });
        fileContent = response.data;
        
        // Try to determine MIME type from URL or response
        if (response.headers['content-type']) {
          mimeType = response.headers['content-type'].split(';')[0];
        }
      } catch (downloadError) {
        return `Error downloading content from URL: ${downloadError.message}`;
      }
    }
    
    const fileMetadata = {
      name: name,
      parents: parentFolderId ? [parentFolderId] : undefined
    };
    
    const media = {
      mimeType: mimeType,
      body: fileContent
    };
    
    const response = await handleGoogleApiErrors(async () => {
      return await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, size, createdTime, webViewLink, parents'
      });
    }, 3, false, userId);
    
    const file = response.data;
    
    let result = `**File created successfully!**\n\n`;
    result += `**Name:** ${file.name}\n`;
    result += `**ID:** ${file.id}\n`;
    result += `**Type:** ${file.mimeType}\n`;
    
    if (file.size) {
      const sizeInKB = (parseInt(file.size) / 1024).toFixed(2);
      result += `**Size:** ${sizeInKB} KB\n`;
    }
    
    result += `**Created:** ${new Date(file.createdTime).toLocaleString()}\n`;
    result += `**Link:** ${file.webViewLink}\n`;
    
    if (parentFolderId) {
      result += `**Parent Folder ID:** ${parentFolderId}\n`;
    }
    
    if (sourceUrl) {
      result += `**Source URL:** ${sourceUrl}\n`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error creating Drive file: ${error.message}`;
  }
}

/**
 * Get Drive shared drives list
 * @param {string} userId - User ID to get access token from
 * @returns {string} Formatted shared drives list
 */
async function listDriveSharedDrives(userId) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_read');
    
    const response = await handleGoogleApiErrors(async () => {
      return await drive.drives.list({
        pageSize: 100,
        fields: 'nextPageToken, drives(id, name, createdTime, capabilities)'
      });
    }, 3, true, userId);
    
    const drives = response.data.drives || [];
    
    if (drives.length === 0) {
      return 'No shared drives found.';
    }
    
    let result = `**Shared Drives (${drives.length} total)**\n\n`;
    
    for (const drive of drives) {
      result += `**${drive.name}**\n`;
      result += `  ID: ${drive.id}\n`;
      
      if (drive.createdTime) {
        result += `  Created: ${new Date(drive.createdTime).toLocaleString()}\n`;
      }
      
      if (drive.capabilities) {
        const caps = [];
        if (drive.capabilities.canAddChildren) caps.push('Add files');
        if (drive.capabilities.canComment) caps.push('Comment');
        if (drive.capabilities.canCopy) caps.push('Copy');
        if (drive.capabilities.canEdit) caps.push('Edit');
        if (drive.capabilities.canManageMembers) caps.push('Manage members');
        
        if (caps.length > 0) {
          result += `  Permissions: ${caps.join(', ')}\n`;
        }
      }
      
      result += '\n';
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error listing shared drives: ${error.message}`;
  }
}

/**
 * Delete Drive file
 * @param {string} userId - User ID to get access token from
 * @param {string} fileId - Drive file ID
 * @returns {string} Success or error message
 */
async function deleteDriveFile(userId, fileId) {
  if (!userId) {
    throw new Error('User ID is required for Drive operations');
  }
  
  try {
    const drive = await getAuthenticatedDriveService(userId, 'drive_write');
    
    // First, get file information
    const fileResponse = await handleGoogleApiErrors(async () => {
      return await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType'
      });
    }, 3, true, userId);
    
    const fileName = fileResponse.data.name;
    const fileType = fileResponse.data.mimeType;
    
    // Delete the file
    await handleGoogleApiErrors(async () => {
      return await drive.files.delete({
        fileId: fileId
      });
    }, 3, false, userId);
    
    return `File "${fileName}" (${fileType}) deleted successfully.`;
    
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      return `Error: ${error.message}`;
    }
    return `Error deleting Drive file: ${error.message}`;
  }
}

module.exports = {
  searchDriveFiles,
  getDriveFileContent,
  listDriveItems,
  createDriveFile,
  listDriveSharedDrives,
  deleteDriveFile
};