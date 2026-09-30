(function () {
    let book = {
        chapters: [],
        toc: [],
        title: "",
        author: "",
        coverUrl: null,
        currentChapter: 0,
        currentPage: 0,
        totalPages: 1,
        pageStarts: [0],
        images: {},
        _rootDir: "",
        fontSize: 100,
        bookmarks: [],
    };

    const uploadScreen = document.getElementById("uploadScreen");
    const bookWrapper = document.getElementById("bookWrapper");
    const fileInput = document.getElementById("fileInput");
    const uploadZone = document.getElementById("uploadZone");
    const leftPage = document.getElementById("leftPage");
    const rightPage = document.getElementById("rightPage");
    const leftPageNum = document.getElementById("leftPageNum");
    const rightPageNum = document.getElementById("rightPageNum");
    const progressFill = document.getElementById("progressFill");
    const progressLabel = document.getElementById("progressLabel");
    const titleDisplay = document.getElementById("bookTitleDisplay");
    const tocPanel = document.getElementById("tocPanel");
    const tocOverlay = document.getElementById("tocOverlay");
    const tocList = document.getElementById("tocList");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const bookmarkBtn = document.getElementById("bookmarkBtn");
    const bookmarkRibbon = document.getElementById("bookmarkRibbon");
    const bookmarkList = document.getElementById("bookmarkList");

    // ===== PAPER TEXTURE =====
    function generatePaperTexture(canvas, seed) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        const w = Math.max(rect.width, 400) * dpr;
        const h = Math.max(rect.height, 500) * dpr;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        const ctx = canvas.getContext("2d");
        function mulberry32(a) {
            return function () {
                a |= 0;
                a = (a + 0x6d2b79f5) | 0;
                var t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
        const rng = mulberry32(seed);
        ctx.fillStyle = "#f4ece1";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 12; i++) {
            const x = rng() * w,
                y = rng() * h,
                radius = (80 + rng() * 200) * dpr,
                warmth = rng();
            const grad = ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                radius,
            );
            grad.addColorStop(
                0,
                `rgba(${(200 + warmth * 40) | 0},${(180 + warmth * 30) | 0},${(150 + warmth * 20) | 0},${0.02 + rng() * 0.04})`,
            );
            grad.addColorStop(1, "rgba(244,236,225,0)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (rng() - 0.5) * 18;
            data[i] = Math.max(
                0,
                Math.min(255, data[i] + noise + rng() * 3),
            );
            data[i + 1] = Math.max(
                0,
                Math.min(255, data[i + 1] + noise),
            );
            data[i + 2] = Math.max(
                0,
                Math.min(255, data[i + 2] + noise - rng() * 2),
            );
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.globalAlpha = 0.025;
        for (let i = 0; i < 150; i++) {
            const y = rng() * h,
                startX = rng() * w * 0.3,
                length = (50 + rng() * 300) * dpr;
            ctx.strokeStyle = rng() > 0.5 ? "#c8b898" : "#d5c8ad";
            ctx.lineWidth = 0.5 + rng() * 1.5;
            ctx.globalAlpha = 0.01 + rng() * 0.035;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.bezierCurveTo(
                startX + length * 0.3,
                y + (rng() - 0.5) * 3 * dpr,
                startX + length * 0.7,
                y + (rng() - 0.5) * 3 * dpr,
                startX + length,
                y + (rng() - 0.5) * 2,
            );
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < Math.floor(w * h * 0.00003); i++) {
            const x = rng() * w,
                y = rng() * h,
                size = (0.5 + rng() * 1.5) * dpr;
            const brightness = 150 + rng() * 60;
            ctx.fillStyle = `rgba(${brightness},${brightness - 15},${brightness - 30},${0.08 + rng() * 0.15})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function renderPaperTextures() {
        const lc = document.getElementById("paperTextureLeft");
        const rc = document.getElementById("paperTextureRight");
        if (lc) generatePaperTexture(lc, 12345);
        if (rc) generatePaperTexture(rc, 67890);
    }
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderPaperTextures();
            if (bookWrapper.classList.contains("active"))
                renderChapter();
        }, 200);
    });
    requestAnimationFrame(() =>
        setTimeout(renderPaperTextures, 50),
    );

    // ===== EVENTS =====
    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragging");
    });
    uploadZone.addEventListener("dragleave", () =>
        uploadZone.classList.remove("dragging"),
    );
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragging");
        if (e.dataTransfer.files[0])
            loadEpub(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) loadEpub(e.target.files[0]);
    });

    document
        .getElementById("navPrev")
        .addEventListener("click", () => goPage(-1));
    document
        .getElementById("navNext")
        .addEventListener("click", () => goPage(1));
    document
        .getElementById("tocBtn")
        .addEventListener("click", toggleToc);
    bookmarkBtn.addEventListener("click", toggleBookmark);
    document
        .getElementById("tocOverlay")
        .addEventListener("click", toggleToc);
    document
        .getElementById("newBookBtn")
        .addEventListener("click", () => {
            bookWrapper.classList.remove("active");
            uploadScreen.style.display = "flex";
            fileInput.value = "";
        });
    document
        .getElementById("fontUp")
        .addEventListener("click", () => changeFontSize(10));
    document
        .getElementById("fontDown")
        .addEventListener("click", () => changeFontSize(-10));

    document.addEventListener("keydown", (e) => {
        if (!bookWrapper.classList.contains("active")) return;
        if (e.key === "ArrowRight" || e.key === " ") {
            e.preventDefault();
            goPage(1);
        }
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            goPage(-1);
        }
        if (e.key === "b" || e.key === "B") toggleBookmark();
        if (
            e.key === "Escape" &&
            tocPanel.classList.contains("open")
        )
            toggleToc();
    });

    // ===== SAMPLE BOOKS =====
    document.querySelectorAll(".sample-book").forEach((el) => {
        el.addEventListener("click", async () => {
            const src = el.dataset.src;
            if (!src) return;
            el.classList.add("loading");
            try {
                const resp = await fetch(src);
                if (!resp.ok)
                    throw new Error("Failed to fetch " + src);
                const buf = await resp.arrayBuffer();
                await loadEpub(buf);
            } catch (err) {
                console.error("Error loading sample book:", err);
                alert(
                    "Could not load sample book. Please try uploading an ePub file instead.",
                );
            } finally {
                el.classList.remove("loading");
            }
        });
    });

    function changeFontSize(delta) {
        const priorPageRatio =
            book.totalPages > 1
                ? book.currentPage / (book.totalPages - 1)
                : 0;
        book.fontSize = Math.max(
            70,
            Math.min(150, book.fontSize + delta),
        );
        document.getElementById("fontLabel").textContent =
            book.fontSize + "%";
        renderChapter();
        if (book.totalPages > 1) {
            book.currentPage = Math.max(
                0,
                Math.min(
                    book.totalPages - 1,
                    Math.round(
                        priorPageRatio * (book.totalPages - 1),
                    ),
                ),
            );
            applyPageOffsets();
            updateReadingProgress();
        }
    }
    function toggleToc() {
        if (!tocPanel.classList.contains("open")) buildBookmarkUI();
        tocPanel.classList.toggle("open");
        tocOverlay.classList.toggle("open");
    }

    // ===== DROP CAP =====
    function applyDropCap(pageEl) {
        const paragraphs = pageEl.querySelectorAll("p");
        for (const p of paragraphs) {
            const text = p.textContent?.trim();
            if (!text || text.length < 20) continue;
            if (!/^[A-Za-z]/.test(text)) continue;
            p.classList.add("drop-cap");
            return;
        }
    }

    // ===== COVER DETECTION =====
    function detectCoverChapter(html, chapterIndex) {
        if (chapterIndex > 2) return false;
        const ch = book.chapters[chapterIndex];
        if (ch && /cover/i.test(ch.href)) return true;
        const temp = document.createElement("div");
        temp.innerHTML = html;
        if (
            temp.querySelector(
                '[class*="cover" i], [id*="cover" i], [role="doc-cover"]',
            )
        )
            return true;
        const images = temp.querySelectorAll(
            'img, image, svg image, [style*="background"]',
        );
        const textContent = temp.textContent?.trim() || "";
        const textLength = textContent.replace(/\s+/g, " ").length;
        if (images.length > 0 && textLength < 150) return true;
        if (chapterIndex === 0 && textLength < 50 && book.coverUrl)
            return true;
        return false;
    }

    function getPagesPerTurn() {
        return window.innerWidth > 768 ? 2 : 1;
    }

    function computeLastPageStart(totalPages) {
        if (getPagesPerTurn() === 1)
            return Math.max(0, totalPages - 1);
        if (totalPages <= 1) return 0;
        return totalPages % 2 === 0
            ? totalPages - 2
            : totalPages - 1;
    }

    function getPageMetrics(pageEl) {
        const viewport = pageEl.querySelector(".page-viewport");
        const pageWidth = Math.max(
            1,
            viewport ? viewport.clientWidth : pageEl.clientWidth,
        );
        const usableHeight = Math.max(
            1,
            viewport ? viewport.clientHeight : pageEl.clientHeight,
        );
        return { pageWidth, usableHeight };
    }

    function calculateChapterPages() {
        if (leftPage.classList.contains("is-cover")) {
            book.pageStarts = [0];
            book.totalPages = 1;
            return;
        }

        const leftViewport =
            leftPage.querySelector(".page-viewport");
        const rightViewport =
            rightPage.querySelector(".page-viewport");
        const leftFlow = leftPage.querySelector(".page-flow");
        const rightFlow = rightPage.querySelector(".page-flow");
        if (!leftFlow || !leftViewport) {
            book.pageStarts = [0];
            book.totalPages = 1;
            return;
        }

        const { pageWidth, usableHeight } =
            getPageMetrics(leftPage);

        leftFlow.style.setProperty(
            "--page-width",
            pageWidth + "px",
        );
        leftFlow.style.setProperty(
            "--page-usable-height",
            usableHeight + "px",
        );
        leftFlow.style.transform = "translateX(0px)";
        if (rightFlow) {
            rightFlow.style.setProperty(
                "--page-width",
                pageWidth + "px",
            );
            rightFlow.style.setProperty(
                "--page-usable-height",
                usableHeight + "px",
            );
            rightFlow.style.transform = "translateX(0px)";
        }

        const contentWidth = leftFlow.scrollWidth || pageWidth;
        const totalPages = Math.max(
            1,
            Math.ceil(contentWidth / pageWidth),
        );
        book.totalPages = totalPages;
        book.pageStarts = Array.from(
            { length: totalPages },
            (_, i) => i * pageWidth,
        );
    }

    function applyPageOffsets() {
        const leftIndex = book.currentPage;
        const rightIndex = leftIndex + 1;
        const leftOffset = book.pageStarts[leftIndex] ?? 0;
        const rightOffset = book.pageStarts[rightIndex] ?? 0;
        const leftFlow = leftPage.querySelector(".page-flow");
        const rightFlow = rightPage.querySelector(".page-flow");

        if (leftFlow)
            leftFlow.style.transform = `translateX(-${leftOffset}px)`;
        leftPageNum.textContent = leftIndex + 1;

        if (window.innerWidth > 768) {
            if (
                rightIndex < book.totalPages &&
                !leftPage.classList.contains("is-cover") &&
                rightFlow
            ) {
                rightPage.style.visibility = "visible";
                rightFlow.style.transform = `translateX(-${rightOffset}px)`;
                rightPageNum.textContent = rightIndex + 1;
            } else {
                rightPage.style.visibility = "hidden";
                rightPageNum.textContent = "";
            }
        } else {
            rightPageNum.textContent = "";
        }
    }

    function updateReadingProgress() {
        const chapterProgress =
            book.totalPages > 0
                ? (book.currentPage + 1) / book.totalPages
                : 0;
        const global =
            ((book.currentChapter + chapterProgress) /
                Math.max(1, book.chapters.length)) *
            100;
        progressFill.style.width = global.toFixed(2) + "%";
        progressLabel.textContent = `Ch ${book.currentChapter + 1}/${book.chapters.length} • Pg ${book.currentPage + 1}/${book.totalPages}`;
        updateBookmarkUI();
        saveReadingPosition();
    }

    // ===== READING POSITION =====
    // Saved per book as { ci, ratio }, same scheme as bookmarks.
    function positionKey() {
        return "folio-position:" + book.title + "|" + book.author;
    }

    function saveReadingPosition() {
        if (!book.chapters.length) return;
        try {
            localStorage.setItem(
                positionKey(),
                JSON.stringify({
                    ci: book.currentChapter,
                    ratio: pageToRatio(book.currentPage),
                }),
            );
        } catch {}
    }

    function loadReadingPosition() {
        try {
            const pos = JSON.parse(localStorage.getItem(positionKey()));
            if (pos && pos.ci >= 0 && pos.ci < book.chapters.length)
                return pos;
        } catch {}
        return null;
    }

    // ===== BOOKMARKS =====
    // Stored per book in localStorage as { ci, ratio } so positions survive
    // font-size and window-size changes that alter the page count.
    function bookmarkKey() {
        return "folio-bookmarks:" + book.title + "|" + book.author;
    }

    function loadBookmarks() {
        try {
            book.bookmarks =
                JSON.parse(localStorage.getItem(bookmarkKey())) || [];
        } catch {
            book.bookmarks = [];
        }
    }

    function saveBookmarks() {
        try {
            localStorage.setItem(
                bookmarkKey(),
                JSON.stringify(book.bookmarks),
            );
        } catch {}
    }

    function pageToRatio(page) {
        return book.totalPages > 1 ? page / (book.totalPages - 1) : 0;
    }

    function ratioToPage(ratio) {
        return Math.round(ratio * Math.max(0, book.totalPages - 1));
    }

    // Pages currently visible (1 on mobile, up to 2 in a spread)
    function visiblePages() {
        const pages = [book.currentPage];
        if (
            getPagesPerTurn() === 2 &&
            book.currentPage + 1 < book.totalPages
        )
            pages.push(book.currentPage + 1);
        return pages;
    }

    function findVisibleBookmark() {
        const pages = visiblePages();
        return book.bookmarks.findIndex(
            (b) =>
                b.ci === book.currentChapter &&
                pages.includes(ratioToPage(b.ratio)),
        );
    }

    function toggleBookmark() {
        if (!book.chapters.length) return;
        const idx = findVisibleBookmark();
        if (idx >= 0) {
            book.bookmarks.splice(idx, 1);
        } else {
            book.bookmarks.push({
                ci: book.currentChapter,
                ratio: pageToRatio(book.currentPage),
                title:
                    book.chapters[book.currentChapter].title ||
                    "Chapter " + (book.currentChapter + 1),
            });
            book.bookmarks.sort(
                (a, b) => a.ci - b.ci || a.ratio - b.ratio,
            );
        }
        saveBookmarks();
        updateBookmarkUI();
    }

    function updateBookmarkUI() {
        const marked = findVisibleBookmark() >= 0;
        bookmarkBtn.classList.toggle("bookmarked", marked);
        bookmarkBtn.title = marked
            ? "Remove bookmark (B)"
            : "Bookmark this page (B)";
        bookmarkRibbon.classList.toggle("visible", marked);
    }

    function buildBookmarkUI() {
        bookmarkList.innerHTML = "";
        if (!book.bookmarks.length) {
            bookmarkList.innerHTML =
                '<div class="bookmark-empty">No bookmarks yet — press B to add one.</div>';
            return;
        }
        book.bookmarks.forEach((bm, i) => {
            const row = document.createElement("div");
            row.className = "bookmark-item";
            const link = document.createElement("div");
            link.className = "toc-item";
            link.textContent = bm.title + " ";
            const pct = document.createElement("span");
            pct.className = "bookmark-page";
            pct.textContent = Math.round(bm.ratio * 100) + "%";
            link.appendChild(pct);
            link.addEventListener("click", () => {
                book.currentChapter = bm.ci;
                book.currentPage = 0;
                renderChapter();
                book.currentPage = ratioToPage(bm.ratio);
                applyPageOffsets();
                updateReadingProgress();
                toggleToc();
            });
            const del = document.createElement("button");
            del.className = "bookmark-remove";
            del.title = "Remove bookmark";
            del.textContent = "×";
            del.addEventListener("click", () => {
                book.bookmarks.splice(i, 1);
                saveBookmarks();
                buildBookmarkUI();
                updateBookmarkUI();
            });
            row.append(link, del);
            bookmarkList.appendChild(row);
        });
    }

    // ===== RENDER CHAPTER =====
    function renderChapter(options = {}) {
        const { jumpToEnd = false } = options;
        const ch = book.chapters[book.currentChapter];
        if (!ch) return;

        const isCoverChapter = detectCoverChapter(
            ch.html,
            book.currentChapter,
        );

        if (
            isCoverChapter &&
            book.coverUrl &&
            book.currentChapter === 0
        ) {
            leftPage.className = "page-content is-cover";
            leftPage.innerHTML = `
        <div class="cover-display">
          <img src="${book.coverUrl}" alt="Book cover">
          <div class="cover-title">${book.title}</div>
          ${book.author ? `<div class="cover-author">${book.author}</div>` : ""}
        </div>`;
            rightPage.className = "page-content";
            rightPage.innerHTML = "";
            rightPage.style.visibility = "hidden";
        } else if (isCoverChapter) {
            leftPage.className = "page-content";
            leftPage.innerHTML =
                '<div class="page-viewport" style="overflow-y:auto; padding-right:135px; overflow-wrap:break-word; word-wrap:break-word;">' +
                ch.html +
                "</div>";
            rightPage.className = "page-content";
            rightPage.innerHTML = "";
            rightPage.style.visibility = "hidden";
        } else {
            leftPage.className = "page-content";
            leftPage.innerHTML = `<div class="page-viewport"><div class="page-flow">${ch.html}</div></div>`;
            rightPage.className = "page-content";
            rightPage.innerHTML = `<div class="page-viewport"><div class="page-flow">${ch.html}</div></div>`;
            rightPage.style.visibility =
                window.innerWidth > 768 ? "visible" : "hidden";
        }

        leftPage.style.fontSize = book.fontSize + "%";
        rightPage.style.fontSize = book.fontSize + "%";
        if (!isCoverChapter)
            applyDropCap(
                leftPage.querySelector(".page-flow") || leftPage,
            );
        if (!isCoverChapter)
            applyDropCap(
                rightPage.querySelector(".page-flow") || rightPage,
            );

        if (!jumpToEnd && book.currentPage < 0)
            book.currentPage = 0;

        calculateChapterPages();
        if (jumpToEnd)
            book.currentPage = computeLastPageStart(
                book.totalPages,
            );
        book.currentPage = Math.max(
            0,
            Math.min(book.totalPages - 1, book.currentPage),
        );
        applyPageOffsets();
        updateReadingProgress();

        // TOC highlight
        document.querySelectorAll(".toc-item").forEach((el, i) => {
            el.classList.toggle(
                "active",
                book.toc[i]?.ci === book.currentChapter,
            );
        });

        // Page turn animation
        document.querySelectorAll(".page").forEach((p) => {
            p.classList.remove("page-turn");
            void p.offsetWidth;
            p.classList.add("page-turn");
        });
    }

    function goPage(dir) {
        const step = getPagesPerTurn();
        const nextPage = book.currentPage + dir * step;

        if (dir > 0) {
            if (nextPage < book.totalPages) {
                book.currentPage = nextPage;
                applyPageOffsets();
                updateReadingProgress();
            } else if (
                book.currentChapter <
                book.chapters.length - 1
            ) {
                book.currentChapter += 1;
                book.currentPage = 0;
                renderChapter();
            }
            return;
        }

        if (nextPage >= 0) {
            book.currentPage = nextPage;
            applyPageOffsets();
            updateReadingProgress();
        } else if (book.currentChapter > 0) {
            book.currentChapter -= 1;
            book.currentPage = 0;
            renderChapter({ jumpToEnd: true });
        }
    }

    // Progress bar click
    document
        .getElementById("progressBar")
        .addEventListener("click", (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            book.currentChapter = Math.min(
                book.chapters.length - 1,
                Math.max(0, Math.floor(pct * book.chapters.length)),
            );
            book.currentPage = 0;
            renderChapter();
        });

    // ===== IMAGE PATH RESOLUTION =====
    function resolveImagePath(rawPath, chapterHref) {
        if (
            !rawPath ||
            rawPath.startsWith("data:") ||
            rawPath.startsWith("http") ||
            rawPath.startsWith("blob:")
        )
            return null;
        let decoded = rawPath;
        try {
            decoded = decodeURIComponent(rawPath);
        } catch (e) {}
        if (book.images[decoded]) return book.images[decoded];
        if (book.images[rawPath]) return book.images[rawPath];
        const chapterDir = chapterHref.includes("/")
            ? chapterHref.substring(
                  0,
                  chapterHref.lastIndexOf("/") + 1,
              )
            : "";
        const parts = (chapterDir + decoded).split("/");
        const resolved = [];
        for (const part of parts) {
            if (part === "..") resolved.pop();
            else if (part !== "." && part !== "")
                resolved.push(part);
        }
        const resolvedPath = resolved.join("/");
        if (book.images[resolvedPath])
            return book.images[resolvedPath];
        if (book._rootDir) {
            const wr = book._rootDir + resolvedPath;
            if (book.images[wr]) return book.images[wr];
        }
        const fname = decoded.split("/").pop();
        if (book.images[fname]) return book.images[fname];
        for (const [key, url] of Object.entries(book.images)) {
            if (key.split("/").pop() === fname) return url;
        }
        return null;
    }

    function fixImagePaths(html, chapterHref) {
        html = html.replace(
            /(src|href)\s*=\s*["']([^"']+)["']/gi,
            (m, attr, p) => {
                const r = resolveImagePath(p, chapterHref);
                return r ? `${attr}="${r}"` : m;
            },
        );
        html = html.replace(
            /xlink:href\s*=\s*["']([^"']+)["']/gi,
            (m, p) => {
                const r = resolveImagePath(p, chapterHref);
                return r ? `xlink:href="${r}"` : m;
            },
        );
        html = html.replace(
            /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
            (m, p) => {
                const r = resolveImagePath(p, chapterHref);
                return r ? `url("${r}")` : m;
            },
        );
        html = html.replace(
            /<svg[^>]*>[\s\S]*?<image[^>]*(?:xlink:)?href\s*=\s*["']([^"']+)["'][^>]*\/?>[\s\S]*?<\/svg>/gi,
            (m, src) => {
                if (
                    m.includes("viewBox") ||
                    m.includes('width="100%"')
                )
                    return `<img src="${src}" style="width:100%;height:auto;display:block;" alt="cover"/>`;
                return m;
            },
        );
        return html;
    }

    // ===== EPUB PARSER =====
    async function loadEpub(file) {
        loadingOverlay.classList.add("active");
        try {
            const zip = await JSZip.loadAsync(file);
            const containerXml = await zip
                .file("META-INF/container.xml")
                ?.async("string");
            if (!containerXml)
                throw new Error(
                    "Invalid ePub: missing container.xml",
                );
            const parser = new DOMParser();
            const containerDoc = parser.parseFromString(
                containerXml,
                "application/xml",
            );
            const rootfilePath = containerDoc
                .querySelector("rootfile")
                ?.getAttribute("full-path");
            if (!rootfilePath)
                throw new Error("Invalid ePub: no rootfile");
            const rootDir = rootfilePath.includes("/")
                ? rootfilePath.substring(
                      0,
                      rootfilePath.lastIndexOf("/") + 1,
                  )
                : "";
            book._rootDir = rootDir;

            const opfXml = await zip
                .file(rootfilePath)
                ?.async("string");
            if (!opfXml)
                throw new Error("Invalid ePub: missing OPF");
            const opfDoc = parser.parseFromString(
                opfXml,
                "application/xml",
            );

            // Title & author
            book.title =
                opfDoc.querySelector("metadata title")
                    ?.textContent ||
                    (file.name
                        ? file.name.replace(".epub", "")
                        : "Untitled");
            titleDisplay.textContent = book.title;
            book.author =
                opfDoc.querySelector("metadata creator")
                    ?.textContent || "";

            // Manifest
            const manifest = {};
            opfDoc
                .querySelectorAll("manifest item")
                .forEach((item) => {
                    manifest[item.getAttribute("id")] = {
                        href: item.getAttribute("href"),
                        type: item.getAttribute("media-type"),
                        properties:
                            item.getAttribute("properties") || "",
                    };
                });

            // Spine
            const spineItems = [];
            opfDoc
                .querySelectorAll("spine itemref")
                .forEach((ref) => {
                    const id = ref.getAttribute("idref");
                    if (manifest[id]) spineItems.push(manifest[id]);
                });

            // Cover image detection
            let coverImageId = null;
            const coverMeta =
                opfDoc.querySelector('meta[name="cover"]');
            if (coverMeta)
                coverImageId = coverMeta.getAttribute("content");
            if (!coverImageId) {
                opfDoc
                    .querySelectorAll("manifest item")
                    .forEach((el) => {
                        if (
                            (
                                el.getAttribute("properties") || ""
                            ).includes("cover-image")
                        )
                            coverImageId = el.getAttribute("id");
                    });
            }
            if (!coverImageId) {
                for (const cid of [
                    "cover-image",
                    "cover_image",
                    "coverimage",
                    "cover",
                    "Cover",
                    "cover-img",
                ]) {
                    if (
                        manifest[cid] &&
                        manifest[cid].type?.startsWith("image/")
                    ) {
                        coverImageId = cid;
                        break;
                    }
                }
            }

            // Extract images as base64 data URLs
            book.images = {};
            book.coverUrl = null;
            for (const [id, item] of Object.entries(manifest)) {
                if (item.type && item.type.startsWith("image/")) {
                    const imgPath = rootDir + item.href;
                    const imgFile =
                        zip.file(imgPath) ||
                        findFileInsensitive(zip, imgPath);
                    if (imgFile) {
                        const base64 =
                            await imgFile.async("base64");
                        const dataUrl = `data:${item.type};base64,${base64}`;
                        book.images[item.href] = dataUrl;
                        book.images[imgPath] = dataUrl;
                        book.images[item.href.split("/").pop()] =
                            dataUrl;
                        if (item.href.startsWith("./"))
                            book.images[item.href.slice(2)] =
                                dataUrl;
                        if (id === coverImageId)
                            book.coverUrl = dataUrl;
                    }
                }
            }
            if (!book.coverUrl) {
                for (const [key, url] of Object.entries(
                    book.images,
                )) {
                    if (
                        key.toLowerCase().includes("cover") &&
                        !key.toLowerCase().includes("spine")
                    ) {
                        book.coverUrl = url;
                        break;
                    }
                }
            }
            if (!book.coverUrl) {
                for (const zipPath of Object.keys(zip.files)) {
                    const lower = zipPath.toLowerCase();
                    if (
                        lower.includes("cover") &&
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(lower) &&
                        !zip.files[zipPath].dir
                    ) {
                        const b64 =
                            await zip.files[zipPath].async(
                                "base64",
                            );
                        book.coverUrl = `data:image/${lower.endsWith(".png") ? "png" : "jpeg"};base64,${b64}`;
                        break;
                    }
                }
            }

            // Load chapters
            book.chapters = [];
            for (const item of spineItems) {
                const chPath = rootDir + item.href;
                const chFile =
                    zip.file(chPath) ||
                    findFileInsensitive(zip, chPath);
                if (chFile) {
                    let html = await chFile.async("string");
                    html = fixImagePaths(html, item.href);
                    const bodyMatch = html.match(
                        /<body[^>]*>([\s\S]*?)<\/body>/i,
                    );
                    const bodyContent = bodyMatch
                        ? bodyMatch[1]
                        : html;
                    const titleMatch = bodyContent.match(
                        /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i,
                    );
                    const chTitle = titleMatch
                        ? titleMatch[1]
                              .replace(/<[^>]+>/g, "")
                              .trim()
                        : `Chapter ${book.chapters.length + 1}`;
                    book.chapters.push({
                        title: chTitle,
                        href: item.href,
                        html: bodyContent,
                    });
                }
            }

            // ===== TOC PARSING =====
            book.toc = [];

            // ePub3 nav document
            let navItem = null;
            for (const [id, item] of Object.entries(manifest)) {
                if (item.properties.includes("nav")) {
                    navItem = item;
                    break;
                }
            }
            if (!navItem)
                navItem = Object.values(manifest).find(
                    (m) =>
                        m.type === "application/xhtml+xml" &&
                        /nav/i.test(m.href),
                );

            if (navItem) {
                const navPath = rootDir + navItem.href;
                const navFile =
                    zip.file(navPath) ||
                    findFileInsensitive(zip, navPath);
                if (navFile) {
                    const navHtml = await navFile.async("string");
                    let navDoc;
                    try {
                        navDoc = parser.parseFromString(
                            navHtml,
                            "application/xhtml+xml",
                        );
                        if (navDoc.querySelector("parsererror"))
                            throw new Error();
                    } catch (e) {
                        navDoc = parser.parseFromString(
                            navHtml,
                            "text/html",
                        );
                    }
                    let navEl = null;
                    for (const n of navDoc.querySelectorAll(
                        "nav",
                    )) {
                        const etype =
                            n.getAttribute("epub:type") ||
                            n.getAttributeNS(
                                "http://www.idpf.org/2007/ops",
                                "type",
                            ) ||
                            "";
                        const role = n.getAttribute("role") || "";
                        const id = n.getAttribute("id") || "";
                        if (
                            etype.includes("toc") ||
                            role === "doc-toc" ||
                            id === "toc"
                        ) {
                            navEl = n;
                            break;
                        }
                    }
                    if (!navEl) navEl = navDoc.querySelector("nav");
                    if (navEl) {
                        navEl
                            .querySelectorAll("a[href]")
                            .forEach((a) => {
                                const href = a
                                    .getAttribute("href")
                                    ?.split("#")[0];
                                const label = a.textContent?.trim();
                                if (href && label) {
                                    const idx =
                                        book.chapters.findIndex(
                                            (c) =>
                                                c.href === href ||
                                                c.href.endsWith(
                                                    href,
                                                ) ||
                                                href.endsWith(
                                                    c.href,
                                                ),
                                        );
                                    if (
                                        idx >= 0 &&
                                        !book.toc.some(
                                            (t) => t.ci === idx,
                                        )
                                    ) {
                                        book.toc.push({
                                            title: label,
                                            ci: idx,
                                        });
                                    }
                                }
                            });
                    }
                }
            }

            // ePub2 NCX fallback
            if (book.toc.length === 0) {
                const ncxItem = Object.values(manifest).find(
                    (m) => m.type === "application/x-dtbncx+xml",
                );
                if (ncxItem) {
                    const ncxPath = rootDir + ncxItem.href;
                    const ncxFile =
                        zip.file(ncxPath) ||
                        findFileInsensitive(zip, ncxPath);
                    if (ncxFile) {
                        const ncxDoc = parser.parseFromString(
                            await ncxFile.async("string"),
                            "application/xml",
                        );
                        ncxDoc
                            .querySelectorAll("navPoint")
                            .forEach((np) => {
                                const label = np
                                    .querySelector("navLabel text")
                                    ?.textContent?.trim();
                                const src = np
                                    .querySelector("content")
                                    ?.getAttribute("src")
                                    ?.split("#")[0];
                                if (label && src) {
                                    const idx =
                                        book.chapters.findIndex(
                                            (c) =>
                                                c.href === src ||
                                                c.href.endsWith(
                                                    src,
                                                ) ||
                                                src.endsWith(
                                                    c.href,
                                                ),
                                        );
                                    if (idx >= 0)
                                        book.toc.push({
                                            title: label,
                                            ci: idx,
                                        });
                                }
                            });
                    }
                }
            }

            // Final fallback
            if (book.toc.length === 0) {
                book.toc = book.chapters.map((ch, i) => ({
                    title: ch.title,
                    ci: i,
                }));
            }

            buildTocUI();
            loadBookmarks();
            // Read before rendering: renderChapter saves the position it lands on
            const savedPos = loadReadingPosition();
            book.currentChapter = savedPos ? savedPos.ci : 0;
            book.currentPage = 0;

            // Show the reader before rendering: pagination measures the
            // viewport, which has zero size while hidden.
            uploadScreen.style.display = "none";
            bookWrapper.classList.add("active");

            renderChapter();
            if (savedPos) {
                book.currentPage = ratioToPage(savedPos.ratio);
                applyPageOffsets();
                updateReadingProgress();
            }

            requestAnimationFrame(() =>
                setTimeout(renderPaperTextures, 50),
            );
        } catch (err) {
            console.error("ePub loading error:", err);
            alert("Error loading ePub: " + err.message);
        } finally {
            loadingOverlay.classList.remove("active");
        }
    }

    function findFileInsensitive(zip, path) {
        const lower = path.toLowerCase();
        for (const key of Object.keys(zip.files)) {
            if (key.toLowerCase() === lower) return zip.files[key];
        }
        return null;
    }

    function buildTocUI() {
        tocList.innerHTML = "";
        book.toc.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "toc-item";
            div.textContent = item.title;
            div.addEventListener("click", () => {
                book.currentChapter = item.ci;
                book.currentPage = 0;
                renderChapter();
                toggleToc();
            });
            tocList.appendChild(div);
        });
    }
})();
