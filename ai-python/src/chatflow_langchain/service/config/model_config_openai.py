from src.logger.default_logger import logger
from bson.objectid import ObjectId
from pymongo.errors import PyMongoError
from src.chatflow_langchain.service.config.baseModel_repository import BaseDefaultModelRepository

class OPENAIMODEL:
    GPT_35 = 'gpt-3.5-turbo'
    GPT_4_1_MINI = 'gpt-4.1-mini'
    GPT_4_1 = 'gpt-4.1'
    GPT_TEXT_MODEL = "text-embedding-3-small"
    DEFAULT_TOOL_MODEL = 'gpt-4.1-mini'
    MODEL_FOR_O1_CANVAS = 'gpt-4.1'
    MODEL_VERSIONS = {
                    'gpt-4.1': 'gpt-4.1',
                    'gpt-4.1-mini': 'gpt-4.1-mini',
                    'gpt-4.1-nano': 'gpt-4.1-nano',
                    'gpt-4o':'gpt-4o-2024-11-20',
                    'gpt-4.1-search-medium': 'gpt-4.1',
                    'chatgpt-4o-latest': 'chatgpt-4o-latest',
                      }
    VISION_MODELS = {'gpt-4.1': True, 'gpt-4.1-mini': True, 'gpt-4.1-nano': True, 'gpt-4o-2024-11-20':True, 'chatgpt-4o-latest':True, 'o4-mini':True, 'o3':True}
    LLM_IMAGE_MODEL = 'gpt-image-1'
    DALLE_WRAPPER_SIZE = "1024x1024"
    DALLE_WRAPPER_QUALITY = 'high'
    DALLE_WRAPPER_STYLE = 'vivid'
    TOOL_NOT_SUPPORTED_MODEL=['chatgpt-4o-latest']
    n = 1

class Functionality:
    CHAT = 'CHAT'
    AGENT = 'AGENT'
   


class WebSearchConfig:
    SEARCH_CONTEXT_SIZE = 'low'
    MODEL_LIST=['gpt-4.1-search-medium']
    
class DefaultGPT35ModelRepository(BaseDefaultModelRepository):
    def get_default_model_key(self):
        query = {
            "name": OPENAIMODEL.GPT_35,
            "company.id": ObjectId(self.company_id)
        }
        projection = {'_id': 1}
        return super().get_default_model_key(query, projection)

class DefaultGPT4oMiniModelRepository(BaseDefaultModelRepository):
    def get_default_model_key(self):
        query = {
            "name": OPENAIMODEL.GPT_4_1_MINI,
            "company.id": ObjectId(self.company_id)
        }
        projection = {'_id': 1}
        return super().get_default_model_key(query, projection)

class DefaultGPTTextModelRepository(BaseDefaultModelRepository):
    def get_default_model_key(self):
        query = {
            "name": OPENAIMODEL.GPT_TEXT_MODEL,
            "company.id": ObjectId(self.company_id)
        }
        projection = {'_id': 1}
        return super().get_default_model_key(query, projection)

    
class DefaultOpenAIModelRepository(BaseDefaultModelRepository):
    def get_default_model_key(self):
        query = {
            "name": OPENAIMODEL.GPT_4_1,
            "company.id": ObjectId(self.company_id)
        }
        projection = {'_id': 1}
        return super().get_default_model_key(query, projection)
    
    
class OutSideDefaultGPTTextModelRepository(BaseDefaultModelRepository):
    def get_default_model_key(self):
        query = {
            "name": OPENAIMODEL.GPT_TEXT_MODEL,
            "company.id": ObjectId(self.company_id)
        }
        projection = {"_id": 1, "deletedAt": 1}
        instance = self.get_collection()
        try:
            self.result = instance.find_one(query, projection)
            if not self.result:
                raise ValueError(f"No default model found for company id: {self.company_id} in {self.companymodel}")
            
            if self.check_deleted_key():
                raise ValueError(f"The model for company id {self.company_id} has been deleted.")
            
            return str(self.result['_id'])
        except PyMongoError as e:
            logger.error(f"Database query failed for company id {self.company_id}: {e}")
            raise

    def check_deleted_key(self):
        """
        Checks if the 'deletedAt' key exists in the result data.

        Returns:
            bool: True if the 'deletedAt' key exists and has a value, False otherwise.
        """
        value_check = self.result.get("deletedAt")
        return bool(value_check)

class DefaultModelNotFoundException(Exception):
    def __init__(self, company_id, company_model):
        self.company_id = company_id
        self.company_model = company_model
        self.message = f"No default model found for company id: {company_id} in {company_model}"
        super().__init__(self.message)