import { useRef, useState, memo, useCallback, useEffect } from 'react';
import {
    X, Clock, Check, CheckCheck, Ban,
    MessageCircle, ArrowDown, Copy, Trash2, Reply,
} from 'lucide-react';
import { useChatStore } from '../store';
import { useChatScroll } from '../hooks';
import { socketClient } from '../../network/socket';
import { Message } from '../types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = memo(({ src, onClose }: { src: string; onClose: () => void }) => (
    <div className="lightbox-overlay" onClick={onClose}>
        <img src={src} className="lightbox-img" onClick={e => e.stopPropagation()} alt="preview" />
        <button className="lightbox-close" onClick={onClose}><X size={18} /></button>
    </div>
));

// ── Status icon ───────────────────────────────────────────────────────────────
const StatusIcon = memo(({ status }: { status?: Message['status'] }) => {
    if (!status || status === 'sending') return <span title="Sending"><Clock size={11} className="msg-status-icon" /></span>;
    if (status === 'sent') return <span title="Sent"><Check size={11} className="msg-status-icon" /></span>;
    if (status === 'delivered') return <span title="Delivered"><CheckCheck size={11} className="msg-status-icon" /></span>;
    if (status === 'read') return <span title="Read"><CheckCheck size={11} className="msg-status-icon msg-status-read" /></span>;
    return null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncate(text: string, max = 60) {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    return plain.length > max ? plain.slice(0, max) + '…' : plain;
}

function renderContent(content: string, searchQuery: string): React.ReactNode {
    if (!searchQuery.trim()) return renderMentions(content);
    const parts = content.split(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi'));
    return parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase()
            ? <mark key={i} className="search-highlight">{part}</mark>
            : renderMentions(part)
    );
}

function renderMentions(text: string): React.ReactNode {
    const parts = text.split(/(@[^\s]+)/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
        /^@[^\s]+$/.test(part)
            ? <span key={i} className="mention-tag">{part}</span>
            : part
    );
}

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
const MessageBubble = memo(({
    msg, searchQuery, onContextMenu, onReact, onImageClick, onReplyClick, onReplyJump,
}: {
    msg: Message;
    searchQuery: string;
    onContextMenu: (msg: Message, e: React.MouseEvent | React.Touch, rect?: DOMRect) => void;
    onReact: (msg: Message, emoji: string) => void;
    onImageClick: (src: string) => void;
    onReplyClick: (msg: Message) => void;
    onReplyJump: (msgId: string) => void;
}) => {
    const [showToolbar, setShowToolbar] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (msg.type === 'system' || msg.status === 'retracted') return;
        const touch = e.touches[0];
        longPressTimer.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(30);
            const rect = bubbleRef.current?.getBoundingClientRect();
            onContextMenu(msg, touch, rect);
        }, 500);
    }, [msg, onContextMenu]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }, []);

    useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }, []);

    if (msg.type === 'system') {
        return (
            <div className="msg-system" id={`msg-${msg.id}`}>
                <span>{msg.content}</span>
                <span className="msg-system-time">{msg.time}</span>
            </div>
        );
    }

    if (msg.status === 'retracted') {
        return (
            <div className={`msg-row ${msg.type}`} id={`msg-${msg.id}`}>
                <div className="msg-bubble msg-retracted">
                    <Ban size={14} className="mr-1.5 opacity-50" />
                    <span className="opacity-50 italic">
                        {msg.type === 'own' ? 'You retracted a message' : 'Message retracted'}
                    </span>
                    <div className="msg-time">{msg.time}</div>
                </div>
            </div>
        );
    }

    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

    return (
        <div
            id={`msg-${msg.id}`}
            className={`msg-row ${msg.type}${msg.mentioned ? ' msg-mentioned' : ''}`}
            onContextMenu={e => { e.preventDefault(); onContextMenu(msg, e); }}
            onMouseEnter={() => !isTouchDevice() && setShowToolbar(true)}
            onMouseLeave={() => setShowToolbar(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
        >
            <div className="msg-bubble-wrap">
                {msg.replyTo && (
                    <div
                        className={`reply-preview ${msg.type}`}
                        onClick={() => onReplyJump(msg.replyTo!.id)}
                        title="Jump to original message"
                    >
                        <div className="reply-bar" />
                        <div className="reply-content">
                            <span className="reply-name">
                                {msg.replyTo.type === 'own' ? 'You' : msg.replyTo.senderName || 'Someone'}
                            </span>
                            <span className="reply-text">{truncate(msg.replyTo.content)}</span>
                        </div>
                    </div>
                )}

                <div
                    ref={bubbleRef}
                    className={`msg-bubble${msg.isImage ? ' img-bubble' : ''}`}
                    onClick={() => {
                        if (msg.isImage) {
                            const src = msg.content.match(/src="([^"]+)"/)?.[1];
                            if (src) onImageClick(src);
                        }
                    }}
                >
                    {msg.type === 'other' && msg.senderName && (
                        <div className="msg-sender">{msg.senderName}</div>
                    )}
                    {msg.isFile ? (
                        msg.content
                            ? <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                            : <span className="opacity-50 italic">Attachment not available after refresh</span>
                    ) : (
                        msg.content.split('\n').map((line, i, arr) => (
                            <span key={i}>
                                {renderContent(line, searchQuery)}
                                {i < arr.length - 1 && <br />}
                            </span>
                        ))
                    )}
                    <div className="msg-time">
                        {msg.time}
                        {msg.type === 'own' && <StatusIcon status={msg.status} />}
                    </div>
                </div>

                {hasReactions && (
                    <div className={`reaction-bar ${msg.type}`}>
                        {Object.entries(msg.reactions!).map(([emoji, data]) => (
                            <button
                                key={emoji}
                                className={`reaction-pill${data.myReaction ? ' mine' : ''}`}
                                onClick={() => onReact(msg, emoji)}
                            >
                                {emoji} <span>{data.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {showToolbar && (
                    <div className={`msg-toolbar ${msg.type}`}>
                        {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} className="toolbar-emoji" onClick={() => onReact(msg, emoji)}>
                                {emoji}
                            </button>
                        ))}
                        <button className="toolbar-action" onClick={() => onReplyClick(msg)} title="Reply">
                            <Reply size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

// ── MessageList ───────────────────────────────────────────────────────────────
export const MessageList = ({ registerScroll }: { registerScroll: (fn: (id: string) => void) => void }) => {
    const messages = useChatStore(state => state.messages);
    const searchQuery = useChatStore(state => state.searchQuery);
    const retractMessage = useChatStore(state => state.retractMessage);
    const setReplyTo = useChatStore(state => state.setReplyTo);
    const { containerRef, scrollToBottom, scrollToMessage } = useChatScroll(messages);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    useEffect(() => {
        registerScroll(scrollToMessage);
    }, [registerScroll, scrollToMessage]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onScroll = () => {
            const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollBtn(dist > 200);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [containerRef]);

    // Track input-island-container height so scroll-to-bottom-btn always
    // clears the input area (reply bar / mention popover can push it taller).
    useEffect(() => {
        const inputContainer = document.querySelector('.input-island-container');
        if (!inputContainer) return;
        const update = () => {
            const h = (inputContainer as HTMLElement).offsetHeight;
            document.documentElement.style.setProperty('--input-area-h', `${h}px`);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(inputContainer);
        return () => ro.disconnect();
    }, []);

    const handleRetract = useCallback((msg: Message) => {
        retractMessage(msg.id);
        socketClient.send({ type: 'retract', msgId: msg.id });
        setContextMenu(null);
    }, [retractMessage]);

    const handleCopy = useCallback((msg: Message) => {
        if (msg.content) navigator.clipboard.writeText(msg.content.replace(/<[^>]+>/g, '')).catch(() => { });
        setContextMenu(null);
    }, []);

    const handleReact = useCallback((msg: Message, emoji: string) => {
        socketClient.send({ type: 'reaction', msgId: msg.id, emoji });
        setContextMenu(null);
    }, []);

    const handleReplyClick = useCallback((msg: Message) => {
        setReplyTo(msg);
        setContextMenu(null);
    }, [setReplyTo]);

    const handleReplyJump = useCallback((msgId: string) => {
        scrollToMessage(msgId);
    }, [scrollToMessage]);

    const handleContextMenu = useCallback((
        msg: Message, e: React.MouseEvent | React.Touch, rect?: DOMRect
    ) => {
        if (msg.type === 'system' || msg.status === 'retracted') return;
        if ('preventDefault' in e) e.preventDefault();
        const menuW = 160, menuH = 200;
        let x: number, y: number;
        if (rect) {
            x = Math.min(rect.left, window.innerWidth - menuW - 8);
            y = Math.max(rect.top - menuH - 8, 8);
        } else {
            const me = e as React.MouseEvent;
            x = Math.min(me.clientX, window.innerWidth - menuW - 8);
            y = Math.min(me.clientY, window.innerHeight - menuH - 8);
        }
        setContextMenu({ x, y, msg });
    }, []);

    // Fix 12: close context-menu on any click/tap outside .messages too
    // (header, input island, etc. previously left the menu open)
    useEffect(() => {
        if (!contextMenu) return;
        const close = (e: PointerEvent) => {
            const menu = document.querySelector('.context-menu');
            if (menu && menu.contains(e.target as Node)) return;
            setContextMenu(null);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [contextMenu]);

    const isEmpty = messages.length === 0;

    return (
        <>
            <div
                className="messages"
                ref={containerRef}
                id="messagesContainer"
                onClick={() => setContextMenu(null)}
            >
                {isEmpty && (
                    <div className="empty-state">
                        <div className="empty-icon"><MessageCircle size={26} /></div>
                        <h3>No messages yet</h3>
                        <p>Share your LAN IP to invite someone, then say hello 👋</p>
                    </div>
                )}

                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        searchQuery={searchQuery}
                        onContextMenu={handleContextMenu}
                        onReact={handleReact}
                        onImageClick={setLightboxSrc}
                        onReplyClick={handleReplyClick}
                        onReplyJump={handleReplyJump}
                    />
                ))}
            </div>

            {showScrollBtn && (
                <button className="scroll-to-bottom-btn" onClick={scrollToBottom} title="Scroll to bottom">
                    <ArrowDown size={18} />
                </button>
            )}

            {contextMenu && (
                <div
                    className="context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="context-reactions">
                        {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} className="context-react-btn" onClick={() => handleReact(contextMenu.msg, emoji)}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <div className="context-divider" />
                    <button onClick={() => handleReplyClick(contextMenu.msg)}>
                        <Reply size={14} /> Reply
                    </button>
                    {!contextMenu.msg.isFile && (
                        <button onClick={() => handleCopy(contextMenu.msg)}>
                            <Copy size={14} /> Copy
                        </button>
                    )}
                    {contextMenu.msg.type === 'own' && (
                        <button className="danger" onClick={() => handleRetract(contextMenu.msg)}>
                            <Trash2 size={14} /> Retract
                        </button>
                    )}
                </div>
            )}

            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        </>
    );
};
