const SOLUTION_CONFIGS = {
    'ai-docs': {
        repoUrl: 'https://github.com/weam-ai/ai-docs.git',
        repoName: 'ai-docs',
        imageName: ['ai-doc-editor-img'],
        containerName: ['ai-doc-editor-container'],
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
    'ai-landing-page-generator': {
        repoUrl: 'https://github.com/weam-ai/landing-page-content-generator.git',
        repoName: 'landing-page-content-generator',
        imageName: ['landing-page-content-generator-frontend','landing-page-content-generator-backend'],
        containerName: ['landing-page-frontend','landing-page-backend'],
        branchName: 'devops',
        envFile: 'example.env'
    },
    'blog-engine': {
        repoUrl: 'https://github.com/weam-ai/Blog-Engine.git',
        repoName: 'blog-engine',
        imageName: ['blog-engine-frontend','blog-engine-node-backend','blog-engine-backend-python'],
        containerName: ['seo-frontend','seo-node-backend','seo-backend-python'],
        branchName: 'devops',
        envFile: '.env.example'
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