const Queue = require('bull');
const { REDIS } = require('../config/config');
const { QUEUE_NAME } = require('../config/constants/common');
const logger = require('../utils/logger');

const queueOptions = {
    redis: {
        host: REDIS.HOST,
        port: REDIS.PORT
    }
}

const defaultQueue = new Queue(QUEUE_NAME.DEFAULT, { ...queueOptions, db: 1 });
const mailQueue = new Queue(QUEUE_NAME.MAIL, { ...queueOptions, db: 2 });
const notificationQueue = new Queue(QUEUE_NAME.NOTIFICATION, { ...queueOptions, db: 3 });
const importChatQueue = new Queue(QUEUE_NAME.IMPORT_CHAT, { ...queueOptions, db: 5 });


logger.info('bull-job-queue loaded');

const handleFailure = async (job, err) => {
    if (job.attemptsMade >= job.opts.attempts) {
        logger.info(`🤯   Job failures above threshold ${job.name}`, err);
        job.remove();
        return null;
    }
    logger.info(
        `🤯   Job ${job.name} failed with ${err.message}. ${job.opts.attempts - job.attemptsMade
        } attempts left`,
    );
}

const handleCompleted = async (job) => {
    logger.info(
        `🌿   Job ${job.name} completed ${job?.data?.user?.email
            ? JSON.stringify(job?.data?.user?.email, null, 2)
            : ''
        }`,
    );
    job.remove();
};

const handleStalled = (job) => {
    logger.info(`🌿   Job ${job.name} stalled`);
};

const processQueue = [defaultQueue, mailQueue, notificationQueue, importChatQueue];


processQueue.forEach(queue => {
    queue.on('failed', handleFailure);
    queue.on('stalled', handleStalled);
    queue.on('completed', handleCompleted);
});

module.exports = {
    defaultQueue,
    mailQueue,
    notificationQueue,
    importChatQueue
}