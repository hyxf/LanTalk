/* LanTalk/src/features/chat/components/InputIsland.tsx */
import { useRef, useCallback } from 'react'
import { Plus, Smile, ArrowUp, Reply, X } from 'lucide-react'
import { useMessageInput, useMentionAutocomplete } from '../hooks'

const EMOJIS = ['😀', '😂', '🚀', '🔥', '👍', '❤️', '😎', '🎉', '🤔', '👀', '✅', '🙏']

function truncate(text: string, max = 50) {
  const plain = text.replace(/<[^>]+>/g, '').trim()
  return plain.length > max ? plain.slice(0, max) + '…' : plain
}

export const InputIsland = () => {
  const {
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
  } = useMessageInput()
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const isDisabled = connectionState !== 'connected'

  const { suggestions } = useMentionAutocomplete(inputValue)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dropZoneRef.current?.classList.add('drag-over')
  }, [])

  const handleDragLeave = useCallback(() => {
    dropZoneRef.current?.classList.remove('drag-over')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dropZoneRef.current?.classList.remove('drag-over')
      const file = e.dataTransfer.files[0]
      if (file) sendFile(file)
    },
    [sendFile]
  )

  const connLabel =
    connectionState === 'connecting'
      ? 'Connecting to server...'
      : connectionState === 'disconnected'
        ? 'Reconnecting...'
        : connectionState === 'kicked'
          ? 'Disconnected (Opened in another tab)'
          : null

  return (
    <div className="input-island-container">
      {/* Emoji picker */}
      <div className="emoji-popover" data-show={isEmojiOpen}>
        {EMOJIS.map(emoji => (
          <span key={emoji} className="emoji-item" onClick={() => addEmoji(emoji)}>
            {emoji}
          </span>
        ))}
      </div>

      {/* @mention suggestion list */}
      {showMentions && suggestions.length > 0 && (
        <div className="mention-popover">
          {suggestions.map(u => (
            <button
              key={u.id}
              className="mention-item"
              onMouseDown={e => {
                e.preventDefault()
                insertMention(u.name)
              }}
            >
              <span className="mention-avatar">{u.initials}</span>
              <span className="mention-name">@{u.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Connection status */}
      {connLabel && (
        <div className="conn-status-bar">
          {connectionState !== 'kicked' && <span className="conn-spinner" />} {connLabel}
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="reply-compose-bar">
          <div className="reply-compose-info">
            <Reply size={14} className="text-[color:var(--accent)] shrink-0" />
            <span className="reply-compose-name">
              {replyTo.type === 'own' ? 'You' : replyTo.senderName || 'Someone'}
            </span>
            <span className="reply-compose-text">{truncate(replyTo.content)}</span>
          </div>
          <button className="reply-cancel" onClick={() => setReplyTo(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Drop zone / input row */}
      <div
        ref={dropZoneRef}
        className="input-island"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
        <button
          className="tool-btn"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Plus size={18} />
        </button>
        <button
          className="tool-btn"
          disabled={isDisabled}
          onClick={e => {
            e.stopPropagation()
            toggleEmoji()
          }}
          title="Emoji"
        >
          <Smile size={18} />
        </button>

        <textarea
          ref={textAreaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? 'Waiting for connection...' : 'Write a message...'}
          disabled={isDisabled}
          rows={1}
        />

        <button
          className="send-btn-round"
          onClick={sendMessage}
          disabled={isDisabled || !inputValue.trim()}
          title="Send"
        >
          <ArrowUp size={17} />
        </button>
      </div>
    </div>
  )
}
