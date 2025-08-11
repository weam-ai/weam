import asyncio
from typing import Any, Dict, List
from langchain.callbacks.base import AsyncCallbackHandler
from langchain_core.outputs import LLMResult
from src.logger.default_logger import logger

class CustomAsyncIteratorCallbackHandler(AsyncCallbackHandler):
    """Callback handler that returns an async iterator."""

    queue: asyncio.Queue[str]
    done: asyncio.Event
    cancelled: asyncio.Event

    @property
    def always_verbose(self) -> bool:
        return True

    def __init__(self) -> None:
        self.queue = asyncio.Queue()
        self.done = asyncio.Event()
        self.cancelled = asyncio.Event()

    async def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        # Reset the state for a new conversation
        self.queue = asyncio.Queue()
        self.done.clear()
        self.cancelled.clear()
        logger.info("LLM Start", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.on_llm_start"}})


    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if token is not None and token != "":
            await self.queue.put(token)
        
    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        logger.info("LLM End", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.on_llm_end"}})
        self.done.set()

    async def on_llm_error(self, error: Exception, **kwargs: Any) -> None:
        logger.error(f"LLM Error: {error}", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.on_llm_error"}})
        self.done.set()

    async def on_chat_model_start(self, *args: Any, **kwargs: Any) -> None:
        pass

    def cancel(self) -> None:
        """Cancel the streaming process."""
        logger.info("Streaming cancelled by client", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.cancel"}})
        self.cancelled.set()
        self.done.set()

    # TODO implement the other methods if necessary

    async def aiter(self):
        try:
            retries = 0  # To avoid infinite loop
            max_retries = 800  # Max retries or introduce a timeout
            while True:
                # Check if cancelled
                if self.cancelled.is_set():
                    logger.info("Streaming cancelled, stopping iteration", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.aiter"}})
                    break
                    
                if self.done.is_set() and self.queue.empty():
                    break
                try:
                    token = self.queue.get_nowait()
                    # Double check for cancellation before yielding
                    if self.cancelled.is_set():
                        logger.info("Streaming cancelled before yielding token", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.aiter"}})
                        break
                    yield token
                    retries = 0  # Reset retries on success
                except asyncio.QueueEmpty:
                    retries += 1
                    if self.done.is_set() and self.queue.empty():
                        break
                    if retries > max_retries:
                        logger.warning("Max retries exceeded, breaking loop.")
                        break
                    await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Exception in aiter: {e}", extra={"tags": {"method": "CustomAsyncIteratorCallbackHandler.aiter"}})
            raise


