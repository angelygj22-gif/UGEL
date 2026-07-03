// Package handlers contiene los controladores HTTP y lógica de negocio
package handlers

import (
	"fmt"
	"net/smtp"
	"os"
)

// SMTPConfig almacena la configuración del servidor de correo
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

var smtpCfg SMTPConfig

// init configura el SMTP con variables de entorno o valores por defecto (Gmail)
func init() {
	smtpCfg = SMTPConfig{
		Host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		Port:     getEnv("SMTP_PORT", "587"),
		Username: getEnv("SMTP_USERNAME", "contanciasugel08@gmail.com"),
		Password: getEnv("SMTP_PASSWORD", "jcqp quls filb kblm"),
		From:     getEnv("SMTP_FROM", "contanciasugel08@gmail.com"),
	}
}

// getEnv retorna el valor de una variable de entorno o un fallback
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// sendEmail envía un correo HTML usando el SMTP configurado
func sendEmail(to, subject, body string) error {
	auth := smtp.PlainAuth("", smtpCfg.Username, smtpCfg.Password, smtpCfg.Host)
	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s\r\n", smtpCfg.From, to, subject, body))
	addr := fmt.Sprintf("%s:%s", smtpCfg.Host, smtpCfg.Port)
	return smtp.SendMail(addr, auth, smtpCfg.From, []string{to}, msg)
}
