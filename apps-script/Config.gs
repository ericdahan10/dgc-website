/**
 * Configuration for DGC Apps Script
 * Update these values to match your deployment environment
 */

const CONFIG = {
  SPREADSHEET_ID: "1TUnZQZWwBXy-0bBQ4JeFF7M1W98uqGw1jKzMDayFI-k",
  ADMIN_EMAIL: "admin@dahangroup.io",
  SUPPORT_SHEET_NAME: "Support Tickets",
};

/**
 * Helper to get config value safely
 */
function getConfig(key) {
  if (!CONFIG[key]) {
    throw new Error(`Missing config key: ${key}`);
  }
  return CONFIG[key];
}
