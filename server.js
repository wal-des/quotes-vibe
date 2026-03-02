require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// AirTable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUOTES_TABLE = process.env.AIRTABLE_QUOTES_TABLE || "Quotes";
const SOURCES_TABLE = process.env.AIRTABLE_SOURCES_TABLE || "Sources";
const TYPES_TABLE = process.env.AIRTABLE_TYPES_TABLE || "Types";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

// Validate configuration on startup
if (!AIRTABLE_API_KEY) {
  console.warn(
    "⚠️  AIRTABLE_API_KEY is not set. Please add it to your .env file.",
  );
}
if (!AIRTABLE_BASE_ID) {
  console.warn(
    "⚠️  AIRTABLE_BASE_ID is not set. Please add it to your .env file.",
  );
}

// Helper function to make AirTable API calls
async function fetchFromAirtable(tableName, options = {}) {
  try {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
      params: options,
    });
    return response.data.records;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status;
    console.error(`Error fetching from ${tableName}:`, {
      status: statusCode,
      message: errorMessage,
      url: `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${tableName}`,
    });
    throw error;
  }
}

// Utility: find a field value from a record using multiple possible field names (case-insensitive)
function findFieldValue(record, candidates = []) {
  if (!record || !record.fields) return undefined;
  for (const name of candidates) {
    // exact match
    if (Object.prototype.hasOwnProperty.call(record.fields, name)) {
      return record.fields[name];
    }
    // case-insensitive match
    const key = Object.keys(record.fields).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    if (key) return record.fields[key];
  }
  return undefined;
}

// Utility: get a display name from a fields object trying common label fields
function getDisplayName(fields) {
  const candidates = [
    "Name",
    "Display name",
    "displayName",
    "display name",
    "Title",
    "Label",
    "name",
    "title",
  ];
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(fields, c) && fields[c])
      return fields[c];
    const key = Object.keys(fields).find(
      (k) => k.toLowerCase() === c.toLowerCase(),
    );
    if (key && fields[key]) return fields[key];
  }
  // fallback: try first string field
  for (const k of Object.keys(fields)) {
    if (typeof fields[k] === "string" && fields[k].trim() !== "")
      return fields[k];
    if (Array.isArray(fields[k]) && typeof fields[k][0] === "string")
      return fields[k][0];
  }
  return null;
}
// API endpoint to get all quotes with author and type details
app.get("/api/quotes", async (req, res) => {
  try {
    const quotes = await fetchFromAirtable(QUOTES_TABLE);
    const sources = await fetchFromAirtable(SOURCES_TABLE);
    const types = await fetchFromAirtable(TYPES_TABLE);

    // Debug: Log the structure of the first quote
    if (quotes.length > 0) {
      console.log("\n📋 First Quote Structure:");
      console.log("Fields available:", Object.keys(quotes[0].fields));
      console.log(
        "Full fields object:",
        JSON.stringify(quotes[0].fields, null, 2),
      );
    }

    if (sources.length > 0) {
      console.log("\n📚 First Source Structure:");
      console.log("Fields available:", Object.keys(sources[0].fields));
      console.log(
        "Full fields object:",
        JSON.stringify(sources[0].fields, null, 2),
      );
    }

    if (types.length > 0) {
      console.log("\n🏷️  First Type Structure:");
      console.log("Fields available:", Object.keys(types[0].fields));
      console.log(
        "Full fields object:",
        JSON.stringify(types[0].fields, null, 2),
      );
    }

    // Create lookup maps with display names
    const sourceMap = {};
    const typeMap = {};

    sources.forEach((source) => {
      sourceMap[source.id] = {
        fields: source.fields,
        displayName: getDisplayName(source.fields) || null,
      };
    });

    types.forEach((type) => {
      typeMap[type.id] = {
        fields: type.fields,
        displayName: getDisplayName(type.fields) || null,
      };
    });

    // Enrich quotes with flexible field mapping (try several common field names)
    const enrichedQuotes = quotes.map((quote) => {
      const content =
        findFieldValue(quote, [
          "Content",
          "Quote",
          "quote",
          "Text",
          "content",
        ]) || "";

      // Prefer display names already present on the quote record
      const quoteSourceDisplay = findFieldValue(quote, [
        "sourceDisplayName",
        "sourceDisplay",
        "sourcePerson",
        "sourcePersonDisplay",
        "sourceDisplayName",
      ]);

      const quoteTypeDisplay = findFieldValue(quote, [
        "typeDisplayName",
        "typeDisplay",
        "typeValue",
        "typeDisplayName",
      ]);

      // Linked record IDs (most common fields)
      const sourceField = findFieldValue(quote, [
        "source",
        "Source",
        "Author",
        "author",
      ]);
      const sourceId = Array.isArray(sourceField)
        ? sourceField[0]
        : sourceField;

      const typeField = findFieldValue(quote, [
        "type",
        "Type",
        "category",
        "Category",
      ]);
      const typeId = Array.isArray(typeField) ? typeField[0] : typeField;

      const authorName = (function () {
        if (quoteSourceDisplay)
          return Array.isArray(quoteSourceDisplay)
            ? quoteSourceDisplay[0]
            : quoteSourceDisplay;
        if (sourceId)
          return (
            sourceMap[sourceId]?.displayName ||
            getDisplayName(sourceMap[sourceId]?.fields) ||
            "Unknown"
          );
        return "Unknown";
      })();

      const typeName = (function () {
        if (quoteTypeDisplay)
          return Array.isArray(quoteTypeDisplay)
            ? quoteTypeDisplay[0]
            : quoteTypeDisplay;
        if (typeId)
          return (
            typeMap[typeId]?.displayName ||
            getDisplayName(typeMap[typeId]?.fields) ||
            "Uncategorized"
          );
        return "Uncategorized";
      })();

      // Try to extract an optional additional note field from the quote record
      const additionalNoteField = findFieldValue(quote, [
        "additionalNote",
        "additional note",
        "note",
        "notes",
        "annotation",
        "extra",
        "Additional Note",
        "AdditionalNote",
      ]);

      const additionalNote = Array.isArray(additionalNoteField)
        ? additionalNoteField[0]
        : additionalNoteField || null;

      return {
        id: quote.id,
        content: content,
        author: authorName,
        type: typeName,
        additionalNote: additionalNote,
        createdTime: quote.createdTime,
      };
    });

    res.json(enrichedQuotes);
  } catch (error) {
    const statusCode = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;

    if (statusCode === 401) {
      return res.status(401).json({
        error: "Unauthorized - Invalid API key or missing credentials",
      });
    } else if (statusCode === 404) {
      return res.status(404).json({
        error: "Not found - Check base ID and table names",
      });
    }

    res.status(500).json({
      error: "Failed to fetch quotes",
      details: message,
    });
  }
});

// API endpoint to add a new quote
app.post("/api/quotes", async (req, res) => {
  try {
    const { content, authorId, typeId, additionalNote } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Quote content is required" });
    }

    const fields = {
      quote: content,
    };

    if (authorId) fields.source = [authorId];
    if (typeId) fields.type = [typeId];
    if (additionalNote) fields.additionalNote = additionalNote;

    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${QUOTES_TABLE}`;
    const response = await axios.post(
      url,
      { fields },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(201).json({
      id: response.data.id,
      content: response.data.fields.quote,
      author: authorId || null,
      type: typeId || null,
    });
  } catch (error) {
    console.error("Error creating quote:", error.message);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// API endpoint to create a new source
app.post("/api/sources", async (req, res) => {
  try {
    const { firstName, lastName, artistName, title } = req.body;

    // Validate at least one field is provided
    if (!firstName && !lastName && !artistName && !title) {
      return res.status(400).json({ error: "At least one field is required" });
    }

    const fields = {};
    if (firstName) fields["First name"] = firstName;
    if (lastName) fields["Last name"] = lastName;
    if (artistName) fields["Artist name"] = artistName;
    if (title) fields["Title"] = title;

    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${SOURCES_TABLE}`;
    const response = await axios.post(
      url,
      { fields },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Fetch the created record to get the auto-generated Display name
    const createdRecord = response.data;
    const displayName = getDisplayName(createdRecord.fields) || "New Source";

    res.status(201).json({
      id: createdRecord.id,
      name: displayName,
      firstName,
      lastName,
      artistName,
      title,
    });
  } catch (error) {
    console.error("Error creating source:", error.message);
    res.status(500).json({ error: "Failed to create source" });
  }
});

// API endpoint to get sources and types (for form dropdowns)
app.get("/api/metadata", async (req, res) => {
  try {
    const sources = await fetchFromAirtable(SOURCES_TABLE);
    const types = await fetchFromAirtable(TYPES_TABLE);

    const authors = sources
      .map((a) => ({
        id: a.id,
        name: getDisplayName(a.fields) || a.fields.Name || "Unknown",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const typesSorted = types
      .map((t) => ({
        id: t.id,
        name: getDisplayName(t.fields) || t.fields.Name || "Uncategorized",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      authors,
      types: typesSorted,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// Debug endpoint to see raw data
app.get("/api/debug", async (req, res) => {
  try {
    const quotes = await fetchFromAirtable(QUOTES_TABLE);
    const sources = await fetchFromAirtable(SOURCES_TABLE);
    const types = await fetchFromAirtable(TYPES_TABLE);

    res.json({
      quotes: quotes.slice(0, 2).map((q) => ({
        id: q.id,
        fields: q.fields,
      })),
      sources: sources.slice(0, 2).map((s) => ({
        id: s.id,
        fields: s.fields,
      })),
      types: types.slice(0, 2).map((t) => ({
        id: t.id,
        fields: t.fields,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main HTML file for all other routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 AirTable Base ID: ${AIRTABLE_BASE_ID || "NOT SET"}`);
  console.log(
    `🔑 API Key configured: ${AIRTABLE_API_KEY ? "✓" : "✗ MISSING"}\n`,
  );
});
