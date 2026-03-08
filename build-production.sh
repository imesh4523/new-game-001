#!/bin/bash

# Production Build with Code Protection
# This script builds the app and obfuscates the code automatically

echo "🚀 Starting production build..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
npm run build

# Step 2: Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build complete"
    
    # Step 3: Obfuscate JavaScript files
    echo "🔒 Obfuscating code..."
    tsx scripts/obfuscate-build.ts
    
    if [ $? -eq 0 ]; then
        echo "✅ Code obfuscation complete"
        echo ""
        echo "🎉 Production build ready!"
        echo "📂 Output: dist/public"
        echo ""
        echo "To run production server:"
        echo "  NODE_ENV=production npm start"
    else
        echo "⚠️ Obfuscation failed, but build is complete"
    fi
else
    echo "❌ Build failed"
    exit 1
fi
