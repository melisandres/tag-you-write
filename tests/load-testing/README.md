# Load Testing Suite

This directory contains performance and load testing tools for the Tag You Write application.

## Structure

```
tests/load-testing/
├── README.md                    # This file
├── scripts/                     # Executable test scripts
│   ├── quick_test.php          # Fast setup verification
│   ├── simple_load_test.php    # Basic HTTP load testing
│   ├── sse_load_test.php       # SSE connection testing
│   ├── realistic_game_test.php # Game-specific scenarios
│   └── run_load_tests.sh       # Automated test runner
├── config/                      # Test configuration
│   └── test_config.php         # Centralized test settings
├── results/                     # Test results (auto-generated)
└── docs/                       # Documentation
    └── README-load-testing.md  # Detailed testing guide
```

## Quick Start

```bash
# From project root
cd tests/load-testing/scripts
php quick_test.php              # Verify setup
./run_load_tests.sh            # Run all tests
```

## Test Types

1. **Quick Test** (`quick_test.php`) - Fast verification that everything works
2. **Simple Load Test** (`simple_load_test.php`) - Basic HTTP request testing
3. **SSE Load Test** (`sse_load_test.php`) - Real-time connection testing
4. **Realistic Game Test** (`realistic_game_test.php`) - Game-specific scenarios
5. **Automated Suite** (`run_load_tests.sh`) - Runs all tests with reporting

## Configuration

Update `config/test_config.php` to match your environment:
- Base URL
- Database connection settings
- Test parameters
- Server-specific configurations

## Results

Test results are automatically saved to `results/` directory with timestamps. 