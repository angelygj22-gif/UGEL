package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type EmailJSConfig struct {
	ServiceID  string
	TemplateID string
	PublicKey  string
	PrivateKey string
}

var emailCfg EmailJSConfig

func init() {
	emailCfg = EmailJSConfig{
		ServiceID:  getEnv("EMAILJS_SERVICE_ID", "service_k4g6qei"),
		TemplateID: getEnv("EMAILJS_TEMPLATE_ID", "template_dzkkt25"),
		PublicKey:  getEnv("EMAILJS_PUBLIC_KEY", "o4Ab5rcItZHiiO54w"),
		PrivateKey: getEnv("EMAILJS_PRIVATE_KEY", "3QLFmQ9NuEUdT67yP_G8X"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

type emailJSRequest struct {
	ServiceID  string            `json:"service_id"`
	TemplateID string            `json:"template_id"`
	UserID     string            `json:"user_id"`
	AccessToken string           `json:"accessToken"`
	TemplateParams map[string]string `json:"template_params"`
}

func sendEmail(to, subject, html string, params map[string]string) error {
	templateParams := map[string]string{
		"to_email": to,
		"subject":  subject,
		"message":  html,
	}
	for k, v := range params {
		templateParams[k] = v
	}

	payload := emailJSRequest{
		ServiceID:      emailCfg.ServiceID,
		TemplateID:     emailCfg.TemplateID,
		UserID:         emailCfg.PublicKey,
		AccessToken:    emailCfg.PrivateKey,
		TemplateParams: templateParams,
	}

	bodyBytes, _ := json.Marshal(payload)
	log.Printf("[EMAILJS] Enviando correo a %s...", to)

	req, err := http.NewRequest("POST", "https://api.emailjs.com/api/v1.0/email/send", bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("error creando request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error enviando a EmailJS: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("EmailJS respondio con status %d", resp.StatusCode)
	}

	log.Printf("[EMAILJS] Correo enviado exitosamente a %s", to)
	return nil
}
