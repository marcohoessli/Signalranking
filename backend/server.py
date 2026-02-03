from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration - No fallback, must be set in environment
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="SignalRanking API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    accuracy_score: float
    total_predictions: int
    picture: Optional[str] = None
    created_at: datetime

class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    accuracy_score: float
    total_predictions: int
    picture: Optional[str] = None
    created_at: datetime
    category_stats: Optional[dict] = None

# Question Models
class QuestionCreate(BaseModel):
    title: str
    description: str
    category: str
    closing_date: datetime
    resolution_source: str

class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    closing_date: Optional[datetime] = None
    resolution_source: Optional[str] = None

class QuestionResolve(BaseModel):
    outcome: bool  # True = YES, False = NO

class QuestionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str
    title: str
    description: str
    category: str
    closing_date: datetime
    resolution_source: str
    status: str  # open, closed, resolved
    outcome: Optional[bool] = None
    created_by: str
    created_at: datetime
    prediction_count: Optional[int] = 0

# Prediction Models
class PredictionCreate(BaseModel):
    question_id: str
    probability: float = Field(ge=0, le=100)

class PredictionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prediction_id: str
    user_id: str
    question_id: str
    probability: float
    brier_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

class PredictionWithQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prediction_id: str
    user_id: str
    question_id: str
    probability: float
    brier_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    question_title: Optional[str] = None
    question_category: Optional[str] = None
    question_status: Optional[str] = None
    question_outcome: Optional[bool] = None

# Leaderboard Models
class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rank: int
    user_id: str
    name: str
    accuracy_score: float
    total_predictions: int
    picture: Optional[str] = None

# Role Update Model
class RoleUpdate(BaseModel):
    role: str  # 'user' or 'admin'

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> dict:
    """Get current user from session_token cookie or Authorization header"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if session:
        # Validate expiry
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one(
            {"user_id": session["user_id"]},
            {"_id": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Try JWT token
    try:
        payload = decode_jwt_token(session_token)
        user = await db.users.find_one(
            {"user_id": payload["user_id"]},
            {"_id": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid authentication")

async def get_admin_user(request: Request) -> dict:
    """Get current user and verify admin role"""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def calculate_brier_score(probability: float, outcome: bool) -> float:
    """Calculate Brier score for a prediction
    probability: 0-100 (user's prediction)
    outcome: True (YES) or False (NO)
    Returns: 0-1 (lower is better)
    """
    prob_decimal = probability / 100.0
    outcome_value = 1.0 if outcome else 0.0
    return (prob_decimal - outcome_value) ** 2

async def update_user_accuracy(user_id: str):
    """Recalculate user's accuracy score based on all resolved predictions"""
    predictions = await db.predictions.find(
        {"user_id": user_id, "brier_score": {"$ne": None}},
        {"_id": 0}
    ).to_list(None)
    
    if not predictions:
        return
    
    total_brier = sum(p["brier_score"] for p in predictions)
    avg_brier = total_brier / len(predictions)
    accuracy_score = (1 - avg_brier) * 100  # Convert to percentage
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"accuracy_score": accuracy_score, "total_predictions": len(predictions)}}
    )

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "role": "user",
        "accuracy_score": 0.0,
        "total_predictions": 0,
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create JWT token
    token = create_jwt_token(user_id)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": "user",
        "accuracy_score": 0.0,
        "total_predictions": 0,
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user["user_id"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "accuracy_score": user.get("accuracy_score", 0),
        "total_predictions": user.get("total_predictions", 0),
        "picture": user.get("picture"),
        "token": token
    }

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session_id and create user session"""
    import httpx
    
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user_id = user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": None,
            "role": "user",
            "accuracy_score": 0.0,
            "total_predictions": 0,
            "picture": picture,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    # Get updated user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "accuracy_score": user.get("accuracy_score", 0),
        "total_predictions": user.get("total_predictions", 0),
        "picture": user.get("picture")
    }

@api_router.get("/auth/me")
async def get_current_user_info(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "accuracy_score": user.get("accuracy_score", 0),
        "total_predictions": user.get("total_predictions", 0),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== QUESTION ENDPOINTS ==============

@api_router.get("/questions", response_model=List[QuestionResponse])
async def get_questions(
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    
    questions = await db.questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Get prediction counts in single aggregation query (avoid N+1)
    if questions:
        question_ids = [q["question_id"] for q in questions]
        counts_cursor = db.predictions.aggregate([
            {"$match": {"question_id": {"$in": question_ids}}},
            {"$group": {"_id": "$question_id", "count": {"$sum": 1}}}
        ])
        counts_map = {doc["_id"]: doc["count"] async for doc in counts_cursor}
        
        for q in questions:
            q["prediction_count"] = counts_map.get(q["question_id"], 0)
            # Convert datetime if needed
            if isinstance(q.get("closing_date"), str):
                q["closing_date"] = datetime.fromisoformat(q["closing_date"])
            if isinstance(q.get("created_at"), str):
                q["created_at"] = datetime.fromisoformat(q["created_at"])
    
    return questions
    
    return questions

@api_router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str):
    question = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    count = await db.predictions.count_documents({"question_id": question_id})
    question["prediction_count"] = count
    
    if isinstance(question.get("closing_date"), str):
        question["closing_date"] = datetime.fromisoformat(question["closing_date"])
    if isinstance(question.get("created_at"), str):
        question["created_at"] = datetime.fromisoformat(question["created_at"])
    
    return question

@api_router.post("/questions", response_model=QuestionResponse)
async def create_question(question_data: QuestionCreate, request: Request):
    user = await get_admin_user(request)
    
    question_id = f"q_{uuid.uuid4().hex[:12]}"
    question_doc = {
        "question_id": question_id,
        "title": question_data.title,
        "description": question_data.description,
        "category": question_data.category,
        "closing_date": question_data.closing_date,
        "resolution_source": question_data.resolution_source,
        "status": "open",
        "outcome": None,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.questions.insert_one(question_doc)
    question_doc["prediction_count"] = 0
    return question_doc

@api_router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, question_data: QuestionUpdate, request: Request):
    await get_admin_user(request)
    
    question = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = {k: v for k, v in question_data.model_dump().items() if v is not None}
    if update_data:
        await db.questions.update_one(
            {"question_id": question_id},
            {"$set": update_data}
        )
    
    updated = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    count = await db.predictions.count_documents({"question_id": question_id})
    updated["prediction_count"] = count
    return updated

@api_router.put("/questions/{question_id}/resolve")
async def resolve_question(question_id: str, resolution: QuestionResolve, request: Request):
    await get_admin_user(request)
    
    question = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Question already resolved")
    
    # Update question status
    await db.questions.update_one(
        {"question_id": question_id},
        {"$set": {"status": "resolved", "outcome": resolution.outcome}}
    )
    
    # Calculate Brier scores for all predictions
    predictions = await db.predictions.find(
        {"question_id": question_id},
        {"_id": 0}
    ).to_list(None)
    
    user_ids = set()
    for pred in predictions:
        brier_score = calculate_brier_score(pred["probability"], resolution.outcome)
        await db.predictions.update_one(
            {"prediction_id": pred["prediction_id"]},
            {"$set": {"brier_score": brier_score}}
        )
        user_ids.add(pred["user_id"])
    
    # Update all affected users' accuracy scores
    for user_id in user_ids:
        await update_user_accuracy(user_id)
    
    return {"message": "Question resolved", "outcome": resolution.outcome, "predictions_scored": len(predictions)}

@api_router.delete("/questions/{question_id}")
async def delete_question(question_id: str, request: Request):
    await get_admin_user(request)
    
    question = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Delete question and related predictions
    await db.questions.delete_one({"question_id": question_id})
    await db.predictions.delete_many({"question_id": question_id})
    
    return {"message": "Question deleted"}

# ============== PREDICTION ENDPOINTS ==============

@api_router.post("/predictions", response_model=PredictionResponse)
async def create_or_update_prediction(pred_data: PredictionCreate, request: Request):
    user = await get_current_user(request)
    
    # Get question
    question = await db.questions.find_one({"question_id": pred_data.question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if question is still open
    if question["status"] != "open":
        raise HTTPException(status_code=400, detail="Question is no longer accepting predictions")
    
    # Check closing date
    closing_date = question["closing_date"]
    if isinstance(closing_date, str):
        closing_date = datetime.fromisoformat(closing_date)
    if closing_date.tzinfo is None:
        closing_date = closing_date.replace(tzinfo=timezone.utc)
    if closing_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Prediction deadline has passed")
    
    # Check for existing prediction
    existing = await db.predictions.find_one(
        {"user_id": user["user_id"], "question_id": pred_data.question_id},
        {"_id": 0}
    )
    
    now = datetime.now(timezone.utc)
    
    if existing:
        # Update existing prediction
        await db.predictions.update_one(
            {"prediction_id": existing["prediction_id"]},
            {"$set": {"probability": pred_data.probability, "updated_at": now}}
        )
        existing["probability"] = pred_data.probability
        existing["updated_at"] = now
        return existing
    else:
        # Create new prediction
        prediction_id = f"pred_{uuid.uuid4().hex[:12]}"
        pred_doc = {
            "prediction_id": prediction_id,
            "user_id": user["user_id"],
            "question_id": pred_data.question_id,
            "probability": pred_data.probability,
            "brier_score": None,
            "created_at": now,
            "updated_at": now
        }
        await db.predictions.insert_one(pred_doc)
        return pred_doc

@api_router.get("/predictions/user/{user_id}", response_model=List[PredictionWithQuestion])
async def get_user_predictions(user_id: str):
    predictions = await db.predictions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    
    # Enrich with question data
    for pred in predictions:
        question = await db.questions.find_one(
            {"question_id": pred["question_id"]},
            {"_id": 0}
        )
        if question:
            pred["question_title"] = question["title"]
            pred["question_category"] = question["category"]
            pred["question_status"] = question["status"]
            pred["question_outcome"] = question.get("outcome")
        
        if isinstance(pred.get("created_at"), str):
            pred["created_at"] = datetime.fromisoformat(pred["created_at"])
        if isinstance(pred.get("updated_at"), str):
            pred["updated_at"] = datetime.fromisoformat(pred["updated_at"])
    
    return predictions

@api_router.get("/predictions/question/{question_id}", response_model=List[PredictionResponse])
async def get_question_predictions(question_id: str):
    predictions = await db.predictions.find(
        {"question_id": question_id},
        {"_id": 0}
    ).to_list(None)
    
    for pred in predictions:
        if isinstance(pred.get("created_at"), str):
            pred["created_at"] = datetime.fromisoformat(pred["created_at"])
        if isinstance(pred.get("updated_at"), str):
            pred["updated_at"] = datetime.fromisoformat(pred["updated_at"])
    
    return predictions

@api_router.get("/predictions/my/{question_id}")
async def get_my_prediction(question_id: str, request: Request):
    user = await get_current_user(request)
    
    prediction = await db.predictions.find_one(
        {"user_id": user["user_id"], "question_id": question_id},
        {"_id": 0}
    )
    
    if not prediction:
        return {"prediction": None}
    
    if isinstance(prediction.get("created_at"), str):
        prediction["created_at"] = datetime.fromisoformat(prediction["created_at"])
    if isinstance(prediction.get("updated_at"), str):
        prediction["updated_at"] = datetime.fromisoformat(prediction["updated_at"])
    
    return {"prediction": prediction}

# ============== LEADERBOARD ENDPOINTS ==============

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(min_predictions: int = 3):
    """Get global leaderboard sorted by accuracy score"""
    users = await db.users.find(
        {"total_predictions": {"$gte": min_predictions}},
        {"_id": 0}
    ).sort("accuracy_score", -1).to_list(100)
    
    leaderboard = []
    for i, user in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "user_id": user["user_id"],
            "name": user["name"],
            "accuracy_score": user.get("accuracy_score", 0),
            "total_predictions": user.get("total_predictions", 0),
            "picture": user.get("picture")
        })
    
    return leaderboard

# ============== USER PROFILE ENDPOINTS ==============

@api_router.get("/users/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate category stats
    predictions = await db.predictions.find(
        {"user_id": user_id, "brier_score": {"$ne": None}},
        {"_id": 0}
    ).to_list(None)
    
    category_stats = {}
    for pred in predictions:
        question = await db.questions.find_one(
            {"question_id": pred["question_id"]},
            {"_id": 0}
        )
        if question:
            category = question["category"]
            if category not in category_stats:
                category_stats[category] = {"total_brier": 0, "count": 0}
            category_stats[category]["total_brier"] += pred["brier_score"]
            category_stats[category]["count"] += 1
    
    # Convert to accuracy percentages
    for cat in category_stats:
        avg_brier = category_stats[cat]["total_brier"] / category_stats[cat]["count"]
        category_stats[cat] = {
            "accuracy": round((1 - avg_brier) * 100, 2),
            "count": category_stats[cat]["count"]
        }
    
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    user["category_stats"] = category_stats
    return user

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role_data: RoleUpdate, request: Request):
    await get_admin_user(request)
    
    if role_data.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role_data.role}}
    )
    
    return {"message": f"User role updated to {role_data.role}"}

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(request: Request):
    await get_admin_user(request)
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return users

# ============== STATS ENDPOINTS ==============

@api_router.get("/stats")
async def get_platform_stats():
    """Get platform statistics for landing page"""
    total_users = await db.users.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    total_questions = await db.questions.count_documents({})
    resolved_questions = await db.questions.count_documents({"status": "resolved"})
    
    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_questions": total_questions,
        "resolved_questions": resolved_questions
    }

# ============== CATEGORIES ENDPOINT ==============

@api_router.get("/categories")
async def get_categories():
    """Get all available categories"""
    return {
        "categories": ["Crypto", "Politics", "Tech", "Sports", "Other"]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
