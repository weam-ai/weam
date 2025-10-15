const { defaultQueue, mailQueue, notificationQueue, importChatQueue } = require('./configuration');
const { JOB_TYPE } = require('../config/constants/common');
const { createBullBoard } = require('bull-board');
const { BullAdapter } = require('bull-board/bullAdapter');
const { router } = createBullBoard([
    new BullAdapter(defaultQueue),
    new BullAdapter(mailQueue),
    new BullAdapter(notificationQueue),
    new BullAdapter(importChatQueue)
]);

const createJob = async (name, data, options = {}) => {
    const opts = { priority: 0, attempts: 3, delay: 1000 };

    const queueMapping = {
        [JOB_TYPE.SEND_MAIL]: mailQueue,
        [JOB_TYPE.SEND_NOTIFICATION]: notificationQueue,
        [JOB_TYPE.UPDATE_DBREF]: defaultQueue,
        [JOB_TYPE.DELETE_DBREF]: defaultQueue,
        [JOB_TYPE.PROCESS_IMPORT_CHAT]: importChatQueue
    }

    const targetQueue = queueMapping[name] || defaultQueue;

    targetQueue.add(name, data, {
        ...options,
        priority: options.priority || opts.priority,
        attempts: options.attempts || opts.attempts,
        delay: options.delay || opts.delay,
        removeOnComplete: true,
        removeOnFail: false
    })
}

//createJob("demoJob",{name:"sendMail"},{}); use this fn where you want to create new job

module.exports = { createJob, queuesRouter: router };