class Logger {

    static debug(...arg) {
        console.debug(...arg)
    }
    static info(...arg) {
        console.info(...arg)
    }

    static error(...arg) {
        console.error(...arg)
    }

    static getLogger() {
        return console.debug
    }
}

export default Logger
