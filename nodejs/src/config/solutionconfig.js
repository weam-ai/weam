const SOLUTION_CONFIGS = {
    'ai-doc-editor': {
        repoUrl: 'https://github.com/weam-ai/ai-doc-editor.git',
        repoName: 'ai-doc-editor',
        imageName: 'ai-doc-editor-img',
        containerName: 'ai-doc-editor-container',
        branchName: 'main',
        envFile: 'env.example'
    },
    'ai-recruiter': {
        repoUrl: 'https://github.com/weam-ai/ai-recruiter.git',
        repoName: 'ai-recruiter',
        imageName: 'ai-recruiter-img',
        containerName: 'ai-recruiter-container',
        branchName: 'main',
        envFile: '.env.example'
    },
    'ai-landing-page-generator': {
        repoUrl: 'https://github.com/weam-ai/landing-page-content-generator.git',
        repoName: 'landing-page-content-generator',
        imageName: 'landing-page-content-generator-img',
        containerName: 'landing-page-content-generator-container',
        branchName: 'devops',
        envFile: 'example.env'
    },
    'seo-content-gen': {
        repoUrl: 'https://github.com/weam-ai/seo-content-gen.git',
        repoName: 'seo-content-gen',
        imageName: 'seo-content-gen-img',
        containerName: 'seo-content-gen-container',
        branchName: 'devops',
        envFile: '.env.example'
    },
};

module.exports = SOLUTION_CONFIGS;