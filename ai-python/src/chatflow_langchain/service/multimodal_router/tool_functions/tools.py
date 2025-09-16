from langchain_core.tools import tool
from langchain_community.tools.openai_dalle_image_generation import OpenAIDALLEImageGenerationTool
from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from langchain.prompts import ChatPromptTemplate
from src.custom_lib.langchain.chat_models.openai.chatopenai_cache import MyChatOpenAI as ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from src.chatflow_langchain.utils.upload_image import upload_image_to_s3, generate_random_file_name
from src.chatflow_langchain.service.multimodal_router.tool_functions.config import ToolChatConfig, ImageGenerateConfig
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from langchain_community.callbacks.manager import get_openai_callback
from src.celery_worker_hub.web_scraper.tasks.upload_file_s3 import task_upload_image_to_s3
import json
from fastapi import status
from src.logger.default_logger import logger
from openai import RateLimitError,APIConnectionError,APITimeoutError,APIStatusError, NotFoundError
from src.chatflow_langchain.service.multimodal_router.tool_functions.utils import extract_error_message
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.custom_lib.langchain.callbacks.weam_router.open_router.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.weam_router.open_router.cost.context_manager import openrouter_async_callback
from src.custom_lib.langchain.callbacks.weam_router.open_router.streaming.context_manager import async_streaming_handler
import asyncio
from langchain.chains import LLMChain
from src.custom_lib.langchain.callbacks.weam_router.open_router.image_cost.context_manager import dalle_callback_handler
from src.gateway.openai_exceptions import LengthFinishReasonError,ContentFilterFinishReasonError
from src.gateway.utils import SyncHTTPClientSingleton, AsyncHTTPClientSingleton
from src.chatflow_langchain.repositories.openai_error_messages_config import DEV_MESSAGES_CONFIG, WEAM_ROUTER_MESSAGES_CONFIG
from src.crypto_hub.services.openai.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from src.celery_worker_hub.web_scraper.tasks.scraping_sitemap import crawler_scraper_task
import re
from src.chatflow_langchain.service.multimodal_router.config.multmodel_tool_description import ToolDescription
from datetime import datetime
thread_repo = ThreadRepostiory()
cost_callback = CostCalculator()
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()

async_handler = async_streaming_handler()

@tool(description=ToolDescription.SIMPLE_CHAT)
async def simple_chat_v2(query:bool=False, openai_api_key=None, temprature=None, model_name=None,
                         image_url=None, thread_id=None, thread_model=None, imageT=0, memory=None, chat_repository_history=None, original_query=None,api_key_id=None,regenerated_flag=False,msgCredit=0,is_paid_user=False):
    # Set model parameters here
    try:
        kwargs = {"chat_imageT":imageT}
        http_client = SyncHTTPClientSingleton.get_client()
        http_async_client = await AsyncHTTPClientSingleton.get_client()
        llm = ChatOpenAI(temperature=temprature, openai_api_key=openai_api_key, openai_api_base="https://openrouter.ai/api/v1",
                         model_name=model_name, streaming=True,
                         http_client=http_client, http_async_client=http_async_client)
        prompt_list = chat_repository_history.messages
        if image_url is not None and model_name in ToolChatConfig.VISION_MODELS:
            query_and_images = {
                "query": original_query,  # Single query
             }
            if isinstance(image_url, str):
                image_url = [image_url]

                # Add HumanMessagePromptTemplate for the query first
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}
            ]))

            # Add HumanMessagePromptTemplate for each image URL dynamically
            for idx, url in enumerate(image_url, start=1):
                prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                    {"type": "image_url", "image_url":{"url": f"{{image_url{idx}}}"}},]))
                query_and_images[f"image_url{idx}"] = url
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)
            # final_response = ''
            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with \
                openrouter_async_callback(model_name=model_name,thread_id=thread_id,collection_name=thread_model) as cb,\
                get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user) as mongo_handler:
                    async for token in llm_chain.astream_events(query_and_images,{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                        if token['event']=="on_chat_model_stream":
                            chunk=token['data']['chunk'].content
                            chunk = chunk.encode("utf-8")
                            if chunk:
                                yield f"data: {chunk}\n\n", 200
                        else:
                            pass

        else:
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}]))
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)

            # final_response = ''

            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with \
                openrouter_async_callback(model_name=model_name,thread_id=thread_id,collection_name=thread_model) as cb,\
                get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user) as mongo_handler:
                    async for token in llm_chain.astream_events({"query":original_query},{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                        if token['event']=="on_chat_model_stream":
                            chunk=token['data']['chunk'].content
                            chunk = chunk.encode("utf-8")
                            if chunk:
                                yield f"data: {chunk}\n\n", 200
                        else:
                            pass
                
        logger.info('Simple chat Tool Function Completed', extra={
                    "tags": {"task_function": "simple_chat_v2"}})
        
    except NotFoundError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.NotFoundError"}})
        else:
            logger.error(
                f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router(error_code)

        llm_apikey_decrypt_service.initialization(api_key_id,"companymodel")
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except RateLimitError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.RateLimitError"}})
        else:
            logger.error(
                f"🚨 OpenAI Rate limit exceeded: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router(error_code)
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS
   
    except APIStatusError as e:
        error_content,error_code = extract_error_message(str(e))
        if not error_code or error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router("common_response")
            content = WEAM_ROUTER_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router(error_code)
            content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except LengthFinishReasonError as e:
        logger.error(
            f"OpenAI Length Finish Reason Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.LengthFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("content_filter_issue")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("content_filter_issue", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except ContentFilterFinishReasonError as e:
        logger.error(
            f"OpenAI Content Filter Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.ContentFilterFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("content_filter_issue")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("content_filter_issue", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APITimeoutError as e:
        logger.error(
            f"OpenAI Timeout Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("request_time_out")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APIConnectionError as e:
        logger.error(
            f"OpenAI Connection Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("connection_error")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("connection_error", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except Exception as e:
        try:
            error_content,error_code = extract_error_message(str(e))
            if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.Exception_Try"}})
            else:
                logger.error(
                    f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.Exception_Try"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router("connection_error")
            content = WEAM_ROUTER_MESSAGES_CONFIG.get("connection_error", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
        except Exception as e:
            logger.error(
                f"🚨 Failed to stream run conversation: {e}",
                extra={"tags": {"method": "RouterServiceTool.simple_chat_v2.Exception_Except"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router("common_response")
            content = WEAM_ROUTER_MESSAGES_CONFIG.get("common_response")
            yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST


@tool(description=ToolDescription.IMAGE_GENERATE)
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
        http_client = SyncHTTPClientSingleton.get_client()
        http_async_client = await AsyncHTTPClientSingleton.get_client()
        async with dalle_callback_handler(llm_model=ImageGenerateConfig.GPT_4o_MINI, cost = cost,dalle_model=model_name,thread_id=thread_id,collection_name=thread_model,image_quality = image_quality,image_size=image_size,image_style=image_style) as asynchandler:
            llm = ChatOpenAI(temperature=ToolChatConfig.TEMPRATURE, api_key=openai_api_key,
                            model=ImageGenerateConfig.GPT_4o_MINI, streaming=False, stream_usage=True,max_tokens=max_tokens,
                            http_client=http_client, http_async_client=http_async_client)
            llm_chain = LLMChain(llm=llm,prompt=chat_prompt)
            optimized_query = await llm_chain.ainvoke(original_query, callbacks=[asynchandler])
            # optimized_query = llm_chain.invoke(original_query,callbacks=[asynchandler])
            if model_name == 'dall-e-2' and len(optimized_query['text'])>625:
                optimized_query['text']=optimized_query['text'][:625]
            elif model_name=='dall-e-3' and len(optimized_query['text'])>2500:
                optimized_query['text']=optimized_query['text'][:2500]
                
            image_generation = OpenAIDALLEImageGenerationTool(api_wrapper=DallEAPIWrapper(
                model=model_name, n=1, quality=image_quality, size=image_size, style=image_style, api_key=openai_api_key), verbose=False)
            response = await image_generation.arun(optimized_query['text'],callbacks=[asynchandler])
            # response = image_generation.run(optimized_query['text'],callbacks=[asynchandler])   
            s3_file_name = generate_random_file_name()
            thread_repo_task =asyncio.to_thread(update_thread_repo_and_memory,thread_id, thread_model, optimized_query['text'], s3_file_name, regenerated_flag, chat_repository_history, memory)
            # response=temp_link
            
            logger.info(f"Image successfully generated Ready for Uploading S3 bucket with filename: {s3_file_name} ...")

            result=task_upload_image_to_s3.apply_async(kwargs={'image_url': response, 's3_file_name': s3_file_name}).get()
            yield json.dumps({"status": status.HTTP_207_MULTI_STATUS, "message": s3_file_name}), status.HTTP_207_MULTI_STATUS
            await thread_repo_task
    except NotFoundError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.NotFoundError"}})
        else:
            logger.error(
                f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router(error_code)

        llm_apikey_decrypt_service.initialization(api_key_id,"companymodel")
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except RateLimitError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.RateLimitError"}})
        else:
            logger.error(
                f"🚨 OpenAI Rate limit exceeded: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router(error_code)
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS

    except APIStatusError as e:
        error_content,error_code = extract_error_message(str(e))
        if not error_code or error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router("common_response")
            content = WEAM_ROUTER_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "RouterServiceTool.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_weam_router(error_code)
            content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except LengthFinishReasonError as e:
        logger.error(
            f"OpenAI Length Finish Reason Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.image_generate.LengthFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("content_filter_issue")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("content_filter_issue", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except ContentFilterFinishReasonError as e:
        logger.error(
            f"OpenAI Content Filter Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.image_generate.ContentFilterFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("content_filter_issue")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("content_filter_issue", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APITimeoutError as e:
        logger.error(
            f"OpenAI Timeout Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.image_generate.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("request_time_out")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get(error_code, WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APIConnectionError as e:
        logger.error(
            f"OpenAI Connection Error: {e}",
            extra={"tags": {"method": "RouterServiceTool.image_generate.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_weam_router("connection_error")
        content = WEAM_ROUTER_MESSAGES_CONFIG.get("connection_error", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except Exception as e:
            try:
                error_content,error_code = extract_error_message(str(e))
                if error_code not in WEAM_ROUTER_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "RouterServiceTool.image_generate.Exception_Try"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "RouterServiceTool.image_generate.Exception_Try"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_weam_router("connection_error")
                content = WEAM_ROUTER_MESSAGES_CONFIG.get("connection_error", WEAM_ROUTER_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "RouterServiceTool.image_generate.Exception_Except"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_weam_router("common_response")
                content = WEAM_ROUTER_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST

def update_thread_repo_and_memory(thread_id, thread_model, optimized_query_text, s3_file_name, regenerated_flag,chat_repository_history,memory):
    """Helper function to handle thread and memory updates concurrently."""
    thread_repo.initialization(thread_id=thread_id, collection_name=thread_model)
    thread_repo.update_img_gen_prompt(gen_prompt=optimized_query_text)
    chat_repository_history.add_ai_message(message=s3_file_name, thread_id=thread_id)
    
    if not regenerated_flag:
        with get_openai_callback() as summary_cb:
            memory.prune()
            thread_repo.update_token_usage_summary(summary_cb)
            chat_repository_history.add_message_system(
                message=memory.moving_summary_buffer, thread_id=thread_id
            )




@tool(description=ToolDescription.WEB_ANALYSIS)
async def website_analysis(implicit_reference_urls:list[str]=[]):
    try:
        implicit_reference_urls = [domain for item in implicit_reference_urls for domain in item.split(",")]
        urls = []
        urls.extend(implicit_reference_urls)
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
                

                

