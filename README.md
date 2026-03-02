# Quotes Vibe - AirTable Quotes App

A beautiful, responsive web application that fetches and displays quotes from an AirTable database. Features include truncated quote previews, full-view modals, search functionality, and the ability to add new quotes.

## Features

✨ **Key Features:**

- Display quotes from AirTable with truncated text preview
- Full-view modal for reading complete quotes
- Search/filter quotes by content or author
- Add new quotes with author and type categorization
- Secure API key handling (backend proxy)
- Responsive design for mobile and desktop
- Beautiful gradient UI with smooth animations

## Project Structure

```
.
├── server.js                 # Express backend server
├── package.json             # Node dependencies
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
└── public/
    ├── index.html           # Main HTML file
    ├── styles.css           # CSS styling
    └── script.js            # Frontend JavaScript
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- AirTable account with:
  - A base containing three tables: `Quotes`, `Authors`, `Types`
  - API key (found in AirTable account settings)
  - Base ID (found in AirTable base URL)

### Table Structure in AirTable

**Quotes Table:**

- `Content` (Long text) - The quote text
- `Author` (Link to Authors table)
- `Type` (Link to Types table)

**Authors Table:**

- `Name` (Single line text) - Author name

**Types Table:**

- `Name` (Single line text) - Category/type name

### Installation

1. **Clone/Copy this project to your local machine**

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file in the root directory:**

   ```bash
   cp .env.example .env
   ```

4. **Update the `.env` file with your AirTable credentials:**

   ```
   AIRTABLE_API_KEY=pat_xxx...  (your Personal Access Token)
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   AIRTABLE_QUOTES_TABLE=Quotes
   AIRTABLE_AUTHORS_TABLE=Authors
   AIRTABLE_TYPES_TABLE=Types
   PORT=3000
   NODE_ENV=development
   ```

   **🔐 How to get your AirTable credentials:**

   **Personal Access Token (API Key):**
   - Go to https://airtable.com/create/tokens
   - Click "Create new token"
   - Name it (e.g., "Quotes App")
   - Under "Scopes", select:
     - `data.records:read`
     - `data.records:write`
   - Under "Resources/Access", select your base and "All tables"
   - Click "Create token" and copy the `pat_xxx...` token
   - Add it to `.env` as `AIRTABLE_API_KEY=pat_xxx...`

   **Base ID:**
   - Go to your base in AirTable
   - Look at the URL: `https://airtable.com/app{BASE_ID}/...`
   - Copy the base ID after `/app` and add to `.env` as `AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX`

5. **Start the development server:**

   ```bash
   npm start
   ```

   Or with auto-reload:

   ```bash
   npm run dev
   ```

6. **Open your browser and navigate to:**

   ```
   http://localhost:3000
   ```

7. **Check the server logs to verify connection:**
   - You should see: `✅ Server running on http://localhost:3000`
   - And confirmation that API Key and Base ID are configured

## Usage

### Viewing Quotes

- All quotes are automatically loaded on page load
- Quotes are displayed as cards with truncated text
- Click "Read more" to view the full quote in a modal

### Searching Quotes

- Use the search bar to filter quotes by content or author
- Search is real-time as you type

### Adding New Quotes

- Click "+ Add New Quote" to expand the form
- Enter the quote content (required)
- Select an author and type (optional)
- Click "Submit" to save

### API Endpoints

- `GET /api/quotes` - Fetch all quotes with enriched author/type data
- `POST /api/quotes` - Create a new quote
- `GET /api/metadata` - Fetch authors and types for form dropdowns

## Deploying as Static Site

For a fully static deployment (without the Node backend):

1. **Build the frontend only** - The `public/` folder contains all static assets
2. **Note:** You'll need a backend service to proxy API calls and keep your API key safe:
   - Deploy `server.js` to a service like:
     - **Vercel** (serverless functions)
     - **Heroku** (with free tier)
     - **Railway** (simple deployment)
     - **Render** (free tier available)
   - Point your frontend to the deployed backend URL

3. **Alternative: Use a proxy service** like CORS Anywhere or build your own lightweight proxy

## Security Notes

🔒 **Important:**

- Never commit your `.env` file to version control (it's in `.gitignore`)
- Always use backend proxy for AirTable API calls - never expose API keys in frontend code
- Store sensitive credentials in environment variables
- When deploying, set environment variables in your hosting platform's settings

## Customization

### Styling

- Edit `public/styles.css` to customize colors, fonts, and layout
- The app uses a purple gradient theme by default

### Truncation Length

- In `public/script.js`, change the `150` in `createQuoteCard()` to adjust truncation length

### Form Fields

- Modify `server.js` to add/remove fields from the quote submission
- Update the HTML form in `public/index.html` accordingly

## Troubleshooting

**Quotes not loading? "Failed to fetch quotes"**

- ✅ Check that you've created a `.env` file (not just `.env.example`)
- ✅ Verify `AIRTABLE_API_KEY` starts with `pat_` (personal access token format)
- ✅ Verify `AIRTABLE_BASE_ID` starts with `app` (e.g., `appXXXXXXXXXXXXXX`)
- ✅ Check server logs when you start the app - look for:
  - `🔑 API Key configured: ✓` (should show ✓ if API key is set)
  - `📊 AirTable Base ID: appXXX...` (should show your base ID)
- Check browser console for errors (F12 → Console tab)
- Verify your tables exist with exact names: `Quotes`, `Authors`, `Types`

**"Unauthorized - Invalid API key or missing credentials"**

- Your `AIRTABLE_API_KEY` is missing or incorrect
- Regenerate a new token at https://airtable.com/create/tokens
- Make sure the token has `data.records:read` scope
- Make sure your base is added to "Resources/Access"

**"Not found - Check base ID and table names"**

- Your `AIRTABLE_BASE_ID` is incorrect
- Table names don't match (check capitalization)
- The tables don't exist in your base yet

**Can't add quotes?**

- Ensure authors/types exist in your AirTable base
- Check that the field names match your table structure
- Look at server logs for error details
- Verify the token has `data.records:write` scope

**CORS errors?**

- Make sure the server is running and accessible on `http://localhost:3000`
- Verify the frontend is making requests to the correct backend URL

## License

MIT

## Support

For issues or questions, check your:

- AirTable API documentation: https://airtable.com/developers/web/api/authentication
- AirTable API authentication guide: https://airtable.com/developers/web/guides/personal-access-tokens
- Server console logs for backend errors
- Browser console (F12) for frontend errors
