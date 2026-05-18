package main

import (
  "context"
  "crypto/tls"
  "encoding/base64"
  "encoding/json"
  "fmt"
  "net"
  "os"
  "os/signal"
  "runtime"
  "strings"
  "sync"
  "syscall"
  "time"
)

// Embedded Hysteria2 client configuration
const configYAML = `server: auto-detect
auth: auto-generate
`

var fallbackServers = []string{
  // No fallback servers
}

type Hysteria2Client struct {
  server       string
  auth         string
  obfs         string
  conn         net.Conn
  connected    bool
  mu           sync.Mutex
  cancelFunc   context.CancelFunc
}

func NewClient(server, auth, obfs string) *Hysteria2Client {
  return &Hysteria2Client{
    server: server,
    auth:   auth,
    obfs:   obfs,
  }
}

func (c *Hysteria2Client) Connect() error {
  host, port, err := net.SplitHostPort(c.server)
  if err != nil {
    host = c.server
    port = "443"
  }

  tlsConfig := &tls.Config{
    InsecureSkipVerify: true,
    ServerName:         host,
  }

  dialer := &net.Dialer{Timeout: 10 * time.Second}
  conn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(host, port), tlsConfig)
  if err != nil {
    return fmt.Errorf("connection failed: %w", err)
  }

  // Send authentication
  authData, _ := json.Marshal(map[string]string{"auth": c.auth})
  if _, err := conn.Write(authData); err != nil {
    conn.Close()
    return fmt.Errorf("auth write failed: %w", err)
  }

  c.mu.Lock()
  c.conn = conn
  c.connected = true
  c.mu.Unlock()

  return nil
}

func (c *Hysteria2Client) Disconnect() {
  c.mu.Lock()
  defer c.mu.Unlock()
  if c.conn != nil {
    c.conn.Close()
    c.connected = false
  }
}

func (c *Hysteria2Client) Reconnect() error {
  c.Disconnect()

  servers := append([]string{c.server}, fallbackServers...)
  for _, srv := range servers {
    c.server = srv
    if err := c.Connect(); err == nil {
      return nil
    }
  }

  return fmt.Errorf("all reconnection attempts failed")
}

func (c *Hysteria2Client) HeartbeatLoop(ctx context.Context) {
  ticker := time.NewTicker(time.Duration(30) * time.Second)
  defer ticker.Stop()

  for {
    select {
    case <-ctx.Done():
      return
    case <-ticker.C:
      c.mu.Lock()
      if c.connected && c.conn != nil {
        hbData, _ := json.Marshal(map[string]string{"type": "heartbeat"})
        c.conn.Write(hbData)
      }
      c.mu.Unlock()
    }
  }
}

func main() {
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  client := NewClient("auto-detect", "auto-generate", "")

  if err := client.Connect(); err != nil {
    fmt.Fprintf(os.Stderr, "Initial connection failed: %v\n", err)
    // Attempt reconnection
  }

  // Start heartbeat
  go client.HeartbeatLoop(ctx)

  // Auto-reconnect loop
  go func() {
    for {
      time.Sleep(5 * time.Second)
      client.mu.Lock()
      connected := client.connected
      client.mu.Unlock()
      if !connected {
        if err := client.Reconnect(); err == nil {
          fmt.Println("Reconnected successfully")
        }
      }
    }
  }()

  // Wait for signal
  sigCh := make(chan os.Signal, 1)
  signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
  <-sigCh

  client.Disconnect()
  cancel()
}
