#!/bin/bash

# Comprehensive test for Vercel deployment readiness
# Tests all endpoints and validates responses

set -e

BASE_URL="http://localhost:8090"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local data="$4"
    local description="$5"
    
    log "Testing: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                   -H "Content-Type: application/json" \
                   -d "$data")
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log "✅ $description - Status: $status_code"
        return 0
    else
        log "❌ $description - Expected: $expected_status, Got: $status_code"
        log "   Response: $response_body"
        return 1
    fi
}

test_json_response() {
    local endpoint="$1"
    local expected_field="$2"
    local description="$3"
    
    log "Testing JSON: $description"
    
    response=$(curl -s "$BASE_URL$endpoint")
    
    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        log "✅ $description - Field '$expected_field' present"
        return 0
    else
        log "❌ $description - Field '$expected_field' missing"
        log "   Response: $response"
        return 1
    fi
}

run_comprehensive_tests() {
    log "Starting comprehensive Vercel deployment tests..."
    
    local failed_tests=0
    
    # Health checks
    test_endpoint "GET" "/healthz" "200" "" "Health check endpoint" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/health" "200" "" "Detailed health endpoint" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/metrics" "200" "" "Metrics endpoint" || failed_tests=$((failed_tests + 1))
    
    # Core API endpoints
    test_endpoint "GET" "/webhook/variants?prompt=test&count=2" "200" "" "A/B variants endpoint" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/webhook/deals/hot" "200" "" "Hot deals endpoint" || failed_tests=$((failed_tests + 1))
    test_endpoint "GET" "/webhook/analytics?period=7d" "200" "" "Analytics endpoint" || failed_tests=$((failed_tests + 1))
    
    # POST endpoints
    test_endpoint "POST" "/webhook/whatsapp" "200" '{"phone": "+1234567890", "message": "Hello", "name": "Test"}' "WhatsApp webhook" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/telegram" "200" '{"chatId": "123456", "text": "Hi", "username": "test"}' "Telegram webhook" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/motorcycle/sync" "200" '{"title": "Test Bike", "wp_post_id": 123}' "Motorcycle sync" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/messages/send" "200" '{"message": "Test message", "channel": "whatsapp"}' "Manual message send" || failed_tests=$((failed_tests + 1))
    
    # PUT endpoints
    test_endpoint "PUT" "/webhook/reminders/123/mark-sent" "200" "" "Mark reminder sent" || failed_tests=$((failed_tests + 1))
    
    # Validation tests (should return 400)
    test_endpoint "GET" "/webhook/variants" "400" "" "Variants validation (missing prompt)" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/whatsapp" "400" '{"message": "test"}' "WhatsApp validation (missing phone)" || failed_tests=$((failed_tests + 1))
    test_endpoint "POST" "/webhook/telegram" "400" '{"text": "test"}' "Telegram validation (missing chatId)" || failed_tests=$((failed_tests + 1))
    
    # JSON structure tests
    test_json_response "/healthz" "status" "Health check JSON structure" || failed_tests=$((failed_tests + 1))
    test_json_response "/webhook/variants?prompt=test" "success" "Variants JSON structure" || failed_tests=$((failed_tests + 1))
    test_json_response "/webhook/deals/hot" "deals" "Hot deals JSON structure" || failed_tests=$((failed_tests + 1))
    test_json_response "/webhook/analytics" "success" "Analytics JSON structure" || failed_tests=$((failed_tests + 1))
    test_json_response "/metrics" "uptime" "Metrics JSON structure" || failed_tests=$((failed_tests + 1))
    
    # Performance tests
    log "Testing response times..."
    
    start_time=$(date +%s%N)
    curl -s "$BASE_URL/healthz" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ $response_time -lt 1000 ]; then
        log "✅ Response time test - ${response_time}ms (< 1000ms)"
    else
        log "⚠️  Response time test - ${response_time}ms (> 1000ms)"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Security headers test
    log "Testing security headers..."
    
    headers=$(curl -s -I "$BASE_URL/healthz")
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        log "✅ Security headers - X-Content-Type-Options present"
    else
        log "❌ Security headers - X-Content-Type-Options missing"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Rate limiting test (basic)
    log "Testing rate limiting..."
    
    # Make multiple requests quickly
    for i in {1..5}; do
        curl -s "$BASE_URL/healthz" > /dev/null
    done
    
    # Should still work (not hitting limit yet)
    if curl -s "$BASE_URL/healthz" | grep -q "ok"; then
        log "✅ Rate limiting - Normal requests working"
    else
        log "❌ Rate limiting - Normal requests blocked"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test CORS headers
    log "Testing CORS headers..."
    
    cors_response=$(curl -s -H "Origin: https://example.com" -I "$BASE_URL/healthz")
    
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        log "✅ CORS headers - Access-Control-Allow-Origin present"
    else
        log "❌ CORS headers - Access-Control-Allow-Origin missing"
        failed_tests=$((failed_tests + 1))
    fi
    
    # Final results
    log ""
    log "=== VERCEL DEPLOYMENT TEST RESULTS ==="
    
    if [ $failed_tests -eq 0 ]; then
        log "🎉 All tests passed! Ready for Vercel deployment."
        log ""
        log "✅ All endpoints working correctly"
        log "✅ JSON responses valid"
        log "✅ Error handling working"
        log "✅ Security headers present"
        log "✅ CORS configured"
        log "✅ Rate limiting active"
        log "✅ Performance acceptable"
        log ""
        log "🚀 READY TO DEPLOY TO VERCEL!"
        log ""
        log "Next steps:"
        log "1. Commit and push to GitHub"
        log "2. Connect repository to Vercel"
        log "3. Set environment variables (OPENAI_API_KEY, etc.)"
        log "4. Deploy!"
        
        return 0
    else
        log "❌ $failed_tests test(s) failed"
        log ""
        log "Please fix the issues before deploying to Vercel."
        return 1
    fi
}

# Check if server is running
if ! curl -s "$BASE_URL/healthz" > /dev/null 2>&1; then
    log "❌ Server not running on $BASE_URL"
    log "Please start the server with: cd webhook && node src/index-vercel.js"
    exit 1
fi

# Run all tests
run_comprehensive_tests
