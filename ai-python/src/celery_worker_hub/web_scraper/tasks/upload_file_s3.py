from src.aws.boto3_client import Boto3S3Client
from src.aws.localstack_client import LocalStackS3Client
from src.aws.minio_client import MinioClient
import requests
import os
from io import BytesIO
from src.logger.default_logger import logger
from src.celery_worker_hub.web_scraper.celery_app import celery_app
from boto3.s3.transfer import TransferConfig
from PIL import Image
from src.aws.storageClient_service import ClientService
config = TransferConfig(
    multipart_threshold=2 * 1024 * 1024,  # 2 MB
    max_concurrency=2,
    multipart_chunksize=2 * 1024 * 1024,  # 2 MB
    use_threads=True
)
@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 0},
    queue="upload_file_s3"
)
def task_upload_image_to_s3(self,image_url, s3_file_name):
    # Initialize the S3 client singleton
    client_service = ClientService()

    s3_client = client_service.client_type.client
    bucket_name = client_service.client_type.bucket_name

    try:
        # Stream download the image
        with requests.get(image_url, stream=True, timeout=60) as response:
            response.raise_for_status()  # Raise HTTPError for bad responses

            # Upload the image to S3
            s3_client.upload_fileobj(response.raw, bucket_name, s3_file_name)
            logger.info(f"Image successfully uploaded to S3 bucket: {bucket_name} as: {s3_file_name}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download or upload image: {e}")



@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 0},
    queue="upload_file_s3"
)
def task_upload_huggingfaceimage_to_s3(self, image_bytes, s3_file_name):
    """
    Upload a PIL Image directly to S3 without saving it locally and return the CDN URL.
    """
    try:
        # Reconstruct the image from the bytes
        temp_bytes = BytesIO(image_bytes)
        temp_bytes.seek(0)  # Ensure the stream is at the beginning
        image = Image.open(temp_bytes)
        image_format = image.format  # Get the format (e.g., 'PNG', 'JPEG')

        # Initialize S3 client
        client_service = ClientService()

        s3_client = client_service.client_type.client
        bucket_name = client_service.client_type.bucket_name
        cdn_base_url = client_service.client_type.cdn_url
        bucket_type = client_service.bucket_type

        # Upload the image directly to S3 using `upload_fileobj`
        temp_bytes.seek(0)  # Ensure the stream is at the beginning again
        s3_client.upload_fileobj(
            temp_bytes,
            bucket_name,
            s3_file_name,
            ExtraArgs={'ContentType': f'image/{image_format.lower()}'}
        )
        logger.info(f"Image successfully uploaded to S3 bucket: {bucket_name} as: {s3_file_name}")

        # Construct the CDN URL
        if bucket_type == "MINIO":
            cdn_url = f"{cdn_base_url.replace('minio', 'localhost')}/{bucket_name}/{s3_file_name}"
        else:
            cdn_url = f"{cdn_base_url}/{bucket_name}/{s3_file_name}"
        return cdn_url
    except Exception as e:
        logger.error(f"Failed to upload image to S3: {e}")
        return None   
