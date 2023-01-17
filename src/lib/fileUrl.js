import ApplicationConfig from "../ApplicationConfig";

export default (fileId) => {
    if (!fileId) {
        throw new Error('FileId is invalid!')
    }
    let {fileServiceUrl} = ApplicationConfig.getConfig()
    return `${fileServiceUrl}/${fileId}`
}