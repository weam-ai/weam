from datetime import datetime,timedelta
import pytz, httpx
from src.logger.default_logger import logger
from src.logger.test_logger import logger as test_logger
from src.chatflow_langchain.repositories.additional_prompts import PromptRepository
from src.chatflow_langchain.repositories.thread_repository import ThreadRepostiory
from src.chatflow_langchain.repositories.file_repository import FileRepository
from prometheus_client import CollectorRegistry, Gauge
from fastapi import Request,status,Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import re
import os
from dotenv import load_dotenv
from typing import List
from src.celery_worker_hub.web_scraper.utils.hash_function import hash_website
from src.db.config import db_instance,get_field_by_name
import time
import threading
from src.aws.boto3_client import Boto3AWSClient
import redis
from pytz import timezone
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from src.gateway.config import QaTestPayload,DevTestPayload
import json
from src.aws.boto3_client import Boto3S3Client
from src.aws.localstack_client import LocalStackS3Client
from src.aws.minio_client import MinioClient
from pathlib import Path
import pandas as pd
from urllib.parse import urlparse
from src.Firebase.firebase import firebase
from src.celery_worker_hub.web_scraper.utils.prompt_notification import add_notification_data
from src.celery_worker_hub.import_worker.tasks.config import ImportChatConfig
import random
import tracemalloc
import aiofiles
import linecache
from pyinstrument.renderers import JSONRenderer
from pyinstrument import Profiler
from starlette.requests import Request
import inspect
import asyncio
import base64
import gc
from src.aws.storageClient_service import ClientService
load_dotenv()

API_CALL_COUNT_KEY_REDIS = os.environ.get("API_CALL_COUNT_KEY_REDIS","redis_api_call_count")
redis_url = os.environ.get("CELERY_BROKEN_URL")
redis_client = redis.StrictRedis.from_url(redis_url)

current_environment = os.environ.get("WEAM_ENVIRONMENT", "dev")

thread_repo = ThreadRepostiory()
prompt_repo = PromptRepository()
file_repo = FileRepository()

IST = pytz.timezone('Asia/Kolkata')

def log_api_call(endpoint: str):
    """
    Logs an API call with the current datetime in IST.

    Args:
        endpoint (str): The endpoint name being logged.
    """
    ist_time = datetime.now(IST).strftime('%d/%m/%Y %H:%M:%S')
    utc_time = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    logger.info(f"API endpoint called: {endpoint} at {ist_time} IST")
    logger.info(f"API endpoint called: {endpoint} at {utc_time} UTC")

def map_error(error_type: str, field_name: str) -> str:
    error_templates = {
        "missing": "{} is missing",
        "invalid": "{} is invalid"  # Combined format for 'value_error' and 'url_parsing'
    }
    
    # Use the unified template for 'value_error' and 'url_parsing'
    if error_type in ["value_error", "url_parsing"]:
        error_type = "invalid"
    
    return error_templates.get(error_type, "Invalid JSON format").format(field_name.capitalize())

def run_test_and_log(test_name, expected_status_code, response_status_code):
    if response_status_code == expected_status_code:
        test_logger.info(f"{test_name}: Ok")
    else:
        test_logger.error(f"{test_name}: Failed")

def handle_initialization(payload):
    """
    Utility function to handle repository initialization based on the provided payload.
    """
    thread_id = payload.get("thread_id")
    new_thread_id = payload.get("new_thread_id")
    file_id = payload.get("id")
    prompt_ids = payload.get("parent_prompt_ids", [])
    
    if thread_id:
        thread_repo.initialization(thread_id, "messages")
        thread_repo.add_message_openai("common_response")
    elif new_thread_id:
        thread_repo.initialization(new_thread_id, "messages")
        thread_repo.add_message_openai("common_response")

    elif file_id:
        file_repo.initialization(file_id, "file")
        file_repo.add_message_openai("common_response")
    elif prompt_ids:
        prompt_id = prompt_ids[0] if prompt_ids else None
        if prompt_id:
            prompt_repo.initialization(prompt_id, "prompts")
            prompt_repo.add_message_openai("common_response")
        else:
            logger.warning("Prompt ID list is empty or not provided")
    else:
        logger.warning("Missing thread_id/file_id/prompt_id in payload")

# Middleware for regex-based CORS validation
class RegexCORSMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, regex_patterns):
        super().__init__(app)
        self.regex_patterns = regex_patterns

    async def dispatch(self, request: Request, call_next):
        allowed_paths = ["/ping", "/docs", "/redoc", "/openapi.json","/metrics","/profile"]
        if request.url.path in allowed_paths:
            return await call_next(request)
        origin = request.headers.get('origin')
        method = request.method
        logger.info("🛡 Received request with origin: %s", origin)
        if origin and any(re.search(pattern, origin) for pattern in self.regex_patterns):
            logger.info("🔐 Allowed origin: %s", origin)

            if method == "OPTIONS":
                response = Response() 
            else:
                response = await call_next(request) 

            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = '*'
            response.headers['Access-Control-Allow-Headers'] = '*'
            response.headers['Access-Control-Allow-Credentials'] = 'true'

            if method == "OPTIONS":
                response.headers['Access-Control-Max-Age'] = '86400'
            logger.info("Response headers set for allowed origin")
            return response
        else:
            logger.error("🚫 Origin %s is not allowed", origin)
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Origin not allowed"}
            )
            # return await call_next(request)
            
def get_regex_patterns():
    current_environment = os.getenv("WEAM_ENVIRONMENT", "prod")
    list_regex_patterns = os.getenv("CORS_REGEX_PATTERNS", "localhost,0.0.0.0").split(",")
    compiled_patterns = [re.compile(p) for p in list_regex_patterns]


    print(f"Current Environment: {current_environment}")
    
    
    # Define regex patterns for different environments
    cors_patterns = {
        "prod": [r".weam\.ai"],
        "qa": [r".weam\.ai", r"localhost", r"0.0.0.0"],
        "dev": [r".weam\.ai", r"localhost", r"0.0.0.0"],
        "local": [r".weam\.ai", r"localhost", r"0.0.0.0"],
        "enterprise": compiled_patterns
    }

    # Add emoji based on the environment
    env_emoji = {
        "prod": "🚀",  # Rocket emoji for production
        "qa": "🔧",    # Wrench emoji for QA
        "dev": "💻",   # Laptop emoji for development
        "local": "🖥️",  # System emoji for local
        "enterprise": "🏢"  # Building emoji for enterprise
    }

    emoji = env_emoji.get(current_environment, "🌍")  # Default emoji

    logger.info(f"{emoji} The application is running in the '{current_environment.upper()}' environment.")
    regex_patterns = cors_patterns.get(current_environment, cors_patterns["prod"])
    
    return regex_patterns

def format_summaries_to_new_structure(old_summaries: List[str], websites: List[str]) -> dict:
    """Convert the old summaries list to the new format with multiple website in prompt collection."""
    new_format = {}

    for web, summary in zip(websites, old_summaries):
        if not isinstance(summary, dict):
            hash_key = hash_website(web)
            new_format[hash_key] = {
                "website": web,
                "summary": summary
            }
    return new_format

def migrate_summaries_field(doc: dict, field_name: str) -> bool:
    """Check and migrate the specified summaries field if it is in the old format in promt collection."""
    try:
        field_data = doc.get(field_name, {}).get("summaries")
        websites = doc.get(field_name, {}).get("website", [])
        collection = db_instance.get_collection("prompts")

        if isinstance(field_data, list) and len(websites) > 0:
            if len(field_data) == len(websites):
                new_summaries = format_summaries_to_new_structure(field_data, websites)
                if new_summaries:
                    collection.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {f"{field_name}.summaries": new_summaries}})
                    logger.info(f"Document {doc['_id']} updated successfully in field '{field_name}'.")
                    return True
            else:
                logger.warning(f"Document {doc['_id']} has mismatched Counts: "
                    f"{len(field_data)} summaries and {len(websites)} website. No update performed.")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred while migrating document {doc['_id']}: {str(e)}")

def get_swagger_redoc_settings():
    current_environment = os.getenv("WEAM_ENVIRONMENT", "dev")

    # Check if the environment is 'dev' and set enable_swagger and enable_redoc to True
    if current_environment == "dev" or "enterprise":
        enable_swagger = True
        enable_redoc = True
    else:
        # Otherwise, use the values from the .env file
        enable_swagger = os.getenv("ENABLE_SWAGGER", "false").strip().lower() == "true"
        enable_redoc = os.getenv("ENABLE_REDOC", "false").strip().lower() == "true"
    
    return enable_swagger, enable_redoc

# Initialize global variables
api_call_count = 0
last_reset_time = datetime.now()
lock = threading.Lock()

# Function to get the current API call count
def get_api_call_count():
    with lock:
        return api_call_count

# class APICountMiddleware(BaseHTTPMiddleware):
#     def __init__(self, app):
#         super().__init__(app)
#         self.boto3_client = Boto3AWSClient()
#         self.reset_thread = threading.Thread(target=self.reset_counter, daemon=True)
#         self.reset_thread.start()

#     async def dispatch(self, request: Request, call_next):
#         global api_call_count, last_reset_time
#         if request.url.path == "/api/vector/openai-store-vector":
#             with lock:
#                 api_call_count += 1
#                 logger.info(f"Incremented API call count: {api_call_count}")
        
#         response = await call_next(request)
#         return response

#     def reset_counter(self):
#         global api_call_count, last_reset_time
#         while True:
#             time.sleep(60)  # Check every minute
#             with lock:
#                 if datetime.now() >= last_reset_time + timedelta(minutes=1):
#                     if api_call_count > 0:
#                         if api_call_count >= 5:  # Send metric only if count is 5 or more
#                             logger.info(f"Resetting API call count. Count = {api_call_count}. 📊 Sending metric to CloudWatch.")
#                             self.boto3_client.send_metric_to_cloudwatch(api_call_count)
#                         else:
#                             logger.info(f"Resetting API call count. Count = {api_call_count}. 📉 Below threshold, metric not sent.")
#                     api_call_count = 0
#                     last_reset_time = datetime.now()

def migrate_website_and_summaries(doc: dict, field_name: str) -> bool:
    """Migrate the website and summaries fields from the specified section to the root."""
    try:
        # Extract the summaries and website fields from the specified section
        summaries = doc.get(field_name, {}).pop("summaries", None)
        websites = doc.get(field_name, {}).pop("website", None)

        # If neither summaries nor websites exist, nothing to migrate
        if not summaries and not websites:
            return False

        # Initialize the root-level fields if they do not exist
        if "summaries" not in doc:
            doc["summaries"] = {}
        if "website" not in doc:
            doc["website"] = []

        # Move the website(s) to the root level
        if websites:
            if isinstance(websites, list):
                doc["website"].extend(websites)
            else:
                doc["website"].append(websites)

        # Move the summaries to the root-level summaries field
        if summaries:
            for key, value in summaries.items():
                doc["summaries"][key] = value

        # Indicate that migration was performed
        return True

    except Exception as e:
        logger.error(f"An unexpected error occurred while migrating document {doc['_id']}: {str(e)}")
        return False




# class MultiAPICountMiddlewareRedis(BaseHTTPMiddleware):
#     def __init__(self, app):
#         super().__init__(app)
#         self.boto3_client = Boto3AWSClient()  # Assume this is defined elsewhere

#         # Initialize the counter in Redis if it doesn't already exist
#         if not redis_client.exists(API_CALL_COUNT_KEY_REDIS):
#             redis_client.set(API_CALL_COUNT_KEY_REDIS, 0)

#         # Start a thread to send metrics to CloudWatch every 15 seconds
#         self.cloudwatch_thread = threading.Thread(target=self.send_metric_to_cloudwatch, daemon=True)
#         self.cloudwatch_thread.start()

#     async def dispatch(self, request: Request, call_next):
#         if request.url.path == "/api/vector/openai-multi-store-vector":
#             try:
#                 json_data = await request.json()
#                 increment_data = len(json_data['payload_list'])
#                 if redis_client.exists(API_CALL_COUNT_KEY_REDIS):
#                     current_count = redis_client.incr(API_CALL_COUNT_KEY_REDIS,increment_data)
#                     logger.info(f"Incremented API call count: {current_count}")

#                 response = await call_next(request)

#                 # Check if the request was canceled during processing
#                 if request.is_disconnected():
#                     current_count = redis_client.get(API_CALL_COUNT_KEY_REDIS)
#                     if current_count and int(current_count) > 0:
#                         updated_count = redis_client.decr(API_CALL_COUNT_KEY_REDIS,increment_data)
#                         logger.info(f"Decremented API call count after task completion and request cancellation. Updated count: {updated_count}")
#                     else:
#                         logger.warning("API call count is already zero or missing, no decrement performed.")

#                 return response
#             except Exception as e:
#                 logger.error(f"Error in API count middleware: {e}")
#                 pass

#         # Default handling for other requests
#         response = await call_next(request)
#         return response

#     def send_metric_to_cloudwatch(self):
#         while True:
#             time.sleep(60)  # Send metrics every 60 seconds
#             try:
#                 # Fetch the current count from Redis
#                 api_call_count = int(redis_client.get(API_CALL_COUNT_KEY_REDIS))
#                 if api_call_count > 1:
#                     logger.info(f"Sending current API call count to CloudWatch: {api_call_count}")
#                     self.boto3_client.send_metric_to_cloudwatch(api_call_count)
#             except Exception as e:
#                 logger.error(f"Error sending metric to CloudWatch: {e}")

# class APICountMiddlewareRedis(BaseHTTPMiddleware):
#     def __init__(self, app):
#         super().__init__(app)
#         self.boto3_client = Boto3AWSClient()  # Assume this is defined elsewhere

#         # Initialize the counter in Redis if it doesn't already exist
#         if not redis_client.exists(API_CALL_COUNT_KEY_REDIS):
#             redis_client.set(API_CALL_COUNT_KEY_REDIS, 0)

#         # Start a thread to send metrics to CloudWatch every 15 seconds
#         self.cloudwatch_thread = threading.Thread(target=self.send_metric_to_cloudwatch, daemon=True)
#         self.cloudwatch_thread.start()

#     async def dispatch(self, request: Request, call_next):
#         if request.url.path == "/api/vector/openai-store-vector":
#             json_data = await request.json()
#             try:
#                 if redis_client.exists(API_CALL_COUNT_KEY_REDIS):
#                     current_count = redis_client.incr(API_CALL_COUNT_KEY_REDIS)
#                     logger.info(f"Incremented API call count: {current_count}")

#                 response = await call_next(request)

#                 # Check if the request was canceled during processing
#                 if request.is_disconnected():
#                     current_count = redis_client.get(API_CALL_COUNT_KEY_REDIS)
#                     if current_count and int(current_count) > 0:
#                         updated_count = redis_client.decr(API_CALL_COUNT_KEY_REDIS)
#                         logger.info(f"Decremented API call count after task completion and request cancellation. Updated count: {updated_count}")
#                     else:
#                         logger.warning("API call count is already zero or missing, no decrement performed.")

#                 return response
#             except Exception as e:
#                 logger.error(f"Error in API count middleware: {e}")
#                 pass

#         # Default handling for other requests
#         response = await call_next(request)
#         return response

#     def send_metric_to_cloudwatch(self):
#         while True:
#             time.sleep(60)  # Send metrics every 60 seconds
#             try:
#                 # Fetch the current count from Redis
#                 api_call_count = int(redis_client.get(API_CALL_COUNT_KEY_REDIS))
#                 if api_call_count > 1:
#                     logger.info(f"Sending current API call count to CloudWatch: {api_call_count}")
#                     self.boto3_client.send_metric_to_cloudwatch(api_call_count)
#             except Exception as e:
#                 logger.error(f"Error sending metric to CloudWatch: {e}")

def get_ist_timestamp():
    """Returns the current timestamp in IST format."""
    ist = timezone('Asia/Kolkata')
    return datetime.now(ist).strftime("%Y-%m-%d_%H-%M-%S")

def create_root_and_subdirectories(request_url):
    """Creates the root directory 'Vector_Report' and a subfolder with a timestamp."""
    timestamp = get_ist_timestamp()
    root_dir = os.path.join(os.getcwd(), "Vector_Report")
    os.makedirs(root_dir, exist_ok=True)

    parsed_url = urlparse(request_url)
    endpoint = parsed_url.path.split("/")[-1]  # Get the last part of the URL path

    report_dir = os.path.join(root_dir, f"{current_environment}_{endpoint}_reports_{timestamp}")
    os.makedirs(report_dir, exist_ok=True)
    logger.info(f"Report directory created: {report_dir}")
    return report_dir, timestamp

def create_table_style():
    """Returns a predefined table style."""
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ])

def add_section(elements, title, data, headers, table_style):
    """Adds a section with a table to the PDF."""
    title_style = ParagraphStyle(
        name='CenteredTitle',
        parent=getSampleStyleSheet()['Heading1'],
        alignment=1,
        fontSize=16,
        spaceAfter=10
    )
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 10))
    table_data = [headers] + data
    table = Table(table_data)
    table.setStyle(table_style)
    elements.append(table)
    elements.append(PageBreak())

def generate_individual_pdf(title, data, headers, file_path, table_style):
    """Generates a separate PDF for each section."""
    elements = [Paragraph(title, ParagraphStyle(name='CenteredTitle', alignment=1, fontSize=16, spaceAfter=10)), Spacer(1, 10)]
    table_data = [headers] + data
    table = Table(table_data)
    table.setStyle(table_style)
    elements.append(table)
    SimpleDocTemplate(file_path, pagesize=letter).build(elements)

def generate_pdf_report(comparison_data, request):
    try:
        output_dir, timestamp = create_root_and_subdirectories(request.url.path)
        combined_pdf_path = os.path.join(output_dir, f"{current_environment}_mongodb_pinecone_index_comparison_report.pdf")

        doc = SimpleDocTemplate(combined_pdf_path, pagesize=letter)
        elements = []
        table_style = create_table_style()

        # Report overview
        overview_content = f"""
        <b>Overview:</b><br/>
        - <b>{len(comparison_data['present_in_db_and_pinecone']['data'])}</b> indexes are present in both MongoDB and Pinecone.<br/>
        - <b>{len(comparison_data['present_in_pinecone']['data'])}</b> indexes are present in Pinecone.<br/>
        - <b>{len(comparison_data['present_in_db']['data'])}</b> indexes are present in MongoDB.<br/>
        - <b>{len(comparison_data['missing_indexes_in_pinecone']['data'])}</b> indexes are present in MongoDB but missing in Pinecone.<br/>
        """
        elements.append(Paragraph("Vector Index Comparison Report", ParagraphStyle(name='CenteredTitle', alignment=1, fontSize=16)))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(overview_content, getSampleStyleSheet()['BodyText']))
        elements.append(PageBreak())

        sections = {
            "present_in_db_and_pinecone": ("Present in MongoDB and Pinecone", ["Vector Index", "Company Name"]),
            "present_in_pinecone": ("Present in Pinecone", ["Vector Index"]),
            "present_in_db": ("Present in MongoDB", ["Vector Index", "Company Name"]),
            "missing_indexes_in_pinecone": ("Missing in Pinecone", ["Vector Index", "Company Name"]),
        }

        for key, (title, headers) in sections.items():
            data = [[str(item['vector_index']), str(item.get('company_name', 'N/A'))] if isinstance(item, dict) else [str(item)] for item in comparison_data[key]['data']]
            add_section(elements, f"{title} (Count: {len(data)})", data, headers, table_style)
            individual_pdf_path = os.path.join(output_dir, f"{current_environment}_{key}_{timestamp}.pdf")
            generate_individual_pdf(f"{title} (Count: {len(data)})", data, headers, individual_pdf_path, table_style)

        doc.build(elements)
        return combined_pdf_path

    except Exception as e:
        raise Exception(f"Error generating PDF report: {e}")

def get_environment_payloads():
    if current_environment == "dev":
        return DevTestPayload
    elif current_environment == "qa":
        return QaTestPayload
    else:
        return DevTestPayload

# S3 


def get_file_from_s3(bucket_name, file_key):
    # Check if bucket_name is a valid string
    client_service = ClientService()
    s3_client = client_service.client_type.client
    bucket_name = client_service.client_type.bucket_name
    if not isinstance(bucket_name, str):
        raise ValueError("Bucket name must be a valid string")

    # Check if file_key is a valid string
    if not isinstance(file_key, str):
        raise ValueError("File key must be a valid string")

    # Fetch the file from the S3 bucket
    try:
        # Get the file from S3 bucket
        response = s3_client.get_object(Bucket=bucket_name, Key=file_key)

        # Read the JSON file from the response
        file_content = response['Body'].read().decode('utf-8')

        # Parse the JSON content
        api_keys = json.loads(file_content)

        return api_keys
    except Exception as e:
        print(f"Error fetching file from S3: {e}")
        return None

def generate_separate_csvs(comparison_data, request):
    """
    Generates separate CSV reports for each section from the comparison data.

    Parameters:
    - comparison_data: dict containing the data to be written to the CSV.

    Returns:
    - None
    """
    output_dir, timestamp = create_root_and_subdirectories(request.url.path)

    # Create separate CSV files for each section
    for key in ["present_in_company_and_comapnypinecone", "present_in_companypinecone", "present_in_company"]:
        # Generate filename path
        section_name = key.replace("_", "-")

        # Construct the path for each CSV file
        csv_path = Path(output_dir) / f"{current_environment}_{section_name}_{timestamp}.csv"
        
        # Extract relevant data
        data = comparison_data[key]["data"]
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Save DataFrame to CSV
        df.to_csv(csv_path, index=False)
        
        print(f"CSV report created at: {csv_path}")

def format_user_data(current_user):
    """Formats user data into a structured dictionary."""
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "fname": current_user.get("fname", ""),
        "lname": current_user.get("lname", ""),
        "fcmtokens": current_user.get("fcmTokens", []),
        "profile": {
            "name": current_user.get("profile", {}).get("name", ""),
            "uri": current_user.get("profile", {}).get("uri", ""),
            "mime_type": current_user.get("profile", {}).get("mime_type", ""),
            "id": str(current_user.get("profile", {}).get("id", ""))
        } if "profile" in current_user else None
    }

def validate_source_and_file(file_content, code, data: dict, brain_title):
    """
    Checks if 'uuid' key is present in at least one record for 'ANTHROPIC' code.
    If missing, sends a push notification and logs the failure.

    :param json_data: Parsed JSON data (list of dictionaries)
    :param code: Code type (e.g., 'ANTHROPIC')
    :param user_data: User details containing FCM tokens
    :param data: Additional metadata used for notifications
    :raises HTTPException: If 'uuid' is missing when 'ANTHROPIC' code is used.
    """
    try:
        json_data = json.loads(file_content)  # Convert file content to JSON
    except json.JSONDecodeError:
        logger.error(
            f"🚨 JSON Parsing Failed: Invalid JSON format in uploaded file.",
            extra={"tags": {"method": "ImportChatJson.validate_source_and_file"}},)
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE, 
            detail="Invalid JSON format."
        )

    uuid_key_present = all("uuid" in record for record in json_data)
    title_present = all("title" in record for record in json_data)
    chat_messages_present = all("chat_messages" in record for record in json_data)
    mapping_present = all("mapping" in record for record in json_data)

    if code == "ANTHROPIC" and not (uuid_key_present and chat_messages_present):
        error_message = "For 'ANTHROPIC' code, the uploaded JSON file must contain both 'uuid' and 'chat_messages' keys."
    elif code == "OPENAI" and not (title_present and mapping_present):
        error_message = "For 'OPENAI' code, the uploaded JSON file must contain both 'title' and 'mapping' keys."
    else:
        return

    logger.info(f"❌ Invalid JSON File for {code}: {error_message}",
                extra={"code": code, "error": error_message})
    
    fcm_tokens = data.get("fcmtokens", [])

    if fcm_tokens:
        logger.info(
            f"❌🔔 Failure Notification Sent: The provided code '{code}' does not match the uploaded JSON format. "
            "🚫 Mismatch detected!",
            extra={"tags": {"method": "ImportChatJson.validate_source_and_file"},
                "error_details": {"code": code,"brain_name": brain_title,"reason": "missing in JSON"}})
        firebase.send_push_notification(
            fcm_tokens,
            ImportChatConfig.FAILURE_TITLE,
            ImportChatConfig.FAILURE_BODY.format(source=code, brain_name=brain_title),
        )
    else:
        logger.info("❌🚫 No FCM tokens available. Skipping push notification.",
            extra={"tags": {"method": "ImportChatJson.validate_anthropic_uuid"}})

    add_notification_data(ImportChatConfig.FAILURE_TITLE, data, "notificationList")

    raise HTTPException(
        status_code=status.HTTP_406_NOT_ACCEPTABLE,
        detail=error_message,
    )

def generate_csv_delete_report(deleted_companies, request):
    """
    Generates separate CSV reports for each company based on the deleted records.

    Parameters:
    - deleted_companies: List containing the data of deleted companies.
    - request: The request object (used for generating the directory structure).

    Returns:
    - success_message: Confirmation message after generating reports.
    """
    # Create root and subdirectories based on the request URL
    output_dir, timestamp = create_root_and_subdirectories(request.url.path)

    # Loop through each deleted company and generate a cleaned CSV for each
    for company in deleted_companies:
        company_name = company['company_name']
        company_id = company['company_id']

        # Prepare the CSV file path with company name and timestamp
        csv_path = Path(output_dir) / f"{company_name}_{company_id}_cleaned_deleted_records_{timestamp}.csv"

        # Prepare the data structure to hold cleaned data
        cleaned_data = {
            "company_name": company_name,
            "company_id": company_id
        }

        # Flatten the nested record data
        for record_type, records_dict in {
            'brain_records': company['deleted_brain_records'],
            'company_records': company['deleted_company_records'],
            'user_records': company['deleted_user_records']
        }.items():
            for record_name, count in records_dict.items():
                # Add each record as a separate column
                cleaned_data[f"{record_type}_{record_name}"] = count

        # Convert the cleaned data to a DataFrame
        df = pd.DataFrame([cleaned_data])

        # Ensure the file is saved in the correct directory
        df.to_csv(csv_path, index=False)

        # Log or print the creation of the report
        print(f"Clean CSV report created for {company_name} at: {csv_path}")

    # Return a success message after all reports are generated
    return "CSV reports generated successfully"

def get_api_security_code_from_db():
    """Fetches the verification code from the settings collection."""
    try:
        expected_security_code = get_field_by_name(collection_name="setting",name="API_CODE",field_name="security_code")

        if not expected_security_code:
            logger.error("🚨 API Security code not found in database!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security code not found in database"
            )

        return expected_security_code

    except Exception as e:
        logger.exception(f"🛑 Unexpected error while fetching security code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the security code"
        )
    
# class SecurityCodeUpdater:
#     """Manages periodic updates of security codes in the MongoDB 'setting' collection."""

#     def __init__(self, update_interval=int(timedelta(hours=24).total_seconds())):
#         """
#         Initializes the updater and starts the background thread.

#         :param update_interval: Interval in seconds to update the security code (default: 15 minutes)
#         """
#         self.update_interval = update_interval
#         self.setting_collection = db_instance.get_collection('setting')
#         self.lock = threading.Lock()

#         self.update_thread = threading.Thread(target=self.run, daemon=True)
#         self.update_thread.start()

#     def generate_random_code(self):
#         """Generates a random 6-digit security code."""
#         return str(random.randint(100000, 999999))

#     def update_security_code(self):
#         """Updates the security_code field in MongoDB."""
#         new_code = self.generate_random_code()

#         timezone = pytz.timezone("Asia/Kolkata")  # Adjust timezone if needed
#         current_datetime = datetime.now(timezone)

#         with self.lock:  # Ensure thread safety
#             result = self.setting_collection.update_one(
#                 {"name": "API_CODE"},
#                 {
#                     "$set": {
#                         "security_code": new_code,
#                         "updatedAt": current_datetime
#                     }
#                 }
#             )

#             if result.modified_count > 0:
#                 logger.info(f"🔐 Security code updated successfully: {new_code}")
#             else:
#                 logger.warning("🚫 No matching document found or security code remains unchanged.")

#     def run(self):
#         while True:
#             time.sleep(self.update_interval)
#             self.update_security_code()

# security_code_updater = SecurityCodeUpdater()

def verify_security_code(request: Request):
    """Global dependency to validate security code for all routes in this router."""
    security_code = request.headers.get("Security-Code")

    if not security_code:
        logger.warning("🚨 Missing Security-Code in request headers!")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing security code")

    expected_code = get_api_security_code_from_db()

    if security_code != expected_code:
        logger.error("🚫🚨 Security alert! Invalid API Security-Code used.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid security code")

    logger.info("🛡️✅ API security code verified successfully!") 
    return True

registry = CollectorRegistry()
FRAME_SELF_TIME = Gauge(
    'profile_frame_self_time_seconds',
    'Self time for a profiling frame',
    ['function', 'file', 'line', 'depth'],
    registry=registry
)

# class PyInstrumentMiddleWare(BaseHTTPMiddleware):
#     async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
#         if request.url.path in ["/metrics","/profile"]:
#             return await call_next(request)
#         profiler = Profiler(interval=0.001, async_mode="enabled")
#         profiler.start()
#         response = await call_next(request)
#         profiler.stop()
#         # Write result to html file
#         profiler.write_html("profile.html")
#         renderer = JSONRenderer()
#         profiling_json = json.loads(renderer.render(profiler.last_session))
#         timestamp = get_ist_timestamp()
#         trace_name = os.path.basename(request.url.path)
#         redis_key = f"profile_log:{trace_name}:{timestamp}"
#         redis_client.set(redis_key, json.dumps(profiling_json))
#         with open("profile.json", "w") as json_file:
#             json.dump(profiling_json, json_file)
#         root_frame = profiling_json.get("root_frame", {})
#         request.app.state.last_profiling_data = profiling_json
#         # self.extract_frames(root_frame, depth=0)
#         return response
    

def get_ist_timestamp():
    timezone = pytz.timezone("Asia/Kolkata")
    current_datetime = datetime.now(timezone).strftime("%d_%m_%Y__%H_%M_%S")
    return current_datetime

def upload_metrice_file_to_s3(data, s3_bucket, s3_key):
    """Uploads a file to S3 from disk."""
    try:
        client_service = ClientService()
        s3_client = client_service.client_type.client
        profiler_bucket = client_service.client_type.profiler
        s3_client.put_object(Bucket=profiler_bucket, Key=s3_key, Body=data)
    except Exception as e:
        logger.error(f"[upload_metrice_file_to_s3] Error uploading the file to S3: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"S3 upload failed: {str(e)}")

def delete_file_from_s3(file_key):
    try:
        client_service = ClientService()
        s3_client = client_service.client_type.client
        bucket_name = client_service.client_type.bucket_name
        s3_client.delete_object(Bucket=bucket_name, Key=file_key)
    except Exception as e:
        logger.error(f"[delete_file_from_s3: utils] Failed to delete file '{file_key}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"S3 file Delete failed: {str(e)}")

async def save_profiling_data(profiler, file_name):
    """Save profiling data asynchronously and ensure directories exist"""
    try:
        # Upload to S3
        s3_bucket = os.environ.get("PROFILER_S3_BUCKET", "weam-dev-01-profiler")
        json_s3_path = f"profiling_metrices/json/{file_name}.json"
        html_s3_path = f"profiling_metrices/html/{file_name}.html"

        profiling_json = json.loads(JSONRenderer().render(profiler.last_session))
        json_data = json.dumps(profiling_json, indent=4)

        loop = asyncio.get_running_loop()
        html_content = await loop.run_in_executor(None, profiler.output_html)  # Ensure `output_html()` exists
        
        # # ⚡ Run both uploads in parallel to speed up execution
        asyncio.create_task(asyncio.to_thread(upload_metrice_file_to_s3, json_data, s3_bucket, json_s3_path))
        asyncio.create_task(asyncio.to_thread(upload_metrice_file_to_s3, html_content, s3_bucket, html_s3_path))

        # 📤 Send upload tasks to Celery (non-blocking)
        # task_upload_data_to_s3.delay(json_data, json_s3_path, "json")
        # task_upload_data_to_s3.delay(html_content, html_s3_path, "html")

        logger.info(f"📤 Profiling data uploading to S3 bucket {s3_bucket}")
    except Exception as e:
        logger.error(f"Error saving profiling data: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Profiling data save failed: {str(e)}")

class PyInstrumentMiddleWare(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        allowed_paths = ["/ping", "/docs", "/redoc", "/openapi.json","/metrics","/profile","/favicon.ico"]
        
        request_path = request.scope["path"].rstrip("/")
        if request_path in allowed_paths:
            return await call_next(request)

        profiler = Profiler(interval=0.01, async_mode="enabled")
        profiler.start()
        response = await call_next(request)
        profiler.stop()

        # Extract trace name and timestamp
        trace_name = os.path.basename(request.url.path).strip("/") or "unknown"
        timestamp = get_ist_timestamp()
        file_name = f"profile_log_{trace_name}_{timestamp}"

        # Save profiling data asynchronously
        asyncio.create_task(save_profiling_data(profiler, file_name))

        return response

    def extract_frames(self, frame, depth):
        """
        Recursively extract profiling frames from the nested JSON structure
        and record their execution time in the global gauge.
        
        Labels:
          - function: The function name.
          - file: The short file path.
          - line: The line number (as string).
          - depth: The depth in the call tree (root = 0).
        """
        function = frame.get("function", "unknown")
        file_short = frame.get("file_path_short", "unknown")
        # Use 'line_no' if available, otherwise fallback to 'line'
        line = str(frame.get("line_no", frame.get("line", "0")))
        frame_time = frame.get("time", 0)
        
        FRAME_SELF_TIME.labels(function=function, file=file_short, line=line, depth=str(depth)).set(frame_time)
        
        # Recursively process any child frames
        for child in frame.get("children", []):
            self.extract_frames(child, depth + 1)

class MemoryLeakMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, dispatch=None):
        super().__init__(app, dispatch)
        tracemalloc.start()  # Ensure tracemallo
    async def dispatch(self, request: Request, call_next) -> Response:
        # Take a snapshot at the start of the request processing
        start_snapshot = tracemalloc.take_snapshot()
        
        # Process the request
        response = await call_next(request)
        
        # Take a snapshot after processing the request
        end_snapshot = tracemalloc.take_snapshot()
        
        # Generate and write the memory leak report
        await self._generate_memory_leak_report(request, start_snapshot, end_snapshot)
        
        return response
    
    async def _generate_memory_leak_report(self, request: Request, start_snapshot, end_snapshot):
        """Generates an HTML report for memory allocation differences."""
        top_stats = end_snapshot.compare_to(start_snapshot, 'lineno')
        local_file = os.path.basename(__file__)
        
        # report_filename = f"memory_leak_report_{local_file}_{request.url.path.strip('/').replace('/', '_') or 'root'}.html"
        BASE_METRICS_DIR = "metrices"
        MEMORY_LEAK_DIR = os.path.join(BASE_METRICS_DIR, "memory_leaks")
        os.makedirs(MEMORY_LEAK_DIR, exist_ok=True)
        report_filename = os.path.join(MEMORY_LEAK_DIR, f"memory_leak_report_{local_file}_{request.url.path.strip('/').replace('/', '_') or 'root'}.html")
    
        os.makedirs(os.path.dirname(report_filename), exist_ok=True)

        async with aiofiles.open(report_filename, "w") as f:
            await f.write("<html><head><meta charset='UTF-8'></head><body>")
            await f.write("<h1>Top 40 Detailed Memory Leak Report</h1>")
            
            for index, stat in enumerate(top_stats, 1):
                await f.write(
                    f"<h2>Leak #{index}: {stat.count} allocations, {stat.size / 1024:.1f} KiB</h2>"
                )
                await f.write("<ul>")
                
                for frame in stat.traceback:
                    code_line = linecache.getline(frame.filename, frame.lineno).strip() or "N/A"
                    function_name = inspect.getframeinfo(frame)._function if hasattr(frame, '_function') else "Unknown"
                    await f.write(
                        "<li>"
                        f"<strong>File:</strong> {frame.filename} "
                        f"<strong>Function:</strong> {function_name} "
                        f"<strong>Line:</strong> {frame.lineno} "
                        f"<strong>Code:</strong> {code_line}"
                        "</li>"
                    )
                
                await f.write("</ul>")
            
            await f.write("</body></html>")

def verify_basic_auth(request: Request) -> bool:
    """
    Verifies Basic Authentication from request headers.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logger.warning("[AUTH] 🚨 Missing Authorization header! Access denied.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="🔒 Authentication required! Please provide valid credentials.",
            headers={"WWW-Authenticate": "Basic"},
        )

    try:
        scheme, encoded_credentials = auth_header.split()
        if scheme.lower() != "basic":
            raise ValueError("Invalid authentication scheme")

        decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
        username, password = decoded_credentials.split(":", 1)
    except Exception as e:
        logger.error(f"🚨 Failed to decode Basic Auth header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="⛔ Invalid Basic Auth header format! Use [username:password]",
            headers={"WWW-Authenticate": "Basic"},
        )

    auth_username = os.environ.get("AUTH_USERNAME","admin")
    auth_password = os.environ.get("AUTH_PASSWORD","admin@123")

    if username != auth_username or password != auth_password:
        logger.warning(f"🚨 Invalid credentials for username: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="⛔ Invalid credentials! Please check your username and password. ❌",
            headers={"WWW-Authenticate": "Basic"},
        )

    logger.info("🛡️✅ Authentication successful!")
    return True
class ForceCleanupMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        await self.force_cleanup()
        return response

    async def force_cleanup(self):
        await asyncio.sleep(0.1)
        gc.collect()
        tracemalloc.clear_traces()

class AsyncHTTPClientSingleton:
    _client: httpx.AsyncClient = None

    @classmethod
    async def get_client(cls):
        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                limits=httpx.Limits(
                    max_connections=200,
                    max_keepalive_connections=100,
                    keepalive_expiry=10.0
                ),
                http2=True
            )
        return cls._client

    @classmethod
    async def close_client(cls):
        if cls._client:
            await cls._client.aclose()
            cls._client = None

class SyncHTTPClientSingleton:
    _client: httpx.Client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = httpx.Client(
                timeout=httpx.Timeout(10.0, connect=5.0),
                limits=httpx.Limits(
                    max_connections=200,
                    max_keepalive_connections=100,
                    keepalive_expiry=10.0
                ),
                http2=True
            )
        return cls._client

    @classmethod
    def close_client(cls):
        if cls._client:
            cls._client.close()
            cls._client = None
