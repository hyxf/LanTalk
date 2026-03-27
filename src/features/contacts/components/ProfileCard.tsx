import { useRef, useEffect } from 'react'
import { useProfile } from '../hooks'

export const ProfileCard = () => {
  const { currentUser, handleNameBlur, handleKeyDown } = useProfile()
  const editRef = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (editRef.current && !isFocusedRef.current) {
      editRef.current.textContent = currentUser.name
    }
  }, [currentUser.name])

  return (
    <div className="profile-section">
      <div className="my-card">
        <div className="my-avatar">{currentUser.initials}</div>
        <div className="my-info">
          <span className="label">Identity</span>
          <div
            ref={editRef}
            className="username-edit"
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              isFocusedRef.current = true
            }}
            onBlur={e => {
              isFocusedRef.current = false
              handleNameBlur(e)
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  )
}
