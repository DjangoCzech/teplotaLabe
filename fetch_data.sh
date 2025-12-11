#!/bin/bash
# Automatic data fetch for Teplota Labe
# This script runs fetch_data.php to download new measurements from CHMU

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Run PHP script
/usr/bin/php fetch_data.php >> logs/fetch.log 2>&1

# Optional: Keep only last 1000 lines of log
tail -n 1000 logs/fetch.log > logs/fetch.log.tmp && mv logs/fetch.log.tmp logs/fetch.log
