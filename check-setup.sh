#!/bin/bash

# SignalRanking Setup Diagnostic Script
# This script checks if your environment is properly configured

echo "🔍 SignalRanking Setup Diagnostic"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
ISSUES=0

# 1. Check if backend .env exists
echo "1️⃣  Checking backend environment file..."
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ backend/.env exists${NC}"
    
    # Check for required variables
    if grep -q "MONGO_URL" backend/.env; then
        echo -e "${GREEN}   ✅ MONGO_URL is set${NC}"
    else
        echo -e "${RED}   ❌ MONGO_URL is missing${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        echo -e "${GREEN}   ✅ JWT_SECRET is set${NC}"
    else
        echo -e "${RED}   ❌ JWT_SECRET is missing${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ backend/.env not found${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 2. Check if frontend .env exists
echo "2️⃣  Checking frontend environment file..."
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ frontend/.env exists${NC}"
    
    # Check REACT_APP_BACKEND_URL
    if grep -q "REACT_APP_BACKEND_URL" frontend/.env; then
        BACKEND_URL=$(grep "REACT_APP_BACKEND_URL" frontend/.env | cut -d '=' -f2)
        echo -e "${GREEN}   ✅ REACT_APP_BACKEND_URL is set to: $BACKEND_URL${NC}"
        
        # Warn if using production URL
        if [[ $BACKEND_URL == *"emergentagent.com"* ]]; then
            echo -e "${YELLOW}   ⚠️  Using production URL. For local dev, use: http://localhost:8000${NC}"
        fi
    else
        echo -e "${RED}   ❌ REACT_APP_BACKEND_URL is missing${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ frontend/.env not found${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 3. Check if MongoDB is running
echo "3️⃣  Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        echo -e "${GREEN}✅ MongoDB is running and accessible${NC}"
    else
        echo -e "${RED}❌ MongoDB is not running or not accessible${NC}"
        echo -e "${YELLOW}   💡 Start MongoDB with: mongod${NC}"
        ISSUES=$((ISSUES + 1))
    fi
elif command -v mongo &> /dev/null; then
    if mongo --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        echo -e "${GREEN}✅ MongoDB is running and accessible${NC}"
    else
        echo -e "${RED}❌ MongoDB is not running or not accessible${NC}"
        echo -e "${YELLOW}   💡 Start MongoDB with: mongod${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB client (mongosh/mongo) not found in PATH${NC}"
    echo -e "${YELLOW}   Cannot verify if MongoDB is running${NC}"
fi
echo ""

# 4. Check if Python is installed
echo "4️⃣  Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python is installed: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python3 is not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 5. Check if backend dependencies are installed
echo "5️⃣  Checking backend dependencies..."
if [ -f "backend/requirements.txt" ]; then
    if python3 -c "import fastapi" 2>/dev/null; then
        echo -e "${GREEN}✅ FastAPI is installed${NC}"
    else
        echo -e "${RED}❌ FastAPI is not installed${NC}"
        echo -e "${YELLOW}   💡 Install with: cd backend && pip install -r requirements.txt${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if python3 -c "import uvicorn" 2>/dev/null; then
        echo -e "${GREEN}✅ Uvicorn is installed${NC}"
    else
        echo -e "${RED}❌ Uvicorn is not installed${NC}"
        echo -e "${YELLOW}   💡 Install with: cd backend && pip install -r requirements.txt${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ backend/requirements.txt not found${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 6. Check if Node.js is installed
echo "6️⃣  Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 7. Check if npm is installed
echo "7️⃣  Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm is installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 8. Check if frontend dependencies are installed
echo "8️⃣  Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies are installed${NC}"
else
    echo -e "${RED}❌ Frontend dependencies are not installed${NC}"
    echo -e "${YELLOW}   💡 Install with: cd frontend && npm install${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 9. Check if backend is running
echo "9️⃣  Checking if backend is running..."
if curl -s http://localhost:8000/api/categories > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend is not running on http://localhost:8000${NC}"
    echo -e "${YELLOW}   💡 Start with: cd backend && uvicorn server:app --reload --port 8000${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 10. Check if frontend is running
echo "🔟 Checking if frontend is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend is not running on http://localhost:3000${NC}"
    echo -e "${YELLOW}   💡 Start with: cd frontend && npm start${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Summary
echo "=================================="
echo "📊 Summary"
echo "=================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your environment is properly configured.${NC}"
    echo ""
    echo "🚀 Quick Start:"
    echo "   1. Start backend: cd backend && uvicorn server:app --reload --port 8000"
    echo "   2. Start frontend: cd frontend && npm start"
    echo "   3. Open http://localhost:3000 in your browser"
else
    echo -e "${RED}❌ Found $ISSUES issue(s) that need attention.${NC}"
    echo ""
    echo "📖 See TROUBLESHOOTING.md for detailed solutions."
fi
echo ""

