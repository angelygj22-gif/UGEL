package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"planillas-backend/handlers"
	"planillas-backend/middleware"
	"planillas-backend/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

func initDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://neondb_owner:npg_9RSHowM0eAnO@ep-little-violet-aq1yli6a-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Error conectando a la base de datos:", err)
	}

	db.AutoMigrate(
		&models.Usuario{},
		&models.Personal{},
		&models.Planilla{},
		&models.Ingreso{},
		&models.Descuento{},
	)

	crearUsuarioAdmin()

	log.Println("Base de datos conectada correctamente")
}

func crearUsuarioAdmin() {
	var count int64
	db.Model(&models.Usuario{}).Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		admin := models.Usuario{
			Nombre:       "Administrador",
			Email:        "admin@planillas.su",
			PasswordHash: string(hash),
			CreatedAt:   time.Now(),
		}
		db.Create(&admin)
		log.Println("Usuario admin creado: admin@planillas.su / admin123")
	}
}

func main() {
	initDB()

	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost", "http://localhost:5173", "http://localhost:80", "http://127.0.0.1", "http://127.0.0.1:5173", "https://ugel-two.vercel.app", "https://ugel-08-constancias.vercel.app"},
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
	}))

	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	r.Static("/uploads", "./uploads")

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		usuarios := api.Group("/usuarios")
		{
			usuarios.POST("/login", handlers.Login)
			usuarios.POST("/registro", handlers.RegistrarUsuario)
			usuarios.POST("/refresh", handlers.RefreshToken)
			usuarios.GET("/me", middleware.AuthRequired(), handlers.Me)
			usuarios.POST("/forgot-password", handlers.ForgotPassword)
			usuarios.POST("/reset-password", handlers.ResetPassword)
		}

		personal := api.Group("/personal")
		personal.Use(middleware.AuthRequired())
		{
			personal.GET("", handlers.ListarPersonal)
			personal.GET("/buscar", handlers.BuscarPersonal)
			personal.GET("/:id", handlers.ObtenerPersonal)
			personal.POST("", handlers.CrearPersonal)
			personal.PUT("/:id", handlers.ActualizarPersonal)
			personal.DELETE("/:id", handlers.EliminarPersonal)
			personal.GET("/:id/periodos", handlers.ObtenerPeriodosPersonal)
			personal.GET("/:id/exportar", handlers.ExportarPlanillasPersonal)
		}

		planillas := api.Group("/planillas")
		planillas.Use(middleware.AuthRequired())
		{
			planillas.GET("", handlers.ListarPlanillas)
			planillas.GET("/:id", handlers.ObtenerPlanilla)
			planillas.POST("", handlers.CrearPlanilla)
			planillas.PUT("/:id", handlers.ActualizarPlanilla)
			planillas.DELETE("/:id", handlers.EliminarPlanilla)
			planillas.GET("/:id/ingresos", handlers.ListarIngresos)
			planillas.GET("/:id/descuentos", handlers.ListarDescuentos)
			planillas.PUT("/:id/editar", handlers.EditarPlanillaCompleta)
		}

		ingresos := api.Group("/ingresos")
		ingresos.Use(middleware.AuthRequired())
		{
			ingresos.POST("", handlers.CrearIngreso)
			ingresos.PUT("/:id", handlers.ActualizarIngreso)
			ingresos.DELETE("/:id", handlers.EliminarIngreso)
		}

		descuentos := api.Group("/descuentos")
		descuentos.Use(middleware.AuthRequired())
		{
			descuentos.POST("", handlers.CrearDescuento)
			descuentos.PUT("/:id", handlers.ActualizarDescuento)
			descuentos.DELETE("/:id", handlers.EliminarDescuento)
		}

		importar := api.Group("/importar")
		importar.Use(middleware.AuthRequired())
		{
			importar.POST("/excel", handlers.ImportarExcel)
			importar.POST("/json", handlers.ImportarJSON)
			importar.POST("/haberes", handlers.ImportarHaberes)
		}

		dashboard := api.Group("/dashboard")
		dashboard.Use(middleware.AuthRequired())
		{
			dashboard.GET("/resumen", handlers.ResumenDashboard)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Servidor iniciado en el puerto %s", port)
	if err := r.Run(":" + port); err != nil {
		fmt.Println("Error al iniciar el servidor:", err)
	}
}
