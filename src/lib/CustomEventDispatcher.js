class CustomEventDispatcher {

    static dispatchEvent(eventType, detail) {
        let customEvent = new CustomEvent(eventType, {detail})
        //Logger.debug('customEvent :', customEvent.type, ' event.detail :', customEvent.detail)
       window.dispatchEvent(customEvent)
    }

    static registerEventListener(eventType, processFunc) {
        window.addEventListener(eventType, e => {
            processFunc(e)
        });
    }
}

export default CustomEventDispatcher