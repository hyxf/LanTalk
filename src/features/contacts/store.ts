import { create } from 'zustand'
import { User } from './types'

const CLIENT_ID_KEY = 'lantalk_client_id'
const CLIENT_NAME_KEY = 'lantalk_client_name'
const TAB_ID_KEY = 'lantalk_tab_id'

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function lsSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val)
  } catch {}
}
function ssGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function ssSet(key: string, val: string) {
  try {
    sessionStorage.setItem(key, val)
  } catch {}
}

function randomStr() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadOrCreateBaseClientId(): string {
  const saved = lsGet(CLIENT_ID_KEY)
  if (saved) return saved
  const newId = 'client_' + randomStr()
  lsSet(CLIENT_ID_KEY, newId)
  return newId
}

function loadOrCreateTabId(): string {
  const ssVal = ssGet(TAB_ID_KEY)
  if (ssVal) return ssVal
  const newId = randomStr()
  ssSet(TAB_ID_KEY, newId)
  lsSet(TAB_ID_KEY, newId)
  return newId
}

function buildClientId(): string {
  const base = loadOrCreateBaseClientId()
  const tab = loadOrCreateTabId()
  return `${base}_${tab}`
}

interface ContactsState {
  myId: string
  clientId: string
  currentUser: { name: string; initials: string }
  users: User[]
  setMyId: (id: string) => void
  setInitialUser: (id: string, userNum: number) => void
  setUsers: (users: User[]) => void
  updateUsername: (name: string) => void
}

export const useContactsStore = create<ContactsState>(set => {
  const clientId = buildClientId()
  // 已有保存的用户名则直接用，否则暂时空着等服务端下发 userNum
  const savedName = lsGet(CLIENT_NAME_KEY) || ''

  return {
    myId: '',
    clientId,
    currentUser: {
      name: savedName,
      initials: savedName ? savedName.charAt(0).toUpperCase() : '',
    },
    users: [],
    setMyId: id => set({ myId: id }),
    setInitialUser: (id, userNum) =>
      set(state => {
        // 已有保存的用户名，直接用；否则用服务端下发的 userNum 生成默认名并持久化
        if (state.currentUser.name) {
          return { myId: id }
        }
        const defaultName = `User${userNum}`
        lsSet(CLIENT_NAME_KEY, defaultName)
        return {
          myId: id,
          currentUser: { name: defaultName, initials: 'U' },
        }
      }),
    setUsers: users => set({ users }),
    updateUsername: name => {
      lsSet(CLIENT_NAME_KEY, name)
      set({ currentUser: { name, initials: name.charAt(0).toUpperCase() } })
    },
  }
})
