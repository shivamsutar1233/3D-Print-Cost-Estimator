# Quick Start Guide - Google Sheets Integration

## 🚀 5-Minute Setup

### Step 1: Get Google Service Account (2 min)

1. Visit https://console.cloud.google.com/
2. Create new project or select existing
3. Search and enable "Google Sheets API"
4. Go to Service Accounts (left sidebar → IAM & Admin → Service Accounts)
5. Click "Create Service Account"
6. Fill details (any name, like "3d-estimator")
7. Grant permissions (Basic → Editor)
8. Go to Keys tab → Add Key → Create new → JSON
9. Save the JSON file

### Step 2: Create Google Sheet (1 min)

1. Go to https://docs.google.com/spreadsheets/create
2. Create new blank spreadsheet
3. Rename first sheet to "Models"
4. Add headers: `Model ID` | `Model URL` | `Created At`
5. Share sheet with service account email from JSON file
6. Copy Sheet ID from URL: `...d/{SHEET_ID}/edit`

### Step 3: Set Environment Variables (1 min)

Create `.env` file in `backend/` folder:

```
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key (with literal \n not escaped)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_X509_CERT_URL=your_cert_url
```

**How to get these from JSON file:**

```json
{
  "type": "service_account",
  "project_id": "GOOGLE_PROJECT_ID",
  "private_key_id": "GOOGLE_PRIVATE_KEY_ID",
  "private_key": "GOOGLE_PRIVATE_KEY",
  "client_email": "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "client_id": "GOOGLE_CLIENT_ID",
  "client_x509_cert_url": "GOOGLE_CLIENT_X509_CERT_URL"
}
```

### Step 4: Install Dependencies (1 min)

```bash
cd backend
npm install googleapis uuid
```

### Step 5: Test (No additional setup needed!)

- Restart backend
- Upload a model
- Check URL for `?modelId=...`
- Hard refresh - model should load
- Check Google Sheet - model should be saved

## 📋 Data Flow Diagram

```
User Upload → Vercel Blob
    ↓
Generate Model ID → Google Sheets (Save)
    ↓
Update Browser URL → ?modelId=xxx
    ↓
Display Model & Stats

---

User Visits URL with ?modelId=xxx → Check Model ID
    ↓
Query Google Sheets → Get Model URL
    ↓
Load Model Preview → Fetch Model Stats
    ↓
Display Everything
```

## 🔗 Shareable URLs

**After first upload:**

```
https://your-domain.com/?modelId=model_1701866400000_abc123def
```

Send this URL to anyone - they'll see the same model without uploading!

## ✅ Verification Checklist

After setup, verify each step:

- [ ] Model uploads successfully
- [ ] URL changes to include `?modelId=...`
- [ ] New row appears in Google Sheet with Model ID and URL
- [ ] Hard refresh loads model automatically
- [ ] Model stats display correctly
- [ ] Shared URL works for other users
- [ ] Console shows no errors

## 🐛 Common Issues

| Issue                          | Solution                                        |
| ------------------------------ | ----------------------------------------------- |
| "Google Sheets not configured" | Check environment variables are set             |
| Models not saving to sheet     | Verify service account email is shared on sheet |
| Model not loading on refresh   | Check URL has `?modelId=` parameter             |
| 404 error fetching model       | Model ID might not exist in sheet               |
| CORS errors                    | Already configured, check backend is running    |

## 📝 Code Locations

- Backend API endpoints: `backend/server.js` (lines 189-243)
- Frontend app load logic: `src/App.jsx` (lines 13-50)
- File upload logic: `src/components/FileUpload.jsx` (lines 48-73)
- URL utilities: `src/utils/urlState.js`

## 🎯 What Each File Does

**backend/server.js**

- `/api/save-model` - Saves Model ID + URL to Google Sheets
- `/api/get-model/:modelId` - Retrieves Model URL from Google Sheets

**src/App.jsx**

- Checks if user has Model ID in URL on page load
- Fetches model from sheets if ID exists
- Loads preview and stats

**src/components/FileUpload.jsx**

- Generates Model ID after successful upload
- Calls `/api/save-model` endpoint
- Updates URL with Model ID

**src/utils/urlState.js**

- Helper functions for URL parameter management
- No need to edit, just use the functions

## 🚦 Next Steps

1. ✅ Complete the 5-minute setup above
2. ✅ Test by uploading a model
3. ✅ Share the URL with someone else
4. ✅ Have them refresh the page
5. ✅ Verify model loads automatically
6. 📊 (Optional) Add admin dashboard to view all models
7. 🔐 (Optional) Add user authentication for personal libraries

## 📞 Support

If something doesn't work:

1. Check browser console (F12) for error messages
2. Check backend console for error logs
3. Verify all environment variables are set correctly
4. Make sure Google Sheet is shared with service account
5. Ensure service account has edit permissions on sheet

---

**That's it! Your 3D models are now permanently stored and shareable!** 🎉
