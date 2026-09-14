# Vercel Deployment Verification Steps

## Commit to Verify
```
b72d2afb8cf34007613dce8eda84b50f0bb89c19
```

## Step 1: Check Vercel Dashboard Deployment Status

1. Go to: https://vercel.com/dashboard
2. Select the `demo-news` project
3. Look for the latest deployment
4. Record:
   - **Deployment ID**: (e.g., dpl_XXXXX)
   - **Commit SHA**: Should show `b72d2af`
   - **Status**: Should be READY ✓
   - **Deployment Time**: (When it completed)
   - **URL**: https://www.sangtx.com (or the production URL alias)

## Step 2: Verify Deployment Commit Matches

In the Vercel dashboard, verify that the deployed commit is EXACTLY:
```
b72d2afb8cf34007613dce8eda84b50f0bb89c19
```

NOT an older commit.

## Step 3: Check GitHub Integration

1. Go to: https://github.com/SwiftGrowthDigitalHQ/demo.news
2. Latest commit should be `b72d2af`
3. Vercel should have created a deployment from this push
4. Look for Vercel bot comment on the commit (if available)

## Step 4: Test Production URLs

### Test 1: /fake-news

**URL**: https://www.sangtx.com/fake-news

**Expected "Our Reporters" section**:
- Should show:
  - Sudhir chaudhary
  - Anjana kashyap
- Count: 2 reporters

**Verify with DevTools Network Tab**:
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Filter for `get_tenant_reporters`
5. Click the XHR/Fetch request
6. Verify:
   - Request payload: `{"p_tenant_slug":"fake-news"}`
   - Response: Array with 2 reporters
   - Response should include Sudhir and Anjana with their tenant_id values

### Test 2: /fake-news2

**URL**: https://www.sangtx.com/fake-news2

**Expected "Our Reporters" section**:
- Should show:
  - "No reporters yet" OR empty state (because Fake News 2 has zero reporters)
  - Should NOT show Sudhir Chaudhary or Anjana Kashyap

**Verify with DevTools Network Tab**:
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Filter for `get_tenant_reporters`
5. Click the XHR/Fetch request
6. Verify:
   - Request payload: `{"p_tenant_slug":"fake-news2"}`
   - Response: Empty array `[]` (zero reporters)
   - Response should NOT contain Sudhir or Anjana

## Step 5: Final Verification

### If Both Tests PASS:
- ✓ Deployment is READY
- ✓ Commit is `b72d2af`
- ✓ /fake-news shows correct reporters
- ✓ /fake-news2 shows empty state
- ✓ RPC calls have correct parameters
- ✓ Cross-tenant leakage is FIXED

### If Tests FAIL:

#### Scenario A: Old build still running (reporters mixed up on fake-news2)
- Problem: Vercel deployed old code before fix
- Action: Check if Vercel picked up the new commit
- Solution: Trigger manual redeploy in Vercel dashboard

#### Scenario B: Build failed on Vercel
- Problem: Vercel build succeeded locally but failed on their servers
- Action: Check Vercel build logs
- Solution: Fix the actual error and push

#### Scenario C: New deployment started but not READY
- Problem: Deployment still in progress
- Action: Wait for deployment to complete
- Solution: Check again in a few minutes

## Vercel Dashboard URL

Go to: https://vercel.com/swiftgrowthdigitalhq/demo-news

This is the direct link to the demo-news project dashboard where you can see:
- All deployments
- Build logs
- Deployment status
- Production URL routing
