package models

import (
	"time"
)

// Usuario representa un usuario del sistema con autenticación JWT
type Usuario struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	Nombre          string     `json:"nombre" gorm:"size:100;not null"`
	Email           string     `json:"email" gorm:"size:150;uniqueIndex;not null"`
	PasswordHash    string     `json:"-" gorm:"size:255;not null"`
	ResetToken      *string    `json:"-" gorm:"size:255"`
	ResetTokenExpiry *time.Time `json:"-"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Personal representa un empleado registrado en el sistema
type Personal struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	DNI       string    `json:"dni" gorm:"size:20"`
	Nombres   string    `json:"nombres" gorm:"size:100;not null"`
	Apellidos string    `json:"apellidos" gorm:"size:100;not null"`
	Puesto    string    `json:"puesto" gorm:"size:100"`
	RD        string    `json:"rd" gorm:"size:50"`
	UU        string    `json:"uu" gorm:"size:50"`
	Colegio   string    `json:"colegio" gorm:"size:200"`
	Distrito  string    `json:"distrito" gorm:"size:150"`
	CreatedAt time.Time `json:"created_at"`
}

func (Personal) TableName() string { return "personal" }

func (Planilla) TableName() string { return "planilla" }

// Planilla representa la nómina de un empleado en un período específico
type Planilla struct {
	ID              uint        `json:"id" gorm:"primaryKey"`
	PersonalID      uint        `json:"personal_id" gorm:"not null"`
	Personal        Personal    `json:"personal,omitempty" gorm:"foreignKey:PersonalID"`
	Mes             int16       `json:"mes" gorm:"not null"`
	Anio            int16       `json:"anio" gorm:"not null"`
	TotalHaberes    float64     `json:"total_haberes" gorm:"default:0"`
	TotalDescuentos float64     `json:"total_descuentos" gorm:"default:0"`
	TotalLiquido    float64     `json:"total_liquido" gorm:"-"`
	CreadoPor       *uint       `json:"creado_por"`
	CreadoEn        time.Time   `json:"creado_en"`
	Ingresos        []Ingreso   `json:"ingresos,omitempty" gorm:"foreignKey:PlanillaID"`
	Descuentos      []Descuento `json:"descuentos,omitempty" gorm:"foreignKey:PlanillaID"`
}

func (p *Planilla) CalculateTotal() {
	p.TotalLiquido = p.TotalHaberes - p.TotalDescuentos
}

// Ingreso representa un haber o ingreso de un empleado en una planilla
type Ingreso struct {
	ID         uint    `json:"id" gorm:"primaryKey"`
	PlanillaID uint    `json:"planilla_id" gorm:"not null"`
	Tipo       string  `json:"tipo" gorm:"size:80;not null"`
	Monto      float64 `json:"monto" gorm:"default:0"`
	Comentario string  `json:"comentario" gorm:"type:text"`
}

// Descuento representa un descuento aplicado a un empleado en una planilla
type Descuento struct {
	ID         uint    `json:"id" gorm:"primaryKey"`
	PlanillaID uint    `json:"planilla_id" gorm:"not null"`
	Tipo       string  `json:"tipo" gorm:"size:80;not null"`
	Monto      float64 `json:"monto" gorm:"default:0"`
	Comentario string  `json:"comentario" gorm:"type:text"`
}

type DataExcel struct {
	Personal  []Personal       `json:"personal"`
	Planillas []PlanillaImport `json:"planillas"`
}

type PlanillaImport struct {
	DNI        string            `json:"dni"`
	Nombres    string            `json:"nombres"`
	Mes        int               `json:"mes"`
	Anio       int               `json:"anio"`
	Ingresos   []IngresoImport   `json:"ingresos"`
	Descuentos []DescuentoImport `json:"descuentos"`
}

type IngresoImport struct {
	Tipo  string  `json:"tipo"`
	Monto float64 `json:"monto"`
}

type DescuentoImport struct {
	Tipo  string  `json:"tipo"`
	Monto float64 `json:"monto"`
}

// ── New format from Python extractor (extractor_haberes) ─────────────────────

type HaberesPayload struct {
	Mes            *int            `json:"mes"`
	Anio           *int            `json:"anio"`
	TotalEmpleados int             `json:"total_empleados"`
	Empleados      []EmpleadoHaber `json:"empleados"`
}

type EmpleadoHaber struct {
	Nombre          string         `json:"nombre"`
	Cargo           *string        `json:"cargo"`
	Resolucion      *string        `json:"resolucion"`
	Codigo          *string        `json:"codigo"`
	DNI             *string        `json:"dni"`
	Colegio         *string        `json:"colegio"`
	Distrito        *string        `json:"distrito"`
	Haberes         []ConceptoItem `json:"haberes"`
	Descuentos      []ConceptoItem `json:"descuentos"`
	TotalHaberes    *float64       `json:"total_haberes"`
	TotalDescuentos *float64       `json:"total_descuentos"`
	TotalLiquido    *float64       `json:"total_liquido"`
}

type ConceptoItem struct {
	Concepto string  `json:"concepto"`
	Monto    float64 `json:"monto"`
}
