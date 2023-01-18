class ApplicationConfig {

    static getConfig() {
        return window.$applicationConfig
    }

    static createInstance(options) {
        //todo validate required options properties
        if (!options) {
            throw new Error('invalid options')
        }
        let {serverUrl} = options
        let wsAddress = serverUrl.startsWith("https://") ? serverUrl.replace('https://', 'wss://') : serverUrl.replace('http://', 'ws://')
        let socketUrl = `${wsAddress}/ws-adapter`

        window.$applicationConfig = {
            fileServiceUrl: 'http://192.168.103.34:9011/file',
            socketUrl,
            ...options
        }
        return window.$applicationConfig
    }
}

export default ApplicationConfig