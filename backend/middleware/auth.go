// Package middleware provee autenticación JWT para el sistema de planillas
package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "planillas-su-secret-key-change-in-production"
	}
	jwtSecret = []byte(secret)
}

// Claims contiene los datos del usuario en el token de acceso
type Claims struct {
	UserID uint   `json:"user_id"`
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// RefreshClaims contiene solo el ID para tokens de renovación
type RefreshClaims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateAccessToken genera un JWT de acceso (10 min o 7 días con rememberMe)
func GenerateAccessToken(userID uint, nombre, email string, rememberMe bool) (string, error) {
	expiry := 10 * time.Minute
	if rememberMe {
		expiry = 7 * 24 * time.Hour
	}
	claims := Claims{
		UserID: userID,
		Nombre: nombre,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// GenerateRefreshToken genera un JWT para renovar el access token (24h o 7d)
func GenerateRefreshToken(userID uint, rememberMe bool) (string, error) {
	expiry := 24 * time.Hour
	if rememberMe {
		expiry = 7 * 24 * time.Hour
	}
	claims := RefreshClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken verifica y retorna los claims de un access token
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

// ValidateRefreshToken verifica y retorna los claims de un refresh token
func ValidateRefreshToken(tokenString string) (*RefreshClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*RefreshClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

// AuthRequired es un middleware que protege rutas requiriendo un JWT válido
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token requerido"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de token inválido"})
			c.Abort()
			return
		}

		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido o expirado"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_nombre", claims.Nombre)
		c.Set("user_email", claims.Email)
		c.Next()
	}
}
