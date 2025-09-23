const SOLUTION_CONFIGS = {
    'ai-doc-editor': {
        repoUrl: 'https://github.com/devweam-ai/ai-doc-editor.git',
        repoName: 'ai-doc-editor',
        imageName: 'ai-doc-editor-img',
        containerName: 'ai-doc-editor-container',
        port: '3002',
        branchName: 'main',
        installType: 'docker-compose', // docker or docker-compose
        envFile: 'env.example'
    },
    'ai-recruiter': {
        repoUrl: 'https://github.com/devweam-ai/foloup.git',
        repoName: 'foloup',
        imageName: 'foloup-img',
        containerName: 'foloup-container',
        port: '4000',
        branchName: 'main',
        installType: 'docker-compose', // docker or docker-compose
        envFile: '.env.example', // Has .env.example file that needs to be converted to .env
        additionalPorts: [] // No additional ports specified
    },
    'ai-landing-page-generator': {
        repoUrl: 'https://github.com/devweam-ai/landing-page-content-generator.git',
        repoName: 'landing-page-content-generator',
        imageName: 'landing-page-content-generator-img',
        containerName: 'landing-page-content-generator-container',
        port: '4001',
        branchName: 'devops',
        installType: 'docker-compose', // docker or docker-compose
        envFile: 'example.env', // Has .env.example file that needs to be converted to .env
        additionalPorts: [] // No additional ports specified
    },
    'seo-content-gen': {
        repoUrl: 'https://github.com/devweam-ai/seo-content-gen.git',
        repoName: 'seo-content-gen',
        imageName: 'seo-content-gen-img',
        containerName: 'seo-content-gen-container',
        port: '3001',
        branchName: 'devops',
        installType: 'docker-compose', // docker or docker-compose
        envFile: '.env.example', // No env file needed for docker-compose
        additionalPorts: ['3001', '9002', '3003'] // Additional ports for docker-compose services
    },
};

module.exports = SOLUTION_CONFIGS;