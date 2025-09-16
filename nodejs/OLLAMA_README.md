# Ollama Integration for Weam

## Quick Setup

1. **Install Ollama**
   - Download from: https://ollama.ai/download
   - Install for your operating system

2. **Start Ollama Service**
   ```bash
   ollama serve
   ```

3. **Install Models**
   ```bash
   ollama pull llama3.1:8b
   ollama pull mistral:7b-instruct
   ```

4. **Configure Environment**
   Create a `.env` file in the nodejs directory:
   ```
   OLLAMA_URL=http://localhost:11434
   OLLAMA_FALLBACK_ENABLED=true
   ```

5. **Test Integration**
   ```bash
   npm run validate-ollama
   npm run test-ollama
   npm run test-ollama-full
   ```

6. **Start Weam Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Chat with Ollama Models
```bash
POST /api/ollama/chat
{
  "messages": [{"role": "user", "content": "Hello"}],
  "model": "llama3.1:8b"
}
```

### Generate Text
```bash
POST /api/ollama/generate
{
  "prompt": "Write a story about",
  "model": "llama3.1:8b"
}
```

### List Available Models
```bash
GET /api/ollama/tags
```

### Health Check (No Auth Required)
```bash
GET /api/ollama/health
```

## Using in Weam

1. **Chat Interface**: Select Ollama models from the model dropdown
2. **Document Q&A**: Use local models for private document analysis
3. **Prompts & Agents**: Create bots that use specific Ollama models
4. **Admin Panel**: Configure allowed models and team permissions

## Troubleshooting

**Connection Failed**
- Ensure Ollama is running: `ollama serve`
- Check if models are installed: `ollama list`
- Verify port 11434 is available

**No Models Available**
- Install at least one model: `ollama pull llama3.1:8b`
- Check company settings for allowed models

**Permission Denied**
- Verify user has proper permissions
- Check company Ollama settings
- Ensure user is authenticated

## Model Recommendations

- **llama3.1:8b**: Best overall performance
- **mistral:7b-instruct**: Good for following instructions
- **phi3:mini**: Lightweight option for limited resources
- **codellama:7b**: Specialized for code generation

## Support

Run the validation and test scripts to diagnose issues:
```bash
npm run validate-ollama
npm run test-ollama-full
```
