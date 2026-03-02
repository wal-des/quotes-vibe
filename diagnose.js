#!/usr/bin/env node

/**
 * Diagnostic script to verify AirTable connection setup
 * Run this with: node diagnose.js
 */

require("dotenv").config();
const axios = require("axios");

console.log("\n🔍 AirTable Connection Diagnostic\n");
console.log("━".repeat(50));

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Check 1: Environment variables
console.log("\n1️⃣  Checking Environment Variables:");
if (!AIRTABLE_API_KEY) {
  console.log("   ❌ AIRTABLE_API_KEY is missing");
} else if (!AIRTABLE_API_KEY.startsWith("pat_")) {
  console.log('   ⚠️  AIRTABLE_API_KEY should start with "pat_"');
  console.log(`   Current format: ${AIRTABLE_API_KEY.substring(0, 10)}...`);
} else {
  console.log("   ✅ AIRTABLE_API_KEY looks correct (starts with pat_)");
}

if (!AIRTABLE_BASE_ID) {
  console.log("   ❌ AIRTABLE_BASE_ID is missing");
} else if (!AIRTABLE_BASE_ID.startsWith("app")) {
  console.log('   ⚠️  AIRTABLE_BASE_ID should start with "app"');
  console.log(`   Current format: ${AIRTABLE_BASE_ID.substring(0, 10)}...`);
} else {
  console.log(`   ✅ AIRTABLE_BASE_ID looks correct: ${AIRTABLE_BASE_ID}`);
}

// Check 2: API Connection
console.log("\n2️⃣  Testing AirTable API Connection:");

(async () => {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Quotes`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      params: { maxRecords: 1 },
    });

    console.log("   ✅ Successfully connected to AirTable!");
    console.log(`   📊 Quotes table found with records`);
    return;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message;

    if (status === 401) {
      console.log("   ❌ Authentication failed (401)");
      console.log("   Possible causes:");
      console.log("     - API key is invalid or expired");
      console.log("     - API key does not have required scopes");
      console.log(
        "     - Generate new token at: https://airtable.com/create/tokens",
      );
    } else if (status === 404) {
      console.log("   ❌ Base or table not found (404)");
      console.log("   Possible causes:");
      console.log("     - Base ID is incorrect");
      console.log('     - "Quotes" table does not exist');
      console.log("     - API key does not have access to this base");
    } else if (status === 403) {
      console.log("   ❌ Access forbidden (403)");
      console.log("   Possible causes:");
      console.log("     - API key does not have read permissions");
      console.log('     - Verify scopes include "data.records:read"');
    } else if (!error.response) {
      console.log("   ❌ Network error - cannot reach AirTable API");
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`   ❌ Error: ${status} - ${message}`);
    }
  }

  console.log("\n📋 Setup Checklist:");
  console.log("   1. Go to https://airtable.com/create/tokens");
  console.log("   2. Create a new token with:");
  console.log("      - Scopes: data.records:read, data.records:write");
  console.log("      - Base access: Select your base");
  console.log('   3. Copy the token (starts with "pat_")');
  console.log("   4. Update .env: AIRTABLE_API_KEY=pat_xxx...");
  console.log("   5. Make sure your base has tables: Quotes, Authors, Types");
  console.log("\n" + "━".repeat(50) + "\n");
})();
