"""Callback Handler streams to stdout on new llm token."""
from __future__ import annotations
import sys
from typing import TYPE_CHECKING, Any, Dict, List

if TYPE_CHECKING:
    from langchain_core.agents import AgentAction, AgentFinish
    from langchain_core.messages import BaseMessage
    from langchain_core.outputs import LLMResult
from langchain.callbacks.base import AsyncCallbackHandler

class AsyncStreamingStdOutCallbackHandler(AsyncCallbackHandler):
    """Callback handler for streaming. Only works with LLMs that support streaming."""

    async def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        """Run when LLM starts running."""

    async def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[BaseMessage]],
        **kwargs: Any,
    ) -> None:
        """Run when LLM starts running."""

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        """Run on new LLM token. Only available when streaming is enabled."""
        sys.stdout.write(token)
        sys.stdout.flush()

    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        """Run when LLM ends running."""

    async def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:
        """Run when LLM errors."""

    async def on_chain_start(
        self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any
    ) -> None:
        """Run when chain starts running."""

    async def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:
        """Run when chain ends running."""

    async def on_chain_error(self, error: BaseException, **kwargs: Any) -> None:
        """Run when chain errors."""

    async def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, **kwargs: Any
    ) -> None:
        """Run when tool starts running."""

    async def on_agent_action(self, action: AgentAction, **kwargs: Any) -> Any:
        """Run on agent action."""
        pass

    async def on_tool_end(self, output: Any, **kwargs: Any) -> None:
        """Run when tool ends running."""

    async def on_tool_error(self, error: BaseException, **kwargs: Any) -> None:
        """Run when tool errors."""

    async def on_text(self, text: str, **kwargs: Any) -> None:
        """Run on arbitrary text."""

    async def on_agent_finish(self, finish: AgentFinish, **kwargs: Any) -> None:
        """Run on agent end."""
