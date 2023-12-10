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
    try {
        let {accessToken} = SecurityContextHolder.getCurrentContext()

        if (!headers['Authorization']) {
            headers["Authorization"] = `bearer ${accessToken}`
        }
    } catch (ignored) {
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
    return fetch(url, {...fetchOptions, signal: abortController.signal})
        .then(response => {
        if (!response || !response.status) {
            return response
        }
        if (response.ok && response.status === 200) {
            /*const contentType = response.headers.get(XhrRequest.CONTENT_TYPE_HEADER_KEY);
            if(contentType && contentType.toLowerCase().indexOf(XhrRequest.APPLICATION_JSON) === -1)
            {
                throw new Error('expect application-json as response type ');
            }*/
            return response.json()
        }else if(response.status === 401){
            throw new Error('Access Denied!')
        }
        throw new Error('Something went wrong.');
    }).then(response => {
        let {payload, messages: errors} = response
        if (Array.isArray(errors) && errors.length > 0) {
            throw errors[0]
        }
        return payload ? payload : response;
    }).catch(e => {
        /*EventDispatcher.dispatchEvent(EventTypes.SERVER_EXCEPTION,
            {blocking: false, errorMessage: 'network error'});*/
        throw e
    }).finally(()=>{
            clearTimeout(timeoutId)
        })
}

export default XhrRequest
