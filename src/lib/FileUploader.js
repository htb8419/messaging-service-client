import ApplicationConfig from "../ApplicationConfig";

class FileUploader {
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
        let {accessToken,fileServiceUrl} = ApplicationConfig.getConfig()
        return fetch(fileServiceUrl, {
            method: 'POST',
            body: data,
            headers: {
                'Authorization': 'bearer ' + accessToken
            }
        }).then(response => response.json()).then(response => response.result.fileId).then(fileId => {
            return {fileId, name, mimeType, size}
        })
        //return Promise.resolve({fileId:'testFileId', name, mimeType, size})
        /*  return XhrRequest.POST("/file", data).then(fileId => {
              return {fileId, fileName, fileMimeType, fileSize}
          })*/

    }
}

export default FileUploader