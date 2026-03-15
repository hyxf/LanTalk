import { ServerMessage, ClientMessage } from './types';

type MessageHandler = (msg: ServerMessage) => void;
type OpenHandler = () => void;
type CloseHandler = () => void;

class SocketClient {
    private ws: WebSocket | null = null;
    private handlers: MessageHandler[] = [];
    private openHandlers: OpenHandler[] = [];
    private closeHandlers: CloseHandler[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private connectionTimer: ReturnType<typeof setTimeout> | null = null;
    private url: string = '';
    private shouldConnect = false;

    connect(url: string) {
        this.url = url;
        this.shouldConnect = true;
        this._connect();
    }

    private _connect() {
        if (!this.shouldConnect) return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

        this._clearConnectionTimer();

        try {
            this.ws = new WebSocket(this.url);
        } catch {
            this._scheduleReconnect();
            return;
        }

        // 3秒连接超时控制，避开浏览器漫长的 TCP 默认超时
        this.connectionTimer = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
        }, 3000);

        this.ws.onopen = () => {
            this._clearConnectionTimer();
            this.openHandlers.forEach(h => h());
        };

        this.ws.onmessage = (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);
                this.handlers.forEach(h => h(msg));
            } catch { /* ignore */ }
        };

        this.ws.onclose = () => {
            this._clearConnectionTimer();
            this.closeHandlers.forEach(h => h());
            if (this.shouldConnect) this._scheduleReconnect();
        };

        this.ws.onerror = () => {
            this.ws?.close();
        };
    }

    private _clearConnectionTimer() {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
    }

    private _scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this._connect();
        }, 1000);
    }

    send(msg: ClientMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    onMessage(handler: MessageHandler) {
        this.handlers.push(handler);
        return () => { this.handlers = this.handlers.filter(h => h !== handler); };
    }

    onOpen(handler: OpenHandler) {
        this.openHandlers.push(handler);
        return () => { this.openHandlers = this.openHandlers.filter(h => h !== handler); };
    }

    onClose(handler: CloseHandler) {
        this.closeHandlers.push(handler);
        return () => { this.closeHandlers = this.closeHandlers.filter(h => h !== handler); };
    }

    disconnect() {
        this.shouldConnect = false;
        this._clearConnectionTimer();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }

    get readyState() {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }
}

export const socketClient = new SocketClient();