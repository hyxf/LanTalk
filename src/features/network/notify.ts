// Bug 1 fix: reuse a single AudioContext instead of creating one per ping
let _audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AudioContext()
    }
    return _audioCtx
  } catch {
    return null
  }
}

export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

export function showNotification(title: string, body: string) {
  if (document.hasFocus()) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  new Notification(title, {
    body,
    icon: '/favicon.ico',
    silent: false,
  })
}

export function playPingSound() {
  // Bug 10 fix: don't ping when user is actively looking at the window
  if (document.hasFocus()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const play = () => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)

      // Disconnect nodes after playback to free resources (ctx itself stays open)
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    }

    // Fix 10: ctx.currentTime is frozen while suspended; resume first so
    // start/stop timestamps are calculated against the live clock.
    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(play)
        .catch(() => {})
    } else {
      play()
    }
  } catch {
    /* AudioContext may be blocked */
  }
}
