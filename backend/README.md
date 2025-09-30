# ByteChat Gmail Backend

A Python FastAPI backend for Gmail authentication and API integration.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Google Client Secret
```

3. Run the server:
```bash
python main.py
```

## API Endpoints

### Authentication
- `GET /auth/login` - Redirect to Google OAuth
- `GET /auth/callback` - Handle OAuth callback
- `POST /api/auth/google` - Verify access token (used by Chrome extension)

### Gmail
- `POST /api/gmail/messages` - Fetch Gmail messages
- `GET /api/gmail/messages?access_token=...` - Fetch Gmail messages via GET

### Health
- `GET /health` - Health check
- `GET /` - Root endpoint

## OAuth Flow

1. Chrome extension gets access token from Google
2. Extension sends token to `/api/auth/google` for verification
3. Backend verifies token and returns user info
4. Backend can fetch Gmail messages using the token

## Environment Variables

- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DEBUG` - Enable debug mode (optional)
- `HOST` - Server host (optional, default: 0.0.0.0)
- `PORT` - Server port (optional, default: 8000)