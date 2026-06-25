import { Config, type MessagingOptions } from './core/Config'
import { Auth } from './core/Auth'
import { TypedEmitter } from './core/TypedEmitter'
import { StompConnection } from './connection/StompConnection'
import { MessageService } from './messaging/MessageService'
import { CallService } from './calling/CallService'
import { FileService } from './files/FileService'
import { EventType } from './events/EventType'
import { RoomInfoService } from './RoomInfoService'
import type { MessagingEventMap, ReceivedMessage } from './events/types'

export class MessagingClient {
  static readonly EventType = EventType

  private readonly config: Config
  private readonly auth: Auth
  private readonly events: TypedEmitter<MessagingEventMap>
  private readonly connection: StompConnection
  private readonly messageService: MessageService
  private readonly callService: CallService
  private readonly fileService: FileService
  private readonly roomInfoService: RoomInfoService

  constructor(options: MessagingOptions) {
    this.config = new Config(options)
    this.auth = new Auth(options.accessToken)
    this.events = new TypedEmitter<MessagingEventMap>()

    this.connection = new StompConnection(this.config, this.auth, this.events)
    this.messageService = new MessageService(this.connection, this.config, this.auth)
    this.fileService = new FileService(this.config, this.auth)
    this.callService = new CallService(this.config, this.events, this.messageService)
    this.roomInfoService = new RoomInfoService()
  }

  // ── Events ──

  on<K extends keyof MessagingEventMap>(event: K, handler: MessagingEventMap[K]): void {
    this.events.on(event, handler)
  }

  off<K extends keyof MessagingEventMap>(event: K, handler: MessagingEventMap[K]): void {
    this.events.off(event, handler)
  }

  // ── Connection ──

  connect(): void {
    this.connection.connect()
  }

  async disconnect(): Promise<void> {
    await this.callService.endCall(false)
    await this.connection.disconnect()
  }

  // ── Messaging ──

  async sendMessage(text: string, file?: File): Promise<void> {
    await this.messageService.sendMessage(text, file)
  }

  async getRoomMessages(): Promise<ReceivedMessage[]> {
    const response = await fetch(`${this.config.serverUrl}/room/messages/${this.config.roomId}`, {
      headers: { Authorization: `bearer ${this.auth.accessToken}` },
    })
    if (!response.ok) throw new Error(`Failed to fetch room messages: ${response.status}`)
    const json = await response.json() as { payload?: ReceivedMessage[] }
    return json.payload ?? []
  }

  async getParticipantsState(): Promise<unknown[]> {
    const response = await fetch(
      `${this.config.serverUrl}/room/participantStates/${this.config.roomId}`,
      { headers: { Authorization: `bearer ${this.auth.accessToken}` } },
    )
    if (!response.ok) throw new Error(`Failed to fetch participant states: ${response.status}`)
    const json = await response.json() as { payload?: unknown[] }
    return json.payload ?? []
  }

  async getRoomInfo(roomCode: string): Promise<unknown> {
    return this.roomInfoService.getRoomInfo(roomCode, this.config)
  }

  // ── Presence & Typing ──

  async sendTypingState(state: string): Promise<void> {
    await this.messageService.sendTypingState(state)
  }

  async sendPresence(presence: string): Promise<void> {
    await this.messageService.sendPresence(presence)
  }

  // ── Calling ──

  async makeCall(): Promise<void> {
    await this.callService.makeCall()
  }

  async endCall(forceCloseSession = false): Promise<void> {
    await this.callService.endCall(forceCloseSession)
  }

  toggleMicrophone(enabled: boolean): void {
    this.callService.toggleMicrophone(enabled)
  }

  toggleCamera(enabled: boolean): void {
    this.callService.toggleCamera(enabled)
  }

  // ── Files ──

  getFileUrl(fileId: string): string {
    return this.fileService.getFileUrl(fileId)
  }
}
