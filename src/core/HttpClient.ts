export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  async get<T = unknown>(path: string, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>(path, 'GET', undefined, headers)
  }

  async post<T = unknown>(path: string, data?: unknown, headers: Record<string, string> = {}): Promise<T> {
    return this.request<T>(path, 'POST', data, headers)
  }

  private async request<T>(
    path: string,
    method: string,
    data?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = path.startsWith('/') ? `${this.baseUrl}${path}` : path

    const headers: Record<string, string> = {
      Authorization: `bearer ${this.accessToken}`,
      ...extraHeaders,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'include',
        signal: controller.signal,
      }

      if (method === 'POST' && data !== undefined) {
        fetchOptions.body = JSON.stringify(data)
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json'
        }
      }

      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Access Denied')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const json = await response.json() as { payload?: T; messages?: unknown[] }
      const errors = json.messages
      if (Array.isArray(errors) && errors.length > 0) {
        throw errors[0]
      }

      return json.payload !== undefined ? json.payload : json as T
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
