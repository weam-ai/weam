const langGraphEventName = {
    ON_CHAIN_START: 'on_chain_start',
    ON_CHAIN_MODEL_START: 'on_chat_model_start',
    ON_CHAIN_MODEL_STREAM: 'on_chat_model_stream',
    ON_CHAIN_MODEL_END: 'on_chat_model_end',
    ON_TOOL_START: 'on_tool_start',
    ON_TOOL_END: 'on_tool_end',
}

const llmStreamingEvents = {
    RESPONSE_DONE: '[DONE]',
    WEB_SEARCH_CITATION: '[CITATION]',
    RESPONSE_ERROR_MESSAGE: 'conversation error',
    WEB_SEARCH_START: '[WEB_SEARCH]',
    RAG_ENABLED: '[RAG_ENABLED]',
    RAG_DISABLED: '[RAG_DISABLED]',
    AGENT_ENABLED: '[AGENT_ENABLED]',
    AGENT_DISABLED: '[AGENT_DISABLED]',
    AGENT_RAG_ENABLED: '[AGENT_RAG_ENABLED]',
    IMAGE_GENERATION_START: '[IMAGE_GENERATION_TOOL]',
    IMAGE_GENERATION_TOOL: '[IMAGE_GENERATION_TOOL]',
}

const toolCallOptions = {
    WEB_SEARCH_TOOL: 'SearxNGSearchTool',
    SEARCHING_THE_WEB: 'Searching the web...',
    RAG_TOOL: 'RAGDocumentSearch',
    AGENT_TOOL: 'AgentConfiguration',
    IMAGE_GENERATION_TOOL: 'dalle_api_wrapper',
    GENERATING_IMAGE: 'Generating image...',
}

const toolDescription = {
    WEB_SEARCH_TOOL: `This tool retrieves accurate, up-to-date information from the internet through contextual web search. Use this tool when the user query involves real-time events, live updates, current data, or time-sensitive information.

    Use this tool when:
    - The query relates to ongoing events, current news, stock prices, weather, sports results, or the latest product/policy updates
    - The answer depends on local or time-based context (business hours, event schedules, trending topics, regional availability)  
    - The user explicitly requests the most recent, latest, live, or current information

    IMPORTANT RESPONSE FORMATTING:
    When presenting search results, provide a comprehensive and engaging response following this structure:
    1. Start with a clear, attention-grabbing introduction
    2. Present each headline with detailed descriptions, not just bullet points
    3. Include compelling details from the snippets (numbers, dates, key players, impacts)
    4. Add context and background information where relevant
    5. Use engaging language and emphasize dramatic or significant aspects
    6. Include source attribution with links where available
    7. End with an offer for more specific information

    Make your response informative, detailed, and engaging like a news summary - don't just list bare facts. Transform raw search data into compelling narrative content that captures the reader's attention.`,
    IMAGE_GENERATION_TOOL: `An image generation tool that creates high-quality images from text descriptions using OpenAI's DALL-E 3 model. The tool automatically uploads generated images to S3 storage and returns S3 URLs for immediate display. Tool supports various image sizes and aspect ratios, including 1024x1024 for Square images, 1024x1536 for Portrait images and 1536x1024 for Landscape images.
    1024x1024 (Square): Ideal for social media posts, profile pictures, digital artwork, and product images.
    1024x1536 (Portrait): Perfect for mobile content, social media stories, and vertical ads.
    1536x1024 (Landscape): Great for presentations, video thumbnails, website banners, and widescreen displays.
    IMPORTANT: This tool automatically handles S3 uploads and returns S3 URLs for better user experience. DO NOT use this tool if the user requests to generate code based on an image input and a prompt. For such cases, use the chat tool to generate code from the image and prompt.`,
    RAG_TOOL: `This tool enables Retrieval-Augmented Generation (RAG) by searching through uploaded documents to provide contextually relevant information. It should be used when the user has uploaded documents and wants responses based on the content of those documents. The tool automatically searches for relevant document sections and enhances the user's query with this context to provide more accurate and relevant responses.`,
    AGENT_TOOL: `This tool enables Agent-based responses by applying custom system prompts to customize the AI's behavior and responses. It should be used when the user has configured a custom agent with specific personality, expertise, or response patterns. The tool automatically applies the agent's configuration to provide more personalized and contextually appropriate responses.`,
    TITLE_SYSTEM_PROMPT: `
        You are a chat title generator. Your sole task is to produce a title based strictly on the user prompt or conversation text provided.
        Entity Identification and Weighting:
        - Highest Weight: Unique person names in conversation, client names.
        - Medium Weight: Company names, locations, events.
        - Lowest Weight: Unique or uncommon terms.

        Goal:
        Generate concise, impactful titles that capture the conversation's unique characteristics by prioritizing entities from Highest to Lowest weight.

        Title Generation Constraints:
        - Title length must be EXACTLY 8 to 10 words.
        - No special characters allowed (only letters, numbers, and spaces).
        - Distinctive elements of the conversation must take precedence.
        - Focus on succinctly capturing the conversation’s core essence.
        - Use natural title case or sentence case. Do NOT add punctuation.

        Output Rules:
        - Respond with JSON ONLY, on a single line, with the key "title".
        - Do not include explanations, markdown, or additional keys.
        - If the user prompt is vague, still generate a valid 8–10 word title following the rules.

        Final Response Format (strict):
        {"title":"<your 8-10 word title with no special characters>"}
    `,
    ENHANCE_QUERY_PROMPT: ``,
}

module.exports = {
    langGraphEventName,
    llmStreamingEvents,
    toolCallOptions,
    toolDescription
}