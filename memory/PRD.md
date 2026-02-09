# HubManager - PRD (Product Requirements Document)

## Problema Original
Crear una aplicación con React y FastAPI para gestión de Hubs logísticos con:
- Sistema de autenticación JWT con admin por defecto
- Aprobación de usuarios por admin
- Categorías por Hub: Asistencias, Liquidaciones, Flota, Histórico de incidencias, Repartos, Compras, Kilos/Litros, Contactos, Días Festivos, Restricciones Horarias
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
   - Cada hub tiene 10 subcategorías

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
   - Resumen por repartidor y por ruta
   - Exportación CSV

5. **Días Festivos**
   - Calendario visual con festivos por ubicación
   - Festivos nacionales de España precargados (2026)
   - Festivos autonómicos por comunidad
   - Festivos locales por ciudad
   - Posibilidad de agregar/eliminar festivos personalizados

6. **Restricciones Horarias**
   - Listado de restricciones por zona
   - Campos: zona, horario, días (L-V, L-S, L-D, S-D), aplica_a, notas
   - Tipos: Vehículos 0 emisiones, Vehículos de combustible, Todos
   - CRUD completo
   - Vista agrupada por tipo de vehículo

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
- [x] Flota - Gestión de vehículos por hub
- [x] Histórico de Incidencias - Por vehículo con costos
- [x] Compras - Lista de compras con precios
- [x] Contactos - Lista de contactos
- [x] Liquidaciones - Control por ruta con descuadres
- [x] **Kilos/Litros** - Tracking de entregas
- [x] **Días Festivos** (NUEVO)
  - [x] Calendario visual por mes
  - [x] 11 festivos nacionales de España 2026
  - [x] Festivos autonómicos por comunidad (Madrid, Extremadura, Andalucía, Murcia)
  - [x] Festivos locales por ciudad
  - [x] Agregar/eliminar festivos personalizados
  - [x] Resumen anual con conteos por tipo
- [x] **Restricciones Horarias** (NUEVO)
  - [x] Listado con zona, horario, días, aplica_a
  - [x] Tipos: Vehículos 0, Combustible, Todos
  - [x] CRUD completo (crear, editar, eliminar)
  - [x] Tarjetas resumen por tipo
  - [x] Vista agrupada por categoría
- [x] Diseño responsive con sidebar colapsable

### ⏳ Pendiente (Backlog)
- [ ] Funcionalidad específica para Repartos
- [ ] Subida de archivos a registros
- [ ] Notificaciones al aprobar usuarios
- [ ] Dashboard con gráficos
- [ ] Finalizar exportación Excel para Asistencias

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
- DELETE /api/hubs/{hubId}

### Kilos/Litros
- GET /api/hubs/{hubId}/kilos-litros?year=YYYY&month=MM
- POST /api/hubs/{hubId}/kilos-litros
- DELETE /api/hubs/{hubId}/kilos-litros/{entryId}
- GET /api/hubs/{hubId}/kilos-litros/summary

### Días Festivos
- GET /api/hubs/{hubId}/holidays?year=YYYY
- POST /api/hubs/{hubId}/holidays
- DELETE /api/hubs/{hubId}/holidays/{holidayId}

### Restricciones Horarias
- GET /api/hubs/{hubId}/time-restrictions
- POST /api/hubs/{hubId}/time-restrictions
- PUT /api/hubs/{hubId}/time-restrictions/{restrictionId}
- DELETE /api/hubs/{hubId}/time-restrictions/{restrictionId}

## Festivos Precargados (2026)

### Nacionales (11)
- Año Nuevo (01/01)
- Epifanía del Señor (06/01)
- Jueves Santo (02/04)
- Viernes Santo (03/04)
- Día del Trabajador (01/05)
- Asunción de la Virgen (15/08)
- Fiesta Nacional de España (12/10)
- Todos los Santos (01/11)
- Día de la Constitución (06/12)
- Inmaculada Concepción (08/12)
- Navidad (25/12)

### Por Ubicación
- **Madrid**: San José (19/03), Día de la Comunidad (02/05), San Isidro (15/05), Almudena (09/11)
- **Cáceres**: Día de Extremadura (28/02), San Jorge (23/04)
- **Córdoba**: Día de Andalucía (28/02), San Rafael (24/05, 24/10)
- **Cartagena**: Día de Murcia (09/06), Virgen del Carmen (16/07)
- **Cádiz**: Día de Andalucía (28/02), Nuestra Señora del Rosario (07/10)

## Next Tasks
1. Implementar funcionalidad específica para Repartos (pendiente especificaciones)
2. Dashboard con gráficos y estadísticas
3. Sistema de notificaciones
