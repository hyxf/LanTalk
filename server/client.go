package main

import (
    "encoding/json"
    "log"
    "strings"
    "time"
    "unicode/utf8"

    "github.com/gorilla/websocket"
)

const (
    maxFileSize  = 20 * 1024 * 1024 // 20 MB
    maxEmojiLen  = 16
    maxMsgIDLen  = 64
    maxNameLen   = 32
    maxContent   = 4000
    maxFileName  = 255
    maxMimeType  = 128
    maxReplyText = 200
)

// Client represents a single connected WebSocket peer.
type Client struct {
    hub          *Hub
    conn         *websocket.Conn
    send         chan[]byte
    id           string
    name         string
    joined       bool
    baseClientID string
}

func newClient(hub *Hub, conn *websocket.Conn, id string, name string) *Client {
    return &Client{
        hub:  hub,
        conn: conn,
        send: make(chan[]byte, 32), // 从 256 降至 32，防止并发大文件导致严重 OOM
        id:   id,
        name: name,
    }
}

// writePump pumps messages from the send channel to the WebSocket.
func (c *Client) writePump() {
    ticker := time.NewTicker(30 * time.Second)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case msg, ok := <-c.send:
            // 延长写超时到 120 秒，确保大文件（~20MB）在较弱网络下能发完不断连
            c.conn.SetWriteDeadline(time.Now().Add(120 * time.Second))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage,[]byte{})
                return
            }
            if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// readPump reads incoming messages from the WebSocket.
func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(int64(float64(maxFileSize)*1.5) + 1024)
    // 延长读超时到 120 秒，避免客户端弱网上传大文件时被踢下线
    c.conn.SetReadDeadline(time.Now().Add(120 * time.Second))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(120 * time.Second))
        return nil
    })

    for {
        _, raw, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("[ws error] %s: %v", c.id, err)
            }
            return
        }

        var msg ClientMessage
        if err := json.Unmarshal(raw, &msg); err != nil {
            continue
        }

        c.hub.incoming <- incomingMsg{client: c, msg: msg}
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

func isValidString(s string, maxLen int) bool {
    s = strings.TrimSpace(s)
    return len(s) > 0 && utf8.RuneCountInString(s) <= maxLen
}

func clampString(s string, maxLen int) string {
    runes :=[]rune(s)
    if len(runes) > maxLen {
        return string(runes[:maxLen])
    }
    return s
}

func nowTime() string {
    return time.Now().Format("15:04")
}

func userInfo(c *Client) UserInfo {
    initials := ""
    if len(c.name) > 0 {
        r, _ := utf8.DecodeRuneInString(c.name)
        initials = strings.ToUpper(string(r))
    }
    return UserInfo{ID: c.id, Name: c.name, Initials: initials, Status: "online"}
}