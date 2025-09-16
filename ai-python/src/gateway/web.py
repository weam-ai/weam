import asyncio
import uvloop
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
from fastapi import FastAPI
from src.gateway.custom_fastapi.streaming_response import StreamingResponseWithStatusCode
from src.gateway.api_router import api_router
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
import pymongo
import aioredis
import os

from src.gateway.exceptions import (validation_exception_handler,http_exception_handler,mongodb_connection_error_handler,payload_too_large_handler,audio_too_large_handler)
from src.gateway.exceptions import custom_title_http_exception_handler,CustomTitleHttpException,PayloadTooLargeException,AudioTooLargeException
from dotenv import load_dotenv
from src.gateway.utils import RegexCORSMiddleware,get_regex_patterns,get_swagger_redoc_settings,ForceCleanupMiddleware,PyInstrumentMiddleWare, AsyncHTTPClientSingleton, SyncHTTPClientSingleton
from fastapi.middleware.cors import CORSMiddleware
# from src.gateway.utils import RegexCORSMiddleware,get_regex_patterns,get_swagger_redoc_settings,APICountMiddleware,APICountMiddlewareRedis,MultiAPICountMiddlewareRedis
from qdrant_client import QdrantClient, models
from qdrant_client.models import VectorParams, Distance
from qdrant_client.models import KeywordIndexParams
from src.gateway.boto3_localstack import upload_file_to_s3
from src.db.qdrant_config import qdrant_client
from src.gateway.seeder.companymodel import CompanyModelSeeder
load_dotenv()

seeder_available = os.environ.get("SEEDER_ENABLED", "false").lower() == "true"

enable_swagger, enable_redoc = get_swagger_redoc_settings()

app = FastAPI(
    docs_url="/docs" if enable_swagger else None,
    redoc_url="/redoc" if enable_redoc else None
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specific origins
    allow_credentials=True,
    allow_methods=["*"],  # or explicitly ["GET", "POST", "OPTIONS"]
    allow_headers=["*"],  # or specific headers
)

@app.on_event("startup")
async def startup_event():
    print("⚡ Starting up the FastAPI application...")
    if seeder_available:
        seeder = CompanyModelSeeder()
        seeder.seed()
    app.state.regex_patterns = get_regex_patterns()
    await AsyncHTTPClientSingleton.get_client()
    SyncHTTPClientSingleton.get_client()

# regex_patterns = [r".weam\.ai"]
# regex_patterns = get_regex_patterns()

# app.add_middleware(RegexCORSMiddleware)
# app.add_middleware(APICountMiddleware)
# app.add_middleware(APICountMiddlewareRedis)
# app.add_middleware(MultiAPICountMiddlewareRedis)
app.include_router(api_router)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(PayloadTooLargeException, payload_too_large_handler)
app.add_exception_handler(AudioTooLargeException, audio_too_large_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(pymongo.errors.ServerSelectionTimeoutError, mongodb_connection_error_handler)
app.add_exception_handler(CustomTitleHttpException, custom_title_http_exception_handler)
app.add_middleware(ForceCleanupMiddleware)
# app.add_middleware(PyInstrumentMiddleWare)


@app.on_event("shutdown")
async def shutdown_event():
    await AsyncHTTPClientSingleton.close_client()
    SyncHTTPClientSingleton.close_client()

@app.get("/ping")
async def ping():
    return {"message": "pong"}