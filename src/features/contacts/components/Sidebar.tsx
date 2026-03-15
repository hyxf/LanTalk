import { useRef } from 'react';
import { ProfileCard } from './ProfileCard';
import { UserList } from './UserList';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx < -60) onClose();
        touchStartX.current = null;
    };

    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}
            <div
                className={`sidebar${isOpen ? ' sidebar-open' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <ProfileCard />
                <UserList />
            </div>
        </>
    );
};
