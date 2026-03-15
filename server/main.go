package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

//go:embed static
var staticFiles embed.FS

var (
	userCounter   atomic.Int64
	sessionPrefix = fmt.Sprintf("%x", time.Now().UnixMilli())
)

func generateSessionID() string {
	return fmt.Sprintf("%s_%x", sessionPrefix, rand.Int63())
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func getLocalIPs() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var ips []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			if ip4 := ip.To4(); ip4 != nil {
				ips = append(ips, ip4.String())
			}
		}
	}
	return ips
}

func main() {
	port := 3000
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}

	hub := newHub()
	go hub.run()

	// Static file system rooted at the embedded "static" directory
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal("embed static:", err)
	}
	fileServer := http.FileServer(http.FS(staticFS))

	mux := http.NewServeMux()

	// WebSocket endpoint
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("upgrade:", err)
			return
		}

		num := int(userCounter.Add(1))
		id := fmt.Sprintf("user_%s_%d", sessionPrefix, num)
		defaultName := fmt.Sprintf("User%d", num)

		client := newClient(hub, conn, id, defaultName)
		hub.register <- client

		// Send init message
		initMsg, _ := json.Marshal(ServerMessage{
			Type:    "init",
			MyID:    id,
			UserNum: num,
		})
		client.send <- initMsg

		go client.writePump()
		go client.readPump()
	})

	// All other routes: serve static files, fallback to index.html for SPA
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		if urlPath == "" {
			urlPath = "index.html"
		}

		// Check if file exists in embed; if not, SPA fallback to index.html
		f, err := staticFS.Open(urlPath)
		if err != nil {
			// Rewrite URL to root so FileServer serves index.html
			r2 := new(http.Request)
			*r2 = *r
			r2.URL = new(url.URL)
			*r2.URL = *r.URL
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, r2)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf("0.0.0.0:%d", port)
	srv := &http.Server{Addr: addr, Handler: mux}

	ips := getLocalIPs()
	fmt.Println()
	fmt.Println("🚀 LanTalk Server is running!")
	fmt.Println()
	fmt.Printf("   Local:    http://localhost:%d\n", port)
	for _, ip := range ips {
		fmt.Printf("   Network:  http://%s:%d\n", ip, port)
	}
	fmt.Println()
	fmt.Println("📱 Share this address with others on your LAN:")
	for _, ip := range ips {
		fmt.Printf("   http://%s:%d\n", ip, port)
	}
	fmt.Println()

	log.Fatal(srv.ListenAndServe())
}
