import ApplicationConfig from "../ApplicationConfig";
import SecurityContextHolder from "./SecurityContextHolder";

const uploadFile =async (file) => {
    if (!file) {
        throw new Error("selected file is undefined")
    }
    let data = new FormData()
    data.append('file', file)
    let {name, size, type: mimeType} = file
    if (!mimeType || mimeType === '') {
        mimeType = "text/plain"
    }
    let {fileServiceUrl} = ApplicationConfig.getConfig()
    let {accessToken} = SecurityContextHolder.getCurrentContext()

    return fetch(fileServiceUrl, {
        method: 'POST',
        body: data,
        headers: {
            'Authorization': `bearer ${accessToken}`
        }
    }).then(response => response.json()).then(response => response.result.fileId).then(fileId => {
        return {fileId, name, mimeType, size}
    })
}

export default uploadFile