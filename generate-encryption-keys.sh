#!/bin/bash
# Generate Encryption Keys for Supabase Secrets

echo "🔐 Generating Encryption Keys for Plugin OAuth Tokens"
echo "======================================================"
echo ""

echo "GA4_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "GSC_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "GDRIVE_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "FACEBOOK_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "======================================================"
echo "✅ Copy these values to your Supabase Secrets Manager"
echo "🔗 https://supabase.com/dashboard/project/csuocfxbucohfvowfwtq/settings/vault"
