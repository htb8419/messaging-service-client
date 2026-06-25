import type { Config } from '../core/Config'
import type { Auth } from '../core/Auth'
import type { FileInfo } from './types'

export class FileService {
  constructor(
    private readonly config: Config,
    private readonly auth: Auth,
  ) {}

  getFileUrl(fileId: string): string {
    if (!fileId) {
      throw new Error('fileId is required')
    }
    return `${this.config.fileServiceUrl}/${fileId}`
  }

  async upload(file: File): Promise<FileInfo> {
    const formData = new FormData()
    formData.append('file', file)

    const mimeType = file.type || 'text/plain'

    const response = await fetch(this.config.fileServiceUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `bearer ${this.auth.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`)
    }

    const json = await response.json() as { result: { fileId: string } }
    return {
      fileId: json.result.fileId,
      name: file.name,
      mimeType,
      size: file.size,
    }
  }
}
