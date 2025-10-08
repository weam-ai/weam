// require('newrelic');
const express = require('express');
const config = require('./src/config/config');
require('./src/config/db');
const path = require('path');
const {
    localize,
    toTitleCase,
    catchAsync,
    handleError,
    slugify,
    globalErrorHandler
} = require('./src/utils/helper');
const initSeed = require('./src/seeders');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const FilesystemBackend = require('i18next-fs-backend');
const descriptor = require('express-list-endpoints-descriptor')(express);
const { store } = require('./src/seeders/store-routes');
const { convertToTz, convertToRetriveTz } = require('./src/services/timezone');
require('./src/jobs/process');
// require('./src/utils/firebaseConfig');
const helmet = require('helmet');
const rateLimitMiddleware = require('./src/middleware/rateLimiter');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// const { createTopic } = require('./src/kafka/admin');
// const { KAFKA_TOPIC } = require('./src/config/constants/common');
const app = express();
const { assignCsrfToken, checkAssignTokenAuth } = require('./src/middleware/csrf');

global.logger = require('./src/utils/logger');
global.util = require('./src/utils/messages');
global.catchAsync = catchAsync;
global._localize = localize;
global._toTitleCase = toTitleCase;
global.handleError = handleError;
global.validate = require('./src/middleware/validate');
global.convertToTz = convertToTz;
global.convertToRetriveTz = convertToRetriveTz;
global.slugify = slugify;
global.io = {};

i18next
    .use(FilesystemBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        lng: 'en',
        ns: ['auth', 'file', 'common'],
        defaultNS: ['auth', 'file', 'common'],
        backend: {
            loadPath: path.join(
                __dirname,
                `/resources/lang/{{lng}}/{{ns}}.json`,
            ),
            addPath: path.join(
                __dirname,
                `/resources/lang/{{lng}}/{{ns}}.json`,
            ),
        },
        debug: false,
        detection: {
            order: ['header', 'querystring' /*, "cookie"*/],
            lookupHeader: 'lng',
            caches: ['cookie'],
        },
        jsonIndent: 2,
        fallbackLng: 'en',
        preload: ['en'],
    });

app.use(helmet());
app.use(require('./src/utils/morgan'));
app.use('/queues', require('./src/jobs').queuesRouter);

// app.use(rateLimitMiddleware);
app.set('trust proxy', true);
app.use(cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: [
        'Origin',
        'X-Requested-with',
        'Accept',
        'Content-Type',
        'Authorization',
        'x-verification-signature',
        'x-csrf-token',
        'x-csrf-raw',
        'x-brain-id'
    ],
    credentials: true,
    methods: ['POST', 'PUT', 'DELETE', 'GET', 'PATCH', 'OPTIONS']
}));

app.use(i18nextMiddleware.handle(i18next));
app.use(express.json({ limit: '50mb', verify: (req, res, buf) => {
    req.rawBody = buf.toString();
} }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.get(`/napi/${config.API.PREFIX}/csrf`, checkAssignTokenAuth, assignCsrfToken);

app.use(`/napi/${config.API.PREFIX}`, require('./src/routes'));

app.use(globalErrorHandler);

app.get('/napi', (req, res) => {
    return res.send('ping')
})
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// cron process
require('./src/services/agenda');
// createTopic(KAFKA_TOPIC.REPLY_THREAD, 1); 

store(descriptor.listEndpoints(app));

if (parseInt(config.SEED)) {
    initSeed().then(() => logger.info('seeded successfully '));
}

module.exports = app;
