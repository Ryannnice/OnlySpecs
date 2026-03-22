#!/bin/bash

# OnlySpecs Frontend Integration - Quick Start Script

echo "🚀 OnlySpecs Frontend Integration"
echo "=================================="
echo ""

# Check if OnlySpecs API is running
echo "📡 Checking OnlySpecs API server..."
if curl -s http://localhost:3580/api/tasks > /dev/null 2>&1; then
    echo "✅ OnlySpecs API is running on port 3580"
else
    echo "⚠️  OnlySpecs API is not running!"
    echo "   Please start it first with: cd ~/OnlySpecs && npm run api"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

echo ""
echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "🌐 Starting FastAPI server on port 9000..."
echo "   Access the frontend at: http://localhost:9000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
