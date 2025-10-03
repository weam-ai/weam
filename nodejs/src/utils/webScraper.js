const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

/**
 * Get various user agent strings to avoid blocking
 */
function getUserAgents() {
    return [
               {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.google.com/',
            'DNT': '1',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',   
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4.1 Safari/605.1.15',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/89.0',
            'Accept-Language': 'en-US,en;q=0.9',        
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
        {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.0; en-US; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        {
            'User-Agent': 'Opera/9.80 (Windows NT 6.0; U; en) Presto/2.12.388 Version/12.18',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html, application/xml;q=0.9, */*;q=0.8',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
    ];
}

/**
 * Extract text content from HTML using Cheerio
 */
function extractTextFromHtml(html) {
    try {
        const $ = cheerio.load(html);

        // Remove unwanted elements
        $('script, style, nav, header, footer, aside, .navigation, .navbar, .menu, .sidebar, .ads, .advertisement').remove();

        // Extract title
        let title = $('title').text().trim() || $('h1').first().text().trim() || '';

        // Extract meta description
        let description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

        // Extract main content
        let mainContent = '';

        // Try to find main content areas
        const contentSelectors = [
            'main',
            '[role="main"]',
            '.main-content',
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            'article',
            '.container .row .col',
            'body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length && element.text().trim().length > 100) {
                mainContent = element.text();
                break;
            }
        }

        // If no main content found, extract all text
        if (!mainContent) {
            mainContent = $('body').text();
        }

        // Clean up the text
        mainContent = mainContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        // Extract headings for structure
        const headings = [];
        $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
            const heading = $(elem).text().trim();
            if (heading && heading.length > 0) {
                headings.push(heading);
            }
        });

        // Combine all content
        let combinedContent = [];

        if (title) combinedContent.push(`Title: ${title}`);
        if (description) combinedContent.push(`Description: ${description}`);
        if (headings.length > 0) combinedContent.push(`Main Topics: ${headings.slice(0, 10).join(', ')}`);
        if (mainContent) combinedContent.push(`Content: ${mainContent.substring(0, 10000)}`); // Limit to 10k chars

        return combinedContent.join('\n\n');

    } catch (error) {
        logger.error(`Error extracting text from HTML: ${error.message}`);
        return html.substring(0, 5000); // Return raw HTML as fallback
    }
}

/**
 * Validate if a URL is accessible
 */
async function isValidUrl(url) {
    try {

        // Use the same enhanced configuration as the main scraper
        const userAgents = getUserAgents();
        const headers = userAgents[0]; // Use first user agent for validation

        // Try HEAD request first (lightweight)
        try {
            const response = await axios.head(url, {
                headers,
                timeout: 10000,
                maxRedirects: 5, // Allow redirects
                validateStatus: (status) => status < 500,
                httpsAgent: createHttpsAgent()
            });

            return {
                isValid: response.status < 400,
                workingHeaders: headers,
                method: 'HEAD'
            };

        } catch (headError) {
            logger.debug(`HEAD request failed: ${headError.message}, trying GET`);

            // If HEAD fails, try GET request with same enhanced config
            const response = await axios.get(url, {
                headers,
                timeout: 15000,
                maxRedirects: 5, // Allow redirects
                validateStatus: (status) => status < 500,
                httpsAgent: createHttpsAgent(),
                // Limit response size for validation to avoid downloading large content
                maxContentLength: 1024 * 1024, // 1MB limit for validation
                responseType: 'stream' // Stream to avoid memory issues
            });

            // Close the stream immediately since we only need to validate
            if (response.data && typeof response.data.destroy === 'function') {
                response.data.destroy();
            }

            return {
                isValid: response.status < 400,
                workingHeaders: headers,
                method: 'GET'
            };
        }

    } catch (error) {
        logger.warn(`❌ URL validation failed for ${url}: ${error.message}`);

        // For certain error types, we should still allow the main scraper to try
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return { isValid: false, workingHeaders: null, method: null };
        }

        // For other errors (like 403, timeouts, etc.), let the main scraper handle it
        // with its retry logic and different user agents
        logger.info(`🔄 Validation inconclusive, letting main scraper attempt: ${url}`);
        return { isValid: true, workingHeaders: null, method: null }; // No specific working headers
    }
}


/**
 * Create HTTPS agent with more permissive settings
 */
function createHttpsAgent() {
    return new https.Agent({
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method',
        ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
    });
}

/**
 * Main web scraping function with enhanced anti-bot detection
 */
async function webScraping(url, options = {}) {
    const { validationResult = null } = options;

    try {
        // Use validated headers if available, otherwise use first user agent
        const headers = validationResult?.workingHeaders || getUserAgents()[0];

        const axiosConfig = {
            headers,
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
            httpsAgent: createHttpsAgent()
        };

        const response = await axios.get(url, axiosConfig);

        if (response.status !== 200) {
            return {
                success: false,
                error: true,
                status: response.status,
                message: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        // Extract text content
        const extractedText = extractTextFromHtml(response.data);

        if (!extractedText || extractedText.trim().length < 50) {
            return {
                success: false,
                error: true,
                message: 'No meaningful content could be extracted from the website'
            };
        }

        return {
            success: true,
            error: false,
            data: extractedText,
            url: url,
            contentType: response.headers['content-type'],
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error(`Web scraping failed for ${url}: ${error.message}`);

        // Return appropriate error message
        let message;
        if (error.code === 'ENOTFOUND') {
            message = 'Website not found or DNS resolution failed';
        } else if (error.code === 'ECONNREFUSED') {
            message = 'Connection refused by the website';
        } else if (error.code === 'ETIMEDOUT') {
            message = 'Request timed out';
        } else if (error.response?.status === 403) {
            message = 'Access forbidden by the website';
        } else if (error.response?.status === 429) {
            message = 'Too many requests - rate limited';
        } else {
            message = `Unable to access the website "${url}". The URL may be invalid or the website may be blocking automated access.`;
        }

        return {
            success: false,
            error: true,
            status: error.response?.status,
            message: message
        };
    }
}

module.exports = {
    webScraping,
    isValidUrl,
    getUserAgents,
    extractTextFromHtml,
    createHttpsAgent
};