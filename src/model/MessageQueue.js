class MessageQueue {

    constructor() {
        this.queue = [];
    }

    enqueue(message) {
        this.queue.push(message);
    }

    dequeue() {
        return this.queue.shift();
    }

    peek() {
        return !this.isEmpty() ? this.queue[0] : undefined;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    getMessages() {
        return this.queue
    }

    clear() {
        return this.queue = []
    }
}

export default MessageQueue