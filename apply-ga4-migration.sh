#!/bin/bash
# Apply GA4 Simple Configuration Migration

set -e

echo "📦 Applying GA4 Simple Configuration Migration..."
echo ""

MIGRATION_FILE="supabase/migrations/20260827000030_ga4_simple_config.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found. Please install PostgreSQL client tools."
  echo ""
  echo "Alternative: Copy the SQL from $MIGRATION_FILE and run it manually in Supabase SQL Editor:"
  echo "https://supabase.com/dashboard/project/csuocfxbucohfvowfwtq/sql/new"
  exit 1
fi

# Prompt for database connection details
echo "Please provide your Supabase database connection string."
echo "Find it at: Project Settings → Database → Connection String (Direct)"
echo ""
read -p "Database URL (postgres://...): " DB_URL

if [ -z "$DB_URL" ]; then
  echo "❌ Database URL is required"
  exit 1
fi

echo ""
echo "🚀 Applying migration..."
echo ""

psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Start dev server: npm run dev"
  echo "2. Navigate to admin panel → Google Analytics"
  echo "3. Enter domain and measurement ID"
  echo "4. Test the configuration"
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi
