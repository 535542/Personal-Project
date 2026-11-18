(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const STORAGE = "fitfinder-closet-v3";

  const categories = ["Tops", "Bottoms", "Shoes", "Outerwear", "Accessories"];

  const emojis = {
    Tops: "👕",
    Bottoms: "👖",
    Shoes: "👟",
    Outerwear: "🧥",
    Accessories: "👜"
  };

  const demo = [
    { id: "d1", name: "Cloud Nine Hoodie", category: "Tops", color: "Cream", emoji: "🧥", bg: "#ded2bd", favorite: true, notes: "Soft and oversized" },
    { id: "d2", name: "Everyday Tee", category: "Tops", color: "White", emoji: "👕", bg: "#e9e7de", favorite: false, notes: "A simple everyday basic" },
    { id: "d3", name: "Baggy Blue Jeans", category: "Bottoms", color: "Blue", emoji: "👖", bg: "#c9d9e8", favorite: true, notes: "Relaxed fit" },
    { id: "d4", name: "Retro Sneakers", category: "Shoes", color: "White", emoji: "👟", bg: "#e9d9d3", favorite: false, notes: "Comfortable everyday shoes" },
    { id: "d5", name: "Rainy Day Jacket", category: "Outerwear", color: "Green", emoji: "🧥", bg: "#d4dfcc", favorite: false, notes: "A useful outer layer" },
    { id: "d6", name: "Shoulder Bag", category: "Accessories", color: "Brown", emoji: "👜", bg: "#e5d2bd", favorite: false, notes: "Finishing touch" }
  ];

  let items = [];

  try {
    const stored = localStorage.getItem(STORAGE);
    items = stored === null ? demo.map(x => ({ ...x })) : JSON.parse(stored);
    if (!Array.isArray(items)) items = [];
  } catch {
    items = demo.map(x => ({ ...x }));
  }

  let selectedPhoto = "";
  let deleteTarget = null;
  let lastOutfit = [];
  const SHOP_STORAGE = "fitfinder-shop-links-v1";
  let shopLinks = [];

  function isSafeAffiliateUrl(value) {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }

  try {
    const storedShopLinks = JSON.parse(localStorage.getItem(SHOP_STORAGE) || "[]");
    if (Array.isArray(storedShopLinks)) {
      shopLinks = storedShopLinks.filter(link =>
        link && typeof link.name === "string" && categories.includes(link.category) &&
        typeof link.url === "string" && isSafeAffiliateUrl(link.url)
      );
    }
  } catch {
    shopLinks = [];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
      return true;
    } catch {
      toast("Storage is full. Try smaller photos.");
      return false;
    }
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("visible"), 2600);
  }

  function id() {
    return crypto.randomUUID?.() || `item-${Date.now()}-${Math.random()}`;
  }

  function openDialog(selector) {
    const dialog = $(selector);
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeDialog(selector) {
    const dialog = $(selector);
    if (dialog?.open) dialog.close();
  }

  // Opening animation
  const intro = $("#intro");
  const enterButton = $("#enter-button");

  if (sessionStorage.getItem("fitfinder-intro-seen") === "yes") {
    intro.classList.add("intro-finished");
    $("#app").classList.add("app-ready");
  } else {
    setTimeout(() => intro.classList.add("intro-loaded"), 150);
  }

  enterButton.addEventListener("click", () => {
    sessionStorage.setItem("fitfinder-intro-seen", "yes");
    intro.classList.add("intro-exit");
    $("#app").classList.add("app-ready");
    setTimeout(() => intro.hidden = true, 1100);
  });

  $("#replay-intro").addEventListener("click", () => {
    sessionStorage.removeItem("fitfinder-intro-seen");
    location.reload();
  });

  // Navigation
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      const section = $("#" + button.dataset.go);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Show a handful of real closet pieces in the hero bubbles.
  function renderHeroBubbles() {
    const stage = $("#hero-bubbles");
    if (!stage) return;

    const featured = items.slice(0, 5);
    const signature = featured.map(item => `${item.id}:${item.name}:${item.photo ? "photo" : item.emoji}`).join("|");
    if (stage.dataset.signature === signature) return;
    stage.dataset.signature = signature;

    if (!featured.length) {
      stage.setAttribute("aria-label", "Your closet is empty. Add clothes to see them float here.");
      stage.innerHTML = `
        <div class="bubble-empty">
          <span>＋</span>
          <small>Add pieces to see them float here</small>
        </div>`;
      return;
    }

    stage.setAttribute("aria-label", `Floating preview of ${featured.map(item => item.name).join(", ")}`);
    stage.innerHTML = featured.map((item, index) => {
      const safePhoto = typeof item.photo === "string" &&
        /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);base64,/i.test(item.photo)
        ? `<img class="bubble-photo" src="${escapeHTML(item.photo)}" alt="">`
        : `<span class="bubble-emoji">${escapeHTML(item.emoji || emojis[item.category] || "✳")}</span>`;

      return `
        <div class="wardrobe-bubble bubble-${index + 1}" style="--bubble-index:${index}">
          ${safePhoto}
          <span class="bubble-item-name">${escapeHTML(item.name || "Closet piece")}</span>
        </div>`;
    }).join("");
  }

  // Wardrobe display
  function render() {
    const query = $("#search").value.trim().toLowerCase();
    const category = $("#category-filter").value;
    const favoritesOnly = $("#favorites-only").checked;

    const filtered = items.filter(item => {
      const matchesSearch = `${item.name} ${item.category} ${item.color} ${item.notes || ""}`
        .toLowerCase().includes(query);

      return matchesSearch &&
        (category === "All" || item.category === category) &&
        (!favoritesOnly || item.favorite);
    });

    $("#item-count").textContent = items.length;
    $("#favorite-count").textContent = items.filter(x => x.favorite).length;
    renderHeroBubbles();

    const grid = $("#item-grid");

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <span>✳</span>
          <h3>${items.length ? "Nothing found" : "Your closet is waiting"}</h3>
          <p>${items.length ? "Try another search or filter." : "Add a few pieces to start creating outfits."}</p>
          <button class="button button-dark" id="empty-add">＋ Add clothes</button>
        </div>`;

      $("#empty-add").addEventListener("click", () => openDialog("#add-dialog"));
      return;
    }

    grid.innerHTML = filtered.map((item, index) => `
      <article class="clothing-card" data-id="${escapeHTML(item.id)}"
        style="animation-delay:${Math.min(index * 45, 350)}ms">
        <div class="clothing-image" style="background:${item.bg || "#e9e5da"}">
          ${item.photo
            ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">`
            : `<span class="clothing-emoji">${escapeHTML(item.emoji || emojis[item.category] || "✳")}</span>`}
          <span class="category-tag">${escapeHTML(item.category)}</span>
          <button class="favorite-button" data-favorite="${escapeHTML(item.id)}"
            aria-label="Toggle favorite">${item.favorite ? "♥" : "♡"}</button>
        </div>
        <div class="clothing-info">
          <h3>${escapeHTML(item.name)}</h3>
          <p><span class="color-dot" style="background:${colorHex(item.color)}"></span>
          ${escapeHTML(item.color || "No colour")} <span>·</span> ${escapeHTML(item.category)}</p>
        </div>
      </article>`).join("");

    grid.querySelectorAll(".clothing-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest("[data-favorite]")) return;
                showDetails(card.dataset.id);
      });
    });

    grid.querySelectorAll("[data-favorite]").forEach(button => {
      button.addEventListener("click", e => {
        e.stopPropagation();

        const item = items.find(x => x.id === button.dataset.favorite);
        if (!item) return;

        item.favorite = !item.favorite;
        save();
        render();
        toast(item.favorite ? "Saved to favourites ♥" : "Removed from favourites");
      });
    });
  }

  function colorHex(color) {
    return ({
      Black: "#252525", White: "#f7f5ef", Cream: "#e6dac5",
      Grey: "#999999", Blue: "#6996c2", Green: "#78956b",
      Pink: "#eaa5b5", Red: "#ce4c4c", Brown: "#896247",
      Purple: "#a88cc9", Yellow: "#ead36e", Orange: "#e59c52",
      Multicolour: "linear-gradient(90deg,#e88,#edc,#8c9,#8ad)"
    })[color] || "#c9c4b9";
  }

  // Quick add: select multiple photos at once
  $("#open-add").addEventListener("click", () => openDialog("#add-dialog"));
  $("#hero-add").addEventListener("click", () => openDialog("#add-dialog"));
  $("#upload-more").addEventListener("click", () => openDialog("#add-dialog"));

  $("#bulk-photos").addEventListener("change", async event => {
    const area = $("#bulk-preview");
    const status = $("#bulk-status");
    const saveButton = $("#bulk-save");
    const files = Array.from(event.target.files || []);

    // Clear the previous selection so an invalid new selection cannot be added by mistake.
    area.innerHTML = "";
    status.textContent = "";
    saveButton.disabled = true;
    saveButton.onclick = null;

    if (!files.length) return;

    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      toast("Choose image files only.");
      event.target.value = "";
      return;
    }

    const tooLarge = imageFiles.filter(file => file.size > 3 * 1024 * 1024);
    if (tooLarge.length) {
      toast("Some photos are over 3 MB. Choose smaller images.");
      event.target.value = "";
      return;
    }

    area.innerHTML = `<p class="muted">Preparing ${imageFiles.length} photo(s)…</p>`;

    const photos = await Promise.all(imageFiles.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, data: reader.result });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    })));

    const goodPhotos = photos.filter(Boolean);

    area.innerHTML = goodPhotos.map((entry, i) => `
      <div class="bulk-photo">
        <img src="${entry.data}" alt="Selected clothing ${i + 1}">
        <span>${i + 1}</span>
      </div>`).join("");

    status.textContent = goodPhotos.length === imageFiles.length
      ? `${goodPhotos.length} photo(s) ready to add.`
      : `${goodPhotos.length} of ${imageFiles.length} photo(s) could be read.`;
    saveButton.disabled = goodPhotos.length === 0;
    saveButton.onclick = goodPhotos.length ? () => addBulkPhotos(goodPhotos) : null;
  });

  function guessCategory(filename) {
    const name = filename.toLowerCase();
    if (/shoe|sneaker|boot|trainer|sandal/.test(name)) return "Shoes";
    if (/jean|trouser|pant|short|skirt/.test(name)) return "Bottoms";
    if (/coat|jacket|hoodie|cardigan|puffer/.test(name)) return "Outerwear";
    if (/bag|hat|cap|belt|watch|scarf|glasses/.test(name)) return "Accessories";
    return "Tops";
  }

  async function detectPhotoColor(data) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, 1, 1);
          const [r, g, b] = context.getImageData(0, 0, 1, 1).data;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let color = "Multicolour";

          if (max < 55) color = "Black";
          else if (min > 220) color = "White";
          else if (max - min < 20) color = max > 180 ? "White" : "Grey";
          else if (r > g * 1.25 && r > b * 1.2) color = "Red";
          else if (g > r * 1.15 && g > b * 1.1) color = "Green";
          else if (b > r * 1.15 && b > g * 1.05) color = "Blue";
          else if (r > 180 && g > 130 && b < 120) color = "Yellow";
          else if (r > g * 1.1 && g > b * 1.1) color = "Brown";

          resolve(color);
        } catch {
          resolve("Multicolour");
        }
      };

      image.onerror = () => resolve("Multicolour");
      image.src = data;
    });
  }
    async function addBulkPhotos(photos) {
    const category = $("#bulk-category").value;

    const added = await Promise.all(photos.map(async ({ file, data }, index) => {
      const guessed = category === "Auto" ? guessCategory(file.name) : category;

      return {
        id: id(),
        name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || `New piece ${index + 1}`,
        category: guessed,
        color: await detectPhotoColor(data),
        notes: "",
        photo: data,
        emoji: emojis[guessed],
        bg: "#e9e4d8",
        favorite: false,
        createdAt: Date.now()
      };
    }));

    items.unshift(...added);

    if (!save()) {
      items.splice(0, added.length);
      return;
    }

    $("#bulk-photos").value = "";
    $("#bulk-preview").innerHTML = "";
    $("#bulk-status").textContent = "";
    $("#bulk-save").disabled = true;

    closeDialog("#add-dialog");
    render();
    toast(`${added.length} piece(s) added to your closet ✨`);
  }

  // Single item editor
  $("#single-form").addEventListener("submit", event => {
    event.preventDefault();

    const file = $("#single-photo").files?.[0];
    const name = $("#single-name").value.trim();

    if (!name) return;

    const createItem = photo => {
      const category = $("#single-category").value;

      items.unshift({
        id: id(),
        name,
        category,
        color: $("#single-color").value,
        notes: $("#single-notes").value.trim(),
        photo,
        emoji: emojis[category],
        bg: "#e9e4d8",
        favorite: false,
        createdAt: Date.now()
      });

      if (!save()) {
        items.shift();
        return;
      }

      $("#single-form").reset();
      closeDialog("#add-dialog");
      render();
      toast("Piece added to your closet ✨");
    };

    if (!file) {
      createItem("");
      return;
    }

    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      toast("Choose an image smaller than 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => createItem(reader.result);
    reader.readAsDataURL(file);
  });

  $("#show-single-form").addEventListener("click", () => {
    $("#single-form").hidden = !$("#single-form").hidden;
  });

  // Item details and custom delete confirmation
  function showDetails(itemId) {
    const item = items.find(x => x.id === itemId);
    if (!item) return;

    deleteTarget = itemId;

    $("#detail-content").innerHTML = `
      <div class="detail-image" style="background:${item.bg || "#e9e5da"}">
        ${item.photo
          ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">`
          : `<span>${escapeHTML(item.emoji || "✳")}</span>`}
      </div>
      <span class="eyebrow">${escapeHTML(item.category)} · ${escapeHTML(item.color)}</span>
      <p>${escapeHTML(item.notes || "A piece in your personal wardrobe.")}</p>
      <div class="detail-actions">
        <button class="button button-dark" id="detail-favorite">
          ${item.favorite ? "♥ Remove favourite" : "♡ Add favourite"}
        </button>
        <button class="button button-outline" id="detail-delete">Remove item</button>
      </div>`;

    $("#detail-favorite").onclick = () => {
      item.favorite = !item.favorite;
      save();
      closeDialog("#detail-dialog");
      render();
      toast(item.favorite ? "Added to favourites ♥" : "Removed from favourites");
    };

    $("#detail-delete").onclick = () => {
      $("#confirm-text").textContent = `Remove “${item.name}” from your wardrobe?`;
      openDialog("#confirm-dialog");
    };

    openDialog("#detail-dialog");
  }

  $("#confirm-cancel").addEventListener("click", () => {
    closeDialog("#confirm-dialog");
  });

  $("#confirm-yes").addEventListener("click", () => {
    if (!deleteTarget) return;

    items = items.filter(x => x.id !== deleteTarget);
    save();
    deleteTarget = null;

    closeDialog("#confirm-dialog");
    closeDialog("#detail-dialog");
    render();
    toast("Item removed");
  });

  function renderShopLinkManager() {
    const list = $("#shop-link-list");
    if (!list) return;

    list.innerHTML = shopLinks.length
      ? `<h3>Your shop links</h3><ul>${shopLinks.map(link => `
          <li>
            <span><strong>${escapeHTML(link.name)}</strong><small>${escapeHTML(link.category)}</small></span>
            <button type="button" class="text-button" data-remove-shop="${escapeHTML(link.id)}" aria-label="Remove ${escapeHTML(link.name)}">Remove</button>
          </li>`).join("")}</ul>`
      : `<p class="muted">No shop links added yet.</p>`;
  }

  function renderAffiliateRecommendations(outfit, missing) {
    const wanted = new Set(missing.length ? missing : outfit.map(item => item.category));
    const suggestions = shopLinks
      .filter(link => wanted.has(link.category) && isSafeAffiliateUrl(link.url))
      .slice(0, 3);

    if (!suggestions.length) return "";

    return `
      <section class="affiliate-recommendations" aria-label="Affiliate product recommendations">
        <div class="affiliate-heading">
          <div><span class="eyebrow">COMPLETE THE LOOK</span><h4>${missing.length ? "A few pieces to explore" : "More from these categories"}</h4></div>
        </div>
        <p class="affiliate-disclosure">Affiliate links: I may earn a commission if you buy through these links.</p>
        <div class="affiliate-grid">${suggestions.map(link => `
          <a class="affiliate-card" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHTML(link.category)}</span>
            <strong>${escapeHTML(link.name)}</strong>
            <small>Shop ↗</small>
          </a>`).join("")}</div>
      </section>`;
  }

  // Outfit of the Day
  function outfitScore(item, activity, weather, style) {
    let score = Math.random() * 2;
    const words = `${item.name} ${item.notes || ""}`.toLowerCase();

    const matches = {
      comfy: /soft|comfy|comfortable|relaxed|oversized|casual/,
      streetwear: /street|baggy|oversized|hoodie|sneaker|cargo|graphic/,
      minimal: /basic|classic|plain|simple|neutral|white|black/,
      playful: /bright|colour|color|print|graphic|statement|pink|red/
    };

    if (matches[style]?.test(words)) score += 4;
    if (activity === "sport" && /sport|running|training|sneaker|active/.test(words)) score += 4;
    if (activity === "party" && /smart|dress|statement|party|nice/.test(words)) score += 3;
    if (activity === "school" && /comfy|casual|basic|sneaker|hoodie/.test(words)) score += 2;
    if (weather === "cold" && /warm|wool|coat|jacket|hoodie|knit/.test(words)) score += 4;
    if (weather === "rainy" && /waterproof|rain|boot|jacket/.test(words)) score += 4;
    if (weather === "hot" && /light|linen|short|cotton|tee/.test(words)) score += 3;
    if (weather === "windy" && /jacket|coat|hoodie/.test(words)) score += 2;
    if (lastOutfit.includes(item.id)) score -= 1.5;

    return score;
  }

  function choose(category, used, activity, weather, style) {
    const pool = items
      .filter(item => item.category === category && !used.has(item.id))
      .sort((a, b) =>
        outfitScore(b, activity, weather, style) -
        outfitScore(a, activity, weather, style)
      );

    return pool[0] || null;
  }

  function generateOutfit() {
    if (!items.length) {
      $("#outfit-result").innerHTML =
        "<p>Add some clothes first and your stylist can build a look.</p>";
      return;
    }

    const activity = $("#activity").value;
    const weather = $("#weather").value;
    const style = $("#style-mood").value;

    const used = new Set();
    const outfit = [];
    const missing = [];

    for (const category of ["Tops", "Bottoms", "Shoes"]) {
      const item = choose(category, used, activity, weather, style);

      if (item) {
        outfit.push(item);
        used.add(item.id);
      } else {
        missing.push(category);
      }
    }

    if (["cold", "rainy", "windy"].includes(weather)) {
      const layer = choose("Outerwear", used, activity, weather, style);

      if (layer) {
        outfit.push(layer);
        used.add(layer.id);
      } else {
        missing.push("Outerwear");
      }
    } else if (Math.random() > 0.45) {
      const layer = choose("Outerwear", used, activity, weather, style);

      if (layer) {
        outfit.push(layer);
        used.add(layer.id);
      }
    }

    if (Math.random() > 0.35) {
      const accessory = choose("Accessories", used, activity, weather, style);
      if (accessory) outfit.push(accessory);
    }

    lastOutfit = outfit.map(item => item.id);

    const titles = {
      school: "Campus comfort",
      casual: "Everyday energy",
      sport: "Active mode",
      party: "Going-out mood",
      outdoor: "Out and about",
      home: "Off-duty"
    };

    const reasons = {
      cold: "You selected cold weather, so a layer helps.",
      mild: "A flexible outfit for mild weather.",
      hot: "You selected hot weather; choose breathable pieces.",
      rainy: "You selected rain; check that your outerwear and shoes are suitable.",
      windy: "You selected wind, so consider a wind-resistant layer."
    };

    $("#outfit-result").innerHTML = `
      <div class="outfit-output">
        <div class="outfit-heading">
          <span class="eyebrow">An outfit idea ✳</span>
          <h3>${escapeHTML(titles[activity] || "Your outfit")}</h3>
          <p>${outfit.length} pieces from your own wardrobe</p>
        </div>

        ${outfit.length
          ? `<div class="outfit-grid">${outfit.map(item => `
            <div class="outfit-piece">
              <div class="outfit-piece-image" style="background:${item.bg || "#e9e5da"}">
                ${item.photo
                  ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">`
                  : `<span>${escapeHTML(item.emoji || "✳")}</span>`}
              </div>
              <strong>${escapeHTML(item.name)}</strong>
              <small>${escapeHTML(item.category)} · ${escapeHTML(item.color)}</small>
            </div>
          `).join("")}</div>`
          : "<p>There are not enough clothing categories for a full outfit yet.</p>"}

        <p class="outfit-explanation">
          <strong>Why this works</strong><br>
          ${escapeHTML(reasons[weather])}
          ${missing.length ? ` Still missing: ${missing.join(", ")}.` : ""}
        </p>

        ${renderAffiliateRecommendations(outfit, missing)}

        <button class="button button-dark" id="try-again">
          ↻ Try another outfit
        </button>
      </div>`;

    $("#try-again").addEventListener("click", generateOutfit);
  }

  $("#outfit-form").addEventListener("submit", event => {
    event.preventDefault();
    generateOutfit();
  });

  $("#manage-shop-links").addEventListener("click", () => {
    renderShopLinkManager();
    openDialog("#shop-links-dialog");
  });

  $("#shop-link-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#shop-link-name").value.trim();
    const category = $("#shop-link-category").value;
    const url = $("#shop-link-url").value.trim();

    if (!name || !isSafeAffiliateUrl(url)) {
      toast("Enter a product name and a secure HTTPS affiliate link.");
      return;
    }

    shopLinks.unshift({ id: id(), name, category, url });
    try {
      localStorage.setItem(SHOP_STORAGE, JSON.stringify(shopLinks));
    } catch {
      shopLinks.shift();
      toast("Could not save this link in your browser.");
      return;
    }

    event.target.reset();
    renderShopLinkManager();
    toast("Shop link saved.");
  });

  $("#shop-link-list").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-shop]");
    if (!button) return;

    shopLinks = shopLinks.filter(link => link.id !== button.dataset.removeShop);
    try {
      localStorage.setItem(SHOP_STORAGE, JSON.stringify(shopLinks));
    } catch {
      toast("Could not update your shop links.");
      return;
    }
    renderShopLinkManager();
    toast("Shop link removed.");
  });

  // Filters and dialogs
  $("#search").addEventListener("input", render);
  $("#category-filter").addEventListener("change", render);
  $("#favorites-only").addEventListener("change", render);

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeDialog("#" + button.dataset.close);
    });
  });

  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  render();
  })();