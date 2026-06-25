export class TypedEmitter<T extends Record<string, (...args: any[]) => void>> {
  private handlers = new Map<keyof T, Set<T[keyof T]>>()

  on<K extends keyof T>(event: K, handler: T[K]): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off<K extends keyof T>(event: K, handler: T[K]): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.handlers.get(event)?.forEach(handler => {
      (handler as (...a: Parameters<T[K]>) => void)(...args)
    })
  }
}
