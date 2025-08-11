from fastapi import HTTPException
from openai import chat
from src.logger.default_logger import logger
from src.chatflow_langchain.service.huggingface.tool_functions.tool_service import  HFToolServiceOpenai
from src.chatflow_langchain.service.openai.tool_functions.tool_service import OpenAIToolServiceOpenai
from src.chatflow_langchain.service.anthropic.tool_functions.tool_service import AnthropicToolService
from src.chatflow_langchain.service.gemini.tool_functions.tool_service import GeminiToolService
from src.chatflow_langchain.controller.config import OpenAIAdvancedModels
from src.chatflow_langchain.service.o1.tool_functions.tool_service import O1ToolServiceOpenai
from src.chatflow_langchain.service.multimodal_router.tool_functions.tool_service import RouterServiceTool
from src.chatflow_langchain.service.weam_router.deepseek.tool_functions.tool_service import WEAMDeepSeekServiceTool
from src.chatflow_langchain.service.weam_router.llama.tool_functions.tool_service import WEAMLlamaServiceTool
from src.chatflow_langchain.service.sdxl.tool_functions.tool_service import SdxlServiceOpenai
class ToolController:
    def __init__(self):
        self.managers = {
            "OPEN_AI": OpenAIToolServiceOpenai,
            "HUGGING_FACE": HFToolServiceOpenai,
            "ANTHROPIC":AnthropicToolService,
            "GEMINI":GeminiToolService,
        }
        self.openai_advance_managers={
           "OPEN_AI_O1":O1ToolServiceOpenai
        }
        self.weam_router={
            "DEEPSEEK":RouterServiceTool,
            "HUGGING_FACE":SdxlServiceOpenai,
            "LLAMA4":RouterServiceTool,
            "QWEN":RouterServiceTool,
            "GROK":RouterServiceTool
        }
     
        self.code = None  # Initialize the code attribute

    def initialization_service_code(self, code: str = None):
        """
        Initializes the Tool Chat with the specified API key and company model.

        Parameters
        ----------
        code : str, optional
            The API key ID used for decryption and initialization.

        Exceptions
        ----------
        Logs an error if the initialization fails.
        """
        try:
            self.code = code
            
        except Exception as e:
            logger.error(
                f"Failed to initialize Tool Service: {e}",
                extra={"tags": {"method": "ToolController.initialization_service_code"}}
            )
            raise HTTPException(status_code=400, detail=f"Failed to initialize Tool Controller: {e}")
    def _select_manager(self, chat_input):
        """
        Selects the appropriate manager based on the code.
        """
     
        if self.code == "OPEN_AI" and chat_input.model_name in OpenAIAdvancedModels.MODELS:
            return self.openai_advance_managers.get(OpenAIAdvancedModels.code)()
        if chat_input.provider == "WEAM":
            return self.weam_router.get(self.code)()
        return self.managers.get(self.code)()


    async def service_hub_handler(self, chat_input, async_handler_ref=None, **kwargs):
        """
        Handles the Tool input and returns the response.

        Parameters
        ----------
        chat_input : Any
            The input data for the chat.
        async_handler_ref : list, optional
            Reference list to store the async handler for external cancellation.
        kwargs : Any
            Additional parameters.

        Returns
        -------
        response_generator : Any
            The response generator from the Tool manager.
        """
        try:
            tool_manager = self._select_manager(chat_input)
            if tool_manager is None:
                raise ValueError("Invalid Tool code provided.")
            
            await tool_manager.initialize_llm(
            api_key_id=chat_input.llm_apikey,
            companymodel=chat_input.companymodel,
            dalle_wrapper_size = chat_input.dalle_wrapper_size,
            dalle_wrapper_quality = chat_input.dalle_wrapper_quality,
            dalle_wrapper_style = chat_input.dalle_wrapper_style,
            thread_id=chat_input.thread_id,
            thread_model=chat_input.threadmodel,
            imageT=chat_input.imageT,
            company_id=chat_input.company_id,
            mcp_data=chat_input.mcp if hasattr(chat_input, 'mcp') else None,
            mcp_tools=chat_input.mcp_tools,
            mcp_request = chat_input.request if hasattr(chat_input, 'request') else None
        )
            tool_manager.initialize_repository(
                chat_session_id=chat_input.chat_session_id,
                collection_name=chat_input.threadmodel,
                regenerated_flag = chat_input.isregenerated,
                msgCredit=chat_input.msgCredit,
                is_paid_user=chat_input.is_paid_user
            )
            logger.info(
                "Initaliazing Repository ended and create graph node started",
                extra={"tags": {"endpoint": "/stream-tool-chat-with-openai"}}
            )
            await tool_manager.create_graph_node()
            logger.info(
                "Create graph node ended and create conversation started",
                extra={"tags": {"endpoint": "/stream-tool-chat-with-openai"}}
            )
            # prompt attach
            # tool_manager.prompt_attach(additional_prompt_id=chat_input.prompt_id,collection_name=chat_input.promptmodel)  

            ## conversation create
            tool_manager.create_conversation(input_text=chat_input.query, image_url=chat_input.image_url,image_source=chat_input.image_source,regenerate_flag = chat_input.isregenerated)  


            # streaming the chat chat serivce
            # Check if the tool manager supports async_handler_ref parameter
            import inspect
            tool_calls_run_signature = inspect.signature(tool_manager.tool_calls_run)
            if 'async_handler_ref' in tool_calls_run_signature.parameters:
                response_generator = tool_manager.tool_calls_run(thread_id=chat_input.thread_id, \
                                                                            collection_name=chat_input.threadmodel,delay_chunk=chat_input.delay_chunk, async_handler_ref=async_handler_ref)
            else:
                response_generator = tool_manager.tool_calls_run(thread_id=chat_input.thread_id, \
                                                                            collection_name=chat_input.threadmodel,delay_chunk=chat_input.delay_chunk)

                
            logger.info(
                "Successfully executed Tool chat API",
                extra={"tags": {"endpoint": "/stream-tool-chat-with-openai"}}
            )
            return response_generator
        except HTTPException as e:
            raise e

        except Exception as e:
            logger.error(
                f"Failed to handle Tool Chat: {e}",
                extra={"tags": {"method": "ToolController.service_hub_handler"}}
            )
            raise HTTPException(status_code=400, detail=e)
