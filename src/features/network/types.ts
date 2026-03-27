/* LanTalk/src/features/network/types.ts */
export type RemoteUser = {
  id: string
  name: string
  initials: string
  status: 'online' | 'offline'
}

export type ServerMessage =
  | { type: 'init'; myId: string; userNum: number }
  | { type: 'userList'; users: RemoteUser[] }
  | {
      type: 'message'
      msgId: string
      senderId: string
      senderName: string
      content: string
      time: string
      replyTo?: { id: string; content: string; senderName?: string; type: 'own' | 'other' }
    }
  | {
      type: 'file'
      msgId: string
      senderId: string
      senderName: string
      fileName: string
      fileSize: number
      fileData: string
      mimeType: string
      time: string
    }
  | { type: 'system'; content: string; time: string }
  | { type: 'typing'; senderId: string; senderName: string; isTyping: boolean }
  | { type: 'ack'; msgId: string }
  | { type: 'read'; msgId: string }
  | { type: 'retract'; msgId: string; senderId: string }
  | { type: 'reaction'; msgId: string; emoji: string; senderId: string }
  | { type: 'kicked' }

export type ClientMessage =
  | { type: 'join'; name: string; clientId: string; time: string }
  | {
      type: 'message'
      msgId: string
      content: string
      time: string
      replyTo?: { id: string; content: string; senderName?: string; type: 'own' | 'other' }
    }
  | {
      type: 'file'
      msgId: string
      fileName: string
      fileSize: number
      fileData: string
      mimeType: string
      time: string
    }
  | { type: 'nameChange'; name: string }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'read'; msgId: string }
  | { type: 'retract'; msgId: string }
  | { type: 'reaction'; msgId: string; emoji: string }
