const { _processors } = require('./jobservice');
const { defaultQueue, mailQueue, notificationQueue, importChatQueue } = require('./configuration');

for (let identity in _processors) {
    defaultQueue.process(identity, 3, _processors[identity]);
    mailQueue.process(identity, 5, _processors[identity]);
    notificationQueue.process(identity, 5, _processors[identity]);
        importChatQueue.process(identity, 3, _processors[identity]);
}