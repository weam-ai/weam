from langchain_core.tools import tool
from langchain_community.tools.openai_dalle_image_generation import OpenAIDALLEImageGenerationTool
from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from langchain.prompts import ChatPromptTemplate
from src.custom_lib.langchain.chat_models.openai.chatopenai_cache import MyChatOpenAI as ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from src.chatflow_langchain.utils.upload_image import upload_image_to_s3, generate_random_file_name
from src.chatflow_langchain.service.anthropic.tool_functions.config import ToolChatConfig, ImageGenerateConfig
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from langchain_community.callbacks.manager import get_openai_callback
import json
from typing import List
from fastapi import status
from src.logger.default_logger import logger
from src.chatflow_langchain.service.anthropic.config.anthropic_tool_description import ToolServiceDescription
from src.chatflow_langchain.service.anthropic.image.utils import extract_anthropic_error_message
from src.custom_lib.langchain.callbacks.anthropic.cost.context_manager import anthropic_async_callback
from src.custom_lib.langchain.callbacks.openai.cost.cost_calc_handler import CostCalculator
from src.custom_lib.langchain.callbacks.anthropic.mongodb.context_manager import get_mongodb_callback_handler
from src.custom_lib.langchain.callbacks.anthropic.streaming.context_manager import async_streaming_handler
from src.custom_lib.langchain.callbacks.anthropic.streaming.custom_stream_async_handler import CustomAsyncIteratorCallbackHandler
import asyncio
from src.chatflow_langchain.service.config.model_config_anthropic import ANTHROPICMODEL
from langchain.chains import LLMChain
from src.custom_lib.langchain.callbacks.openai.image_cost.context_manager import dalle_callback_handler
from src.chatflow_langchain.repositories.openai_error_messages_config import ANTHROPIC_ERROR_MESSAGES_CONFIG,DEV_MESSAGES_CONFIG
from src.crypto_hub.services.openai.llm_api_key_decryption import LLMAPIKeyDecryptionHandler
from src.celery_worker_hub.web_scraper.tasks.scraping_sitemap import crawler_scraper_task
from src.custom_lib.langchain.chat_models.anthropic.chatanthropic_cache import MyChatAnthropic as ChatAnthropic
import base64
import requests
import re
from anthropic._exceptions import (AnthropicError,APIError,APIStatusError,APIConnectionError,
    APITimeoutError, AuthenticationError, PermissionDeniedError,NotFoundError,RateLimitError)
from datetime import datetime

thread_repo = ThreadRepostiory()
cost_callback = CostCalculator()
llm_apikey_decrypt_service = LLMAPIKeyDecryptionHandler()

async_handler = async_streaming_handler()

@tool(description=ToolServiceDescription.SIMPLE_CHAT)
async def simple_chat_v2(query:bool=False, anthropic_api_key=None, temprature=None, model_name=None,
                         image_url=None, thread_id=None, thread_model=None, imageT=0, memory=None, chat_repository_history=None, original_query=None,api_key_id=None,regenerated_flag=False,msgCredit=0,is_paid_user=False,encrypted_key=None,companyRedis_id=None):
    # Set model parameters here
    try:    
        kwargs = {"chat_imageT":imageT}
        custom_handler = CustomAsyncIteratorCallbackHandler()
        llm = ChatAnthropic(temperature=temprature, api_key=anthropic_api_key,
                         model=model_name, streaming=True, stream_usage=True,callbacks=[custom_handler],max_tokens=ANTHROPICMODEL.MAX_TOKEN_LIMIT_CONFIG[model_name])
        prompt_list = chat_repository_history.messages
        if len(prompt_list) > 0:
            if prompt_list[0].content == '':
                prompt_list.pop(0)
        if image_url is not None and model_name in ANTHROPICMODEL.VISION_MODELS:
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
                    {"type": "image_url", "image_url":f"{{image_url{idx}}}"},]))
                response = requests.get(url)
                content_type=response.headers['Content-Type']
                img1_base64 = base64.b64encode(response.content).decode("utf-8")
                query_and_images[f"image_url{idx}"] = f"data:{content_type};base64,{img1_base64}"

            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)     
            # final_response = ''

            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with  \
                    anthropic_async_callback(model_name, cost=cost_callback, thread_id=thread_id, collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id,**kwargs) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                run = asyncio.create_task(llm_chain.arun(
                    query_and_images,callbacks=[cb,mongo_handler]))

            async for token in custom_handler.aiter():
                yield f"data: {token.encode('utf-8')}\n\n", 200
            await run


        else:        
            prompt_list.append(HumanMessagePromptTemplate.from_template(template=[
                {"type": "text", "text": '{query}'}]))
            chat_prompt = ChatPromptTemplate.from_messages(prompt_list)

            # final_response = ''
            llm_chain = LLMChain(llm=llm, prompt=chat_prompt)
            async with  \
                    anthropic_async_callback(model_name, cost=cost_callback, thread_id=thread_id, collection_name=thread_model,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id,**kwargs) as cb, \
                    get_mongodb_callback_handler(thread_id=thread_id, chat_history=chat_repository_history, memory=memory,collection_name=thread_model,regenerated_flag=regenerated_flag,model_name=model_name,msgCredit=msgCredit,is_paid_user=is_paid_user,encrypted_key=encrypted_key,companyRedis_id=companyRedis_id) as mongo_handler:
                run = asyncio.create_task(llm_chain.arun(
                    original_query,callbacks=[cb,mongo_handler]))

                async for token in custom_handler.aiter():
                    yield f"data: {token.encode('utf-8')}\n\n", 200
                await run
        logger.info('Simple chat Tool Function Completed', extra={
                    "tags": {"task_function": "simple_chat_v2"}})
        
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
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
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
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.RateLimitError"}})
        else:
            logger.error(
                f"🚨 Rate Limit Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS
    
    except APIStatusError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except AuthenticationError as e:
        logger.error(
            f"Anthropic Authentication Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.AuthenticationError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("authentication_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("authentication_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except PermissionDeniedError as e:
        logger.error(
            f"Anthropic PermissionDenied Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.PermissionDeniedError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("permission_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("permission_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APIConnectionError as e:
        logger.error(
            f"Anthropic APIConnection Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("api_connection_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_connection_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APITimeoutError as e:
        logger.error(
            f"Anthropic APITimeout Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("api_timeout_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_timeout_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APIError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APIError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 Anthropic API Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.APIError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except AnthropicError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.AnthropicError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 Anthropic General Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.AnthropicError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except Exception as e:
            try:
                error_content,error_code = extract_anthropic_error_message(str(e))
                if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.Exception_Try"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.Exception_Try"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "AnthropicToolService.simple_chat_v2.Exception_Except"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST


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
        
    # Handle NotFoundError
    except NotFoundError as e:
        error_content, error_code = extract_anthropic_error_message(str(e))
        if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.NotFoundError"}})
        else:
            logger.error(
                f"🚨 Model Not Found Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.NotFoundError"}})
        thread_repo.initialization(thread_id, thread_model)
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
                extra={"tags": {"method": "AnthropicToolService.image_generate.RateLimitError"}})
        else:
            logger.error(
                f"🚨 Rate Limit Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.RateLimitError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai(error_code)
        llm_apikey_decrypt_service.initialization(api_key_id,"companymodel")
        llm_apikey_decrypt_service.update_deprecated_status(True)
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_429_TOO_MANY_REQUESTS, "message": error_content, "data": content}), status.HTTP_429_TOO_MANY_REQUESTS
    
    except APIStatusError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 OpenAI Status Connection Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.APIStatusError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except AuthenticationError as e:
        logger.error(
            f"Anthropic Authentication Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.image_generate.AuthenticationError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("authentication_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("authentication_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except PermissionDeniedError as e:
        logger.error(
            f"Anthropic PermissionDenied Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.image_generate.PermissionDeniedError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("permission_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("permission_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APIConnectionError as e:
        logger.error(
            f"Anthropic APIConnection Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.image_generate.APIConnectionError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("api_connection_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_connection_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APITimeoutError as e:
        logger.error(
            f"Anthropic APITimeout Error: {e}",
            extra={"tags": {"method": "AnthropicToolService.image_generate.APITimeoutError"}})
        thread_repo.initialization(thread_id, thread_model)
        thread_repo.add_message_openai("api_timeout_error")
        content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("api_timeout_error", ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": e, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except APIError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.APIError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 Anthropic API Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.APIError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except AnthropicError as e:
        error_content,error_code = extract_anthropic_error_message(str(e))
        if not error_code or error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
            logger.warning(
                f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.AnthropicError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai("common_response")
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
            error_content = DEV_MESSAGES_CONFIG.get("unknown_message")
        else:
            logger.error(
                f"🚨 Anthropic General Error: {error_code}, Message: {error_content}",
                extra={"tags": {"method": "AnthropicToolService.image_generate.AnthropicError"}})
            thread_repo.initialization(thread_id, thread_model)
            thread_repo.add_message_openai(error_code)
            content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
        yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED, "message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED
    
    except Exception as e:
            try:
                error_content,error_code = extract_anthropic_error_message(str(e))
                if error_code not in ANTHROPIC_ERROR_MESSAGES_CONFIG:
                    logger.warning(
                        f"👁️ NEW ERROR CODE FOUND: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "AnthropicToolService.image_generate.Exception_Try"}})
                else:
                    logger.error(
                        f"🚨 Failed to stream run conversation: {error_code}, Message: {error_content}",
                        extra={"tags": {"method": "AnthropicToolService.image_generate.Exception_Try"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai(error_code)
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get(error_code, ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response"))
                yield json.dumps({"status": status.HTTP_417_EXPECTATION_FAILED,"message": error_content, "data": content}), status.HTTP_417_EXPECTATION_FAILED  
            except Exception as e:
                logger.error(
                    f"🚨 Failed to stream run conversation: {e}",
                    extra={"tags": {"method": "AnthropicToolService.image_generate.Exception_Except"}})
                thread_repo.initialization(thread_id, thread_model)
                thread_repo.add_message_openai("common_response")
                content = ANTHROPIC_ERROR_MESSAGES_CONFIG.get("common_response")
                yield json.dumps({"status": status.HTTP_400_BAD_REQUEST, "message": DEV_MESSAGES_CONFIG.get("dev_message"), "data": content}), status.HTTP_400_BAD_REQUEST







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
