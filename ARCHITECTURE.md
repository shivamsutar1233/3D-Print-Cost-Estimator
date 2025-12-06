# Architecture & Technical Details

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Frontend)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  App.jsx (Check URL for modelId on load)                   │
│    ├─ Get modelId from URL params                          │
│    ├─ If found: Fetch from backend                         │
│    └─ Display model & stats                                │
│                                                             │
│  FileUpload.jsx (Generate ID & save on upload)             │
│    ├─ Upload file to Vercel Blob                           │
│    ├─ Generate Model ID                                    │
│    ├─ POST /api/save-model (modelId + URL)                 │
│    └─ Update URL with modelId                              │
│                                                             │
│  urlState.js (URL parameter utilities)                     │
│    ├─ generateModelId()                                    │
│    ├─ updateUrlWithModelId()                               │
│    ├─ getModelIdFromUrl()                                  │
│    └─ clearModelIdFromUrl()                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │                                    │
          │ HTTP Requests                      │ File Upload
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/estimate                                        │
│    ├─ Receive: { url, material, infill, layerHeight }     │
│    ├─ Download from URL                                   │
│    ├─ Parse STL geometry                                  │
│    └─ Calculate: volume, cost, time, supports             │
│                                                             │
│  POST /api/save-model                                      │
│    ├─ Receive: { modelId, modelUrl }                      │
│    ├─ Append row to Google Sheets                         │
│    └─ Return: success confirmation                        │
│                                                             │
│  GET /api/get-model/:modelId                               │
│    ├─ Query Google Sheets for modelId                     │
│    ├─ Return: { modelId, modelUrl }                       │
│    └─ Error if not found                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │                              │
          │ Google Sheets API           │ File URL
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Google Sheets (Data Storage)                              │
│  ┌────────────────────────────┐                           │
│  │ Models Tab                 │                           │
│  │ ─────────────────────────  │                           │
│  │ Model ID │ URL │ Created   │                           │
│  │ ─────────────────────────  │                           │
│  │ model_.. │ ... │ 2024-12.. │                           │
│  │ model_.. │ ... │ 2024-12.. │                           │
│  └────────────────────────────┘                           │
│                                                             │
│  Vercel Blob (File Storage)                                │
│  - Stores STL files                                        │
│  - Returns public URLs                                     │
│                                                             │
│  Vercel Backend (API Hosting)                              │
│  - Hosts Express server                                    │
│  - Processes model data                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. NEW MODEL UPLOAD FLOW

```
User selects file
        │
        ▼
[FileUpload.jsx]
        │
        ├─ uploadToBlob(file)
        │   └─ PUT to Vercel Blob
        │       └─ Returns: { url, ... }
        │
        ├─ generateModelId()
        │   └─ Returns: "model_1701866400000_abc123def"
        │
        ├─ saveModelToSheet(modelId, modelUrl)
        │   └─ POST /api/save-model
        │       └─ Google Sheets API appends row
        │
        ├─ updateUrlWithModelId(modelId)
        │   └─ URL → ?modelId=model_1701866400000_abc123def
        │
        └─ fetchEstimate(modelUrl)
            └─ POST /api/estimate
                ├─ Parse STL
                ├─ Calculate volume, cost, time
                └─ Return stats

Display model preview & stats
```

### 2. MODEL RELOAD/HARD REFRESH FLOW

```
User visits URL with ?modelId=...
        │
        ▼
[App.jsx - useEffect]
        │
        ├─ getModelIdFromUrl()
        │   └─ Returns: "model_1701866400000_abc123def"
        │
        ├─ GET /api/get-model/model_1701866400000_abc123def
        │   └─ Google Sheets API searches for Model ID
        │       └─ Returns: { modelId, modelUrl }
        │
        ├─ setPreviewUrl(modelUrl)
        │   └─ Model preview component renders
        │
        └─ POST /api/estimate with modelUrl
            ├─ Parse STL
            ├─ Calculate volume, cost, time
            └─ Return stats

Display model preview & stats
(Same as new upload flow after stats returned)
```

### 3. MODEL SHARE/BOOKMARK FLOW

```
Original user gets URL with ?modelId=...
        │
        └─ Shares with others
                │
                ▼
        Recipients visit URL
                │
                ▼
        (Follows MODEL RELOAD/HARD REFRESH FLOW above)
```

## API Contract Details

### POST /api/save-model

**Request:**

```json
{
  "modelId": "model_1701866400000_abc123def",
  "modelUrl": "https://blob.vercelusercontent.com/..."
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Model saved to sheet",
  "updatedRows": 1
}
```

**Response (Error):**

```json
{
  "message": "modelId and modelUrl are required"
}
```

### GET /api/get-model/:modelId

**Request:**

```
GET /api/get-model/model_1701866400000_abc123def
```

**Response (Success):**

```json
{
  "modelId": "model_1701866400000_abc123def",
  "modelUrl": "https://blob.vercelusercontent.com/..."
}
```

**Response (Error - Not Found):**

```json
{
  "message": "Model not found"
}
```

## Google Sheets Integration

### Spreadsheet Structure

```
A Column (Model ID)          B Column (Model URL)                    C Column (Created At)
─────────────────────────────────────────────────────────────────────────────────────────
model_1701866400000_abc123   https://blob.vercelusercontent.com/...  2024-12-06T10:00:00Z
model_1701866500000_xyz789   https://blob.vercelusercontent.com/...  2024-12-06T10:05:00Z
model_1701866600000_def456   https://blob.vercelusercontent.com/...  2024-12-06T10:10:00Z
```

### Queries

**Save (Append):**

```javascript
sheets.spreadsheets.values.append({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: "Models!A:B",
  valueInputOption: "USER_ENTERED",
  resource: {
    values: [[modelId, modelUrl, timestamp]],
  },
});
```

**Retrieve (Read All):**

```javascript
sheets.spreadsheets.values.get({
  spreadsheetId: GOOGLE_SHEET_ID,
  range: "Models!A:B",
});
// Then search in response for matching modelId
```

## Model ID Format

```
model_[TIMESTAMP]_[RANDOM]

Example: model_1701866400000_abc123def

Where:
  [TIMESTAMP] = Date.now() (milliseconds since epoch)
  [RANDOM] = Random string from uuid().substr(2, 9)
```

**Why this format?**

- Guaranteed unique
- Sortable by creation time
- Human-readable
- URL-safe (no special characters)
- Collision probability near zero

## Authentication & Authorization

### Current Implementation

- **No user authentication** - URLs are public
- **Anyone with URL can access** - Intended for sharing
- **No permission checks** - Sheet is publicly accessible to app

### Future Enhancement (Optional)

```javascript
// Add user identification
const userId = getUserIdFromSession();

// Store in sheet
values: [[userId, modelId, modelUrl, timestamp]];

// Query only user's models
rows.filter((row) => row[0] === userId);
```

## Performance Considerations

### Google Sheets API

- **Limits**: 500 requests/100 seconds per project
- **Optimization**: Cache frequently accessed models
- **Scalability**: Consider database for thousands of models

### Current Implementation

- Reads all rows to find modelId (O(n) complexity)
- Acceptable for up to ~10,000 models
- For millions: Migrate to dedicated database

### Optimization Strategies

1. **Add index column**: Use Model ID as row identifier
2. **Caching layer**: Redis for hot models
3. **Database migration**: PostgreSQL for production scale
4. **Pagination**: Limit sheet queries

## Error Handling

### Frontend (App.jsx)

```javascript
try {
  // Load model
} catch (err) {
  // Show alert to user
  console.error(err);
  // Optional: Show error state in UI
}
```

### Frontend (FileUpload.jsx)

```javascript
try {
  // Upload and save
} catch (err) {
  // Show alert
  console.error(err);
}
```

### Backend

```javascript
try {
  // Save/Get model
} catch (err) {
  console.error("Error:", err);
  res.status(500).json({ message: "Error", error: err.message });
}
```

## Security Implications

### Current

- Service account credentials in environment variables ✅
- Google Sheets shared only with service account ✅
- No authentication required to view models ❌
- Model URLs are public (Vercel Blob) ✅

### Recommendations

1. **Add authentication** for private libraries
2. **Rate limit** API endpoints
3. **Validate** model IDs before querying sheets
4. **Monitor** unusual access patterns
5. **Rotate** service account keys quarterly
6. **Use HTTPS** for all communication ✅ (Vercel provides)

## Scalability & Limits

| Metric        | Current    | Limit                    | Action        |
| ------------- | ---------- | ------------------------ | ------------- |
| Models stored | ∞          | Google Sheets (5M cells) | Migrate to DB |
| API calls/sec | 5+         | 500/100s                 | Add caching   |
| Model size    | 50MB       | 50MB (Blob)              | Compress STL  |
| URL length    | ~100 chars | 2048 chars               | OK for URLs   |

## Testing Checklist

- [ ] Upload new model → URL changes
- [ ] Check Google Sheet → Row added
- [ ] Hard refresh → Model loads
- [ ] Share URL → Others can view
- [ ] Different browser → Still loads
- [ ] Private window → Still loads
- [ ] After 24 hours → Still loads
- [ ] After week → Still loads
