/* LanTalk/src/features/chat/components/ChatHeader.tsx */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Share2, Moon, Sun,
    ChevronUp, ChevronDown, X,
} from 'lucide-react';
import { ShareModal } from './ShareModal';
import { useThemeStore } from '../../theme/store';
import { useContactsStore } from '../../contacts/store';
import { useChatStore } from '../store';
import { useSearch } from '../hooks';

interface ChatHeaderProps {
    onMenuClick: () => void;
    onJumpTo: (msgId: string) => void;
}

export const ChatHeader = ({ onMenuClick, onJumpTo }: ChatHeaderProps) => {
    const { theme, toggleTheme } = useThemeStore();
    const users = useContactsStore(state => state.users);
    const myId = useContactsStore(state => state.myId);
    const connectionState = useChatStore(state => state.connectionState);
    const peerTyping = useChatStore(state => state.peerTyping);
    const { searchQuery, setSearchQuery, results } = useSearch();
    const [searchOpen, setSearchOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [resultIdx, setResultIdx] = useState(-1);
    const searchRef = useRef<HTMLInputElement>(null);

    const peers = users.filter(u => u.id !== myId);
    const headerTitle = peers.length > 0 ? peers.map(u => u.name).join(', ') : 'Waiting for someone...';
    const statusColor = connectionState === 'connected' ? '#22c55e'
        : connectionState === 'connecting' ? '#f59e0b'
            : connectionState === 'kicked' ? '#ef4444' : '#ef4444';
    const isAnyoneTyping = peerTyping.length > 0;
    const typingText = peerTyping.length === 1
        ? `${peerTyping[0]} is typing...`
        : `${peerTyping.slice(0, -1).join(', ')} and ${peerTyping[peerTyping.length - 1]} are typing...`;
    const statusText = isAnyoneTyping
        ? typingText
        : connectionState === 'connected'
            ? `${peers.length > 0 ? peers.length + ' online' : 'connected'}`
            : connectionState === 'connecting' ? 'Connecting...'
                : connectionState === 'kicked' ? 'Disconnected' : 'Reconnecting...';

    const openSearch = () => {
        setSearchOpen(true);
        setResultIdx(-1);
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    const closeSearch = () => {
        setSearchOpen(false);
        setSearchQuery('');
        setResultIdx(-1);
    };

    const handleSearchKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { closeSearch(); return; }
        if (results.length === 0) return;
        if (e.key === 'Enter' || e.key === 'F3') {
            e.preventDefault();
            const idx = e.shiftKey
                ? (resultIdx - 1 + results.length) % results.length
                : (resultIdx + 1) % results.length;
            setResultIdx(idx);
            onJumpTo(results[idx].id);
        }
    };

    const handleResultClick = (msgId: string, idx: number) => {
        setResultIdx(idx);
        onJumpTo(msgId);
    };

    return (
        <div className="chat-header">
            {searchOpen ? (
                <div className="search-bar-wrap">
                    <Search size={15} className="search-icon" />
                    <input
                        ref={searchRef}
                        className="search-input"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setResultIdx(-1); }}
                        onKeyDown={handleSearchKey}
                    />
                    {results.length > 0 && resultIdx >= 0 && (
                        <span className="search-count">
                            {resultIdx + 1}/{results.length}
                        </span>
                    )}
                    {searchQuery && results.length > 0 && (
                        <>
                            <button className="icon-btn" onClick={() => {
                                const base = resultIdx < 0 ? results.length : resultIdx;
                                const idx = (base - 1 + results.length) % results.length;
                                setResultIdx(idx); onJumpTo(results[idx].id);
                            }} title="Previous"><ChevronUp size={16} /></button>
                            <button className="icon-btn" onClick={() => {
                                const idx = (resultIdx + 1) % results.length;
                                setResultIdx(idx); onJumpTo(results[idx].id);
                            }} title="Next"><ChevronDown size={16} /></button>
                        </>
                    )}
                    <button className="icon-btn" onClick={closeSearch} title="Close search">
                        <X size={16} />
                    </button>

                    {searchQuery && results.length > 0 && (
                        <div className="search-results-dropdown">
                            {results.slice(0, 8).map((msg, i) => (
                                <button
                                    key={msg.id}
                                    className={`search-result-item${resultIdx >= 0 && i === resultIdx ? ' active' : ''}`}
                                    onClick={() => handleResultClick(msg.id, i)}
                                >
                                    <span className="search-result-sender">{msg.senderName || 'You'}</span>
                                    <span className="search-result-text">
                                        {highlightQuery(msg.content, searchQuery)}
                                    </span>
                                    <span className="search-result-time">{msg.time}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchQuery && results.length === 0 && (
                        <div className="search-results-dropdown">
                            <div className="search-no-results">No results for "{searchQuery}"</div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="header-left">
                        <button className="icon-btn menu-btn" onClick={onMenuClick} title="Members">
                            <Users size={16} />
                        </button>
                        <div className="header-title">
                            <h3>{headerTitle}</h3>
                            <div className="header-status" style={{ color: isAnyoneTyping ? 'var(--text-secondary)' : statusColor }}>
                                {isAnyoneTyping ? (
                                    <span className="typing-dots"><span /><span /><span /></span>
                                ) : (
                                    <span className="pulse-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                                )}
                                {statusText}
                            </div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn" onClick={openSearch} title="Search">
                            <Search size={16} />
                        </button>
                        <button className="icon-btn" onClick={() => setShareOpen(true)} title="Invite / Share">
                            <Share2 size={16} />
                        </button>
                        <button className="icon-btn" onClick={toggleTheme} title="Switch Theme">
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                </>
            )}
            {shareOpen && createPortal(
                <ShareModal onClose={() => setShareOpen(false)} />,
                document.body
            )}
        </div>
    );
};

function highlightQuery(text: string, query: string): React.ReactNode {
    const plain = text.replace(/<[^>]+>/g, '').trim().slice(0, 80);
    if (!query) return plain;
    const idx = plain.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return plain;
    return (
        <>
            {plain.slice(0, idx)}
            <mark className="search-highlight">{plain.slice(idx, idx + query.length)}</mark>
            {plain.slice(idx + query.length)}
        </>
    );
}
