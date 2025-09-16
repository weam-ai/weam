from fastapi import HTTPException, status, Depends, APIRouter
from bson import ObjectId
from src.db.config import db_instance
from src.gateway.utils import migrate_summaries_field, migrate_website_and_summaries
from src.logger.default_logger import logger
from src.gateway.jwt_decode import get_user_data
from pydantic import BaseModel
import os
from src.crypto_hub.utils.crypto_utils import MessageEncryptor, MessageDecryptor
from datetime import datetime
import pytz
from dotenv import load_dotenv
from typing import List
from src.db.config import get_field_by_name
import asyncio

load_dotenv()

router = APIRouter()

collection = db_instance.get_collection("prompts")

key = os.getenv("SECURITY_KEY").encode("utf-8")
encryptor = MessageEncryptor(key)
decryptor = MessageDecryptor(key)

@router.post(
    "/migrate-summaries",
    summary="Migrate summaries for all documents",
    description="Migrates summaries fields in brandInfo, companyInfo, and productInfo for all documents.",
    response_description="Migration status message.",
)
async def migrate_all_summaries(current_user=Depends(get_user_data)):
    """Migrate summaries fields in brandInfo, companyInfo, and productInfo for all documents."""
    try:
        documents = collection.find()
        migrated_count = 0

        for doc in documents:
            migrated = False

            for field in ["brandInfo", "companyInfo", "productInfo"]:
                if doc.get(field) and "website" in doc[field]:
                    websites = doc[field]["website"]
                    if isinstance(websites, list) and websites:
                        migrated = migrate_summaries_field(doc, field)
                        break  # Stop checking other fields if migration occurred

            if migrated:
                migrated_count += 1

        logger.info(f"Migrated {migrated_count} documents in the 'prompts' collection.")
        return {"message": f"Successfully migrated {migrated_count} documents." if migrated_count else "No migrations were needed."}

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

@router.post(
    "/migrate-summaries-new",
    summary="Migrate summaries with new strategy",
    description="Migrates summaries fields using a new strategy for brandInfo, companyInfo, and productInfo.",
    response_description="Migration status message.",
)
async def migrate_all_summaries_new(current_user=Depends(get_user_data)):
    """Use a new strategy to migrate summaries fields for all documents."""
    try:
        documents = collection.find()
        migrated_count = 0

        for doc in documents:
            migrated = False

            for field in ["brandInfo", "companyInfo", "productInfo"]:
                if doc.get(field):
                    migrated = migrate_website_and_summaries(doc, field)
                    if migrated:
                        break  # Stop checking other fields if migration occurred

            if migrated:
                collection.update_one({"_id": doc["_id"]}, {"$set": doc})
                migrated_count += 1
                logger.info(f"Migrated document {doc['_id']}.")

        return {"message": f"Migrated {migrated_count} documents." if migrated_count else "No migrations were needed."}

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

@router.post(
    "/migrate-summaries-new/{doc_id}",
    summary="Migrate summaries for a specific document",
    description="Migrates summaries fields for a specific document by ID.",
    response_description="Migration status message.",
)
async def migrate_summary_by_id(doc_id: str, current_user=Depends(get_user_data)):
    """Migrate summaries fields for a specific document by ID."""
    try:
        doc = collection.find_one({"_id": ObjectId(doc_id)})

        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        migrated = False

        for field in ["brandInfo", "companyInfo", "productInfo"]:
            if doc.get(field):
                migrated = migrate_website_and_summaries(doc, field)
                if migrated:
                    break

        if migrated:
            collection.update_one({"_id": doc["_id"]}, {"$set": doc})
            logger.info(f"Migrated document {doc_id}.")
            return {"message": f"Document {doc_id} migrated."}

        return {"message": f"No migration needed for document {doc_id}."}

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

@router.post(
    "/migrate-field",
    summary="Rename 'websites' to 'website' for all documents",
    description="Migrates the 'websites' field to 'website' for all documents.",
    response_description="Migration status message.",
)
async def migrate_all_documents_for_field(current_user=Depends(get_user_data)):
    """Rename the 'websites' field to 'website' for all documents."""
    try:
        documents = collection.find({"websites": {"$exists": True}})
        migrated_count = 0

        for doc in documents:
            doc["website"] = doc.pop("websites")
            collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"website": doc["website"], "updatedAt": doc.get("updatedAt")},
                 "$unset": {"websites": ""}}
            )
            migrated_count += 1

        logger.info(f"Migrated {migrated_count} documents.")
        return {"message": f"Migrated {migrated_count} documents." if migrated_count else "No migration needed."}

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

@router.post(
    "/migrate-field/{doc_id}",
    summary="Rename 'websites' to 'website' for a specific document",
    description="Migrates the 'websites' field to 'website' for a specific document by ID.",
    response_description="Migration status message.",
)
async def migrate_field_by_id(doc_id: str, current_user=Depends(get_user_data)):
    """Rename the 'websites' field to 'website' for a specific document by ID."""
    try:
        doc = collection.find_one({"_id": ObjectId(doc_id)})

        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        if "websites" in doc:
            doc["website"] = doc.pop("websites")
            collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"website": doc["website"], "updatedAt": doc.get("updatedAt")},
                 "$unset": {"websites": ""}}
            )
            logger.info(f"Migrated document {doc_id}.")
            return {"message": f"Document {doc_id} migrated."}

        return {"message": f"No migration needed for document {doc_id}."}

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

class UpdateChatTitleRequest(BaseModel):
    title: str

@router.post(
    "/update-chat-title/{doc_id}",
    summary="Update title for a specific chat",
    description="Updates the 'slug' field for a specific chat document by ID.",
    response_description="Update status message.",
)
async def update_chat_title(doc_id: str, request: UpdateChatTitleRequest, current_user=Depends(get_user_data)):
    """Update the 'title' value for a specific chat document by ID."""
    try:
        chat_collection = db_instance.get_collection("chat")
        doc = chat_collection.find_one({"_id": ObjectId(doc_id)})

        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat document not found.")

        # Update the slug
        chat_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"title": request.title}}
        )
        logger.info(f"Updated title for chat document {doc_id}.")
        return {"message": f"Document {doc_id} updated with new title --> {request.title}."}

    except Exception as e:
        logger.error(f"Update title error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update process encountered an error.")
    
@router.post("/migrate-company-querylimit", summary="Migrate company query limit")
async def migrate_company(current_user=Depends(get_user_data)):
    try:
        company_collection = db_instance.get_collection("company")
        timezone = pytz.timezone("Asia/Kolkata")
        current_datetime = datetime.now(timezone)

        updated_companies = []
        total_migrated_count = 0
        companies = company_collection.find({})

        for company in companies:
            query_limit = company.get("queryLimit", {})
            if "GEMINI" not in query_limit:
                query_limit["GEMINI"] = 50
                company_collection.update_one(
                    {"_id": company["_id"]},
                    {"$set": {"queryLimit": query_limit, "updatedAt": current_datetime}}
                )
                updated_companies.append(company["companyNm"])
                total_migrated_count += 1

        # Check if any companies were updated
        if total_migrated_count > 0:
            logger.info(f"Total companies migrated: {total_migrated_count}.")
        else:
            logger.warning("No companies were migrated.")

        return {
            "message": "Migration for company querylimit completed successfully.",
            "total Migrated count": total_migrated_count,
            "updatedCompanies": updated_companies
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")


@router.post("/migrate-company-gemini-models", summary="Migrate company gemini models")
async def migrate_company_models(current_user=Depends(get_user_data)):
    try:
        company_collection = db_instance.get_collection("company")
        company_model_collection = db_instance.get_collection("companymodel")
        model_collection = db_instance.get_collection("model")
        
        timezone = pytz.timezone("Asia/Kolkata")
        current_datetime = datetime.now(timezone)

        models_to_add = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]
        updated_companies = []
        total_migrated_count = 0


        model_data = model_collection.find_one({"code": "GEMINI"}, {"_id": 1, "title": 1, "code": 1})
        if not model_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model Data not found.")
        
        bot_data = {
            "title": model_data["title"],
            "code": model_data["code"],
            "id": model_data["_id"]
        }

        api_key = 'default-key'

        companies = company_collection.find({})
        for company in companies:
            company_id = company["_id"]
            company_name = company["companyNm"]
            models_inserted = []
            
            for model_name in models_to_add:
                if not company_model_collection.find_one({"name": model_name, "company.id": company_id}):
                    new_record = {
                        "name": model_name,
                        "bot": bot_data,
                        "company": {
                            "name": company_name,
                            "slug": company["slug"],
                            "id": company_id
                        },
                        "config": {"apikey": api_key},
                        "modelType": 2,
                        "isActive": True,
                        "extraConfig": {"temperature": 0.7, "topP": 0.9, "topK": 10},
                        "createdAt": current_datetime,
                        "updatedAt": current_datetime
                    }
                    company_model_collection.insert_one(new_record)
                    models_inserted.append(model_name)

            if models_inserted:
                updated_companies.append({
                    "companyName": company_name,
                    "modelsInserted": models_inserted,
                    "totalModelsInserted": len(models_inserted)
                })
                total_migrated_count += 1
                logger.info(f"Inserted {len(models_inserted)} models for company {company_name}.")

        # Check if any companies were updated
        if total_migrated_count > 0:
            logger.info(f"Total companies migrated: {total_migrated_count}.")
        else:
            logger.warning("No companies were migrated.")
        
        return {
            "message": "Migration completed successfully.",
            "total Migrated count": total_migrated_count,
            "updatedCompanies": updated_companies
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")

@router.post("/migrate-company-o1-models", summary="Migrate company o1 models")
async def migrate_company_models(current_user=Depends(get_user_data)):
    try:
        company_collection = db_instance.get_collection("company")
        company_model_collection = db_instance.get_collection("companymodel")
        model_collection = db_instance.get_collection("model")

        openai_key = os.getenv("OPENAI_API_KEY")
        api_key = encryptor.encrypt(openai_key)                  
        
        timezone = pytz.timezone("Asia/Kolkata")
        current_datetime = datetime.now(timezone)

        models_to_add = ["o1-preview", "o1-mini"]
        updated_companies = []
        total_migrated_count = 0

        model_data = model_collection.find_one({"code": "OPEN_AI"}, {"_id": 1, "title": 1, "code": 1})
        if not model_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model Data not found.")
        
        bot_data = {
            "title": model_data["title"],
            "code": model_data["code"],
            "id": model_data["_id"]
        }

        # Get all companies from the collection
        companies = company_collection.find({})
        for company in companies:
            company_id = company["_id"]
            company_name = company["companyNm"]
            models_inserted = []
            
            # Get the existing key record for "gpt-4" model
            existing_key_record = company_model_collection.find_one({"name": "gpt-4", "company.id": company_id})
            for model_name in models_to_add:
                # Check if the model already exists for this company
                existing_record = company_model_collection.find_one({"name": model_name, "company.id": company_id})

                if existing_key_record:
                    model_apikey = existing_key_record.get("config", {}).get("apikey", "")

                # If the model does not exist, insert it
                if not existing_record:
                    # Use the appropriate API key
                    if model_apikey == api_key:
                        new_apikey = api_key
                    else:
                        new_apikey = model_apikey

                    new_record = {
                        "name": model_name,
                        "bot": bot_data,
                        "company": {
                            "name": company_name,
                            "slug": company["slug"],
                            "id": company_id
                        },
                        "config": {"apikey": new_apikey},
                        "modelType": 2,
                        "isActive": True,
                        "extraConfig": {"stop": [], "temperature": 1, "tools": []},
                        "createdAt": current_datetime,
                        "updatedAt": current_datetime
                    }

                    # Insert the new model into the companymodel collection
                    company_model_collection.insert_one(new_record)
                    models_inserted.append(model_name)

            # Check if any models were inserted for this company
            if models_inserted:
                updated_companies.append({
                    "companyName": company_name,
                    "modelsInserted": models_inserted,
                    "totalModelsInserted": len(models_inserted)
                })
                total_migrated_count += 1
                logger.info(f"Inserted {len(models_inserted)} models for company {company_name}.")
            else:
                logger.info(f"No models inserted for company {company_name}.")

        # Check if any companies were updated
        if total_migrated_count > 0:
            logger.info(f"Total companies migrated: {total_migrated_count}.")
        else:
            logger.warning("No companies were migrated.")

        return {
            "message": "Migration Companymodel completed successfully.",
            "totalMigratedCount": total_migrated_count,
            "updatedCompanies": updated_companies
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")



class Company(BaseModel):
    companyNm: str
    slug: str
    company_id: str

    

@router.post("/migrate-company-perplexity-models", summary="Migrate company perplexity models")
async def migrate_company_models(current_user=Depends(get_user_data)):
    try:
        company_collection = db_instance.get_collection("company")
        company_model_collection = db_instance.get_collection("companymodel")
        model_collection = db_instance.get_collection("model")                
        
        timezone = pytz.timezone("Asia/Kolkata")
        current_datetime = datetime.now(timezone)

        models_to_add = ["sonar","sonar-pro"]
        updated_companies = []
        total_migrated_count = 0

        model_data = model_collection.find_one({"code": "PERPLEXITY"}, {"_id": 1, "title": 1, "code": 1})
        if not model_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model Data not found.")
        
        bot_data = {
            "title": model_data["title"],
            "code": model_data["code"],
            "id": model_data["_id"]
        }

        # Get all companies from the collection
        companies = company_collection.find({})
        for company in companies:
            company_id = company["_id"]
            company_name = company["companyNm"]
            models_inserted = []
            
            for model_name in models_to_add:
                existing_record = company_model_collection.find_one({"name": model_name, "company.id": company_id})

                # If the model does not exist, insert it
                if not existing_record:
                    perplexity_api_key = os.getenv("PERPLEXITY_API_KEY", None)

                    new_record = {
                        "name": model_name,
                        "bot": bot_data,
                        "company": {
                            "name": company_name,
                            "slug": company["slug"],
                            "id": company_id
                        },
                        "config": {"apikey": perplexity_api_key},
                        "modelType": 2,
                        "isActive": True,
                        "extraConfig": {"temperature": 0.7, "topP": 0.9, "topK": 10, "stream": True},
                        "createdAt": current_datetime,
                        "updatedAt": current_datetime
                    }

                    # Insert the new model into the companymodel collection
                    company_model_collection.insert_one(new_record)
                    models_inserted.append(model_name)

            # Check if any models were inserted for this company
            if models_inserted:
                updated_companies.append({
                    "companyName": company_name,
                    "modelsInserted": models_inserted,
                    "totalModelsInserted": len(models_inserted)
                })
                total_migrated_count += 1
                logger.info(f"Inserted {len(models_inserted)} models for company {company_name}.")
            else:
                logger.info(f"No models inserted for company {company_name}.")

        # Check if any companies were updated
        if total_migrated_count > 0:
            logger.info(f"Total companies migrated: {total_migrated_count}.")
        else:
            logger.warning("No companies were migrated.")

        return {
            "message": "Migration Companymodel completed successfully.",
            "totalMigratedCount": total_migrated_count,
            "updatedCompanies": updated_companies
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Migration process encountered an error.")
    