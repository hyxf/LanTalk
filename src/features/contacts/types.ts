export interface User {
    id: string;
    initials: string;
    name: string;
    status: 'online' | 'offline';
    lastMessage?: string;
    isActive?: boolean;
}
