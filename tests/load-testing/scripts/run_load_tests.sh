#!/bin/bash

# Load Testing Script for Tag You Write
# This script runs various load tests to simulate multiple concurrent users

echo "=========================================="
echo "Tag You Write - Load Testing Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "index.php" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if PHP is available
if ! command -v php &> /dev/null; then
    print_error "PHP is not installed or not in PATH"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed or not in PATH"
    exit 1
fi

print_status "Starting load tests..."

# Create results directory
mkdir -p load_test_results
timestamp=$(date +"%Y%m%d_%H%M%S")

# Test 1: Basic HTTP Load Testing with Apache Bench
print_status "Running Apache Bench tests..."

echo "==========================================" > "load_test_results/ab_test_${timestamp}.txt"
echo "Apache Bench Load Test Results" >> "load_test_results/ab_test_${timestamp}.txt"
echo "==========================================" >> "load_test_results/ab_test_${timestamp}.txt"

# Test different load levels with Apache Bench
for users in 10 25 50 100; do
    print_status "Testing with $users concurrent users using Apache Bench..."
    
    echo "------------------------------------------" >> "load_test_results/ab_test_${timestamp}.txt"
    echo "Test with $users concurrent users:" >> "load_test_results/ab_test_${timestamp}.txt"
    echo "------------------------------------------" >> "load_test_results/ab_test_${timestamp}.txt"
    
    ab -n 1000 -c $users http://localhost:8888/tag-you-write-repo/tag-you-write/ >> "load_test_results/ab_test_${timestamp}.txt" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Apache Bench test with $users users completed"
    else
        print_error "Apache Bench test with $users users failed"
    fi
    
    sleep 2
done

# Test 2: Custom PHP Load Testing
print_status "Running custom PHP load tests..."

echo "==========================================" > "load_test_results/php_test_${timestamp}.txt"
echo "Custom PHP Load Test Results" >> "load_test_results/php_test_${timestamp}.txt"
echo "==========================================" >> "load_test_results/php_test_${timestamp}.txt"

php simple_load_test.php >> "load_test_results/php_test_${timestamp}.txt" 2>&1

if [ $? -eq 0 ]; then
    print_success "Custom PHP load test completed"
else
    print_error "Custom PHP load test failed"
fi

# Test 3: SSE Load Testing
print_status "Running SSE load tests..."

echo "==========================================" > "load_test_results/sse_test_${timestamp}.txt"
echo "SSE Load Test Results" >> "load_test_results/sse_test_${timestamp}.txt"
echo "==========================================" >> "load_test_results/sse_test_${timestamp}.txt"

php sse_load_test.php >> "load_test_results/sse_test_${timestamp}.txt" 2>&1

if [ $? -eq 0 ]; then
    print_success "SSE load test completed"
else
    print_error "SSE load test failed"
fi

# Generate summary report
print_status "Generating summary report..."

echo "==========================================" > "load_test_results/summary_${timestamp}.txt"
echo "Load Testing Summary Report" >> "load_test_results/summary_${timestamp}.txt"
echo "Generated: $(date)" >> "load_test_results/summary_${timestamp}.txt"
echo "==========================================" >> "load_test_results/summary_${timestamp}.txt"
echo "" >> "load_test_results/summary_${timestamp}.txt"

echo "Test Files Generated:" >> "load_test_results/summary_${timestamp}.txt"
echo "- ab_test_${timestamp}.txt: Apache Bench results" >> "load_test_results/summary_${timestamp}.txt"
echo "- php_test_${timestamp}.txt: Custom PHP load test results" >> "load_test_results/summary_${timestamp}.txt"
echo "- sse_test_${timestamp}.txt: SSE load test results" >> "load_test_results/summary_${timestamp}.txt"
echo "" >> "load_test_results/summary_${timestamp}.txt"

echo "Key Metrics to Monitor:" >> "load_test_results/summary_${timestamp}.txt"
echo "1. Response Time (ms) - Should be under 1000ms for good UX" >> "load_test_results/summary_${timestamp}.txt"
echo "2. Requests per Second - Higher is better" >> "load_test_results/summary_${timestamp}.txt"
echo "3. Success Rate - Should be 95%+ for production" >> "load_test_results/summary_${timestamp}.txt"
echo "4. Failed Requests - Should be minimal" >> "load_test_results/summary_${timestamp}.txt"
echo "5. Connection Errors - Monitor for network/server issues" >> "load_test_results/summary_${timestamp}.txt"

print_success "All load tests completed!"
print_status "Results saved in load_test_results/ directory"
print_status "Summary report: load_test_results/summary_${timestamp}.txt"

echo ""
echo "=========================================="
echo "Load Testing Complete!"
echo "Check the results in the load_test_results/ directory"
echo "==========================================" 