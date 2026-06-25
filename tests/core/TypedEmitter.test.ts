import { describe, it, expect, vi } from 'vitest'
import { TypedEmitter } from '../../src/core/TypedEmitter'

type TestEvents = {
  foo: (x: number) => void
  bar: (msg: string, flag: boolean) => void
}

describe('TypedEmitter', () => {
  it('registers and calls a handler', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('foo', handler)
    emitter.emit('foo', 42)
    expect(handler).toHaveBeenCalledWith(42)
  })

  it('calls multiple handlers for the same event', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on('foo', h1)
    emitter.on('foo', h2)
    emitter.emit('foo', 99)
    expect(h1).toHaveBeenCalledWith(99)
    expect(h2).toHaveBeenCalledWith(99)
  })

  it('removes a handler via off()', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('foo', handler)
    emitter.off('foo', handler)
    emitter.emit('foo', 1)
    expect(handler).not.toHaveBeenCalled()
  })

  it('emitting with no handlers does not throw', () => {
    const emitter = new TypedEmitter<TestEvents>()
    expect(() => emitter.emit('bar', 'test', true)).not.toThrow()
  })

  it('passes multiple arguments to handler', () => {
    const emitter = new TypedEmitter<TestEvents>()
    const handler = vi.fn()
    emitter.on('bar', handler)
    emitter.emit('bar', 'hello', false)
    expect(handler).toHaveBeenCalledWith('hello', false)
  })
})
