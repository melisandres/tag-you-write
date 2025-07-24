#!/bin/bash

# Script to move load testing files to organized structure
# Run this from the project root directory

echo "Moving load testing files to organized structure..."

# Create directories
mkdir -p tests/load-testing/scripts
mkdir -p tests/load-testing/config
mkdir -p tests/load-testing/results
mkdir -p tests/load-testing/docs

# Move test scripts
echo "Moving test scripts..."
mv quick_test.php tests/load-testing/scripts/
mv simple_load_test.php tests/load-testing/scripts/
mv sse_load_test.php tests/load-testing/scripts/
mv realistic_game_test.php tests/load-testing/scripts/
mv run_load_tests.sh tests/load-testing/scripts/

# Move documentation
echo "Moving documentation..."
mv README-load-testing.md tests/load-testing/docs/

# Move existing results if they exist
if [ -d "load_test_results" ]; then
    echo "Moving existing results..."
    mv load_test_results/* tests/load-testing/results/ 2>/dev/null || true
    rmdir load_test_results 2>/dev/null || true
fi

# Make scripts executable
chmod +x tests/load-testing/scripts/*.sh

echo "Load testing files moved successfully!"
echo "New structure:"
echo "  tests/load-testing/"
echo "  ├── scripts/     (test executables)"
echo "  ├── config/      (configuration)"
echo "  ├── results/     (test outputs)"
echo "  └── docs/        (documentation)"
echo ""
echo "To run tests:"
echo "  cd tests/load-testing/scripts"
echo "  php quick_test.php"
echo "  ./run_load_tests.sh" 