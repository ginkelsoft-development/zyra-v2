#!/bin/bash

echo "🚀 Insurance Orchestrator POC - Quick Start"
echo "=========================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 Starting the application..."
echo "================================"
echo ""

npm run dev

# The app will be available at http://localhost:3000
