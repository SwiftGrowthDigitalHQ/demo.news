# SangTX Demo Tenant — Production Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] Production build succeeds (`npm run build`)
- [x] No console errors in development
- [x] ESLint passes (if configured)
- [x] All imports resolve correctly
- [x] No unused variables or dead code

### Functionality Testing (Local)
- [x] `/demo` loads successfully
- [x] `/demo/article/:slug` works for all articles
- [x] `/demo/category/:slug` filters correctly
- [x] `/demo/search?q=...` returns results
- [x] `/demo/admin` dashboard displays
- [x] All `/demo/admin/*` sections load
- [x] Demo banners visible on all demo pages
- [x] "Back to SangTX" navigation works
- [x] "Start Free Trial" buttons work
- [x] Article navigation works
- [x] Category filtering works
- [x] Search functionality works
- [x] Responsive design on mobile
- [x] Responsive design on tablet
- [x] Responsive design on desktop

### Read-Only Protection
- [x] No backend API calls from demo
- [x] No Supabase connection in demo
- [x] Mutation buttons disabled in admin
- [x] Upload buttons disabled
- [x] Delete actions disabled
- [x] Edit forms read-only or disabled
- [x] CSS prevents interaction with disabled elements
- [x] Clear "READ ONLY" messaging

### Content Review
- [x] All article content is original and fictional
- [x] No copyrighted content
- [x] No real brand impersonation
- [x] No real personal information
- [x] No offensive or inappropriate content
- [x] Proper grammar and spelling
- [x] Consistent tone and style
- [x] Demo disclaimers present

### SEO & Metadata
- [x] Demo pages have proper titles
- [x] Meta descriptions present
- [x] No indexing conflicts with production tenants
- [x] Canonical URLs set (if applicable)
- [x] robots.txt allows demo crawling (optional)
- [x] Demo sitemap (optional)

---

## Deployment Steps

### 1. Commit Changes
```bash
cd f:\demo.news\demo.news
git add .
git commit -m "feat: add real functional demo tenant at /demo

- Implement DemoPortalV2 with production components
- Add demoTenant.ts with 50+ articles, 10 categories, 5 reporters
- Add DemoCmsProvider for demo data context
- Update SangTX homepage demo buttons to /demo
- Add read-only admin demo at /demo/admin
- All mutations blocked, full isolation from production
- Comprehensive documentation added"
```

### 2. Push to Repository
```bash
git push origin main
```

### 3. Monitor Vercel Deployment
- [ ] Check Vercel dashboard
- [ ] Wait for build to complete
- [ ] Check build logs for errors
- [ ] Verify deployment succeeded

### 4. Production Smoke Tests
- [ ] Visit `https://yourdomain.com/demo`
- [ ] Homepage loads without errors
- [ ] Click article — page opens
- [ ] Click category — filtering works
- [ ] Search works
- [ ] Visit `https://yourdomain.com/demo/admin`
- [ ] Dashboard loads
- [ ] Navigate admin sections
- [ ] Verify read-only banners show
- [ ] Check browser console — no errors
- [ ] Test on actual mobile device
- [ ] Test on actual tablet
- [ ] Test on desktop

### 5. Marketing Page Integration Test
- [ ] Visit `https://yourdomain.com/`
- [ ] Scroll to Demo section
- [ ] Click "Explore Demo" button
- [ ] Verifies navigation to `/demo`
- [ ] Click "Admin Panel" button
- [ ] Verifies navigation to `/demo/admin`
- [ ] Click "Back to SangTX" from demo
- [ ] Returns to marketing homepage

### 6. Cross-Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (iOS)

### 7. Performance Check
- [ ] Lighthouse score (Performance)
- [ ] Lighthouse score (Accessibility)
- [ ] Lighthouse score (Best Practices)
- [ ] Lighthouse score (SEO)
- [ ] Page load time acceptable
- [ ] No layout shift (CLS)
- [ ] Fast First Contentful Paint (FCP)
- [ ] Fast Largest Contentful Paint (LCP)

### 8. Security Verification
- [ ] Demo does not expose API keys
- [ ] Demo does not connect to production database
- [ ] Demo does not access real tenant data
- [ ] Demo banners clearly indicate non-production
- [ ] No PII in demo content
- [ ] No real email addresses in demo
- [ ] No real phone numbers in demo

---

## Post-Deployment Monitoring

### Analytics Setup (Optional)
- [ ] Add demo route tracking to analytics
- [ ] Track `/demo` page views
- [ ] Track `/demo/admin` visits
- [ ] Track "Explore Demo" button clicks
- [ ] Track "Start Free Trial" from demo
- [ ] Set up conversion funnel: Demo → Trial

### Monitoring Checklist
- [ ] Check error logs in Vercel
- [ ] Monitor 404 rates on demo routes
- [ ] Monitor bounce rate on `/demo`
- [ ] Track time spent in demo
- [ ] Monitor demo-to-trial conversion rate
- [ ] Check for broken links
- [ ] Verify no production data leakage

### User Feedback
- [ ] Add feedback mechanism in demo (optional)
- [ ] Monitor support tickets mentioning demo
- [ ] Track which demo sections are most visited
- [ ] Gather qualitative feedback from sales team

---

## Rollback Plan (If Needed)

### If Issues Detected
1. **Revert the deployment:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Or disable demo temporarily:**
   - Comment out demo routes in `App.tsx`
   - Redirect `/demo` to `/` (marketing homepage)
   - Push hotfix

3. **Fix issues locally:**
   - Debug the problem
   - Test thoroughly
   - Re-deploy with fix

---

## Success Metrics

### Immediate (First Week)
- [ ] Zero critical errors in logs
- [ ] Demo loads successfully for all visitors
- [ ] No production data exposure incidents
- [ ] Positive feedback from early visitors

### Short-Term (First Month)
- [ ] Demo page views > 100
- [ ] Demo-to-trial conversion > 5%
- [ ] Average time in demo > 2 minutes
- [ ] Admin demo visits > 20% of public demo visits

### Long-Term (Ongoing)
- [ ] Demo drives measurable trial signups
- [ ] Sales team uses demo in pitches
- [ ] Demo featured in marketing materials
- [ ] Competitor analysis shows advantage
- [ ] Customer testimonials mention demo

---

## Documentation Checklist

### Internal Documentation
- [x] Implementation report written
- [x] Architecture diagram created
- [x] Summary document created
- [x] Deployment checklist created (this document)
- [ ] Share with development team
- [ ] Share with sales team
- [ ] Share with marketing team

### External Documentation (Optional)
- [ ] Blog post: "Introducing Our Live Demo"
- [ ] Social media announcement
- [ ] Email to existing prospects
- [ ] Update sales collateral
- [ ] Update pitch decks

---

## Final Pre-Flight Check

### Before Clicking Deploy
- [x] All code committed
- [x] All tests passing
- [x] Build succeeds locally
- [x] Documentation complete
- [ ] Team notified of deployment
- [ ] Support team aware of new demo
- [ ] Sales team trained on demo usage

### The Big Push
```bash
# Verify everything one last time
npm run typecheck  # ✅
npm run build      # ✅
git status         # Clean or ready to commit
git push origin main  # 🚀 DEPLOY!
```

---

## Post-Deploy Communication

### Internal Announcement Template
```
📣 SangTX Demo Tenant Now Live!

We've launched a fully functional demo tenant at /demo

What's included:
✅ Public news website with 50+ articles
✅ Complete admin CMS at /demo/admin
✅ Read-only, safe exploration
✅ Production-quality experience

Marketing page updated: "Explore Demo" now goes to /demo

Sales team: Use this in demos and pitches!
Support team: Direct prospects to /demo for self-service exploration

Docs: DEMO_TENANT_SUMMARY.md
Issues: Report in #engineering channel

🚀 Let's convert some trials!
```

### External Announcement Template (Optional)
```
🎉 Try SangTX with Our New Live Demo

Experience our full platform without signing up:

🌐 Browse a real news website: [link]/demo
🔧 Explore the CMS admin: [link]/demo/admin

See how easy it is to:
- Manage articles
- Organize categories
- Upload media
- Track analytics
- Customize branding

Start exploring → [link]/demo

Or start your free trial → [link]/onboarding
```

---

## Sign-Off

### Deployment Approval
- [ ] **Development Lead:** Reviewed and approved
- [ ] **QA/Testing:** Smoke tests passed
- [ ] **Product Manager:** Feature complete
- [ ] **Security:** No vulnerabilities
- [ ] **DevOps:** Deployment pipeline ready

### Deployment Timestamp
- **Date:** _____________
- **Time:** _____________
- **Deployed By:** _____________
- **Vercel Deployment ID:** _____________
- **Git Commit Hash:** _____________

---

## Contact for Issues

**Development Team:**
- Primary: [Your Name/Email]
- Backup: [Team Email]

**Emergency Rollback:**
- Access Vercel dashboard
- Revert to previous deployment
- Or push git revert commit

---

**Checklist Version:** 1.0  
**Created:** 2026-08-12  
**For:** SangTX Demo Tenant Production Launch  
**Status:** Ready for Deployment ✅
