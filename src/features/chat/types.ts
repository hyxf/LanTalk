export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'retracted'

export interface Reaction {
  emoji: string
  count: number
  myReaction: boolean
}

export interface Message {
  id: string
  content: string
  type: 'own' | 'other' | 'system'
  time: string
  isFile?: boolean
  isImage?: boolean
  senderName?: string
  status?: MessageStatus
  replyTo?: { id: string; content: string; senderName?: string; type: 'own' | 'other' }
  reactions?: Record<string, { count: number; myReaction: boolean }>
  mentioned?: boolean // Feature 6: @mention highlight
}
