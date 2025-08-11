from fastapi import APIRouter, Request, HTTPException, Depends, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.gateway.schema.tool_chat import ToolChatBase
from src.gateway.jwt_decode import get_user_data
from src.logger.default_logger import logger
from src.gateway.custom_fastapi.streaming_response import StreamingResponseWithStatusCode
from src.chatflow_langchain.controller.tool_hub import ToolController
import os
from dotenv import load_dotenv
from src.gateway.utils import log_api_call
import gc

load_dotenv()

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)
limit_tool_chat = os.getenv("LIM_TOOL_CHAT", "5/minute")


@router.post(
    "/stream-tool-chat-with-openai",
    summary="Stream Tool Chat with OpenAI Model",
    description="Endpoint to interact with the OpenAI model for chat purposes.",
    response_description="Response message containing the chat outcome.",
)
# @limiter.limit(limit_tool_chat)
async def too_chat_with_ai(
    request: Request,
    chat_input: ToolChatBase,
    current_user=Depends(get_user_data)
):
    """
    Tool Chat with OpenAI Model.

    This endpoint allows users to interact with the OpenAI model for chat purposes.

    Args:
        request (Request): The incoming HTTP request.
        chat_id (str): Unique identifier for the chat session.
        chat_input (ToolChatBase): Input data for the chat session.

    Returns:
        str: A message containing the chat outcome.

    Raises:
        HTTPException: If there is an error processing or storing the text.
    """
    # Log that the API endpoint is called using the helper function
    log_api_call("/stream-tool-chat-with-openai")
    try:
        query = chat_input.query
        tool_chat_service=ToolController()
        chat_input.request = request
        if 'mcpdata' in current_user:
            chat_input.mcp = str(current_user['_id'])
        tool_chat_service.initialization_service_code(code=chat_input.code)
        async_handler_ref = []
        response_generator = await tool_chat_service.service_hub_handler(chat_input=chat_input, async_handler_ref=async_handler_ref)
        logger.info(
            "Successfully executed Tool chat with Model API",
            extra={"tags": {"endpoint": "/stream-tool-chat-with-openai", "chat_session_id": chat_input.chat_session_id}}
        )
        
        streaming_response = StreamingResponseWithStatusCode(response_generator, media_type="text/event-stream")
        
        # Set the async handler for cancellation support
        if async_handler_ref:
            streaming_response.set_async_handler(async_handler_ref[0])
            
        return streaming_response

    except HTTPException as he:
        logger.error(
            "HTTP error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/stream-tool-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(he)
                }
            }
        )
        raise he  # Re-raise the HTTPException to be handled by FastAPI

    except Exception as e:
        logger.error(
            "Error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/stream-tool-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(e)
                }
            }
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 
    finally:
        gc.collect()





#### ===Tool Chat API Mock======
@router.post(
    "/mock-stream-tool-chat-with-openai",
    summary="Tool Chat with OpenAI Model",
    description="Endpoint to interact with the OpenAI model for chat purposes.",
    response_description="Response message containing the chat outcome.",
)

# @limiter.limit(limit_tool_chat)
async def too_chat_with_ai(
    request: Request,
    chat_input: ToolChatBase,
    current_user=Depends(get_user_data)
):
    """
    Tool Chat with OpenAI Model.

    This endpoint allows users to interact with the OpenAI model for chat purposes.

    Args:
        request (Request): The incoming HTTP request.
        chat_id (str): Unique identifier for the chat session.
        chat_input (ToolChatBase): Input data for the chat session.

    Returns:
        str: A message containing the chat outcome.

    Raises:
        HTTPException: If there is an error processing or storing the text.
    """
    # Log that the API endpoint is called using the helper function
    log_api_call("/mock-stream-tool-chat-with-openai")
    try:
        query = chat_input.query
        tool_chat_service=ToolController()
        tool_chat_service.initialize_llm(
            api_key_id=chat_input.llm_apikey,
            companymodel=chat_input.companymodel,
            dalle_wrapper_size = chat_input.dalle_wrapper_size,
            dalle_wrapper_quality = chat_input.dalle_wrapper_quality,
            dalle_wrapper_style = chat_input.dalle_wrapper_style,
            thread_id=chat_input.thread_id,
            thread_model=chat_input.threadmodel,
            imageT=chat_input.imageT
        )
        tool_chat_service.initialize_repository(
            chat_session_id=chat_input.chat_session_id,
            collection_name=chat_input.threadmodel
        )
        # prompt attach
        tool_chat_service.prompt_attach(additional_prompt_id=chat_input.prompt_id,collection_name=chat_input.promptmodel)  
        
        ## conversation create
        tool_chat_service.create_conversation(input_text=chat_input.query, image_url=chat_input.image_url,image_source=chat_input.image_source)  

        # streaming the chat chat serivce
        response_generator = tool_chat_service.tool_calls_run_mock(thread_id=chat_input.thread_id, \
                                                                         collection_name=chat_input.threadmodel,delay_chunk=chat_input.delay_chunk)
        logger.info(
            "Successfully executed Tool chat with Model API",
            extra={"tags": {"endpoint": "/tool-stream-chat-with-openai", "chat_session_id": chat_input.chat_session_id}}
        )
        return StreamingResponseWithStatusCode(response_generator, media_type="text/event-stream")

    except HTTPException as he:
        logger.error(
            "HTTP error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/mock-stream-tool-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(he)
                }
            }
        )
        raise he  # Re-raise the HTTPException to be handled by FastAPI

    except Exception as e:
        logger.error(
            "Error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/mock-stream-tool-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(e)
                }
            }
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 
    finally:
        gc.collect()
