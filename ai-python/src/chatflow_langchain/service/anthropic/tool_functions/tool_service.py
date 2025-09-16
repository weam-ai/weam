import json
import asyncio
from typing import AsyncGenerator
from src.custom_lib.langchain.chat_models.anthropic.chatanthropic_cache import MyChatAnthropic as ChatAnthropic
from langchain.memory import ConversationSummaryBufferMemory
from langchain_community.callbacks.manager import get_openai_callback
from src.chat.service.base.abstract_conversation_service import AbstractConversationService
from src.crypto_hub.services.anthropic.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from src.chatflow_langchain.repositories.tool_history import CustomAIMongoDBChatMessageHistory
from src.chatflow_langchain.repositories.additional_prompts import PromptRepository
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.chatflow_langchain.service.anthropic.tool_functions.config import ToolChatConfig, ImageGenerateConfig
from src.chatflow_langchain.service.config.model_config_anthropic import ANTHROPICMODEL,Functionality
from src.logger.default_logger import logger
from langchain_core.messages import HumanMessage
from fastapi import HTTPException, status
# Custom Library
from src.custom_lib.langchain.callbacks.anthropic.cost.context_manager import anthropic_sync_callback
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.celery_worker_hub.extraction.utils import map_file_url, validate_file_url
from src.chatflow_langchain.utils.fill_additional_prompt import fill_template,format_website_summary_pairs
from src.chatflow_langchain.service.anthropic.tool_functions.tools import simple_chat_v2,website_analysis
import gc
from src.chatflow_langchain.service.anthropic.tool_functions.utils import extract_anthropic_error_message
from src.chatflow_langchain.repositories.openai_error_messages_config import DEV_MESSAGES_CONFIG, ANTHROPIC_ERROR_MESSAGES_CONFIG
from anthropic._exceptions import (AnthropicError,APIError,APIStatusError,APIConnectionError,
    APITimeoutError, AuthenticationError, PermissionDeniedError,NotFoundError,RateLimitError)
from src.round_robin.llm_key_manager import APIKeyUsageService
from langgraph.prebuilt import ToolNode
from langgraph.graph import MessagesState, StateGraph
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from src.chatflow_langchain.service.multimodal_router.config.multmodel_tool_description import ToolDescription
from langchain_core.messages.tool import ToolMessage
from src.custom_lib.langchain.callbacks.anthropic.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.anthropic.cost.context_manager import anthropic_async_callback
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from langchain_core.messages import SystemMessage
from src.prompts.langchain.anthropic.tool_selection_prompt import langgraph_prompt
from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv
import os
from src.MCP.utils import create_mcp_client
from src.chatflow_langchain.service.openai.tool_functions.utils import encode_image_to_base64
load_dotenv()
mcp_url = os.getenv("MCP_URL", "http://mcp:8000/sse")
# Service Initilization
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()
thread_repo = ThreadRepostiory()
prompt_repo = PromptRepository()
cost_callback = CostCalculator()

class AnthropicToolService(AbstractConversationService):
    async def initialize_llm(self, api_key_id: str = None, companymodel: str = None, dalle_wrapper_size: str = None, dalle_wrapper_quality: str = None, dalle_wrapper_style: str = None, thread_id: str = None, thread_model: str = None, imageT=0,company_id:str=None,mcp_data:dict=None,mcp_tools:dict=None,mcp_request:dict=None):
        """
        Initializes the LLM with the specified API key and company model.

        Parameters
        ----------
        api_key_id : str, optional
            The API key ID used for decryption and initialization.
        companymodel : str, optional
            The company model configuration for the LLM.

        Exceptions
        ----------
        Logs an error if the initialization fails.
        """
        try:
            self.jwt_token = mcp_request.headers.get("Authorization", "") if mcp_request else None
            self.origin = mcp_request.headers.get("origin", "")
            llm_apikey_decrypt_service.initialization(api_key_id, companymodel)
            self.encrypted_key = llm_apikey_decrypt_service.apikey
            self.companyRedis_id=llm_apikey_decrypt_service.companyRedis_id
            self.api_usage_service = APIKeyUsageService()
            self.model_name = llm_apikey_decrypt_service.model_name
            self.llm = ChatAnthropic(
                model_name=self.model_name,
                temperature=llm_apikey_decrypt_service.extra_config.get('temprature',0.7),
                api_key=llm_apikey_decrypt_service.decrypt(),
                streaming=True,
                stream_usage=True,
                verbose=False,
                max_tokens=ANTHROPICMODEL.MAX_TOKEN_LIMIT_CONFIG[self.model_name]
            )
            self.mcp_data = mcp_data
            self.thread_id = thread_id
            self.thread_model = thread_model
            self.imageT = imageT
            self.tools = [website_analysis]
            if mcp_tools:
                self.client = create_mcp_client(self.jwt_token, self.origin)
                # Get tools directly without using context manager
                try:
                    self.mcp_tools_list = await self.client.get_tools()
                    logger.info(f"MCP tools loaded successfully: {self.mcp_tools_list}")
                    # Add MCP tools to the existing tools list
                    if self.mcp_tools_list:
                        self.mcp_tools_list = [
                                tool for tool in self.mcp_tools_list
                                if tool.name in {name for tools in mcp_tools.values() for name in ",".join(tools).split(",")}
                            ]
                        self.tools.extend(self.mcp_tools_list)
                        logger.info(f"Added MCP tools to tools list. Total tools: {len(self.tools)}")
                except Exception as mcp_error:
                    logger.error(f"Failed to connect to MCP server: {mcp_error}")
                    # Continue without MCP tools if connection fails
                    self.mcp_tools_list = []
            self.tool_node = ToolNode(self.tools)   
            self.llm_with_tools = self.llm.bind_tools(
                self.tools)
            self.stream_flag=True

            logger.info(
            "LLM initialization successful.",
            extra={"tags": {"method": "ToolStreamingService.initialize_llm"}})
        except Exception as e:
            logger.error(
                f"Failed to initialize LLM: {e}",
                extra={"tags": {"method": "ToolStreamingService.initialize_llm"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Failed to initialize LLM: {e}")
    def should_continue(self,state: MessagesState):
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return END
    
    async def chatbot(self,state,config):
            history_messages = self.chat_repository_history.messages
            history_messages.insert(0,SystemMessage(langgraph_prompt))
            if len(history_messages) > 0:
                history_messages = [prompt for prompt in history_messages if prompt.content != '']
            history_messages.extend(state['messages'])
            new_message = await self.llm_with_tools.ainvoke(history_messages,config=config) 
            if hasattr(new_message, 'tool_calls') and new_message.tool_calls:
                new_message.tool_calls[0]['args']['mcp_data'] = self.mcp_data
            return {"messages": [new_message]}
    
    async def create_graph_node(self):
        # memory = MemorySaver()
        async def node(state: MessagesState,config: RunnableConfig): 
            new_message = await self.chatbot(state=state,config=config)
            return new_message


        builder = StateGraph(MessagesState).add_node("chatbot",node).add_node("tools",self.tool_node).add_conditional_edges(
            "chatbot",
            self.should_continue,
            # The following dictionary lets you tell the graph to interpret the condition's outputs as a specific node
            # It defaults to the identity function, but if you
            # want to use a node named something else apart from "tools",
            # You can update the value of the dictionary to something else
            # e.g., "tools": "my_tools"
            {"tools": "tools", END: END},
        ).add_edge(START, "chatbot").add_edge("tools", "chatbot")
        logger.info(
                "Builder created Starting Compilation",
                extra={"tags": {"endpoint": "/stream-tool-chat-with-openai"}}
            )
        self.graph = builder.compile()
        logger.info(
                "Graph Compiled Successfully",
                extra={"tags": {"endpoint": "/stream-tool-chat-with-openai"}})
        
    def initialize_repository(self, chat_session_id: str = None, collection_name: str = None,regenerated_flag:bool=False,msgCredit:float=0,is_paid_user:bool=False):
        """
        Initializes the chat history repository for data storage.

        Parameters
        ----------
        chat_session_id : str, optional
            The chat session ID for the repository.
        collection_name : str, optional
            The collection name for the repository.

        Exceptions
        ----------
        Logs an error if the repository initialization fails.
        """
        try:
            self.chat_repository_history = CustomAIMongoDBChatMessageHistory()

            self.chat_repository_history.initialize(
                chat_session_id=chat_session_id,
                collection_name=collection_name,
                regenerated_flag=regenerated_flag,
                thread_id = self.thread_id
            )

            self.initialize_memory()
            self.regenerated_flag=regenerated_flag
            self.is_paid_user = is_paid_user
            self.msgCredit = msgCredit
            logger.info("Repository initialized successfully", extra={
            "tags": {"method": "ToolStreamingService.initialize_repository", "chat_session_id": chat_session_id, "collection_name": collection_name}})
        except Exception as e:
            logger.error(
                f"Failed to initalize repository: {e}",
                extra={
                    "tags": {"method": "ToolStreamingService.initialize_repository"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Failed to initialize repository: {e}")

    def initialize_memory(self):
        """
        Sets up the memory component using ConversationSummaryBufferMemory.

        Exceptions
        ----------
        Logs an error if the memory initialization fails.
        """
        try:
          
            self.memory = ConversationSummaryBufferMemory(
                memory_key="history",
                input_key="input",
                llm=self.llm,
                max_token_limit=ToolChatConfig.MAX_TOKEN_LIMIT,
                return_messages=True,
                chat_memory=self.chat_repository_history
            )
            self.memory.moving_summary_buffer = self.chat_repository_history.memory_buffer
            
            logger.info("Memory initialized successfully", extra={
            "tags": {"method": "ToolStreamingService.initialize_memory"}})
        except Exception as e:
            logger.error(
                f"Failed to initalize memory: {e}",
                extra={"tags": {"method": "ToolStreamingService.initialize_memory"}}
            )

    def prompt_attach(self, additional_prompt_id: str = None, collection_name: str = None):
        """
        Attach additional prompt information to improve the quality and accuracy of the generated content.

        This method initializes and retrieves additional prompt content based on a given prompt ID and collection name.
        The retrieved content is then attached to the main prompt object for further use.

        Parameters
        ----------
        additional_prompt_id : str, optional
            The ID of the additional prompt content to be retrieved and attached. If None, no additional content is attached.
        collection_name : str, optional
            The name of the collection where the prompt content is stored. This is required if `additional_prompt_id` is provided.

        Raises
        ------
        ValueError
            If `additional_prompt_id` is provided but `collection_name` is not.
        Exception
            For any other errors encountered during the initialization or retrieval of the prompt content.
        """
        try:
            if additional_prompt_id:
                if not collection_name:
                    raise ValueError(
                        "Collection name must be provided when additional_prompt_id is specified.")

                prompt_repo.initialization(
                    prompt_id=additional_prompt_id, collection_name=collection_name)
                resource_key, resource_value = prompt_repo.get_resource_info()
                if resource_key is not None and resource_value is not None:
                    self.additional_prompt = fill_template(resource_key, resource_value)
                    websites = prompt_repo.get_websites()    
                    summaries = prompt_repo.get_summaries()  
                    formatted_pairs = format_website_summary_pairs(websites,summaries)
                    self.additional_prompt += formatted_pairs
                    logger.info("Successfully attached additional prompt", extra={
                        "tags": {"method": "ToolStreamingService.prompt_attach"},
                        "additional_prompt_id": additional_prompt_id,
                        "collection_name": collection_name})
                else:
                    self.additional_prompt = None
            else:
                self.additional_prompt = None
                logger.info("No additional prompt ID provided, skipping prompt attachment", extra={
                "tags": {"method": "ToolStreamingService.prompt_attach"}})
        except Exception as e:
            logger.error(
                f"Failed to prompt attach: {e}",
                extra={"tags": {"method": "ToolStreamingService.prompt_attach"}}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to prompt attach: {e}")

    def map_and_validate_image_url(self, image_url: str, source: str) -> str:
        try:
            # Map the URL
          
            mapped_url = map_file_url(image_url, source)
            # Validate the mapped URL
            validated_url = validate_file_url(mapped_url, source)
            return validated_url
        except HTTPException as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def create_conversation(self, input_text: str = None, **kwargs):
        """
        Creates a conversation chain with a custom tag.

        Parameters
        ----------
        tag : str
            A tag to filter the retriever data.



        Exceptions
        ----------
        Logs an error if the conversation creation fails.
        """
        try:
            if kwargs.get('regenerate_flag'):
                input_text = " Regenerate the above response with improvements in clarity, relevance, and depth as needed. Adjust the level of detail based on the query's requirements—providing a concise response when appropriate and a more detailed, expanded answer when necessary." + input_text
            self.inputs = input_text
            if kwargs['image_url']:
                if isinstance(kwargs['image_url'],list):
                    image_url=[]
                    for url in kwargs['image_url']:
                        image_url.append(self.map_and_validate_image_url(url, kwargs.get('image_source', 's3_url')))
                    self.image_url = image_url
                else:
                    kwargs['image_url'] = self.map_and_validate_image_url(kwargs['image_url'], kwargs.get('image_source', 's3_url'))
                    self.image_url = kwargs['image_url']
                if self.image_url:
                    # Get base64 encoded images with proper content types
                    encoded_images = []
                    for url in self.image_url:
                        try:
                            encoded_data = await encode_image_to_base64(url)
                            # The encode_image_to_base64 function returns data in format: data:content_type;base64,encoded_string
                            # We need to extract just the base64 part and the content type separately
                            if encoded_data and ';base64,' in encoded_data:
                                parts = encoded_data.split(';base64,')
                                if len(parts) == 2:
                                    content_type = parts[0].replace('data:', '')
                                    base64_data = parts[1]
                                    
                                    # Validate base64 data before adding to encoded_images
                                    try:
                                        # Try to decode the base64 string to verify it's valid
                                        # base64.b64decode(base64_data)
                                        encoded_images.append({"type": "image", "source": {"type": "base64", "media_type": content_type, "data": base64_data}})
                                    except Exception as e:
                                        logger.error(f"Invalid base64 data for URL {url}: {str(e)}", 
                                                    extra={"tags": {"method": "ToolStreamingService.create_conversation"}})
                        except Exception as e:
                            logger.error(f"Error encoding image to base64 for URL {url}: {str(e)}", 
                                        extra={"tags": {"method": "ToolStreamingService.create_conversation"}})
                                        
                    
                    self.query = {"messages": [{"role": "user", "content": [{"type": "text", "text": self.inputs}, *encoded_images]}]}
                logger.debug("Image URL set in query arguments.", extra={
                "tags": {"method": "ToolStreamingService.create_conversation"},
                "image_url": self.image_url})
            else:
                self.image_url = None
                logger.debug("No image URL provided; skipping image URL updates.", extra={
                "tags": {"method": "ToolStreamingService.create_conversation"}})
                self.query = {"messages": [{"role": "user", "content": self.inputs}]}

                
            logger.info("Conversation creation successful.", extra={
            "tags": {"method": "ToolStreamingService.create_conversation"}})
        except Exception as e:
            logger.error(
                f"Failed to create conversation: {e}",
                extra={"tags": {"method": "ToolStreamingService.create_conversation"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Failed to create conversation: {e}")

    async def tool_calls_run(self, thread_id: str, collection_name: str, **kwargs) -> AsyncGenerator[str, None]:
        """
        Executes a conversation and updates the token usage and conversation history.

        Parameters
        ----------
        thread_id : str
            The thread ID for the conversation.
        collection_name : str
            The collection name for storing conversation history.

        Returns
        -------
        AsyncGenerator[str, None]
            An asynchronous generator yielding response tokens.

        Exceptions
        ----------
        Logs an error if the conversation execution fails.
        """
        try:
            delay_chunk = kwargs.get("delay_chunk", 0.0)
            async with anthropic_async_callback(model_name=self.model_name,thread_id=thread_id,collection_name=collection_name,encrypted_key=self.encrypted_key,companyRedis_id=self.companyRedis_id) as cb,\
            get_mongodb_callback_handler(thread_id=thread_id, chat_history=self.chat_repository_history, memory=self.memory,collection_name=collection_name,regenerated_flag=self.regenerated_flag,model_name=self.model_name,msgCredit=self.msgCredit,is_paid_user=self.is_paid_user,encrypted_key=self.encrypted_key,companyRedis_id=self.companyRedis_id) as mongo_handler:
                async for event in self.graph.astream_events(self.query,{'callbacks':[cb,mongo_handler],"configurable":{'thread_id':'1'}},stream_mode='messages',version='v2'):
                    if event["event"] == "on_chat_model_stream":
                        if self.stream_flag:
                            if len(event["data"]["chunk"].content) > 0:
                                if event['data']['chunk'].content[0]['type'] != 'tool_use':
                                    token = event['data']['chunk'].content[0]['text'].encode("utf-8")
                                    yield f"data: {token}\n\n",200
                                    # yield f"event:{event['event']}\ndata: {event['data']}\n\n",200
                                    await asyncio.sleep(delay_chunk)

        # Handle NotFoundError
        except NotFoundError as e:
            error_content, error_code = extract_anthropic_error_message(str(e))
            if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.NotFoundError"}})
            else:
                logger.error(
                    f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.NotFoundError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai(error_code)

            llm_apikey_decrypt_service.update_deprecated_status(True)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        # Handle specific errors like RateLimitError.
        except RateLimitError as e:
            error_content, error_code = extract_anthropic_error_message(str(e))
            if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.RateLimitError"}})
            else:
                logger.error(
                    f"🚨 Rate Limit Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.RateLimitError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai(error_code)

            llm_apikey_decrypt_service.update_deprecated_status(True)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS

        except APIStatusError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APIStatusError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APIStatusError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except AuthenticationError as e:
            logger.error(
                f"Anthropic Authentication Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run.AuthenticationError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("authentication_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("authentication_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
        
        except PermissionDeniedError as e:
            logger.error(
                f"Anthropic PermissionDenied Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run.PermissionDeniedError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("permission_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("permission_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APIConnectionError as e:
            logger.error(
                f"Anthropic APIConnection Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APIConnectionError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("api_connection_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_connection_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APITimeoutError as e:
            logger.error(
                f"Anthropic APITimeout Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APITimeoutError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("api_timeout_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_timeout_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APIError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APIError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 Anthropic API Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.APIError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
        
        except AnthropicError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.AnthropicError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 Anthropic General Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run.AnthropicError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except Exception as e:
                try:
                    error_content,error_code = extract_anthropic_error_message(str(e))
                    if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                        logger.warning(
                            f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                            extra={"tags": {"method": "AnthropicToolService.tool_calls_run.Exception_Try"}})
                    else:
                        logger.error(
                            f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                            extra={"tags": {"method": "AnthropicToolService.tool_calls_run.Exception_Try"}})
                    thread_repo.initialization(thread_id, collection_name)
                    thread_repo.add_message_openai(error_code)
                    content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
                    yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
                except Exception as e:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {e}",
                        extra={"tags": {"method": "AnthropicToolService.tool_calls_run.Exception_Except"}})
                    thread_repo.initialization(thread_id, collection_name)
                    thread_repo.add_message_openai("common_response")
                    content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                    yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST

        finally:
            # Ensure cleanup is always called
            self.cleanup()

    async def tool_calls_run_mock(self, thread_id: str, collection_name: str, **kwargs) -> AsyncGenerator[str, None]:
        """
        Executes a conversation and updates the token usage and conversation history.

        Parameters
        ----------
        thread_id : str
            The thread ID for the conversation.
        collection_name : str
            The collection name for storing conversation history.

        Returns
        -------
        AsyncGenerator[str, None]
            An asynchronous generator yielding response tokens.

        Exceptions
        ----------
        Logs an error if the conversation execution fails.
        """
        try:
            delay_chunk = kwargs.get("delay_chunk", 0.0)
            cost = CostCalculator()
            with get_openai_callback() as cb:
                ai_msg = self.llm_with_tools.invoke(self.inputs)
            for tool_call in ai_msg.tool_calls:
                selected_tool = {tool.name.lower(): tool for tool in self.tools}[
                    tool_call['name'].lower()]
                tool_call['args'].update(
                    self.query_arguments[selected_tool.name])
                async for tool_output in selected_tool(tool_call['args']):
                    yield tool_output  # Process the streamed output here
                    await asyncio.sleep(delay_chunk)
                break
            thread_repo.initialization(
                thread_id=thread_id, collection_name=collection_name)
            thread_repo.update_token_usage(cb=cb)
            
        # Handle NotFoundError
        except NotFoundError as e:
            error_content, error_code = extract_anthropic_error_message(str(e))
            if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.NotFoundError"}})
            else:
                logger.error(
                    f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.NotFoundError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai(error_code)

            llm_apikey_decrypt_service.update_deprecated_status(True)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        # Handle specific errors like RateLimitError.
        except RateLimitError as e:
            error_content, error_code = extract_anthropic_error_message(str(e))
            if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.RateLimitError"}})
            else:
                logger.error(
                    f"🚨 Rate Limit Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.RateLimitError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai(error_code)

            llm_apikey_decrypt_service.update_deprecated_status(True)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS

        except APIStatusError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APIStatusError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APIStatusError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except AuthenticationError as e:
            logger.error(
                f"Anthropic Authentication Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.AuthenticationError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("authentication_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("authentication_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
        
        except PermissionDeniedError as e:
            logger.error(
                f"Anthropic PermissionDenied Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.PermissionDeniedError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("permission_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("permission_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APIConnectionError as e:
            logger.error(
                f"Anthropic APIConnection Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APIConnectionError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("api_connection_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_connection_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APITimeoutError as e:
            logger.error(
                f"Anthropic APITimeout Error: {e}",
                extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APITimeoutError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_openai("api_timeout_error")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_timeout_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except APIError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APIError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 Anthropic API Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.APIError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
        
        except AnthropicError as e:
            error_content,error_code = extract_anthropic_error_message(str(e))
            if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.AnthropicError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
            else:
                logger.error(
                    f"🚨 Anthropic General Error: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.AnthropicError"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except Exception as e:
                try:
                    error_content,error_code = extract_anthropic_error_message(str(e))
                    if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                        logger.warning(
                            f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                            extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.Exception_Try"}})
                    else:
                        logger.error(
                            f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                            extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.Exception_Try"}})
                    thread_repo.initialization(thread_id, collection_name)
                    thread_repo.add_message_openai(error_code)
                    content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
                    yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
                except Exception as e:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {e}",
                        extra={"tags": {"method": "AnthropicToolService.tool_calls_run_mock.Exception_Except"}})
                    thread_repo.initialization(thread_id, collection_name)
                    thread_repo.add_message_openai("common_response")
                    content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                    yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST

        finally:
            # Ensure cleanup is always called
            self.cleanup()

    async def test(self):
        """
        A simple test method to yield test events.
        """
        yield "event: streaming\ndata: Initial connection established\n\n"
        await asyncio.sleep(0.2)

        for words in ['k', 'a', 'b', 'c', 'd']:
            yield f"event: streaming\ndata: {words}\n\n"
            await asyncio.sleep(0.2)

    def cleanup(self):
        """
        Cleans up any resources or state associated with the service.
        """
        cleaned_up = []
        try:
            # List of attributes to clean up
            attributes = [
                'llm',
                'llm_non_stream',
                'memory',
                'conversation',
                'additional_prompt',
                'inputs',
                'image_url',
                'history_messages',
                'query_arguments',
                'tools',
                'llm_with_tools',
                'api_usage_service'
            ]

            for attr in attributes:
                if hasattr(self, attr):
                    # Deletes the attribute from the instance
                    delattr(self, attr)
                    # Adds the attribute name to the cleaned_up list
                    cleaned_up.append(attr)

            gc.collect()  # Force garbage collection to free memory

            # Log a single message with the list of cleaned-up attributes
            if cleaned_up:
                logger.info(
                    f"Successfully cleaned up resources: {', '.join(cleaned_up)}."
                )

        except Exception as e:
            logger.error(
                f"Failed to cleanup resources: {e}",
                extra={"tags": {"method": "ToolStreamingService.cleanup"}}
            )
