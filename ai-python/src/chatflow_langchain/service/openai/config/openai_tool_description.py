class ToolServiceDescription:
    WEB_ANALYSIS = '''
    Deeply analyze multiple or single webpages or URLs provided by the user.
    
    Functionality:
    - Fetch and parse page content: text, images, metadata.
    - Generate structured summaries.
    - Highlight important sections.
    - Extract entities, identify sentiment, themes, and key statistics.

    Parameters:
    - original_query (str): The current user's input query. **Do not modify** this parameter.
    - implicit_reference_urls (List[str]): A list of URLs that are implicitly referenced in the user's query.

    Runtime Behavior:
    - STRICTLY: Only the `implicit_reference_urls` parameter should be passed to the tool at runtime.
      This list must include all URLs implicitly referenced by the user's query.
    - Do not invoke this tool more than once per user query — all relevant URLs must be included in a **single call**.
    - Use `implicit_reference_urls` only when the user query **does not explicitly contain a URL**, 
      but instead refers to previously mentioned or related pages.
    '''
    WEB_SEARCH_PREVIEW='''
    Web Search Tool:-
    This tool is designed to retrieve accurate and up-to-date information from the internet through contextual web search. It should be strictly used when the user query involves real-time events, live updates, or current data that is likely to change frequently or be time-sensitive.
    Use this tool when:
    The query relates to ongoing events, current news, stock prices, weather, sports results, or the latest product or policy updates.
    The answer depends on local or time-based context, such as business hours, event schedules, trending topics, or regional availability.
    The user explicitly requests the most recent, latest, live, or current information.
    '''
    IMAGE_GENERATION="""An image generation and modification tool that enables users to create images from text descriptions and make various visual changes to the generated images. Users can remove objects, replace elements, insert new items, Edit Images and make other detailed modifications to the images directly using the tool. Tool supports a variety of image sizes and aspect ratios, including 1024x1024 for Square images, 1024x1536 for Portrait images and 1536x1024 for Landscape images.

    1024x1024 (Square): Ideal for social media posts, profile pictures, digital artwork, and product images.
    1024x1536 (Portrait): Perfect for mobile content, social media stories, and vertical ads.
    1536x1024 (Landscape): Great for presentations, video thumbnails, website banners, and widescreen displays.

   Parameters:
    - image_size (str): The desired size of the generated image. Supported values are "1024x1024", "1024x1536", and "1536x1024".

    IMPORTANT: Do NOT use this tool if the user requests to generate code based on an image input and a prompt. For such cases, use the chat tool to generate code from the image and prompt.
    """
    SIMPLE_CHAT="""A versatile conversation tool designed to generate responses for various user inputs, including code, text-related queries, and image descriptions.
        When to use this tool:
        - Responding to general questions.
        - Handling code or text-related queries.
        - Providing descriptions for images based on user requests.
        - Generating code based on an image input and a prompt. If the user asks to generate code from an image and a prompt, use this tool.
    """
    RAG_CONVERSATION="""A dynamic conversational tool that generates responses by integrating information retrieval and generative capabilities. It is optimized for responding to a wide range of user inputs, including code, general knowledge queries, and image descriptions.

        When to use this tool:

        Answering factual or information-based questions.
        Assisting with coding tasks, debugging, or generating code snippets.
        Providing descriptive responses for user-provided image prompts or generating new visuals based on detailed requests."""

    CURRENT_TIME = """
        A Tool that gives current date and time.
        Call this tool when prompted with date or time related questions/queries.
        Call this tool when the user has time related terms in the query like "current time", "now", "today", "tomorrow", etc.
        Returns:
            str: Current date and time in ISO and human readable format
    """
