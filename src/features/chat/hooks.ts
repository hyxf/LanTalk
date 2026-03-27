import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useChatStore } from './store'
import { useContactsStore } from '../contacts/store'
import { socketClient } from '../network/socket'
import { Message } from './types'
import { generateId, escapeHtml, FILE_ICON_SVG } from './utils'

// ─── Feature 5+6: scroll hook ───────────────────────────────────────────────
export const useChatScroll = (messages: Message[]) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastLenRef = useRef(0)
  // Track whether we've done the initial mount scroll.
  // On mount we always jump to the bottom (covers sessionStorage restore);
  // afterwards we only follow if the user is already near the bottom.
  const mountedRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Mount: scroll to bottom unconditionally, bypassing distanceFromBottom
    // check which would always fail when restoring a long history.
    if (!mountedRef.current) {
      mountedRef.current = true
      lastLenRef.current = messages.length
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
      return
    }

    const prevLen = lastLenRef.current
    const newLen = messages.length
    lastLenRef.current = newLen

    if (newLen <= prevLen) return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom <= 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('msg-jump-highlight')
      setTimeout(() => el.classList.remove('msg-jump-highlight'), 1200)
    }
  }, [])

  return { containerRef, scrollToBottom, scrollToMessage }
}

// ─── Feature 1: search ───────────────────────────────────────────────────────
export const useSearch = () => {
  const { searchQuery, setSearchQuery, messages } = useChatStore()

  const results = useMemo(
    () =>
      searchQuery.trim()
        ? messages.filter(
            m =>
              m.type !== 'system' &&
              m.status !== 'retracted' &&
              !m.isFile &&
              m.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [],
    [messages, searchQuery]
  )

  return { searchQuery, setSearchQuery, results }
}

// ─── Feature 6: @mention autocomplete ────────────────────────────────────────
export const useMentionAutocomplete = (inputValue: string) => {
  const users = useContactsStore(state => state.users)
  const myId = useContactsStore(state => state.myId)

  const match = inputValue.match(/@([^\s]*)$/)
  const query = match ? match[1].toLowerCase() : null

  const suggestions =
    query !== null
      ? users.filter(u => u.id !== myId && u.name.toLowerCase().startsWith(query)).slice(0, 5)
      : []

  return { suggestions }
}

// ─── Message input ────────────────────────────────────────────────────────────
export const useMessageInput = () => {
  const {
    inputValue,
    setInputValue,
    addMessage,
    toggleEmoji,
    isEmojiOpen,
    updateMessageStatus,
    connectionState,
    replyTo,
    setReplyTo,
  } = useChatStore()
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const [showMentions, setShowMentions] = useState(false)

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false
      socketClient.send({ type: 'typing', isTyping: false })
    }
  }, [])

  const insertMention = useCallback(
    (name: string) => {
      const newVal = inputValue.replace(/@[^\s]*$/, `@${name} `)
      setInputValue(newVal)
      setShowMentions(false)
      setTimeout(() => {
        const el = textAreaRef.current
        if (el) {
          el.focus()
          el.setSelectionRange(newVal.length, newVal.length)
        }
      }, 0)
    },
    [inputValue, setInputValue]
  )

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputValue(val)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
    if (val === '') {
      // Fix 2: unify with CSS textarea { height: 38px }
      e.target.style.height = '38px'
      stopTyping()
      setShowMentions(false)
    } else {
      setShowMentions(/@[^\s]*$/.test(val))
      if (!isTypingRef.current) {
        isTypingRef.current = true
        socketClient.send({ type: 'typing', isTyping: true })
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(stopTyping, 2000)
    }
  }

  const sendMessage = () => {
    if (!inputValue.trim() || connectionState !== 'connected') return

    const msgId = generateId()
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const replyToData =
      replyTo && replyTo.type !== 'system'
        ? {
            id: replyTo.id,
            content: replyTo.content,
            senderName: replyTo.senderName,
            type: replyTo.type,
          }
        : undefined

    addMessage({
      content: inputValue,
      type: 'own',
      time,
      status: 'sending',
      id: msgId,
      replyTo: replyToData,
    })
    socketClient.send({ type: 'message', msgId, content: inputValue, time, replyTo: replyToData })

    setTimeout(() => updateMessageStatus(msgId, 'sent'), 100)

    setReplyTo(null)
    stopTyping()
    setInputValue('')
    setShowMentions(false)
    toggleEmoji(false)
    if (textAreaRef.current) {
      // Fix 2: unify with CSS textarea { height: 38px }
      textAreaRef.current.style.height = '38px'
      textAreaRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') {
      setReplyTo(null)
      setShowMentions(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      sendFile(e.target.files[0])
      e.target.value = ''
    }
  }

  const sendFile = (file: File) => {
    if (connectionState !== 'connected') return

    if (file.size > 20 * 1024 * 1024) {
      alert('File too large (max 20 MB)')
      return
    }

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const msgId = generateId()
    const mimeType = file.type || 'application/octet-stream'
    const isImage = mimeType.startsWith('image/')

    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      const fileData = dataUrl.split(',')[1]

      if (isImage) {
        const htmlContent = `
                    <div class="file-card img-preview-card flex-col items-start gap-2 p-2">
                        <img src="${dataUrl}" class="preview-img" alt="${escapeHtml(file.name)}" />
                        <span class="text-xs opacity-60">${escapeHtml(file.name)} · ${(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                `
        addMessage({
          content: htmlContent,
          type: 'own',
          time,
          isFile: true,
          isImage: true,
          status: 'sending',
          id: msgId,
        })
      } else {
        const htmlContent = `
                    <div class="file-card">
                        ${FILE_ICON_SVG}
                        <div class="flex flex-col gap-1">
                            <span class="font-medium">${escapeHtml(file.name)}</span>
                            <span class="text-xs opacity-60">${(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                `
        addMessage({
          content: htmlContent,
          type: 'own',
          time,
          isFile: true,
          status: 'sending',
          id: msgId,
        })
      }

      socketClient.send({
        type: 'file',
        msgId,
        fileName: file.name,
        fileSize: file.size,
        fileData,
        mimeType,
        time,
      })
      setTimeout(() => updateMessageStatus(msgId, 'sent'), 100)
    }
    // Fix 6: handle FileReader failure — addMessage hasn't been called yet
    // when onerror fires (onload and onerror are mutually exclusive), so
    // there is nothing to retract; just alert the user.
    reader.onerror = () => {
      alert('Failed to read file. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  const addEmoji = (emoji: string) => {
    setInputValue(inputValue + emoji)
    toggleEmoji(false)
    textAreaRef.current?.focus()
  }

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  return {
    inputValue,
    isEmojiOpen,
    textAreaRef,
    fileInputRef,
    connectionState,
    replyTo,
    setReplyTo,
    showMentions,
    handleInput,
    handleKeyDown,
    sendMessage,
    toggleEmoji,
    handleFileSelect,
    sendFile,
    addEmoji,
    insertMention,
  }
}
