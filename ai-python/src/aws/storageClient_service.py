from src.aws.boto3_client import Boto3S3Client
from src.aws.localstack_client import LocalStackS3Client
from src.aws.minio_client import MinioClient
from src.chatflow_langchain.repositories.settings_repository import SettingRepository
import os
class ClientService:
    def __init__(self):

        S3_CLIENTS = {
        "LOCALSTACK": LocalStackS3Client,
        "AWS_S3": Boto3S3Client,
        "MINIO": MinioClient
        }
        BUCKET_TYPE = os.environ.get("BUCKET_TYPE", "MINIO")

        self.bucket_type = BUCKET_TYPE
        self.client_type = S3_CLIENTS.get(BUCKET_TYPE)()
