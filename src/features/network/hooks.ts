import { useEffect } from 'react'

export const usePreventUnload = () => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    // 浏览器要求必须有用户交互后，beforeunload 弹窗才会显示。
    // 通过监听首次交互事件，在用户真正操作过页面后再注册 beforeunload。
    let registered = false

    const registerOnInteraction = () => {
      if (registered) return
      registered = true
      window.addEventListener('beforeunload', handleBeforeUnload)
      // 只需触发一次，之后移除交互监听
      window.removeEventListener('pointerdown', registerOnInteraction)
      window.removeEventListener('keydown', registerOnInteraction)
    }

    window.addEventListener('pointerdown', registerOnInteraction)
    window.addEventListener('keydown', registerOnInteraction)

    return () => {
      window.removeEventListener('pointerdown', registerOnInteraction)
      window.removeEventListener('keydown', registerOnInteraction)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}
