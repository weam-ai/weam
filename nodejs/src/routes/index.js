const express = require('express');
const { csrfMiddleware } = require('../middleware/csrf');
const { checkUserBlocking } = require('../middleware/userBlocking');


const router = express.Router();

// Apply user blocking check to ALL routes globally
router.use(checkUserBlocking);

router.use('/admin', csrfMiddleware, require('./admin'));
router.use('/web', csrfMiddleware, require('./web'));
router.use('/upload', csrfMiddleware, require('./upload'));
router.use('/common', require('./common'));
router.use('/device', csrfMiddleware, require('./mobile'));
router.use('/ollama', require('./ollama'));

module.exports = router;