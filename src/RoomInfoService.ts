import type { Config } from './core/Config'

export interface RoomInfo {
  currentParticipant: { token: string }
  [key: string]: unknown
}

export class RoomInfoService {
  async getRoomInfo(roomCode: string, config: Config): Promise<RoomInfo> {
    const response = await fetch(`${config.serverUrl}/room/roomInfo/${roomCode}`)
    const json = await response.json() as { result?: RoomInfo; payload?: RoomInfo; messages?: Array<{ code: string }> }

    if (json.result) return json.result
    if (json.messages && json.messages.length > 0 && json.messages[0]!.code === 'NO_LINK_FOUND') {
      throw new Error('INVALID_ROOM_CODE')
    }
    return json.payload as RoomInfo
  }
}
