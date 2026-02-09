# HubManager - PRD (Product Requirements Document)

## Problema Original
Crear una aplicación con React y FastAPI para gestión de Hubs logísticos con:
- Sistema de autenticación JWT con admin por defecto
- Aprobación de usuarios por admin
- Categorías por Hub: Asistencias, Liquidaciones, Flota, Histórico de incidencias, Repartos, Compras, Kilos/Litros, Contactos
- Sistema de Asistencias tipo Excel con control de empleados

## Arquitectura

### Backend (FastAPI + MongoDB)
- **Puerto**: 8001 (interno)
- **Base de datos**: MongoDB
- **Autenticación**: JWT tokens

### Frontend (React)
- **Puerto**: 3000
- **UI**: Shadcn/UI + Tailwind CSS
- **Routing**: React Router DOM

## User Personas

### Administrador
- Puede aprobar/rechazar usuarios
- Puede agregar/eliminar empleados
- Puede crear/editar/eliminar hubs
- Acceso completo a todas las funcionalidades

### Usuario Regular
- Debe ser aprobado por admin para acceder
- Puede ver hubs y categorías
- Puede registrar asistencias y datos
- Puede exportar a Excel

## Core Requirements (Estáticos)

1. **Autenticación**
   - Login/Register
   - JWT tokens
   - Usuario admin por defecto: admin@admin.com / admin123
   - Sistema de aprobación de nuevos usuarios

2. **Gestión de Hubs**
   - 6 Hubs por defecto: Puerta Toledo, Dibecesa, Cáceres, Córdoba, Cartagena, Cádiz
   - CRUD de hubs (solo admin)
   - Cada hub tiene 8 subcategorías

3. **Sistema de Asistencias**
   - Tabla tipo Excel con días del mes
   - Empleados en filas, días en columnas
   - Estados: 1 (trabajado), D (descanso), IN (inasistente), E (enfermo), O (otros)
   - Horas extras (decimal)
   - Dietas (1 = tiene dieta)
   - Resumen automático mensual
   - Exportación a Excel

## What's Been Implemented (09/02/2026)

### ✅ Completado
- [x] Sistema de autenticación JWT
- [x] Usuario admin por defecto
- [x] Registro con aprobación pendiente
- [x] Panel de administración para aprobar usuarios
- [x] 6 Hubs por defecto
- [x] CRUD de Hubs
- [x] Navegación Hub -> Categorías
- [x] Sistema de Asistencias completo
  - [x] Tabla tipo Excel
  - [x] CRUD de empleados
  - [x] Registro de asistencia por día
  - [x] Navegación por mes
  - [x] Resumen mensual
  - [x] Exportación a Excel
- [x] Categorías genéricas (Liquidaciones, Flota, etc.) con CRUD básico
- [x] Diseño responsive con sidebar colapsable

### ⏳ Pendiente (Backlog)
- [ ] Funcionalidad específica para Liquidaciones
- [ ] Funcionalidad específica para Flota
- [ ] Funcionalidad específica para Histórico de incidencias
- [ ] Funcionalidad específica para Repartos
- [ ] Funcionalidad específica para Compras
- [ ] Funcionalidad específica para Kilos/Litros
- [ ] Funcionalidad específica para Contactos
- [ ] Subida de archivos a registros
- [ ] Notificaciones al aprobar usuarios
- [ ] Dashboard con gráficos

## Prioridad Features

### P0 (Crítico) ✅
- Autenticación
- Sistema de Asistencias

### P1 (Alto)
- Liquidaciones con campos específicos
- Flota con registro de vehículos

### P2 (Medio)
- Repartos con tracking
- Compras con proveedores
- Reportes avanzados

## Credenciales por Defecto
```
Admin: admin@admin.com / admin123
```

## API Endpoints Principales

### Auth
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me

### Hubs
- GET /api/hubs
- GET /api/hubs/{hubId}
- POST /api/hubs
- PUT /api/hubs/{hubId}
- DELETE /api/hubs/{hubId}

### Employees
- GET /api/hubs/{hubId}/employees
- POST /api/hubs/{hubId}/employees
- DELETE /api/hubs/{hubId}/employees/{employeeId}

### Attendance
- GET /api/hubs/{hubId}/attendance?year=YYYY&month=MM
- POST /api/hubs/{hubId}/attendance
- GET /api/hubs/{hubId}/attendance/summary

## Next Tasks
1. Implementar funcionalidad específica para cada categoría según requisitos del usuario
2. Agregar gráficos de estadísticas en el dashboard
3. Mejorar sistema de exportación con más formatos
