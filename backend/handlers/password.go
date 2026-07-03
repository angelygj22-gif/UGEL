package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"

	"planillas-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ForgotPassword genera un token de recuperación y envía un correo al usuario
func ForgotPassword(c *gin.Context) {
	db := getDB(c)
	var input struct {
		Email string `json:"email" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Correo requerido"})
		return
	}

	var usuario models.Usuario
	if err := db.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"})
		return
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		log.Printf("Error generando token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar token"})
		return
	}
	token := hex.EncodeToString(tokenBytes)
	expiry := time.Now().Add(1 * time.Hour)

	db.Model(&usuario).Updates(map[string]interface{}{
		"reset_token":        token,
		"reset_token_expiry": expiry,
	})

	frontendURL := getEnv("FRONTEND_URL", "https://ugel-08-constancias.vercel.app")
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	subject := "Restablece tu contraseña - Planillas SU"

	if err := sendEmail(usuario.Email, subject, "", map[string]string{
		"email":   usuario.Email,
		"from_name": "Planillas SU",
		"to_name": usuario.Nombre,
		"link":    resetLink,
		"enlace":  resetLink,
	}); err != nil {
		log.Printf("Error enviando email a %s: %v", usuario.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error al enviar correo: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"})
}

// ResetPassword valida el token y actualiza la contraseña del usuario
func ResetPassword(c *gin.Context) {
	db := getDB(c)
	var input struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=4"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token y nueva contraseña requeridos (mín. 4 caracteres)"})
		return
	}

	var usuario models.Usuario
	if err := db.Where("reset_token = ?", input.Token).First(&usuario).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Token inválido o ya fue usado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al buscar usuario"})
		return
	}

	if usuario.ResetTokenExpiry == nil || time.Now().After(*usuario.ResetTokenExpiry) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El token ha expirado. Solicita un nuevo restablecimiento."})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar contraseña"})
		return
	}

	db.Model(&usuario).Updates(map[string]interface{}{
		"password_hash":      string(hash),
		"reset_token":        nil,
		"reset_token_expiry": nil,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Contraseña restablecida correctamente"})
}
