/* ExportLead AI – front-end only. Data is saved in this browser (localStorage). */
const CATEGORIES = ["Importer", "Wholesale Distributor", "Retail Store", "Wellness / Yoga Centre", "Import-Export Company", "Online Seller", "Other"];
const STATUSES = ["New", "Contacted", "Replied", "Interested", "Not Interested"];
const FIELDS = ["company_name", "buyer_name", "email", "phone", "country", "state", "city", "website",
  "buyer_category", "buyer_type", "product_category", "source_website", "lead_status", "notes"];
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
const LINKEDIN_TITLES = ["Buyer", "Assistant Buyer", "Purchasing Manager", "Import Manager", "Business Owner"];

const SAMPLE = [
  ["Emma Carter", "Serene Home Imports", "emma@example.com", "+1-212-555-0101", "United States", "New York", "New York", "Importer", "Singing Bowls"],
  ["Daniel Reyes", "Lotus Wholesale Co", "daniel@example.com", "+1-310-555-0102", "United States", "California", "Los Angeles", "Wholesale Distributor", "Singing Bowls"],
  ["Priya Nair", "Zen Garden Wellness Store", "priya@example.com", "+1-512-555-0103", "United States", "Texas", "Austin", "Retail Store", "Singing Bowls"],
  ["Michael Brown", "Harmony Yoga Studio", "michael@example.com", "+1-303-555-0104", "United States", "Colorado", "Denver", "Wellness / Yoga Centre", "Singing Bowls"],
  ["Sarah Johnson", "Global Craft Trading LLC", "sarah@example.com", "+1-305-555-0105", "United States", "Florida", "Miami", "Import-Export Company", "Handicrafts"],
  ["Oliver Smith", "Mindful Living UK", "oliver@example.com", "+44-20-5550-0106", "United Kingdom", "England", "London", "Retail Store", "Singing Bowls"],
  ["Lena Fischer", "Klang Welt GmbH", "lena@example.com", "+49-30-555-0107", "Germany", "Berlin", "Berlin", "Importer", "Singing Bowls"],
  ["James Wilson", "", "james.wilson@example.com", "", "United States", "Oregon", "Portland", "Other", "Singing Bowls"],
  ["Chloe Martin", "Aura Online Boutique", "chloe-at-example", "", "Canada", "Ontario", "Toronto", "Online Seller", "Singing Bowls"],
  ["Noah Davis", "Tranquil Spaces Wholesale", "noah@example.com", "+1-206-555-0110", "United States", "Washington", "Seattle", "Wholesale Distributor", "Meditation Products"],
];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- storage ---------- */
let leads = JSON.parse(localStorage.getItem("el_leads") || "[]");
let mails = JSON.parse(localStorage.getItem("el_mails") || "[]");
let nextId = Number(localStorage.getItem("el_next") || 1);
function persist() {
  localStorage.setItem("el_leads", JSON.stringify(leads));
  localStorage.setItem("el_mails", JSON.stringify(mails));
  localStorage.setItem("el_next", String(nextId));
}

/* ---------- helpers ---------- */
function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg;
  $("toasts").appendChild(t); setTimeout(() => t.remove(), 4500);
}
const emailStatus = (e) => (!e ? "No email" : EMAIL_RE.test(e) ? "Valid format" : "Invalid format");
function dedupeKey(l) {
  const e = (l.email || "").trim().toLowerCase();
  return e ? "email:" + e : "co:" + [l.company_name, l.country, l.city].map((x) => (x || "").trim().toLowerCase()).join("|");
}
function cleanLead(raw) {
  const l = {};
  FIELDS.forEach((f) => (l[f] = String(raw[f] ?? "").trim()));
  l.email = l.email.toLowerCase();
  if (!["Business", "Individual"].includes(l.buyer_type)) l.buyer_type = "Unclassified";
  if (!STATUSES.includes(l.lead_status)) l.lead_status = "New";
  l.email_status = emailStatus(l.email);
  return l;
}
/* returns {ok, error} */
function addLead(raw, dataType = "real", ignoreId = null) {
  const l = cleanLead(raw);
  if (!l.company_name && !l.buyer_name) return { ok: false, error: "Enter at least a company name or a buyer name." };
  const key = dedupeKey(l);
  if (leads.some((x) => x.id !== ignoreId && dedupeKey(x) === key)) return { ok: false, duplicate: true, error: "Duplicate lead (same email, or same company + country + city)." };
  if (ignoreId) { Object.assign(leads.find((x) => x.id === ignoreId), l); }
  else { l.id = nextId++; l.data_type = dataType; l.created_at = new Date().toISOString().slice(0, 16).replace("T", " "); leads.push(l); }
  persist(); return { ok: true };
}
const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
function countBy(arr, key) {
  const m = {}; arr.forEach((x) => { if (x[key]) m[x[key]] = (m[x[key]] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function bars(el, pairs, cls = "") {
  if (!pairs.length) { el.innerHTML = '<p class="muted">No data yet.</p>'; return; }
  const mx = pairs[0][1];
  el.innerHTML = pairs.map(([n, c]) => `<div class="bar-row"><span class="bar-label">${esc(n)}</span>
    <div class="bar ${cls}"><div style="width:${Math.round((c / mx) * 100)}%"></div></div><span class="bar-count">${c}</span></div>`).join("");
}
function fillSelect(sel, values, firstLabel) {
  const cur = sel.value;
  sel.innerHTML = (firstLabel !== undefined ? `<option value="">${firstLabel}</option>` : "") + values.map((v) => `<option>${esc(v)}</option>`).join("");
  if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
}
const badgeEmail = (s) => s === "Valid format" ? '<span class="badge green">Valid format</span>' : s === "Invalid format" ? '<span class="badge red">Invalid format</span>' : "";
const badgeType = (t) => `<span class="badge ${t === "Business" ? "blue" : t === "Individual" ? "purple" : "grey"}">${t}</span>`;
const badgeData = (d) => d === "sample" ? '<span class="badge orange">SAMPLE</span>' : '<span class="badge grey">Real entry</span>';

function leadRows(list) {
  if (!list.length) return '<tbody><tr><td class="muted">No leads found. Add one, import a CSV, or load sample data.</td></tr></tbody>';
  return `<thead><tr><th>Company / Buyer</th><th>Email</th><th>Location</th><th>Category</th><th>Type</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>` +
    list.map((r) => `<tr>
      <td><strong>${esc(r.company_name || r.buyer_name)}</strong>${r.company_name && r.buyer_name ? `<div class="muted small">${esc(r.buyer_name)}</div>` : ""}</td>
      <td>${esc(r.email) || "—"} ${badgeEmail(r.email_status)}</td>
      <td>${esc([r.city, r.state, r.country].filter(Boolean).join(", ")) || "—"}</td>
      <td>${esc(r.buyer_category) || "—"}</td><td>${badgeType(r.buyer_type)}</td><td>${esc(r.lead_status)}</td><td>${badgeData(r.data_type)}</td>
      <td class="actions"><button class="btn btn-small" data-edit="${r.id}">Edit</button>
        <button class="btn btn-small btn-danger" data-del="${r.id}">Delete</button></td></tr>`).join("") + "</tbody>";
}

/* ---------- navigation ---------- */
const TITLES = { dashboard: "Dashboard", discover: "Discover Buyers", leads: "Manage Leads", validation: "Email Validation",
  classification: "AI Classification", marketing: "Email Marketing", importexport: "Import / Export", reports: "Reports" };
function show(view) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("pageTitle").textContent = TITLES[view]; $("sidebar").classList.remove("open");
  renderAll();
}
$("nav").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.view); });
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

/* ---------- dashboard ---------- */
function renderDashboard() {
  const c = (f) => leads.filter(f).length;
  const stats = [
    ["Total Buyers", leads.length, ""], ["Business Leads", c((l) => l.buyer_type === "Business"), ""],
    ["Individual Leads", c((l) => l.buyer_type === "Individual"), ""], ["Not Yet Classified", c((l) => l.buyer_type === "Unclassified"), ""],
    ["Valid Email Format", c((l) => l.email_status === "Valid format"), "good"], ["Invalid Email Format", c((l) => l.email_status === "Invalid format"), "bad"],
    ["Emails Sent", mails.filter((m) => m.status === "Sent").length, "good"], ["Emails Failed", mails.filter((m) => m.status === "Failed").length, "bad"],
  ];
  $("statCards").innerHTML = stats.map(([l, v, k]) => `<div class="card stat ${k}"><div class="label">${l}</div><div class="value">${v}</div></div>`).join("");
  const samples = c((l) => l.data_type === "sample");
  $("sampleNotice").hidden = !samples;
  $("sampleNotice").innerHTML = `⚠️ ${samples} of your ${leads.length} leads are <strong>SAMPLE DATA</strong> (fictional, for demo).`;
  bars($("dashCountry"), countBy(leads, "country")); bars($("dashCategory"), countBy(leads, "buyer_category"), "alt");
  fillSelect($("dashFilter"), uniq(leads.map((l) => l.country)), "All countries");
  const f = $("dashFilter").value;
  $("dashTable").innerHTML = leadRows(leads.filter((l) => !f || l.country === f).slice().reverse().slice(0, 8));
}
$("dashFilter").addEventListener("change", renderDashboard);

/* ---------- leads ---------- */
function renderLeads() {
  fillSelect($("fCountry"), uniq(leads.map((l) => l.country)), "All countries");
  fillSelect($("fCategory"), uniq(leads.map((l) => l.buyer_category)), "All categories");
  fillSelect($("fStatus"), STATUSES, "All statuses");
  const q = $("fQ").value.toLowerCase();
  const list = leads.filter((l) =>
    (!q || [l.buyer_name, l.company_name, l.email, l.city, l.product_category].some((v) => (v || "").toLowerCase().includes(q))) &&
    (!$("fCountry").value || l.country === $("fCountry").value) && (!$("fCategory").value || l.buyer_category === $("fCategory").value) &&
    (!$("fStatus").value || l.lead_status === $("fStatus").value) && (!$("fEmail").value || l.email_status === $("fEmail").value) &&
    (!$("fData").value || l.data_type === $("fData").value)).slice().reverse();
  $("leadCount").textContent = list.length + " lead(s) shown.";
  $("leadTable").innerHTML = leadRows(list);
}
["fQ", "fCountry", "fCategory", "fStatus", "fEmail", "fData"].forEach((id) => $(id).addEventListener("input", renderLeads));
$("fClear").addEventListener("click", () => { ["fQ", "fCountry", "fCategory", "fStatus", "fEmail", "fData"].forEach((id) => ($(id).value = "")); renderLeads(); });

/* add / edit / delete (works from every table through event delegation) */
let editingId = null;
function openDialog(lead, prefill = {}) {
  editingId = lead ? lead.id : null;
  $("dialogTitle").textContent = lead ? "Edit Lead" : "Add Lead";
  fillSelect($("leadForm").buyer_category, CATEGORIES, ""); fillSelect($("leadForm").lead_status, STATUSES);
  const src = lead || prefill;
  FIELDS.forEach((f) => ($("leadForm")[f].value = src[f] || (f === "buyer_type" ? "Unclassified" : f === "lead_status" ? "New" : "")));
  $("leadDialog").showModal();
}
$("addLeadTop").addEventListener("click", () => openDialog(null));
$("dialogCancel").addEventListener("click", () => $("leadDialog").close());
$("leadForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData($("leadForm")));
  const r = addLead(raw, "real", editingId);
  if (!r.ok) return toast(r.error, "error");
  $("leadDialog").close(); toast(editingId ? "Lead updated." : "Lead saved."); renderAll();
});
document.addEventListener("click", (e) => {
  const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
  if (ed) openDialog(leads.find((l) => l.id === Number(ed.dataset.edit)));
  if (del && confirm("Delete this lead?")) { leads = leads.filter((l) => l.id !== Number(del.dataset.del)); persist(); toast("Lead deleted."); renderAll(); }
});

/* ---------- discover ---------- */
function buildSources(product, country, state, city, cat) {
  const place = [city, state, country].filter(Boolean).join(" "), loc = [city, state].filter(Boolean).join(", ") || country;
  const q = `${product} ${cat || "importer OR distributor OR wholesale"} ${place}`.trim(), qp = `${product} ${cat || "wholesale"} ${place}`.trim();
  const e = encodeURIComponent;
  return [
    ["Google Search", "Find company websites, then read About Us / Contact Us.", `https://www.google.com/search?q=${e(q)}`],
    ["Google Maps", "Shops and studios with public phone and website.", `https://www.google.com/maps/search/${e(qp)}`],
    ["LinkedIn (companies)", "Look for the buyer job titles listed below.", `https://www.linkedin.com/search/results/companies/?keywords=${e(product + " " + (cat || "import"))}`],
    ["Facebook (pages)", "Business pages with public contact details.", `https://www.facebook.com/search/pages/?q=${e(qp)}`],
    ["Yellow Pages (US)", "US business directory.", `https://www.yellowpages.com/search?search_terms=${e(product)}&geo_location_terms=${e(loc)}`],
    ["Yelp", "Local retail and wellness businesses.", `https://www.yelp.com/search?find_desc=${e(product)}&find_loc=${e(loc)}`],
    ["ImportYeti", "US import records for similar goods.", `https://www.importyeti.com/search?q=${e(product)}`],
    ["Alibaba", "Buyer and supplier listings.", `https://www.alibaba.com/trade/search?SearchText=${e(product)}`],
    ["IndiaMART", "See how competitors list the product.", `https://dir.indiamart.com/search.mp?ss=${e(product)}`],
    ["Trade show directories", "Public exhibitor lists.", `https://www.google.com/search?q=${e(product + " trade show exhibitor directory " + country)}`],
    ["Business directories", "General company directories.", `https://www.google.com/search?q=${e(product + " business directory " + place)}`],
    ["Chamber of Commerce", "Member directories.", `https://www.google.com/search?q=${e("chamber of commerce member directory " + place)}`],
  ];
}
$("discoverForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const p = { product: $("dProduct").value.trim(), country: $("dCountry").value.trim(), state: $("dState").value.trim(), city: $("dCity").value.trim(), cat: $("dCategory").value };
  const src = buildSources(p.product, p.country, p.state, p.city, p.cat);
  const saved = leads.filter((l) => [l.company_name, l.buyer_name, l.product_category].join(" ").toLowerCase().includes(p.product.toLowerCase())).slice(0, 10);
  $("discoverResult").innerHTML = `<div class="card"><h2>Search sources for “${esc(p.product)}”</h2><div class="source-grid">` +
    src.map(([n, tip, url], i) => `<div class="source"><h3>${n}</h3><p class="muted small">${tip}</p><div class="actions">
      <a class="btn btn-small btn-primary" href="${url}" target="_blank" rel="noopener noreferrer">Open search ↗</a>
      <button class="btn btn-small" data-save-from="${i}">Save a lead from this source</button></div></div>`).join("") + `</div></div>
    <div class="grid-2"><div class="card"><h2>LinkedIn job titles to look for</h2><ul>${LINKEDIN_TITLES.map((t) => `<li>${t}</li>`).join("")}</ul></div>
    <div class="card"><h2>Already in your database</h2>${saved.length ? "<ul>" + saved.map((l) => `<li>${esc(l.company_name || l.buyer_name)} — ${esc(l.city || l.country)} ${l.data_type === "sample" ? '<span class="badge orange">SAMPLE</span>' : ""}</li>`).join("") + "</ul>" : '<p class="muted">No saved leads match this product yet.</p>'}</div></div>`;
  $("discoverResult").onclick = (e) => {
    const b = e.target.closest("[data-save-from]"); if (!b) return;
    openDialog(null, { product_category: p.product, country: p.country, state: p.state, city: p.city, buyer_category: p.cat, source_website: src[b.dataset.saveFrom][0] });
  };
});

/* ---------- validation ---------- */
$("vCheck").addEventListener("click", () => {
  const v = $("vInput").value.trim(), s = emailStatus(v);
  $("vResult").innerHTML = s === "No email" ? '<span class="badge grey">Enter an email</span>' : badgeEmail(s);
});
function renderValidation() {
  const list = leads.filter((l) => l.email);
  $("validationTable").innerHTML = list.length ? `<thead><tr><th>Lead</th><th>Email</th><th>Result</th></tr></thead><tbody>` +
    list.map((l) => `<tr><td>${esc(l.company_name || l.buyer_name)}</td><td>${esc(l.email)}</td><td>${badgeEmail(l.email_status)}</td></tr>`).join("") + "</tbody>"
    : '<tbody><tr><td class="muted">No leads with emails yet.</td></tr></tbody>';
}

/* ---------- classification (rule-based) ---------- */
const BIZ_WORDS = /\b(llc|inc|ltd|gmbh|co|corp|company|store|shop|studio|imports?|exports?|trading|wholesale|boutique|centre|center|wellness|yoga|distributors?)\b/i;
function classify(l) {
  const name = l.company_name || "";
  const text = (name + " " + l.buyer_category).toLowerCase();
  let type = name && (BIZ_WORDS.test(name) || l.buyer_category) ? "Business" : name ? "Business" : "Individual";
  let cat = l.buyer_category;
  if (!cat) cat = /import|export|trading/.test(text) ? "Import-Export Company" : /wholesale|distribut/.test(text) ? "Wholesale Distributor"
    : /yoga|wellness|studio|centre|center/.test(text) ? "Wellness / Yoga Centre" : /online|boutique/.test(text) ? "Online Seller" : /store|shop/.test(text) ? "Retail Store" : "Other";
  const why = type === "Individual" ? "No company name was given, so this looks like an individual." : `Company name “${name}” suggests a business${cat ? " (" + cat + ")" : ""}.`;
  return { type, cat, why };
}
$("runClassify").addEventListener("click", () => {
  let n = 0;
  leads.forEach((l) => { if (l.buyer_type === "Unclassified") { const r = classify(l); l.buyer_type = r.type; l.buyer_category = l.buyer_category || r.cat; l.classification_reason = r.why; l.classification_method = "Rule-based (not AI)"; n++; } });
  persist(); toast(n ? `${n} lead(s) classified (rule-based).` : "No unclassified leads.", n ? "success" : "error"); renderAll();
});
function renderClass() {
  $("classTable").innerHTML = leads.length ? `<thead><tr><th>Lead</th><th>Type</th><th>Category</th><th>Method</th><th>Explanation</th></tr></thead><tbody>` +
    leads.map((l) => `<tr><td>${esc(l.company_name || l.buyer_name)}</td><td>${badgeType(l.buyer_type)}</td><td>${esc(l.buyer_category) || "—"}</td>
    <td>${esc(l.classification_method) || "—"}</td><td class="small">${esc(l.classification_reason) || "—"}</td></tr>`).join("") + "</tbody>"
    : '<tbody><tr><td class="muted">No leads yet.</td></tr></tbody>';
}

/* ---------- email marketing ---------- */
function renderMarketing() {
  const sel = $("mLead"), cur = sel.value;
  const opts = leads.filter((l) => l.email_status === "Valid format");
  sel.innerHTML = opts.length ? opts.map((l) => `<option value="${l.id}">${esc(l.company_name || l.buyer_name)} — ${esc(l.email)}</option>`).join("") : '<option value="">No leads with a valid email</option>';
  if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  $("mailTable").innerHTML = mails.length ? `<thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody>` +
    mails.slice().reverse().map((m) => `<tr><td class="small">${m.date}</td><td>${esc(m.to)}</td><td>${esc(m.subject)}</td>
    <td><span class="badge ${m.status === "Sent" ? "green" : m.status === "Failed" ? "red" : "grey"}">${m.status}</span></td></tr>`).join("") + "</tbody>"
    : '<tbody><tr><td class="muted">No emails yet.</td></tr></tbody>';
}
$("mGenerate").addEventListener("click", () => {
  const l = leads.find((x) => x.id === Number($("mLead").value));
  if (!l) return toast("Pick a lead with a valid email first.", "error");
  const product = $("mProduct").value.trim() || l.product_category || "our products", me = $("mSender").value.trim() || "[Your company]";
  const hello = l.buyer_name ? `Dear ${l.buyer_name.split(" ")[0]},` : `Dear ${l.company_name || "Sir/Madam"} team,`;
  $("mSubject").value = `Export enquiry: ${product} from India for ${l.company_name || l.buyer_name}`;
  $("mBody").value = `${hello}\n\nI am writing from ${me}, an India-based exporter of ${product}. We found ${l.company_name || "your business"}${l.city ? " in " + l.city : ""} and believe our range could suit your customers.\n\nI have attached our product presentation. If this is relevant, I would be happy to share prices, samples and shipping details.\n\nBest regards,\n${me}\n\n—\nIf you would prefer not to receive further emails from us, reply with “unsubscribe” and we will remove you immediately.`;
});
function logMail(status) {
  const l = leads.find((x) => x.id === Number($("mLead").value));
  if (!l) return toast("Pick a lead first.", "error");
  if (!$("mSubject").value.trim() || !$("mBody").value.trim()) return toast("Write the subject and message first.", "error");
  if (status !== "Draft" && mails.some((m) => m.to === l.email && m.subject === $("mSubject").value && m.status !== "Draft")) return toast("You already contacted this lead with this subject.", "error");
  mails.push({ to: l.email, subject: $("mSubject").value, body: $("mBody").value, status, date: new Date().toLocaleString() });
  persist(); renderAll(); return l;
}
$("mSave").addEventListener("click", () => { if (logMail("Draft")) toast("Draft saved."); });
$("mOpen").addEventListener("click", () => {
  const l = logMail("Sent"); if (!l) return;
  window.location.href = `mailto:${l.email}?subject=${encodeURIComponent($("mSubject").value)}&body=${encodeURIComponent($("mBody").value)}`;
});

/* ---------- import / export ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const csvCell = (v) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v ?? "").replace(/"/g, '""')}"` : String(v ?? ""));
function download(name, text) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" })); a.download = name; a.click();
}
$("csvTemplate").addEventListener("click", () => download("buyer_import_template.csv", FIELDS.join(",") + "\n"));
$("csvExport").addEventListener("click", () => {
  const cols = FIELDS.concat(["email_status", "data_type"]);
  download("exportlead_buyers.csv", [cols.join(",")].concat(leads.map((l) => cols.map((c) => csvCell(l[c])).join(","))).join("\n"));
});
$("csvImport").addEventListener("click", async () => {
  const f = $("csvFile").files[0]; if (!f) return toast("Choose a CSV file first.", "error");
  const rows = parseCSV(await f.text()).filter((r) => r.some((c) => c.trim()));
  if (rows.length < 2) return toast("The CSV has no data rows.", "error");
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/^﻿/, "").replace(/ /g, "_"));
  if (!head.includes("company_name") && !head.includes("buyer_name")) return toast("CSV needs a company_name or buyer_name column.", "error");
  let added = 0, dup = 0, bad = 0, badEmail = 0;
  rows.slice(1).forEach((r) => {
    const raw = {}; head.forEach((h, i) => (raw[h] = r[i]));
    const res = addLead(raw);
    if (res.ok) { added++; if (emailStatus((raw.email || "").trim().toLowerCase()) === "Invalid format") badEmail++; } else if (res.duplicate) dup++; else bad++;
  });
  $("importResult").textContent = `Added ${added}, duplicates skipped ${dup}, rejected ${bad}, saved with invalid email format ${badEmail}.`;
  toast(`Import finished: ${added} added.`); renderAll();
});
$("sampleLoad").addEventListener("click", () => {
  let n = 0;
  SAMPLE.forEach(([b, c, e, p, co, st, ci, cat, prod]) => {
    if (addLead({ buyer_name: b, company_name: c, email: e, phone: p, country: co, state: st, city: ci, buyer_category: cat, product_category: prod,
      source_website: "SAMPLE DATA (fictional)", notes: "Fictional sample record for demo only." }, "sample").ok) n++;
  });
  toast(n ? `${n} SAMPLE leads added (fictional).` : "Sample data is already loaded.", n ? "success" : "error"); renderAll();
});
$("sampleRemove").addEventListener("click", () => {
  const before = leads.length; leads = leads.filter((l) => l.data_type !== "sample"); persist();
  toast(`${before - leads.length} sample leads removed.`); renderAll();
});

/* ---------- reports ---------- */
function renderReports() {
  bars($("rCountry"), countBy(leads, "country")); bars($("rCategory"), countBy(leads, "buyer_category"), "alt");
  bars($("rStatus"), countBy(leads, "lead_status")); bars($("rEmail"), countBy(leads, "email_status"), "alt");
}

/* ---------- init ---------- */
function renderAll() { renderDashboard(); renderLeads(); renderValidation(); renderClass(); renderMarketing(); renderReports(); }
fillSelect($("dCategory"), CATEGORIES, "Any");
renderAll();
