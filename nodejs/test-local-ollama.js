const axios = require('axios');

async function testLocalOllamaChat() {
    const OLLAMA_URL = 'http://localhost:11434';
    
    console.log('Testing local Ollama chat functionality...\n');
    
    try {
        console.log('1. Testing Ollama connection...');
        const connectResponse = await axios.get(`${OLLAMA_URL}/api/tags`);
        console.log('   Connection successful');
        
        const models = connectResponse.data.models || [];
        if (models.length === 0) {
            console.log('   No models found. Please install at least one model:');
            console.log('   ollama pull llama3.1:8b');
            return;
        }
        
        const testModel = models[0].name;
        console.log(`   Found ${models.length} models. Testing with: ${testModel}`);
        
        console.log('\n2. Testing chat functionality...');
        const chatResponse = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: testModel,
            messages: [
                {
                    role: 'user',
                    content: 'Say "Hello from Ollama!" and nothing else.'
                }
            ],
            stream: false
        });
        
        const responseText = chatResponse.data.message?.content || 'No response';
        console.log(`   Model response: ${responseText}`);
        
        console.log('\n3. Testing generate functionality...');
        const generateResponse = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: testModel,
            prompt: 'Complete this sentence: "Ollama is working"',
            stream: false
        });
        
        const generateText = generateResponse.data.response || 'No response';
        console.log(`   Generate response: ${generateText}`);
        
        console.log('\nSUCCESS: Local Ollama is working correctly!');
        console.log('\nTo use with Weam:');
        console.log('1. Ensure your .env has: OLLAMA_URL=http://localhost:11434');
        console.log('2. Start your Weam server');
        console.log('3. Use the Ollama models in chat');
        
    } catch (error) {
        console.log('ERROR: Failed to connect to local Ollama');
        console.log(`Details: ${error.message}`);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure Ollama is installed: https://ollama.ai/download');
        console.log('2. Start Ollama service: ollama serve');
        console.log('3. Install a model: ollama pull llama3.1:8b');
        console.log('4. Check if port 11434 is available');
    }
}

if (require.main === module) {
    testLocalOllamaChat();
}

module.exports = testLocalOllamaChat;
