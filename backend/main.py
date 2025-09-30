from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import sqlite3
from datetime import datetime
from auth import GmailAuth
import httpx
import json
from typing import Optional, List, Dict, Any

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

# OpenRouter Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY not found in environment variables")

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

class Message(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]

class ChatRequest(BaseModel):
    access_token: str
    messages: List[Message]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = True

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

# ENDPOINT 2: List all users (for debugging/admin)
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

# ENDPOINT 3: Stream Chat Response with OpenRouter
@app.post("/api/chat/stream")
async def stream_chat(request: ChatRequest):
    """
    Stream chat responses from OpenRouter API
    - Verifies OAuth token
    - Streams response from OpenRouter
    - Uses model and API key from .env
    """
    try:
        # Verify access token
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        # Get user from database
        user = get_or_create_user(
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info.get("picture")
        )

        if not user:
            raise HTTPException(status_code=500, detail="Failed to get user")

        # Check if user has tokens left
        if user["tokens_left"] <= 0:
            raise HTTPException(
                status_code=403,
                detail="Insufficient tokens. Please contact support to add more tokens."
            )

        # Use model from request or default from env
        model = request.model or OPENROUTER_MODEL

        # Prepare OpenRouter request
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://bytechat.ai",
            "X-Title": "ByteChat"
        }

        # Convert messages to dict format
        messages_dict = [msg.dict() for msg in request.messages]

        payload = {
            "model": model,
            "messages": messages_dict,
            "temperature": request.temperature,
            "stream": True
        }

        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens

        # Stream generator function
        async def generate():
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0

            async with httpx.AsyncClient(timeout=60.0) as client:
                try:
                    async with client.stream(
                        "POST",
                        OPENROUTER_BASE_URL,
                        headers=headers,
                        json=payload
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            yield f"data: {json.dumps({'error': f'OpenRouter API error: {error_text.decode()}'})}\n\n"
                            return

                        async for line in response.aiter_lines():
                            if line.strip():
                                if line.startswith("data: "):
                                    data_str = line[6:]  # Remove "data: " prefix

                                    if data_str.strip() == "[DONE]":
                                        # Update user tokens in database after stream completes
                                        updated_tokens_left = user["tokens_left"]
                                        if total_tokens > 0:
                                            conn = sqlite3.connect(DB_PATH)
                                            cursor = conn.cursor()
                                            cursor.execute('''
                                                UPDATE users
                                                SET tokens_used = tokens_used + ?,
                                                    tokens_left = tokens_left - ?,
                                                    updated_at = ?
                                                WHERE email = ?
                                            ''', (total_tokens, total_tokens, datetime.now(), user["email"]))
                                            conn.commit()

                                            # Get updated token count
                                            cursor.execute("SELECT tokens_left FROM users WHERE email = ?", (user["email"],))
                                            result = cursor.fetchone()
                                            if result:
                                                updated_tokens_left = result[0]

                                            conn.close()

                                            print(f"✅ Updated tokens for {user['email']}: used={total_tokens}, prompt={prompt_tokens}, completion={completion_tokens}, left={updated_tokens_left}")

                                        # Send final message with updated token count
                                        yield f"data: {json.dumps({'type': 'token_update', 'tokens_left': updated_tokens_left, 'tokens_used': total_tokens})}\n\n"
                                        yield f"data: [DONE]\n\n"
                                        break

                                    try:
                                        data = json.loads(data_str)

                                        # Track token usage from OpenRouter response
                                        # OpenRouter sends usage info in each chunk or final chunk
                                        if "usage" in data:
                                            usage = data["usage"]
                                            prompt_tokens = usage.get("prompt_tokens", 0)
                                            completion_tokens = usage.get("completion_tokens", 0)
                                            total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

                                        # Forward the chunk to frontend
                                        yield f"data: {json.dumps(data)}\n\n"
                                    except json.JSONDecodeError:
                                        continue

                except httpx.ReadTimeout:
                    yield f"data: {json.dumps({'error': 'Request timeout'})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'error': f'Stream error: {str(e)}'})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)