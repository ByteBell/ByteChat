from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from auth import GmailAuth

load_dotenv()

app = FastAPI(title="ByteChat Gmail API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gmail Auth
GOOGLE_CLIENT_ID = "842265721700-a7hq7miue3b6bjgrspsiak9hgc39hk4g.apps.googleusercontent.com"  # From manifest.json
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if not GOOGLE_CLIENT_SECRET:
    raise ValueError("GOOGLE_CLIENT_SECRET not found in environment variables")

gmail_auth = GmailAuth(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    redirect_uri="http://localhost:8000/auth/callback"
)

# Pydantic models
class TokenRequest(BaseModel):
    access_token: str

class AuthCodeRequest(BaseModel):
    code: str

# Routes
@app.get("/")
async def root():
    return {"message": "ByteChat Gmail API is running"}

@app.get("/auth/login")
async def login():
    """Redirect to Google OAuth login"""
    auth_url = gmail_auth.get_authorization_url()
    return RedirectResponse(url=auth_url)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    """Handle OAuth callback"""
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")

    if not code:
        raise HTTPException(status_code=400, detail="Authorization code not provided")

    try:
        tokens = gmail_auth.exchange_code_for_tokens(code)
        return {
            "message": "Authentication successful",
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "expires_in": tokens["expires_in"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

@app.post("/api/auth/google")
async def verify_google_token(request: TokenRequest):
    """Verify Google access token (used by Chrome extension)"""
    try:
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        return {
            "success": True,
            "user": user_info
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

@app.post("/api/gmail/messages")
async def get_gmail_messages(request: TokenRequest):
    """Fetch Gmail messages"""
    try:
        user_info = gmail_auth.verify_access_token(request.access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        emails = gmail_auth.get_user_emails(request.access_token, max_results=20)

        return {
            "success": True,
            "user": user_info,
            "emails": emails,
            "count": len(emails)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emails: {str(e)}")

@app.get("/api/gmail/messages")
async def get_gmail_messages_get(access_token: str):
    """Fetch Gmail messages via GET request"""
    try:
        user_info = gmail_auth.verify_access_token(access_token)

        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid access token")

        emails = gmail_auth.get_user_emails(access_token, max_results=20)

        return {
            "success": True,
            "user": user_info,
            "emails": emails,
            "count": len(emails)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emails: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ByteChat Gmail API",
        "google_client_configured": bool(GOOGLE_CLIENT_SECRET)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)