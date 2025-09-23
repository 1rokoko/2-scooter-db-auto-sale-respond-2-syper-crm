#!/bin/bash

# Monitor deployment and run tests when ready
# Usage: ./monitor-deployment.sh [URL]

URL="${1:-https://nano-crm.vercel.app}"
MAX_WAIT_TIME=1800  # 30 minutes
CHECK_INTERVAL=30   # 30 seconds

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

check_deployment() {
    local url="$1"
    
    log "Checking deployment at: $url"
    
    # Try to access health endpoint
    response=$(curl -s --max-time 10 "$url/healthz" 2>/dev/null)
    
    if echo "$response" | grep -q '"status".*"ok"'; then
        log "✅ Deployment is live and responding!"
        return 0
    elif echo "$response" | grep -q "DEPLOYMENT_NOT_FOUND"; then
        log "⏳ Deployment not found yet..."
        return 1
    elif echo "$response" | grep -q "502\|503\|504"; then
        log "⏳ Deployment starting up..."
        return 1
    else
        log "⏳ Waiting for deployment..."
        return 1
    fi
}

wait_for_deployment() {
    local url="$1"
    local start_time=$(date +%s)
    local elapsed=0
    
    log "🚀 Monitoring deployment at: $url"
    log "⏰ Maximum wait time: $((MAX_WAIT_TIME / 60)) minutes"
    log ""
    
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        if check_deployment "$url"; then
            log ""
            log "🎉 Deployment is ready!"
            return 0
        fi
        
        sleep $CHECK_INTERVAL
        elapsed=$(( $(date +%s) - start_time ))
        
        # Show progress every 2 minutes
        if [ $((elapsed % 120)) -eq 0 ] && [ $elapsed -gt 0 ]; then
            log "⏰ Waiting... ${elapsed}s elapsed (max: ${MAX_WAIT_TIME}s)"
        fi
    done
    
    log "❌ Timeout: Deployment not ready after $((MAX_WAIT_TIME / 60)) minutes"
    return 1
}

run_production_tests() {
    local url="$1"
    
    log ""
    log "🧪 Starting comprehensive production tests..."
    log ""
    
    if [ -f "./tests/production-test.sh" ]; then
        chmod +x "./tests/production-test.sh"
        "./tests/production-test.sh" "$url"
        return $?
    else
        log "❌ Production test script not found: ./tests/production-test.sh"
        return 1
    fi
}

main() {
    local url="$1"
    
    log "🚀 nano-crm Deployment Monitor Started"
    log "📍 Target URL: $url"
    log ""
    
    # Check if deployment is already live
    if check_deployment "$url"; then
        log "✅ Deployment is already live!"
    else
        log "⏳ Waiting for deployment to become available..."
        
        if ! wait_for_deployment "$url"; then
            log ""
            log "❌ DEPLOYMENT MONITORING FAILED"
            log "Please check:"
            log "1. Vercel deployment status in dashboard"
            log "2. Build logs for errors"
            log "3. Project configuration"
            exit 1
        fi
    fi
    
    # Run comprehensive tests
    log ""
    log "🧪 Running production tests..."
    
    if run_production_tests "$url"; then
        log ""
        log "🎉 SUCCESS: nano-crm is fully operational!"
        log "🌐 Live URL: $url"
        log "✅ All tests passed"
        log "🎯 Ready for customer use!"
        exit 0
    else
        log ""
        log "❌ PRODUCTION TESTS FAILED"
        log "Issues found that need to be fixed:"
        log "1. Check the test output above"
        log "2. Fix identified issues"
        log "3. Redeploy and test again"
        exit 1
    fi
}

# Make sure we're in the right directory
if [ ! -f "vercel.json" ]; then
    log "❌ Error: vercel.json not found. Please run from project root."
    exit 1
fi

# Run main function
main "$URL"
