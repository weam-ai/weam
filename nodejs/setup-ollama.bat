@echo off
echo Setting up Ollama integration for Weam...

where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo Ollama is not installed. Please install Ollama first:
    echo    Visit: https://ollama.ai/download
    pause
    exit /b 1
)

echo Ollama is installed

curl -s http://localhost:11434/api/tags >nul 2>nul
if %errorlevel% neq 0 (
    echo Ollama service is not running. Starting Ollama...
    start /b ollama serve
    timeout /t 5 /nobreak >nul
    
    curl -s http://localhost:11434/api/tags >nul 2>nul
    if %errorlevel% neq 0 (
        echo Failed to start Ollama service
        pause
        exit /b 1
    )
)

echo Ollama service is running

echo Pulling recommended models...

echo Pulling model: llama3.1:8b
ollama pull llama3.1:8b
if %errorlevel% equ 0 (
    echo Successfully pulled llama3.1:8b
) else (
    echo Failed to pull llama3.1:8b
)

echo Pulling model: llama3:8b
ollama pull llama3:8b
if %errorlevel% equ 0 (
    echo Successfully pulled llama3:8b
) else (
    echo Failed to pull llama3:8b
)

echo Pulling model: mistral:7b-instruct
ollama pull mistral:7b-instruct
if %errorlevel% equ 0 (
    echo Successfully pulled mistral:7b-instruct
) else (
    echo Failed to pull mistral:7b-instruct
)

set /p install_specialized="Do you want to install specialized models? (y/n): "
if /i "%install_specialized%"=="y" (
    echo Pulling model: codellama:7b
    ollama pull codellama:7b
    
    echo Pulling model: phi3:mini
    ollama pull phi3:mini
)

set /p install_embeddings="Do you want to install embedding models for RAG? (y/n): "
if /i "%install_embeddings%"=="y" (
    echo Pulling model: nomic-embed-text
    ollama pull nomic-embed-text
    
    echo Pulling model: mxbai-embed-large
    ollama pull mxbai-embed-large
)

echo Testing Ollama integration...
curl -s -X GET "http://localhost:11434/api/tags" >nul
if %errorlevel% equ 0 (
    echo Ollama API is working correctly
) else (
    echo Ollama API test failed
)

echo.
echo Installed models:
ollama list

echo.
echo Ollama setup complete!
echo.
echo Next steps:
echo    1. Update your .env file with OLLAMA_URL=http://localhost:11434
echo    2. Restart your Weam Node.js server
echo    3. Configure company Ollama settings via the admin panel
echo    4. Test the integration using the API endpoints
echo.
echo For detailed documentation, see: OLLAMA_INTEGRATION.md
echo.
pause
