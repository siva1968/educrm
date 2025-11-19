#!/bin/bash

# Frontend structure generator for EduCRM
echo "🚀 Generating comprehensive Next.js frontend structure..."

# Create directory structure
mkdir -p src/app/{(dashboard),auth/login,students,attendance,fees,api/auth/[...nextauth]}
mkdir -p src/components/{ui,dashboard,students,attendance,fees,layout}
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/store
mkdir -p public

echo "✅ Directory structure created"
echo "📝 Frontend generation complete!"
echo ""
echo "Next steps:"
echo "1. cd frontend"
echo "2. npm install"
echo "3. npm run dev"
echo ""
