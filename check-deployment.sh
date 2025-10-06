#!/bin/bash

# Quick deployment checker
URL="${1:-https://nano-crm.vercel.app}"

echo "🔍 Checking deployment at: $URL"
echo ""

response=$(curl -s --max-time 10 "$URL/healthz" 2>&1)

if echo "$response" | grep -q '"status".*"ok"'; then
    echo "✅ DEPLOYMENT IS LIVE!"
    echo ""
    echo "Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    echo "🧪 Running production tests..."
    ./tests/production-test.sh "$URL"
elif echo "$response" | grep -q "DEPLOYMENT_NOT_FOUND"; then
    echo "❌ Deployment not found yet"
    echo ""
    echo "Please complete these steps:"
    echo "1. Go to: https://vercel.com/new"
    echo "2. Import: 1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm"
    echo "3. Project name: nano-crm"
    echo "4. Framework: Other"
    echo "5. Build command: npm run vercel-build"
    echo "6. Deploy!"
    echo ""
    echo "Then run this script again: ./check-deployment.sh"
else
    echo "⏳ Deployment may be in progress..."
    echo ""
    echo "Response:"
    echo "$response"
    echo ""
    echo "Wait a few minutes and run: ./check-deployment.sh"
fi
