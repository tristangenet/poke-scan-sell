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
  const version = "0.2.8";
  const core = ["title", "description", "price"];
  const names = {
    title: "titre",
    description: "description",
    price: "prix",
    photos: "photos",
    category: "catégorie",
    condition: "état",
    parcel: "format du colis",
  };
  const controls =
    'input, textarea, select, [contenteditable="true"][role="textbox"], [role="combobox"], button[type="button"], button[aria-haspopup], [role="button"]';
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
    price: ["prix", "prixeur", "price", "priceeur", "montant"],
    category: ["categorie", "category"],
    condition: ["etat", "condition"],
  };
  const log = (stage, details = {}) =>
    console.info("[poke-scan-sell:vinted]", { version, stage, ...details });
  function request(message, timeout = 15000) {
    log("message:start", { type: message.type, index: message.index });
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        log(error ? "message:failed" : "message:done", { type: message.type });
        if (error) reject(error);
        else resolve(response);
      };
      const timer = setTimeout(
        () =>
          finish(
            new Error(
              "L’extension ne répond plus. Rechargez-la dans chrome://extensions ou edge://extensions, puis relancez le transfert depuis l’application.",
            ),
          ),
        timeout,
      );
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const error = chrome.runtime.lastError || !response?.ok;
          finish(
            error
              ? new Error(
                  response?.error ||
                    "L’extension a été rechargée ou déconnectée. Relancez le transfert depuis l’application.",
                )
              : null,
            response,
          );
        });
      } catch (e) {
        finish(e);
      }
    });
  }
  function editable(el, name) {
    return (
      visible(el) &&
      !el.closest('header, nav, [role="search"]') &&
      el.getAttribute("aria-disabled") !== "true" &&
      (name === "category" ||
        name === "condition" ||
        ((["INPUT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable) &&
          !el.readOnly)) &&
      ![
        "hidden",
        "file",
        "password",
        "checkbox",
        "radio",
        "submit",
        "search",
        "email",
        "tel",
      ].includes(el.type)
    );
  }
  function identifier(text, name) {
    const key = normalize(text);
    return aliases[name].some((alias) => {
      const base = normalize(alias).replace(/^item/, "");
      const suffix =
        name === "price"
          ? "(?:input|field|textbox|textarea){0,2}"
          : "(?:input|field|textarea|textbox|dropdown|select)?";
      return new RegExp(
        `^(?:input|textarea)?(?:itemupload|item|upload|listing|sell)?${base}${suffix}$`,
      ).test(key);
    });
  }
  function labelMatches(text, name) {
    const key = normalize(text);
    return labels[name].some(
      (label) =>
        key === label ||
        (label.length >= 4 &&
          key.startsWith(label) &&
          key.length <= label.length + 80),
    );
  }
  function score(el, name) {
    if (!editable(el, name)) return 0;
    let rank = [el.id, el.name, el.getAttribute("data-testid")].some((text) =>
      identifier(text, name),
    )
      ? 100
      : 0;
    const associated = [
      el.getAttribute("aria-label"),
      ...[...(el.labels || [])].map((label) => label.textContent),
      ...(el.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent),
    ];
    if (associated.some((text) => labelMatches(text, name))) rank += 90;
    // Vinted can put its test id or label on a wrapper rather than the input.
    // Only a wrapper with a single eligible control can identify that control.
    for (
      let parent = el.parentElement, depth = 0;
      parent && depth < 4;
      parent = parent.parentElement, depth++
    ) {
      const siblings = [...parent.querySelectorAll(controls)].filter((c) =>
        editable(c, name),
      );
      if (siblings.length !== 1) break;
      if (identifier(parent.getAttribute("data-testid"), name))
        rank = Math.max(rank, 80);
      if (
        [
          ...parent.querySelectorAll(
            name === "price"
              ? 'label, legend, h2, h3, h4, [role="heading"]'
              : "label, legend",
          ),
        ].some((label) => labelMatches(label.textContent, name))
      )
        rank = Math.max(rank, 70);
    }
    if (labelMatches(el.getAttribute("placeholder"), name))
      rank = Math.max(rank, 40);
    if (
      name === "price" &&
      (["decimal", "numeric"].includes(el.inputMode) || el.type === "number") &&
      /^\s*0[.,]00\s*(?:€|EUR)?\s*$/i.test(el.getAttribute("placeholder") || "")
    )
      rank = Math.max(rank, 35);
    return rank;
  }
  function field(name) {
    const ranked = [...document.querySelectorAll(controls)]
      .map((el) => {
        const rank = score(el, name);
        const other = Object.keys(aliases).some(
          (key) => key !== name && score(el, key) >= rank,
        );
        return { el, rank: other ? 0 : rank };
      })
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => b.rank - a.rank);
    return ranked.length && ranked[0].rank !== ranked[1]?.rank
      ? ranked[0].el
      : null;
  }
  const valueOf = (el) =>
    String(el.isContentEditable ? el.textContent : el.value || "");
  function priceValid(el) {
    return (
      el &&
      el.validity?.valid !== false &&
      el.getAttribute("aria-invalid") !== "true"
    );
  }
  function priceFormats(el, amount) {
    const dot = amount.toFixed(2),
      comma = dot.replace(".", ",");
    if (el.type === "number") return [dot];
    const hint = (el.getAttribute("placeholder") || "").match(
      /[.,]\d{1,2}/,
    )?.[0][0];
    const pattern = el.getAttribute("pattern") || "";
    const dotOnly = pattern.includes("\\.") && !pattern.includes(",");
    const preferComma = !dotOnly && hint === ",";
    return preferComma ? [comma, dot] : [dot, comma];
  }
  function diagnostic(stage) {
    const attribute = (el, key) => {
      const value = el.getAttribute(key) || "";
      return /^[a-zA-Z_][a-zA-Z0-9_:\[\].-]{0,99}$/.test(value) ? value : "";
    };
    return {
      version,
      stage,
      page: createPage() ? "/items/new" : "connexion ou autre page",
      found: Object.fromEntries(
        Object.keys(aliases).map((name) => [name, !!field(name)]),
      ),
      photoInput: !!photoInput(),
      controls: [...document.querySelectorAll(controls)]
        .filter((el) => core.some((name) => editable(el, name)))
        .slice(0, 30)
        .map((el) => ({
          tag: el.tagName,
          type: el.type || el.getAttribute("role") || "",
          id: attribute(el, "id"),
          name: attribute(el, "name"),
          testId: attribute(el, "data-testid"),
          inputMode: el.inputMode || "",
          valid: el.validity?.valid !== false,
          ariaInvalid: el.getAttribute("aria-invalid") === "true",
          patternMismatch: el.validity?.patternMismatch === true,
          stepMismatch: el.validity?.stepMismatch === true,
        })),
    };
  }
  function setValue(el, value) {
    el.focus({ preventScroll: true });
    if (el.isContentEditable) el.textContent = value;
    else {
      const prototype =
        el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : el.tagName === "SELECT"
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, value);
    }
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: String(value),
      }),
    );
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }
  async function fillPrice(input, amount) {
    const original = valueOf(input);
    let userEdited = false;
    const onInput = (event) => {
      if (
        event.isTrusted &&
        (event.target === input || event.target === field("price"))
      )
        userEdited = true;
    };
    document.addEventListener("input", onInput, true);
    try {
      for (const format of priceFormats(input, amount)) {
        if (userEdited) return { accepted: false, reason: "user-edit" };
        const current = field("price");
        if (!current) return { accepted: false, reason: "not-found" };
        const value = current.type === "number" ? amount.toFixed(2) : format;
        if (current.maxLength > 0 && value.length > current.maxLength) continue;
        show("Saisie et validation du prix…");
        setValue(current, value);
        // Allow controlled currency inputs to normalize and validate on blur.
        await delay(300);
        if (userEdited) return { accepted: false, reason: "user-edit" };
        const actual = field("price");
        const accepted =
          actual && numeric(valueOf(actual)) === amount && priceValid(actual);
        log("price:checked", {
          separator: value.includes(",") ? "comma" : "dot",
          accepted: !!accepted,
          valid: !!priceValid(actual),
        });
        if (accepted) return { accepted: true, reason: "" };
      }
      // Restore the prior value if both formats were refused or changed the amount.
      // A real user edit is never replaced by a retry or this restoration.
      const current = field("price");
      if (!userEdited && current) setValue(current, original);
      return { accepted: false, reason: "rejected" };
    } finally {
      document.removeEventListener("input", onInput, true);
    }
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
    title.textContent = `Poke Scan Sell → Vinted · v${version}`;
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
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copier le diagnostic";
    copy.style.cssText = "display:none;margin-top:8px";
    const details = document.createElement("textarea");
    details.readOnly = true;
    details.hidden = true;
    details.setAttribute(
      "aria-label",
      "Diagnostic technique sans contenu de l’annonce",
    );
    details.style.cssText =
      "width:100%;height:100px;margin-top:8px;box-sizing:border-box";
    copy.addEventListener("click", async () => {
      const report = JSON.stringify(diagnostic("diagnostic"), null, 2);
      try {
        await navigator.clipboard.writeText(report);
        copy.textContent = "Diagnostic copié";
      } catch {
        details.value = report;
        details.hidden = false;
        details.select();
      }
    });
    box.append(close, title, text, retry, copy, details);
    root.append(style, box);
    document.documentElement.append(host);
    panel = { host, text, retry, copy };
    return panel;
  }
  function show(text, retry = false) {
    const p = ensurePanel();
    p.host.hidden = false;
    if (p.text.textContent !== text) p.text.textContent = text;
    p.retry.style.display = retry ? "inline-block" : "none";
    p.copy.style.display = retry ? "inline-block" : "none";
  }
  function waitFor(check, timeout = 18000) {
    return new Promise((resolve, reject) => {
      const finish = (value, error) => {
        clearTimeout(timer);
        clearInterval(poll);
        observer.disconnect();
        if (error) reject(error);
        else resolve(value);
      };
      const inspect = () => {
        try {
          const value = check();
          if (value) finish(value);
        } catch (e) {
          finish(null, e);
        }
      };
      const observer = new MutationObserver(inspect);
      const timer = setTimeout(() => finish(null), timeout);
      // Some form state (readOnly/disabled/layout) changes without child mutations.
      const poll = setInterval(inspect, 250);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      inspect();
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
      ? numeric(valueOf(el)) === draft.price && priceValid(el)
      : valueOf(el).trim() === draft[name];
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
    log("photos:start", { count: photos.length });
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
      show(`Transfert de la photo ${i + 1} sur ${photos.length}…`);
      const response = await request(
        { type: "read-photo", id, index: i },
        30000,
      );
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
    log("photos:submitted", { count: photos.length });
    return true;
  }
  async function start() {
    if (running || completed) return;
    running = true;
    const attemptURL = location.href;
    let transfer;
    try {
      log("transfer:start");
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
      transfer = {
        id,
        fields: [],
        photosSubmitted: previous?.photosSubmitted === true,
      };
      show("Recherche des champs du formulaire Vinted…");
      log("form:waiting", diagnostic("waiting"));
      // Do not gate every field and the photo upload on finding all three inputs.
      // Photos can unlock inputs, and React can mount individual sections later.
      const form = await waitFor(
        () => !createPage() || core.some((name) => field(name)) || photoInput(),
        20000,
      );
      if (!createPage()) return;
      if (!form) {
        show(
          "Aucun champ ni sélecteur de photos n’a été reconnu après 20 secondes. Vérifiez que la page « Vends ton article » est ouverte, puis reprenez le remplissage. Le diagnostic permet d’adapter les repères du formulaire.",
          true,
        );
        log("form:not-found", diagnostic("not-found"));
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
      const states = ["M", "NM", "EX"].includes(draft.condition)
        ? ["Très bon état", "Very good"]
        : draft.condition === "GD"
          ? ["Bon état", "Good"]
          : ["Satisfaisant", "État correct", "Satisfactory"];
      let photosAttempted = transfer.photosSubmitted;
      const chosen = new Set(),
        attempted = new Set(),
        writes = new Map();
      let priceIssue = "";
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (!createPage()) return;
        const conflict = core.some((name) => {
          const input = field(name);
          return (
            input &&
            valueOf(input).trim() &&
            !(name === "price" && numeric(valueOf(input)) === 0) &&
            !(name === "price"
              ? numeric(valueOf(input)) === draft.price
              : same(input, name, draft))
          );
        });
        if (conflict || (hasExistingPhotos() && !transfer.photosSubmitted)) {
          show(
            "Un autre brouillon est présent sur Vinted. Ses informations sont conservées. Videz ses champs et ses photos, puis reprenez le remplissage de cette carte.",
            true,
          );
          await request({
            type: "report",
            id,
            status: "blocked",
            fields: transfer.fields,
            missing: [...core, "photos"],
            photosSubmitted: transfer.photosSubmitted,
          });
          log("form:conflict");
          completed = true;
          return;
        }
        for (const name of core) {
          const input = field(name);
          if (!input || same(input, name, draft)) continue;
          const last = writes.get(name);
          if (last?.el === input && last.count >= 3) continue;
          if (name === "price") {
            const result = await fillPrice(input, draft.price);
            priceIssue = result.reason;
            writes.set(name, {
              el: field("price") || input,
              count: result.accepted ? 1 : 3,
            });
            continue;
          }
          const value = draft[name];
          if (input.maxLength > 0 && value.length > input.maxLength) {
            writes.set(name, { el: input, count: 3 });
            continue;
          }
          show(`Remplissage : ${names[name]}…`);
          setValue(input, value);
          writes.set(name, {
            el: input,
            count: (last?.el === input ? last.count : 0) + 1,
          });
          await delay(120);
          log("field:checked", {
            field: name,
            accepted: !!field(name) && same(field(name), name, draft),
          });
        }
        transfer.fields = core.filter(
          (name) => field(name) && same(field(name), name, draft),
        );
        if (!photosAttempted && photoInput()) {
          photosAttempted = true;
          transfer.photosSubmitted = await sendPhotos(id, draft.photos);
          // Keep this checkpoint across reloads and retries even if a later field fails.
          if (transfer.photosSubmitted)
            await request({ type: "photos-submitted", id });
        }
        if (!attempted.has("category") && field("category")) {
          attempted.add("category");
          show("Sélection de la catégorie de cartes…");
          log("category:start");
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
            chosen.add("category");
          log("category:done", { selected: chosen.has("category") });
        }
        if (!attempted.has("condition") && field("condition")) {
          attempted.add("condition");
          log("condition:start");
          if (draft.condition && (await choose("condition", states)))
            chosen.add("condition");
          log("condition:done", { selected: chosen.has("condition") });
        }
        // Recheck values after photos/category events: Vinted can rerender inputs.
        transfer.fields = core.filter(
          (name) => field(name) && same(field(name), name, draft),
        );
        const pending = core.filter((name) => !transfer.fields.includes(name));
        const rejected = pending.every((name) => writes.get(name)?.count >= 3);
        if ((!pending.length || rejected) && photosAttempted) break;
        const waiting = [...pending, ...(!photosAttempted ? ["photos"] : [])];
        show(
          `${transfer.fields.length ? `Champs remplis : ${transfer.fields.map((name) => names[name]).join(", ")}.\n` : ""}Attente du formulaire : ${waiting.map((name) => names[name]).join(", ")}…`,
        );
        await delay(250);
      }
      if (!createPage()) return;
      const filled = [...transfer.fields, ...chosen];
      const missing = [...core, "category", "condition"].filter(
        (name) => !filled.includes(name),
      );
      const photosSubmitted = transfer.photosSubmitted;
      if (!photosSubmitted) missing.push("photos");
      missing.push("parcel");
      const coreComplete =
        ["title", "description", "price"].every((name) =>
          filled.includes(name),
        ) && photosSubmitted;
      const priceExplanation = filled.includes("price")
        ? ""
        : priceIssue === "user-edit"
          ? "Prix : votre saisie dans Vinted a été conservée."
          : priceIssue === "not-found" || !field("price")
            ? "Prix : champ non reconnu ou encore désactivé."
            : "Prix : le formulaire a refusé le montant exact. Aucun prix transformé n’est validé.";
      await request({
        type: "report",
        id,
        status: coreComplete ? "filled" : "partial",
        fields: filled,
        missing,
        photosSubmitted,
      });
      log("transfer:done", {
        status: coreComplete ? "filled" : "partial",
        fields: filled,
        missing,
      });
      if (!coreComplete) log("form:partial", diagnostic("partial"));
      show(
        `${coreComplete ? "Titre, description et prix remplis. Photos transmises au formulaire." : "Transfert partiel : les champs disponibles ont été remplis. Un champ absent, ambigu ou refusé est signalé ci-dessous."}${priceExplanation ? `\n${priceExplanation}` : ""}\nÀ vérifier ou compléter : ${missing.map((name) => names[name]).join(", ")}.\nVérifiez le résultat des photos et cliquez sur Publier quand votre annonce est prête.`,
        !coreComplete,
      );
      completed = true;
    } catch (e) {
      log("transfer:failed", diagnostic("failed"));
      show(
        e.message ||
          "Le remplissage a été interrompu. Relancez le transfert depuis l’application.",
        true,
      );
      if (transfer && createPage())
        await request(
          {
            type: "report",
            id: transfer.id,
            status:
              transfer.fields.length || transfer.photosSubmitted
                ? "partial"
                : "blocked",
            fields: transfer.fields,
            photosSubmitted: transfer.photosSubmitted,
            missing: [
              ...core.filter((name) => !transfer.fields.includes(name)),
              ...(!transfer.photosSubmitted ? ["photos"] : []),
              "category",
              "condition",
              "parcel",
            ],
          },
          5000,
        ).catch(() => {});
      completed = true;
    } finally {
      running = false;
      if (attemptURL !== location.href) {
        completed = false;
        start();
      }
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
