/* LanTalk/src/features/chat/store.ts */
import { create } from 'zustand'
import { Message } from './types'
import { generateId } from './utils'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'kicked'

const SESSION_KEY = 'lantalk_messages'

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    // Bug 1+10 fix: validate structure, filter malformed entries
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[]).filter(
      (m): m is Message =>
        m !== null &&
        typeof m === 'object' &&
        typeof (m as Message).id === 'string' &&
        typeof (m as Message).content === 'string' &&
        typeof (m as Message).type === 'string'
    )
  } catch {
    return []
  }
}

function serializeMessages(messages: Message[]): string {
  // Strip file blobs to keep sessionStorage lean and avoid QuotaExceededError
  const toSave = messages.map(m => (m.isFile ? { ...m, content: '' } : m))
  return JSON.stringify(toSave)
}

// Bug 9 fix: debounce sessionStorage writes for high-frequency updates (status, reactions)
// Bug 4 fix: immediate flush for new messages so closing tab doesn't lose them
let _saveTimer: ReturnType<typeof setTimeout> | null = null

function saveMessages(messages: Message[], immediate = false) {
  if (_saveTimer) clearTimeout(_saveTimer)
  const write = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, serializeMessages(messages))
    } catch {
      // sessionStorage quota exceeded — ignore
    }
    _saveTimer = null
  }
  if (immediate) {
    write()
  } else {
    _saveTimer = setTimeout(write, 300)
  }
}

interface ChatState {
  messages: Message[]
  inputValue: string
  isEmojiOpen: boolean
  connectionState: ConnectionState
  peerTyping: string[] // Bug 6 fix: names of all currently-typing peers
  replyTo: Message | null
  unreadCount: number // Feature 4
  searchQuery: string // Feature 1
  setInputValue: (val: string) => void
  toggleEmoji: (isOpen?: boolean) => void
  addMessage: (msg: Omit<Message, 'id'> & { id?: string }) => void
  receiveMessage: (msg: Omit<Message, 'id'> & { id?: string }) => void
  updateMessageStatus: (id: string, status: Message['status']) => void
  retractMessage: (id: string) => void
  addReaction: (msgId: string, emoji: string, mine: boolean) => void
  setConnectionState: (state: ConnectionState) => void
  setPeerTyping: (isTyping: boolean, name: string) => void // Bug 6 fix: tracks per-name
  clearPeerTyping: () => void // Bug 3 fix: clear all on disconnect
  setReplyTo: (msg: Message | null) => void
  incrementUnread: () => void // Feature 4
  clearUnread: () => void // Feature 4
  setSearchQuery: (q: string) => void // Feature 1
}

export const useChatStore = create<ChatState>(set => ({
  messages: loadMessages(), // Feature 3: restore from sessionStorage
  inputValue: '',
  isEmojiOpen: false,
  connectionState: 'connecting',
  peerTyping: [],
  replyTo: null,
  unreadCount: 0,
  searchQuery: '',

  setInputValue: val => set({ inputValue: val }),
  toggleEmoji: isOpen => set(state => ({ isEmojiOpen: isOpen ?? !state.isEmojiOpen })),

  addMessage: msg =>
    set(state => {
      const messages = [...state.messages, { id: generateId(), ...msg }]
      saveMessages(messages, true) // Bug 4 fix: flush immediately so tab-close doesn't lose new messages
      return { messages }
    }),

  receiveMessage: msg =>
    set(state => {
      const messages = [...state.messages, { id: generateId(), ...msg }]
      saveMessages(messages, true) // Bug 4 fix: flush immediately
      return { messages }
    }),

  updateMessageStatus: (id, status) =>
    set(state => {
      // Only advance to a higher-ranked status; never regress.
      // This prevents the setTimeout('sent', 100ms) in sendMessage from
      // overwriting a 'delivered' or 'read' ack that arrived first on LAN.
      const rank: Partial<Record<string, number>> = {
        sending: 0,
        sent: 1,
        delivered: 2,
        read: 3,
        retracted: 4,
      }
      const messages = state.messages.map(m => {
        if (m.id !== id) return m
        if ((rank[m.status ?? 'sending'] ?? 0) >= (rank[status ?? 'sending'] ?? 0)) return m
        return { ...m, status }
      })
      saveMessages(messages)
      return { messages }
    }),

  retractMessage: id =>
    set(state => {
      const messages = state.messages.map(
        (m): Message =>
          m.id === id
            ? {
                ...m,
                status: 'retracted',
                content: '',
                isFile: false,
                isImage: false,
                replyTo: undefined,
              }
            : m
      )
      saveMessages(messages)
      // Fix 11: if the user is currently composing a reply to the retracted
      // message, clear replyTo so the reply-compose-bar disappears.
      const replyTo = state.replyTo?.id === id ? null : state.replyTo
      return { messages, replyTo }
    }),

  addReaction: (msgId, emoji, mine) =>
    set(state => {
      const messages = state.messages.map(m => {
        if (m.id !== msgId) return m
        const reactions = { ...(m.reactions || {}) }
        const existing = reactions[emoji]
        if (existing) {
          if (mine && existing.myReaction) {
            const newCount = existing.count - 1
            if (newCount <= 0) {
              delete reactions[emoji]
            } else {
              reactions[emoji] = { count: newCount, myReaction: false }
            }
          } else if (!mine && existing.myReaction) {
            reactions[emoji] = { count: existing.count + 1, myReaction: true }
          } else {
            reactions[emoji] = {
              count: existing.count + 1,
              myReaction: mine ? true : existing.myReaction,
            }
          }
        } else {
          reactions[emoji] = { count: 1, myReaction: mine }
        }
        return { ...m, reactions }
      })
      saveMessages(messages)
      return { messages }
    }),

  setConnectionState: connectionState => set({ connectionState }),
  setPeerTyping: (isTyping, name) =>
    set(state => {
      // Bug 6 fix: maintain a list of all currently-typing peers
      const current = state.peerTyping.filter(n => n !== name)
      return { peerTyping: isTyping ? [...current, name] : current }
    }),
  clearPeerTyping: () => set({ peerTyping: [] }), // Bug 3 fix
  setReplyTo: replyTo => set({ replyTo }),
  incrementUnread: () => set(state => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  setSearchQuery: searchQuery => set({ searchQuery }),
}))
