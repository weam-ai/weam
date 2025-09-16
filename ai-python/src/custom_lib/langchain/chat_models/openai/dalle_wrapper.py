from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from typing import Any, Dict, Mapping, Optional, Tuple, Union
from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator
from src.logger.default_logger import logger
from langchain_community.utils.openai import is_openai_v1
import requests
from io import BytesIO
from src.celery_worker_hub.web_scraper.tasks.upload_file_s3 import task_upload_image_to_s3,task_upload_huggingfaceimage_to_s3
import base64
from src.chatflow_langchain.utils.upload_image import generate_random_file_name

class MyDallEAPIWrapper(DallEAPIWrapper):
    """Wrapper for OpenAI's DALL-E Image Generator.

    https://platform.openai.com/docs/guides/images/generations?context=node

    Usage instructions:

    1. `pip install openai`
    2. save your OPENAI_API_KEY in an environment variable
    """
    images: Optional[Union[list, str]] = Field(default=None)
    
    def run(self, query: str) -> str:
        """Run query through OpenAI and parse result."""

        if is_openai_v1():
            if self.images is None:
                response = self.client.generate(
                    prompt=query,
                    n=self.n,
                    size=self.size,
                    model=self.model_name,
                    quality=self.quality,
                )

            else:
                if isinstance(self.images, list):
                    image_files = []
                    for image_url in self.images:
                        response = requests.get(image_url)
                        if response.status_code == 200:
                            image_data = BytesIO(response.content)
                            image_file = ("image.png", image_data, "image/png")
                            image_files.append(image_file)
                    response = self.client.edit(
                        prompt=query,
                        n=self.n,
                        size=self.size,
                        model=self.model_name,
                        image=image_files,
                        quality=self.quality
                    )
                else:
                    response = requests.get(self.images)
                    if response.status_code == 200:
                        image_data = BytesIO(response.content)
                        image_file = ("image.png", image_data, "image/png")  
                    response = self.client.edit(
                        prompt=query,
                        n=self.n,
                        size=self.size,
                        model=self.model_name,
                        image=image_file,
                        quality=self.quality
                    )
            if self.model_name in ['dall-e-3','dall-e-2']:
                response = self.separator.join([item.url for item in response.data])
            elif self.model_name == 'gpt-image-1':
                response=response.data[0]
                response = base64.b64decode(response.b64_json)
                s3_file_name = generate_random_file_name()
                result=task_upload_huggingfaceimage_to_s3.apply_async(kwargs={'image_bytes': response, 's3_file_name': s3_file_name}).get()
                response = result
        else:
            response = self.client.create(
                prompt=query, n=self.n, size=self.size, model=self.model_name
            )
            
            if self.model_name in ['dall-e-3','dall-e-2']:
                response = self.separator.join([item["url"] for item in response["data"]])
            elif self.model_name == 'gpt-image-1':
                response=response.data[0]
                response = base64.b64decode(response.b64_json)
                s3_file_name = generate_random_file_name()
                result=task_upload_huggingfaceimage_to_s3.apply_async(kwargs={'image_bytes': response, 's3_file_name': s3_file_name}).get()
                response=result
        return {'type':'text','content':f'![{query}]({response})',"image_url": response}