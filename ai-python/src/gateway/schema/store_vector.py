from pydantic import BaseModel,Field,field_validator
from src.gateway.schema.utils import validate_id_field

class ProcessTextRequest(BaseModel):
    file_url: str = Field(..., description="URL of the file to be processed.")
    file_type: str =Field(..., description="Type of the file being processed (e.g., PDF, DOCX, TXT).")
    source: str = Field(..., description="Source of the file (e.g., S3 bucket URL).")
    page_wise: bool = Field(default=False, description="Indicates whether the file should be processed page-by-page.")
    model_name: str = Field(default="sentence-transformers/all-mpnet-base-v2", description="Name of the model used for text embedding.")
    batch_size: int = Field(default=300, description="Number of items to process in each batch.")
    total_gpus: float = Field(default=0.5, description="Amount of GPU resources to allocate for processing.")
    chunk_maptype: str = Field(default="string", description="Type of mapping for text chunks.")
    tag: str = Field(default="default", description="Tag associated with the file for identification.")
    brain_id: str = Field(default="uwp", description="Brain Id is representing namespace in Pinecone where data will be stored.")
    node_text_embedder: str = Field(default="qdrant", description="Method to use for text embedding.")
    spliter: str = Field(default="custom_text_splitter", description="Type of text splitter to use.")


class RayServeEmbedProcessTextRequest(BaseModel):
    """
    Represents a request to process text data by embedding it with a Hugging Face model and storing the results in a Pinecone
    vector database. This class defines the parameters required for text data processing and vector storage, utilizing
    Hugging Face models via Ray Serve.

    Attributes:
    - `id` (str): Unique identifier for the request. Defaults to "1".
    - `file_url` (str): URL pointing to a text-based resource to be processed.
    - `file_type` (str): Type of file to be processed (e.g., PDF, DOCX, TXT).
    - `source` (str): Origin of the file (e.g., a URL, a database).
    - `page_wise` (bool): If True, the file is processed page by page. Defaults to False.
    - `spliter` (str): Type of text splitter to use. Defaults to "custom_text_spliter".
    - `meta_addfun` (str): Function or method to add additional metadata. Defaults to "addition_metadata_rayserve".
    - `chunk_maptype` (str): Type of mapping for text chunks. Defaults to "string".
    - `model_name` (str): Name of the Hugging Face model used for embedding. Defaults to 'sentence-transformers/all-mpnet-base-v2'.
    - `tag` (str): Tag for categorization or identification of the request. Defaults to "nikhil".
    - `node_text_embedder` (str): Specifies the service used for text embedding, set as 'embrayserve'.
    - `api_key_id` (str): ID for the API key used in the embedding process. Defaults to "1".
    - `dimensions` (int): Dimensionality of the vector embeddings. Defaults to 768.
    - `pinecone_apikey_id` (str): API key ID for Pinecone services. Defaults to "1".
    - `environment` (str): Pinecone environment to connect to. Defaults to "gcp-starter".
    - `brain_id` (str): Brain Id is representing namespace in Pinecone where data will be stored. Defaults to "uwp".
    - `vector_index` (str): Name of the Pinecone index used. Defaults to "openai".

    This class serves as a structured data model for endpoints managing the embedding and storage of text data, providing a
    clear interface for integration with Hugging Face models and Pinecone vector databases.
    """
    id: str = Field(default="1", description="File id which is belong from mongodb.")
    file_url: str = Field(...,description="URL of the file to be processed.")
    file_type: str = Field(..., description="Type of file being processed (e.g., PDF, DOCX, TXT).")
    source: str = Field(..., description="Source of the file (e.g., S3 bucket URL).")
    page_wise: bool = Field(default=False, description="Indicates whether the file should be processed page-by-page.")
    spliter: str = Field(default="custom_text_spliter", description="Specifies the text splitting method to be used for breaking down the file")
    meta_addfun: str = Field(default="addition_metadata_rayserve", description="Function or method for adding additional metadata to the file")
    chunk_maptype: str = Field(default="string", description="Type of mapping for text chunks within the file.")
    model_name: str = Field(default="sentence-transformers/all-mpnet-base-v2", description="Name of the model used for text embedding.")
    tag: str = Field(default="nikhil", description="Tag associated with the file for identification.")
    node_text_embedder: str = Field("embrayserve", description="Method to use for text embedding.")
    api_url_id: str = Field(default="1", description="Identifier for the API URL associated with the embedding model.")
    dimensions: int = Field(default=768, description="Dimension of the vector embeddings generated by the model")
    pinecone_apikey_id: str = Field(default="1", description="API key ID used for accessing the Pinecone service.")
    environment: str = Field(default="gcp-starter", description="Environment of pinecone to connect.")
    brain_id: str = Field(default="uwp", description="Brain Id is representing namespace in Pinecone where the data is stored.")
    vector_index: str = Field(default="openai", description="Vector index used for managing and accessing the file's vector data")


class OpenAIProcessTextRequest(BaseModel):
    """
    Represents a request to process text data, embed it with OpenAI, and store it in a vector database.

    This class defines the parameters required to process text data using OpenAI and store the results in a Pinecone
    vector database.

    Attributes:
    - `id` (str): A unique identifier for the request. Default is "1".
    - `file_url` (str): The URL of the file to be processed. Must be a valid URL pointing to a text-based resource.
    - `file_type` (str): The type of file being processed (e.g., PDF, DOCX, TXT).
    - `source` (str): The source or origin of the file (e.g., a URL, a database).
    - `page_wise` (bool): Indicates whether the file should be processed page-by-page. Default is "False".
    - `spliter` (str): The type of text splitter to use. Default is "custom_text_spliter".
    - `meta_addfun` (str): A function or method to add additional metadata. Default is "addition_metadata_openai".
    - `chunk_maptype` (str): Type of mapping for text chunks. Default is "string".
    - `model_name` (str): The name of the OpenAI model to use for embedding. Default is 'text-embedding-3-small'.
    - `tag` (str): A tag for categorization or identification of the request. Default is "filename.pdf".
    - `node_text_embedder` (str): The method or service to use for text embedding. Default is 'openai'.
    - `api_key_id` (str): The ID for the OpenAI API key. Default is "1".
    - `dimensions` (int): The dimensionality of the vector embeddings. Default is 1536.
    - `pinecone_apikey_id` (str): The ID for the Pinecone API key. Default is "1".
    - `enviroment` (str): The Pinecone environment to connect to. Default is "gcp-starter".
    - `brain_id` (str): Brain Id is representing namespace in Pinecone where data will be stored. Default is "uwp".
    - `vector_index` (str): The name of the Pinecone index to use. Default is "openai".

    This class serves as a data structure for requests to process and embed text, encapsulating the necessary information
    and providing a clear interface for the endpoint that uses it.
    """
    id: str = Field(..., description="File id which is belong from mongodb.")
    file_url: str = Field(..., description="URL of the file to be processed.")
    file_type: str = Field(..., description="Type of file being processed (e.g., PDF, DOCX, TXT).")
    file_name:str = Field("Parliament_news.pdf",  description="uploaded file name")
    source: str = Field(..., description="Source of the file (e.g., S3 bucket URL).")
    page_wise: bool = Field(default=False, description="Indicates whether the file should be processed page-by-page.")
    spliter: str = Field(default="custom_text_spliter", description="Type of text splitter to use.")
    meta_addfun: str = Field(default="addition_metadata_openai", description="Function or method used to add additional metadata to the file.")
    chunk_maptype: str = Field("string", description="Type of mapping for text chunks.")
    model_name: str = Field("text-embedding-3-small", description="Name of the OpenAI model.")
    tag:str = Field(..., description="File tag id str or list of tags.")
    node_text_embedder: str = Field("openai", description="Method to use for text embedding.")
    api_key_id: str = Field(..., description="api key id of mongodb embedding model id.")
    dimensions: int = Field(default=1536, description="Dimensionality of the vector embeddings.")
    environment: str = Field(default="gcp-starter", description="Environment of pinecone to connect.")
    brain_id: str = Field(default="uwp", description="Brain Id is representing namespace in Pinecone where data will be stored.")
    vector_index: str =  Field(...,description="company id required.")
    companymodel: str = Field(default="companymodel", description="Name of the company model used for processing.")
    companypinecone: str = Field(default="companypinecone",description="Pinecone index used by the company for vector operations.")
    company_id: str = Field(..., description="company id required.")
    file:str = Field('file', description="collection name")
    provider:str=Field(None,description="Provider to decide which llm to use for response")
    @field_validator('id', 'api_key_id', 'company_id', mode='before')
    def validate_id_fields(cls, value, field_info):
        return validate_id_field(value, field_info.field_name)

class StoreVectorResponse(BaseModel):
    task_chain_id: str

