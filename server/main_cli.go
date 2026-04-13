//go:build !systray

package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	srv, hub, _, err := startServer()
	if err != nil {
		log.Fatalf("Failed to start server: %v\n", err)
	}

	// Block main goroutine until interrupted
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	stopServer(srv, hub)
}
