# ✅ Deployment Checklist

## Pre-Deployment (Before pushing code)

### Code Review

- [ ] Backend changes reviewed (server.js)
- [ ] Frontend changes reviewed (App.jsx, FileUpload.jsx)
- [ ] New utility file (urlState.js) reviewed
- [ ] No console errors when running locally
- [ ] No hardcoded secrets in code

### Testing

- [ ] Upload test model locally
- [ ] URL updates with ?modelId=...
- [ ] Hard refresh loads model
- [ ] Model stats display correctly
- [ ] No errors in console

### Configuration

- [ ] .env file created locally
- [ ] All GOOGLE\_\* variables filled in
- [ ] Backend starts without errors
- [ ] Google credentials working locally

### Dependencies

- [ ] `npm install googleapis uuid` ran successfully
- [ ] No dependency conflicts
- [ ] No security vulnerabilities

---

## Deployment Steps (Pushing to Vercel)

### Backend Deployment

- [ ] Commit code to git
- [ ] Push to repository: `git push origin main`
- [ ] Vercel auto-deploys (watch dashboard)
- [ ] Deployment succeeds (no errors)
- [ ] Environment variables set in Vercel dashboard
  - [ ] GOOGLE_SHEET_ID
  - [ ] GOOGLE_PROJECT_ID
  - [ ] GOOGLE_PRIVATE_KEY_ID
  - [ ] GOOGLE_PRIVATE_KEY
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL
  - [ ] GOOGLE_CLIENT_X509_CERT_URL

### Frontend Deployment

- [ ] Frontend code changes deployed
- [ ] Vercel auto-deploys (watch dashboard)
- [ ] Deployment succeeds
- [ ] Frontend loads without errors

---

## Post-Deployment Verification (In Production)

### URL & Sharing

- [ ] Upload new model at https://your-domain.com
- [ ] URL changes to include ?modelId=...
- [ ] Share URL with someone
- [ ] Recipient can view model without uploading

### Hard Refresh Test

- [ ] Visit URL with ?modelId=...
- [ ] Press Ctrl+Shift+R (hard refresh)
- [ ] Model loads automatically
- [ ] Stats calculate correctly
- [ ] No loading errors

### Google Sheets

- [ ] Open your Google Sheet
- [ ] New row appears after upload
- [ ] Model ID matches URL parameter
- [ ] Model URL is valid
- [ ] Timestamp is recorded

### Error Handling

- [ ] Try visiting URL with fake modelId
- [ ] See error message (not blank page)
- [ ] Try uploading while offline
- [ ] See error message
- [ ] Try large file (>50MB)
- [ ] See appropriate error

### Performance

- [ ] Upload takes 2-4 seconds
- [ ] Hard refresh takes 1-2 seconds
- [ ] Model preview renders smoothly
- [ ] Stats display instantly
- [ ] No lag when adjusting parameters

---

## Monitoring (First Week)

### Daily Checks

- [ ] Check backend logs for errors
- [ ] Check Google Cloud API usage
- [ ] Verify no rate limit hits
- [ ] Spot check Google Sheet for data

### Weekly Review

- [ ] Count total models saved
- [ ] Check error rate
- [ ] Review user feedback
- [ ] Monitor performance metrics

### Ongoing

- [ ] Keep monitoring logs
- [ ] Keep Google Sheet organized
- [ ] Plan scaling if needed
- [ ] Plan future features

---

## Troubleshooting During Deployment

### Problem: Backend deployment fails

**Solution:**

1. Check Vercel dashboard for error message
2. Verify all dependencies in package.json
3. Check for syntax errors
4. Check environment variables are set
5. Re-deploy with git push

### Problem: Environment variables not working

**Solution:**

1. Go to Vercel project settings
2. Check all GOOGLE\_\* variables are set
3. Verify values are correct (no extra spaces)
4. Restart deployment
5. Check backend logs

### Problem: Google Sheets API errors

**Solution:**

1. Verify service account email is shared on sheet
2. Verify service account has edit permissions
3. Check GOOGLE_SHEET_ID is correct
4. Check private key format (literal \n)
5. Verify sheet has "Models" tab

### Problem: Frontend can't reach backend

**Solution:**

1. Check backend is running/deployed
2. Check URL in frontend (should be deployed backend URL)
3. Check CORS is enabled in backend
4. Check for typos in endpoint URLs
5. Check network tab in browser

### Problem: Models not persisting

**Solution:**

1. Check Google Sheet has data
2. Verify Model ID is in URL
3. Check backend GET endpoint is working
4. Check error logs in console
5. Manually test API endpoint in browser

---

## Rollback Plan (If Something Goes Wrong)

### If Backend Breaks

1. Go to Vercel dashboard
2. Find previous working deployment
3. Click "Promote to Production"
4. Check it's working
5. Fix code and re-deploy

### If Frontend Breaks

1. Same as backend
2. Find previous deployment
3. Promote to production

### If Google Sheets Integration Breaks

1. Check environment variables
2. Check Google Cloud API status
3. Check service account permissions
4. Temporarily disable save/load features
5. Deploy hotfix

---

## Data Backup

### Before Production Launch

- [ ] Download Google Sheet as CSV backup
- [ ] Save copy of service account JSON key
- [ ] Document all environment variables
- [ ] Screenshot current deployment

### Ongoing

- [ ] Weekly Google Sheet backup to Drive
- [ ] Keep git history (automatic)
- [ ] Archive important models
- [ ] Document any customizations

---

## Security Audit Checklist

### Secrets Management

- [ ] No secrets in git repo
- [ ] All secrets in environment variables
- [ ] Private key is actual private value
- [ ] .env file in .gitignore
- [ ] No secrets in error messages

### Access Control

- [ ] Google Sheet shared only with service account
- [ ] Service account has minimum permissions
- [ ] No public API keys in code
- [ ] API endpoints validated

### Data Protection

- [ ] HTTPS enabled (Vercel provides)
- [ ] No PII in Google Sheet
- [ ] Models are public (intentional)
- [ ] Logs don't contain sensitive data

### Compliance

- [ ] Google ToS compliant (public data)
- [ ] Vercel ToS compliant
- [ ] No regulatory concerns
- [ ] Document data retention policy

---

## Documentation Verification

### Code Documentation

- [ ] Comments explain complex logic
- [ ] Function purposes clear
- [ ] API endpoints documented
- [ ] Error handling explained

### User Documentation

- [ ] QUICK_START.md is clear
- [ ] Setup steps are correct
- [ ] Examples work as shown
- [ ] Troubleshooting is helpful

### Architecture Documentation

- [ ] Diagrams are accurate
- [ ] Data flow is clear
- [ ] API contracts are correct
- [ ] Performance notes are realistic

---

## Performance Baseline (Document These)

### After first deployment, record:

- [ ] Average upload time: \_\_\_ seconds
- [ ] Average reload time: \_\_\_ seconds
- [ ] API response time: \_\_\_ ms
- [ ] File sizes: \_\_\_ MB
- [ ] Concurrent users supported: \_\_\_

---

## Final Sign-Off

### Developer

- [ ] Code is production-ready
- [ ] Tests pass
- [ ] Documentation complete
- [ ] No known bugs

### QA

- [ ] All features work
- [ ] No regressions
- [ ] Performance acceptable
- [ ] Error handling adequate

### DevOps

- [ ] Deployment successful
- [ ] Monitoring in place
- [ ] Backups configured
- [ ] Alerting configured

### Product

- [ ] Meets requirements
- [ ] User workflow correct
- [ ] Error messages helpful
- [ ] Performance meets expectations

---

## Launch Announcement

### Before Launch

- [ ] Prepare launch announcement
- [ ] Create user guide
- [ ] Set up support channel
- [ ] Train support team

### Day of Launch

- [ ] Send announcement
- [ ] Monitor social media
- [ ] Watch error logs
- [ ] Respond to users

### After Launch

- [ ] Collect feedback
- [ ] Fix reported issues
- [ ] Thank users
- [ ] Plan next features

---

## Success Criteria

✅ **Deployment is successful when:**

1. Code deploys without errors
2. All features work in production
3. Models persist correctly
4. URLs are shareable and work
5. Performance is acceptable
6. Error handling works
7. Monitoring is active
8. Users are happy

---

**Deployment Ready!** 🚀

Print this checklist and use it step-by-step for deployment.

**Questions?** Refer to:

- QUICK_START.md for setup
- ARCHITECTURE.md for technical questions
- GOOGLE_SHEETS_SETUP.md for API questions
