const solutionInstallService = require('../../services/solutionInstall');
const { catchAsync } = require('../../utils/helper');
const jwt = require('jsonwebtoken');
const { JWT_STRING } = require('../../config/constants/common');
const { AUTH } = require('../../config/config');
const User = require('../../models/user');
const Role = require('../../models/role');
const Company = require('../../models/company');
const SOLUTION_CONFIGS = require('../../config/solutionconfig');

const getInstallationProgress = catchAsync(async (req, res) => {
    // No token authentication required - simple approach

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to installation progress stream' 
    })}\n\n`);

    // Start the installation process
    try {
        // Get solution type from query parameter
        let solutionType = req.query.solutionType || '';
        
        // Add this check:
        if (!solutionType) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Solution type is required' 
            })}\n\n`);
            res.end();
            return;
        }
        console.log('Backend received solutionType:', solutionType);
        
        req.body = { solutionType }; // Pass solution type to service
        await solutionInstallService.installWithProgress(req, res);
        
        // Close the connection after installation completes
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message || 'Installation failed' 
        })}\n\n`);
        res.end();
    }
});

const getUninstallationProgress = catchAsync(async (req, res) => {
    // No token authentication required - simple approach

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to uninstallation progress stream' 
    })}\n\n`);

    // Start the uninstallation process
    try {
        // Get solution type from query parameter
        let solutionType = req.query.solutionType || '';
        
        // Add this check:
        if (!solutionType) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Solution type is required' 
            })}\n\n`);
            res.end();
            return;
        }
        console.log('Backend received solutionType for uninstall:', solutionType);
        
        req.body = { solutionType }; // Pass solution type to service
        await solutionInstallService.uninstallWithProgress(req, res);
        
        // Close the connection after uninstallation completes
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message || 'Uninstallation failed' 
        })}\n\n`);
        res.end();
    }
});

const getSyncProgress = catchAsync(async (req, res) => {
    // No token authentication required - simple approach

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to sync progress stream' 
    })}\n\n`);

    // Start the sync process
    try {
        // Get solution type from query parameter
        let solutionType = req.query.solutionType || '';
        
        // Add this check:
        if (!solutionType) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Solution type is required' 
            })}\n\n`);
            res.end();
            return;
        }
        console.log('Backend received solutionType for sync:', solutionType);
        
        req.body = { solutionType }; // Pass solution type to service
        await solutionInstallService.syncWithProgress(req, res);
        
        // Close the connection after sync completes
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message || 'Sync failed' 
        })}\n\n`);
        res.end();
    }
});

const checkInstallationHealth = catchAsync(async (req, res) => {
    try {
        const solutionType = req.query.solutionType || '';

        if (!solutionType) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Solution type is required' 
            })}\n\n`);
            res.end();
            return;
        }
        
        // Check if installation process is still running
        const { exec } = require('child_process');
        
        // First check if docker-compose processes are running (installation in progress)
        exec('ps aux | grep -E "(docker-compose|docker build)" | grep -v grep', (error, stdout, stderr) => {
            if (stdout.trim()) {
                // Installation process is still running
                return res.json({ status: 'installing', message: 'Installation in progress' });
            }
            
            // Check if containers are running and healthy
            exec('docker ps --format "{{.Names}} {{.Status}}"', (error, stdout, stderr) => {
                if (error) {
                    return res.json({ status: 'not_running', message: 'Docker not available' });
                }
                
                const containerLines = stdout.trim().split('\n').filter(line => line.trim());
                
                // Get solution configuration dynamically
                const solutionConfig = SOLUTION_CONFIGS[solutionType];
                if (!solutionConfig) {
                    return res.json({ status: 'not_running', message: 'Unknown solution type' });
                }
                
                const solutionContainer = containerLines.find(line => {
                    const [name, status] = line.split(' ', 2);
                    
                    // Create patterns dynamically from solution config
                    const patterns = [solutionConfig.repoName, solutionType];
                    
                    // Add container names from config
                    if (solutionConfig.containerName && Array.isArray(solutionConfig.containerName)) {
                        patterns.push(...solutionConfig.containerName);
                    } else if (solutionConfig.containerName) {
                        patterns.push(solutionConfig.containerName);
                    }
                    
                    // Add image names from config
                    if (solutionConfig.imageName && Array.isArray(solutionConfig.imageName)) {
                        patterns.push(...solutionConfig.imageName);
                    } else if (solutionConfig.imageName) {
                        patterns.push(solutionConfig.imageName);
                    }
                    
                    // Check if any pattern matches the container name
                    const matches = patterns.some(pattern => 
                        pattern && typeof pattern === 'string' && name.toLowerCase().includes(pattern.toLowerCase())
                    );
                    
                    return matches && status.includes('Up');
                });
                
                if (solutionContainer) {
                    res.json({ status: 'running', container: solutionContainer });
                } else {
                    res.json({ status: 'not_running', message: 'Container not found or not running' });
                }
            });
        });
        
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

module.exports = {
    getInstallationProgress,
    getUninstallationProgress,
    getSyncProgress,
    checkInstallationHealth
};
