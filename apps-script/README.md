# Apps Script Configuration

## Setup

Before deploying Apps Script, update `Config.gs` with your actual values:

```javascript
const CONFIG = {
  SPREADSHEET_ID: "your-sheet-id-here",
  ADMIN_EMAIL: "admin@dahangroup.io",
  SUPPORT_SHEET_NAME: "Support Tickets",
};
```

## Deployment

1. Copy all `.gs` files to your Google Apps Script editor
2. Set the correct SPREADSHEET_ID in `Config.gs`
3. Deploy as web app (execute as your account)
4. Add the deployment URL to your Cloudflare workers as `GOOGLE_APPS_SCRIPT_URL`

## Files

- `AppsScript.gs` - Main handler (doPost, logSupportTicket)
- `Config.gs` - Configuration (SPREADSHEET_ID, emails, sheet names)
