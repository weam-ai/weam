const axios = require('axios');

const TEST_CONFIG = {
    baseUrl: 'http://localhost:3000/api',
    token: null,
    ollamaUrl: 'http://localhost:11434'
};

class OllamaIntegrationTest {
    constructor() {
        this.results = [];
    }

    async runAllTests() {
        console.log('Starting Ollama Integration Tests...\n');

        await this.testOllamaConnection();
        await this.testListModels();
        await this.testRecommendedModels();
        await this.testModelDetails();
        await this.testChatEndpoint();
        await this.testGenerateEndpoint();
        await this.testEmbeddings();
        await this.testSettings();
        await this.testAnalytics();

        this.printResults();
    }

    async testOllamaConnection() {
        try {
            const response = await axios.get(`${TEST_CONFIG.ollamaUrl}/api/tags`);
            this.logTest('Ollama Connection', true, 'Direct connection successful');
        } catch (error) {
            this.logTest('Ollama Connection', false, `Connection failed: ${error.message}`);
        }
    }

    async testListModels() {
        try {
            const response = await this.makeRequest('GET', '/ollama/tags');
            const hasModels = response.data.models && response.data.models.length > 0;
            this.logTest('List Models', hasModels, hasModels ? `Found ${response.data.models.length} models` : 'No models found');
        } catch (error) {
            this.logTest('List Models', false, error.message);
        }
    }

    async testRecommendedModels() {
        try {
            const response = await this.makeRequest('GET', '/ollama/recommended');
            const hasRecommended = response.data.models && response.data.models.length > 0;
            this.logTest('Recommended Models', hasRecommended, hasRecommended ? `${response.data.models.length} recommended models` : 'No recommended models');
        } catch (error) {
            this.logTest('Recommended Models', false, error.message);
        }
    }

    async testModelDetails() {
        try {
            const response = await this.makeRequest('GET', '/ollama/model/llama3.1:8b');
            const hasDetails = response.data.details !== undefined;
            this.logTest('Model Details', hasDetails, hasDetails ? 'Model details retrieved' : 'No model details');
        } catch (error) {
            this.logTest('Model Details', false, error.message);
        }
    }

    async testChatEndpoint() {
        try {
            const response = await this.makeRequest('POST', '/ollama/chat', {
                messages: [
                    { role: 'user', content: 'Hello, respond with just "test successful"' }
                ],
                model: 'llama3.1:8b',
                stream: false
            });
            const isSuccessful = response.data.success && response.data.text;
            this.logTest('Chat Endpoint', isSuccessful, isSuccessful ? 'Chat response received' : 'No chat response');
        } catch (error) {
            this.logTest('Chat Endpoint', false, error.message);
        }
    }

    async testGenerateEndpoint() {
        try {
            const response = await this.makeRequest('POST', '/ollama/generate', {
                prompt: 'Say "generate test successful"',
                model: 'llama3.1:8b',
                stream: false
            });
            const isSuccessful = response.data.success && response.data.text;
            this.logTest('Generate Endpoint', isSuccessful, isSuccessful ? 'Generate response received' : 'No generate response');
        } catch (error) {
            this.logTest('Generate Endpoint', false, error.message);
        }
    }

    async testEmbeddings() {
        try {
            const response = await this.makeRequest('POST', '/ollama/embeddings', {
                input: 'test embedding text',
                model: 'nomic-embed-text'
            });
            const hasEmbeddings = response.data.success && response.data.embeddings;
            this.logTest('Embeddings', hasEmbeddings, hasEmbeddings ? 'Embeddings generated' : 'No embeddings generated');
        } catch (error) {
            this.logTest('Embeddings', false, error.message);
        }
    }

    async testSettings() {
        try {
            const response = await this.makeRequest('GET', '/ollama/settings');
            const hasSettings = response.data.success && response.data.settings;
            this.logTest('Settings', hasSettings, hasSettings ? 'Settings retrieved' : 'No settings found');
        } catch (error) {
            this.logTest('Settings', false, error.message);
        }
    }

    async testAnalytics() {
        try {
            const response = await this.makeRequest('GET', '/ollama/analytics/overview');
            const hasAnalytics = response.data.success && response.data.overview;
            this.logTest('Analytics', hasAnalytics, hasAnalytics ? 'Analytics data retrieved' : 'No analytics data');
        } catch (error) {
            this.logTest('Analytics', false, error.message);
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method,
            url: `${TEST_CONFIG.baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (TEST_CONFIG.token) {
            config.headers['Authorization'] = `Bearer ${TEST_CONFIG.token}`;
        }

        if (data) {
            config.data = data;
        }

        return await axios(config);
    }

    logTest(testName, success, message) {
        const status = success ? 'PASS' : 'FAIL';
        console.log(`${status} ${testName}: ${message}`);
        this.results.push({ testName, success, message });
    }

    printResults() {
        console.log('\nTest Results Summary:');
        console.log('========================');
        
        const passed = this.results.filter(r => r.success).length;
        const total = this.results.length;
        
        console.log(`Passed: ${passed}/${total}`);
        console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);
        
        if (passed === total) {
            console.log('\nAll tests passed! Ollama integration is working correctly.');
        } else {
            console.log('\nSome tests failed. Please check the Ollama setup and authentication.');
            console.log('\nTroubleshooting:');
            console.log('1. Ensure Ollama is running: ollama serve');
            console.log('2. Check if models are installed: ollama list');
            console.log('3. Verify authentication token is set');
            console.log('4. Check server logs for detailed errors');
        }
    }
}

if (require.main === module) {
    const tester = new OllamaIntegrationTest();
    
    console.log('Ollama Integration Test Suite');
    console.log('================================\n');
    
    if (!TEST_CONFIG.token) {
        console.log('Warning: No authentication token set. Some tests may fail.');
        console.log('   Set TEST_CONFIG.token to a valid JWT token for full testing.\n');
    }
    
    tester.runAllTests().catch(console.error);
}

module.exports = OllamaIntegrationTest;
