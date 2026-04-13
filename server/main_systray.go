//go:build systray

package main

import (
	"net/http"
	"sync"

	"github.com/getlantern/systray"
	"github.com/pkg/browser"
)

func main() {
	systray.Run(onReady, onExit)
}

var mu sync.Mutex
var srv *http.Server
var hub *Hub
var lanURL string

func onReady() {
	systray.SetTitle("LanTalk")
	systray.SetTooltip("LanTalk Server")

	mStart := systray.AddMenuItem("Start", "Start LanTalk Server")
	mStop := systray.AddMenuItem("Stop", "Stop LanTalk Server")
	mOpen := systray.AddMenuItem("Open Browser", "Open LanTalk in Browser")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit LanTalk")

	// 默认自动启动服务
	mu.Lock()
	s, h, u, err := startServer()
	if err == nil {
		srv = s
		hub = h
		lanURL = u
		mStart.Hide()
		mStop.Show()
		mOpen.Show()
	} else {
		mStart.Show()
		mStop.Hide()
		mOpen.Hide()
	}
	mu.Unlock()

	go func() {
		for {
			select {
			case <-mStart.ClickedCh:
				mu.Lock()
				if srv == nil {
					s, h, u, err := startServer()
					if err == nil {
						srv = s
						hub = h
						lanURL = u
						mStart.Hide()
						mStop.Show()
						mOpen.Show()
					}
				}
				mu.Unlock()
			case <-mStop.ClickedCh:
				mu.Lock()
				if srv != nil {
					stopServer(srv, hub)
					srv = nil
					hub = nil
					lanURL = ""
					mStart.Show()
					mStop.Hide()
					mOpen.Hide()
				}
				mu.Unlock()
			case <-mOpen.ClickedCh:
				mu.Lock()
				u := lanURL
				mu.Unlock()
				if u != "" {
					browser.OpenURL(u)
				}
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func onExit() {
	mu.Lock()
	defer mu.Unlock()
	if srv != nil {
		stopServer(srv, hub)
	}
}
