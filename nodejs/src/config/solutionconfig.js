const SOLUTION_CONFIGS = {
    'ai-docs': {
        repoUrl: 'https://github.com/weam-ai/ai-docs.git',
        repoName: 'ai-docs',
        imageName: ['ai-doc-editor-img'],
        containerName: ['ai-doc-editor-container'],
        branchName: 'main',
        envFile: 'env.example'
    },
    'ai-presentation': {
        repoUrl: 'https://github.com/weam-ai/ai-presentation.git',
        repoName: 'ai-presentation',
        imageName: ['ai-presentation-img'],
        containerName: ['ai-presentation-container'],
        branchName: 'main',
        envFile: 'env.example',
    },
    'ai-content': {
        repoUrl: 'https://github.com/weam-ai/ai-content-copy.git',
        repoName: 'ai-content-copy',
        imageName: ['ai-content-copy-img'],
        containerName: ['ai-content-copy-container'],
        branchName: 'main',
        envFile: 'env.example'
    },
    'ai-recruiter': {
        repoUrl: 'https://github.com/weam-ai/ai-recruiter.git',
        repoName: 'ai-recruiter',
        imageName: ['ai-recruiter-foloup'],
        containerName: ['ai-recruiter-foloup-1'],
        branchName: 'main',
        envFile: '.env.example'
    },
    'page-revamp': {
        repoUrl: 'https://github.com/weam-ai/landing-page-content-generator.git',
        repoName: 'landing-page-content-generator',
        imageName: ['landing-page-content-generator-frontend','landing-page-content-generator-backend'],
        containerName: ['landing-page-frontend','landing-page-backend'],
        branchName: 'devops',
        envFile: 'example.env'
    },
    'call-analyzer': {
        repoUrl: 'https://github.com/weam-ai/call-analyzer.git',
        repoName: 'call-analyzer',
        imageName: ['call-analyzer-backend-img','call-analyzer-frontend-img'],
        containerName: ['call-analyzer-backend-container','call-analyzer-frontend-container'],
        branchName: 'devops',
        envFile: 'example.env'
    },
};

module.exports = SOLUTION_CONFIGS;