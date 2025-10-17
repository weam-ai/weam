#!/bin/bash

echo "Setting up Ollama integration for Weam..."

if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Please install Ollama first:"
    echo "   Visit: https://ollama.ai/download"
    exit 1
fi

echo "Ollama is installed"

if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "Ollama service is not running. Starting Ollama..."
    ollama serve &
    sleep 5
    
    if ! curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "Failed to start Ollama service"
        exit 1
    fi
fi

echo "Ollama service is running"

pull_model() {
    local model=$1
    echo "Pulling model: $model"
    ollama pull "$model"
    if [ $? -eq 0 ]; then
        echo "Successfully pulled $model"
    else
        echo "Failed to pull $model"
    fi
}

echo "Pulling recommended models..."

pull_model "llama3.1:8b"
pull_model "llama3:8b"
pull_model "mistral:7b-instruct"

read -p "Do you want to install specialized models? (y/n): " install_specialized
if [[ $install_specialized =~ ^[Yy]$ ]]; then
    pull_model "codellama:7b"
    pull_model "phi3:mini"
fi

read -p "Do you want to install embedding models for RAG? (y/n): " install_embeddings
if [[ $install_embeddings =~ ^[Yy]$ ]]; then
    pull_model "nomic-embed-text"
    pull_model "mxbai-embed-large"
fi

echo "Testing Ollama integration..."
curl -s -X GET "http://localhost:11434/api/tags" | jq '.' > /dev/null
if [ $? -eq 0 ]; then
    echo "Ollama API is working correctly"
else
    echo "Ollama API test failed"
fi

echo "Installed models:"
ollama list

echo ""
echo "Ollama setup complete!"
echo ""
echo "Next steps:"
echo "   1. Update your .env file with OLLAMA_URL=http://localhost:11434"
echo "   2. Restart your Weam Node.js server"
echo "   3. Configure company Ollama settings via the admin panel"
echo "   4. Test the integration using the API endpoints"
echo ""
echo "For detailed documentation, see: OLLAMA_INTEGRATION.md"
