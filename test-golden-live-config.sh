#!/bin/bash

# Golden Live Player Count Configuration Script
# මෙම script එක use කරලා Golden Live player count increment settings change කරන්න පුළුවන්

echo "🎮 Golden Live Configuration Tool"
echo "=================================="
echo ""

# Replace with your admin session cookie
ADMIN_SESSION="your-admin-session-cookie-here"
BASE_URL="http://localhost:5000"

# Function to get current configuration
get_config() {
    echo "📊 Current Configuration:"
    curl -s -X GET "$BASE_URL/api/admin/golden-live/config" \
      -H "Cookie: connect.sid=$ADMIN_SESSION" | jq '.'
    echo ""
}

# Function to set configuration
set_config() {
    local MIN=$1
    local MAX=$2
    local INTERVAL=$3
    
    echo "⚙️  Updating Configuration:"
    echo "   Min: $MIN players/sec"
    echo "   Max: $MAX players/sec"
    echo "   Interval: $INTERVAL ms"
    echo ""
    
    curl -s -X POST "$BASE_URL/api/admin/golden-live/configure" \
      -H "Cookie: connect.sid=$ADMIN_SESSION" \
      -H "Content-Type: application/json" \
      -d "{\"minPerSec\": $MIN, \"maxPerSec\": $MAX, \"intervalMs\": $INTERVAL}" | jq '.'
    echo ""
}

# Menu
echo "Select an option:"
echo "1) View current settings"
echo "2) Set to 100-1200 players/sec (default)"
echo "3) Set to 500-2000 players/sec (high)"
echo "4) Set to 50-500 players/sec (low)"
echo "5) Custom settings"
echo "6) Exit"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        get_config
        ;;
    2)
        set_config 100 1200 500
        ;;
    3)
        set_config 500 2000 500
        ;;
    4)
        set_config 50 500 500
        ;;
    5)
        read -p "Enter MIN players/sec: " min
        read -p "Enter MAX players/sec: " max
        read -p "Enter update interval (ms): " interval
        set_config $min $max $interval
        ;;
    6)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo "✅ Done!"
