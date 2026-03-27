/* LanTalk/src/features/network/socket-handler.ts
 *
 * useSocketHandler — extracts all WebSocket message routing out of App.tsx.
 * App.tsx becomes a pure layout component; all business/network coordination
 * lives here instead.
 */
import { useEffect, useRef } from 'react'
import { socketClient } from './socket'
import { useChatStore } from '../chat/store'
import { useContactsStore } from '../contacts/store'
import { requestNotificationPermission, showNotification, playPingSound } from './notify'
import { escapeHtml, FILE_ICON_SVG } from '../chat/utils'

export const useSocketHandler = () => {
  const receiveMessage = useChatStore(state => state.receiveMessage)
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus)
  const retractMessage = useChatStore(state => state.retractMessage)
  const addReaction = useChatStore(state => state.addReaction)
  const setConnectionState = useChatStore(state => state.setConnectionState)
  const setPeerTyping = useChatStore(state => state.setPeerTyping)
  const clearPeerTyping = useChatStore(state => state.clearPeerTyping)
  const incrementUnread = useChatStore(state => state.incrementUnread)
  const clearUnread = useChatStore(state => state.clearUnread)
  const unreadCount = useChatStore(state => state.unreadCount)

  const setInitialUser = useContactsStore(state => state.setInitialUser)
  const setUsers = useContactsStore(state => state.setUsers)
  const myId = useContactsStore(state => state.myId)
  const myName = useContactsStore(state => state.currentUser.name)
  const clientId = useContactsStore(state => state.clientId)

  // Refs keep the socket handler closure up-to-date without re-registering it.
  const myIdRef = useRef(myId)
  const myNameRef = useRef(myName)
  useEffect(() => {
    myIdRef.current = myId
  }, [myId])
  useEffect(() => {
    myNameRef.current = myName
  }, [myName])

  // Document title reflects unread count.
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) LanTalk` : 'LanTalk'
  }, [unreadCount])

  // Clear unread badge when the window regains focus.
  useEffect(() => {
    const onFocus = () => clearUnread()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [clearUnread])

  // WebSocket lifecycle + message routing.
  useEffect(() => {
    void requestNotificationPermission()

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`
    socketClient.connect(wsUrl)
    setConnectionState('connecting')

    const unsubscribeOpen = socketClient.onOpen(() => {
      setConnectionState('connected')
    })

    const unsubscribeClose = socketClient.onClose(() => {
      if (useChatStore.getState().connectionState !== 'kicked') {
        setConnectionState('disconnected')
      }
      clearPeerTyping()
    })

    const unsubscribe = socketClient.onMessage(msg => {
      switch (msg.type) {
        case 'init': {
          setInitialUser(msg.myId, msg.userNum)
          const time = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          setTimeout(() => {
            socketClient.send({ type: 'join', name: myNameRef.current, clientId, time })
          }, 0)
          break
        }
        case 'userList': {
          setUsers(
            msg.users.map(u => ({
              id: u.id,
              initials: u.initials,
              name: u.name,
              status: u.status,
              lastMessage: '',
              isActive: false,
            }))
          )
          break
        }
        case 'message': {
          socketClient.send({ type: 'read', msgId: msg.msgId })
          const myCurrentName = myNameRef.current
          const mentioned =
            !!myCurrentName && msg.content.toLowerCase().includes(`@${myCurrentName.toLowerCase()}`)
          receiveMessage({
            content: msg.content,
            type: 'other',
            time: msg.time,
            senderName: msg.senderName,
            status: 'read',
            id: msg.msgId,
            replyTo: msg.replyTo,
            mentioned,
          })
          playPingSound()
          showNotification(
            mentioned ? `${msg.senderName} mentioned you` : msg.senderName,
            msg.content
          )
          if (!document.hasFocus()) incrementUnread()
          break
        }
        case 'file': {
          socketClient.send({ type: 'read', msgId: msg.msgId })
          const safeMimeType = escapeHtml(msg.mimeType)
          const isImage = safeMimeType.startsWith('image/')
          const dataUrl = `data:${safeMimeType};base64,${msg.fileData}`
          let htmlContent: string
          if (isImage) {
            htmlContent = `
                            <div class="file-card img-preview-card flex-col items-start gap-2 p-2">
                                <img src="${dataUrl}" class="preview-img" alt="${escapeHtml(msg.fileName)}" />
                                <div class="flex gap-2 items-center">
                                    <span class="text-xs opacity-60">${escapeHtml(msg.fileName)} · ${(msg.fileSize / 1024).toFixed(1)} KB</span>
                                    <a href="${dataUrl}" download="${escapeHtml(msg.fileName)}" class="text-xs opacity-80" style="color:inherit;">↓ Save</a>
                                </div>
                            </div>`
          } else {
            htmlContent = `
                            <div class="file-card">
                                ${FILE_ICON_SVG}
                                <div class="flex flex-col gap-1">
                                    <span class="font-medium">${escapeHtml(msg.fileName)}</span>
                                    <span class="text-xs opacity-60">${(msg.fileSize / 1024).toFixed(1)} KB</span>
                                    <a href="${dataUrl}" download="${escapeHtml(msg.fileName)}" class="text-xs opacity-80" style="color:inherit;">↓ Download</a>
                                </div>
                            </div>`
          }
          receiveMessage({
            content: htmlContent,
            type: 'other',
            time: msg.time,
            isFile: true,
            isImage,
            senderName: msg.senderName,
            status: 'read',
            id: msg.msgId,
          })
          playPingSound()
          showNotification(msg.senderName, `Sent a file: ${msg.fileName}`)
          if (!document.hasFocus()) incrementUnread()
          break
        }
        case 'system': {
          receiveMessage({ content: msg.content, type: 'system', time: msg.time })
          break
        }
        case 'typing': {
          setPeerTyping(msg.isTyping, msg.senderName)
          break
        }
        case 'ack': {
          updateMessageStatus(msg.msgId, 'delivered')
          break
        }
        case 'read': {
          updateMessageStatus(msg.msgId, 'read')
          break
        }
        case 'retract': {
          retractMessage(msg.msgId)
          break
        }
        case 'reaction': {
          const isMine = msg.senderId === myIdRef.current
          addReaction(msg.msgId, msg.emoji, isMine)
          break
        }
        case 'kicked': {
          socketClient.disconnect()
          setConnectionState('kicked')
          receiveMessage({
            content: 'Disconnected (Opened in another tab)',
            type: 'system',
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
          })
          break
        }
      }
    })

    return () => {
      unsubscribeOpen()
      unsubscribeClose()
      unsubscribe()
      socketClient.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
