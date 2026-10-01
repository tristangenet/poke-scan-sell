(() => {
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const createPage = () => /^\/items\/new\/?$/.test(location.pathname);
  const visible = (el) => el && el.getClientRects().length > 0 && !el.disabled;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let running = false,
    completed = false,
    panel,
    lastURL = location.href;
  const aliases = {
    title: ["title", "item_title"],
    description: ["description", "item_description"],
    price: ["price", "item_price"],
    category: ["catalog_id", "category", "item_catalog_id"],
    condition: ["status_id", "condition", "item_status_id"],
  };
  const labels = {
    title: ["titre", "titredelannonce", "title"],
    description: [
      "description",
      "decris ton article",
      "describe your item",
    ].map(normalize),
    price: ["prix", "prixeur", "price", "priceeur"],
    category: ["categorie", "category"],
    condition: ["etat", "condition"],
  };
  function request(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError || !response?.ok)
          reject(
            new Error(
              response?.error ||
                "L’extension ne répond plus. Relancez le transfert depuis Poke Scan Sell.",
            ),
          );
        else resolve(response);
      });
    });
  }
  function field(name) {
    const candidates = [
      ...document.querySelectorAll(
        "input, textarea, select, [role=combobox], button[aria-haspopup]",
      ),
    ];
    const editable = (el) =>
      visible(el) &&
      (name === "category" ||
        name === "condition" ||
        (["INPUT", "TEXTAREA"].includes(el.tagName) && !el.readOnly)) &&
      !["hidden", "file", "password", "checkbox", "radio", "submit"].includes(
        el.type,
      );
    const direct = candidates.filter(
      (el) =>
        editable(el) &&
        aliases[name].some(
          (key) =>
            el.id === key ||
            el.name === key ||
            el.getAttribute("data-testid") === `${key}--input`,
        ),
    );
    if (direct.length === 1) return direct[0];
    const semantic = candidates.filter(
      (el) =>
        editable(el) &&
        labels[name].includes(
          normalize(
            [
              el.getAttribute("aria-label"),
              ...[...(el.labels || [])].map((label) => label.textContent),
              el
                .getAttribute("aria-labelledby")
                ?.split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent)
                .join(" "),
            ].find((text) => text?.trim()) || "",
          ),
        ),
    );
    return semantic.length === 1 ? semantic[0] : null;
  }
  function setValue(el, value) {
    const prototype =
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : el.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function ensurePanel() {
    if (panel) return panel;
    const host = document.createElement("div");
    host.id = "poke-scan-sell-helper";
    host.style.cssText =
      "all:initial;position:fixed;bottom:16px;right:16px;width:320px;max-width:calc(100vw - 32px);z-index:2147483647";
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent =
      ":host{color:#173d2d;font:14px/1.5 system-ui,sans-serif}.box{background:#f6f8ee;border:1px solid #c6d4bc;border-radius:14px;padding:16px;box-shadow:0 4px 30px #0002}strong{display:block;font-size:15px}p{margin:10px 0;white-space:pre-line}button{background:#194c3b;color:white;border:0;border-radius:7px;padding:8px 12px;cursor:pointer;font:inherit}.close{background:transparent;color:#34594b;float:right;padding:0 4px}.retry{display:none}";
    const box = document.createElement("section");
    box.className = "box";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Masquer l’aide Poke Scan Sell");
    close.addEventListener("click", () => {
      host.hidden = true;
    });
    const title = document.createElement("strong");
    title.textContent = "Poke Scan Sell → Vinted";
    const text = document.createElement("p");
    text.setAttribute("role", "status");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry";
    retry.textContent = "Reprendre le remplissage";
    retry.addEventListener("click", () => {
      completed = false;
      start();
    });
    box.append(close, title, text, retry);
    root.append(style, box);
    document.documentElement.append(host);
    panel = { host, text, retry };
    return panel;
  }
  function show(text, retry = false) {
    const p = ensurePanel();
    p.host.hidden = false;
    p.text.textContent = text;
    p.retry.style.display = retry ? "inline-block" : "none";
  }
  function waitFor(check, timeout = 18000) {
    const current = check();
    if (current) return Promise.resolve(current);
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const value = check();
        if (value) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(value);
        }
      });
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    });
  }
  const numeric = (value) =>
    Number(
      String(value)
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, ""),
    );
  function same(el, name, draft) {
    return name === "price"
      ? numeric(el.value) === draft.price
      : el.value.trim() === draft[name];
  }
  function photoInput() {
    const inputs = [...document.querySelectorAll('input[type="file"]')].filter(
      (el) =>
        !el.disabled &&
        (!el.accept || /image|\.jpe?g|\.png|\.webp/i.test(el.accept)),
    );
    return (
      inputs.find((el) => el.multiple) ||
      (inputs.length === 1 ? inputs[0] : null)
    );
  }
  function hasExistingPhotos() {
    return (
      (photoInput()?.files.length || 0) > 0 ||
      !!document.querySelector(
        '[data-testid*="uploaded-photo"], [data-testid*="photo-preview"], .photos-uploader__photo',
      )
    );
  }
  function optionName(el) {
    return normalize(
      el.getAttribute("aria-label") ||
        el.getAttribute("data-label") ||
        el.textContent.trim().split("\n")[0],
    );
  }
  function selectedName(el) {
    return normalize(
      el.tagName === "SELECT"
        ? el.selectedOptions[0]?.textContent
        : el.value || el.textContent,
    );
  }
  async function choose(name, choices, parents = []) {
    let control = field(name);
    if (!control) return false;
    const wanted = choices.map(normalize);
    if (wanted.includes(selectedName(control))) return true;
    if (control.tagName === "SELECT") {
      const option = wanted
        .map((name) =>
          [...control.options].filter((o) => name === normalize(o.textContent)),
        )
        .find((matches) => matches.length === 1)?.[0];
      if (!option) return false;
      setValue(control, option.value);
      await delay(100);
      return wanted.includes(selectedName(field(name) || control));
    }
    // Only the identified category/state selector and visible matching options are clicked.
    control.click();
    const choice = () => {
      const options = [
        ...document.querySelectorAll(
          '[role="option"], [role="menuitem"], button[type="button"], label',
        ),
      ].filter(
        (el) =>
          visible(el) &&
          (el.tagName !== "LABEL" || el.querySelector('input[type="radio"]')),
      );
      for (const group of [choices, ...parents]) {
        for (const name of group.map(normalize)) {
          const matches = options.filter((el) => name === optionName(el));
          if (matches.length === 1)
            return { el: matches[0], final: group === choices };
        }
      }
      return null;
    };
    for (let step = 0; step < 4; step++) {
      const found = await waitFor(choice, 1500);
      if (!found) break;
      found.el.click();
      await delay(120);
      if (found.final)
        return wanted.includes(selectedName(field(name) || control));
    }
    // Close an unrecognised selector without selecting an unrelated value.
    const current = field(name);
    if (current)
      current.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }),
      );
    return false;
  }
  async function sendPhotos(id, photos) {
    const input = photoInput();
    if (!input || (!input.multiple && photos.length > 1)) return false;
    const transfer = new DataTransfer();
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const allowed = input.accept.toLowerCase();
      const ext =
        photo.type === "image/jpeg"
          ? "jpg"
          : photo.type === "image/webp"
            ? "webp"
            : "png";
      if (
        allowed &&
        !allowed.includes("image/*") &&
        !allowed.includes(photo.type) &&
        !allowed.includes(`.${ext}`) &&
        !(ext === "jpg" && allowed.includes(".jpeg"))
      )
        return false;
      const response = await request({ type: "read-photo", id, index: i });
      const encoded = response.data.split(",")[1];
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      transfer.items.add(
        new File([bytes], `${i + 1}-${photo.side}.${ext}`, {
          type: photo.type,
        }),
      );
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  async function start() {
    if (running || completed) return;
    running = true;
    try {
      const response = await request({ type: "read-draft" });
      if (response.waitingForLogin) {
        show(
          "Votre annonce attend dans ce navigateur. Connectez-vous à Vinted : le remplissage reprendra sur la page de création.",
        );
        return;
      }
      if (!response.draft) {
        if (response.result)
          show(
            "Le transfert a déjà été effectué. Vérifiez les champs et les photos de votre annonce avant de publier.",
          );
        completed = true;
        return;
      }
      if (!createPage()) return;
      const { id, draft, previous } = response;
      show("Chargement du formulaire et remplissage de votre annonce…");
      const form = await waitFor(
        () => field("title") && field("description") && field("price"),
      );
      if (!form) {
        show(
          "Le formulaire n’est pas encore disponible. Ouvrez la page de création de Vinted, puis reprenez le remplissage.",
          true,
        );
        await request({
          type: "report",
          id,
          status: "blocked",
          fields: [],
          missing: ["title", "description", "price", "photos"],
        });
        completed = true;
        return;
      }
      const conflict = ["title", "description", "price"].some(
        (name) =>
          field(name).value.trim() &&
          !(name === "price" && numeric(field(name).value) === 0) &&
          !same(field(name), name, draft),
      );
      if (conflict || (hasExistingPhotos() && !previous?.photosSubmitted)) {
        show(
          "Un autre brouillon est présent sur Vinted. Videz ses champs et ses photos, puis reprenez le remplissage de cette carte.",
          true,
        );
        await request({
          type: "report",
          id,
          status: "blocked",
          fields: [],
          missing: ["title", "description", "price", "photos"],
          photosSubmitted: previous?.photosSubmitted === true,
        });
        completed = true;
        return;
      }
      const filled = [],
        missing = [];
      for (const name of ["title", "description", "price"]) {
        const input = field(name);
        const value =
          name === "price"
            ? draft.price
                .toFixed(2)
                .replace(".", input.type === "number" ? "." : ",")
            : draft[name];
        if (input.maxLength > 0 && value.length > input.maxLength) {
          missing.push(name);
          continue;
        }
        setValue(input, value);
        await delay(120);
        if (field(name) && same(field(name), name, draft)) filled.push(name);
        else missing.push(name);
      }
      if (
        await choose(
          "category",
          ["Cartes Pokémon", "Cartes à collectionner", "Trading cards"],
          [
            ["Loisirs et collections", "Entertainment"],
            ["Collections", "Collection", "Jeux", "Collectibles"],
          ],
        )
      )
        filled.push("category");
      else missing.push("category");
      const states = ["M", "NM", "EX"].includes(draft.condition)
        ? ["Très bon état", "Very good"]
        : draft.condition === "GD"
          ? ["Bon état", "Good"]
          : ["Satisfaisant", "État correct", "Satisfactory"];
      if (draft.condition && (await choose("condition", states)))
        filled.push("condition");
      else missing.push("condition");
      let photosSubmitted = previous?.photosSubmitted === true;
      if (!photosSubmitted) {
        show("Transfert des photos originales…");
        photosSubmitted = await sendPhotos(id, draft.photos);
      }
      if (!photosSubmitted) missing.push("photos");
      missing.push("parcel");
      const coreComplete =
        ["title", "description", "price"].every((name) =>
          filled.includes(name),
        ) && photosSubmitted;
      await request({
        type: "report",
        id,
        status: coreComplete ? "filled" : "partial",
        fields: filled,
        missing,
        photosSubmitted,
      });
      const names = {
        title: "titre",
        description: "description",
        price: "prix",
        photos: "photos",
        category: "catégorie",
        condition: "état",
        parcel: "format du colis",
      };
      show(
        `${coreComplete ? "Titre, description et prix remplis. Photos transmises au formulaire." : "Transfert partiel : certains champs n’ont pas accepté les données."}\nÀ vérifier ou compléter : ${missing.map((name) => names[name]).join(", ")}.\nVérifiez le résultat des photos et cliquez sur Publier quand votre annonce est prête.`,
        !coreComplete,
      );
      completed = true;
    } catch (e) {
      show(
        e.message ||
          "Le remplissage a été interrompu. Relancez le transfert depuis l’application.",
        true,
      );
      completed = true;
    } finally {
      running = false;
    }
  }
  new MutationObserver(() => {
    if (lastURL !== location.href) {
      lastURL = location.href;
      completed = false;
      start();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  start();
})();
