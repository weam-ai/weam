"""Notion-related MCP tools."""
from typing import Any, Dict, List, Optional
import httpx
import json
from src.logger.default_logger import logger
import os

NOTION_API_BASE = os.environ.get("NOTION_API_BASE", "https://api.notion.com")

async def make_notion_request(endpoint: str, api_key: str, params: dict = None, json_data: dict = None, method: str = "GET") -> dict[str, Any] | None:
    """Make a request to the Notion API with proper error handling."""
    logger.debug(f"Making {method} request to Notion API: {endpoint}")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": "2022-06-28",  # Using a default version, can be made configurable
        "Content-Type": "application/json"
    }
    url = f"{NOTION_API_BASE}{endpoint}"
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params, timeout=30.0)
            else:  # POST, PATCH, DELETE
                response = await client.request(method, url, headers=headers, json=json_data, timeout=30.0)
            
            response.raise_for_status()
            logger.debug(f"Successfully received response from Notion API: {endpoint}")
            return response.json()
            
        except Exception as e:
            logger.error(f"Error making request to Notion API: {endpoint} - Error: {str(e)}")
            return None

# =============================================================================
# SEARCH FUNCTIONS
# =============================================================================
async def get_databases_id(api_key: str,  query: str = None, sort: Dict[str, Any] = None, 
                       filter_params: Dict[str, Any] = None, start_cursor: str = None, 
                       page_size: int = 100) -> str:
    logger.info(f"Searching Notion with query: {query}")
    
    json_data = {}
    if query:
        json_data["query"] = query
    if sort:
        json_data["sort"] = sort
    if filter_params:
        json_data["filter"] = filter_params
    if start_cursor:
        json_data["start_cursor"] = start_cursor
    if page_size:
        json_data["page_size"] = min(page_size, 100)  # Enforce maximum limit
    
    data = await make_notion_request("/v1/search", api_key, json_data=json_data, method="POST")
    
    if not data:
        logger.warning("Failed to search Notion")
        return "Failed to search Notion"
    
    results = data.get("results", [])
    if not results:
        logger.info("No results found")
        return "No results found in Notion"
    
    formatted_results = []
    for result in results:
        object_type = result.get("object")
        result_id = result.get("id")
        
        if object_type == "page":
            title = "Untitled"
            properties = result.get("properties", {})
            
            # Try to find a title property
            for prop in properties.values():
                if prop.get("type") == "title":
                    title_parts = prop.get("title", [])
                    title = "".join([part.get("plain_text", "") for part in title_parts])
                    break
            
            result_info = f"""
            Type: Page
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            Last Edited: {result.get('last_edited_time', 'Unknown')}
            """
        
        elif object_type == "database":
            title = "Untitled Database"
            title_parts = result.get("title", [])
            if title_parts:
                title = "".join([part.get("plain_text", "") for part in title_parts])
            
            result_info = f"""
            Type: Database
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            """
        
        elif object_type == "block":
            block_type = next(iter(result.get(result.get("type", {}), {})), "Unknown")
            result_info = f"""
            Type: Block ({block_type})
            ID: {result_id}
            """
        
        else:
            result_info = f"""
            Type: {object_type}
            ID: {result_id}
            """
        
        formatted_results.append(result_info)
    
    has_more = data.get("has_more", False)
    next_cursor = data.get("next_cursor", None)
    pagination_info = f"\n\nHas more results: {'Yes' if has_more else 'No'}"
    if next_cursor:
        pagination_info += f"\nNext cursor: {next_cursor}"
    
    logger.info(f"Returning {len(results)} search results")
    return "\n---\n".join(formatted_results) + pagination_info

async def get_pages_id(api_key: str,  query: str = None, sort: Dict[str, Any] = None, 
                       filter_params: Dict[str, Any] = None, start_cursor: str = None, 
                       page_size: int = 100) -> str:
    logger.info(f"Searching Notion with query: {query}")
    
    json_data = {}
    if query:
        json_data["query"] = query
    if sort:
        json_data["sort"] = sort
    if filter_params:
        json_data["filter"] = filter_params
    if start_cursor:
        json_data["start_cursor"] = start_cursor
    if page_size:
        json_data["page_size"] = min(page_size, 100)  # Enforce maximum limit
    
    data = await make_notion_request("/v1/search", api_key, json_data=json_data, method="POST")
    
    if not data:
        logger.warning("Failed to search Notion")
        return "Failed to search Notion"
    
    results = data.get("results", [])
    if not results:
        logger.info("No results found")
        return "No results found in Notion"
    
    formatted_results = []
    for result in results:
        object_type = result.get("object")
        result_id = result.get("id")
        
        if object_type == "page":
            title = "Untitled"
            properties = result.get("properties", {})
            
            # Try to find a title property
            for prop in properties.values():
                if prop.get("type") == "title":
                    title_parts = prop.get("title", [])
                    title = "".join([part.get("plain_text", "") for part in title_parts])
                    break
            
            result_info = f"""
            Type: Page
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            Last Edited: {result.get('last_edited_time', 'Unknown')}
            """
        
        elif object_type == "database":
            title = "Untitled Database"
            title_parts = result.get("title", [])
            if title_parts:
                title = "".join([part.get("plain_text", "") for part in title_parts])
            
            result_info = f"""
            Type: Database
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            """
        
        elif object_type == "block":
            block_type = next(iter(result.get(result.get("type", {}), {})), "Unknown")
            result_info = f"""
            Type: Block ({block_type})
            ID: {result_id}
            """
        
        else:
            result_info = f"""
            Type: {object_type}
            ID: {result_id}
            """
        
        formatted_results.append(result_info)
    
    has_more = data.get("has_more", False)
    next_cursor = data.get("next_cursor", None)
    pagination_info = f"\n\nHas more results: {'Yes' if has_more else 'No'}"
    if next_cursor:
        pagination_info += f"\nNext cursor: {next_cursor}"
    
    logger.info(f"Returning {len(results)} search results")
    return "\n---\n".join(formatted_results) + pagination_info

async def search_notion(api_key: str, query: str = None, sort: Dict[str, Any] = None, 
                       filter_params: Dict[str, Any] = None, start_cursor: str = None, 
                       page_size: int = 100) -> str:
    """Search for objects in Notion.

    Args:
        api_key: Notion API key
        query: Search query string
        sort: Sort criteria
        filter_params: Filter criteria
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)

    Returns:
        Formatted string containing search results
    """
    logger.info(f"Searching Notion with query: {query}")
    
    json_data = {}
    if query:
        json_data["query"] = query
    if sort:
        json_data["sort"] = sort
    if filter_params:
        json_data["filter"] = filter_params
    if start_cursor:
        json_data["start_cursor"] = start_cursor
    if page_size:
        json_data["page_size"] = min(page_size, 100)  # Enforce maximum limit
    
    data = await make_notion_request("/v1/search", api_key, json_data=json_data, method="POST")
    
    if not data:
        logger.warning("Failed to search Notion")
        return "Failed to search Notion"
    
    results = data.get("results", [])
    if not results:
        logger.info("No results found")
        return "No results found in Notion"
    
    formatted_results = []
    for result in results:
        object_type = result.get("object")
        result_id = result.get("id")
        
        if object_type == "page":
            title = "Untitled"
            properties = result.get("properties", {})
            
            # Try to find a title property
            for prop in properties.values():
                if prop.get("type") == "title":
                    title_parts = prop.get("title", [])
                    title = "".join([part.get("plain_text", "") for part in title_parts])
                    break
            
            result_info = f"""
            Type: Page
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            Last Edited: {result.get('last_edited_time', 'Unknown')}
            """
        
        elif object_type == "database":
            title = "Untitled Database"
            title_parts = result.get("title", [])
            if title_parts:
                title = "".join([part.get("plain_text", "") for part in title_parts])
            
            result_info = f"""
            Type: Database
            ID: {result_id}
            Title: {title}
            URL: {result.get('url', 'No URL')}
            """
        
        elif object_type == "block":
            block_type = next(iter(result.get(result.get("type", {}), {})), "Unknown")
            result_info = f"""
            Type: Block ({block_type})
            ID: {result_id}
            """
        
        else:
            result_info = f"""
            Type: {object_type}
            ID: {result_id}
            """
        
        formatted_results.append(result_info)
    
    has_more = data.get("has_more", False)
    next_cursor = data.get("next_cursor", None)
    pagination_info = f"\n\nHas more results: {'Yes' if has_more else 'No'}"
    if next_cursor:
        pagination_info += f"\nNext cursor: {next_cursor}"
    
    logger.info(f"Returning {len(results)} search results")
    return "\n---\n".join(formatted_results) + pagination_info

# =============================================================================
# PAGE FUNCTIONS
# =============================================================================

async def get_notion_page(api_key: str, page_id: str) -> str:
    """Get a Notion page by ID.

    Args:
        api_key: Notion API key
        page_id: ID of the page to retrieve

    Returns:
        Formatted string containing page information
    """
    logger.info(f"Getting Notion page: {page_id}")
    
    
    data = await make_notion_request(f"/v1/pages/{page_id}", api_key)
    
    if not data:
        logger.warning(f"Failed to get page: {page_id}")
        return f"Failed to get page: {page_id}"
    
    # Extract basic page information
    page_info = f"""
    Page ID: {data.get('id', 'Unknown')}
    URL: {data.get('url', 'No URL')}
    Created Time: {data.get('created_time', 'Unknown')}
    Last Edited Time: {data.get('last_edited_time', 'Unknown')}
    Archived: {'Yes' if data.get('archived', False) else 'No'}
    """
    
    # Extract properties
    properties = data.get("properties", {})
    if properties:
        page_info += "\nProperties:\n"
        for prop_name, prop_data in properties.items():
            prop_type = prop_data.get("type")
            prop_value = "Empty"
            
            if prop_type == "title":
                title_parts = prop_data.get("title", [])
                prop_value = "".join([part.get("plain_text", "") for part in title_parts])
            
            elif prop_type == "rich_text":
                text_parts = prop_data.get("rich_text", [])
                prop_value = "".join([part.get("plain_text", "") for part in text_parts])
            
            elif prop_type == "number":
                prop_value = str(prop_data.get("number", "0"))
            
            elif prop_type == "select":
                select_data = prop_data.get("select", {})
                if select_data:
                    prop_value = select_data.get("name", "None")
            
            elif prop_type == "multi_select":
                multi_select = prop_data.get("multi_select", [])
                prop_value = ", ".join([item.get("name", "") for item in multi_select])
            
            elif prop_type == "date":
                date_data = prop_data.get("date", {})
                if date_data:
                    start = date_data.get("start", "No date")
                    end = date_data.get("end", None)
                    prop_value = start if not end else f"{start} to {end}"
            
            elif prop_type == "checkbox":
                prop_value = "Checked" if prop_data.get("checkbox", False) else "Unchecked"
            
            elif prop_type == "url":
                prop_value = prop_data.get("url", "No URL")
            
            elif prop_type == "email":
                prop_value = prop_data.get("email", "No email")
            
            elif prop_type == "phone_number":
                prop_value = prop_data.get("phone_number", "No phone number")
            
            page_info += f"    {prop_name}: {prop_value} ({prop_type})\n"
    
    logger.info(f"Successfully retrieved page: {page_id}")
    return page_info

async def update_notion_database(api_key: str, database_id: str,
                                 title: Optional[list] = None,
                                 description: Optional[list] = None,
                                 properties: Optional[Dict[str, Any]] = None) -> str:
    """
    Update a Notion database's metadata such as title, description, and properties.

    Args:
        api_key: Notion API key
        database_id: The ID of the database to update
        title: A list of rich text objects for the title
        description: A list of rich text objects for the description
        properties: The updated or added database properties

    Returns:
        Formatted string containing update result
    """

    logger.info(f"Updating Notion database: {database_id}")

    json_data: Dict[str, Any] = {}

    if title:
        json_data["title"] = title
    if description:
        json_data["description"] = description
    if properties:
        json_data["properties"] = properties

    if not json_data:
        return "No update data provided for the database."

    data = await make_notion_request(
        f"/v1/databases/{database_id}",
        api_key,
        json_data=json_data,
        method="PATCH"
    )

    if not data:
        logger.warning(f"Failed to update database: {database_id}")
        return f"Failed to update database: {database_id}"

    updated_id = data.get("id")
    logger.info(f"Successfully updated database: {updated_id}")
    return f"Database updated successfully!\nID: {updated_id}"

async def create_notion_page(api_key: str, parent_id: str, parent_type: str = "database_id", 
                           properties: Dict[str, Any] = None, content: List[Dict[str, Any]] = None) -> str:
    """Create a new page in Notion.

    Args:
        api_key: Notion API key
        parent_id: ID of the parent (database or page)
        parent_type: Type of parent ('database_id' or 'page_id')
        properties: Page properties (required for database pages)
        content: Content blocks for the page

    Returns:
        Formatted string containing created page information
    """

    logger.info(f"Creating Notion page in {parent_type}: {parent_id}")
    
    # Clean the parent ID if it contains hyphens or has a URL format
    
    if parent_type not in ["database_id", "page_id"]:
        return f"Invalid parent type: {parent_type}. Must be 'database_id' or 'page_id'."
    
    json_data = {
        "parent": {parent_type: parent_id}
    }
    
    if properties:
        json_data["properties"] = properties
    elif parent_type == "database_id":
        return "Properties are required when creating a page in a database."
    
    if content:
        json_data["children"] = content

    
    data = await make_notion_request("/v1/pages", api_key, json_data=json_data, method="POST")


    if not data:
        logger.warning(f"Failed to create page in {parent_type}: {parent_id}")
        return f"Failed to create page in {parent_type}: {parent_id}"
    
    page_id = data.get("id")
    page_url = data.get("url")
    
    logger.info(f"Successfully created page: {page_id}")
    return f"Page created successfully!\nID: {page_id}\nURL: {page_url}"

async def update_notion_page(api_key: str, page_id: str, properties: Dict[str, Any]) -> str:
    """Update a Notion page's properties.

    Args:
        api_key: Notion API key
        page_id: ID of the page to update
        properties: Updated properties

    Returns:
        Formatted string containing update status
    """
    logger.info(f"Updating Notion page: {page_id}")
    
    
    json_data = {"properties": properties}
    
    data = await make_notion_request(f"/v1/pages/{page_id}", api_key, json_data=json_data, method="PATCH")
    
    if not data:
        logger.warning(f"Failed to update page: {page_id}")
        return f"Failed to update page: {page_id}"
    
    logger.info(f"Successfully updated page: {page_id}")
    return f"Page updated successfully!\nID: {data.get('id')}\nURL: {data.get('url')}"

# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================
async def create_notion_database(api_key: str, parent_id: str, title: List[Dict[str, Any]],
                              properties: Dict[str, Any], parent_type: str = "page_id") -> str:
    """Create a new database in Notion.
    Args:
        api_key: Notion API key
        parent_id: ID of the parent page
        title: Title of database as array of rich text objects
        properties: Property schema of database (required)
        parent_type: Type of parent (defaults to 'page_id')
    Returns:
        Formatted string containing created database information
    """
    logger.info(f"Creating Notion database in {parent_type}: {parent_id}")
    # Clean the parent ID if it contains hyphens or has a URL format
    if parent_type not in ["page_id"]:
        return f"Invalid parent type: {parent_type}. Must be 'page_id' for databases."
    if not title:
        return "Title is required when creating a database."
    if not properties:
        return "Properties are required when creating a database."
    json_data = {
        "parent": {parent_type: parent_id},
        "title": title,
        "properties": properties
    }
    data = await make_notion_request("/v1/databases", api_key, json_data=json_data, method="POST")
    if not data:
        logger.warning(f"Failed to create database in {parent_type}: {parent_id}")
        return f"Failed to create database in {parent_type}: {parent_id}"
    database_id = data.get("id")
    database_url = data.get("url")
    logger.info(f"Successfully created database: {database_id}")
    return f"Database created successfully!\nID: {database_id}\nURL: {database_url}"

async def get_notion_database(api_key: str, database_id: str) -> str:
    """Get a Notion database by ID.

    Args:
        api_key: Notion API key
        database_id: ID of the database to retrieve

    Returns:
        Formatted string containing database information
    """
    logger.info(f"Getting Notion database: {database_id}")
    
    
    data = await make_notion_request(f"/v1/databases/{database_id}", api_key)
    
    if not data:
        logger.warning(f"Failed to get database: {database_id}")
        return f"Failed to get database: {database_id}"
    
    # Extract basic database information
    title = "Untitled Database"
    title_parts = data.get("title", [])
    if title_parts:
        title = "".join([part.get("plain_text", "") for part in title_parts])
    
    db_info = f"""
    Database ID: {data.get('id', 'Unknown')}
    Title: {title}
    URL: {data.get('url', 'No URL')}
    Created Time: {data.get('created_time', 'Unknown')}
    Last Edited Time: {data.get('last_edited_time', 'Unknown')}
    """
    
    # Extract properties schema
    properties = data.get("properties", {})
    if properties:
        db_info += "\nProperties Schema:\n"
        for prop_name, prop_data in properties.items():
            prop_type = prop_data.get("type")
            db_info += f"    {prop_name}: {prop_type}\n"
    
    logger.info(f"Successfully retrieved database: {database_id}")
    return db_info

async def query_notion_database(api_key: str, database_id: str, filter_params: Dict[str, Any] = None, 
                              sorts: List[Dict[str, Any]] = None, start_cursor: str = None, 
                              page_size: int = 100) -> str:
    """Query a Notion database.

    Args:
        api_key: Notion API key
        database_id: ID of the database to query
        filter_params: Filter criteria
        sorts: Sort criteria
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)

    Returns:
        Formatted string containing query results
    """
    logger.info(f"Querying Notion database: {database_id}")
    
    
    json_data = {}
    if filter_params:
        json_data["filter"] = filter_params
    if sorts:
        json_data["sorts"] = sorts
    if start_cursor:
        json_data["start_cursor"] = start_cursor
    if page_size:
        json_data["page_size"] = min(page_size, 100)  # Enforce maximum limit
    
    data = await make_notion_request(f"/v1/databases/{database_id}/query", api_key, json_data=json_data, method="POST")
    
    if not data:
        logger.warning(f"Failed to query database: {database_id}")
        return f"Failed to query database: {database_id}"
    
    results = data.get("results", [])
    if not results:
        logger.info("No results found in database query")
        return "No results found in database query"
    
    formatted_results = []
    for page in results:
        page_id = page.get("id")
        properties = page.get("properties", {})
        
        # Try to find a title property for the page name
        page_name = "Untitled"
        for prop in properties.values():
            if prop.get("type") == "title":
                title_parts = prop.get("title", [])
                page_name = "".join([part.get("plain_text", "") for part in title_parts])
                break
        
        page_info = f"""
        Page: {page_name}
        ID: {page_id}
        URL: {page.get('url', 'No URL')}
        Last Edited: {page.get('last_edited_time', 'Unknown')}
        Properties:
        """
        
        # Add key properties (limit to avoid too much data)
        prop_count = 0
        for prop_name, prop_data in properties.items():
            if prop_count >= 5:  # Limit to 5 properties per page in results
                page_info += "        ... (more properties available)\n"
                break
                
            prop_type = prop_data.get("type")
            prop_value = "Empty"
            
            # Extract property value based on type (similar to get_notion_page)
            if prop_type == "title":
                title_parts = prop_data.get("title", [])
                prop_value = "".join([part.get("plain_text", "") for part in title_parts])
            elif prop_type == "rich_text":
                text_parts = prop_data.get("rich_text", [])
                prop_value = "".join([part.get("plain_text", "") for part in text_parts])
            elif prop_type == "number":
                prop_value = str(prop_data.get("number", "0"))
            elif prop_type == "select":
                select_data = prop_data.get("select", {})
                prop_value = select_data.get("name", "None") if select_data else "None"
            elif prop_type == "multi_select":
                multi_select = prop_data.get("multi_select", [])
                prop_value = ", ".join([item.get("name", "") for item in multi_select])
            elif prop_type == "date":
                date_data = prop_data.get("date", {})
                start = date_data.get("start", "No date") if date_data else "No date"
                end = date_data.get("end", None) if date_data else None
                prop_value = start if not end else f"{start} to {end}"
            elif prop_type == "checkbox":
                prop_value = "Checked" if prop_data.get("checkbox", False) else "Unchecked"
            
            page_info += f"        {prop_name}: {prop_value}\n"
            prop_count += 1
        
        formatted_results.append(page_info)
    
    has_more = data.get("has_more", False)
    next_cursor = data.get("next_cursor", None)
    pagination_info = f"\n\nResults: {len(results)}\nHas more results: {'Yes' if has_more else 'No'}"
    if next_cursor:
        pagination_info += f"\nNext cursor: {next_cursor}"
    
    logger.info(f"Returning {len(results)} database query results")
    return "\n---\n".join(formatted_results) + pagination_info

# =============================================================================
# BLOCK FUNCTIONS
# =============================================================================

async def get_notion_block(api_key: str, block_id: str) -> str:
    """Get a Notion block by ID.

    Args:
        api_key: Notion API key
        block_id: ID of the block to retrieve

    Returns:
        Formatted string containing block information
    """
    logger.info(f"Getting Notion block: {block_id}")
    
    
    data = await make_notion_request(f"/v1/blocks/{block_id}", api_key)
    
    if not data:
        logger.warning(f"Failed to get block: {block_id}")
        return f"Failed to get block: {block_id}"
    
    block_type = data.get("type")
    block_content = data.get(block_type, {})
    
    # Extract text content if available
    text_content = ""
    if block_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "toggle", "quote", "callout"]:
        rich_text = block_content.get("rich_text", [])
        text_content = "".join([text.get("plain_text", "") for text in rich_text])
    
    block_info = f"""
    Block ID: {data.get('id', 'Unknown')}
    Type: {block_type}
    Created Time: {data.get('created_time', 'Unknown')}
    Last Edited Time: {data.get('last_edited_time', 'Unknown')}
    Has Children: {'Yes' if data.get('has_children', False) else 'No'}
    """
    
    if text_content:
        block_info += f"\nContent: {text_content}"
    
    logger.info(f"Successfully retrieved block: {block_id}")
    return block_info

async def get_block_children(api_key: str, block_id: str, start_cursor: str = None, page_size: int = 100) -> str:
    """Get children blocks of a parent block.

    Args:
        api_key: Notion API key
        block_id: ID of the parent block
        start_cursor: Pagination cursor
        page_size: Number of results per page (max 100)

    Returns:
        Formatted string containing children blocks
    """
    logger.info(f"Getting children of block: {block_id}")
    
    
    params = {}
    if start_cursor:
        params["start_cursor"] = start_cursor
    if page_size:
        params["page_size"] = min(page_size, 100)  # Enforce maximum limit
    
    data = await make_notion_request(f"/v1/blocks/{block_id}/children", api_key, params=params)
    
    if not data:
        logger.warning(f"Failed to get children of block: {block_id}")
        return f"Failed to get children of block: {block_id}"
    
    results = data.get("results", [])
    if not results:
        logger.info("No children blocks found")
        return "No children blocks found"
    
    formatted_results = []
    for block in results:
        block_id = block.get("id")
        block_type = block.get("type")
        
        # Extract text content if available
        text_content = ""
        block_content = block.get(block_type, {})
        if block_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "toggle", "quote", "callout"]:
            rich_text = block_content.get("rich_text", [])
            text_content = "".join([text.get("plain_text", "") for text in rich_text])
        
        block_info = f"""
        Block ID: {block_id}
        Type: {block_type}
        Has Children: {'Yes' if block.get('has_children', False) else 'No'}
        """
        
        if text_content:
            block_info += f"Content: {text_content}\n"
        
        formatted_results.append(block_info)
    
    has_more = data.get("has_more", False)
    next_cursor = data.get("next_cursor", None)
    pagination_info = f"\n\nResults: {len(results)}\nHas more results: {'Yes' if has_more else 'No'}"
    if next_cursor:
        pagination_info += f"\nNext cursor: {next_cursor}"
    
    logger.info(f"Returning {len(results)} children blocks")
    return "\n---\n".join(formatted_results) + pagination_info

async def append_notion_blocks(api_key: str, block_id: str, blocks: List[Dict[str, Any]]) -> str:
    """Append blocks to a parent block.

    Args:
        api_key: Notion API key
        block_id: ID of the parent block
        blocks: List of block objects to append

    Returns:
        Formatted string containing append status
    """
    logger.info(f"Appending blocks to: {block_id}")
    
    json_data = {"children": blocks}
    
    data = await make_notion_request(f"/v1/blocks/{block_id}/children", api_key, json_data=json_data, method="PATCH")
    
    if not data:
        logger.warning(f"Failed to append blocks to: {block_id}")
        return f"Failed to append blocks to: {block_id}"
    
    results = data.get("results", [])
    
    logger.info(f"Successfully appended {len(results)} blocks to: {block_id}")
    return f"Successfully appended {len(results)} blocks"

# =============================================================================
# COMMENT FUNCTIONS
# =============================================================================

async def create_notion_comment(api_key: str, parent_id: str, parent_type: str, comment_text: str, 
                              discussion_id: str = None) -> str:
    """Create a comment on a page or block.

    Args:
        api_key: Notion API key
        parent_id: ID of the parent (page or block)
        parent_type: Type of parent ('page_id' or 'block_id')
        comment_text: Text content of the comment
        discussion_id: Optional ID of an existing discussion thread

    Returns:
        Formatted string containing comment creation status
    """
    logger.info(f"Creating comment on {parent_type}: {parent_id}")
    
    if parent_type not in ["page_id", "block_id"]:
        return f"Invalid parent type: {parent_type}. Must be 'page_id' or 'block_id'."
    
    # Prepare rich text for comment
    rich_text = [{
        "type": "text",
        "text": {"content": comment_text}
    }]
    
    json_data = {
        "parent": {parent_type: parent_id},
        "rich_text": rich_text
    }
    
    if discussion_id:
        json_data["discussion_id"] = discussion_id
    
    data = await make_notion_request("/v1/comments", api_key, json_data=json_data, method="POST")
    
    if not data:
        logger.warning(f"Failed to create comment on {parent_type}: {parent_id}")
        return f"Failed to create comment on {parent_type}: {parent_id}"
    
    comment_id = data.get("id")
    
    logger.info(f"Successfully created comment: {comment_id}")
    return f"Comment created successfully!\nID: {comment_id}"

async def get_notion_comment(api_key: str, comment_id: str) -> str:
    """Get a comment by ID.

    Args:
        api_key: Notion API key
        comment_id: ID of the comment to retrieve

    Returns:
        Formatted string containing comment information
    """
    logger.info(f"Getting comment: {comment_id}")
    
    data = await make_notion_request(f"/v1/comments/{comment_id}", api_key)
    
    if not data:
        logger.warning(f"Failed to get comment: {comment_id}")
        return f"Failed to get comment: {comment_id}"
    
    # Extract comment text
    rich_text = data.get("rich_text", [])
    comment_text = "".join([text.get("plain_text", "") for text in rich_text])
    
    # Get parent information
    parent = data.get("parent", {})
    parent_type = next(iter(parent.keys()), "Unknown")
    parent_id = parent.get(parent_type, "Unknown")
    
    comment_info = f"""
    Comment ID: {data.get('id', 'Unknown')}
    Parent Type: {parent_type}
    Parent ID: {parent_id}
    Created Time: {data.get('created_time', 'Unknown')}
    Last Edited Time: {data.get('last_edited_time', 'Unknown')}
    Discussion ID: {data.get('discussion_id', 'None')}
    Text: {comment_text}
    """
    
    logger.info(f"Successfully retrieved comment: {comment_id}")
    return comment_info