#!/bin/bash
# Launch the Information Theory Course
# Usage: bash launch.sh [module]
# Examples:
#   bash launch.sh          # Opens the home page
#   bash launch.sh 1a       # Opens Module 1A (Entropy)

cd "$(dirname "$0")"

if [ -z "$1" ]; then
    marimo edit notebooks/home.py
else
    # Find matching notebook
    match=$(ls notebooks/${1}*.py 2>/dev/null | head -1)
    if [ -n "$match" ]; then
        marimo edit "$match"
    else
        echo "No notebook found matching '$1'"
        echo "Available notebooks:"
        ls notebooks/*.py | sed 's/notebooks\//  /'
    fi
fi
