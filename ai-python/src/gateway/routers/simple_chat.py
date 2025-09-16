from fastapi import APIRouter, Request, HTTPException, Depends, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.gateway.schema.chat import ChatBase
from src.gateway.jwt_decode import get_user_data
from src.logger.default_logger import logger
from src.gateway.custom_fastapi.streaming_response import StreamingResponseWithStatusCode
import os
from dotenv import load_dotenv
from src.gateway.utils import log_api_call
import gc
from src.chatflow_langchain.service.openai.simple_chat.system_conversation import OpenAISimpleStreamingChatService

load_dotenv()

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)
limit_stream_chat = os.getenv("LIM_SIMPLE_STREAM_CHAT", "5/minute")

@router.post(
    "/stream-chat-with-openai",
    summary="Streaming Chat with OpenAI Model",
    description="Endpoint to interact with the OpenAI model for chat purposes.",
    response_description="Response message containing the chat outcome.",
)
# @limiter.limit(limit_stream_chat)
async def chat_with_ai(
    request: Request,
    chat_input: ChatBase,
    current_user=Depends(get_user_data)
):
    """
    Chat with OpenAI Model.

    This endpoint allows users to interact with the OpenAI model for chat purposes.

    Args:
        request (Request): The incoming HTTP request.
        chat_id (str): Unique identifier for the chat session.
        chat_input (ChatBase): Input data for the chat session.

    Returns:
        str: A message containing the chat outcome.

    Raises:
        HTTPException: If there is an error processing or storing the text.
    """
    # Log that the API endpoint is called using the helper function
    log_api_call("/stream-chat-with-openai")
    try:
        query = chat_input.query
        stream_chat_service=OpenAISimpleStreamingChatService()
        stream_chat_service.initialize_llm(
            api_key_id=chat_input.llm_apikey,
            companymodel=chat_input.companymodel
        )
        stream_chat_service.initialize_repository(
            chat_session_id=chat_input.chat_session_id,
            collection_name=chat_input.threadmodel
        )
        # prompt attach
        stream_chat_service.prompt_attach(additional_prompt_id=chat_input.prompt_id,collection_name=chat_input.promptmodel)  
        
        ## conversation create
        stream_chat_service.create_conversation(input_text=chat_input.query, image_url=chat_input.image_url,image_source=chat_input.image_source)  

        # streaming the chat chat serivce
        response_generator = stream_chat_service.stream_run_conversation(thread_id=chat_input.thread_id, \
                                                                         collection_name=chat_input.threadmodel,delay_chunk=chat_input.delay_chunk)
        logger.info(
            "Successfully executed Chat With Document Model API",
            extra={"tags": {"endpoint": "/streaming-chat-with-openai", "chat_session_id": chat_input.chat_session_id}}
        )
        return StreamingResponseWithStatusCode(response_generator, media_type="text/event-stream")

    except HTTPException as he:
        logger.error(
            "HTTP error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/streaming-chat-with-openai",
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
                    "endpoint": "/streaming-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(e)
                }
            }
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 
    finally:
        gc.collect()
        
@router.post(
    "/mock-stream-chat-with-openai",
    summary="Streaming Chat with OpenAI Model",
    description="Endpoint to interact with the OpenAI model for chat purposes.",
    response_description="Response message containing the chat outcome.",
)
# @limiter.limit(limit_stream_chat)
async def chat_with_ai(
    request: Request,
    chat_input: ChatBase,
    current_user=Depends(get_user_data)
):
    """
    Chat with OpenAI Model.

    This endpoint allows users to interact with the OpenAI model for chat purposes.

    Args:
        request (Request): The incoming HTTP request.
        chat_id (str): Unique identifier for the chat session.
        chat_input (ChatBase): Input data for the chat session.

    Returns:
        str: A message containing the chat outcome.

    Raises:
        HTTPException: If there is an error processing or storing the text.
    """
    # Log that the API endpoint is called using the helper function
    log_api_call("/mock-stream-chat-with-openai")
    try:
        query = chat_input.query
        stream_chat_service=OpenAISimpleStreamingChatService()
        stream_chat_service.initialize_llm(
            api_key_id=chat_input.llm_apikey,
            companymodel=chat_input.companymodel
        )
        stream_chat_service.initialize_repository(
            chat_session_id=chat_input.chat_session_id,
            collection_name=chat_input.threadmodel
        )
        # prompt attach
        stream_chat_service.prompt_attach(additional_prompt_id=chat_input.prompt_id,collection_name=chat_input.promptmodel)  

        ## conversation create 
        stream_chat_service.create_conversation(input_text=chat_input.query,image_url=chat_input.image_url)  

        # streaming the chat chat serivce
        response_generator = stream_chat_service.stream_run_conversation_utf(thread_id=chat_input.thread_id, \
                                                                         collection_name=chat_input.threadmodel,delay_chunk=chat_input.delay_chunk)
        logger.info(
            "Successfully executed Chat With Document Model API",
            extra={"tags": {"endpoint": "/streaming-chat-with-openai", "chat_session_id": chat_input.chat_session_id}}
        )
        return StreamingResponseWithStatusCode(response_generator, media_type="text/event-stream")

    except HTTPException as he:
        logger.error(
            "HTTP error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/streaming-chat-with-openai",
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
                    "endpoint": "/streaming-chat-with-openai",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(e)
                }
            }
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 