/* ---------- 1. Grab elements ---------- */
const form = document.getElementById("search-form");
const input = document.getElementById("query");
const statusEl = document.getElementById("status");
const results = document.getElementById("results");
const btn = form.querySelector("button");

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbCap = document.getElementById("lightbox-caption");

const API = "https://commons.wikimedia.org/w/api.php";

/* ---------- 2. Fetch images from the API ---------- */
async function searchImages(term) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: term,
    gsrnamespace: 6,        // 6 = files/images
    gsrlimit: 20,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: 500,        // ask for a smaller thumbnail
    format: "json",
    origin: "*"             // allows requests from the browser
  });

  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();

  if (!data.query) return [];
  return Object.values(data.query.pages).sort((a, b) => a.index - b.index);
}

/* ---------- 3. Helper: author names arrive as HTML ---------- */
function stripHtml(html = "") {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent.trim();
}

/* ---------- 4. Lightbox ---------- */
function openLightbox(src, caption) {
  lbImg.src = src;
  lbCap.textContent = caption;
  lightbox.classList.add("open");
}
function closeLightbox() {
  lightbox.classList.remove("open");
}
lightbox.addEventListener("click", closeLightbox);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeLightbox();
});

/* ---------- 5. Loading skeletons ---------- */
function showSkeletons(n = 8) {
  results.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    results.append(s);
  }
}

/* ---------- 6. Build the cards ---------- */
function renderCards(pages) {
  results.innerHTML = "";
  let count = 0;

  pages.forEach(page => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return;   // skip non-image files

    const title = page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "");
    const artist = stripHtml(info.extmetadata?.Artist?.value) || "Unknown";

    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${count * 60}ms`;   // bounce in one by one

    // 3D tilt toward the mouse
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-8px) scale(1.03)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });

    const link = document.createElement("a");
    link.href = info.descriptionurl;
    link.addEventListener("click", e => {
      e.preventDefault();
      openLightbox(info.thumburl, `${title} — by ${artist}`);
    });

    const img = document.createElement("img");
    img.src = info.thumburl;
    img.alt = title;
    img.loading = "lazy";

    const infoBox = document.createElement("div");
    infoBox.className = "card-info";

    const h3 = document.createElement("h3");
    h3.textContent = title;

    const p = document.createElement("p");
    p.textContent = `by ${artist}`;

    infoBox.append(h3, p);
    link.append(img, infoBox);
    card.append(link);
    results.append(card);
    count++;
  });

  return count;
}

/* ---------- 7. Run a search ---------- */
async function doSearch(term) {
  statusEl.textContent = "Searching…";
  showSkeletons();
  try {
    const pages = await searchImages(term);
    const count = renderCards(pages);
    statusEl.textContent = count
      ? `Showing ${count} results for “${term}”.`
      : `No results for “${term}”.`;
  } catch (err) {
    results.innerHTML = "";
    statusEl.textContent = "Something went wrong. Please try again.";
    console.error(err);
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const term = input.value.trim();
  if (term) doSearch(term);
});

/* ---------- 8. Button ripple ---------- */
btn.addEventListener("click", e => {
  const r = document.createElement("span");
  r.className = "ripple";
  const rect = btn.getBoundingClientRect();
  r.style.left = `${e.clientX - rect.left}px`;
  r.style.top = `${e.clientY - rect.top}px`;
  btn.append(r);
  setTimeout(() => r.remove(), 600);
});

/* ---------- 9. Cursor glow ---------- */
const glow = document.createElement("div");
glow.className = "cursor-glow";
document.body.append(glow);

document.addEventListener("mousemove", e => {
  glow.style.left = `${e.clientX}px`;
  glow.style.top = `${e.clientY}px`;
});

/* ---------- 10. Typing placeholder ---------- */
const hints = ["sunflowers", "cats", "ocean", "Monet", "mountains", "Van Gogh"];
let hintIndex = 0, charIndex = 0, deleting = false;

function typePlaceholder() {
  const word = hints[hintIndex];
  charIndex += deleting ? -1 : 1;
  input.placeholder = "Try: " + word.slice(0, charIndex);

  let delay = deleting ? 50 : 100;
  if (!deleting && charIndex === word.length) {
    deleting = true;
    delay = 1200;                       // pause when the word is complete
  } else if (deleting && charIndex === 0) {
    deleting = false;
    hintIndex = (hintIndex + 1) % hints.length;
    delay = 400;
  }
  setTimeout(typePlaceholder, delay);
}
typePlaceholder();

/* ---------- 11. First load ---------- */
doSearch("cats");