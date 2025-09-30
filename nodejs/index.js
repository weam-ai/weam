const app = require('./app');
const { SERVER } = require('./src/config/config');
const { startMCPServer } = require('./src/services/mcpServer');
const { initializeServiceMonitor } = require('./src/utils/initB');
const logger = require('./src/utils/logger');
const http = require('http');
const server = http.createServer(app);
const socketIo = require('socket.io');
const { APPLICATION_ENVIRONMENT } = require('./src/config/constants/common');

const allowedOrigins = SERVER.NODE_ENV === APPLICATION_ENVIRONMENT.PRODUCTION
  ? [/weam\.ai$/] 
  : ['http://localhost:3000', 'http://localhost:3001', /weam\.ai$/, 'http://localhost:3002', 'http://localhost:8081'];

global.io = socketIo(server,{
    path: '/napi/socket.io',
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: [ 'websocket' ],
});

require('./src/socket/rooms');
require('./src/socket/chat');
const { pubClient, subClient } = require('./src/socket/rooms');

server.listen(SERVER.PORT, async () => {
    // Start MCP server
    try {
        initializeServiceMonitor();
        await Promise.all([pubClient.connect(), subClient.connect(), startMCPServer()]);
        logger.info('MCP Server started successfully');
    } catch (error) {
        logger.error('Failed to start MCP Server:', error);
    }
    
    logger.info(`Backend server is started on port ${SERVER.PORT}`);
});