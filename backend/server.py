from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
import calendar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'hubmanager-secret-key-2024-very-secure')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI(title="HubManager API")
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_admin: bool
    is_approved: bool
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class HubCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""

class HubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class HubResponse(BaseModel):
    id: str
    name: str
    description: str
    location: str
    created_at: str

class EmployeeCreate(BaseModel):
    hub_id: str
    name: str
    position: Optional[str] = ""

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    hub_id: str
    name: str
    position: str
    created_at: str

class AttendanceEntry(BaseModel):
    employee_id: str
    hub_id: str
    date: str  # Format: YYYY-MM-DD
    status: str  # 1, D, IN, E, O
    extra_hours: Optional[float] = 0
    diet: Optional[int] = 0  # 1 or 0

class AttendanceBulkUpdate(BaseModel):
    entries: List[AttendanceEntry]

class AttendanceResponse(BaseModel):
    id: str
    employee_id: str
    hub_id: str
    date: str
    status: str
    extra_hours: float
    diet: int

# Vehicle types
VEHICLE_TYPES = ["Moto", "Furgoneta", "Carrozado", "Trailer", "Camión", "MUS"]

class VehicleCreate(BaseModel):
    hub_id: str
    plate: str  # Matrícula
    vehicle_type: str  # Tipo de vehículo

class VehicleUpdate(BaseModel):
    plate: Optional[str] = None
    vehicle_type: Optional[str] = None

class VehicleResponse(BaseModel):
    id: str
    hub_id: str
    plate: str
    vehicle_type: str
    created_at: str

class IncidentCreate(BaseModel):
    vehicle_id: str
    hub_id: str
    title: str
    description: Optional[str] = ""
    date: str  # Format: DD/MM/YYYY or YYYY-MM-DD
    cost: float = 0
    km: int = 0

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    cost: Optional[float] = None
    km: Optional[int] = None

class IncidentResponse(BaseModel):
    id: str
    vehicle_id: str
    hub_id: str
    title: str
    description: str
    date: str
    cost: float
    km: int
    created_at: str

# Purchase models
class PurchaseCreate(BaseModel):
    hub_id: str
    item: str
    specifications: Optional[str] = ""
    supplier: Optional[str] = ""
    price: float = 1
    quantity: int = 1
    total: Optional[float] = None

class PurchaseUpdate(BaseModel):
    item: Optional[str] = None
    specifications: Optional[str] = None
    supplier: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    total: Optional[float] = None

class PurchaseResponse(BaseModel):
    id: str
    hub_id: str
    item: str
    specifications: str
    supplier: str
    price: float
    quantity: int
    total: float
    created_at: str

# Contact models
class ContactCreate(BaseModel):
    hub_id: str
    name: str
    position: Optional[str] = ""
    phone: Optional[str] = ""

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None

class ContactResponse(BaseModel):
    id: str
    hub_id: str
    name: str
    position: str
    phone: str
    created_at: str

# Kilos/Litros models
class KilosLitrosEntryCreate(BaseModel):
    hub_id: str
    route_id: str
    date: str  # YYYY-MM-DD
    repartidor: str  # lowercase enforced
    clientes: int = 0
    kilos: float = 0
    litros: float = 0
    bultos: int = 0

class KilosLitrosEntryUpdate(BaseModel):
    repartidor: Optional[str] = None
    clientes: Optional[int] = None
    kilos: Optional[float] = None
    litros: Optional[float] = None
    bultos: Optional[int] = None

class KilosLitrosEntryResponse(BaseModel):
    id: str
    hub_id: str
    route_id: str
    date: str
    repartidor: str
    clientes: int
    kilos: float
    litros: float
    bultos: int
    created_at: str

# Holiday models (Días Festivos)
class HolidayCreate(BaseModel):
    hub_id: str
    date: str  # YYYY-MM-DD
    name: str
    type: str  # "nacional", "autonomico", "local"

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None

class HolidayResponse(BaseModel):
    id: str
    hub_id: str
    date: str
    name: str
    type: str
    created_at: str

# Time Restriction models (Restricciones Horarias)
RESTRICTION_APPLIES_TO = ["vehiculos_0", "vehiculos_combustible", "todos"]

class TimeRestrictionCreate(BaseModel):
    hub_id: str
    zona: str
    horario: str  # e.g., "7:00 - 10:00 y 18:00 - 21:00"
    dias: str  # e.g., "L-V", "L-S", "Todos"
    aplica_a: str  # vehiculos_0, vehiculos_combustible, todos
    notas: Optional[str] = ""

class TimeRestrictionUpdate(BaseModel):
    zona: Optional[str] = None
    horario: Optional[str] = None
    dias: Optional[str] = None
    aplica_a: Optional[str] = None
    notas: Optional[str] = None

class TimeRestrictionResponse(BaseModel):
    id: str
    hub_id: str
    zona: str
    horario: str
    dias: str
    aplica_a: str
    notas: str
    created_at: str

# Liquidation models (routes and daily entries)
class RouteCreate(BaseModel):
    hub_id: str
    name: str  # e.g., "005", "103", "143"

class RouteResponse(BaseModel):
    id: str
    hub_id: str
    name: str
    created_at: str

class LiquidationEntryCreate(BaseModel):
    route_id: str
    hub_id: str
    date: str  # YYYY-MM-DD
    repartidor: str  # lowercase enforced
    metalico: float = 0
    ingreso: float = 0
    comentario: Optional[str] = ""

class LiquidationEntryUpdate(BaseModel):
    repartidor: Optional[str] = None
    metalico: Optional[float] = None
    ingreso: Optional[float] = None
    comentario: Optional[str] = None

class LiquidationEntryResponse(BaseModel):
    id: str
    route_id: str
    hub_id: str
    date: str
    repartidor: str
    metalico: float
    ingreso: float
    diferencia: float
    comentario: str
    created_at: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    admin_email = "admin@admin.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": hash_password("admin123"),
            "full_name": "Administrador",
            "is_admin": True,
            "is_approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logging.info("Usuario admin creado: admin@admin.com / admin123")
    
    # Create default hubs if not exist
    default_hubs = [
        {"name": "Hub Puerta Toledo", "description": "Hub principal Madrid", "location": "Madrid"},
        {"name": "Dibecesa", "description": "Centro de distribución", "location": "Madrid"},
        {"name": "Hub Caceres", "description": "Hub Extremadura", "location": "Cáceres"},
        {"name": "Hub Cordoba", "description": "Hub Andalucía Este", "location": "Córdoba"},
        {"name": "Hub Cartagena", "description": "Hub Murcia", "location": "Cartagena"},
        {"name": "Hub Cadiz", "description": "Hub Andalucía Oeste", "location": "Cádiz"}
    ]
    
    for hub_data in default_hubs:
        existing = await db.hubs.find_one({"name": hub_data["name"]})
        if not existing:
            hub = {
                "id": str(uuid.uuid4()),
                **hub_data,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.hubs.insert_one(hub)
    
    logging.info("Hubs por defecto creados")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "is_admin": False,
        "is_approved": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    return {
        "message": "Usuario registrado. Esperando aprobación del administrador.",
        "user_id": user["id"]
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Tu cuenta está pendiente de aprobación")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            is_admin=user.get("is_admin", False),
            is_approved=user.get("is_approved", False),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        is_admin=current_user.get("is_admin", False),
        is_approved=current_user.get("is_approved", False),
        created_at=current_user["created_at"]
    )

# ==================== USER MANAGEMENT (ADMIN) ====================

@api_router.get("/admin/users/pending", response_model=List[UserResponse])
async def get_pending_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({"is_approved": False}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        full_name=u["full_name"],
        is_admin=u.get("is_admin", False),
        is_approved=u.get("is_approved", False),
        created_at=u["created_at"]
    ) for u in users]

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        full_name=u["full_name"],
        is_admin=u.get("is_admin", False),
        is_approved=u.get("is_approved", False),
        created_at=u["created_at"]
    ) for u in users]

@api_router.post("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_approved": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario aprobado correctamente"}

@api_router.post("/admin/users/{user_id}/reject")
async def reject_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario rechazado y eliminado"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado correctamente"}

# ==================== HUB ROUTES ====================

@api_router.get("/hubs", response_model=List[HubResponse])
async def get_hubs(current_user: dict = Depends(get_current_user)):
    hubs = await db.hubs.find({}, {"_id": 0}).to_list(100)
    return [HubResponse(
        id=h["id"],
        name=h["name"],
        description=h.get("description", ""),
        location=h.get("location", ""),
        created_at=h["created_at"]
    ) for h in hubs]

@api_router.get("/hubs/{hub_id}", response_model=HubResponse)
async def get_hub(hub_id: str, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id}, {"_id": 0})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    return HubResponse(
        id=hub["id"],
        name=hub["name"],
        description=hub.get("description", ""),
        location=hub.get("location", ""),
        created_at=hub["created_at"]
    )

@api_router.post("/hubs", response_model=HubResponse)
async def create_hub(hub_data: HubCreate, admin: dict = Depends(get_admin_user)):
    hub = {
        "id": str(uuid.uuid4()),
        "name": hub_data.name,
        "description": hub_data.description,
        "location": hub_data.location,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.hubs.insert_one(hub)
    return HubResponse(
        id=hub["id"],
        name=hub["name"],
        description=hub["description"],
        location=hub["location"],
        created_at=hub["created_at"]
    )

@api_router.put("/hubs/{hub_id}", response_model=HubResponse)
async def update_hub(hub_id: str, hub_data: HubUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in hub_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.hubs.update_one({"id": hub_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    hub = await db.hubs.find_one({"id": hub_id}, {"_id": 0})
    return HubResponse(
        id=hub["id"],
        name=hub["name"],
        description=hub.get("description", ""),
        location=hub.get("location", ""),
        created_at=hub["created_at"]
    )

@api_router.delete("/hubs/{hub_id}")
async def delete_hub(hub_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.hubs.delete_one({"id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    # Also delete related data
    await db.employees.delete_many({"hub_id": hub_id})
    await db.attendance.delete_many({"hub_id": hub_id})
    await db.records.delete_many({"hub_id": hub_id})
    return {"message": "Hub eliminado correctamente"}

# ==================== EMPLOYEE ROUTES ====================

@api_router.get("/hubs/{hub_id}/employees", response_model=List[EmployeeResponse])
async def get_employees(hub_id: str, current_user: dict = Depends(get_current_user)):
    employees = await db.employees.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    return [EmployeeResponse(
        id=e["id"],
        hub_id=e["hub_id"],
        name=e["name"],
        position=e.get("position", ""),
        created_at=e["created_at"]
    ) for e in employees]

@api_router.post("/hubs/{hub_id}/employees", response_model=EmployeeResponse)
async def create_employee(hub_id: str, employee_data: EmployeeCreate, admin: dict = Depends(get_admin_user)):
    # Verify hub exists
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    employee = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "name": employee_data.name,
        "position": employee_data.position or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(employee)
    return EmployeeResponse(
        id=employee["id"],
        hub_id=employee["hub_id"],
        name=employee["name"],
        position=employee["position"],
        created_at=employee["created_at"]
    )

@api_router.put("/hubs/{hub_id}/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(hub_id: str, employee_id: str, employee_data: EmployeeUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in employee_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.employees.update_one(
        {"id": employee_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return EmployeeResponse(
        id=employee["id"],
        hub_id=employee["hub_id"],
        name=employee["name"],
        position=employee.get("position", ""),
        created_at=employee["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/employees/{employee_id}")
async def delete_employee(hub_id: str, employee_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.employees.delete_one({"id": employee_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    # Also delete attendance records
    await db.attendance.delete_many({"employee_id": employee_id})
    return {"message": "Empleado eliminado correctamente"}

# ==================== ATTENDANCE ROUTES ====================

@api_router.get("/hubs/{hub_id}/attendance")
async def get_attendance(
    hub_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    # Get all attendance for the hub in the specified month
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    attendance = await db.attendance.find({
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Get employees for this hub
    employees = await db.employees.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    
    # Build attendance matrix
    attendance_map = {}
    for a in attendance:
        key = f"{a['employee_id']}_{a['date']}"
        attendance_map[key] = {
            "status": a.get("status", ""),
            "extra_hours": a.get("extra_hours", 0),
            "diet": a.get("diet", 0)
        }
    
    return {
        "employees": employees,
        "attendance": attendance_map,
        "year": year,
        "month": month,
        "days_in_month": last_day
    }

@api_router.post("/hubs/{hub_id}/attendance")
async def save_attendance(
    hub_id: str,
    data: AttendanceBulkUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Process each entry
    for entry in data.entries:
        existing = await db.attendance.find_one({
            "employee_id": entry.employee_id,
            "hub_id": hub_id,
            "date": entry.date
        })
        
        attendance_doc = {
            "employee_id": entry.employee_id,
            "hub_id": hub_id,
            "date": entry.date,
            "status": entry.status,
            "extra_hours": entry.extra_hours or 0,
            "diet": entry.diet or 0
        }
        
        if existing:
            await db.attendance.update_one(
                {"_id": existing["_id"]},
                {"$set": attendance_doc}
            )
        else:
            attendance_doc["id"] = str(uuid.uuid4())
            await db.attendance.insert_one(attendance_doc)
    
    return {"message": "Asistencia guardada correctamente", "count": len(data.entries)}

@api_router.get("/hubs/{hub_id}/attendance/summary")
async def get_attendance_summary(
    hub_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    # Get employees
    employees = await db.employees.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    
    # Get attendance
    attendance = await db.attendance.find({
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate summary per employee
    summary = []
    for emp in employees:
        emp_attendance = [a for a in attendance if a["employee_id"] == emp["id"]]
        
        days_worked = sum(1 for a in emp_attendance if a.get("status") == "1")
        days_rest = sum(1 for a in emp_attendance if a.get("status") == "D")
        days_absent = sum(1 for a in emp_attendance if a.get("status") == "IN")
        days_sick = sum(1 for a in emp_attendance if a.get("status") == "E")
        days_other = sum(1 for a in emp_attendance if a.get("status") == "O")
        total_extra_hours = sum(a.get("extra_hours", 0) for a in emp_attendance)
        total_diets = sum(1 for a in emp_attendance if a.get("diet") == 1)
        
        summary.append({
            "employee_id": emp["id"],
            "employee_name": emp["name"],
            "days_worked": days_worked,
            "days_rest": days_rest,
            "days_absent": days_absent,
            "days_sick": days_sick,
            "days_other": days_other,
            "total_extra_hours": total_extra_hours,
            "total_diets": total_diets
        })
    
    return {
        "summary": summary,
        "year": year,
        "month": month
    }

# ==================== VEHICLE ROUTES (FLOTA) ====================

@api_router.get("/hubs/{hub_id}/vehicles")
async def get_vehicles(hub_id: str, current_user: dict = Depends(get_current_user)):
    vehicles = await db.vehicles.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    return [VehicleResponse(
        id=v["id"],
        hub_id=v["hub_id"],
        plate=v["plate"],
        vehicle_type=v["vehicle_type"],
        created_at=v["created_at"]
    ) for v in vehicles]

@api_router.get("/vehicle-types")
async def get_vehicle_types(current_user: dict = Depends(get_current_user)):
    return VEHICLE_TYPES

@api_router.post("/hubs/{hub_id}/vehicles", response_model=VehicleResponse)
async def create_vehicle(hub_id: str, vehicle_data: VehicleCreate, admin: dict = Depends(get_admin_user)):
    # Verify hub exists
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    # Check if plate already exists
    existing = await db.vehicles.find_one({"plate": vehicle_data.plate.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="La matrícula ya está registrada")
    
    vehicle = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "plate": vehicle_data.plate.upper(),
        "vehicle_type": vehicle_data.vehicle_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vehicles.insert_one(vehicle)
    return VehicleResponse(
        id=vehicle["id"],
        hub_id=vehicle["hub_id"],
        plate=vehicle["plate"],
        vehicle_type=vehicle["vehicle_type"],
        created_at=vehicle["created_at"]
    )

@api_router.put("/hubs/{hub_id}/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(hub_id: str, vehicle_id: str, vehicle_data: VehicleUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {}
    if vehicle_data.plate is not None:
        update_data["plate"] = vehicle_data.plate.upper()
    if vehicle_data.vehicle_type is not None:
        update_data["vehicle_type"] = vehicle_data.vehicle_type
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.vehicles.update_one(
        {"id": vehicle_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return VehicleResponse(
        id=vehicle["id"],
        hub_id=vehicle["hub_id"],
        plate=vehicle["plate"],
        vehicle_type=vehicle["vehicle_type"],
        created_at=vehicle["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/vehicles/{vehicle_id}")
async def delete_vehicle(hub_id: str, vehicle_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.vehicles.delete_one({"id": vehicle_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    # Also delete related incidents
    await db.incidents.delete_many({"vehicle_id": vehicle_id})
    return {"message": "Vehículo eliminado correctamente"}

# ==================== INCIDENT ROUTES (HISTORICO DE INCIDENCIAS) ====================

@api_router.get("/hubs/{hub_id}/incidents")
async def get_incidents(
    hub_id: str,
    vehicle_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"hub_id": hub_id}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    
    incidents = await db.incidents.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [IncidentResponse(
        id=i["id"],
        vehicle_id=i["vehicle_id"],
        hub_id=i["hub_id"],
        title=i["title"],
        description=i.get("description", ""),
        date=i["date"],
        cost=i.get("cost", 0),
        km=i.get("km", 0),
        created_at=i["created_at"]
    ) for i in incidents]

@api_router.get("/hubs/{hub_id}/incidents/summary")
async def get_incidents_summary(
    hub_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get all vehicles for this hub
    vehicles = await db.vehicles.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    
    # Get current month and year
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Calculate summaries per vehicle
    summaries = []
    for vehicle in vehicles:
        incidents = await db.incidents.find(
            {"vehicle_id": vehicle["id"]}, 
            {"_id": 0}
        ).to_list(1000)
        
        # Calculate totals
        total_cost_month = 0
        total_cost_year = 0
        
        for incident in incidents:
            cost = incident.get("cost", 0)
            # Parse date (supports both DD/MM/YYYY and YYYY-MM-DD)
            date_str = incident.get("date", "")
            try:
                if "/" in date_str:
                    parts = date_str.split("/")
                    incident_month = int(parts[1])
                    incident_year = int(parts[2])
                else:
                    parts = date_str.split("-")
                    incident_year = int(parts[0])
                    incident_month = int(parts[1])
                
                if incident_year == current_year:
                    total_cost_year += cost
                    if incident_month == current_month:
                        total_cost_month += cost
            except:
                pass
        
        summaries.append({
            "vehicle_id": vehicle["id"],
            "plate": vehicle["plate"],
            "vehicle_type": vehicle["vehicle_type"],
            "total_cost_month": total_cost_month,
            "total_cost_year": total_cost_year,
            "incidents_count": len(incidents)
        })
    
    return {
        "summaries": summaries,
        "current_month": current_month,
        "current_year": current_year
    }

@api_router.post("/hubs/{hub_id}/incidents", response_model=IncidentResponse)
async def create_incident(hub_id: str, incident_data: IncidentCreate, current_user: dict = Depends(get_current_user)):
    # Verify vehicle exists
    vehicle = await db.vehicles.find_one({"id": incident_data.vehicle_id, "hub_id": hub_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    incident = {
        "id": str(uuid.uuid4()),
        "vehicle_id": incident_data.vehicle_id,
        "hub_id": hub_id,
        "title": incident_data.title,
        "description": incident_data.description or "",
        "date": incident_data.date,
        "cost": incident_data.cost or 0,
        "km": incident_data.km or 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incidents.insert_one(incident)
    return IncidentResponse(
        id=incident["id"],
        vehicle_id=incident["vehicle_id"],
        hub_id=incident["hub_id"],
        title=incident["title"],
        description=incident["description"],
        date=incident["date"],
        cost=incident["cost"],
        km=incident["km"],
        created_at=incident["created_at"]
    )

@api_router.put("/hubs/{hub_id}/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(hub_id: str, incident_id: str, incident_data: IncidentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in incident_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.incidents.update_one(
        {"id": incident_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    return IncidentResponse(
        id=incident["id"],
        vehicle_id=incident["vehicle_id"],
        hub_id=incident["hub_id"],
        title=incident["title"],
        description=incident.get("description", ""),
        date=incident["date"],
        cost=incident.get("cost", 0),
        km=incident.get("km", 0),
        created_at=incident["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/incidents/{incident_id}")
async def delete_incident(hub_id: str, incident_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.incidents.delete_one({"id": incident_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    return {"message": "Incidencia eliminada correctamente"}

# ==================== PURCHASE ROUTES (COMPRAS) ====================

@api_router.get("/hubs/{hub_id}/purchases")
async def get_purchases(hub_id: str, current_user: dict = Depends(get_current_user)):
    purchases = await db.purchases.find({"hub_id": hub_id}, {"_id": 0}).to_list(1000)
    return [PurchaseResponse(
        id=p["id"],
        hub_id=p["hub_id"],
        item=p["item"],
        specifications=p.get("specifications", ""),
        supplier=p.get("supplier", ""),
        price=p.get("price", 1),
        quantity=p.get("quantity", 1),
        total=p.get("total", p.get("price", 1) * p.get("quantity", 1)),
        created_at=p["created_at"]
    ) for p in purchases]

@api_router.post("/hubs/{hub_id}/purchases", response_model=PurchaseResponse)
async def create_purchase(hub_id: str, purchase_data: PurchaseCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    price = purchase_data.price or 1
    quantity = purchase_data.quantity or 1
    total = price * quantity
    
    purchase = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "item": purchase_data.item,
        "specifications": purchase_data.specifications or "",
        "supplier": purchase_data.supplier or "",
        "price": price,
        "quantity": quantity,
        "total": total,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.purchases.insert_one(purchase)
    return PurchaseResponse(
        id=purchase["id"],
        hub_id=purchase["hub_id"],
        item=purchase["item"],
        specifications=purchase["specifications"],
        supplier=purchase["supplier"],
        price=purchase["price"],
        quantity=purchase["quantity"],
        total=purchase["total"],
        created_at=purchase["created_at"]
    )

@api_router.put("/hubs/{hub_id}/purchases/{purchase_id}", response_model=PurchaseResponse)
async def update_purchase(hub_id: str, purchase_id: str, purchase_data: PurchaseUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in purchase_data.model_dump().items() if v is not None}
    
    # Recalculate total if price or quantity changed
    if "price" in update_data or "quantity" in update_data:
        existing = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
        if existing:
            price = update_data.get("price", existing.get("price", 1))
            quantity = update_data.get("quantity", existing.get("quantity", 1))
            update_data["total"] = price * quantity
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.purchases.update_one(
        {"id": purchase_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    purchase = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
    return PurchaseResponse(
        id=purchase["id"],
        hub_id=purchase["hub_id"],
        item=purchase["item"],
        specifications=purchase.get("specifications", ""),
        supplier=purchase.get("supplier", ""),
        price=purchase.get("price", 1),
        quantity=purchase.get("quantity", 1),
        total=purchase.get("total", 1),
        created_at=purchase["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/purchases/{purchase_id}")
async def delete_purchase(hub_id: str, purchase_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.purchases.delete_one({"id": purchase_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return {"message": "Compra eliminada correctamente"}

# ==================== CONTACT ROUTES (CONTACTOS) ====================

@api_router.get("/hubs/{hub_id}/contacts")
async def get_contacts(hub_id: str, current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    return [ContactResponse(
        id=c["id"],
        hub_id=c["hub_id"],
        name=c["name"],
        position=c.get("position", ""),
        phone=c.get("phone", ""),
        created_at=c["created_at"]
    ) for c in contacts]

@api_router.post("/hubs/{hub_id}/contacts", response_model=ContactResponse)
async def create_contact(hub_id: str, contact_data: ContactCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    contact = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "name": contact_data.name,
        "position": contact_data.position or "",
        "phone": contact_data.phone or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact)
    return ContactResponse(
        id=contact["id"],
        hub_id=contact["hub_id"],
        name=contact["name"],
        position=contact["position"],
        phone=contact["phone"],
        created_at=contact["created_at"]
    )

@api_router.put("/hubs/{hub_id}/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(hub_id: str, contact_id: str, contact_data: ContactUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in contact_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.contacts.update_one(
        {"id": contact_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(
        id=contact["id"],
        hub_id=contact["hub_id"],
        name=contact["name"],
        position=contact.get("position", ""),
        phone=contact.get("phone", ""),
        created_at=contact["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/contacts/{contact_id}")
async def delete_contact(hub_id: str, contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return {"message": "Contacto eliminado correctamente"}

# ==================== LIQUIDATION ROUTES ====================

@api_router.get("/hubs/{hub_id}/routes")
async def get_routes(hub_id: str, current_user: dict = Depends(get_current_user)):
    routes = await db.routes.find({"hub_id": hub_id}, {"_id": 0}).sort("name", 1).to_list(500)
    return [RouteResponse(
        id=r["id"],
        hub_id=r["hub_id"],
        name=r["name"],
        created_at=r["created_at"]
    ) for r in routes]

@api_router.post("/hubs/{hub_id}/routes", response_model=RouteResponse)
async def create_route(hub_id: str, route_data: RouteCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    # Check if route already exists
    existing = await db.routes.find_one({"hub_id": hub_id, "name": route_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="La ruta ya existe")
    
    route = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "name": route_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.routes.insert_one(route)
    return RouteResponse(
        id=route["id"],
        hub_id=route["hub_id"],
        name=route["name"],
        created_at=route["created_at"]
    )

@api_router.delete("/hubs/{hub_id}/routes/{route_id}")
async def delete_route(hub_id: str, route_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.routes.delete_one({"id": route_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    # Also delete related liquidation entries
    await db.liquidations.delete_many({"route_id": route_id})
    return {"message": "Ruta eliminada correctamente"}

@api_router.get("/hubs/{hub_id}/liquidations")
async def get_liquidations(
    hub_id: str,
    year: int,
    month: int,
    route_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Build date range
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    query = {
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    if route_id:
        query["route_id"] = route_id
    
    entries = await db.liquidations.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    return [LiquidationEntryResponse(
        id=e["id"],
        route_id=e["route_id"],
        hub_id=e["hub_id"],
        date=e["date"],
        repartidor=e.get("repartidor", ""),
        metalico=e.get("metalico", 0),
        ingreso=e.get("ingreso", 0),
        diferencia=e.get("metalico", 0) - e.get("ingreso", 0),
        comentario=e.get("comentario", ""),
        created_at=e["created_at"]
    ) for e in entries]

@api_router.post("/hubs/{hub_id}/liquidations", response_model=LiquidationEntryResponse)
async def create_liquidation_entry(hub_id: str, entry_data: LiquidationEntryCreate, current_user: dict = Depends(get_current_user)):
    # Verify route exists
    route = await db.routes.find_one({"id": entry_data.route_id, "hub_id": hub_id})
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    # Enforce lowercase for repartidor
    repartidor = entry_data.repartidor.lower() if entry_data.repartidor else ""
    
    # Check if entry already exists for this date and route
    existing = await db.liquidations.find_one({
        "route_id": entry_data.route_id,
        "date": entry_data.date
    })
    
    metalico = entry_data.metalico or 0
    ingreso = entry_data.ingreso or 0
    
    if existing:
        # Update existing entry
        await db.liquidations.update_one(
            {"id": existing["id"]},
            {"$set": {
                "repartidor": repartidor,
                "metalico": metalico,
                "ingreso": ingreso,
                "comentario": entry_data.comentario or ""
            }}
        )
        entry = await db.liquidations.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        # Create new entry
        entry = {
            "id": str(uuid.uuid4()),
            "route_id": entry_data.route_id,
            "hub_id": hub_id,
            "date": entry_data.date,
            "repartidor": repartidor,
            "metalico": metalico,
            "ingreso": ingreso,
            "comentario": entry_data.comentario or "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.liquidations.insert_one(entry)
    
    return LiquidationEntryResponse(
        id=entry["id"],
        route_id=entry["route_id"],
        hub_id=entry["hub_id"],
        date=entry["date"],
        repartidor=entry.get("repartidor", ""),
        metalico=entry.get("metalico", 0),
        ingreso=entry.get("ingreso", 0),
        diferencia=entry.get("metalico", 0) - entry.get("ingreso", 0),
        comentario=entry.get("comentario", ""),
        created_at=entry["created_at"]
    )

@api_router.put("/hubs/{hub_id}/liquidations/{entry_id}")
async def update_liquidation_entry(hub_id: str, entry_id: str, entry_data: LiquidationEntryUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    
    if entry_data.repartidor is not None:
        update_data["repartidor"] = entry_data.repartidor.lower()
    if entry_data.metalico is not None:
        update_data["metalico"] = entry_data.metalico
    if entry_data.ingreso is not None:
        update_data["ingreso"] = entry_data.ingreso
    if entry_data.comentario is not None:
        update_data["comentario"] = entry_data.comentario
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.liquidations.update_one(
        {"id": entry_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    
    entry = await db.liquidations.find_one({"id": entry_id}, {"_id": 0})
    return LiquidationEntryResponse(
        id=entry["id"],
        route_id=entry["route_id"],
        hub_id=entry["hub_id"],
        date=entry["date"],
        repartidor=entry.get("repartidor", ""),
        metalico=entry.get("metalico", 0),
        ingreso=entry.get("ingreso", 0),
        diferencia=entry.get("metalico", 0) - entry.get("ingreso", 0),
        comentario=entry.get("comentario", ""),
        created_at=entry["created_at"]
    )

@api_router.post("/hubs/{hub_id}/liquidations/bulk")
async def save_liquidations_bulk(hub_id: str, entries: List[LiquidationEntryCreate], current_user: dict = Depends(get_current_user)):
    saved_count = 0
    for entry_data in entries:
        repartidor = entry_data.repartidor.lower() if entry_data.repartidor else ""
        metalico = entry_data.metalico or 0
        ingreso = entry_data.ingreso or 0
        
        existing = await db.liquidations.find_one({
            "route_id": entry_data.route_id,
            "date": entry_data.date
        })
        
        if existing:
            await db.liquidations.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "repartidor": repartidor,
                    "metalico": metalico,
                    "ingreso": ingreso,
                    "comentario": entry_data.comentario or ""
                }}
            )
        else:
            entry = {
                "id": str(uuid.uuid4()),
                "route_id": entry_data.route_id,
                "hub_id": hub_id,
                "date": entry_data.date,
                "repartidor": repartidor,
                "metalico": metalico,
                "ingreso": ingreso,
                "comentario": entry_data.comentario or "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.liquidations.insert_one(entry)
        saved_count += 1
    
    return {"message": f"Guardadas {saved_count} entradas", "count": saved_count}

# ==================== KILOS/LITROS ROUTES ====================

@api_router.get("/hubs/{hub_id}/kilos-litros")
async def get_kilos_litros(
    hub_id: str,
    year: int,
    month: int,
    route_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Build date range
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    query = {
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    if route_id:
        query["route_id"] = route_id
    
    entries = await db.kilos_litros.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    
    return [KilosLitrosEntryResponse(
        id=e["id"],
        hub_id=e["hub_id"],
        route_id=e["route_id"],
        date=e["date"],
        repartidor=e.get("repartidor", ""),
        clientes=e.get("clientes", 0),
        kilos=e.get("kilos", 0),
        litros=e.get("litros", 0),
        bultos=e.get("bultos", 0),
        created_at=e["created_at"]
    ) for e in entries]

@api_router.post("/hubs/{hub_id}/kilos-litros", response_model=KilosLitrosEntryResponse)
async def create_kilos_litros_entry(hub_id: str, entry_data: KilosLitrosEntryCreate, current_user: dict = Depends(get_current_user)):
    # Verify route exists
    route = await db.routes.find_one({"id": entry_data.route_id, "hub_id": hub_id})
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    # Enforce lowercase for repartidor
    repartidor = entry_data.repartidor.lower() if entry_data.repartidor else ""
    
    # Check if entry already exists for this date, route, and repartidor
    existing = await db.kilos_litros.find_one({
        "route_id": entry_data.route_id,
        "date": entry_data.date,
        "repartidor": repartidor
    })
    
    if existing:
        # Update existing entry
        await db.kilos_litros.update_one(
            {"id": existing["id"]},
            {"$set": {
                "clientes": entry_data.clientes or 0,
                "kilos": entry_data.kilos or 0,
                "litros": entry_data.litros or 0,
                "bultos": entry_data.bultos or 0
            }}
        )
        entry = await db.kilos_litros.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        # Create new entry
        entry = {
            "id": str(uuid.uuid4()),
            "hub_id": hub_id,
            "route_id": entry_data.route_id,
            "date": entry_data.date,
            "repartidor": repartidor,
            "clientes": entry_data.clientes or 0,
            "kilos": entry_data.kilos or 0,
            "litros": entry_data.litros or 0,
            "bultos": entry_data.bultos or 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.kilos_litros.insert_one(entry)
    
    return KilosLitrosEntryResponse(
        id=entry["id"],
        hub_id=entry["hub_id"],
        route_id=entry["route_id"],
        date=entry["date"],
        repartidor=entry.get("repartidor", ""),
        clientes=entry.get("clientes", 0),
        kilos=entry.get("kilos", 0),
        litros=entry.get("litros", 0),
        bultos=entry.get("bultos", 0),
        created_at=entry["created_at"]
    )

@api_router.post("/hubs/{hub_id}/kilos-litros/bulk")
async def save_kilos_litros_bulk(hub_id: str, entries: List[KilosLitrosEntryCreate], current_user: dict = Depends(get_current_user)):
    saved_count = 0
    for entry_data in entries:
        repartidor = entry_data.repartidor.lower() if entry_data.repartidor else ""
        
        existing = await db.kilos_litros.find_one({
            "route_id": entry_data.route_id,
            "date": entry_data.date,
            "repartidor": repartidor
        })
        
        if existing:
            await db.kilos_litros.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "clientes": entry_data.clientes or 0,
                    "kilos": entry_data.kilos or 0,
                    "litros": entry_data.litros or 0,
                    "bultos": entry_data.bultos or 0
                }}
            )
        else:
            entry = {
                "id": str(uuid.uuid4()),
                "hub_id": hub_id,
                "route_id": entry_data.route_id,
                "date": entry_data.date,
                "repartidor": repartidor,
                "clientes": entry_data.clientes or 0,
                "kilos": entry_data.kilos or 0,
                "litros": entry_data.litros or 0,
                "bultos": entry_data.bultos or 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.kilos_litros.insert_one(entry)
        saved_count += 1
    
    return {"message": f"Guardados {saved_count} registros", "count": saved_count}

@api_router.delete("/hubs/{hub_id}/kilos-litros/{entry_id}")
async def delete_kilos_litros_entry(hub_id: str, entry_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.kilos_litros.delete_one({"id": entry_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"message": "Registro eliminado correctamente"}

@api_router.get("/hubs/{hub_id}/kilos-litros/summary")
async def get_kilos_litros_summary(
    hub_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    # Get all routes for this hub
    routes = await db.routes.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    
    # Get all kilos/litros entries for the month
    entries = await db.kilos_litros.find({
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate monthly totals
    total_clientes = sum(e.get("clientes", 0) for e in entries)
    total_kilos = sum(e.get("kilos", 0) for e in entries)
    total_litros = sum(e.get("litros", 0) for e in entries)
    total_bultos = sum(e.get("bultos", 0) for e in entries)
    
    # Summary by repartidor
    repartidor_summary = {}
    for entry in entries:
        rep = entry.get("repartidor", "").lower()
        if rep:
            if rep not in repartidor_summary:
                repartidor_summary[rep] = {"clientes": 0, "kilos": 0, "litros": 0, "bultos": 0}
            repartidor_summary[rep]["clientes"] += entry.get("clientes", 0)
            repartidor_summary[rep]["kilos"] += entry.get("kilos", 0)
            repartidor_summary[rep]["litros"] += entry.get("litros", 0)
            repartidor_summary[rep]["bultos"] += entry.get("bultos", 0)
    
    # Summary by route
    route_summary = []
    for route in routes:
        route_entries = [e for e in entries if e.get("route_id") == route["id"]]
        route_clientes = sum(e.get("clientes", 0) for e in route_entries)
        route_kilos = sum(e.get("kilos", 0) for e in route_entries)
        route_litros = sum(e.get("litros", 0) for e in route_entries)
        route_bultos = sum(e.get("bultos", 0) for e in route_entries)
        
        route_summary.append({
            "route_id": route["id"],
            "route_name": route["name"],
            "clientes": route_clientes,
            "kilos": route_kilos,
            "litros": route_litros,
            "bultos": route_bultos
        })
    
    return {
        "year": year,
        "month": month,
        "totals": {
            "clientes": total_clientes,
            "kilos": total_kilos,
            "litros": total_litros,
            "bultos": total_bultos
        },
        "by_repartidor": [
            {
                "repartidor": rep,
                "clientes": data["clientes"],
                "kilos": data["kilos"],
                "litros": data["litros"],
                "bultos": data["bultos"]
            }
            for rep, data in repartidor_summary.items()
        ],
        "by_route": route_summary
    }

@api_router.get("/hubs/{hub_id}/liquidations/summary")
async def get_liquidations_summary(
    hub_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    # Get all routes for this hub
    routes = await db.routes.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    
    # Get all liquidation entries for the month
    entries = await db.liquidations.find({
        "hub_id": hub_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Summary by repartidor
    repartidor_summary = {}
    for entry in entries:
        rep = entry.get("repartidor", "").lower()
        if rep:
            if rep not in repartidor_summary:
                repartidor_summary[rep] = {"total": 0, "entries": []}
            diferencia = entry.get("metalico", 0) - entry.get("ingreso", 0)
            repartidor_summary[rep]["total"] += diferencia
            if diferencia != 0:
                repartidor_summary[rep]["entries"].append({
                    "date": entry["date"],
                    "route_id": entry["route_id"],
                    "diferencia": diferencia
                })
    
    # Summary by route
    route_summary = []
    for route in routes:
        route_entries = [e for e in entries if e.get("route_id") == route["id"]]
        total_metalico = sum(e.get("metalico", 0) for e in route_entries)
        total_ingreso = sum(e.get("ingreso", 0) for e in route_entries)
        descuadre = total_metalico - total_ingreso
        
        # Get descuadres detectados (entries with diferencia != 0)
        descuadres = []
        for e in route_entries:
            dif = e.get("metalico", 0) - e.get("ingreso", 0)
            if dif != 0:
                descuadres.append({
                    "date": e["date"],
                    "repartidor": e.get("repartidor", ""),
                    "diferencia": dif
                })
        
        route_summary.append({
            "route_id": route["id"],
            "route_name": route["name"],
            "total_metalico": total_metalico,
            "total_ingreso": total_ingreso,
            "descuadre": descuadre,
            "descuadres_detectados": descuadres
        })
    
    return {
        "year": year,
        "month": month,
        "by_repartidor": [
            {
                "repartidor": rep,
                "total": data["total"],
                "estado": f"debe depositar {data['total']:.2f} €" if data["total"] > 0 else f"a favor {abs(data['total']):.2f} €" if data["total"] < 0 else "sin descuadre",
                "entries": data["entries"]
            }
            for rep, data in repartidor_summary.items()
        ],
        "by_route": route_summary
    }

# ==================== HOLIDAYS (DÍAS FESTIVOS) ROUTES ====================

# Default national holidays for Spain 2026
NATIONAL_HOLIDAYS_2026 = [
    {"date": "2026-01-01", "name": "Año Nuevo", "type": "nacional"},
    {"date": "2026-01-06", "name": "Epifanía del Señor", "type": "nacional"},
    {"date": "2026-04-02", "name": "Jueves Santo", "type": "nacional"},
    {"date": "2026-04-03", "name": "Viernes Santo", "type": "nacional"},
    {"date": "2026-05-01", "name": "Día del Trabajador", "type": "nacional"},
    {"date": "2026-08-15", "name": "Asunción de la Virgen", "type": "nacional"},
    {"date": "2026-10-12", "name": "Fiesta Nacional de España", "type": "nacional"},
    {"date": "2026-11-01", "name": "Todos los Santos", "type": "nacional"},
    {"date": "2026-12-06", "name": "Día de la Constitución", "type": "nacional"},
    {"date": "2026-12-08", "name": "Inmaculada Concepción", "type": "nacional"},
    {"date": "2026-12-25", "name": "Navidad", "type": "nacional"},
]

# Local holidays by location
LOCAL_HOLIDAYS_2026 = {
    "madrid": [
        {"date": "2026-03-19", "name": "San José", "type": "autonomico"},
        {"date": "2026-05-02", "name": "Día de la Comunidad de Madrid", "type": "autonomico"},
        {"date": "2026-05-15", "name": "San Isidro", "type": "local"},
        {"date": "2026-11-09", "name": "Nuestra Señora de la Almudena", "type": "local"},
    ],
    "caceres": [
        {"date": "2026-02-28", "name": "Día de Extremadura", "type": "autonomico"},
        {"date": "2026-04-23", "name": "San Jorge", "type": "local"},
    ],
    "cordoba": [
        {"date": "2026-02-28", "name": "Día de Andalucía", "type": "autonomico"},
        {"date": "2026-05-24", "name": "San Rafael", "type": "local"},
        {"date": "2026-10-24", "name": "San Rafael", "type": "local"},
    ],
    "cartagena": [
        {"date": "2026-06-09", "name": "Día de la Región de Murcia", "type": "autonomico"},
        {"date": "2026-07-16", "name": "Virgen del Carmen", "type": "local"},
    ],
    "cadiz": [
        {"date": "2026-02-28", "name": "Día de Andalucía", "type": "autonomico"},
        {"date": "2026-10-07", "name": "Nuestra Señora del Rosario", "type": "local"},
    ],
}

def get_location_key(hub_name: str) -> str:
    """Map hub name to location key for holidays"""
    name_lower = hub_name.lower()
    if "madrid" in name_lower or "toledo" in name_lower or "dibecesa" in name_lower:
        return "madrid"
    elif "caceres" in name_lower or "cáceres" in name_lower:
        return "caceres"
    elif "cordoba" in name_lower or "córdoba" in name_lower:
        return "cordoba"
    elif "cartagena" in name_lower:
        return "cartagena"
    elif "cadiz" in name_lower or "cádiz" in name_lower:
        return "cadiz"
    return "madrid"  # default

@api_router.get("/hubs/{hub_id}/holidays")
async def get_holidays(
    hub_id: str,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    # Get hub to determine location
    hub = await db.hubs.find_one({"id": hub_id}, {"_id": 0})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    location_key = get_location_key(hub.get("name", ""))
    
    # Get custom holidays from database
    custom_holidays = await db.holidays.find({
        "hub_id": hub_id,
        "date": {"$regex": f"^{year}-"}
    }, {"_id": 0}).to_list(500)
    
    # Build response with national + local + custom holidays
    all_holidays = []
    
    # National holidays (if year matches)
    if year == 2026:
        for h in NATIONAL_HOLIDAYS_2026:
            all_holidays.append({
                "id": f"nat_{h['date']}",
                "hub_id": hub_id,
                "date": h["date"],
                "name": h["name"],
                "type": h["type"],
                "is_preset": True,
                "created_at": ""
            })
        
        # Local holidays for this location
        local_holidays = LOCAL_HOLIDAYS_2026.get(location_key, [])
        for h in local_holidays:
            all_holidays.append({
                "id": f"loc_{h['date']}",
                "hub_id": hub_id,
                "date": h["date"],
                "name": h["name"],
                "type": h["type"],
                "is_preset": True,
                "created_at": ""
            })
    
    # Add custom holidays
    for h in custom_holidays:
        all_holidays.append({
            "id": h["id"],
            "hub_id": h["hub_id"],
            "date": h["date"],
            "name": h["name"],
            "type": h.get("type", "local"),
            "is_preset": False,
            "created_at": h.get("created_at", "")
        })
    
    # Sort by date
    all_holidays.sort(key=lambda x: x["date"])
    
    return {
        "year": year,
        "hub_id": hub_id,
        "location": location_key,
        "holidays": all_holidays
    }

@api_router.post("/hubs/{hub_id}/holidays", response_model=HolidayResponse)
async def create_holiday(hub_id: str, holiday_data: HolidayCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    # Check if holiday already exists for this date
    existing = await db.holidays.find_one({
        "hub_id": hub_id,
        "date": holiday_data.date
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un festivo para esta fecha")
    
    holiday = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "date": holiday_data.date,
        "name": holiday_data.name,
        "type": holiday_data.type or "local",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.holidays.insert_one(holiday)
    
    return HolidayResponse(
        id=holiday["id"],
        hub_id=holiday["hub_id"],
        date=holiday["date"],
        name=holiday["name"],
        type=holiday["type"],
        created_at=holiday["created_at"]
    )

@api_router.put("/hubs/{hub_id}/holidays/{holiday_id}", response_model=HolidayResponse)
async def update_holiday(hub_id: str, holiday_id: str, holiday_data: HolidayUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in holiday_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.holidays.update_one(
        {"id": holiday_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Festivo no encontrado")
    
    holiday = await db.holidays.find_one({"id": holiday_id}, {"_id": 0})
    return HolidayResponse(
        id=holiday["id"],
        hub_id=holiday["hub_id"],
        date=holiday["date"],
        name=holiday["name"],
        type=holiday.get("type", "local"),
        created_at=holiday.get("created_at", "")
    )

@api_router.delete("/hubs/{hub_id}/holidays/{holiday_id}")
async def delete_holiday(hub_id: str, holiday_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.holidays.delete_one({"id": holiday_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Festivo no encontrado o es un festivo predefinido")
    return {"message": "Festivo eliminado correctamente"}

# ==================== TIME RESTRICTIONS (RESTRICCIONES HORARIAS) ROUTES ====================

@api_router.get("/hubs/{hub_id}/time-restrictions")
async def get_time_restrictions(hub_id: str, current_user: dict = Depends(get_current_user)):
    restrictions = await db.time_restrictions.find({"hub_id": hub_id}, {"_id": 0}).to_list(500)
    return [TimeRestrictionResponse(
        id=r["id"],
        hub_id=r["hub_id"],
        zona=r["zona"],
        horario=r["horario"],
        dias=r.get("dias", "L-V"),
        aplica_a=r["aplica_a"],
        notas=r.get("notas", ""),
        created_at=r.get("created_at", "")
    ) for r in restrictions]

@api_router.post("/hubs/{hub_id}/time-restrictions", response_model=TimeRestrictionResponse)
async def create_time_restriction(hub_id: str, restriction_data: TimeRestrictionCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    if restriction_data.aplica_a not in RESTRICTION_APPLIES_TO:
        raise HTTPException(status_code=400, detail=f"aplica_a debe ser uno de: {RESTRICTION_APPLIES_TO}")
    
    restriction = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "zona": restriction_data.zona,
        "horario": restriction_data.horario,
        "dias": restriction_data.dias or "L-V",
        "aplica_a": restriction_data.aplica_a,
        "notas": restriction_data.notas or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.time_restrictions.insert_one(restriction)
    
    return TimeRestrictionResponse(
        id=restriction["id"],
        hub_id=restriction["hub_id"],
        zona=restriction["zona"],
        horario=restriction["horario"],
        dias=restriction["dias"],
        aplica_a=restriction["aplica_a"],
        notas=restriction["notas"],
        created_at=restriction["created_at"]
    )

@api_router.put("/hubs/{hub_id}/time-restrictions/{restriction_id}", response_model=TimeRestrictionResponse)
async def update_time_restriction(hub_id: str, restriction_id: str, restriction_data: TimeRestrictionUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in restriction_data.model_dump().items() if v is not None}
    
    if "aplica_a" in update_data and update_data["aplica_a"] not in RESTRICTION_APPLIES_TO:
        raise HTTPException(status_code=400, detail=f"aplica_a debe ser uno de: {RESTRICTION_APPLIES_TO}")
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.time_restrictions.update_one(
        {"id": restriction_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restricción no encontrada")
    
    restriction = await db.time_restrictions.find_one({"id": restriction_id}, {"_id": 0})
    return TimeRestrictionResponse(
        id=restriction["id"],
        hub_id=restriction["hub_id"],
        zona=restriction["zona"],
        horario=restriction["horario"],
        dias=restriction.get("dias", "L-V"),
        aplica_a=restriction["aplica_a"],
        notas=restriction.get("notas", ""),
        created_at=restriction.get("created_at", "")
    )

@api_router.delete("/hubs/{hub_id}/time-restrictions/{restriction_id}")
async def delete_time_restriction(hub_id: str, restriction_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.time_restrictions.delete_one({"id": restriction_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restricción no encontrada")
    return {"message": "Restricción eliminada correctamente"}

# ==================== CATEGORIES ====================

CATEGORIES = [
    {"name": "Asistencias", "icon": "Wrench", "route": "asistencias"},
    {"name": "Liquidaciones", "icon": "Banknote", "route": "liquidaciones"},
    {"name": "Flota", "icon": "Truck", "route": "flota"},
    {"name": "Historico de incidencias", "icon": "History", "route": "historico-incidencias"},
    {"name": "Repartos", "icon": "Package", "route": "repartos"},
    {"name": "Compras", "icon": "ShoppingCart", "route": "compras"},
    {"name": "Kilos/Litros", "icon": "Scale", "route": "kilos-litros"},
    {"name": "Contactos", "icon": "Users", "route": "contactos"},
    {"name": "Días Festivos", "icon": "Calendar", "route": "dias-festivos"},
    {"name": "Restricciones Horarias", "icon": "Clock", "route": "restricciones-horarias"}
]

@api_router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    return CATEGORIES

# ==================== GENERIC RECORDS (for other categories) ====================

class RecordCreate(BaseModel):
    hub_id: str
    category: str
    title: str
    description: Optional[str] = ""
    data: Optional[dict] = {}

class RecordUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None

@api_router.get("/hubs/{hub_id}/records")
async def get_hub_records(
    hub_id: str,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"hub_id": hub_id}
    if category:
        query["category"] = category
    
    records = await db.records.find(query, {"_id": 0}).to_list(1000)
    return records

@api_router.post("/hubs/{hub_id}/records")
async def create_hub_record(hub_id: str, record_data: RecordCreate, current_user: dict = Depends(get_current_user)):
    hub = await db.hubs.find_one({"id": hub_id})
    if not hub:
        raise HTTPException(status_code=404, detail="Hub no encontrado")
    
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "hub_id": hub_id,
        "category": record_data.category,
        "title": record_data.title,
        "description": record_data.description,
        "data": record_data.data,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["id"]
    }
    
    await db.records.insert_one(record)
    return record

@api_router.put("/hubs/{hub_id}/records/{record_id}")
async def update_hub_record(hub_id: str, record_id: str, record_data: RecordUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in record_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.records.update_one(
        {"id": record_id, "hub_id": hub_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    record = await db.records.find_one({"id": record_id}, {"_id": 0})
    return record

@api_router.delete("/hubs/{hub_id}/records/{record_id}")
async def delete_hub_record(hub_id: str, record_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.records.delete_one({"id": record_id, "hub_id": hub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"message": "Registro eliminado correctamente"}

# ==================== STATS ====================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    total_hubs = await db.hubs.count_documents({})
    total_employees = await db.employees.count_documents({})
    total_users = await db.users.count_documents({})
    pending_users = await db.users.count_documents({"is_approved": False})
    
    return {
        "total_hubs": total_hubs,
        "total_employees": total_employees,
        "total_users": total_users,
        "pending_users": pending_users
    }

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
