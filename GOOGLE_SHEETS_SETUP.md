# Google Sheets Integration Setup Guide

## Overview

This implementation adds Google Sheets integration to store and retrieve 3D model information. When a user uploads a model:

1. **Upload Flow:**

   - Model is uploaded to Vercel Blob (same as before)
   - A unique model ID is generated
   - Model ID and URL are saved to Google Sheets
   - URL is updated with `?modelId=<model_id>`
   - Model stats are calculated and displayed

2. **Reload/Share Flow:**
   - When URL has `modelId` parameter, app automatically loads the model
   - App fetches model URL from Google Sheets using the model ID
   - Model preview and stats are displayed without re-uploading

## Backend Setup

### 1. Install Dependencies

Add to `backend/package.json`:

```bash
npm install googleapis
```

### 2. Environment Variables

Add these to your `.env` file in the backend:

```
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key_with_newlines_escaped
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_X509_CERT_URL=your_cert_url
```

### 3. Get Google Service Account Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Go to Service Accounts and create a new service account
5. Create a JSON key and download it
6. Extract the credentials and add them as environment variables

### 4. Share Google Sheet with Service Account

1. Create a new Google Sheet or use existing one
2. Get the sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Share the sheet with the service account email
4. Ensure the sheet has a "Models" tab with headers: `Model ID`, `Model URL`, `Created At`

### 5. Update Backend Endpoints

The backend now has two new endpoints:

**POST /api/save-model**

- Request: `{ modelId, modelUrl }`
- Saves model record to Google Sheets
- Returns: `{ success: true, updatedRows }`

**GET /api/get-model/:modelId**

- Fetches model URL from Google Sheets by model ID
- Returns: `{ modelId, modelUrl }`

## Frontend Setup

### 1. Install Dependencies

Add to `3d-print-estimator/package.json`:

```bash
npm install axios
```

(axios might already be installed)

### 2. New Utility Functions

File: `src/utils/urlState.js`

- `generateModelId()` - Creates unique model IDs
- `updateUrlWithModelId(modelId)` - Updates URL without page reload
- `getModelIdFromUrl()` - Retrieves model ID from URL
- `hasModelIdInUrl()` - Checks if model ID exists
- `clearModelIdFromUrl()` - Removes model ID from URL

### 3. Updated Components

**App.jsx**

- Added `useEffect` hook to load models on page load
- Checks for `modelId` in URL search params
- Fetches model from Google Sheets if ID found
- Displays loading state while fetching

**FileUpload.jsx**

- Generates unique model ID after blob upload
- Saves model ID and URL to Google Sheets
- Updates browser URL with model ID
- Displays enhanced loading state

## Usage Flow

### For New Uploads:

1. User selects STL file
2. File uploads to Vercel Blob
3. Model ID generated: `model_1701866400000_abc123def`
4. Model ID + URL saved to Google Sheets
5. URL updates to: `https://app.com?modelId=model_1701866400000_abc123def`
6. Model stats calculated and displayed

### For Returning Users (URL Share/Hard Refresh):

1. User visits URL with `modelId` parameter
2. App detects model ID in URL
3. App fetches model URL from Google Sheets
4. Model preview loads
5. Model stats calculated and displayed
6. User can modify parameters and re-estimate

## Example URLs

**Initial upload:**

```
https://3-d-print-cost-estimator-zlt9.vercel.app
```

**After upload (shared/bookmarked):**

```
https://3-d-print-cost-estimator-zlt9.vercel.app?modelId=model_1701866400000_abc123def
```

## Google Sheets Data Structure

The "Models" sheet stores:

```
| Model ID                        | Model URL                                    | Created At              |
|---------------------------------|----------------------------------------------|------------------------|
| model_1701866400000_abc123def   | https://blob.vercelusercontent.com/...       | 2024-12-06T10:00:00Z   |
| model_1701866500000_xyz789abc   | https://blob.vercelusercontent.com/...       | 2024-12-06T10:05:00Z   |
```

## Troubleshooting

### Models not saving to Sheets

- Verify Google Service Account email is shared on the Sheet
- Check that GOOGLE_SHEET_ID environment variable is correct
- Ensure "Models" tab exists in the Google Sheet
- Check backend console logs for detailed errors

### Models not loading on refresh

- Verify model ID is in URL: `?modelId=<id>`
- Check browser console for API errors
- Ensure backend `/api/get-model/:modelId` endpoint is accessible
- Verify model exists in Google Sheets

### CORS errors

- Backend already has CORS enabled (`app.use(cors())`)
- If issues persist, update CORS configuration in backend

## Security Notes

1. **Environment Variables**: Never commit `.env` files to git
2. **Service Account Key**: Keep `GOOGLE_PRIVATE_KEY` secure
3. **Sheet Access**: Only share sheets with necessary service accounts
4. **Rate Limiting**: Consider adding rate limiting for production
5. **Validation**: Always validate modelId format before querying sheets

## Future Enhancements

1. Add pagination for large sheet queries
2. Implement caching layer for frequently accessed models
3. Add model metadata (user info, timestamp, parameters)
4. Create admin dashboard to manage models
5. Add model deletion/archival functionality
6. Implement user authentication for personal model libraries
