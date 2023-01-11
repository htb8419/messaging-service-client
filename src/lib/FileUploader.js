import XhrRequest from "./XhrRequest";

class FileUploader{
    static upload(file) {
        if (!file) {
            throw new Error("selected file is undefined")
        }
        let data = new FormData()
        data.append('file', file)
        let {name, size, type: mimeType} = file
        if (!mimeType || mimeType === '') {
            mimeType = "text/plain"
        }
        return Promise.resolve({fileId:'testFileId', name, mimeType, size})
      /*  return XhrRequest.POST("/file", data).then(fileId => {
            return {fileId, fileName, fileMimeType, fileSize}
        })*/
    }
}
export default FileUploader