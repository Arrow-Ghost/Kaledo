# Kaledo Backend Service (Render)

Node.js + Express backend service for the **Kaledo Academia × Industry Collaboration Platform**.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root service info and uptime |
| `GET` | `/health` | Render health check endpoint |
| `GET` | `/api/health` | API health check endpoint |
| `POST` | `/api/otp/send` | Generates and delivers institutional email verification OTP |
| `POST` | `/api/otp/verify` | Validates OTP, promotes user status, and records audit logs |
| `POST` | `/api/ai/recommend` | Server-side AI career recommendations via Gemini |
| `GET` | `/api/stats` | Platform verification & institution statistics |

## Local Development

```bash
cd backend
npm install
npm run dev
```

## Render Deployment Settings

- **Environment**: Node
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
