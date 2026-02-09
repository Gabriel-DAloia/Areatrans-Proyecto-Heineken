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

# ==================== CATEGORIES ====================

CATEGORIES = [
    {"name": "Asistencias", "icon": "Wrench", "route": "asistencias"},
    {"name": "Liquidaciones", "icon": "Banknote", "route": "liquidaciones"},
    {"name": "Flota", "icon": "Truck", "route": "flota"},
    {"name": "Historico de incidencias", "icon": "History", "route": "historico-incidencias"},
    {"name": "Repartos", "icon": "Package", "route": "repartos"},
    {"name": "Compras", "icon": "ShoppingCart", "route": "compras"},
    {"name": "Kilos/Litros", "icon": "Scale", "route": "kilos-litros"},
    {"name": "Contactos", "icon": "Users", "route": "contactos"}
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
