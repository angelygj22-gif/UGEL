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
		Port:     getEnv("SMTP_PORT", "587"),
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

func sendEmail(to, subject, body string) error {
	auth := smtp.PlainAuth("", smtpCfg.Username, smtpCfg.Password, smtpCfg.Host)
	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s\r\n", smtpCfg.From, to, subject, body))
	addr := fmt.Sprintf("%s:%s", smtpCfg.Host, smtpCfg.Port)

	log.Printf("[EMAIL] Enviando correo a %s via %s...", to, addr)

	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return fmt.Errorf("no se pudo conectar a %s: %v", addr, err)
	}

	client, err := smtp.NewClient(conn, smtpCfg.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("error creando cliente SMTP: %v", err)
	}
	defer client.Close()

	tlsConfig := &tls.Config{ServerName: smtpCfg.Host}
	if err = client.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("error en STARTTLS: %v", err)
	}

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

	if _, err = w.Write(msg); err != nil {
		w.Close()
		return fmt.Errorf("error escribiendo mensaje: %v", err)
	}

	if err = w.Close(); err != nil {
		return fmt.Errorf("error cerrando DATA: %v", err)
	}

	log.Printf("[EMAIL] Correo enviado exitosamente a %s", to)
	return client.Quit()
}
