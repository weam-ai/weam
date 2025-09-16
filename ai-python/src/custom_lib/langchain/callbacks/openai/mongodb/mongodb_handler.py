from typing import Any, Dict, List
from langchain.callbacks.base import AsyncCallbackHandler
from src.logger.default_logger import logger
from langchain.schema import LLMResult
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.chatflow_langchain.repositories.company_repository import CompanyRepostiory
from langchain_community.callbacks.manager import get_openai_callback
from src.chatflow_langchain.utils.playwright_info_fetcher import LogoFetcherService
from src.round_robin.llm_key_manager import APIKeySelectorService,APIKeyUsageService
from src.chatflow_langchain.service.config.model_config_openai import Functionality

thread_repo=ThreadRepostiory()
company_repo = CompanyRepostiory()
fetcher = LogoFetcherService()
MODEL_VERSIONS = {
                    'gpt-4o-2024-11-20': 'gpt-4o',
                 }
class MongoDBCallbackHandler(AsyncCallbackHandler):
    def __init__(self, thread_id: str = None, chat_history: str = None, memory=None,collection_name=None,regenerated_flag=False,msgCredit=0,is_paid_user=False,**kwargs):
        self.thread_id = thread_id
        self.chat_history = chat_history
        self.memory = memory
        self.stream_flag = False
        self.collection_name=collection_name
        self.regenerated_flag = regenerated_flag
        self.msgCredit =msgCredit
        self.is_paid_user=is_paid_user
        self.encrypted_key = kwargs.get('encrypted_key',None)
        self.companyRedis_id=kwargs.get('companyRedis_id','default')
        
    async def on_chat_model_start(self, serialized: Dict[str, Any], messages: List[List[Dict[str, Any]]], **kwargs: Any) -> None:
        pass
    
    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if token is not None and token != "":
            self.stream_flag = True

    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        try:
            if len(response.generations[0][0].message.content) > 0:
                self.api_usage_service = APIKeyUsageService()

                self.messages = ''
                if self.stream_flag:
                    # if response.generations[0][0].message.additional_kwargs.get('reasoning', {}).get('summary'):
                    #         summary_list = response.generations[0][0].message.additional_kwargs['reasoning']['summary']
                    #         self.messages+='<reasoning>'
                    #         for summary_text in summary_list:
                    #             self.messages += summary_text['text']
                    #         self.messages+='</reasoning>'
                    for generation_list in response.generations:
                        for generation in generation_list:
                            self.messages += generation.text

                    chunk_output=response.generations[0][0].message.content[0]
                    if "annotations" in chunk_output:
                        citations=[url['url'] for url in chunk_output['annotations']]
                        try:
                            citations_results = await fetcher.get_logos_async(citations)
                        except Exception as e:
                            citations_results = []

                        self.chat_history.add_ai_message_kwargs(
                        message=self.messages,
                        thread_id=self.thread_id,
                        web_resources_data=citations_results)
                    else:
                        self.chat_history.add_ai_message(
                            message=self.messages,
                            thread_id=self.thread_id
                        )
                
                    
                    model_name=generation.message.response_metadata['model_name']
                    thread_repo.initialization(thread_id=self.thread_id,collection_name=self.collection_name)
                    if self.is_paid_user:
                        thread_repo.update_credits(msgCredit=self.msgCredit)
                    else:
                        company_repo.initialization(company_id=str(thread_repo.result['companyId']),collection_name='company')
                        company_repo.update_free_messages(model_code='OPEN_AI')
                    if not self.regenerated_flag:
                        with get_openai_callback() as cb:
                            self.memory.prune()

                        thread_repo.update_token_usage_summary(cb=cb)
                        # await self.api_usage_service.update_usage(provider='OPEN_AI',tokens_used= cb.total_tokens, model=self.memory.llm.model_name, api_key=self.encrypted_key,functionality=Functionality.CHAT,company_id=self.companyRedis_id)
                            

                        self.chat_history.add_message_system(
                            message=self.memory.moving_summary_buffer,
                            thread_id=self.thread_id
                        )
                    else: 
                        if model_name in MODEL_VERSIONS:
                            model_name = MODEL_VERSIONS[model_name]
                        thread_repo.update_response_model(responseModel=model_name,model_code='OPEN_AI')
                    logger.info(
                        "Successfully stored the response",
                        extra={"tags": {"method": "MongoDBCallbackHandler.on_llm_end"}}
                    )
                else:
                    logger.info(
                        "LLM response was condensed, no storage needed",
                        extra={"tags": {"method": "MongoDBCallbackHandler.on_llm_end"}}
                    )
        except Exception as e:
            logger.error(
                "Error processing LLM response",
                exc_info=True,
                extra={"tags": {"method": "MongoDBCallbackHandler.on_llm_end", "exception": str(e)}}
            )
            raise e

    async def on_llm_error(self, error: Exception, **kwargs: Any) -> None:
        logger.error(
            "Error encountered during LLM execution",
            exc_info=True,
            extra={"tags": {"method": "MongoDBCallbackHandler.on_llm_error", "exception": str(error)}}
        )
        pass
