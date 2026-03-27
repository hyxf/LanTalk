import { useRef, useCallback } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { InputIsland } from './InputIsland'

interface ChatMainProps {
  onMenuClick: () => void
}

export const ChatMain = ({ onMenuClick }: ChatMainProps) => {
  const scrollToMessageRef = useRef<((id: string) => void) | null>(null)

  const handleJumpTo = useCallback((msgId: string) => {
    scrollToMessageRef.current?.(msgId)
  }, [])

  const registerScroll = useCallback((fn: (id: string) => void) => {
    scrollToMessageRef.current = fn
  }, [])

  return (
    <div className="chat-main">
      <ChatHeader onMenuClick={onMenuClick} onJumpTo={handleJumpTo} />
      <MessageList registerScroll={registerScroll} />
      <InputIsland />
    </div>
  )
}
