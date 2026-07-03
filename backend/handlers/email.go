package handlers

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"time"
)

type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

var smtpCfg SMTPConfig

func init() {
	smtpCfg = SMTPConfig{
		Host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		Port:     getEnv("SMTP_PORT", "465"),
		Username: getEnv("SMTP_USERNAME", "contanciasugel08@gmail.com"),
		Password: getEnv("SMTP_PASSWORD", "jcqp quls filb kblm"),
		From:     getEnv("SMTP_FROM", "contanciasugel08@gmail.com"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

type plainAuth struct {
	user, pass string
}

func (a *plainAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	resp := []byte("\x00" + a.user + "\x00" + a.pass)
	return "PLAIN", resp, nil
}

func (a *plainAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		return nil, fmt.Errorf("unexpected server challenge")
	}
	return nil, nil
}

func sendEmail(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%s", smtpCfg.Host, smtpCfg.Port)
	log.Printf("[EMAIL] Conectando a %s...", addr)

	tlsConfig := &tls.Config{ServerName: smtpCfg.Host}
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 15 * time.Second}, "tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("no se pudo conectar a %s: %v", addr, err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, smtpCfg.Host)
	if err != nil {
		return fmt.Errorf("error creando cliente SMTP: %v", err)
	}
	defer client.Quit()

	auth := &plainAuth{user: smtpCfg.Username, pass: smtpCfg.Password}
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("error en autenticacion: %v", err)
	}

	if err = client.Mail(smtpCfg.From); err != nil {
		return fmt.Errorf("error MAIL FROM: %v", err)
	}

	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("error RCPT TO: %v", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("error DATA: %v", err)
	}

	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s\r\n", smtpCfg.From, to, subject, body))
	if _, err = w.Write(msg); err != nil {
		w.Close()
		return fmt.Errorf("error escribiendo mensaje: %v", err)
	}

	if err = w.Close(); err != nil {
		return fmt.Errorf("error cerrando DATA: %v", err)
	}

	log.Printf("[EMAIL] Correo enviado exitosamente a %s", to)
	return nil
}
