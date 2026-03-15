package main

// ClientMessage is a message received from a WebSocket client.
type ClientMessage struct {
	Type     string `json:"type"`
	Name     string `json:"name,omitempty"`
	ClientID string `json:"clientId,omitempty"`
	Time     string `json:"time,omitempty"`

	MsgID   string      `json:"msgId,omitempty"`
	Content string      `json:"content,omitempty"`
	ReplyTo *ReplyToMsg `json:"replyTo,omitempty"`

	FileName string `json:"fileName,omitempty"`
	FileSize int64  `json:"fileSize,omitempty"`
	FileData string `json:"fileData,omitempty"`
	MimeType string `json:"mimeType,omitempty"`

	IsTyping bool   `json:"isTyping,omitempty"`
	Emoji    string `json:"emoji,omitempty"`
}

// ReplyToMsg is the quoted message payload inside a message.
type ReplyToMsg struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	SenderName string `json:"senderName,omitempty"`
	Type       string `json:"type"` // "own" | "other"
}

// ServerMessage is a message sent from the server to clients.
type ServerMessage struct {
	Type string `json:"type"`

	// init
	MyID    string `json:"myId,omitempty"`
	UserNum int    `json:"userNum,omitempty"`

	// userList
	Users []UserInfo `json:"users,omitempty"`

	// message / file / system / typing / ack / read / retract / reaction
	MsgID      string      `json:"msgId,omitempty"`
	SenderID   string      `json:"senderId,omitempty"`
	SenderName string      `json:"senderName,omitempty"`
	Content    string      `json:"content,omitempty"`
	Time       string      `json:"time,omitempty"`
	ReplyTo    *ReplyToMsg `json:"replyTo,omitempty"`

	FileName string `json:"fileName,omitempty"`
	FileSize int64  `json:"fileSize,omitempty"`
	FileData string `json:"fileData,omitempty"`
	MimeType string `json:"mimeType,omitempty"`

	IsTyping bool   `json:"isTyping,omitempty"`
	Emoji    string `json:"emoji,omitempty"`
}

// UserInfo is the public representation of a connected user.
type UserInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Initials string `json:"initials"`
	Status   string `json:"status"`
}
