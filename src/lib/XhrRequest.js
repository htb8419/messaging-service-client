import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

class XhrRequest {
    static CONTENT_TYPE_HEADER_KEY = 'content-type'
    static APPLICATION_JSON = 'application/json'

    static GET(path, headers, dispatchError) {
        return sendRequest(path, 'GET', {}, headers);
    }

    static POST(path, data, headers, dispatchError) {
        return sendRequest(path, 'POST', data, headers);
    }
}

function sendRequest(path, method, data, headers = {}) {
    let {serverUrl} = ApplicationConfig.getConfig()
    let {accessToken} = SecurityContextHolder.getCurrentContext()

    if (!headers['Authorization']) {
        headers["Authorization"] = `bearer ${accessToken}`
    }
    let url = path.startsWith("/") ? `${serverUrl}${path}` : path
    let fetchOptions = {
        credentials: "include",
        method: method,
        headers
    }

    if (method === 'POST' && data) {
        let contentType = headers[XhrRequest.CONTENT_TYPE_HEADER_KEY] || '';
        fetchOptions.body = (contentType === XhrRequest.APPLICATION_JSON) ?
            JSON.stringify(data) : data
    }
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);
    return fetch(url, {...fetchOptions, signal: abortController.signal}).then(response => {
        clearTimeout(timeoutId)
        if (!response || !response.status) {
            return response
        }
        if (response.ok && response.status === 200) {
            const contentType = response.headers.get(XhrRequest.CONTENT_TYPE_HEADER_KEY);
            return (contentType && contentType.toLowerCase().indexOf(XhrRequest.APPLICATION_JSON) !== -1) ?
                response.json()
                : response
        } else if (response.status === 401) {
            return response.json()
        }
        // throw new Error('Something went wrong.');
    }).then((response) => {
        let {payload, errors} = response
        if (Array.isArray(errors) && errors.length > 0) {
            throw errors[0]
        }
        return payload ? payload : response;
    }).catch(e => {
        clearTimeout(timeoutId)
        /*EventDispatcher.dispatchEvent(EventTypes.SERVER_EXCEPTION,
            {blocking: false, errorMessage: 'network error'});*/
        throw  e
    })
}

export default XhrRequest
