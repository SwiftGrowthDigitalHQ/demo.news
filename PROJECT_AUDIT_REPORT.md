# SangTX / Demo.News Project Audit Report

**Date**: 2026-08-27
**Status**: AUDIT IN PROGRESS

---

## CRITICAL FINDING: Wrong Project Context

**User requested audit for**: "Sangita OS / SangTX" with features like:
- Bulk Email
- Sheet Sync  
- AI Insights / AI Command Center
- My Future

**Actual project found**: `demo.news` - A News CMS Platform

This project does NOT contain the features mentioned. The codebase shows:
- News article management
- Multi-tenant news platform
- Categories, breaking news, media library
- Analytics dashboard
- Advertisement management
- Newsletter subscription
- Google Analytics, AdSense, Search Console plugins
- YouTube, Facebook, Google Drive integrations

---

## WHAT THIS PROJECT ACTUALLY IS

**Project Name**: SangTX News CMS
**Technology**: React + Vite + TypeScript + Supabase
**Architecture**: Multi-tenant SaaS news platform

### Core Features Present:
1. ✅ News Article Management (CRUD)
2. ✅ Category Management
3. ✅ Breaking News
4. ✅ Media Library
5. ✅ Reporter/User Management
6. ✅ Analytics Dashboard
7. ✅ Advertisement Management
8. ✅ Newsletter Subscription
9. ✅ Multi-language Support (English, Hindi, Bhojpuri)
10. ✅ Custom Domain Support
11. ✅ SEO Manager
12. ✅ Plugin System (GA4, AdSense, GSC, Facebook, YouTube, Google Drive)

### Features NOT Present:
- ❌ Bulk Email Campaigns
- ❌ Sheet Sync / Google Sheets Integration (for leads/campaigns)
- ❌ AI Insights / AI Command Center  
- ❌ My Future
- ❌ Lead Management
- ❌ CRM functionality

---

## IDENTIFIED ISSUES IN THIS PROJECT

### 1. Demo Data vs Real Data

**Finding**: Extensive use of demo/mock data throughout codebase

**Files Affected**:
- `src/app/lib/demoData.ts` - Canonical demo data source
- `src/app/lib/demoTenant.ts` - Demo tenant with full content
- `src/app/lib/demoCmsProvider.tsx` - Demo CMS provider
- Multiple components check `isDemoMode()` and serve static data

**Impact**: 
- Some features may be serving demo data instead of real database
- Admin panel may show demo articles/categories instead of real ones

**Status**: NEEDS INVESTIGATION - Need to check when demo mode is active vs real mode

---

### 2. Google Search Console Integration Issues

**Error**: "Failed to load: NetworkError when attempting to fetch resource"

**Root Cause**:
- `src/app/lib/gsc.ts` tries to call Edge Functions that don't exist
- Calls `${VITE_SUPABASE_URL}/functions/v1/gsc-oauth-start`
- Calls `${VITE_SUPABASE_URL}/functions/v1/gsc-fetch-metrics`
- These Edge Functions are not deployed

**Files Affected**:
- `src/app/lib/gsc.ts`
- `src/app/components/admin/GoogleSearchConsoleManager.tsx`

**Fix Required**: Deploy Edge Functions OR rewrite to use simpler config-based approach

**Status**: BLOCKER - Cannot deploy Edge Functions due to permission error

---

### 3. TypeScript / Build Performance

**Issues**:
- `npm run typecheck` hangs/times out after 30 seconds
- `npm run build` also very slow
- Large codebase with many files

**Possible Causes**:
- TypeScript configuration issues
- Circular dependencies
- Memory/performance issues

**Status**: NEEDS INVESTIGATION

---

### 4. TODO Items in Code

**Found**: 10+ TODO comments in codebase

**Critical TODOs**:
1. Edge Functions: "TODO: Extract user ID from session" (multiple functions)
2. OAuth: "TODO: Validate CSRF token against session/cookie"
3. Property Matching: "TODO: Get tenant domain from database"

**Status**: LOW PRIORITY (not blocking core functionality)

---

### 5. Analytics Dashboard

**Reported Issue**: "Failed to load analytics"

**Possible Causes**:
- Missing database tables
- RLS policy issues
- Empty data (no analytics recorded yet)
- Query errors

**Files to Check**:
- `src/app/components/admin/AnalyticsDashboard.tsx`
- Supabase migrations for analytics tables

**Status**: NEEDS INVESTIGATION

---

## ACTUAL ERRORS VS EXPECTED FUNCTIONALITY

### What User Expected (from request):
1. Bulk Email campaigns - **NOT IN THIS PROJECT**
2. Sheet Sync - **NOT IN THIS PROJECT**
3. AI Insights - **NOT IN THIS PROJECT**

### What Actually Exists (in this project):
1. News CMS features
2. Plugin system (GA4, AdSense, GSC, etc.)
3. Multi-tenant architecture

---

## RECOMMENDED NEXT STEPS

### Option A: User Clarification Needed
**Ask user**: "You mentioned Bulk Email, Sheet Sync, AI features. This project is a News CMS. Did you mean a different project? Or do you want me to audit THIS news CMS project?"

### Option B: Audit THIS Project
If user confirms they want THIS project audited:

1. **Investigate Demo Mode vs Real Mode**
   - When is demo mode active?
   - Are real tenants getting demo data by mistake?
   - Test actual CRUD operations with real database

2. **Fix GSC Integration**
   - Either deploy Edge Functions OR
   - Simplify to config-only approach (like we did with GA4)

3. **Debug Analytics Dashboard**
   - Check database schema
   - Test analytics queries
   - Verify RLS policies

4. **Fix Build Performance**
   - Investigate TypeScript config
   - Check for circular dependencies
   - Optimize build process

5. **Test Core Functionality**
   - Create real tenant
   - Create real article
   - Publish article
   - View on public site
   - Check analytics
   - Test plugins

### Option C: Find Correct Project
If user has a different project for CRM/Email/Sheets features, locate and audit that instead.

---

## FILES ANALYZED SO FAR

1. Package.json - Confirmed npm, React, Vite, TypeScript stack
2. Project structure - Identified News CMS architecture
3. Demo data files - Found extensive demo data system
4. GSC lib - Identified Edge Function dependency
5. Multiple admin components - Found "Failed to load" error patterns

---

## CONCLUSION

**Cannot proceed with requested audit** without clarification because:

1. ❌ Requested features (Bulk Email, Sheet Sync, AI) **do not exist** in this codebase
2. ✅ Project is a **News CMS**, not a CRM or marketing automation platform
3. ⚠️ Need user confirmation on which features to actually audit/fix

**Awaiting**: User clarification on project scope and which features need fixing

---

**Next Action Required**: User must clarify:
- Is this the correct project?
- Which features actually need fixing?
- Are Bulk Email/Sheet Sync in a different project?
