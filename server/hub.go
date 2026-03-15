package main

import (
	"encoding/json"
	"strings"
)

const maxMsgOwners = 500

type incomingMsg struct {
	client *Client
	msg    ClientMessage
}

type Hub struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	incoming   chan incomingMsg

	msgOwners map[string]string
	ownerKeys []string
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
		incoming:   make(chan incomingMsg, 64),
		msgOwners:  make(map[string]string),
	}
}

func (h *Hub) run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c.id] = c

		case c := <-h.unregister:
			if _, ok := h.clients[c.id]; !ok {
				break
			}
			wasJoined := c.joined
			name := c.name
			delete(h.clients, c.id)
			close(c.send)

			if wasJoined {
				h.broadcastAll(ServerMessage{Type: "userList", Users: h.getUserList()})
				h.broadcast(ServerMessage{
					Type:    "system",
					Content: name + " left the chat",
					Time:    nowTime(),
				}, "")
			}

		case im := <-h.incoming:
			h.handleMessage(im.client, im.msg)
		}
	}
}

func (h *Hub) handleMessage(c *Client, msg ClientMessage) {
	if msg.Type != "join" && !c.joined {
		return
	}
	switch msg.Type {
	case "join":
		h.handleJoin(c, msg)
	case "message":
		h.handleChat(c, msg)
	case "file":
		h.handleFile(c, msg)
	case "nameChange":
		h.handleNameChange(c, msg)
	case "typing":
		h.broadcast(ServerMessage{
			Type:       "typing",
			SenderID:   c.id,
			SenderName: c.name,
			IsTyping:   msg.IsTyping,
		}, c.id)
	case "read":
		if !isValidString(msg.MsgID, maxMsgIDLen) {
			return
		}
		h.broadcast(ServerMessage{Type: "read", MsgID: msg.MsgID}, c.id)
	case "retract":
		h.handleRetract(c, msg)
	case "reaction":
		h.handleReaction(c, msg)
	}
}

func (h *Hub) handleJoin(c *Client, msg ClientMessage) {
	if strings.TrimSpace(msg.Name) != "" {
		c.name = clampString(strings.TrimSpace(msg.Name), maxNameLen)
	}

	if msg.ClientID != "" {
		lastIdx := strings.LastIndex(msg.ClientID, "_")
		base := msg.ClientID
		if lastIdx > 0 {
			base = msg.ClientID[:lastIdx]
		}
		c.baseClientID = base

		for othID, oth := range h.clients {
			if othID != c.id && oth.joined && oth.baseClientID == base {
				h.sendTo(othID, ServerMessage{Type: "kicked"})
				if _, exists := h.clients[othID]; exists {
					close(oth.send)
					go oth.conn.Close()
					delete(h.clients, othID)
				}
			}
		}
	}

	c.joined = true
	h.broadcastAll(ServerMessage{Type: "userList", Users: h.getUserList()})
	h.broadcast(ServerMessage{
		Type:    "system",
		Content: c.name + " joined the chat",
		Time:    nowTime(),
	}, c.id)
}

func (h *Hub) handleChat(c *Client, msg ClientMessage) {
	if strings.TrimSpace(msg.Content) == "" {
		return
	}
	msgID := msg.MsgID
	if !isValidString(msgID, maxMsgIDLen) {
		msgID = generateSessionID()
	}
	content := clampString(msg.Content, maxContent)

	var replyTo *ReplyToMsg
	if msg.ReplyTo != nil {
		rt := msg.ReplyTo
		rType := "other"
		if rt.Type == "own" {
			rType = "own"
		}
		replyTo = &ReplyToMsg{
			ID:         clampString(rt.ID, maxMsgIDLen),
			Content:    clampString(rt.Content, maxReplyText),
			SenderName: clampString(rt.SenderName, maxNameLen),
			Type:       rType,
		}
	}

	h.broadcast(ServerMessage{
		Type:       "message",
		MsgID:      msgID,
		SenderID:   c.id,
		SenderName: c.name,
		Content:    content,
		Time:       nowTime(),
		ReplyTo:    replyTo,
	}, c.id)

	h.recordOwner(msgID, c.id)
	h.sendTo(c.id, ServerMessage{Type: "ack", MsgID: msgID})
}

func (h *Hub) handleFile(c *Client, msg ClientMessage) {
	if msg.FileData == "" {
		return
	}
	approxBytes := int64(float64(len(msg.FileData)) * 0.75)
	if approxBytes > maxFileSize {
		h.sendTo(c.id, ServerMessage{
			Type:    "system",
			Content: "File too large (max 20 MB)",
			Time:    nowTime(),
		})
		return
	}
	if !isValidString(msg.FileName, maxFileName) {
		return
	}
	msgID := msg.MsgID
	if !isValidString(msgID, maxMsgIDLen) {
		msgID = generateSessionID()
	}
	mimeType := "application/octet-stream"
	if msg.MimeType != "" {
		mimeType = clampString(msg.MimeType, maxMimeType)
	}

	h.recordOwner(msgID, c.id)
	h.broadcast(ServerMessage{
		Type:       "file",
		MsgID:      msgID,
		SenderID:   c.id,
		SenderName: c.name,
		FileName:   strings.TrimSpace(msg.FileName),
		FileSize:   msg.FileSize,
		FileData:   msg.FileData,
		MimeType:   mimeType,
		Time:       nowTime(),
	}, c.id)
	h.sendTo(c.id, ServerMessage{Type: "ack", MsgID: msgID})
}

func (h *Hub) handleNameChange(c *Client, msg ClientMessage) {
	if strings.TrimSpace(msg.Name) == "" {
		return
	}
	c.name = clampString(strings.TrimSpace(msg.Name), maxNameLen)
	h.broadcastAll(ServerMessage{Type: "userList", Users: h.getUserList()})
}

func (h *Hub) handleRetract(c *Client, msg ClientMessage) {
	if !isValidString(msg.MsgID, maxMsgIDLen) {
		return
	}
	owner, ok := h.msgOwners[msg.MsgID]
	if !ok || owner != c.id {
		return
	}
	delete(h.msgOwners, msg.MsgID)
	for i, k := range h.ownerKeys {
		if k == msg.MsgID {
			h.ownerKeys = append(h.ownerKeys[:i], h.ownerKeys[i+1:]...)
			break
		}
	}
	h.broadcastAll(ServerMessage{Type: "retract", MsgID: msg.MsgID, SenderID: c.id})
}

func (h *Hub) handleReaction(c *Client, msg ClientMessage) {
	if !isValidString(msg.MsgID, maxMsgIDLen) {
		return
	}
	if !isValidString(msg.Emoji, maxEmojiLen) {
		return
	}
	h.broadcastAll(ServerMessage{
		Type:     "reaction",
		MsgID:    msg.MsgID,
		Emoji:    msg.Emoji,
		SenderID: c.id,
	})
}

func (h *Hub) broadcast(msg ServerMessage, excludeID string) {
	data, _ := json.Marshal(msg)
	for id, c := range h.clients {
		if id == excludeID || !c.joined {
			continue
		}
		select {
		case c.send <- data:
		default:
			go c.conn.Close()
		}
	}
}

func (h *Hub) broadcastAll(msg ServerMessage) {
	data, _ := json.Marshal(msg)
	for _, c := range h.clients {
		select {
		case c.send <- data:
		default:
			go c.conn.Close()
		}
	}
}

func (h *Hub) sendTo(targetID string, msg ServerMessage) {
	c, ok := h.clients[targetID]
	if !ok {
		return
	}
	data, _ := json.Marshal(msg)
	select {
	case c.send <- data:
	default:
		go c.conn.Close()
	}
}

func (h *Hub) getUserList() []UserInfo {
	var list []UserInfo
	for _, c := range h.clients {
		if c.joined {
			list = append(list, userInfo(c))
		}
	}
	return list
}

func (h *Hub) recordOwner(msgID, clientID string) {
	if _, exists := h.msgOwners[msgID]; !exists {
		h.ownerKeys = append(h.ownerKeys, msgID)
	}
	h.msgOwners[msgID] = clientID

	if len(h.msgOwners) > maxMsgOwners {
		toDelete := len(h.msgOwners) - maxMsgOwners
		for i := 0; i < toDelete && i < len(h.ownerKeys); i++ {
			delete(h.msgOwners, h.ownerKeys[i])
		}
		h.ownerKeys = h.ownerKeys[toDelete:]
	}
}