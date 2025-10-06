#!/bin/bash

# Continuous monitoring for Vercel deployment
URL="https://nano-crm.vercel.app"
CHECK_INTERVAL=10  # Check every 10 seconds
MAX_CHECKS=180     # Max 30 minutes (180 * 10 seconds)

echo "🚀 Starting continuous monitoring for: $URL"
echo "⏰ Checking every $CHECK_INTERVAL seconds"
echo "🎯 Will check for up to 30 minutes"
echo ""

count=0
while [ $count -lt $MAX_CHECKS ]; do
    response=$(curl -s --max-time 5 "$URL/healthz" 2>&1)
    
    if echo "$response" | grep -q '"status".*"ok"'; then
        echo ""
        echo "🎉 DEPLOYMENT DETECTED!"
        echo "✅ nano-crm is now live at: $URL"
        echo ""
        echo "Response:"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        echo ""
        echo "🧪 Running comprehensive production tests..."
        echo ""
        
        if [ -f "./tests/production-test.sh" ]; then
            ./tests/production-test.sh "$URL"
            exit_code=$?
            
            if [ $exit_code -eq 0 ]; then
                echo ""
                echo "🎉 SUCCESS! nano-crm is fully operational!"
                echo "🌐 Live URL: $URL"
                exit 0
            else
                echo ""
                echo "⚠️  Some tests failed. Please review the output above."
                exit 1
            fi
        else
            echo "✅ Deployment is live!"
            echo "⚠️  Production test script not found"
            exit 0
        fi
    elif echo "$response" | grep -q "DEPLOYMENT_NOT_FOUND"; then
        # Silent - deployment not found yet
        :
    else
        # Deployment might be starting
        echo "⏳ [$(date '+%H:%M:%S')] Deployment detected, waiting for it to be ready..."
    fi
    
    count=$((count + 1))
    sleep $CHECK_INTERVAL
done

echo ""
echo "⏰ Timeout: No deployment detected after 30 minutes"
echo ""
echo "Please check:"
echo "1. Vercel dashboard for deployment status"
echo "2. Build logs for any errors"
echo "3. That you've started the deployment"
echo ""
echo "Manual check: curl $URL/healthz"
exit 1
