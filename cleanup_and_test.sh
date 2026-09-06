#!/bin/bash

echo "=== GOOGLE DRIVE CLEANUP & TEST EXECUTION ==="
echo

# Project details
PROJECT_ID="csuocfxbucohfvowfwtq"
TENANT_ID="66ffe950-0dad-4a4f-9ffe-1069a480b166"

echo "[1] Checking current connections..."
curl -s "https://${PROJECT_ID}.supabase.co/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}&select=id,status,deleted_at" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk" \
  -H "Content-Type: application/json" | jq .

echo
echo "[2] Deleting old connections..."
curl -s -X DELETE "https://${PROJECT_ID}.supabase.co/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}&deleted_at=is.null" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk" \
  -H "Content-Type: application/json"

echo
echo "[3] Verifying deletion..."
curl -s "https://${PROJECT_ID}.supabase.co/rest/v1/tenant_google_drive_connections?tenant_id=eq.${TENANT_ID}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdW9jZnhidWNvaGZ2b3dmd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNjU5MzcsImV4cCI6MTcyNzA0MjMzN30.z2R-HumLGFhxPqz-hfH0c-gMCQ64JJFJt5e4hd8eANk" \
  -H "Content-Type: application/json" | jq 'length'

echo
echo "=== CLEANUP COMPLETE ==="
echo "Next: User must click 'Connect Google Drive' in browser"
