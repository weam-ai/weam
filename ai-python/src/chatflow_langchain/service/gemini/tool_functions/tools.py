import re
from langchain_core.tools import tool
from langchain_community.tools.openai_dalle_image_generation import OpenAIDALLEImageGenerationTool
from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from langchain.prompts import ChatPromptTemplate
from src.custom_lib.langchain.chat_models.openai.chatopenai_cache import MyChatOpenAI as ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from src.chatflow_langchain.utils.upload_image import upload_image_to_s3, generate_random_file_name
from src.chatflow_langchain.service.gemini.tool_functions.config import ToolChatConfig, ImageGenerateConfig
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from langchain_community.callbacks.manager import get_openai_callback
from typing import List
import json
from fastapi import status
from src.chatflow_langchain.service.gemini.config.gemini_tool_description import ToolServiceDescription
from src.logger.default_logger import logger
from src.chatflow_langchain.service.gemini.tool_functions.utils import extract_google_genai_error_message,extract_google_error_message
from src.custom_lib.langchain.callbacks.gemini.cost.context_manager import gemini_async_cost_handler
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.custom_lib.langchain.callbacks.gemini.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.gemini.streaming.context_manager import async_streaming_handler
from src.custom_lib.langchain.callbacks.gemini.streaming.custom_stream_async_handler import CustomAsyncIteratorCallbackHandler
from langchain.chains import LLMChain
from src.celery_worker_hub.web_scraper.tasks.scraping_sitemap import crawler_scraper_task
from src.custom_lib.langchain.callbacks.openai.image_cost.context_manager import dalle_callback_handler
from src.chatflow_langchain.repositories.openai_error_messages_config import GENAI_ERROR_MESSAGES_CONFIG,DEV_MESSAGES_CONFIG
from src.crypto_hub.services.openai.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from langchain_google_genai._common import GoogleGenerativeAIError
from google.api_core.exceptions import GoogleAPIError, ResourceExhausted, GoogleAPICallError
from langchain_google_genai import ChatGoogleGenerativeAI
from src.round_robin.llm_key_manager import APIKeyUsageService
from src.chatflow_langchain.service.config.model_config_gemini import Functionality
from datetime import datetime
thread_repo = ThreadRepostiory()
cost_callback = CostCalculator()
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()

async_handler = async_streaming_handler()

@tool(description=ToolServiceDescription.SIMPLE_CHAT)
async def simple_chat_v2(query:bool=False, gemini_api_key:str=None, temprature:float=None, model_name:str=None,
                         image_url:str=None, thread_id:str=None, thread_model:str=None, imageT:int=0, memory:object=None, chat_repository_history:object=None, original_query:str=None,api_key_id:str=None,regenerated_flag:bool=False,msgCredit:float=0,is_paid_user:bool=False,encrypted_key:str=None,companyRedis_id:str=None):
    # Set model parameters here
    try:   
        kwargs = {"chat_imageT":imageT}
        custom_handler = CustomAsyncIteratorCallbackHandler()
        llm = ChatGoogleGenerativeAI(model=model_name,
                temperature=temprature,
                api_key=gemini_api_key,
                disable_streaming=False,
                verbose=False,
                callbacks=[custom_handler])
        prompt_list = chat_repository_history.messages
        if len(prompt_list) > 0:
            prompt_list = [prompt for prompt in prompt_list if prompt.content != '']
        if image_url is not None and model_name in ToolChatConfig.VISION_MODELS:
            # prompt_list.insert(0, SystemMessagePromptTemplate.from_template(
            # """You're a helpful assistant Use your knowledge to provide a clear, concise, and relevant response to the user's question. 
            #    """))
    
            query_and_images = {
                "query": original_query,  # Single query
             }
            image_url = json.loads(image_url)
                # Add HumanMessagePromptTemplate for the query first
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}
            ]))

            # Add HumanMessagePromptTemplate for each image URL dynamically
            for idx, url in enumerate(image_url, start=1):
                prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                    {"type": "image", "image_url":f"{{image_url{idx}}}"},]))
                query_and_images[f"image_url{idx}"] = url
         
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)     
            # final_response = ''
            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with gemini_async_cost_handler(model_name=model_name,thread_id=thread_id,collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as cb,\
            get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                async for token in llm_chain.astream_events(query_and_images,{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                    if token['event']=="on_chat_model_stream":
                        max_chunk_size = 5  # Set your desired chunk size
                        chunk=token['data']['chunk'].content
                        for i in range(0, len(chunk), max_chunk_size):
                            small_chunk = chunk[i:i + max_chunk_size]
                            small_chunk = small_chunk.encode("utf-8")
                            yield f"data: {small_chunk}\n\n", 200
                    else:
                        pass

        else:
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}]))
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)

            # final_response = ''
            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with gemini_async_cost_handler(model_name=model_name,thread_id=thread_id,collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as cb,\
            get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                async for token in llm_chain.astream_events({"query":original_query},{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                    if token['event']=="on_chat_model_stream":
                        max_chunk_size = 5  # Set your desired chunk size
                        chunk=token['data']['chunk'].content
                        for i in range(0, len(chunk), max_chunk_size):
                            small_chunk = chunk[i:i + max_chunk_size]
                            small_chunk = small_chunk.encode("utf-8")
                            yield f"data: {small_chunk}\n\n", 200
                    else:
                        pass

        logger.info('Simple chat Tool Function Completed', extra={
                    "tags": {"task_function": "simple_chat_v2"}})
        
    # Handle ResourceExhaustedError
    except ResourceExhausted as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.simple_chat_v2.ResourceExhausted"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("resource_exhausted_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("resource_exhausted_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except GoogleAPICallError as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.simple_chat_v2.GoogleAPICallError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_api_call_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_api_call_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    # Handle GoogleAPIError
    except GoogleAPIError as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.simple_chat_v2.GoogleAPIError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_api_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_api_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except GoogleGenerativeAIError as e:
        error_content = extract_google_genai_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.simple_chat_v2.GoogleGenerativeAIError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_genai_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_genai_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except Exception as e:
        try:
            # Attempt to extract the error message using both extractors
            error_content = None
            # First, try extracting with extract_google_error_message
            try:
                error_content = extract_google_error_message(str(e))
            except Exception as inner_e:
                logger.warning(
                    f"Warning: Failed to extract using extract_google_error_message: {inner_e}",
                    extra={"tags": {"method": "GeminiToolService.Exception.extract_google_error_message"}})
            # If no content from the first extractor, try the second one
            if not error_content:
                try:
                    error_content = extract_google_genai_error_message(str(e))
                except Exception as inner_e:
                    logger.warning(
                        f"Warning: Failed to extract using extract_google_genai_error_message: {inner_e}",
                        extra={"tags": {"method": "GeminiToolService.Exception.extract_google_genai_error_message"}})
            # Default error message if extraction fails
            if not error_content:
                error_content = DEV_MESSAGES_CONFIG.get("genai_message")
            logger.error(
                f"🚨 Failed to stream run conversation: {error_content}",
                extra={"tags": {"method": "GeminiToolService.simple_chat_v2.Exception_Try"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_gemini("common_response")
            content = GENAI_ERROR_MESSAGES_CONFIG.get("common_response", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
        except Exception as inner_e:
            logger.error(
                f"🚨 Failed to stream run conversation: {inner_e}",
                extra={"tags": {"method": "GeminiToolService.simple_chat_v2.Exception_Except"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_gemini("common_response")
            content = GENAI_ERROR_MESSAGES_CONFIG.get("common_response")
            yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("genai_message"), "data": content}), status.HTTP_400_BAD_REQUEST


@tool(description=ToolServiceDescription.IMAGE_GENERATION)
async def image_generate(image_query:bool=False, model_name=None, image_quality=None, n=1, image_size=None, image_style=None,
                         openai_api_key=None, thread_id=None, thread_model=None, memory=None, chat_repository_history=None, original_query=None,api_key_id=None,regenerated_flag=False):
    try:
        prompt_list = chat_repository_history.messages
        if model_name == 'dall-e-2':
            prompt_list.insert(0, SystemMessagePromptTemplate.from_template(
            """Generate a detail words prompt that is helpful to generate an image exactly on the basis of the following user input And Previous image prompt. Note:-The Generated Response must be Strictly less than 125 words"""))
            max_tokens = 150
        else:
            prompt_list.insert(0, SystemMessagePromptTemplate.from_template(
            """Generate a detail words prompt that is helpful to generate an image exactly on the basis of the following user input And Previous image prompt. Note:-The Generated Response must be Strictly less than 500 words"""))
            max_tokens = 625
        prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
            {"type": "text", "text": '{query}'}]))
        
        chat_prompt = ChatPromptTemplate.from_messages(prompt_list)
        cost=CostCalculator()
        async with dalle_callback_handler(llm_model=ImageGenerateConfig.GPT_4o_MINI, cost = cost,dalle_model=model_name,thread_id=thread_id,collection_name=thread_model,image_quality = image_quality,image_size=image_size,image_style=image_style) as asynchandler:
            llm = ChatOpenAI(temperature=ToolChatConfig.TEMPRATURE, api_key=openai_api_key,use_responses_api=True,
                            model=ImageGenerateConfig.GPT_4o_MINI, streaming=False, stream_usage=True,max_tokens=max_tokens)
            llm_chain = LLMChain(llm=llm,prompt=chat_prompt)
            optimized_query = llm_chain.invoke(original_query,callbacks=[asynchandler])
            if model_name == 'dall-e-2' and len(optimized_query['text'])>625:
                optimized_query['text']=optimized_query['text'][:625]
            elif model_name=='dall-e-3' and len(optimized_query['text'])>2500:
                optimized_query['text']=optimized_query['text'][:2500]
                
            image_generation = OpenAIDALLEImageGenerationTool(api_wrapper=DallEAPIWrapper(
                model=model_name, n=1, quality=image_quality, size=image_size, style=image_style, api_key=openai_api_key), verbose=False)
            response = image_generation.run(optimized_query['text'],callbacks=[asynchandler])   
            # response=temp_link
            s3_file_name = generate_random_file_name()
            upload_image_to_s3(image_url=response, s3_file_name=s3_file_name)
            yield json.dumps({"status": status.HTTP_207_MULTI_STATUS, "message": s3_file_name}), status.HTTP_207_MULTI_STATUS
        # cost = CostCalculator(
        #     prompt_tokens=optimized_query.response_metadata['token_usage']['prompt_tokens'],
        #     completion_tokens=optimized_query.response_metadata['token_usage']['completion_tokens'],
        #     total_tokens=optimized_query.response_metadata['token_usage']['total_tokens'])
        # cost.calculate_total_cost(model_name=model_name)
        # token_data = {'input_tokens': cost.prompt_tokens, 'output_tokens': cost.completion_tokens, 'total_tokens': cost.total_tokens,
        #               'total_cost': DALLE_COST_PER_IMAGE[model_name][image_quality][image_size]+cost.total_cost}
        thread_repo.initialization(
            thread_id=thread_id, collection_name=thread_model)
        
        thread_repo.update_img_gen_prompt(gen_prompt=optimized_query['text'])
        
        # thread_repo.update_tools_token_data(token_data=token_data)
        chat_repository_history.add_ai_message(
            message=s3_file_name,
            thread_id=thread_id)
        if not regenerated_flag:
            with get_openai_callback() as summary_cb:
                memory.prune()

        
            thread_repo.update_token_usage_summary(summary_cb)
            chat_repository_history.add_message_system(
                message=memory.moving_summary_buffer,
                thread_id=thread_id
            )
        logger.info('Image Tool Function Completed', extra={
                    "tags": {"task_function": "image_generate"}})
        
    # Handle ResourceExhaustedError
    except ResourceExhausted as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.image_generate.ResourceExhausted"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("resource_exhausted_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("resource_exhausted_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except GoogleAPICallError as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.image_generate.GoogleAPICallError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_api_call_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_api_call_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    # Handle GoogleAPIError
    except GoogleAPIError as e:
        error_content = extract_google_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.image_generate.GoogleAPIError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_api_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_api_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except GoogleGenerativeAIError as e:
        error_content = extract_google_genai_error_message(str(e))
        logger.error(
            f"🚨 Google API Error: {error_content}",
            extra={"tags": {"method": "GeminiToolService.image_generate.GoogleGenerativeAIError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_gemini("google_genai_error")
        # llm_apikey_decrypt_service.update_deprecated_status(True)
        content = GENAI_ERROR_MESSAGES_CONFIG.get("google_genai_error", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except Exception as e:
        try:
            # Attempt to extract the error message using both extractors
            error_content = None
            # First, try extracting with extract_google_error_message
            try:
                error_content = extract_google_error_message(str(e))
            except Exception as inner_e:
                logger.warning(
                    f"Warning: Failed to extract using extract_google_error_message: {inner_e}",
                    extra={"tags": {"method": "GeminiToolService.Exception.extract_google_error_message"}})
            # If no content from the first extractor, try the second one
            if not error_content:
                try:
                    error_content = extract_google_genai_error_message(str(e))
                except Exception as inner_e:
                    logger.warning(
                        f"Warning: Failed to extract using extract_google_genai_error_message: {inner_e}",
                        extra={"tags": {"method": "GeminiToolService.Exception.extract_google_genai_error_message"}})
            # Default error message if extraction fails
            if not error_content:
                error_content = DEV_MESSAGES_CONFIG.get("genai_message")
            logger.error(
                f"🚨 Failed to stream run conversation: {error_content}",
                extra={"tags": {"method": "GeminiToolService.image_generate.Exception_Try"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_gemini("common_response")
            content = GENAI_ERROR_MESSAGES_CONFIG.get("common_response", GENAI_ERROR_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
        except Exception as inner_e:
            logger.error(
                f"🚨 Failed to stream run conversation: {inner_e}",
                extra={"tags": {"method": "GeminiToolService.image_generate.Exception_Except"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_gemini("common_response")
            content = GENAI_ERROR_MESSAGES_CONFIG.get("common_response")
            yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("genai_message"), "data": content}), status.HTTP_400_BAD_REQUEST






@tool(description=ToolServiceDescription.WEB_ANALYSIS)
async def website_analysis(reference_urls:list[str]=[]):
    try:
        reference_urls = [domain for item in reference_urls for domain in item.split(",")]
        urls = []
        urls.extend(reference_urls)
        urls = list(set(urls))  # Remove duplicates
    
        # web_content=await scraping_service.multiple_crawl_and_clean(urls=urls)
        if len(urls)> 0:
            web_content = crawler_scraper_task.apply_async(kwargs={'urls': urls}).get()
        else:
            web_content= '' 
        return web_content
    except Exception as e:
        logger.error(
            f"🚨 Failed to scrape and clean web content: {e}",
            extra={"tags": {"method": "OpenAIToolServiceOpenai.website_analysis"}})
        return ''

