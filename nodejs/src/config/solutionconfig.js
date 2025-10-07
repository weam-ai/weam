const SOLUTION_CONFIGS = {
    'ai-doc-editor': {
        repoUrl: 'https://github.com/weam-ai/ai-doc-editor.git',
        repoName: 'ai-doc-editor',
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
    'seo-content-gen': {
        repoUrl: 'https://github.com/weam-ai/seo-content-gen.git',
        repoName: 'seo-content-gen',
        imageName: ['seo-content-gen-frontend','seo-content-gen-node-backend','seo-content-gen-backend-python'],
        containerName: ['seo-frontend','seo-node-backend','seo-backend-python'],
        branchName: 'devops',
        envFile: '.env.example'
    },
};

module.exports = SOLUTION_CONFIGS;