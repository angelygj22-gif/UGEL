package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"planillas-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func getDB(c *gin.Context) *gorm.DB {
	return c.MustGet("db").(*gorm.DB)
}

func Login(c *gin.Context) {
	db := getDB(c)
	var input struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	var usuario models.Usuario
	if err := db.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
		return
	}

	token := fmt.Sprintf("token_%d_%d", usuario.ID, time.Now().Unix())

	c.JSON(http.StatusOK, gin.H{
		"message": "Login exitoso",
		"token":   token,
		"user": gin.H{
			"id":     usuario.ID,
			"nombre": usuario.Nombre,
			"email":  usuario.Email,
		},
	})
}

func RegistrarUsuario(c *gin.Context) {
	db := getDB(c)
	var input models.Usuario

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar password"})
		return
	}
	input.PasswordHash = string(hash)
	input.CreatedAt = time.Now()

	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear usuario"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Usuario creado", "user": input})
}

func ListarPersonal(c *gin.Context) {
	db := getDB(c)
	var personal []models.Personal
	var total int64

	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort_by", "apellidos")
	sortOrder := c.DefaultQuery("sort_order", "asc")
	
	if limit > 100 { limit = 100 }
	offset := (page - 1) * limit

	// Validar campos de ordenamiento
	validSortFields := map[string]bool{"apellidos": true, "nombres": true, "dni": true, "created_at": true, "activo": true, "colegio": true, "distrito": true}
	if !validSortFields[sortBy] {
		sortBy = "apellidos"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "asc"
	}

	baseQuery := db.Model(&models.Personal{})

	// Filtro por búsqueda
	if search != "" {
		baseQuery = baseQuery.Where("nombres ILIKE ? OR apellidos ILIKE ? OR dni ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filtro por puesto
	puesto := c.Query("puesto")
	if puesto != "" {
		baseQuery = baseQuery.Where("puesto ILIKE ?", "%"+puesto+"%")
	}

	// Filtro por RD
	rd := c.Query("rd")
	if rd != "" {
		baseQuery = baseQuery.Where("rd ILIKE ?", "%"+rd+"%")
	}

	// Filtro por UU
	uu := c.Query("uu")
	if uu != "" {
		baseQuery = baseQuery.Where("uu ILIKE ?", "%"+uu+"%")
	}

	baseQuery.Count(&total)
	
	// Ordenar dinámicamente
	orderStr := sortBy
	if sortOrder == "desc" {
		orderStr += " DESC"
	} else {
		orderStr += " ASC"
	}
	// Agregar segundo ordenamiento por nombres si es apellido
	if sortBy == "apellidos" {
		orderStr += ", nombres ASC"
	}
	
	baseQuery.Offset(offset).Limit(limit).Order(orderStr).Find(&personal)

	c.JSON(http.StatusOK, gin.H{
		"data": personal,
		"total": total,
		"page": page,
		"limit": limit,
		"total_pages": (int(total) + limit - 1) / limit,
	})
}

func BuscarPersonal(c *gin.Context) {
	db := getDB(c)
	search := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if search == "" {
		c.JSON(http.StatusOK, gin.H{"data": []models.Personal{}})
		return
	}

	var personal []models.Personal
	db.Where("nombres ILIKE ? OR apellidos ILIKE ? OR dni ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%").
		Limit(limit).
		Order("apellidos, nombres").
		Find(&personal)

	c.JSON(http.StatusOK, gin.H{"data": personal})
}

func ObtenerPersonal(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var personal models.Personal

	if err := db.First(&personal, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal no encontrado"})
		return
	}

	c.JSON(http.StatusOK, personal)
}

func CrearPersonal(c *gin.Context) {
	db := getDB(c)
	var personal models.Personal

	if err := c.ShouldBindJSON(&personal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	personal.CreatedAt = time.Now()
	if err := db.Create(&personal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear personal"})
		return
	}

	c.JSON(http.StatusCreated, personal)
}

func ActualizarPersonal(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var personal models.Personal

	if err := db.First(&personal, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal no encontrado"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := db.Model(&personal).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	c.JSON(http.StatusOK, personal)
}

func EliminarPersonal(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")

	if err := db.Delete(&models.Personal{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Eliminado correctamente"})
}

func ListarPlanillas(c *gin.Context) {
	db := getDB(c)
	var planillas []models.Planilla
	var total int64

	mes := c.Query("mes")
	anio := c.Query("anio")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort_by", "anio")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	
	if limit > 100 { limit = 100 }
	offset := (page - 1) * limit

	// Validar campos de ordenamiento
	validSortFields := map[string]bool{"anio": true, "mes": true, "total_haberes": true, "total_descuentos": true, "total_liquido": true, "created_at": true}
	if !validSortFields[sortBy] {
		sortBy = "anio"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	baseQuery := db.Model(&models.Planilla{}).Preload("Personal")

	if mes != "" {
		mesInt, _ := strconv.Atoi(mes)
		if mesInt > 0 && mesInt <= 12 {
			baseQuery = baseQuery.Where("mes = ?", mesInt)
		}
	}
	if anio != "" {
		anioInt, _ := strconv.Atoi(anio)
		if anioInt > 0 {
			baseQuery = baseQuery.Where("anio = ?", anioInt)
		}
	}
	if search != "" {
		baseQuery = baseQuery.Joins("JOIN personal ON personal.id = planilla.personal_id").
			Where("personal.nombres ILIKE ? OR personal.apellidos ILIKE ? OR personal.dni ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filtro por rango de haberes
	minHaberes := c.Query("min_haberes")
	maxHaberes := c.Query("max_haberes")
	if minHaberes != "" {
		minVal, _ := strconv.ParseFloat(minHaberes, 64)
		if minVal > 0 {
			baseQuery = baseQuery.Where("total_haberes >= ?", minVal)
		}
	}
	if maxHaberes != "" {
		maxVal, _ := strconv.ParseFloat(maxHaberes, 64)
		if maxVal > 0 {
			baseQuery = baseQuery.Where("total_haberes <= ?", maxVal)
		}
	}

	// Filtro por rango de descuentos
	minDescuentos := c.Query("min_descuentos")
	maxDescuentos := c.Query("max_descuentos")
	if minDescuentos != "" {
		minVal, _ := strconv.ParseFloat(minDescuentos, 64)
		if minVal > 0 {
			baseQuery = baseQuery.Where("total_descuentos >= ?", minVal)
		}
	}
	if maxDescuentos != "" {
		maxVal, _ := strconv.ParseFloat(maxDescuentos, 64)
		if maxVal > 0 {
			baseQuery = baseQuery.Where("total_descuentos <= ?", maxVal)
		}
	}

	baseQuery.Count(&total)
	
	// Ordenar dinámicamente
	orderStr := sortBy
	if sortOrder == "desc" {
		orderStr += " DESC"
	} else {
		orderStr += " ASC"
	}
	if sortBy == "anio" {
		orderStr += ", mes DESC"
	}
	
	baseQuery.Offset(offset).Limit(limit).Order(orderStr).Find(&planillas)

	for i := range planillas {
		planillas[i].CalculateTotal()
	}

	c.JSON(http.StatusOK, gin.H{
		"data": planillas,
		"total": total,
		"page": page,
		"limit": limit,
		"total_pages": (int(total) + limit - 1) / limit,
	})
}

func ObtenerPlanilla(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var planilla models.Planilla

	if err := db.Preload("Personal").Preload("Ingresos").Preload("Descuentos").First(&planilla, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Planilla no encontrada"})
		return
	}

	planilla.CalculateTotal()
	c.JSON(http.StatusOK, planilla)
}

func EditarPlanillaCompleta(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")

	var planilla models.Planilla
	if err := db.Preload("Personal").Preload("Ingresos").Preload("Descuentos").First(&planilla, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Planilla no encontrada"})
		return
	}

	var input struct {
		PersonalID uint   `json:"personal_id"`
		Mes        int16  `json:"mes"`
		Anio       int16  `json:"anio"`
		Ingresos   []struct {
			ID    uint    `json:"id"`
			Tipo  string  `json:"tipo"`
			Monto float64 `json:"monto"`
		} `json:"ingresos"`
		Descuentos []struct {
			ID    uint    `json:"id"`
			Tipo  string  `json:"tipo"`
			Monto float64 `json:"monto"`
		} `json:"descuentos"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	// Actualizar datos de planilla
	updates := map[string]interface{}{}
	if input.PersonalID > 0 && input.PersonalID != planilla.PersonalID {
		updates["personal_id"] = input.PersonalID
	}
	if input.Mes > 0 {
		updates["mes"] = input.Mes
	}
	if input.Anio > 0 {
		updates["anio"] = input.Anio
	}

	if len(updates) > 0 {
		db.Model(&planilla).Updates(updates)
	}

	// Actualizar ingresos existentes y agregar nuevos
	for _, ing := range input.Ingresos {
		if ing.ID > 0 {
			// Actualizar existente
			db.Model(&models.Ingreso{}).Where("id = ?", ing.ID).Updates(map[string]interface{}{
				"tipo":  ing.Tipo,
				"monto": ing.Monto,
			})
		} else if ing.Tipo != "" && ing.Monto > 0 {
			// Crear nuevo
			db.Create(&models.Ingreso{PlanillaID: planilla.ID, Tipo: ing.Tipo, Monto: ing.Monto})
		}
	}

	// Actualizar descuentos existentes y agregar nuevos
	for _, desc := range input.Descuentos {
		if desc.ID > 0 {
			db.Model(&models.Descuento{}).Where("id = ?", desc.ID).Updates(map[string]interface{}{
				"tipo":  desc.Tipo,
				"monto": desc.Monto,
			})
		} else if desc.Tipo != "" && desc.Monto > 0 {
			db.Create(&models.Descuento{PlanillaID: planilla.ID, Tipo: desc.Tipo, Monto: desc.Monto})
		}
	}

	// Recargar planilla
	db.Preload("Personal").Preload("Ingresos").Preload("Descuentos").First(&planilla, id)
	planilla.CalculateTotal()

	c.JSON(http.StatusOK, gin.H{"message": "Planilla actualizada", "planilla": planilla})
}

func CrearPlanilla(c *gin.Context) {
	db := getDB(c)
	var planilla models.Planilla

	if err := c.ShouldBindJSON(&planilla); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	planilla.CreadoEn = time.Now()

	var existing models.Planilla
	if err := db.Where("personal_id = ? AND mes = ? AND anio = ?", planilla.PersonalID, planilla.Mes, planilla.Anio).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe una planilla para este personal en el período"})
		return
	}

	if err := db.Create(&planilla).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear planilla"})
		return
	}

	c.JSON(http.StatusCreated, planilla)
}

func ActualizarPlanilla(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var planilla models.Planilla

	if err := db.First(&planilla, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Planilla no encontrada"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := db.Model(&planilla).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	c.JSON(http.StatusOK, planilla)
}

func EliminarPlanilla(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")

	if err := db.Delete(&models.Planilla{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Eliminado correctamente"})
}

func ListarIngresos(c *gin.Context) {
	db := getDB(c)
	planillaID := c.Param("id")
	var ingresos []models.Ingreso

	db.Where("planilla_id = ?", planillaID).Find(&ingresos)
	c.JSON(http.StatusOK, ingresos)
}

func ListarDescuentos(c *gin.Context) {
	db := getDB(c)
	planillaID := c.Param("id")
	var descuentos []models.Descuento

	db.Where("planilla_id = ?", planillaID).Find(&descuentos)
	c.JSON(http.StatusOK, descuentos)
}

func CrearIngreso(c *gin.Context) {
	db := getDB(c)
	var ingreso models.Ingreso

	if err := c.ShouldBindJSON(&ingreso); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := db.Create(&ingreso).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear ingreso"})
		return
	}

	c.JSON(http.StatusCreated, ingreso)
}

func ActualizarIngreso(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var ingreso models.Ingreso

	if err := db.First(&ingreso, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ingreso no encontrado"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	db.Model(&ingreso).Updates(input)

	var planilla models.Planilla
	db.First(&planilla, ingreso.PlanillaID)
	db.Model(&planilla).Update("total_haberes", gorm.Expr("COALESCE((SELECT SUM(monto) FROM ingresos WHERE planilla_id = ?), 0)", ingreso.PlanillaID))

	c.JSON(http.StatusOK, ingreso)
}

func EliminarIngreso(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var ingreso models.Ingreso

	if err := db.First(&ingreso, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ingreso no encontrado"})
		return
	}

	planillaID := ingreso.PlanillaID
	db.Delete(&ingreso)

	var planilla models.Planilla
	db.First(&planilla, planillaID)
	db.Model(&planilla).Update("total_haberes", gorm.Expr("COALESCE((SELECT SUM(monto) FROM ingresos WHERE planilla_id = ?), 0)", planillaID))

	c.JSON(http.StatusOK, gin.H{"message": "Eliminado correctamente"})
}

func CrearDescuento(c *gin.Context) {
	db := getDB(c)
	var descuento models.Descuento

	if err := c.ShouldBindJSON(&descuento); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := db.Create(&descuento).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear descuento"})
		return
	}

	c.JSON(http.StatusCreated, descuento)
}

func ActualizarDescuento(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var descuento models.Descuento

	if err := db.First(&descuento, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Descuento no encontrado"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	db.Model(&descuento).Updates(input)

	var planilla models.Planilla
	db.First(&planilla, descuento.PlanillaID)
	db.Model(&planilla).Update("total_descuentos", gorm.Expr("COALESCE((SELECT SUM(monto) FROM descuentos WHERE planilla_id = ?), 0)", descuento.PlanillaID))

	c.JSON(http.StatusOK, descuento)
}

func EliminarDescuento(c *gin.Context) {
	db := getDB(c)
	id := c.Param("id")
	var descuento models.Descuento

	if err := db.First(&descuento, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Descuento no encontrado"})
		return
	}

	planillaID := descuento.PlanillaID
	db.Delete(&descuento)

	var planilla models.Planilla
	db.First(&planilla, planillaID)
	db.Model(&planilla).Update("total_descuentos", gorm.Expr("COALESCE((SELECT SUM(monto) FROM descuentos WHERE planilla_id = ?), 0)", planillaID))

	c.JSON(http.StatusOK, gin.H{"message": "Eliminado correctamente"})
}

func importarData(db *gorm.DB, data *models.DataExcel) (int, int, []string) {
	personalCreados := 0
	planillasCreadas := 0
	warnings := []string{}

	// personalIDs[i] = DB id for data.Personal[i]
	personalIDs := make([]uint, len(data.Personal))

	for i, p := range data.Personal {
		var existing models.Personal
		found := false

		if p.DNI != "" {
			if err := db.Where("dni = ?", p.DNI).First(&existing).Error; err == nil {
				found = true
			}
		}
		if !found && p.Nombres != "" {
			if err := db.Where("nombres = ?", p.Nombres).First(&existing).Error; err == nil {
				found = true
			}
		}

		if found {
			personalIDs[i] = existing.ID
		} else if p.Nombres != "" {
			p.CreatedAt = time.Now()
			if err := db.Create(&p).Error; err == nil {
				personalIDs[i] = p.ID
				personalCreados++
			} else {
				warnings = append(warnings, fmt.Sprintf("No se pudo crear personal '%s': %v", p.Nombres, err))
			}
		} else {
			warnings = append(warnings, fmt.Sprintf("Bloque %d ignorado: sin nombre ni DNI", i+1))
		}
	}

	for i, pl := range data.Planillas {
		if i >= len(personalIDs) || personalIDs[i] == 0 {
			continue
		}
		personalID := personalIDs[i]

		var planilla models.Planilla
		db.Where("personal_id = ? AND mes = ? AND anio = ?", personalID, pl.Mes, pl.Anio).First(&planilla)

		if planilla.ID == 0 {
			planilla = models.Planilla{
				PersonalID: personalID,
				Mes:        int16(pl.Mes),
				Anio:       int16(pl.Anio),
				CreadoEn:   time.Now(),
			}
			db.Create(&planilla)
			planillasCreadas++

			for _, ing := range pl.Ingresos {
				db.Create(&models.Ingreso{PlanillaID: planilla.ID, Tipo: ing.Tipo, Monto: ing.Monto})
			}
			for _, desc := range pl.Descuentos {
				db.Create(&models.Descuento{PlanillaID: planilla.ID, Tipo: desc.Tipo, Monto: desc.Monto})
			}
		}

		// Recalculate totals
		var totalHab, totalDesc float64
		db.Model(&models.Ingreso{}).Where("planilla_id = ?", planilla.ID).
			Select("COALESCE(SUM(monto), 0)").Scan(&totalHab)
		db.Model(&models.Descuento{}).Where("planilla_id = ?", planilla.ID).
			Select("COALESCE(SUM(monto), 0)").Scan(&totalDesc)
		db.Model(&planilla).Updates(map[string]interface{}{
			"total_haberes":    totalHab,
			"total_descuentos": totalDesc,
		})
	}

	return personalCreados, planillasCreadas, warnings
}

func ImportarExcel(c *gin.Context) {
	db := getDB(c)

	// Read optional period override from form fields
	mesOverride := 0
	anioOverride := 0
	if ms := c.PostForm("mes"); ms != "" {
		if v, err := strconv.Atoi(ms); err == nil && v >= 1 && v <= 12 {
			mesOverride = v
		}
	}
	if ay := c.PostForm("anio"); ay != "" {
		if v, err := strconv.Atoi(ay); err == nil && v >= 2000 {
			anioOverride = v
		}
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se pudo obtener el archivo"})
		return
	}

	filename := fmt.Sprintf("uploads/%d_%s", time.Now().Unix(), file.Filename)
	if err := c.SaveUploadedFile(file, filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar archivo: " + err.Error()})
		return
	}

	data, err := ReadExcelFile(filename)
	if err != nil {
		log.Printf("ReadExcelFile error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al leer Excel: " + err.Error()})
		return
	}

	if len(data.Planillas) == 0 && len(data.Personal) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message":           "No se encontraron datos en el archivo. Verifique el formato.",
			"personal_creados":  0,
			"planillas_creadas": 0,
			"personal":          0,
			"planillas":         0,
		})
		return
	}

	// Apply period override: user's selection always wins
	if mesOverride > 0 || anioOverride > 0 {
		for i := range data.Planillas {
			if mesOverride > 0 {
				data.Planillas[i].Mes = mesOverride
			}
			if anioOverride > 0 {
				data.Planillas[i].Anio = anioOverride
			}
		}
	}

	// Check if any planilla already exists for the periods being imported
	periodos := map[string]bool{}
	for _, pl := range data.Planillas {
		key := fmt.Sprintf("%d-%d", pl.Mes, pl.Anio)
		if !periodos[key] {
			periodos[key] = true
			var count int64
			db.Model(&models.Planilla{}).Where("mes = ? AND anio = ?", pl.Mes, pl.Anio).Count(&count)
			if count > 0 {
				c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Este mes y año ya fue importado antes: %d/%d", pl.Mes, pl.Anio)})
				return
			}
		}
	}

	personalCreados, planillasCreadas, warnings := importarData(db, data)
	c.JSON(http.StatusOK, gin.H{
		"message":           "Importación completada",
		"personal_creados":  personalCreados,
		"planillas_creadas": planillasCreadas,
		"personal":          len(data.Personal),
		"planillas":         len(data.Planillas),
		"errores":           warnings,
	})
}

func ImportarJSON(c *gin.Context) {
	db := getDB(c)

	var data models.DataExcel
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido: " + err.Error()})
		return
	}

	// Check if any planilla already exists for the periods being imported
	periodos := map[string]bool{}
	for _, pl := range data.Planillas {
		key := fmt.Sprintf("%d-%d", pl.Mes, pl.Anio)
		if !periodos[key] {
			periodos[key] = true
			var count int64
			db.Model(&models.Planilla{}).Where("mes = ? AND anio = ?", pl.Mes, pl.Anio).Count(&count)
			if count > 0 {
				c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Este mes y año ya fue importado antes: %d/%d", pl.Mes, pl.Anio)})
				return
			}
		}
	}

	personalCreados, planillasCreadas, warnings := importarData(db, &data)
	c.JSON(http.StatusOK, gin.H{
		"message":           "Importación completada",
		"personal_creados":  personalCreados,
		"planillas_creadas": planillasCreadas,
		"personal":          len(data.Personal),
		"planillas":         len(data.Planillas),
		"errores":           warnings,
	})
}

// ImportarHaberes handles the JSON payload produced by the Python extractor.
// Format: { mes, anio, total_empleados, empleados: [{nombre, cargo, resolucion, codigo, dni, haberes:[{concepto,monto}], descuentos:[{concepto,monto}], ...}] }
func ImportarHaberes(c *gin.Context) {
	db := getDB(c)

	var payload models.HaberesPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido: " + err.Error()})
		return
	}

	if payload.Mes == nil || payload.Anio == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requieren los campos mes y anio"})
		return
	}

	mes := *payload.Mes
	anio := *payload.Anio

	if mes < 1 || mes > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mes inválido (debe ser 1-12)"})
		return
	}

	personalCreados := 0
	personalActualizados := 0
	planillasCreadas := 0
	duplicados := []string{}
	var warnings []string

	for _, emp := range payload.Empleados {
		var personal models.Personal
		found := false

		// ESTRATEGIA DE IDENTIFICACIÓN:
		// 1. Primero buscar por DNI exacto
		// 2. Si no tiene DNI o no se encuentra, buscar por nombre
		// 3. Si hay múltiples por nombre, marcar como duplicado

		if emp.DNI != nil && *emp.DNI != "" {
			// Buscar por DNI exacto
			if err := db.Where("dni = ?", *emp.DNI).First(&personal).Error; err == nil {
				found = true
				fmt.Printf("[DEBUG] Encontrado por DNI: %s (ID=%d)\n", *emp.DNI, personal.ID)
			}
		}

		if !found && emp.Nombre != "" {
			// Buscar por nombres (case insensitive)
			var results []models.Personal
			db.Where("LOWER(nombres) = LOWER(?)", emp.Nombre).Find(&results)

			if len(results) == 1 {
				personal = results[0]
				found = true
				fmt.Printf("[DEBUG] Encontrado por nombre: %s (ID=%d)\n", emp.Nombre, personal.ID)
			} else if len(results) > 1 {
				// Múltiples coincidencias - marcar duplicado
				duplicados = append(duplicados, fmt.Sprintf("'%s' - múltiples coincidencias en BD", emp.Nombre))
				fmt.Printf("[DEBUG] DUPLICADO: %s tiene %d coincidencias\n", emp.Nombre, len(results))
			}
		}

		if !found {
			if emp.Nombre == "" {
				warnings = append(warnings, "Empleado ignorado: sin nombre")
				continue
			}

			// Crear nuevo empleado
			parts := splitName(emp.Nombre)
			personal = models.Personal{
				Nombres:   parts.nombres,
				Apellidos: parts.apellidos,
				CreatedAt: time.Now(),
			}
			if emp.DNI != nil {
				personal.DNI = *emp.DNI
			}
			if emp.Cargo != nil {
				personal.Puesto = *emp.Cargo
			}
			if emp.Resolucion != nil {
				personal.RD = *emp.Resolucion
			}
			if emp.Codigo != nil {
				personal.UU = *emp.Codigo
			}
			if emp.Colegio != nil {
				personal.Colegio = *emp.Colegio
			}
			if emp.Distrito != nil {
				personal.Distrito = *emp.Distrito
			}
			if err := db.Create(&personal).Error; err != nil {
				fmt.Printf("[DEBUG] Error creating personal '%s': %v\n", emp.Nombre, err)
				warnings = append(warnings, fmt.Sprintf("No se pudo crear '%s': %v", emp.Nombre, err))
				continue
			}
			fmt.Printf("[DEBUG] Created new personal ID=%d for '%s'\n", personal.ID, emp.Nombre)
			personalCreados++
		} else {
			// Actualizar datos existentes si vienen nuevos
			updates := map[string]interface{}{}
			if emp.DNI != nil && *emp.DNI != "" && personal.DNI == "" {
				updates["dni"] = *emp.DNI
			}
			if emp.Cargo != nil && *emp.Cargo != "" && personal.Puesto == "" {
				updates["puesto"] = *emp.Cargo
			}
			if emp.Resolucion != nil && *emp.Resolucion != "" && personal.RD == "" {
				updates["rd"] = *emp.Resolucion
			}
			if emp.Codigo != nil && *emp.Codigo != "" && personal.UU == "" {
				updates["uu"] = *emp.Codigo
			}
			if emp.Colegio != nil && *emp.Colegio != "" && personal.Colegio == "" {
				updates["colegio"] = *emp.Colegio
			}
			if emp.Distrito != nil && *emp.Distrito != "" && personal.Distrito == "" {
				updates["distrito"] = *emp.Distrito
			}
			if len(updates) > 0 {
				db.Model(&personal).Updates(updates)
				personalActualizados++
			}
		}

		// Find or create planilla for this period
		var planilla models.Planilla
		err := db.Where("personal_id = ? AND mes = ? AND anio = ?", personal.ID, mes, anio).First(&planilla).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			warnings = append(warnings, fmt.Sprintf("Error al buscar planilla para '%s': %v", emp.Nombre, err))
			continue
		}

		if planilla.ID == 0 {
			planilla = models.Planilla{
				PersonalID: personal.ID,
				Mes:        int16(mes),
				Anio:       int16(anio),
				CreadoEn:   time.Now(),
			}
			if err := db.Create(&planilla).Error; err != nil {
				fmt.Printf("[DEBUG] Error creating planilla for personal_id=%d: %v\n", personal.ID, err)
				warnings = append(warnings, fmt.Sprintf("Error al crear planilla para '%s': %v", emp.Nombre, err))
				continue
			}
			fmt.Printf("[DEBUG] Created planilla ID=%d for personal_id=%d\n", planilla.ID, personal.ID)
			planillasCreadas++

			// Insert haberes (ingresos)
			for _, h := range emp.Haberes {
				if err := db.Create(&models.Ingreso{PlanillaID: planilla.ID, Tipo: h.Concepto, Monto: h.Monto}).Error; err != nil {
					warnings = append(warnings, fmt.Sprintf("Error al insertar ingreso '%s' para '%s': %v", h.Concepto, emp.Nombre, err))
				}
			}
			// Insert descuentos
			for _, d := range emp.Descuentos {
				if err := db.Create(&models.Descuento{PlanillaID: planilla.ID, Tipo: d.Concepto, Monto: d.Monto}).Error; err != nil {
					warnings = append(warnings, fmt.Sprintf("Error al insertar descuento '%s' para '%s': %v", d.Concepto, emp.Nombre, err))
				}
			}

			var totalHab, totalDesc float64
			db.Model(&models.Ingreso{}).Where("planilla_id = ?", planilla.ID).
				Select("COALESCE(SUM(monto), 0)").Scan(&totalHab)
			db.Model(&models.Descuento{}).Where("planilla_id = ?", planilla.ID).
				Select("COALESCE(SUM(monto), 0)").Scan(&totalDesc)
			db.Model(&planilla).Updates(map[string]interface{}{
				"total_haberes":    totalHab,
				"total_descuentos": totalDesc,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "Importación completada",
		"personal_creados":    personalCreados,
		"personal_actualizados": personalActualizados,
		"planillas_creadas":   planillasCreadas,
		"total_empleados":     len(payload.Empleados),
		"duplicados":          duplicados,
		"errores":             warnings,
	})
}

// splitName divide un nombre completo en nombres y apellidos
// Asume formato: "Apellidos Nombres" o "Nombres Apellidos"
func splitName(fullName string) struct {
	nombres   string
	apellidos string
} {
	parts := splitAndClean(fullName)
	if len(parts) == 0 {
		return struct{ nombres string; apellidos string }{nombres: fullName, apellidos: ""}
	}
	if len(parts) == 1 {
		return struct{ nombres string; apellidos string }{nombres: parts[0], apellidos: ""}
	}
	// Asumir que la primera parte es apellido (o primeros dos)
	if len(parts) >= 2 {
		// Primeras 1-2 partes como apellido, el resto como nombre
		apellidos := parts[0]
		if len(parts) > 2 {
			// Dos palabras seguidas podrían ser apellido compuesto
			apellidos = parts[0] + " " + parts[1]
			nombres := ""
			for i := 2; i < len(parts); i++ {
				if i > 2 {
					nombres += " "
				}
				nombres += parts[i]
			}
			return struct{ nombres string; apellidos string }{nombres: nombres, apellidos: apellidos}
		}
		nombres := ""
		for i := 1; i < len(parts); i++ {
			if i > 1 {
				nombres += " "
			}
			nombres += parts[i]
}
		return struct{ nombres string; apellidos string }{nombres: nombres, apellidos: parts[0]}
	}
	return struct{ nombres string; apellidos string }{nombres: fullName, apellidos: ""}
}

func splitAndClean(s string) []string {
	var parts []string
	word := ""
	for _, ch := range s {
		if ch == ' ' || ch == '\t' || ch == '\n' {
			if word != "" {
				parts = append(parts, word)
				word = ""
			}
		} else {
			word += string(ch)
		}
	}
	if word != "" {
		parts = append(parts, word)
	}
	return parts
}

func ResumenDashboard(c *gin.Context) {
	db := getDB(c)

	var totalPersonal int64
	db.Model(&models.Personal{}).Count(&totalPersonal)

	var totalPlanillas int64
	db.Model(&models.Planilla{}).Count(&totalPlanillas)

	var totalHaberes float64
	db.Model(&models.Planilla{}).Select("COALESCE(SUM(total_haberes), 0)").Scan(&totalHaberes)

	var totalDescuentos float64
	db.Model(&models.Planilla{}).Select("COALESCE(SUM(total_descuentos), 0)").Scan(&totalDescuentos)

	mesActual := int(time.Now().Month())
	anioActual := int(time.Now().Year())

	var planillasMes []models.Planilla
	db.Where("mes = ? AND anio = ?", mesActual, anioActual).Preload("Personal").Find(&planillasMes)

	for i := range planillasMes {
		planillasMes[i].CalculateTotal()
	}

	c.JSON(http.StatusOK, gin.H{
		"total_personal":   totalPersonal,
		"total_planillas":  totalPlanillas,
		"total_haberes":    totalHaberes,
		"total_descuentos": totalDescuentos,
		"total_liquido":    totalHaberes - totalDescuentos,
		"planillas_mes":    planillasMes,
	})
}

// ObtenerPeriodosPersonal retorna los períodos (años y meses) disponibles de un empleado
func ObtenerPeriodosPersonal(c *gin.Context) {
	db := getDB(c)
	personalID := c.Param("id")

	var personal models.Personal
	if err := db.First(&personal, personalID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal no encontrado"})
		return
	}

	type Periodo struct {
		Anio int16 `json:"anio"`
		Mes  int16 `json:"mes"`
	}

	var periodos []Periodo
	db.Model(&models.Planilla{}).
		Select("DISTINCT anio, mes").
		Where("personal_id = ?", personalID).
		Order("anio DESC, mes DESC").
		Scan(&periodos)

	// Agrupar por año
	añosMap := make(map[int16][]int16)
	for _, p := range periodos {
		añosMap[p.Anio] = append(añosMap[p.Anio], p.Mes)
	}

	var años []int16
	for a := range añosMap {
		años = append(años, a)
	}
	// Ordenar años descendente
	for i := 0; i < len(años)-1; i++ {
		for j := i + 1; j < len(años); j++ {
			if años[j] > años[i] {
				años[i], años[j] = años[j], años[i]
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"años":     años,
		"meses":    añosMap,
		"total":    len(periodos),
	})
}

// ExportarPlanillasPersonal exporta las planillas de un empleado específico
func ExportarPlanillasPersonal(c *gin.Context) {
	db := getDB(c)
	personalID := c.Param("id")
	
	mes := c.Query("mes")
	anio := c.Query("anio")

	var personal models.Personal
	if err := db.First(&personal, personalID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal no encontrado"})
		return
	}

	baseQuery := db.Model(&models.Planilla{}).Preload("Personal").Preload("Ingresos").Preload("Descuentos")
	baseQuery = baseQuery.Where("personal_id = ?", personalID)

	if mes != "" {
		mesInt, _ := strconv.Atoi(mes)
		if mesInt > 0 && mesInt <= 12 {
			baseQuery = baseQuery.Where("mes = ?", mesInt)
		}
	}
	if anio != "" {
		anioInt, _ := strconv.Atoi(anio)
		if anioInt > 0 {
			baseQuery = baseQuery.Where("anio = ?", anioInt)
		}
	}

	var planillas []models.Planilla
	baseQuery.Order("anio DESC, mes DESC").Find(&planillas)

	for i := range planillas {
		planillas[i].CalculateTotal()
	}

	var totalHaberes, totalDescuentos, totalLiquido float64
	for _, p := range planillas {
		totalHaberes += p.TotalHaberes
		totalDescuentos += p.TotalDescuentos
		totalLiquido += p.TotalLiquido
	}

	c.JSON(http.StatusOK, gin.H{
		"personal": gin.H{
			"id":        personal.ID,
			"dni":       personal.DNI,
			"nombres":   personal.Nombres,
			"apellidos": personal.Apellidos,
			"puesto":    personal.Puesto,
			"rd":        personal.RD,
			"uu":        personal.UU,
			"colegio":   personal.Colegio,
			"distrito":  personal.Distrito,
		},
		"planillas":        planillas,
		"total_haberes":   totalHaberes,
		"total_descuentos": totalDescuentos,
		"total_liquido":    totalLiquido,
		"cantidad":         len(planillas),
	})
}
