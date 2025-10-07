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
    ENHANCE_QUERY_PROMPT: `You are a query enhancer bot that Refines,Rewrite,Formalize and Elaborates user queries to generate more effective responses. Your task is to analyze the user's input, understand their intent and request, and generate a new query to be clearer and better suited for generating an optimal response.

            When enhancing a query, consider factors such as:
            - The user's tone and implied needs.
            - The level of detail required.
            - The best phrasing to elicit a high-quality, relevant answer.
            - You should Rewrite the User Query in a way that reflects a User is only asking the question.

            You can Either Elaborate,Refine,Rewrite Or Formalize the Query.
            Make Sure to Either Elaborate/Refine/Formalize/Rewrite the query just how the intention of the user was on the initial Query,Also Make sure not to provide any explanation or perform any further conversation with the user in the response.
            Your goal is to ensure that the enhanced query accurately captures what the user truly wants from their request while maintaining the original intent. However, you should not alter the fundamental meaning and formatting of the query.Make sure to provide only the altered query as your response.
            Dont provide the answer of the query.Rather provide just a better Version for the query provided on the basis of your goals and guidelines.
            Avoid providing additional information or explanations. All you have to provide is the Query that has been enhanced.Nothing more than that.
    `,
}


const IS_MCP_TOOLS = [
                'list_slack_channels',
                'send_slack_message', 
                'get_channel_id_by_name',
                'get_channel_messages',
                'list_workspace_users',
                'get_github_repositories',
                'create_github_branch',
                'get_git_commits',
                'get_github_user_info',
                'get_github_repository_info',
                'get_repository_branches',
                'get_repository_issues',
                'create_pull_request',
                'get_pull_request_details',
                'get_pull_requests',
                'get_tags_or_branches',
                'global_search',
                'list_workspace_users',
                'get_slack_user_info',
                'get_user_profile',
                'get_channel_members',
                'create_slack_channel',
                'set_channel_topic',
                'set_channel_purpose',
                'archive_channel',
                'invite_users_to_channel',
                'kick_user_from_channel',
                'open_direct_message',
                'send_direct_message',
                'send_ephemeral_message',
                'reply_to_thread',
                'get_thread_messages',
                'start_thread_with_message',
                'find_threads_in_channel',
                'reply_to_thread_with_broadcast',
                'get_thread_info',
                'get_calendly_user_info',
                'list_calendly_event_types',
                'get_calendly_event_type',
                'get_scheduled_calendly_events',
                'get_calendly_event_details',
                'cancel_calendly_event',
                'create_calendly_webhook_subscription',
                'list_calendly_webhook_subscriptions',
                'delete_calendly_webhook_subscription',
                'create_calendly_scheduling_link',
                'list_calendly_organization_memberships',
                'create_asana_project',
                'list_asana_projects',
                'get_asana_project',
                'update_asana_project',
                'create_asana_task',
                'list_asana_tasks',
                'get_asana_task',
                'update_asana_task',
                'complete_asana_task',
                'list_asana_sections',
                'add_task_to_asana_section',
                'get_asana_user_info',
                'get_asana_workspace_id',
                'create_asana_team',
                'list_asana_team_ids',
                'get_asana_team',
                'connect_to_mongodb',
                'find_documents',
                'aggregate_documents',
                'count_documents',
                'insert_one_document',
                'insert_many_documents',
                'update_one_document',
                'update_many_documents',
                'delete_one_document',
                'delete_many_documents',
                'list_databases',
                'list_collections',
                'create_index',
                'collection_indexes',
                'drop_collection',
                'db_stats',
                'get_stripe_account_info',
                'retrieve_balance',
                'create_coupon',
                'list_coupons',
                'create_customer',
                'list_customers',
                'list_disputes',
                'update_dispute',
                'create_invoice',
                'create_invoice_item',
                'finalize_invoice',
                'list_invoices',
                'create_payment_link',
                'list_payment_intents',
                'create_price',
                'list_prices',
                'create_product',
                'list_products',
                'create_refund',
                'cancel_subscription',
                'list_subscriptions',
                'update_subscription',
                'search_documentation',
                'create_payment_intent',
                'retrieve_payment_intent',
                'confirm_payment_intent',
                'cancel_payment_intent',
                'retrieve_charge',
                'list_charges',
                'capture_charge',
                'create_payment_method',
                'attach_payment_method',
                'detach_payment_method',
                'list_payment_methods',
                'retrieve_payment_method',
                'list_events',
                'retrieve_event',
                'get_zoom_user_info',
                'list_zoom_meetings',
                'create_zoom_meeting',
                'get_zoom_meeting_info',
                'update_zoom_meeting',
                'delete_zoom_meeting',
                'search_gmail_messages',
                'get_gmail_message_content',
                'get_gmail_messages_content_batch',
                'send_gmail_message',
                'draft_gmail_message',
                'get_gmail_thread_content',
                'get_gmail_threads_content_batch',
                'list_gmail_labels',
                'manage_gmail_label',
                'modify_gmail_message_labels',
                'batch_modify_gmail_message_labels',
                'search_drive_files',
                'get_drive_file_content',
                'list_drive_items',
                'create_drive_file',
                'list_drive_shared_drives',
                'delete_drive_file',
                'list_calendars',
                'get_calendar_events',
                'create_calendar_event',
                'modify_calendar_event',
                'delete_calendar_event',
                'get_calendar_event',
                'search_calendar_events'
            ]

module.exports = {
    langGraphEventName,
    llmStreamingEvents,
    toolCallOptions,
    toolDescription,
    IS_MCP_TOOLS
}