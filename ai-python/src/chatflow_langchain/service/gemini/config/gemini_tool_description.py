
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
    - reference_urls (List[str]): A list of URLs that are implicitly referenced in the user's query.

    Runtime Behavior:
    - STRICTLY: Only the `reference_urls` parameter should be passed to the tool at runtime.
      This list must include all URLs implicitly referenced by the user's query.
    - Do not invoke this tool more than once per user query — all relevant URLs must be included in a **single call**.
    - Use `reference_urls` only when the user query **explicitly contain a URL**, 
      Or instead refers to previously mentioned or related pages.
    
    ''' 

    IMAGE_GENERATION="""An image generation and modification tool that enables users to create images from text descriptions and make various visual changes to the generated images. Users can remove objects, replace elements, insert new items,Edit Images and make other detailed modifications to the images directly using the tool."""

    SIMPLE_CHAT="""A versatile conversation tool designed to generate responses for various user inputs, including code, text-related queries, and image descriptions.
        When to use this tool:

        Responding to general questions.
        Handling code or text-related queries.
        Providing descriptions for images based on user requests.
    """

    RAG_CONVERSATION="""A dynamic conversational tool that generates responses by integrating information retrieval and generative capabilities. It is optimized for responding to a wide range of user inputs, including code, general knowledge queries, and image descriptions.

        When to use this tool:

        Answering factual or information-based questions.
        Assisting with coding tasks, debugging, or generating code snippets.
        Providing descriptive responses for user-provided image prompts or generating new visuals based on detailed requests."""