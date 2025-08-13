import sys
import os
from dotenv import load_dotenv

# Add the src directory to the sys.path
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

# Load environment variables from .env_local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env_enterprise_local'))

print("Environment variables loaded from .env_enterprise_local")