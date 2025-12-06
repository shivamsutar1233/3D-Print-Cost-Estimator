# Visual Reference & Cheat Sheet

## URL State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER HISTORY                      │
└─────────────────────────────────────────────────────────┘

Initial URL:
https://app.com
        ↓
User uploads model
        ↓
generateModelId()
  → model_1701866400000_abc123def
        ↓
saveModelToSheet()
  → POST /api/save-model
        ↓
updateUrlWithModelId()
        ↓
Final URL:
https://app.com?modelId=model_1701866400000_abc123def
        ↑
    Shareable!
```

## Component Interaction Diagram

```
App.jsx
├─ useEffect (On Mount)
│  └─ Check for modelId in URL
│     ├─ If found: Load from Google Sheets
│     └─ If not: Show empty upload prompt
│
├─ FileUpload Component
│  ├─ User selects file
│  ├─ uploadToBlob()
│  ├─ generateModelId()
│  ├─ saveModelToSheet()
│  ├─ updateUrlWithModelId()
│  └─ Pass blob.url to App
│
├─ Preview3D Component
│  ├─ Receives previewUrl
│  └─ Renders 3D model
│
└─ EstimatorPanel Component
   ├─ Receives modelInfo (calculated stats)
   └─ Shows cost breakdown
```

## State Flow Diagram

```
Initial State:
{
  file: null,
  previewUrl: null,
  modelInfo: null,
  loading: false
}
        ↓

After File Upload:
{
  file: { url: "https://blob.vercel...", name: "model.stl" },
  previewUrl: "https://blob.vercel...",
  modelInfo: {
    volume_cm3: 45.23,
    dims_cm: { x: 10, y: 12, z: 15 },
    printTime: "04:30:20",
    supportsNeeded: true,
    ...
  },
  loading: false
}
        ↓

After Hard Refresh with ?modelId=...:
{
  file: { url: "https://blob.vercel...", name: "model_xxx.stl" },
  previewUrl: "https://blob.vercel...",
  modelInfo: { ... same as above ... },
  loading: false (was true during fetch)
}
```

## API Call Sequence Diagram

### Scenario 1: Initial Upload

```
┌──────┐                 ┌────────┐                ┌────────────┐
│User  │                 │Backend │                │Google Sheet│
│Client│                 │        │                │            │
└──┬───┘                 └───┬────┘                └─────┬──────┘
   │                         │                          │
   │ 1. POST /api/save-model │                          │
   ├────────────────────────>│                          │
   │ {modelId, modelUrl}     │                          │
   │                         │ 2. Append row           │
   │                         ├─────────────────────────>│
   │                         │                          │
   │                         │ 3. Success response     │
   │                         │<─────────────────────────┤
   │ 4. Response             │                          │
   │<────────────────────────┤                          │
   │                         │                          │

Response: { success: true, updatedRows: 1 }
```

### Scenario 2: Model Retrieval

```
┌──────┐                 ┌────────┐                ┌────────────┐
│User  │                 │Backend │                │Google Sheet│
│Client│                 │        │                │            │
└──┬───┘                 └───┬────┘                └─────┬──────┘
   │                         │                          │
   │ 1. GET /api/get-model/model_xxx
   ├────────────────────────>│                          │
   │                         │ 2. Read all rows       │
   │                         ├─────────────────────────>│
   │                         │                          │
   │                         │ 3. Return all rows     │
   │                         │<─────────────────────────┤
   │                         │                          │
   │                         │ 4. Search for modelId
   │                         │    in response
   │                         │ 5. Response with URL
   │ 6. { modelId, modelUrl }│                          │
   │<────────────────────────┤                          │
   │                         │                          │
```

## File Structure Visualization

```
3D-Print-Cost-Estimator-New/
│
├── backend/
│   ├── server.js ........................... [MODIFIED] Backend API
│   ├── package.json ........................ [MODIFIED] Added googleapis, uuid
│   ├── .env ............................... [CREATE MANUALLY] Your credentials
│   ├── .env.example ........................ [NEW] Configuration template
│   └── uploads/
│
├── 3d-print-estimator/
│   ├── src/
│   │   ├── App.jsx ......................... [MODIFIED] Auto-load on startup
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── FileUpload.jsx ............. [MODIFIED] Save to Sheets
│   │   │   ├── Preview3D.jsx
│   │   │   └── EstimatorPanel.jsx
│   │   └── utils/
│   │       └── urlState.js ................ [NEW] URL utilities
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.local
│   └── index.html
│
├── IMPLEMENTATION_COMPLETE.md ............. [NEW] Overview
├── QUICK_START.md ......................... [NEW] 5-min setup
├── GOOGLE_SHEETS_SETUP.md ................. [NEW] Detailed setup
├── ARCHITECTURE.md ........................ [NEW] Technical deep dive
├── IMPLEMENTATION_SUMMARY.md .............. [NEW] What was built
├── README.md (original)
└── .git/
```

## Code Snippets Quick Reference

### Generate Model ID (Frontend)

```javascript
import { generateModelId, updateUrlWithModelId } from "../utils/urlState";

const modelId = generateModelId();
// Returns: model_1701866400000_abc123def
updateUrlWithModelId(modelId);
// URL becomes: ?modelId=model_1701866400000_abc123def
```

### Save to Google Sheets (Frontend)

```javascript
const response = await axios.post("https://backend-url/api/save-model", {
  modelId,
  modelUrl,
});
// Response: { success: true, updatedRows: 1 }
```

### Fetch from Google Sheets (Frontend)

```javascript
const response = await axios.get(
  "https://backend-url/api/get-model/model_1701866400000_abc123def"
);
const { modelUrl } = response.data;
```

### Backend Save Endpoint

```javascript
app.post("/api/save-model", async (req, res) => {
  const { modelId, modelUrl } = req.body;
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Models!A:B",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[modelId, modelUrl, new Date().toISOString()]],
    },
  });
  res.json({ success: true, updatedRows: response.data.updates.updatedRows });
});
```

### Backend Fetch Endpoint

```javascript
app.get("/api/get-model/:modelId", async (req, res) => {
  const { modelId } = req.params;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Models!A:B",
  });
  const rows = response.data.values || [];
  const modelRow = rows.find((row) => row[0] === modelId);
  if (!modelRow) return res.status(404).json({ message: "Model not found" });
  res.json({ modelId: modelRow[0], modelUrl: modelRow[1] });
});
```

## URL Parameter Reference

### Valid URLs

```
Initial:
https://app.com
https://app.com/

With Model ID:
https://app.com?modelId=model_1701866400000_abc123def
https://app.com/?modelId=model_1701866400000_abc123def

Multiple params (future):
https://app.com?modelId=model_xxx&tab=settings
```

### URL Manipulation Methods

```javascript
// Get Model ID
const modelId = new URL(window.location).searchParams.get("modelId");

// Or use utility
import { getModelIdFromUrl } from "./utils/urlState";
const modelId = getModelIdFromUrl();

// Update URL
const url = new URL(window.location);
url.searchParams.set("modelId", modelId);
window.history.pushState({}, "", url);

// Or use utility
import { updateUrlWithModelId } from "./utils/urlState";
updateUrlWithModelId(modelId);
```

## Error Handling Quick Reference

### Try-Catch Pattern

```javascript
try {
  const response = await axios.get(`/api/get-model/${modelId}`);
  setPreviewUrl(response.data.modelUrl);
} catch (err) {
  console.error("Error loading model:", err);
  alert("Failed to load model");
}
```

### Common Errors & Fixes

```
Error: "Model not found"
Fix: Check URL for correct ?modelId parameter
     Check Google Sheet has the model record

Error: "Google Sheets not configured"
Fix: Verify all GOOGLE_* environment variables set
     Restart backend after adding env vars

Error: "Permission denied"
Fix: Share Google Sheet with service account email
     Verify service account has edit permissions

Error: "Invalid credentials"
Fix: Check GOOGLE_PRIVATE_KEY format (literal \n)
     Verify all required env vars are present
```

## Performance Quick Facts

| Operation             | Time     | Notes                  |
| --------------------- | -------- | ---------------------- |
| Upload to Blob        | 1-2s     | File size dependent    |
| Save to Sheets        | 0.5-1s   | Google API call        |
| Fetch from Sheets     | 0.5-1s   | Google API call        |
| Parse STL             | 0.5-1s   | File size dependent    |
| Calculate stats       | <0.1s    | Geometric calculations |
| **Total upload flow** | **2-4s** | All steps combined     |
| **Total reload flow** | **1-2s** | Sheets fetch + calc    |

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] Google Sheets created and shared
- [ ] Service account has correct permissions
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Code tested locally

### Post-Deployment

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Test upload → URL changes
- [ ] Test reload → Model loads
- [ ] Test shared URL → Works for others
- [ ] Check Google Sheet → Has entries
- [ ] Monitor console logs for errors

### Production Ready

- [ ] HTTPS enabled (Vercel handles this)
- [ ] CORS configured correctly
- [ ] Rate limiting considered
- [ ] Error logging in place
- [ ] Monitoring/alerting setup
- [ ] Backup strategy for Google Sheet

## Monitoring Queries

### Check Upload Success Rate

```javascript
// In Google Sheet - Count successful uploads
=COUNTA(A:A) - 1  // Minus header row
```

### Check Recent Uploads

```javascript
// In Google Sheet - Sort by Created At (Column C)
// Most recent at top
```

### Monitor API Health

```bash
# Check backend endpoint
curl https://backend-url/api/get-model/test
# Should return 404, not 500 error
```

## Security Checklist

- [ ] `.env` file in `.gitignore`
- [ ] No secrets committed to git
- [ ] Service account key stored securely
- [ ] Google Sheet shared only with service account
- [ ] HTTPS used for all connections
- [ ] Input validation on all API endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting considered for production

---

**Print this page as reference while setting up!**
