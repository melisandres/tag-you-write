#!/bin/bash

# Start PHP 8.2 built-in server for tag-you-write project

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# PHP 8.2 path
PHP_BIN="/opt/homebrew/opt/php@8.2/bin/php"

# Check if PHP 8.2 exists
if [ ! -f "$PHP_BIN" ]; then
    echo "Error: PHP 8.2 not found at $PHP_BIN"
    echo "Please make sure PHP 8.2 is installed via Homebrew"
    exit 1
fi

# Port to run on (change if needed)
PORT=8000

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Error: Port $PORT is already in use"
    echo "Please stop the process using port $PORT or change the PORT in this script"
    exit 1
fi

echo "Starting PHP 8.2 built-in server..."
echo "Server will be available at: http://localhost:$PORT"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
$PHP_BIN -S localhost:$PORT router.php

