//go:build systray

package main

import (
	"net/http"

	"github.com/getlantern/systray"
	"github.com/pkg/browser"
)

func main() {
	systray.Run(onReady, onExit)
}

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

	// Initialize states: only Start and Quit are visible initially
	mStart.Show()
	mStop.Hide()
	mOpen.Hide()

	go func() {
		for {
			select {
			case <-mStart.ClickedCh:
				if srv == nil {
					srv, hub, lanURL = startServer()
					mStart.Hide()
					mStop.Show()
					mOpen.Show()
				}
			case <-mStop.ClickedCh:
				if srv != nil {
					stopServer(srv, hub)
					srv = nil
					hub = nil
					lanURL = ""
					mStart.Show()
					mStop.Hide()
					mOpen.Hide()
				}
			case <-mOpen.ClickedCh:
				if lanURL != "" {
					browser.OpenURL(lanURL)
				}
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func onExit() {
	if srv != nil {
		stopServer(srv, hub)
	}
}
