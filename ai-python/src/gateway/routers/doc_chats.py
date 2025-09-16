from fastapi import APIRouter, Request, HTTPException, Depends, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.gateway.schema.chat import DocChatBase
from src.chatflow_langchain.controller.doc import RAGController
from src.gateway.jwt_decode import get_user_data
from src.logger.default_logger import logger
from src.gateway.custom_fastapi.streaming_response import StreamingResponseWithStatusCode
import os
from dotenv import load_dotenv
from src.gateway.utils import log_api_call
import gc

load_dotenv()

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)
limit_doc_stream = os.getenv("LIM_STREAM_DOC", "5/minute")

@router.post(
    "/streaming-chat-with-doc",
    summary="Streaming Chat with Document Model",
    description="Endpoint to interact with the document model for chat purposes.",
    response_description="Response message containing the chat outcome."
)
# @limiter.limit(limit_doc_stream)
async def stream_chat_with_doc(
    request: Request,
    chat_input: DocChatBase,
    current_user=Depends(get_user_data)
):
    """
    Chat with Document Model.

    This endpoint allows users to interact with the document model for chat purposes.

    Args:
        request (Request): The incoming HTTP request.
        chat_input (DocChatBase): Input data for the chat session.

    Returns:
        EventSourceResponse: A stream of messages containing the chat outcome.

    Raises:
        HTTPException: If there is an error processing or storing the text.
    """
    # Log that the API endpoint is called using the helper function
    log_api_call("/streaming-chat-with-doc")
    try:
        query = chat_input.query
        stream_doc_chat_service = RAGController()
        stream_doc_chat_service.initialization_service_code(code=chat_input.code)
        response_generator = await stream_doc_chat_service.service_hub_handler(chat_input=chat_input)
        logger.info(
            "Successfully executed Chat With Document Model API",
            extra={"tags": {"endpoint": "/streaming-chat-with-doc", "chat_session_id": chat_input.chat_session_id}}
        )
        
        return StreamingResponseWithStatusCode(response_generator, media_type="text/event-stream")
     
    except HTTPException as he:
        logger.error(
            "HTTP error executing Chat With Document Model API",
            extra={
                "tags": {
                    "endpoint": "/streaming-chat-with-doc",
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
                    "endpoint": "/streaming-chat-with-doc",
                    "chat_session_id": chat_input.chat_session_id,
                    "error": str(e)
                }
            }
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

    finally:
        gc.collect()