import { useEffect, useRef, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'

interface ShareModalProps {
  onClose: () => void
}

export const ShareModal = ({ onClose }: ShareModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.protocol}//${window.location.host}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })
    }
  }, [shareUrl])

  const handleCopy = () => {
    const triggerCopied = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(triggerCopied)
        .catch(() => {
          fallbackCopy()
        })
    } else {
      fallbackCopy()
    }
  }

  const fallbackCopy = () => {
    const input = document.getElementById('share-url-input') as HTMLInputElement
    if (!input) return
    input.select()
    input.setSelectionRange(0, 99999)
    try {
      const ok = document.execCommand('copy')
      if (ok) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // 无法复制，至少文本已选中，用户可手动复制
    }
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="share-backdrop" onClick={handleBackdrop}>
      <div className="share-modal">
        <div className="share-modal-header">
          <span>Invite to LanTalk</span>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="share-qr-wrap">
          <canvas ref={canvasRef} className="share-qr-canvas" />
          <p className="share-hint">Scan with phone on the same Wi-Fi</p>
        </div>

        <div className="share-url-row">
          <input
            id="share-url-input"
            className="share-url-input"
            value={shareUrl}
            readOnly
            onFocus={e => e.target.select()}
          />
          <button className={`share-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? (
              <>
                <Check size={13} /> Copied
              </>
            ) : (
              <>
                <Copy size={13} /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
