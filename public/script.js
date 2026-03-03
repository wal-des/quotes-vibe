// State management
let allQuotes = [];
let filteredQuotes = [];
let _lastFocusedElement = null;
let _authors = []; // Store authors list for lookup

// DOM Elements
const quotesList = document.getElementById("quotesList");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const searchToggleBtn = document.getElementById("searchToggleBtn");
const searchInput = document.getElementById("searchInput");
const searchBox = document.getElementById("searchBox");
const toggleFormBtn = document.getElementById("toggleFormBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const addQuoteModal = document.getElementById("addQuoteModal");
const quoteForm = document.getElementById("quoteForm");
const quoteModal = document.getElementById("quoteModal");
const fullQuoteContent = document.getElementById("fullQuoteContent");
const addSourceModal = document.getElementById("addSourceModal");
const sourceForm = document.getElementById("sourceForm");
const addNewSourceBtn = document.getElementById("addNewSourceBtn");
const cancelSourceBtn = document.getElementById("cancelSourceBtn");

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();
  loadMetadata();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  toggleFormBtn.addEventListener("click", () => {
    openFormModal();
  });

  cancelFormBtn.addEventListener("click", () => {
    closeFormModal();
    quoteForm.reset();
  });

  quoteForm.addEventListener("submit", handleAddQuote);
  searchInput.addEventListener("input", handleSearch);
  searchToggleBtn.addEventListener("click", toggleSearchInput);

  const quoteCloseModal = document.querySelector(".close-modal");
  if (quoteCloseModal) {
    quoteCloseModal.addEventListener("click", closeQuoteModal);
  }

  quoteModal.addEventListener("click", (e) => {
    if (e.target === quoteModal) closeQuoteModal();
  });

  addQuoteModal.addEventListener("click", (e) => {
    if (e.target === addQuoteModal) closeFormModal();
  });

  // Source modal listeners
  addNewSourceBtn.addEventListener("click", openSourceModal);
  cancelSourceBtn.addEventListener("click", () => {
    closeSourceModal();
    sourceForm.reset();
  });
  sourceForm.addEventListener("submit", handleAddSource);
  addSourceModal.addEventListener("click", (e) => {
    if (e.target === addSourceModal) closeSourceModal();
  });
}

// Load all quotes from the server
async function loadQuotes() {
  try {
    loading.style.display = "block";
    error.classList.add("hidden");

    const response = await fetch("/api/quotes");
    if (!response.ok) throw new Error("Failed to fetch quotes");

    allQuotes = await response.json();
    filteredQuotes = [...allQuotes];
    renderQuotes();
  } catch (err) {
    showError("Det gick inte att ladda citat. Uppdatera sidan.");
    console.error(err);
  } finally {
    loading.style.display = "none";
  }
}

// Load metadata (authors and types) for form dropdowns
async function loadMetadata() {
  try {
    const response = await fetch("/api/metadata");
    if (!response.ok) throw new Error("Failed to fetch metadata");

    const { authors, types } = await response.json();

    // Store authors for later lookup
    _authors = authors;

    // Populate author datalist
    const authorsList = document.getElementById("authorsList");
    authorsList.innerHTML = ""; // Clear existing options
    authors.forEach((author) => {
      const option = document.createElement("option");
      option.value = author.name;
      option.setAttribute("data-id", author.id);
      authorsList.appendChild(option);
    });

    // Populate type datalist
    const typesList = document.getElementById("typesList");
    typesList.innerHTML = ""; // Clear existing options
    types.forEach((type) => {
      const option = document.createElement("option");
      option.value = type.name;
      option.setAttribute("data-id", type.id);
      typesList.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load metadata:", err);
  }
}

// Handle adding a new quote
async function handleAddQuote(e) {
  e.preventDefault();

  const content = document.getElementById("quoteContent").value.trim();
  const authorName = document.getElementById("quoteAuthor").value.trim();
  const typeName = document.getElementById("quoteType").value.trim();
  const additionalNote = document
    .getElementById("quoteAdditionalNote")
    .value.trim();

  if (!content) {
    showError("Vänligen ange ett citat.");
    return;
  }

  // Find author ID from datalist
  let authorId = undefined;
  if (authorName) {
    const authorOption = document
      .getElementById("authorsList")
      .querySelector(`option[value="${authorName}"]`);
    if (authorOption) {
      authorId = authorOption.getAttribute("data-id");
    }
  }

  // Find type ID from datalist
  let typeId = undefined;
  if (typeName) {
    const typeOption = document
      .getElementById("typesList")
      .querySelector(`option[value="${typeName}"]`);
    if (typeOption) {
      typeId = typeOption.getAttribute("data-id");
    }
  }

  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        authorId: authorId || undefined,
        typeId: typeId || undefined,
        additionalNote: additionalNote || undefined,
      }),
    });

    if (!response.ok) throw new Error("Failed to add quote");

    // Reload quotes to show the new one
    await loadQuotes();
    quoteForm.reset();
    closeFormModal();
    showSuccess("Citatet sparades!");
  } catch (err) {
    showError("Det gick inte att lägga till citatet. Försök igen.");
    console.error(err);
  }
}

// Handle search/filter
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();

  filteredQuotes = allQuotes.filter((quote) => {
    const content = quote.content.toLowerCase();
    const author = (quote.author || "").toLowerCase();
    return content.includes(searchTerm) || author.includes(searchTerm);
  });

  renderQuotes();
}

// Render quotes to the DOM
function renderQuotes() {
  if (filteredQuotes.length === 0) {
    quotesList.innerHTML =
      '<p class="no-quotes">Inga citat hittades. Försök att lägga till ett!</p>';
    return;
  }

  // Sort quotes by creation date (newest first)
  const sortedQuotes = [...filteredQuotes].sort(
    (a, b) => new Date(b.createdTime) - new Date(a.createdTime),
  );

  quotesList.innerHTML = sortedQuotes.map((q) => createQuoteCard(q)).join("");

  // Make entire card clickable and keyboard-accessible to open modal
  document.querySelectorAll(".card").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      const quoteId = card.dataset.quoteId;
      const quote = filteredQuotes.find((q) => q.id === quoteId);
      if (quote) openQuoteModal(quote);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const quoteId = card.dataset.quoteId;
        const quote = filteredQuotes.find((q) => q.id === quoteId);
        if (quote) openQuoteModal(quote);
      }
    });
  });
}

// Create a quote card HTML element
function createQuoteCard(quote) {
  const isLong = quote.content && quote.content.length > 200;
  const displayText = escapeHtml(quote.content || "");
  // Provide an accessible label summarizing the quote and author
  const label = `${displayText.substring(0, 140)} — ${escapeHtml(
    quote.author || "Unknown",
  )}`;

  return `
    <article class="card" data-quote-id="${quote.id}" tabindex="0" role="button" aria-label="${label}">
      <p class="quote-text ${isLong ? "clamped" : ""}">${displayText}</p>
      <div class="quote-details">
        <div>
          <span class="quote-source label">${escapeHtml(quote.author)}</span>
          ${quote.additionalNote ? `<p class="additionalNote label-small">${escapeHtml(quote.additionalNote)}</p>` : ""}
        </div>
        <span class="quote-tag label-small">${escapeHtml(quote.type)}</span>
      </div>
    </article>
  `;
}

// Open modal with full quote
function openQuoteModal(quote) {
  // save currently focused element to restore later
  _lastFocusedElement = document.activeElement;

  fullQuoteContent.innerHTML = `
        <div>
            <p class="quote-text">${escapeHtml(quote.content)}</p>
            <div class="quote-details">
                <div>
                <span class="quote-source label">${escapeHtml(quote.author)}</span>
                ${quote.additionalNote ? `<p class="additionalNote label-small">${escapeHtml(quote.additionalNote)}</p>` : ""}
                </div>
                <span class="quote-tag label-small">${escapeHtml(quote.type)}</span>
            </div>
        </div>
    `;

  // hide main content from assistive tech
  const main = document.getElementById("mainContent");
  if (main) main.setAttribute("aria-hidden", "true");

  quoteModal.classList.remove("hidden");
  quoteModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // focus close button for keyboard users
  const closeBtn = document.querySelector(".close-modal");
  if (closeBtn) closeBtn.focus();
}

// Close modal
function closeQuoteModal() {
  quoteModal.classList.add("hidden");
  quoteModal.setAttribute("aria-hidden", "true");
  const main = document.getElementById("mainContent");
  if (main) main.removeAttribute("aria-hidden");
  document.body.style.overflow = "auto";

  // restore focus
  if (_lastFocusedElement && typeof _lastFocusedElement.focus === "function") {
    _lastFocusedElement.focus();
  }
}

// Open form modal
function openFormModal() {
  _lastFocusedElement = document.activeElement;
  const main = document.getElementById("mainContent");
  if (main) main.setAttribute("aria-hidden", "true");

  addQuoteModal.classList.remove("hidden");
  addQuoteModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstInput = document.getElementById("quoteContent");
  if (firstInput) firstInput.focus();
}

// Close form modal
function closeFormModal() {
  addQuoteModal.classList.add("hidden");
  addQuoteModal.setAttribute("aria-hidden", "true");
  const main = document.getElementById("mainContent");
  if (main) main.removeAttribute("aria-hidden");
  document.body.style.overflow = "auto";

  if (_lastFocusedElement && typeof _lastFocusedElement.focus === "function") {
    _lastFocusedElement.focus();
  }
}

// Show error message
function showError(message) {
  error.textContent = message;
  error.classList.remove("hidden");
  setTimeout(() => error.classList.add("hidden"), 5000);
}

// Show success message
function showSuccess(message) {
  const successEl = document.createElement("div");
  successEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 2000;
    `;
  successEl.textContent = message;
  document.body.appendChild(successEl);
  setTimeout(() => successEl.remove(), 3000);
}

// Escape HTML special characters
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
// Open source modal
function openSourceModal() {
  _lastFocusedElement = document.activeElement;
  const main = document.getElementById("mainContent");
  if (main) main.setAttribute("aria-hidden", "true");

  addSourceModal.classList.remove("hidden");
  addSourceModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstInput = document.getElementById("sourceFirstName");
  if (firstInput) firstInput.focus();
}

// Close source modal
function closeSourceModal() {
  addSourceModal.classList.add("hidden");
  addSourceModal.setAttribute("aria-hidden", "true");
  const main = document.getElementById("mainContent");
  if (main) main.removeAttribute("aria-hidden");
  document.body.style.overflow = "auto";

  if (_lastFocusedElement && typeof _lastFocusedElement.focus === "function") {
    _lastFocusedElement.focus();
  }
}

// Handle adding a new source
async function handleAddSource(e) {
  e.preventDefault();

  const firstName = document.getElementById("sourceFirstName").value.trim();
  const lastName = document.getElementById("sourceLastName").value.trim();
  const artistName = document.getElementById("sourceArtistName").value.trim();
  const title = document.getElementById("sourceTitle").value.trim();

  if (!firstName && !lastName && !artistName && !title) {
    showError("Vänligen fyll i minst ett fält.");
    return;
  }

  try {
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        artistName: artistName || undefined,
        title: title || undefined,
      }),
    });

    if (!response.ok) throw new Error("Failed to add source");

    const newSource = await response.json();

    // Reload metadata to refresh the author list
    await loadMetadata();

    // Find the newly created source in the authors list and set it
    const createdAuthor = _authors.find((a) => a.id === newSource.id);
    if (createdAuthor) {
      document.getElementById("quoteAuthor").value = createdAuthor.name;
    }

    sourceForm.reset();
    closeSourceModal();
    showSuccess("Källan skapades framgångsrikt!");
  } catch (err) {
    showError("Det gick inte att skapa källan. Försök igen.");
    console.error(err);
  }
}

// Toggle search input visibility
function toggleSearchInput() {
  if (!searchBox) return;
  searchBox.classList.toggle("expanded");
  const expanded = searchBox.classList.contains("expanded");
  if (expanded) {
    // focus input after expanding
    setTimeout(() => searchInput.focus(), 50);
  } else {
    searchInput.value = "";
    handleSearch();
  }
}

// Close search input when clicking outside
document.addEventListener("click", (e) => {
  if (!searchBox) return;
  if (
    searchBox.classList.contains("expanded") &&
    !e.target.closest(".search-box")
  ) {
    searchBox.classList.remove("expanded");
    searchInput.value = "";
    handleSearch();
  }
});
