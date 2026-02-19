# Login Troubleshooting Guide

This guide will help you diagnose and fix login issues in the SignalRanking application.

## Quick Diagnostic Checklist

### 1. ✅ Check Environment Variables

**Frontend (.env file location: `frontend/.env`)**
```bash
# Current setting:
REACT_APP_BACKEND_URL=https://predictify-36.preview.emergentagent.com

# For local development, it should be:
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Backend (.env file location: `backend/.env`)**
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET="signalranking-jwt-secret-key-production-change"
```

⚠️ **IMPORTANT**: If you're running locally, update `frontend/.env` to point to `http://localhost:8000`

### 2. 🚀 Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Test the backend is running:**
```bash
curl http://localhost:8000/api/categories
```

### 3. 🎨 Start the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start the React app
npm start
```

The app should open at `http://localhost:3000`

### 4. 🔍 Check for Console Errors

Open your browser's Developer Tools (F12 or Right-click → Inspect) and check:

**Console Tab** - Look for errors like:
- ❌ `Failed to fetch` - Backend not running or wrong URL
- ❌ `CORS error` - CORS configuration issue (should be fixed in PR #1)
- ❌ `401 Unauthorized` - Authentication issue
- ❌ `Network Error` - Backend unreachable

**Network Tab** - Check the login request:
1. Try to log in
2. Look for a request to `/api/auth/login`
3. Check:
   - **Status Code**: Should be 200 for success
   - **Request URL**: Should match your `REACT_APP_BACKEND_URL`
   - **Response**: Should contain `token` field

### 5. 🌐 Verify CORS Configuration

The CORS fix in PR #1 should resolve most CORS issues. If you still see CORS errors:

1. Check that the backend is running with the updated code from PR #1
2. Verify the CORS middleware is configured (it should be after merging PR #1)
3. Check browser console for specific CORS error messages

### 6. 🔐 Test Authentication Flow

**Manual Test Steps:**

1. **Signup Test**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User","password":"testpass123"}'
   ```
   Expected: `{"user_id":"...","email":"test@example.com",...,"token":"..."}`

2. **Login Test**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'
   ```
   Expected: `{"user_id":"...","email":"test@example.com",...,"token":"..."}`

3. **Auth Check Test**:
   ```bash
   # Replace YOUR_TOKEN with the token from login response
   curl -X GET http://localhost:8000/api/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Expected: User data without password

## Common Issues and Solutions

### Issue: "Failed to fetch" or "Network Error"

**Cause**: Backend is not running or frontend is pointing to wrong URL

**Solution**:
1. Make sure backend is running: `uvicorn server:app --reload --port 8000`
2. Check `frontend/.env` has correct `REACT_APP_BACKEND_URL`
3. For local dev: `REACT_APP_BACKEND_URL=http://localhost:8000`
4. Restart frontend after changing .env: `npm start`

### Issue: CORS Error

**Cause**: CORS middleware not configured properly

**Solution**:
1. Merge PR #1 which fixes CORS configuration
2. Restart the backend server
3. Clear browser cache and try again

### Issue: "Invalid email or password"

**Cause**: User doesn't exist or wrong credentials

**Solution**:
1. Try signing up first if you haven't
2. Check that MongoDB is running: `mongosh` or `mongo`
3. Verify user exists in database:
   ```bash
   mongosh
   use test_database
   db.users.find({email: "your@email.com"})
   ```

### Issue: Token not persisting / Logged out on refresh

**Cause**: React hooks dependency issue (fixed in PR #1)

**Solution**:
1. Merge PR #1 which fixes the React hooks
2. Clear browser localStorage: 
   - Open DevTools → Application → Local Storage → Clear
3. Try logging in again

### Issue: MongoDB Connection Error

**Cause**: MongoDB is not running

**Solution**:
```bash
# Start MongoDB (depends on your installation)
# macOS with Homebrew:
brew services start mongodb-community

# Linux with systemd:
sudo systemctl start mongod

# Or run manually:
mongod --dbpath /path/to/data/directory
```

## Environment Setup Summary

### For Local Development:

1. **Backend** (`backend/.env`):
   ```
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="test_database"
   JWT_SECRET="your-secret-key-here"
   ```

2. **Frontend** (`frontend/.env`):
   ```
   REACT_APP_BACKEND_URL=http://localhost:8000
   WDS_SOCKET_PORT=443
   ENABLE_HEALTH_CHECK=false
   ```

3. **Start Services**:
   ```bash
   # Terminal 1 - MongoDB
   mongod
   
   # Terminal 2 - Backend
   cd backend && uvicorn server:app --reload --port 8000
   
   # Terminal 3 - Frontend
   cd frontend && npm start
   ```

### For Production/Preview:

Your current setup points to:
```
REACT_APP_BACKEND_URL=https://predictify-36.preview.emergentagent.com
```

Make sure:
1. Backend is deployed and accessible at that URL
2. MongoDB is accessible from the backend
3. CORS allows requests from your frontend domain

## Still Having Issues?

1. Check the browser console for specific error messages
2. Check backend logs for errors
3. Verify all services are running (MongoDB, Backend, Frontend)
4. Try the manual curl tests above to isolate the issue
5. Clear browser cache and localStorage
6. Try in an incognito/private window to rule out extension issues

## Need More Help?

Share the following information:
- Browser console errors (screenshot or copy/paste)
- Network tab showing the failed request
- Backend logs/errors
- Your environment setup (local vs production)

