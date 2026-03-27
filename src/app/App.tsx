/* LanTalk/src/app/App.tsx */
import { useState } from 'react'
import { Sidebar } from '../features/contacts/components/Sidebar'
import { ChatMain } from '../features/chat/components/ChatMain'
import { useThemeEffect } from '../features/theme/hooks'
import { usePreventUnload } from '../features/network/hooks'
import { useSocketHandler } from '../features/network/socket-handler'

function App() {
  useThemeEffect()
  usePreventUnload()
  useSocketHandler()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatMain onMenuClick={() => setSidebarOpen(o => !o)} />
    </div>
  )
}

export default App
