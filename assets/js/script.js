/* ==========================================================================
   InvoiceForge — script.js
   Vanilla JavaScript, no dependencies. All state lives in one object and is
   persisted to localStorage:
     - invoiceforge.profile   → the business profile (survives "New Invoice")
     - invoiceforge.draft     → the invoice currently being edited
     - invoiceforge.invoices  → array of saved invoices
     - invoiceforge.counter   → last used invoice number (auto-increment)
     - invoiceforge.theme     → "light" | "dark"
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- Constants & helpers ---------------- */
  var LS = {
    profile: "invoiceforge.profile",
    draft: "invoiceforge.draft",
    invoices: "invoiceforge.invoices",
    counter: "invoiceforge.counter",
    theme: "invoiceforge.theme"
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }
  function uid() {
    return "inv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Safely coerce any input to a non-negative number. NaN becomes 0 so the
     totals can never display "NaN" — they show 0.00 instead. */
  function toNum(value) {
    var n = parseFloat(value);
    if (isNaN(n) || !isFinite(n)) return 0;
    return n < 0 ? 0 : n;
  }
  function clampPercent(value) {
    var n = toNum(value);
    return n > 100 ? 100 : n;
  }
  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return s;
  }
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function addDaysISO(iso, days) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) d = new Date();
    d.setDate(d.getDate() + days);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  /* Money formatting via Intl.NumberFormat for correct currency symbols.
     Falls back to "CODE 0.00" if a currency is somehow unsupported. */
  function formatMoney(amount, currency) {
    var safe = isFinite(amount) ? amount : 0;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(safe);
    } catch (e) {
      return (currency || "USD") + " " + safe.toFixed(2);
    }
  }

  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* Storage full/blocked — the app keeps working in-memory. */
    }
  }

  /* ---------------- State ---------------- */
  function blankItem() {
    return { id: uid(), description: "", quantity: 1, rate: 0 };
  }

  /* Clearly-labelled sample data, used on the very first run so the preview
     looks complete immediately. The user can edit or replace everything. */
  function sampleState(counter) {
    var today = todayISO();
    return {
      id: uid(),
      business: {
        name: "Sample Studio — Your Name",
        initial: "S",
        email: "hello@yourstudio.example",
        phone: "+92 300 0000000",
        address: "123 Sample Street\nLahore, Pakistan"
      },
      client: {
        name: "Sample Client",
        company: "Sample Client Company LLC",
        email: "client@example.com",
        address: "456 Example Avenue\nDubai, UAE"
      },
      meta: {
        number: "INV-" + pad4(counter),
        issueDate: today,
        dueDate: addDaysISO(today, 14),
        currency: "USD",
        status: "Draft",
        discountRate: 0,
        taxRate: 0,
        notes: "Payment due within 14 days of the issue date.\nBank transfer preferred — please use the invoice number as the payment reference.\n(Sample notes — replace with your own payment terms.)"
      },
      items: [
        { id: uid(), description: "Website design & development (sample item)", quantity: 1, rate: 1200 },
        { id: uid(), description: "Additional landing page (sample item)", quantity: 2, rate: 150 },
        { id: uid(), description: "Monthly maintenance & support (sample item)", quantity: 1, rate: 80 }
      ]
    };
  }

  function blankState(counter, business) {
    var today = todayISO();
    return {
      id: uid(),
      business: business || { name: "", initial: "", email: "", phone: "", address: "" },
      client: { name: "", company: "", email: "", address: "" },
      meta: {
        number: "INV-" + pad4(counter),
        issueDate: today,
        dueDate: addDaysISO(today, 14),
        currency: "USD",
        status: "Draft",
        discountRate: 0,
        taxRate: 0,
        notes: ""
      },
      items: [blankItem()]
    };
  }

  var counter = parseInt(storageGet(LS.counter, 1), 10);
  if (isNaN(counter) || counter < 1) counter = 1;

  var state = storageGet(LS.draft, null);
  if (!state || typeof state !== "object" || !state.meta || !Array.isArray(state.items)) {
    state = sampleState(counter);
  }
  /* A previously saved business profile always wins over draft business data. */
  var savedProfile = storageGet(LS.profile, null);
  if (savedProfile) state.business = savedProfile;

  var savedInvoices = storageGet(LS.invoices, []);
  if (!Array.isArray(savedInvoices)) savedInvoices = [];

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var toggle = $("#themeToggle");
    if (toggle) {
      var isDark = theme === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      $(".theme-icon", toggle).textContent = isDark ? "☀️" : "🌙";
      $(".theme-label", toggle).textContent = isDark ? "Light" : "Dark";
    }
  }
  applyTheme(storageGet(LS.theme, "light") === "dark" ? "dark" : "light");

  /* ---------------- Totals ---------------- */
  function computeTotals(s) {
    var subtotal = 0;
    s.items.forEach(function (item) {
      subtotal += toNum(item.quantity) * toNum(item.rate);
    });
    var discount = (subtotal * clampPercent(s.meta.discountRate)) / 100;
    var taxable = Math.max(0, subtotal - discount);
    var tax = (taxable * clampPercent(s.meta.taxRate)) / 100;
    return { subtotal: subtotal, discount: discount, tax: tax, total: taxable + tax };
  }

  /* ---------------- Rendering: editor ---------------- */
  function setPath(obj, path, value) {
    var parts = path.split(".");
    var target = obj;
    for (var i = 0; i < parts.length - 1; i++) target = target[parts[i]];
    target[parts[parts.length - 1]] = value;
  }
  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? acc : acc[key];
    }, obj);
  }

  /* Push state values into every [data-bind] input (used on load / load-invoice). */
  function syncInputsFromState() {
    $$("[data-bind]").forEach(function (input) {
      var value = getPath(state, input.getAttribute("data-bind"));
      input.value = value == null ? "" : value;
      input.classList.remove("invalid");
    });
    $$(".field-error").forEach(function (el) { el.textContent = ""; });
  }

  function renderItems() {
    var list = $("#itemsList");
    list.innerHTML = "";
    state.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "item-row";
      row.setAttribute("data-item-id", item.id);

      var desc = document.createElement("input");
      desc.type = "text";
      desc.value = item.description || "";
      desc.placeholder = "Item description";
      desc.setAttribute("data-field", "description");
      desc.setAttribute("aria-label", "Item description");

      var qty = document.createElement("input");
      qty.type = "number";
      qty.min = "0";
      qty.step = "0.01";
      qty.inputMode = "decimal";
      qty.value = item.quantity;
      qty.setAttribute("data-field", "quantity");
      qty.setAttribute("aria-label", "Quantity");

      var rate = document.createElement("input");
      rate.type = "number";
      rate.min = "0";
      rate.step = "0.01";
      rate.inputMode = "decimal";
      rate.value = item.rate;
      rate.setAttribute("data-field", "rate");
      rate.setAttribute("aria-label", "Rate");

      var amount = document.createElement("span");
      amount.className = "item-amount";
      amount.setAttribute("data-amount-for", item.id);
      amount.textContent = formatMoney(toNum(item.quantity) * toNum(item.rate), state.meta.currency);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item-btn";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove item: " + (item.description || "untitled item"));
      remove.setAttribute("data-remove-item", item.id);

      row.appendChild(desc);
      row.appendChild(qty);
      row.appendChild(rate);
      row.appendChild(amount);
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  /* ---------------- Rendering: preview + totals ---------------- */
  function renderPreview() {
    var currency = state.meta.currency;
    var totals = computeTotals(state);
    var b = state.business;
    var c = state.client;

    $("#pvLogo").textContent = (b.initial || (b.name || "I").charAt(0) || "I").toUpperCase();
    $("#pvBizName").textContent = b.name || "Your Business";
    var bizMeta = [b.email, b.phone, b.address].filter(Boolean).join("\n");
    $("#pvBizMeta").textContent = bizMeta;

    $("#pvClientName").textContent = c.name || "Client Name";
    var clientMeta = [c.company, c.email, c.address].filter(Boolean).join("\n");
    $("#pvClientMeta").textContent = clientMeta;

    $("#pvNumber").textContent = state.meta.number || "—";
    $("#pvIssue").textContent = formatDate(state.meta.issueDate);
    $("#pvDue").textContent = formatDate(state.meta.dueDate);

    var badge = $("#pvStatus");
    badge.textContent = state.meta.status || "Draft";
    badge.className = "status-badge status-" + String(state.meta.status || "Draft").toLowerCase();

    var tbody = $("#pvItems");
    tbody.innerHTML = "";
    state.items.forEach(function (item) {
      var tr = document.createElement("tr");
      var lineTotal = toNum(item.quantity) * toNum(item.rate);
      tr.innerHTML =
        "<td>" + escapeHtml(item.description || "—") + "</td>" +
        '<td class="num">' + escapeHtml(String(toNum(item.quantity))) + "</td>" +
        '<td class="num">' + escapeHtml(formatMoney(toNum(item.rate), currency)) + "</td>" +
        '<td class="num">' + escapeHtml(formatMoney(lineTotal, currency)) + "</td>";
      tbody.appendChild(tr);
    });
    if (state.items.length === 0) {
      var empty = document.createElement("tr");
      empty.innerHTML = '<td colspan="4">No items yet — add one in the editor.</td>';
      tbody.appendChild(empty);
    }

    $("#pvNotes").textContent = state.meta.notes || "";
    $(".inv-notes").style.display = state.meta.notes ? "" : "none";

    /* Preview totals */
    $("#pvSubtotal").textContent = formatMoney(totals.subtotal, currency);
    $("#pvDiscount").textContent = "−" + formatMoney(totals.discount, currency);
    $("#pvTax").textContent = formatMoney(totals.tax, currency);
    $("#pvTotal").textContent = formatMoney(totals.total, currency);

    /* Editor totals */
    $("#sumSubtotal").textContent = formatMoney(totals.subtotal, currency);
    $("#sumDiscount").textContent = "−" + formatMoney(totals.discount, currency);
    $("#sumTax").textContent = formatMoney(totals.tax, currency);
    $("#sumTotal").textContent = formatMoney(totals.total, currency);

    /* Keep per-row amounts in the editor in sync after currency changes. */
    state.items.forEach(function (item) {
      var el = document.querySelector('[data-amount-for="' + item.id + '"]');
      if (el) el.textContent = formatMoney(toNum(item.quantity) * toNum(item.rate), currency);
    });
  }

  function renderAll() {
    renderItems();
    syncInputsFromState();
    renderPreview();
    renderSavedList();
  }

  function persistDraft() {
    storageSet(LS.draft, state);
    storageSet(LS.profile, state.business);
  }

  /* ---------------- Saved invoices ---------------- */
  function renderSavedList() {
    var list = $("#savedList");
    list.innerHTML = "";
    $("#savedEmpty").style.display = savedInvoices.length ? "none" : "";

    savedInvoices.forEach(function (inv) {
      var totals = computeTotals(inv);
      var li = document.createElement("li");
      li.className = "saved-item";

      var main = document.createElement("div");
      main.className = "saved-item-main";
      var title = document.createElement("strong");
      title.textContent = (inv.meta.number || "Invoice") + " — " + (inv.client.name || "No client");
      var sub = document.createElement("span");
      sub.textContent = "Issued " + formatDate(inv.meta.issueDate) + " · Due " + formatDate(inv.meta.dueDate);
      main.appendChild(title);
      main.appendChild(sub);

      var badge = document.createElement("span");
      badge.className = "status-badge status-" + String(inv.meta.status || "Draft").toLowerCase();
      badge.textContent = inv.meta.status || "Draft";

      var total = document.createElement("span");
      total.className = "saved-item-total";
      total.textContent = formatMoney(totals.total, inv.meta.currency);

      var actions = document.createElement("div");
      actions.className = "saved-item-actions";
      actions.innerHTML =
        '<button type="button" class="btn btn-secondary btn-small" data-load="' + inv.id + '">Load</button>' +
        '<button type="button" class="btn btn-secondary btn-small" data-duplicate="' + inv.id + '">Duplicate</button>' +
        '<button type="button" class="btn btn-danger btn-small" data-delete="' + inv.id + '" aria-label="Delete invoice ' + escapeHtml(inv.meta.number || "") + '">Delete</button>';

      li.appendChild(main);
      li.appendChild(badge);
      li.appendChild(total);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function persistSaved() {
    storageSet(LS.invoices, savedInvoices);
  }

  function findSaved(id) {
    for (var i = 0; i < savedInvoices.length; i++) {
      if (savedInvoices[i].id === id) return savedInvoices[i];
    }
    return null;
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ---------------- Validation ---------------- */
  function setError(inputId, message) {
    var input = document.getElementById(inputId);
    var errorEl = document.querySelector('[data-error-for="' + inputId + '"]');
    if (input) input.classList.toggle("invalid", Boolean(message));
    if (errorEl) errorEl.textContent = message || "";
    return !message;
  }

  function validate() {
    var ok = true;
    if (!state.business.name || !state.business.name.trim()) {
      ok = setError("bizName", "Your business name is required.") && ok;
    } else {
      setError("bizName", "");
    }
    if (!state.client.name || !state.client.name.trim()) {
      ok = setError("clientName", "The client name is required.") && ok;
    } else {
      setError("clientName", "");
    }
    var hasItem = state.items.some(function (item) {
      return item.description && item.description.trim() && toNum(item.rate) > 0;
    });
    var itemError = document.querySelector('[data-error-for="items"]');
    if (!hasItem) {
      itemError.textContent = "Add at least one item with a description and a rate above 0.";
      ok = false;
    } else {
      itemError.textContent = "";
    }
    return ok;
  }

  /* ---------------- Events: form inputs ---------------- */
  var form = $("#invoiceForm");
  form.addEventListener("input", function (event) {
    var input = event.target;
    var bind = input.getAttribute("data-bind");
    if (bind) {
      var value = input.value;
      if (bind === "meta.discountRate" || bind === "meta.taxRate") {
        value = clampPercent(value);
        if (String(value) !== input.value && input.value !== "") {
          /* Only rewrite the field on blur-style extremes to avoid fighting typing. */
          if (parseFloat(input.value) > 100) input.value = value;
        }
      }
      setPath(state, bind, value);
      input.classList.remove("invalid");
      persistDraft();
      renderPreview();
    }
  });
  form.addEventListener("change", function (event) {
    if (event.target.getAttribute("data-bind")) {
      persistDraft();
      renderPreview();
    }
  });

  /* Items: one delegated listener handles typing in every row. */
  $("#itemsList").addEventListener("input", function (event) {
    var input = event.target;
    var field = input.getAttribute("data-field");
    if (!field) return;
    var row = input.closest("[data-item-id]");
    if (!row) return;
    var id = row.getAttribute("data-item-id");
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) {
        if (field === "quantity" || field === "rate") {
          state.items[i][field] = toNum(input.value);
          input.classList.toggle("invalid", input.value !== "" && parseFloat(input.value) < 0);
        } else {
          state.items[i][field] = input.value;
        }
        break;
      }
    }
    persistDraft();
    renderPreview();
  });

  $("#itemsList").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-remove-item]");
    if (!btn) return;
    var id = btn.getAttribute("data-remove-item");
    state.items = state.items.filter(function (item) { return item.id !== id; });
    persistDraft();
    renderItems();
    renderPreview();
  });

  $("#addItemBtn").addEventListener("click", function () {
    state.items.push(blankItem());
    persistDraft();
    renderItems();
    renderPreview();
    var rows = $$("#itemsList .item-row input[data-field='description']");
    if (rows.length) rows[rows.length - 1].focus();
  });

  /* ---------------- Events: actions ---------------- */
  function showStatus(message) {
    $("#saveStatus").textContent = message;
    window.setTimeout(function () { $("#saveStatus").textContent = ""; }, 4000);
  }

  $("#saveBtn").addEventListener("click", function () {
    if (!validate()) {
      showStatus("");
      var firstInvalid = $(".invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    var snapshot = deepCopy(state);
    var existing = findSaved(snapshot.id);
    if (existing) {
      savedInvoices[savedInvoices.indexOf(existing)] = snapshot;
    } else {
      savedInvoices.unshift(snapshot);
    }
    persistSaved();
    persistDraft();
    renderSavedList();
    showStatus("Invoice " + snapshot.meta.number + " saved ✓");
  });

  $("#newBtn").addEventListener("click", function () {
    if (!window.confirm("Start a new invoice? Unsaved changes to the current draft will be lost (saved invoices are not affected).")) return;
    counter += 1;
    storageSet(LS.counter, counter);
    state = blankState(counter, deepCopy(state.business));
    persistDraft();
    renderAll();
    showStatus("New invoice " + state.meta.number + " started.");
  });

  $("#duplicateBtn").addEventListener("click", function () {
    counter += 1;
    storageSet(LS.counter, counter);
    var copy = deepCopy(state);
    copy.id = uid();
    copy.meta.number = "INV-" + pad4(counter);
    copy.meta.status = "Draft";
    state = copy;
    persistDraft();
    renderAll();
    showStatus("Duplicated as " + copy.meta.number + " (Draft).");
  });

  function doPrint() {
    window.print();
  }
  $("#printBtn").addEventListener("click", doPrint);
  $("#printBtnTop").addEventListener("click", doPrint);

  /* Saved list actions (delegated). */
  $("#savedList").addEventListener("click", function (event) {
    var loadBtn = event.target.closest("[data-load]");
    var dupBtn = event.target.closest("[data-duplicate]");
    var delBtn = event.target.closest("[data-delete]");

    if (loadBtn) {
      var inv = findSaved(loadBtn.getAttribute("data-load"));
      if (!inv) return;
      state = deepCopy(inv);
      persistDraft();
      renderAll();
      showStatus("Loaded invoice " + state.meta.number + ".");
      $("#editor").scrollIntoView({ behavior: "smooth" });
    }

    if (dupBtn) {
      var src = findSaved(dupBtn.getAttribute("data-duplicate"));
      if (!src) return;
      counter += 1;
      storageSet(LS.counter, counter);
      var copy = deepCopy(src);
      copy.id = uid();
      copy.meta.number = "INV-" + pad4(counter);
      copy.meta.status = "Draft";
      savedInvoices.unshift(copy);
      persistSaved();
      renderSavedList();
      showStatus("Saved copy created: " + copy.meta.number + " (Draft).");
    }

    if (delBtn) {
      var target = findSaved(delBtn.getAttribute("data-delete"));
      if (!target) return;
      if (!window.confirm("Delete saved invoice " + (target.meta.number || "") + "? This cannot be undone.")) return;
      savedInvoices = savedInvoices.filter(function (inv) { return inv.id !== target.id; });
      persistSaved();
      renderSavedList();
      showStatus("Deleted invoice " + (target.meta.number || "") + ".");
    }
  });

  /* Theme toggle. */
  $("#themeToggle").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    storageSet(LS.theme, next);
    applyTheme(next);
  });

  /* Keep the business profile in sync even if only profile fields changed. */
  form.addEventListener("input", function () {
    storageSet(LS.profile, state.business);
  });

  /* ---------------- Init ---------------- */
  renderAll();
})();
