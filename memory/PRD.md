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
- Puede exportar a Excel/CSV

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

4. **Kilos/Litros**
   - Registro diario por ruta y repartidor
   - Campos: fecha, ruta, repartidor, clientes, kilos, litros, bultos
   - Resumen mensual total
   - Resumen por repartidor
   - Resumen por ruta
   - Historial del mes
   - Exportación CSV

## What's Been Implemented

### ✅ Completado (09/02/2026)
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
- [x] Flota - Gestión de vehículos por hub
- [x] Histórico de Incidencias - Por vehículo con costos
- [x] Compras - Lista de compras con precios
- [x] Contactos - Lista de contactos
- [x] Liquidaciones - Control por ruta con descuadres
  - [x] CRUD de rutas
  - [x] Entradas diarias (metálico/ingreso)
  - [x] Resumen por repartidor
  - [x] Resumen por ruta
- [x] **Kilos/Litros** (NUEVO - 09/02/2026)
  - [x] Registro diario con día, ruta, nombre, clientes, kilos, litros, bultos
  - [x] Resumen mensual con 4 tarjetas
  - [x] Tab "Por Repartidor" con agregación
  - [x] Tab "Por Ruta" con agregación
  - [x] Tab "Historial del Mes"
  - [x] Exportación CSV
  - [x] Navegación por mes
- [x] Diseño responsive con sidebar colapsable

### ⏳ Pendiente (Backlog)
- [ ] Funcionalidad específica para Repartos
- [ ] Subida de archivos a registros
- [ ] Notificaciones al aprobar usuarios
- [ ] Dashboard con gráficos
- [ ] Finalizar exportación Excel para Asistencias

## Prioridad Features

### P0 (Crítico) ✅
- Autenticación
- Sistema de Asistencias
- Kilos/Litros

### P1 (Alto) ✅
- Liquidaciones con campos específicos
- Flota con registro de vehículos
- Histórico de Incidencias

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

### Routes (shared by Liquidaciones and Kilos/Litros)
- GET /api/hubs/{hubId}/routes
- POST /api/hubs/{hubId}/routes
- DELETE /api/hubs/{hubId}/routes/{routeId}

### Liquidaciones
- GET /api/hubs/{hubId}/liquidations?year=YYYY&month=MM
- POST /api/hubs/{hubId}/liquidations
- POST /api/hubs/{hubId}/liquidations/bulk
- GET /api/hubs/{hubId}/liquidations/summary

### Kilos/Litros
- GET /api/hubs/{hubId}/kilos-litros?year=YYYY&month=MM
- POST /api/hubs/{hubId}/kilos-litros
- POST /api/hubs/{hubId}/kilos-litros/bulk
- DELETE /api/hubs/{hubId}/kilos-litros/{entryId}
- GET /api/hubs/{hubId}/kilos-litros/summary

## Next Tasks
1. Implementar funcionalidad específica para Repartos (pendiente especificaciones del usuario)
2. Agregar gráficos de estadísticas en el dashboard
3. Mejorar sistema de exportación con más formatos
