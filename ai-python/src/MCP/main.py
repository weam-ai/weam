# from server import mcp
from src.MCP.server import mcp
from importlib import import_module
def main():
    tool_imports = {
        'gmail': lambda: import_module('src.MCP.google.gmail.gmail_tools'),
        'drive': lambda: import_module('src.MCP.google.gdrive.drive_tools'),
        'calendar': lambda: import_module('src.MCP.google.gcalendar.calendar_tools'),
    }
    tool_icons = {
        'gmail': '📧',
        'drive': '📁',
        'calendar': '📅',
    }
    for tool in tool_imports.keys():
        tool_imports[tool]()
    mcp.run(transport='sse')
    

if __name__ == "__main__":
    # Initialize and run the server
    main()