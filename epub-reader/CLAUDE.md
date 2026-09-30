# Folio — ePub Reader

A browser-based ePub reader that emulates a physical book with a two-page spread, paper textures, and typographic details inspired by Amazon Kindle and Apple Books.

## File structure

No build tools, no backend. Three files:
- **`index.html`** — markup only (upload screen, book reader, TOC panel, loading overlay)
- **`style.css`** — all styles (CSS variables, layout, typography, responsive, animations)
- **`app.js`** — all JavaScript in an IIFE (ePub parsing, pagination, rendering, navigation)

The original single-file version is kept as `epub-reader (1).html` for reference.

External dependencies: **JSZip 3.10.1** (CDN), Google Fonts (Cormorant Garamond, Crimson Pro).

## How it works — high level

1. **Upload screen** — user drops or selects an `.epub` file.
2. **ePub parser** (`loadEpub()`) — uses JSZip to unzip the epub in-browser, reads the OPF package, extracts metadata/chapters/images/TOC.
3. **Rendering engine** — injects chapter HTML into CSS multi-column layouts, calculates pagination via `scrollWidth`, and shifts columns with `translateX` to simulate discrete pages.
4. **Navigation** — arrow keys, click zones, progress bar click, and TOC panel.

## Architecture — key components

### Upload & file handling
- Drag-and-drop on `.upload-zone` or `<input type="file">`.
- Both paths call `loadEpub(file)`.
- "New Book" button resets to the upload screen.

### ePub parsing — `loadEpub()`
Parsing follows the ePub/OPF standard:
1. Reads `META-INF/container.xml` → finds the OPF rootfile path.
2. Parses the OPF: extracts `<metadata>` (title, author), builds a `manifest` map (id → {href, type, properties}), reads `<spine>` order.
3. **Cover detection**: checks `<meta name="cover">`, then `properties="cover-image"`, then common ID patterns (`cover-image`, `cover`, etc.), then filename heuristics in `book.images`, and finally searches zip file paths directly for cover image filenames.
4. **Image extraction**: all `image/*` manifest items are converted to base64 data URLs and stored in `book.images` keyed by multiple path variants (full path, relative path, filename-only, without `./` prefix) for robust lookup.
5. **Chapter loading**: iterates spine items, reads each XHTML file, extracts `<body>` content, fixes image paths via `fixImagePaths()`, and extracts a title from the first `<h1-h3>`.
6. **TOC parsing** — three-tier fallback:
   - ePub3: finds the `nav` document (via `properties="nav"` or href heuristic), parses as XHTML first then falls back to HTML parsing. Searches for `<nav>` elements by `epub:type="toc"`, `role="doc-toc"`, or `id="toc"`, then any `<nav>`. Extracts `<a href>` links.
   - ePub2: finds the NCX file (`application/x-dtbncx+xml`), parses `<navPoint>` elements.
   - Fallback: uses chapter titles extracted during parsing.

### Image path resolution — `resolveImagePath()` / `fixImagePaths()`
A multi-strategy resolver that handles relative paths, `../` traversal, URL-encoded paths, root-dir prefixed paths, and filename-only fallback. Applied to `src`, `href`, `xlink:href`, and CSS `url()` references. Also converts full-page SVG `<image>` wrappers (with `viewBox` or `width="100%"`) to simple `<img>` tags.

### Cover detection — `detectCoverChapter()`
Determines if a chapter should render as a cover page. Checks (for chapters 0–2 only):
- Chapter href containing "cover"
- Elements with cover-related classes, IDs, or `role="doc-cover"`
- Chapters with images but minimal text (<150 chars)
- Chapter 0 with <50 chars of text when a `coverUrl` exists

### Pagination engine
This is the core layout system, split across several functions:

**`getPageMetrics(pageEl)`**: Returns `{ pageWidth, usableHeight }` from the `.page-viewport` dimensions.

**`calculateChapterPages()`**: Sets `--page-width` and `--page-usable-height` CSS variables on `.page-flow` elements. Calculates `totalPages = ceil(scrollWidth / pageWidth)` and builds `book.pageStarts[]` array of pixel offsets. Skips calculation for cover pages (always 1 page).

**`applyPageOffsets()`**: Sets `translateX(-offset)` on left and right `.page-flow` elements for the current page. Left page shows page N, right page shows page N+1. Hides the right page on mobile (≤768px) or when it would exceed total pages.

**`getPagesPerTurn()`**: Returns 2 on desktop, 1 on mobile — controls how many pages advance per click/keypress.

**`computeLastPageStart(totalPages)`**: Ensures the last page aligns correctly for odd/even page counts in two-page mode.

**CSS multi-column layout**: each chapter's HTML goes into a `.page-flow` div inside a `.page-viewport` with `column-width` set to the viewport width and `column-fill: auto`. The browser flows content into columns; each column = one page. `.page-flow` uses `will-change: transform` for smooth transitions. Break-inside is avoided for headings, blockquotes, images, figures, tables, and pre elements.

### Rendering — `renderChapter(options)`
Accepts `{ jumpToEnd }` option for backward navigation. Three rendering paths:
1. **Cover with image** (chapter 0 + `coverUrl`): renders centered cover image with title/author in `.cover-display`.
2. **Cover without image**: renders chapter HTML in a single scrollable viewport.
3. **Regular chapter**: injects HTML into `.page-flow` columns on both left and right pages.

After rendering: applies font size, drop caps (via `applyDropCap()`), calculates pagination, sets page offsets, updates TOC highlight, and triggers page-turn animation.

### Navigation — `goPage(dir)`
- Forward: advance by `step` pages; if past end, move to next chapter (page 0).
- Backward: go back by `step` pages; if before start, move to previous chapter (last page via `jumpToEnd`).
- Keyboard: ArrowRight/Space = forward, ArrowLeft = back, Escape = close TOC.
- Progress bar click: jumps to a chapter proportional to click position.

### Reading progress — `updateReadingProgress()`
Calculates global progress as `(currentChapter + chapterProgress) / totalChapters`. Updates the progress bar fill width and label showing `Ch X/Y • Pg X/Y`.

### Visual design

**Paper texture** (`generatePaperTexture(canvas, seed)`): procedurally generates a canvas texture using a seeded PRNG (mulberry32). Renders warm-toned radial gradients, per-pixel noise, subtle fiber lines, and specks. Each page gets a different seed (left=12345, right=67890). Respects `devicePixelRatio` for sharp rendering on retina displays.

**CSS layers on each `.page`**:
- z-index 0: `<canvas>` paper texture (multiply blend)
- z-index 1: `::before` edge darkening gradients + `::after` SVG fractal noise overlay
- z-index 2: `.page-content` (actual text)
- z-index 5: `.page-number`

**Typography**: Cormorant Garamond for headings/titles, Crimson Pro for body text. Justified text with CSS hyphens, `text-indent` for paragraphs, `orphans:2 / widows:2` for column breaks.

**Drop cap** (`applyDropCap(pageEl)`): finds the first `<p>` with ≥20 chars starting with a letter and adds `.drop-cap` class → `::first-letter` styling.

### TOC UI — `buildTocUI()`
Builds the table of contents panel by creating `.toc-item` elements from `book.toc`. Each item navigates to its chapter on click and closes the TOC panel.

### Bookmarks
Bookmark button in the top bar (or `B` key) toggles a bookmark on the visible page(s); a red ribbon shows on bookmarked pages. Bookmarks are listed under the Contents panel, with remove buttons. `updateBookmarkUI()` runs from `updateReadingProgress()`.

### State model
All state lives in the `book` object:
```
book = {
  chapters: [{title, href, html}],  // parsed chapter data
  toc: [{title, ci}],                // table of contents (ci = chapter index)
  title, author, coverUrl,           // metadata
  currentChapter, currentPage,       // reading position
  totalPages, pageStarts: [offsets], // pagination for current chapter
  images: {path: dataUrl},           // extracted images
  _rootDir: '',                      // OPF directory prefix
  fontSize: 100                      // percentage (70–150)
}
```

### Font size
Range 70%–150% in 10% steps. On change, re-renders the chapter and estimates the equivalent page position using a ratio-based heuristic to maintain approximate reading position.

### Responsive behavior
At ≤768px: single-page mode (right page hidden), spine line hidden, reduced padding/margins (viewport insets shrink from 52px to 28px, top from 72px to 52px), smaller title and buttons.

### Resize handling
Debounced at 200ms. Re-renders paper textures and re-paginates the current chapter.

## Key design decisions
- **All images as base64 data URLs**: avoids blob URL lifecycle issues; works because epub images are typically small.
- **Duplicated HTML in left/right pages**: both pages contain the full chapter HTML but show different column offsets. Simpler than splitting content across two containers.
- **Minimal persistent state**: only bookmarks are saved (localStorage, key `folio-bookmarks:<title>|<author>`, entries `{ci, ratio, title}` where `ratio` is the page position within the chapter so bookmarks survive font/resize changes). Reading position is saved the same way under `folio-position:<title>|<author>` on every `updateReadingProgress()` and restored in `loadEpub()`.
- **Case-insensitive file lookup** (`findFileInsensitive()`): handles epubs with inconsistent path casing.
- **IIFE wrapper**: all code runs inside an immediately-invoked function expression to avoid global scope pollution.

## Known limitations
- No CSS from the epub is applied — all styling is overridden by the reader's own styles.
- No support for epub fixed-layout (FXL) books.
- No annotation or highlight functionality.
- Very large epubs may be slow due to base64 image extraction.
- Progress bar click jumps to chapter boundaries, not arbitrary page positions within chapters.
