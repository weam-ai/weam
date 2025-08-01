import json 
import asyncio
from typing import AsyncGenerator
from src.custom_lib.langchain.chat_models.openai.chatopenai_cache import MyChatOpenAI as ChatOpenAI
from langchain.memory import ConversationSummaryBufferMemory
from src.chat.service.base.abstract_conversation_service import AbstractConversationService
from src.chatflow_langchain.service.huggingface.simple_chat.chat_prompt_factory import create_chat_prompt_doc,create_chat_prompt_doc_image
from src.custom_lib.langchain.chain.custom_conversation_chain import CustomConversationChain
from src.crypto_hub.services.huggingface.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from src.chatflow_langchain.repositories.langchain_mongo_chat_history import CustomAIMongoDBChatMessageHistory
from src.chatflow_langchain.repositories.additional_prompts import PromptRepository
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.chatflow_langchain.service.huggingface.simple_chat.config import SimpleChatConfig
from src.logger.default_logger import logger
from fastapi import HTTPException,status
## Custom Library 
from src.custom_lib.langchain.callbacks.openai.cost.context_manager import get_custom_openai_callback
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.custom_lib.langchain.callbacks.openai.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.openai.streaming.context_manager import async_streaming_handler
from src.celery_worker_hub.extraction.utils import map_file_url,validate_file_url
from src.chatflow_langchain.utils.fill_additional_prompt import fill_template, format_website_summary_pairs
import gc
from src.chatflow_langchain.service.huggingface.simple_chat.utils import extract_error_message
from src.chatflow_langchain.repositories.openai_error_messages_config import DEV_MESSAGES_CONFIG,HF_ERROR_MESSAGES_CONFIG
from requests.exceptions import HTTPError
from huggingface_hub.utils import HfHubHTTPError, EntryNotFoundError, BadRequestError

# Service Initilization 
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()
chat_repository_history = CustomAIMongoDBChatMessageHistory()
thread_repo = ThreadRepostiory()
prompt_repo = PromptRepository()

class HFSimpleStreamingChatService(AbstractConversationService):
    def initialize_llm(self, api_key_id: str = None, companymodel: str = None):
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
            llm_apikey_decrypt_service.initialization(api_key_id, companymodel)
            self.llm = ChatOpenAI(
                model_name=llm_apikey_decrypt_service.model_name,
                temperature=llm_apikey_decrypt_service.extra_config.get('temperature'),
                api_key=llm_apikey_decrypt_service.decrypt(),
                streaming=True,
                verbose=False,
                use_responses_api=True
            )
            self.llm_non_stream = ChatOpenAI(
                model_name=llm_apikey_decrypt_service.model_name,
                temperature=llm_apikey_decrypt_service.extra_config.get('temperature'),
                api_key=llm_apikey_decrypt_service.decrypt(),
                streaming=False,
                verbose=False,
                use_responses_api=True
            )
        except Exception as e:
            logger.error(
                f"Failed to initialize LLM: {e}",
                extra={"tags": {"method": "HFSimpleStreamingChatService.initialize_llm"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to initialize LLM: {e}")  
    
    def initialize_repository(self, chat_session_id: str = None, collection_name: str = None):
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
            self.chat_repository_history = chat_repository_history.initialize(
                chat_session_id=chat_session_id,
                collection_name=collection_name
            )
            self.initialize_memory()
        except Exception as e:
            logger.error(
                f"Failed to initalize repository: {e}",
                extra={"tags": {"method": "HFSimpleStreamingChatService.initialize_repository"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to initialize repository: {e}")

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
                llm=self.llm_non_stream,
                max_token_limit=SimpleChatConfig.MAX_TOKEN_LIMIT,
                return_messages=True,
                chat_memory=chat_repository_history
            )
        except Exception as e:
            logger.error(
                f"Failed to initalize memory: {e}",
                extra={"tags": {"method": "HFSimpleStreamingChatService.initialize_memory"}}
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
                    raise ValueError("Collection name must be provided when additional_prompt_id is specified.")

                prompt_repo.initialization(prompt_id=additional_prompt_id, collection_name=collection_name)
                resource_key,resource_value = prompt_repo.get_resource_info()
                if resource_key is not None and resource_value is not None:
                    self.additional_prompt = fill_template(resource_key,resource_value)
                    websites = prompt_repo.get_websites()    
                    summaries = prompt_repo.get_summaries()  
                    formatted_pairs = format_website_summary_pairs(websites,summaries)
                    self.additional_prompt += formatted_pairs
                    logger.info("Successfully attached additional prompt", extra={
                        "tags": {"method": "HFSimpleStreamingChatService.prompt_attach"},
                        "additional_prompt_id": additional_prompt_id,
                        "collection_name": collection_name})
                else:
                    self.additional_prompt = None
            else:
                self.additional_prompt = None
        except Exception as e:
            logger.error(
                f"Failed to prompt attach: {e}",
                extra={"tags": {"method": "HFSimpleStreamingChatService.prompt_attach"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to prompt attach: {e}")

    def map_and_validate_image_url(self, image_url: str, source: str) -> str:
        try:
            # Map the URL
            mapped_url = map_file_url(image_url, source)
            # Validate the mapped URL
            validated_url = validate_file_url(mapped_url, source)
            return validated_url
        except HTTPException as e:
            raise HTTPException(status_code=400, detail=str(e))

    def create_conversation(self, input_text:str=None,**kwargs):
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
            if kwargs['image_url']:
                kwargs['image_url'] = self.map_and_validate_image_url(kwargs['image_url'], kwargs.get('image_source', 's3_url'))
                self.prompt=create_chat_prompt_doc_image(additional_prompt=self.additional_prompt,**kwargs)
                self.inputs={"input": input_text,"image_url":kwargs['image_url']}
            else:
                self.prompt = create_chat_prompt_doc(additional_prompt=self.additional_prompt,**kwargs)
                self.inputs={"input": input_text}
            self.conversation = CustomConversationChain(
                prompt=self.prompt,
                llm=self.llm,
                memory=self.memory,
                verbose=False,
                
            )

        except Exception as e:
            logger.error(
                f"Failed to create conversation: {e}",
                extra={"tags": {"method": "HFSimpleStreamingChatService.create_conversation"}}
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to create conversation: {e}")

    def _get_inputs(self):
        return self.inputs

    async def stream_run_conversation(self, thread_id: str, collection_name: str,**kwargs) -> AsyncGenerator[str, None]:
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
            delay_chunk=kwargs.get("delay_chunk",0.0)
            cost = CostCalculator()
            async with async_streaming_handler() as async_handler, \
                    get_custom_openai_callback(llm_apikey_decrypt_service.model_name, cost=cost, thread_id=thread_id, collection_name=collection_name) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=self.memory,collection_name=collection_name) as mongo_handler:
                   
                    run = asyncio.create_task( self.conversation.arun(
                        self._get_inputs(),
                        callbacks=[cb, mongo_handler, async_handler]
                    ))

                    async for token in async_handler.aiter():
                         data = token.encode("utf-8")
                         yield f"data: {data}\n\n",200
                         await asyncio.sleep(delay_chunk)
                        #  yield f"data: {json.dumps(token)}\n\n",200
                    await run

        # Handling errors from Hugging Face libraries
        except ValueError as e:
            logger.error(f"Hugging Face Value Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.ValueError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("value_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("value_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except RuntimeError as e:
            logger.error(f"Hugging Face Runtime Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.RuntimeError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("runtime_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("runtime_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        # Hugging Face Hub Exceptions
        except HTTPError as e:
            logger.error(f"Hugging Face Hub HTTP Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.HTTPError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("http_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("http_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except HfHubHTTPError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW HF HUB ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.HfHubHTTPError"}})
            # else:
            #     logger.error(
            #         f"🚨 Hugging Face Hub Error: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.HfHubHTTPError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("hf_hub_http_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("hf_hub_http_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except EntryNotFoundError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW ENTRY NOT FOUND ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.EntryNotFoundError"}})
            # else:
            #     logger.error(
            #         f"🚨 Entry Not Found: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.EntryNotFoundError"}})
            logger.error(f"Entry Not Found: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.EntryNotFoundError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("entry_not_found")
            content = HF_ERROR_MESSAGES_CONFIG.get("entry_not_found", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except BadRequestError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW BAD REQUEST ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.BadRequestError"}})
            # else:
            #     logger.error(
            #         f"🚨 Bad Request Error: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.BadRequestError"}})
            logger.error(f"Bad Request Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.BadRequestError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("bad_request_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("bad_request_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except Exception as e:
            try:
                error_content,error_code = extract_error_message(str(e))
                if error_code not in HF_ERROR_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.Exception_Except"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.Exception_Except"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_huggingface(error_code)
                content = HF_ERROR_MESSAGES_CONFIG.get(error_code, HF_ERROR_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation.Exception_Except"}})
                thread_repo.initialization(self.thread_id, collection_name)
                thread_repo.add_message_huggingface("common_response")
                content = HF_ERROR_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST
        finally:
            # Ensure cleanup is always called
            self.cleanup()
    async def stream_run_conversation_utf(self, thread_id: str, collection_name: str,**kwargs) -> AsyncGenerator[str, None]:
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
            delay_chunk=kwargs.get("delay_chunk",0.0)
            cost = CostCalculator()

            async with async_streaming_handler() as async_handler, \
                    get_custom_openai_callback(llm_apikey_decrypt_service.model_name, cost=cost, thread_id=thread_id, collection_name=collection_name) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=self.memory,collection_name=collection_name) as mongo_handler:
                    run = asyncio.create_task( self.conversation.arun(
                        self._get_inputs(),
                        callbacks=[cb, mongo_handler, async_handler]
                    ))

                    async for token in async_handler.aiter():
                         data = token.encode("utf-8")
                         yield f"data: {data}\n\n",200
                         await asyncio.sleep(delay_chunk)
                        #  yield f"data: {json.dumps(token)}\n\n",200
                    await run
                      
        # Handling errors from Hugging Face libraries
        except ValueError as e:
            logger.error(f"Hugging Face Value Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.ValueError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("value_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("value_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except RuntimeError as e:
            logger.error(f"Hugging Face Runtime Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.RuntimeError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("runtime_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("runtime_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        # Hugging Face Hub Exceptions
        except HTTPError as e:
            logger.error(f"Hugging Face Hub HTTP Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.HTTPError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("http_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("http_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except HfHubHTTPError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW HF HUB ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.HfHubHTTPError"}})
            # else:
            #     logger.error(
            #         f"🚨 Hugging Face Hub Error: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.HfHubHTTPError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("hf_hub_http_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("hf_hub_http_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except EntryNotFoundError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW ENTRY NOT FOUND ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.EntryNotFoundError"}})
            # else:
            #     logger.error(
            #         f"🚨 Entry Not Found: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.EntryNotFoundError"}})
            logger.error(f"Entry Not Found: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.EntryNotFoundError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("entry_not_found")
            content = HF_ERROR_MESSAGES_CONFIG.get("entry_not_found", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except BadRequestError as e:
            # error_content, error_code = extract_error_message(str(e))
            # if error_code not in HF_ERROR_MESSAGES_CONFIG:
            #     logger.warning(
            #         f"👁️ NEW BAD REQUEST ERROR CODE FOUND: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.BadRequestError"}})
            # else:
            #     logger.error(
            #         f"🚨 Bad Request Error: {error_code}, Message: {error_content}",
            #         extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.BadRequestError"}})
            logger.error(f"Bad Request Error: {e}", extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.BadRequestError"}})
            thread_repo.initialization(thread_id, collection_name)
            thread_repo.add_message_huggingface("bad_request_error")
            content = HF_ERROR_MESSAGES_CONFIG.get("bad_request_error", HF_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

        except Exception as e:
            try:
                error_content,error_code = extract_error_message(str(e))
                if error_code not in HF_ERROR_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.Exception_Except"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.Exception_Except"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_huggingface(error_code)
                content = HF_ERROR_MESSAGES_CONFIG.get(error_code, HF_ERROR_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "HFSimpleStreamingChatService.stream_run_conversation_utf.Exception_Except"}})
                thread_repo.initialization(thread_id, collection_name)
                thread_repo.add_message_huggingface("common_response")
                content = HF_ERROR_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST
        finally:
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
                'additional_prompt'
            ]

            for attr in attributes:
                if hasattr(self, attr):
                    delattr(self, attr)  # Deletes the attribute from the instance
                    cleaned_up.append(attr)  # Adds the attribute name to the cleaned_up list

            gc.collect()  # Force garbage collection to free memory

            # Log a single message with the list of cleaned-up attributes
            if cleaned_up:
                logger.info(
                    f"Successfully cleaned up resources: {', '.join(cleaned_up)}."
                )

        except Exception as e:
            logger.error(
                f"Failed to cleanup resources: {e}",
                extra={"tags": {"method": "StreamingDocumentedChatService.cleanup"}}
            )
