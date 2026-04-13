//go:build !systray

package main

import (
	"os"
	"os/signal"
	"syscall"
)

func main() {
	srv, hub, _ := startServer()

	// Block main goroutine until interrupted
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	stopServer(srv, hub)
}
