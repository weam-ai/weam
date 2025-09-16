from typing import AsyncGenerator
from contextlib import asynccontextmanager
from src.logger.default_logger import logger
from src.custom_lib.langchain.callbacks.openai.streaming.stream_async_handler import AsyncStreamingStdOutCallbackHandler
from src.custom_lib.langchain.callbacks.openai.streaming.custom_stream_async_handler import CustomAsyncIteratorCallbackHandler

@asynccontextmanager
async def streaming_stdout_callback()-> AsyncGenerator[AsyncStreamingStdOutCallbackHandler, None]:
    handler = AsyncStreamingStdOutCallbackHandler()
    try:
        yield handler
    finally:
        pass


@asynccontextmanager
async def async_streaming_handler()-> AsyncGenerator[CustomAsyncIteratorCallbackHandler, None]:
    handler = CustomAsyncIteratorCallbackHandler()
    try:
        yield handler
    except Exception as e:
        logger.error(
            f"Failed to async context manager: {e}",
            extra={"tags": {"method": "streaming.async_streaming_handler"}}
        )
        # Cancel handler on exception
        handler.cancel()
        raise e
    finally:
        logger.info(
            "Async context manager completed",
            extra={"tags": {"method": "streaming.async_streaming_handler"}}
        )