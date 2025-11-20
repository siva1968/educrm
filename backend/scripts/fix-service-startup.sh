#!/bin/bash

# ==================================================================================================
# Fix Service Startup Errors
# This script fixes the undefined serviceName and toTitleCase errors in all service app.js files
# ==================================================================================================

set -e  # Exit on error

echo "🔧 Fixing service startup errors..."
echo ""

SERVICES=(
  "assignment-management-service"
  "examination-management-service"
  "fee-management-service"
  "gradebook-service"
  "hr-management-service"
  "lms-service"
  "online-classes-service"
  "payroll-management-service"
  "timetable-management-service"
)

SERVICES_DIR="/home/user/educrm/backend/services"

for service in "${SERVICES[@]}"; do
  APP_FILE="$SERVICES_DIR/$service/app.js"

  if [ -f "$APP_FILE" ]; then
    echo "📝 Fixing: $service"

    # Convert service name to title case for display
    SERVICE_DISPLAY=$(echo "$service" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

    # Replace the problematic line with fixed version
    sed -i "s/console.log(\`   \${toTitleCase(serviceName)}\`);/console.log('   ${SERVICE_DISPLAY^^}');/g" "$APP_FILE"

    echo "  ✓ Fixed $service"
  else
    echo "  ⚠ Skipped: $APP_FILE not found"
  fi
done

echo ""
echo "✅ All service startup errors fixed!"
echo ""
