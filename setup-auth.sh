#!/bin/bash

# Setup Authentication Database Tables
# Run this after deploying to add User, WebAuthnCredential, and Session tables

echo "🔐 Setting up authentication database..."
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push

echo ""
echo "✅ Authentication setup complete!"
echo ""
echo "You can now:"
echo "  1. Open your browser to http://localhost:3000"
echo "  2. You'll be redirected to /login"
echo "  3. Click 'Registreren'"
echo "  4. Register with your fingerprint"
echo "  5. First user becomes admin automatically!"
echo ""
