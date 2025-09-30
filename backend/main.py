from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import sqlite3
from datetime import datetime
from auth import GmailAuth

load_dotenv()

app = FastAPI(title="ByteChat Google Auth API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gmail Auth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
if not GOOGLE_CLIENT_SECRET:
    raise ValueError("GOOGLE_CLIENT_SECRET not found in environment variables")

gmail_auth = GmailAuth(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET
)

# SQLite Database Setup
DB_PATH = "users.db"

def init_database():
    """Initialize SQLite database with users table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            picture TEXT,
            total_tokens INTEGER DEFAULT 1000000,
            tokens_used INTEGER DEFAULT 0,
            tokens_left INTEGER DEFAULT 1000000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def get_or_create_user(email: str, name: str, picture: str = None):
    """Get existing user or create new one with default tokens"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if user exists
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if user:
        # Update existing user info
        cursor.execute('''
            UPDATE users
            SET name = ?, picture = ?, updated_at = ?
            WHERE email = ?
        ''', (name, picture, datetime.now(), email))
        conn.commit()

        # Get updated user
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
    else:
        # Create new user with 1 million tokens
        cursor.execute('''
            INSERT INTO users (email, name, picture, total_tokens, tokens_used, tokens_left)
            VALUES (?, ?, ?, 1000000, 0, 1000000)
        ''', (email, name, picture))
        conn.commit()

        # Get created user
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

    conn.close()

    if user:
        return {
            "id": user[0],
            "email": user[1],
            "name": user[2],
            "picture": user[3],
            "total_tokens": user[4],
            "tokens_used": user[5],
            "tokens_left": user[6]
        }
    return None

# Initialize database on startup
init_database()

# Pydantic models
class TokenRequest(BaseModel):
    access_token: str

# ENDPOINT 1: Google Sign-in (Token Verification) - Frontend working code endpoint
@app.post("/api/auth/google")
async def google_auth(request: TokenRequest):
    """
    Verify Google access token and authenticate user
    Called by frontend working code
    """
    try:
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        # Get or create user in SQLite with default 1M tokens
        user = get_or_create_user(
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info.get("picture")
        )

        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user")

        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google authentication failed: {str(e)}")

# ENDPOINT 2: Google Sign-in (Alternative endpoint for compatibility)
@app.post("/auth/google-signin")
async def google_signin(request: TokenRequest):
    """
    Verify Google access token and sign in user
    Called when user clicks 'Continue with Google' from frontend
    """
    try:
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        # Get or create user in SQLite
        user = get_or_create_user(
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info.get("picture")
        )

        return {
            "success": True,
            "message": "Google sign-in successful",
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google sign-in failed: {str(e)}")

# ENDPOINT 3: Verify Token (Ongoing verification)
@app.post("/auth/verify-token")
async def verify_token(request: TokenRequest):
    """
    Verify if user's token is still valid
    Used for ongoing authentication checks
    """
    try:
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Token is invalid or expired")

        # Get user from SQLite
        user = get_or_create_user(
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info.get("picture")
        )

        return {
            "success": True,
            "valid": True,
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

# ENDPOINT 4: List all users (for debugging/admin)
@app.get("/api/users")
async def list_users():
    """
    List all users in the database with their token information
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        conn.close()

        user_list = []
        for user in users:
            user_list.append({
                "id": user[0],
                "email": user[1],
                "name": user[2],
                "picture": user[3],
                "total_tokens": user[4],
                "tokens_used": user[5],
                "tokens_left": user[6],
                "created_at": user[7],
                "updated_at": user[8]
            })

        return {
            "success": True,
            "count": len(user_list),
            "users": user_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)