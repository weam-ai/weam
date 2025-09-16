from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
import os

class AsyncSingleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(AsyncSingleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]

class AsyncMongoDBClient(metaclass=AsyncSingleton):
    def __init__(self):
        # Load config from environment
        self.mongo_user = os.getenv('DB_USERNAME',None)
        self.mongo_password = os.getenv('DB_PASSWORD',None)
        self.mongo_host = os.getenv('DB_HOST', 'localhost')  # Default to localhost if not specified
        self.mongo_port = os.getenv('DB_PORT', '27017')  # Default to 27017 if not specified
        self.mongo_db_name = os.getenv('DB_DATABASE', 'customai')  # Default to 'mydatabase' if not specified
        self.mongo_db_connection=os.environ.get("DB_CONNECTION","mongodb")
        self.db=None
        # Construct the MongoDB URI
        if self.mongo_user and self.mongo_password:
            uri = f"{self.mongo_db_connection}://{self.mongo_user}:{self.mongo_password}@{self.mongo_host}"
        else:
            uri = f"{self.mongo_db_connection}://{self.mongo_host}:{self.mongo_port}/"
        # Async client with tuned pool

        mongo_uri=os.environ.get("MONOGODB_URI",None)
        self.client: AsyncIOMotorClient = AsyncIOMotorClient(
            mongo_uri,
            maxPoolSize=int(os.getenv('MONGO_MAX_POOL', 50)),
            minPoolSize=int(os.getenv('MONGO_MIN_POOL', 5)),
            serverSelectionTimeoutMS=5000,
        )

    def get_database(self, db_name: str = None) -> AsyncIOMotorDatabase:
        name = db_name or self.mongo_db_name
        return self.client[name]

    def get_collection(
        self,
        collection_name: str,
        db_name: str = None
    ) -> AsyncIOMotorCollection:
        db = self.get_database(db_name)
        return db[collection_name]

# Instantiate a default async database instance for direct use
async_db_instance: AsyncIOMotorDatabase = AsyncMongoDBClient().get_database()

