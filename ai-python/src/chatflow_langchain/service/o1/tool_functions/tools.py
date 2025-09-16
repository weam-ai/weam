from langchain_core.tools import tool
from langchain_community.tools.openai_dalle_image_generation import OpenAIDALLEImageGenerationTool
from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from langchain.prompts import ChatPromptTemplate
import re
from src.custom_lib.langchain.chat_models.openai.chatopenai_cache import MyChatOpenAI as ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from src.chatflow_langchain.utils.upload_image import generate_random_file_name
from src.chatflow_langchain.service.o1.tool_functions.config import ToolChatConfig
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from langchain_community.callbacks.manager import get_openai_callback
from src.celery_worker_hub.web_scraper.tasks.upload_file_s3 import task_upload_image_to_s3,task_upload_huggingfaceimage_to_s3
import json
from fastapi import status
from src.logger.default_logger import logger
from openai import RateLimitError,APIConnectionError,APITimeoutError,APIStatusError, NotFoundError
from src.chatflow_langchain.service.o1.image.utils import extract_error_message
from src.custom_lib.langchain.callbacks.openai.cost.context_manager import get_custom_openai_callback
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.custom_lib.langchain.callbacks.openai.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.openai.streaming.context_manager import async_streaming_handler
from src.custom_lib.langchain.callbacks.openai.streaming.custom_stream_async_handler import CustomAsyncIteratorCallbackHandler
import asyncio
from langchain.chains import LLMChain
from src.custom_lib.langchain.callbacks.openai.image_cost.context_manager import dalle_callback_handler
from src.celery_worker_hub.web_scraper.tasks.scraping_sitemap import crawler_scraper_task
from src.gateway.openai_exceptions import LengthFinishReasonError,ContentFilterFinishReasonError
from src.gateway.utils import AsyncHTTPClientSingleton, SyncHTTPClientSingleton
from src.chatflow_langchain.repositories.openai_error_messages_config import OPENAI_MESSAGES_CONFIG,DEV_MESSAGES_CONFIG
from src.crypto_hub.services.openai.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from src.chatflow_langchain.repositories.company_repository import CompanyRepostiory
from src.custom_lib.langchain.chat_models.openai.dalle_wrapper import MyDallEAPIWrapper
from src.chatflow_langchain.service.config.model_config_openai import OPENAIMODEL
import base64
import re
from src.celery_worker_hub.extraction.utils import map_file_url
from src.chatflow_langchain.service.o1.config.o1_tool_description import ToolDescritpion
from src.round_robin.llm_key_manager import APIKeySelectorService,APIKeyUsageService
from src.chatflow_langchain.service.config.model_config_openai import Functionality
company_repo=CompanyRepostiory()
thread_repo = ThreadRepostiory()
cost_callback = CostCalculator()
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()

async_handler = async_streaming_handler()

@tool(description=ToolDescritpion.SIMPLE_CHAT)
async def simple_chat_v2(query:bool=False, openai_api_key=None, temprature=None, model_name=None,
                         image_url=None, thread_id=None, thread_model=None, imageT=0, memory=None, chat_repository_history=None, original_query=None,api_key_id=None,regenerated_flag=False,msgCredit=0,is_paid_user=False,encrypted_key=None,companyRedis_id=None):
    # Set model parameters here
    try:    
        kwargs = {"chat_imageT":imageT}
        # custom_handler = CustomAsyncIteratorCallbackHandler()
        http_client = SyncHTTPClientSingleton.get_client()
        http_async_client = await AsyncHTTPClientSingleton.get_client()
        llm = ChatOpenAI(temperature=temprature, api_key=openai_api_key,use_responses_api=True,
                         model=model_name, streaming=True, stream_usage=True,
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
            async with  \
                    get_custom_openai_callback(model_name, cost=cost_callback, thread_id=thread_id, collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id,**kwargs) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                async for token in llm_chain.astream_events(query_and_images,{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                                        if token['event']=="on_chat_model_stream":
                                            chunk=token['data']['chunk'].content
                                            if len(chunk) > 0:
                                                chunk = chunk[0]['text'].encode("utf-8")
                                                yield f"data: {chunk}\n\n", 200
                                        else:
                                            pass
        else:
 
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}]))
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)

            # final_response = ''
            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with  \
                    get_custom_openai_callback(model_name, cost=cost_callback, thread_id=thread_id, collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id,**kwargs) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                async for token in llm_chain.astream_events(original_query,{'callbacks':[cb,mongo_handler]},version="v1",stream_usage=True):
                                        if token['event']=="on_chat_model_stream":
                                            chunk=token['data']['chunk'].content
                                            if len(chunk) > 0:
                                                chunk = chunk[0]['text'].encode("utf-8")
                                                yield f"data: {chunk}\n\n", 200
                                        else:
                                            pass

        logger.info('Simple chat Tool Function Completed', extra={
                    "tags": {"task_function": "simple_chat_v2"}})
        
    except NotFoundError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.NotFoundError"}})
        else:
            logger.error(
                f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)

        llm_apikey_decrypt_service.initialization(api_key_id,"companymodel")
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except RateLimitError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.RateLimitError"}})
        else:
            logger.error(
                f"🚨 OpenAI Rate limit exceeded: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS
   
    except APIStatusError as e:
        error_content,error_code = extract_error_message(str(e))
        if not error_code or error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = OPENAI_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except LengthFinishReasonError as e:
        logger.error(
            f"OpenAI Length Finish Reason Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.LengthFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("content_filter_issue")
        content = OPENAI_MESSAGES_CONFIG.get("content_filter_issue", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except ContentFilterFinishReasonError as e:
        logger.error(
            f"OpenAI Content Filter Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.ContentFilterFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("content_filter_issue")
        content = OPENAI_MESSAGES_CONFIG.get("content_filter_issue", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APITimeoutError as e:
        logger.error(
            f"OpenAI Timeout Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("request_time_out")
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APIConnectionError as e:
        logger.error(
            f"OpenAI Connection Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("connection_error")
        content = OPENAI_MESSAGES_CONFIG.get("connection_error", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except Exception as e:
        try:
            error_content,error_code = extract_error_message(str(e))
            if error_code not in OPENAI_MESSAGES_CONFIG:
                logger.warning(
                    f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.Exception_Try"}})
            else:
                logger.error(
                    f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                    extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.Exception_Try"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("connection_error")
            content = OPENAI_MESSAGES_CONFIG.get("connection_error", OPENAI_MESSAGES_CONFIG.get("common_response"))
            yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
        except Exception as e:
            logger.error(
                f"🚨 Failed to stream run conversation: {e}",
                extra={"tags": {"method": "O1ToolServiceOpenai.simple_chat_v2.Exception_Except"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = OPENAI_MESSAGES_CONFIG.get("common_response")
            yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST


@tool(description=ToolDescritpion.IMAGE_GENERATION)
async def image_generate(image_query:bool=False, model_name=None, image_quality=None, n=1, image_size=None, image_style=None,
                         openai_api_key=None, thread_id=None, thread_model=None, memory=None, chat_repository_history=None, original_query=None,api_key_id=None,regenerated_flag=False,llm_model=None,msgCredit=0,is_paid_user=False,image_url=None,editHistory_flag=False,encrypted_key=None,companyRedis_id=None):
    try:
        prompt_list = chat_repository_history.messages
        original_image_urls = image_url
        if editHistory_flag:
            matches = [re.search(r'images/[^"\s]+\.png', msg.content) for msg in chat_repository_history.messages]
            image_paths = [m.group() for m in matches if m]
            if len(image_paths) > 0:
                image_history=[]
                for url in image_paths:
                    image_history.append(map_file_url('/'+ url, 's3_url'))
                image_url = (image_url or []) + image_history
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
        if original_image_urls:
            original_query = {'query':original_query}
            for idx, url in enumerate(original_image_urls, start=1):
                prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                    {"type": "image_url", "image_url":{"url": f"{{image_url{idx}}}"}},]))
                original_query[f"image_url{idx}"] = url
        chat_prompt = ChatPromptTemplate.from_messages(prompt_list)
        cost=CostCalculator()
        http_client = SyncHTTPClientSingleton.get_client()
        http_async_client = await AsyncHTTPClientSingleton.get_client()
        async with dalle_callback_handler(llm_model=OPENAIMODEL.GPT_4_1_MINI, cost = cost,dalle_model=model_name,thread_id=thread_id,collection_name=thread_model,image_quality = image_quality,image_size=image_size,image_style=image_style,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as asynchandler:
            llm = ChatOpenAI(temperature=ToolChatConfig.TEMPRATURE, api_key=openai_api_key,use_responses_api=True,
                            model=OPENAIMODEL.GPT_4_1_MINI, streaming=False, stream_usage=True,max_tokens=max_tokens,
                            http_client=http_client,http_async_client=http_async_client)
            llm_chain = LLMChain(llm=llm,prompt=chat_prompt)
            optimized_query = await llm_chain.ainvoke(original_query, callbacks=[asynchandler])
            # optimized_query = llm_chain.invoke(original_query,callbacks=[asynchandler])
            if model_name == 'dall-e-2' and len(optimized_query['text'])>625:
                optimized_query['text']=optimized_query['text'][:625]
            elif model_name=='dall-e-3' and len(optimized_query['text'])>2500:
                optimized_query['text']=optimized_query['text'][:2500]
                
            image_generation = OpenAIDALLEImageGenerationTool(api_wrapper=MyDallEAPIWrapper(
            model=model_name, n=1, quality=image_quality, size=image_size, api_key=openai_api_key,timeout=300), verbose=False)
            response = await image_generation.arun(optimized_query['text'],callbacks=[asynchandler])
            # response = image_generation.run(optimized_query['text'],callbacks=[asynchandler])   
            s3_file_name = generate_random_file_name()
            thread_repo_task = asyncio.to_thread(update_thread_repo_and_memory(thread_id, thread_model, optimized_query['text'], s3_file_name, regenerated_flag,chat_repository_history,memory,llm_model,msgCredit,is_paid_user,encrypted_key,companyRedis_id))
            # response=temp_link
            
            logger.info(f"Image successfully generated Ready for Uploading S3 bucket with filename: {s3_file_name} ...")

            if model_name in ['dall-e-2','dall-e-3']:
                result=task_upload_image_to_s3.apply_async(kwargs={'image_url': response, 's3_file_name': s3_file_name}).get()
            else:
                response=response.data[0]
                response = base64.b64decode(response.b64_json)
                result=task_upload_huggingfaceimage_to_s3.apply_async(kwargs={'image_bytes': response, 's3_file_name': s3_file_name}).get()
            yield json.dumps({"status": status.HTTP_207_MULTI_STATUS, "message": s3_file_name}), status.HTTP_207_MULTI_STATUS
            await thread_repo_task
    except NotFoundError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.NotFoundError"}})
        else:
            logger.error(
                f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)

        llm_apikey_decrypt_service.initialization(api_key_id,"companymodel")
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except RateLimitError as e:
        error_content,error_code = extract_error_message(str(e))
        if error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.RateLimitError"}})
        else:
            logger.error(
                f"🚨 OpenAI Rate limit exceeded: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS

    except APIStatusError as e:
        error_content,error_code = extract_error_message(str(e))
        if not error_code or error_code not in OPENAI_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = OPENAI_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except LengthFinishReasonError as e:
        logger.error(
            f"OpenAI Length Finish Reason Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.LengthFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("content_filter_issue")
        content = OPENAI_MESSAGES_CONFIG.get("content_filter_issue", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except ContentFilterFinishReasonError as e:
        logger.error(
            f"OpenAI Content Filter Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.ContentFilterFinishReasonError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("content_filter_issue")
        content = OPENAI_MESSAGES_CONFIG.get("content_filter_issue", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APITimeoutError as e:
        logger.error(
            f"OpenAI Timeout Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("request_time_out")
        content = OPENAI_MESSAGES_CONFIG.get(error_code, OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except APIConnectionError as e:
        logger.error(
            f"OpenAI Connection Error: {e}",
            extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("connection_error")
        content = OPENAI_MESSAGES_CONFIG.get("connection_error", OPENAI_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": str(e), "data": content}), status.HTTP_417_EXPECTATION_FAILED

    except Exception as e:
            try:
                error_content,error_code = extract_error_message(str(e))
                if error_code not in OPENAI_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.Exception_Try"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.Exception_Try"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai("connection_error")
                content = OPENAI_MESSAGES_CONFIG.get("connection_error", OPENAI_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "O1ToolServiceOpenai.image_generate.Exception_Except"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai("common_response")
                content = OPENAI_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST

def update_thread_repo_and_memory(thread_id, thread_model, optimized_query_text, s3_file_name, regenerated_flag,chat_repository_history,memory,model_name,msgCredit,is_paid_user,encrypted_key,companyRedis_id):
    """Helper function to handle thread and memory updates concurrently."""
    api_usage_service = APIKeyUsageService()
    thread_repo.initialization(thread_id=thread_id, collection_name=thread_model)
    thread_repo.update_img_gen_prompt(gen_prompt=optimized_query_text)
    chat_repository_history.add_ai_message(message=s3_file_name, thread_id=thread_id)
    
    if is_paid_user:
        thread_repo.update_credits(msgCredit=msgCredit)
    else:
        company_repo.initialization(company_id=str(thread_repo.result['companyId']),collection_name='company')
        company_repo.update_free_messages(model_code='OPEN_AI')
    if not regenerated_flag:
        with get_openai_callback() as summary_cb:
            memory.prune()
            thread_repo.update_token_usage_summary(summary_cb)
            chat_repository_history.add_message_system(
                message=memory.moving_summary_buffer, thread_id=thread_id
            )
        api_usage_service.update_usage_sync(provider='OPEN_AI', tokens_used=summary_cb.total_tokens, model=model_name, api_key=encrypted_key, functionality=Functionality.CHAT,company_id=companyRedis_id)
    else: 
        thread_repo.update_response_model(responseModel=model_name, model_code='OPEN_AI') 







@tool(description=ToolDescritpion.WEB_ANALYSIS)
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
                

