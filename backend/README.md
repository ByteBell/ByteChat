# ByteChat Backend API

A Python FastAPI backend for Google OAuth authentication and OpenRouter AI chat streaming.

## Features

- ✅ Google OAuth token verification
- ✅ User management with SQLite database
- ✅ Token-based usage tracking (1M tokens per user)
- ✅ OpenRouter API streaming integration
- ✅ Real-time token counting and database updates

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=openai/gpt-4

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### 3. Run the server

```bash
python main.py
```

Server will start at `http://localhost:8000`

---

## API Documentation

### Base URL

```
http://localhost:8000
```

---

## Endpoints

### 1. **Google Authentication** - `POST /api/auth/google`

Verify Google OAuth access token and authenticate user.

**Request:**

```json
{
  "access_token": "ya29.a0AfB_byC..."
}
```

**Response:**

```json
{
  "id": 1,
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "total_tokens": 1000000,
  "tokens_used": 15420,
  "tokens_left": 984580
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid access token
- `500` - Server error

**Example (cURL):**

```bash
curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfB_byC..."
  }'
```

**Example (JavaScript):**

```javascript
const response = await fetch('http://localhost:8000/api/auth/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    access_token: 'ya29.a0AfB_byC...'
  })
});

const user = await response.json();
console.log(user);
```

**Example (Python):**

```python
import requests

response = requests.post(
    'http://localhost:8000/api/auth/google',
    json={'access_token': 'ya29.a0AfB_byC...'}
)

user = response.json()
print(user)
```

---

### 2. **List Users** - `GET /api/users`

List all users with their token information (Admin/Debug endpoint).

**Response:**

```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "id": 1,
      "email": "user@gmail.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/...",
      "total_tokens": 1000000,
      "tokens_used": 15420,
      "tokens_left": 984580,
      "created_at": "2025-01-15 10:30:00",
      "updated_at": "2025-01-15 14:22:10"
    }
  ]
}
```

**Example (cURL):**

```bash
curl http://localhost:8000/api/users
```

---

### 3. **Stream Chat** - `POST /api/chat/stream`

Stream AI chat responses from OpenRouter API with real-time token tracking.

**Request:**

```json
{
  "access_token": "ya29.a0AfB_byC...",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello! How are you?"
    }
  ],
  "model": "openai/gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": true
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | ✅ Yes | Google OAuth access token |
| `messages` | array | ✅ Yes | Chat message history |
| `model` | string | ❌ No | OpenRouter model (defaults to env) |
| `temperature` | float | ❌ No | Response randomness 0-1 (default: 0.7) |
| `max_tokens` | integer | ❌ No | Maximum tokens in response |
| `stream` | boolean | ❌ No | Enable streaming (default: true) |

**Message Format:**

```json
{
  "role": "user | assistant | system",
  "content": "text content"
}
```

**Response (Server-Sent Events):**

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":8,"total_tokens":20}}

data: {"type":"token_update","tokens_left":984580,"tokens_used":20}

data: [DONE]
```

**Token Update Message:**

Before `[DONE]`, the backend sends a `token_update` message with the user's updated token balance:

```json
{
  "type": "token_update",
  "tokens_left": 984580,
  "tokens_used": 20
}
```

The frontend can use this to update the UI in real-time.

**Features:**
- ✅ Verifies OAuth token before processing
- ✅ Checks user token balance
- ✅ Streams response chunks in real-time
- ✅ Counts tokens (prompt + completion)
- ✅ Updates SQLite database with token usage
- ✅ Returns error if insufficient tokens

**Status Codes:**
- `200` - Success (streaming)
- `401` - Invalid access token
- `403` - Insufficient tokens
- `500` - Server error

**Example (cURL):**

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfB_byC...",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "model": "openai/gpt-4",
    "temperature": 0.7
  }'
```

**Example (JavaScript with EventSource - does NOT work for POST):**

Note: EventSource doesn't support POST requests. Use `fetch` with streaming:

```javascript
const response = await fetch('http://localhost:8000/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    access_token: 'ya29.a0AfB_byC...',
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    model: 'openai/gpt-4',
    temperature: 0.7
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);

      if (data === '[DONE]') {
        console.log('Stream finished');
        break;
      }

      try {
        const json = JSON.parse(data);
        const content = json.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
```

**Example (Python with httpx):**

```python
import httpx
import json

async def stream_chat():
    url = 'http://localhost:8000/api/chat/stream'

    payload = {
        'access_token': 'ya29.a0AfB_byC...',
        'messages': [
            {'role': 'user', 'content': 'Hello!'}
        ],
        'model': 'openai/gpt-4',
        'temperature': 0.7
    }

    async with httpx.AsyncClient() as client:
        async with client.stream('POST', url, json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    data_str = line[6:]

                    if data_str.strip() == '[DONE]':
                        print('\nStream finished')
                        break

                    try:
                        data = json.loads(data_str)
                        content = data['choices'][0]['delta'].get('content', '')
                        if content:
                            print(content, end='', flush=True)
                    except:
                        pass

# Run
import asyncio
asyncio.run(stream_chat())
```

**Example (Python with requests - simpler):**

```python
import requests
import json

url = 'http://localhost:8000/api/chat/stream'

payload = {
    'access_token': 'ya29.a0AfB_byC...',
    'messages': [
        {'role': 'user', 'content': 'Hello!'}
    ],
    'model': 'openai/gpt-4'
}

response = requests.post(url, json=payload, stream=True)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data_str = line[6:]

            if data_str.strip() == '[DONE]':
                print('\nStream finished')
                break

            try:
                data = json.loads(data_str)
                content = data['choices'][0]['delta'].get('content', '')
                if content:
                    print(content, end='', flush=True)
            except:
                pass
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
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
```

**Fields:**
- `total_tokens` - Total tokens allocated (default: 1,000,000)
- `tokens_used` - Cumulative tokens consumed
- `tokens_left` - Remaining tokens available

---

## Token Tracking

The streaming endpoint automatically:

1. ✅ Counts **prompt tokens** (input)
2. ✅ Counts **completion tokens** (output)
3. ✅ Calculates **total tokens** used
4. ✅ Updates database when stream completes
5. ✅ Prevents requests if `tokens_left <= 0`

**Token Update Example:**

```
User before: tokens_left = 100000
Request uses: 450 tokens (300 prompt + 150 completion)
User after: tokens_left = 99550, tokens_used = 450
```

---

## Error Handling

### Common Errors

**401 Unauthorized:**
```json
{
  "detail": "Invalid access token"
}
```

**403 Forbidden:**
```json
{
  "detail": "Insufficient tokens. Please contact support to add more tokens."
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to process chat request: [error message]"
}
```

---

## Testing

### Health Check

```bash
curl http://localhost:8000
```

### Test Authentication

```bash
curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"access_token": "your_token_here"}'
```

### Test Streaming

```bash
curl -N -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "your_token_here",
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

---

## Production Deployment

### Security Recommendations

1. **Update CORS settings** in `main.py`:
   ```python
   allow_origins=["https://yourdomain.com"]
   ```

2. **Use environment variables** (never commit `.env`)

3. **Enable HTTPS** with reverse proxy (nginx/Caddy)

4. **Rate limiting** - Add rate limiting middleware

5. **Authentication** - Implement API key authentication for `/api/users`

### Deploy with Uvicorn

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## License

MIT