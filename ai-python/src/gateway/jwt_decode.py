import os
import jwt
from src.db.config import db_instance
from src.db.async_config import async_db_instance
from pydantic import BaseModel
from fastapi import Request, HTTPException, status
from src.logger.default_logger import logger
from bson.objectid import ObjectId

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM")


class TokenData(BaseModel):
    email: str
    id: str


def decode_jwt(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("email")
        id: str = payload.get("id")
        
        if email is None or id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return TokenData(email=email, id=id)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


async def get_user_by_email(email: str):
    collection = db_instance.get_collection("user")
    user = collection.find_one({"email": email})

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User email not found")

    return user


async def get_current_user(request: Request):
    logger.info("==============================================================")
    auth_header = request.headers.get("Authorization")
    if auth_header is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() == "basic":
            return {"message": "Basic Auth detected, no user details provided"}
        elif scheme.lower() == "jwt":
            token_data = decode_jwt(token)
            user = await get_user_by_email(token_data.email)
            if user is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")

async def get_user_by_id(user_id: str):
    logger.info(f"Fetching user by ID:")
    collection = async_db_instance.get_collection("user")
    user = await collection.find_one({"_id": ObjectId(user_id)},{"profile":1,"email":1, "lname":1,"fname":1,"mcpdata":1})
    logger.info(f"User fetched:")

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user

async def get_user_data(request: Request):
    auth_header = request.headers.get("Authorization")
    if auth_header is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() == "basic":
            return {"message": "Basic Auth detected"}
        elif scheme.lower() == "jwt":
            token_data = decode_jwt(token)
            user = await get_user_by_id(token_data.id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
