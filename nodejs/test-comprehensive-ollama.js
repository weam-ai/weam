const axios = require('axios');

async function comprehensiveOllamaTest() {
    console.log('Comprehensive Ollama Integration Test\n');
    console.log('=====================================\n');

    const results = {
        connectivity: false,
        modelsList: false,
        chatFunction: false,
        generateFunction: false,
        weamIntegration: false
    };

    try {
        console.log('1. Testing Ollama connectivity...');
        const connectResponse = await axios.get('http://localhost:11434/api/tags');
        results.connectivity = true;
        console.log('   Ollama is running and accessible');

        const models = connectResponse.data.models || [];
        if (models.length > 0) {
            results.modelsList = true;
            console.log(`   Found ${models.length} installed models:`);
            models.forEach(model => {
                console.log(`     - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);
            });
        } else {
            console.log('   No models installed');
            console.log('     Install a model: ollama pull llama3.1:8b');
            return results;
        }

        const testModel = models[0].name;
        console.log(`\n2. Testing chat with model: ${testModel}`);
        
        try {
            const chatResponse = await axios.post('http://localhost:11434/api/chat', {
                model: testModel,
                messages: [{ role: 'user', content: 'Hello! Respond with just "Chat working"' }],
                stream: false
            });
            
            if (chatResponse.data.message?.content) {
                results.chatFunction = true;
                console.log(`   Chat response: ${chatResponse.data.message.content.substring(0, 50)}...`);
            }
        } catch (error) {
            console.log(`   ✗ Chat failed: ${error.message}`);
        }

        console.log(`\n3. Testing generate with model: ${testModel}`);
        
        try {
            const generateResponse = await axios.post('http://localhost:11434/api/generate', {
                model: testModel,
                prompt: 'Say "Generate working"',
                stream: false
            });
            
            if (generateResponse.data.response) {
                results.generateFunction = true;
                console.log(`   Generate response: ${generateResponse.data.response.substring(0, 50)}...`);
            }
        } catch (error) {
            console.log(`   ✗ Generate failed: ${error.message}`);
        }

        console.log('\n4. Testing Weam integration endpoints...');
        
        try {
            const healthResponse = await axios.get('http://localhost:3000/api/ollama/health');
            if (healthResponse.data.success) {
                results.weamIntegration = true;
                console.log('   Weam Ollama health endpoint working');
                console.log(`   Models available in Weam: ${healthResponse.data.modelCount}`);
            }
        } catch (error) {
            console.log(`   ✗ Weam integration test failed: ${error.message}`);
            console.log('     Make sure your Weam server is running on port 3000');
        }

    } catch (error) {
        console.log(`   ✗ Connection failed: ${error.message}`);
        console.log('\nTroubleshooting:');
        console.log('1. Install Ollama: https://ollama.ai/download');
        console.log('2. Start Ollama: ollama serve');
        console.log('3. Install a model: ollama pull llama3.1:8b');
    }

    console.log('\n=====================================');
    console.log('Test Results Summary:');
    console.log('=====================================');
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? 'PASS' : 'FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`${status} ${testName}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\nSUCCESS: Ollama is fully integrated and working with Weam!');
        console.log('\nYou can now:');
        console.log('- Use Ollama models in Weam chat interface');
        console.log('- Configure company settings for model access');
        console.log('- Monitor usage through analytics endpoints');
    } else {
        console.log('\nSome tests failed. Please review the error messages above.');
    }

    return results;
}

if (require.main === module) {
    comprehensiveOllamaTest().catch(console.error);
}

module.exports = comprehensiveOllamaTest;
