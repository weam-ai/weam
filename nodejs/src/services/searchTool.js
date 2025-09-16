const { Tool } = require('@langchain/core/tools')
const { LINK } = require('../config/config');
class SearxNGSearchTool extends Tool {
    constructor({
        searxUrl = LINK.SEARXNG_API_URL,
        maxResults = 10,
        language = 'en',
        name = 'searxng_search',
        description = 'Search the web with SearxNG',
    } = {}) {
        super()
        this.searxUrl = searxUrl
        this.maxResults = maxResults
        this.language = language
        this.name = name
        this.description = description
    }

    /** LangChain calls _call() under the hood */
    async _call(query) {
        try {
            const response = await fetch(`${this.searxUrl}/search?q=${query}&format=json&language=${this.language}`, {
                method: 'GET',
                timeout: 15_000,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                },
            })
            const data = await response.json()
            const citations = []
            if (data?.results?.length > 0) {
                data.results.forEach((result) => {
                    citations.push({
                        title: result.title,
                        url: result.url,
                        snippet: result.content,
                        domain: result.parsed_url[1],
                    })
                })
            }
            return JSON.stringify(citations)
        } catch (err) {
            logger.error('SearxNG error:', err.message)
            return JSON.stringify([]);
        }
    }
}

module.exports = { SearxNGSearchTool }