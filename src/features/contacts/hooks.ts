import { useContactsStore } from './store'
import { socketClient } from '../network/socket'

export const useProfile = () => {
  const currentUser = useContactsStore(state => state.currentUser)
  const updateUsername = useContactsStore(state => state.updateUsername)

  const handleNameBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newName = e.target.innerText.trim()
    if (!newName) {
      e.target.innerText = currentUser.name
      return
    }
    updateUsername(newName)
    socketClient.send({ type: 'nameChange', name: newName })
    e.target.style.color = 'var(--text-primary)'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
      e.currentTarget.style.color = '#10b981'
      setTimeout(() => {
        if (e.target instanceof HTMLElement) e.target.style.color = 'var(--text-primary)'
      }, 800)
    }
  }

  return { currentUser, handleNameBlur, handleKeyDown }
}

export const useUserList = () => {
  return useContactsStore(state => state.users)
}
