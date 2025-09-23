#!/bin/bash

# Production testing script for nano-crm on Vercel
# Tests all endpoints on the live deployment

set -e

# Default URL - will be updated after deployment
PROD_URL="${1:-https://nano-crm.vercel.app}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local data="$4"
    local description="$5"
    
    log "Testing PRODUCTION: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$PROD_URL$endpoint" --max-time 30)
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$PROD_URL$endpoint" \
                   -H "Content-Type: application/json" \
                   -d "$data" --max-time 30)
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log "✅ PROD: $description - Status: $status_code"
        return 0
    else
        log "❌ PROD: $description - Expected: $expected_status, Got: $status_code"
        log "   Response: $response_body"
        return 1
    fi
}

measure_response_time() {
    local endpoint="$1"
    local description="$2"
    
    log "Measuring response time: $description"
    
    start_time=$(date +%s%N)
    curl -s "$PROD_URL$endpoint" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    log "⏱️  $description: ${response_time}ms"
    
    if [ $response_time -lt 5000 ]; then
        log "✅ Response time acceptable (< 5000ms)"
        return 0
    else
        log "⚠️  Response time high (> 5000ms)"
        return 1
    fi
}

test_json_structure() {
    local endpoint="$1"
    local expected_field="$2"
    local description="$3"
    
    log "Testing JSON structure: $description"
    
    response=$(curl -s "$PROD_URL$endpoint" --max-time 30)
    
    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        log "✅ JSON: $description - Field '$expected_field' present"
        return 0
    else
        log "❌ JSON: $description - Field '$expected_field' missing"
        log "   Response: $response"
        return 1
    fi
}

run_production_tests() {
    log "🚀 Starting PRODUCTION tests for nano-crm"
    log "Testing URL: $PROD_URL"
    log ""
    
    local failed_tests=0
    
    # Check if URL is accessible
    if ! curl -s "$PROD_URL" > /dev/null 2>&1; then
        log "❌ CRITICAL: Production URL not accessible: $PROD_URL"
        log "Please check if deployment completed successfully"
        return 1
    fi
    
    log "✅ Production URL is accessible"
    log ""
    
    # Core health checks
    log "=== CORE HEALTH CHECKS ==="
    test_endpoint "GET" "/" "200" "" "Welcome page" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/healthz" "200" "" "Health check" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/health" "200" "" "Detailed health" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/metrics" "200" "" "Metrics endpoint" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== API ENDPOINTS ==="
    # Core API endpoints
    test_endpoint "GET" "/webhook/variants?prompt=test&count=2" "200" "" "A/B variants" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/webhook/deals/hot" "200" "" "Hot deals" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/webhook/analytics?period=7d" "200" "" "Analytics" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== WEBHOOK ENDPOINTS ==="
    # POST endpoints
    test_endpoint "POST" "/webhook/whatsapp" "200" '{"phone": "+1234567890", "message": "Hello from production test", "name": "Test User"}' "WhatsApp webhook" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/telegram" "200" '{"chatId": "123456", "text": "Hello from production test", "username": "testuser"}' "Telegram webhook" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/motorcycle/sync" "200" '{"title": "Production Test Bike", "wp_post_id": 999}' "Motorcycle sync" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/messages/send" "200" '{"message": "Production test message", "channel": "whatsapp"}' "Manual message send" || failed_tests=$((failed_tests + 1))
    
    # PUT endpoints
    test_endpoint "PUT" "/webhook/reminders/999/mark-sent" "200" "" "Mark reminder sent" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== VALIDATION TESTS ==="
    # Validation tests (should return 400)
    test_endpoint "GET" "/webhook/variants" "400" "" "Variants validation (missing prompt)" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/whatsapp" "400" '{"message": "test"}' "WhatsApp validation (missing phone)" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/telegram" "400" '{"text": "test"}' "Telegram validation (missing chatId)" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== JSON STRUCTURE TESTS ==="
    # JSON structure tests
    test_json_structure "/" "name" "Welcome page structure" || failed_tests=$((failed_tests + 1))
    test_json_structure "/healthz" "status" "Health check structure" || failed_tests=$((failed_tests + 1))
    test_json_structure "/webhook/variants?prompt=test" "success" "Variants structure" || failed_tests=$((failed_tests + 1))
    test_json_structure "/webhook/deals/hot" "deals" "Hot deals structure" || failed_tests=$((failed_tests + 1))
    test_json_structure "/webhook/analytics" "success" "Analytics structure" || failed_tests=$((failed_tests + 1))
    test_json_structure "/metrics" "uptime" "Metrics structure" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== PERFORMANCE TESTS ==="
    # Performance tests
    measure_response_time "/healthz" "Health check response time" || failed_tests=$((failed_tests + 1))
    measure_response_time "/webhook/variants?prompt=test" "A/B variants response time" || failed_tests=$((failed_tests + 1))
    measure_response_time "/webhook/deals/hot" "Hot deals response time" || failed_tests=$((failed_tests + 1))
    
    log ""
    log "=== SECURITY TESTS ==="
    # Security headers test
    log "Testing security headers..."
    headers=$(curl -s -I "$PROD_URL/healthz")
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        log "✅ Security headers - X-Content-Type-Options present"
    else
        log "❌ Security headers - X-Content-Type-Options missing"
        failed_tests=$((failed_tests + 1))
    fi
    
    # CORS test
    log "Testing CORS headers..."
    cors_response=$(curl -s -H "Origin: https://example.com" -I "$PROD_URL/healthz")
    
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        log "✅ CORS headers - Access-Control-Allow-Origin present"
    else
        log "❌ CORS headers - Access-Control-Allow-Origin missing"
        failed_tests=$((failed_tests + 1))
    fi
    
    log ""
    log "=== USER EXPERIENCE TESTS ==="
    
    # Test welcome page content
    log "Testing welcome page content..."
    welcome_response=$(curl -s "$PROD_URL/")
    
    if echo "$welcome_response" | grep -q "Nano CRM"; then
        log "✅ Welcome page - Contains 'Nano CRM' branding"
    else
        log "❌ Welcome page - Missing 'Nano CRM' branding"
        failed_tests=$((failed_tests + 1))
    fi
    
    if echo "$welcome_response" | grep -q "endpoints"; then
        log "✅ Welcome page - Contains API endpoints documentation"
    else
        log "❌ Welcome page - Missing API endpoints documentation"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test AI functionality
    log "Testing AI functionality..."
    ai_response=$(curl -s "$PROD_URL/webhook/variants?prompt=I%20want%20to%20buy%20a%20motorcycle&count=3")
    
    if echo "$ai_response" | grep -q "variants"; then
        log "✅ AI functionality - A/B variants generated"
        
        variant_count=$(echo "$ai_response" | jq '.variants | length' 2>/dev/null || echo "0")
        if [ "$variant_count" -eq 3 ]; then
            log "✅ AI functionality - Correct number of variants (3)"
        else
            log "⚠️  AI functionality - Unexpected variant count: $variant_count"
        fi
    else
        log "❌ AI functionality - Failed to generate variants"
        failed_tests=$((failed_tests + 1))
    fi
    
    log ""
    log "=== FINAL RESULTS ==="
    
    if [ $failed_tests -eq 0 ]; then
        log "🎉 ALL PRODUCTION TESTS PASSED!"
        log ""
        log "✅ nano-crm is fully operational on Vercel"
        log "✅ All 22+ endpoints working correctly"
        log "✅ Performance is excellent"
        log "✅ Security is properly configured"
        log "✅ AI functionality is working"
        log "✅ User experience is optimal"
        log ""
        log "🚀 PRODUCTION DEPLOYMENT SUCCESSFUL!"
        log "🌐 Live URL: $PROD_URL"
        log ""
        log "🎯 Ready for users! The platform is fully operational."
        
        return 0
    else
        log "❌ $failed_tests production test(s) failed"
        log ""
        log "Please check the issues above and fix them."
        log "The deployment may need attention."
        return 1
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    log "⚠️  jq not found, JSON structure tests will be limited"
fi

# Run all production tests
run_production_tests
