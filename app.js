let DATA = null;
let WEIGHTS = {};
let STATE = {
  search: "",
  vertical: "all",
  stage: "all",
  channel: "all",
  activeOnly: false,
  sort: "composite-desc",
};

async function init() {
  const res = await fetch("data.json");
  if (!res.ok) {
    document.getElementById("app").innerHTML =
      '<p class="fetch-error">Could not load data.json — serve this over http:// (e.g. <code>python3 -m http.server</code>), not file://.</p>';
    return;
  }
  DATA = await res.json();
  DATA.framework.criteria.forEach((c) => (WEIGHTS[c.key] = 20));

  renderMeta();
  renderThesis();
  renderFramework();
  renderControls();
  renderAll();
}

function compositeScore(deal) {
  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0) || 1;
  let score = 0;
  for (const c of DATA.framework.criteria) {
    score += (WEIGHTS[c.key] / totalWeight) * deal.scores[c.key];
  }
  return score;
}

function renderMeta() {
  document.getElementById("eyebrow").textContent = "Deal Sourcing · AI-Enabled Roll-Ups";
  document.getElementById("title").textContent = DATA.meta.title;
  document.getElementById("subtitle").textContent = DATA.meta.subtitle;
  document.getElementById("asOf").textContent = "As of " + DATA.meta.asOf;
  document.getElementById("disclaimer").textContent = DATA.meta.disclaimer;
}

function renderThesis() {
  document.getElementById("thesisHeadline").textContent = DATA.thesis.headline;
  document.getElementById("thesisBody").textContent = DATA.thesis.body;
}

function renderFramework() {
  const root = document.getElementById("frameworkRoot");
  root.innerHTML = "";
  DATA.framework.criteria.forEach((c) => {
    const card = document.createElement("div");
    card.className = "crit-card";
    card.innerHTML = `
      <div class="crit-head">
        <span class="crit-label">${c.label}</span>
        <span class="crit-weight" id="weightLabel-${c.key}">20%</span>
      </div>
      <input type="range" min="0" max="100" value="20" class="crit-slider" id="slider-${c.key}" data-key="${c.key}">
      <p class="crit-desc">${c.description}</p>
    `;
    root.appendChild(card);
  });
  DATA.framework.criteria.forEach((c) => {
    document.getElementById(`slider-${c.key}`).addEventListener("input", (e) => {
      WEIGHTS[c.key] = Number(e.target.value);
      updateWeightLabels();
      renderPipeline();
    });
  });
  updateWeightLabels();
}

function updateWeightLabels() {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0) || 1;
  DATA.framework.criteria.forEach((c) => {
    const pct = Math.round((WEIGHTS[c.key] / total) * 100);
    document.getElementById(`weightLabel-${c.key}`).textContent = pct + "%";
  });
}

function renderControls() {
  const verticalSelect = document.getElementById("verticalFilter");
  verticalSelect.innerHTML =
    '<option value="all">All verticals</option>' +
    DATA.verticals.map((v) => `<option value="${v}">${v}</option>`).join("");

  const stageSelect = document.getElementById("stageFilter");
  stageSelect.innerHTML =
    '<option value="all">All stages</option>' +
    DATA.stages.map((s) => `<option value="${s}">${s}</option>`).join("");

  const channelSelect = document.getElementById("channelFilter");
  channelSelect.innerHTML =
    '<option value="all">All channels</option>' +
    DATA.channels.map((c) => `<option value="${c}">${c}</option>`).join("");

  document.getElementById("searchInput").addEventListener("input", (e) => {
    STATE.search = e.target.value.toLowerCase();
    renderPipeline();
  });
  verticalSelect.addEventListener("change", (e) => {
    STATE.vertical = e.target.value;
    renderPipeline();
  });
  stageSelect.addEventListener("change", (e) => {
    STATE.stage = e.target.value;
    renderPipeline();
  });
  channelSelect.addEventListener("change", (e) => {
    STATE.channel = e.target.value;
    renderPipeline();
  });
  document.getElementById("activeOnly").addEventListener("change", (e) => {
    STATE.activeOnly = e.target.checked;
    renderPipeline();
  });
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    STATE.sort = e.target.value;
    renderPipeline();
  });
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerOverlay").addEventListener("click", closeDrawer);
}

function filteredDeals() {
  return DATA.deals.filter((d) => {
    if (STATE.search) {
      const hay = (d.name + " " + d.vertical + " " + d.location).toLowerCase();
      if (!hay.includes(STATE.search)) return false;
    }
    if (STATE.vertical !== "all" && d.vertical !== STATE.vertical) return false;
    if (STATE.stage !== "all" && d.stage !== STATE.stage) return false;
    if (STATE.channel !== "all" && d.channel !== STATE.channel) return false;
    if (STATE.activeOnly && (d.stage === "Closed" || d.stage === "Passed")) return false;
    return true;
  });
}

function sortedDeals(deals) {
  const withScore = deals.map((d) => ({ d, score: compositeScore(d) }));
  switch (STATE.sort) {
    case "composite-desc":
      withScore.sort((a, b) => b.score - a.score);
      break;
    case "composite-asc":
      withScore.sort((a, b) => a.score - b.score);
      break;
    case "sourced-desc":
      withScore.sort((a, b) => new Date(b.d.sourcedDate) - new Date(a.d.sourcedDate));
      break;
    case "ebitda-desc":
      withScore.sort((a, b) => parseMoney(b.d.ebitda) - parseMoney(a.d.ebitda));
      break;
  }
  return withScore;
}

function parseMoney(s) {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  return s.includes("M") ? n * 1_000_000 : s.includes("K") ? n * 1_000 : n;
}

function renderAll() {
  renderPipeline();
}

function renderPipeline() {
  const deals = filteredDeals();
  const ranked = sortedDeals(deals);
  renderStats(deals);

  const root = document.getElementById("pipelineRoot");
  root.innerHTML = "";
  if (ranked.length === 0) {
    root.innerHTML = '<p class="empty-state">No deals match these filters.</p>';
    return;
  }
  ranked.forEach(({ d, score }) => {
    const row = document.createElement("div");
    row.className = "deal-row";
    row.dataset.id = d.id;
    row.innerHTML = `
      <div class="deal-main">
        <div class="deal-name">${d.name}</div>
        <div class="deal-sub">${d.vertical} · ${d.location}</div>
      </div>
      <div class="deal-badge stage-${slug(d.stage)}">${d.stage}</div>
      <div class="deal-channel">${d.channel}</div>
      <div class="deal-financials">
        <span>${d.revenue} rev</span>
        <span>${d.ebitda} EBITDA</span>
        <span class="deal-margin">${d.ebitdaMargin}</span>
      </div>
      <div class="deal-score">
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${(score / 5) * 100}%"></div></div>
        <span class="score-num">${score.toFixed(1)}</span>
      </div>
    `;
    row.addEventListener("click", () => openDrawer(d, score));
    root.appendChild(row);
  });
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function renderStats(deals) {
  const root = document.getElementById("statsRoot");
  const total = deals.length;
  const active = deals.filter((d) => d.stage !== "Closed" && d.stage !== "Passed").length;
  const closed = deals.filter((d) => d.stage === "Closed").length;
  const avgScore = total ? deals.reduce((sum, d) => sum + compositeScore(d), 0) / total : 0;

  root.innerHTML = `
    <div class="stat-box"><span class="stat-num">${total}</span><span class="stat-label">Deals shown</span></div>
    <div class="stat-box"><span class="stat-num">${active}</span><span class="stat-label">In active pipeline</span></div>
    <div class="stat-box"><span class="stat-num">${closed}</span><span class="stat-label">Closed</span></div>
    <div class="stat-box"><span class="stat-num">${avgScore.toFixed(2)}</span><span class="stat-label">Avg. weighted score</span></div>
  `;
}

function openDrawer(deal, score) {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawerOverlay");
  const body = document.getElementById("drawerBody");

  const critRows = DATA.framework.criteria
    .map((c) => {
      const s = deal.scores[c.key];
      return `
        <div class="drawer-crit">
          <div class="drawer-crit-head">
            <span>${c.label}</span>
            <span class="drawer-crit-score">${s}/5</span>
          </div>
          <div class="score-bar-track"><div class="score-bar-fill" style="width:${(s / 5) * 100}%"></div></div>
          <p class="drawer-crit-rationale">${deal.rationale[c.key]}</p>
        </div>
      `;
    })
    .join("");

  body.innerHTML = `
    <div class="drawer-badge stage-${slug(deal.stage)}">${deal.stage}</div>
    <h2 class="drawer-title">${deal.name}</h2>
    <p class="drawer-sub">${deal.vertical} · ${deal.location}</p>
    <div class="drawer-financials">
      <div><span class="drawer-fin-label">Revenue</span><span class="drawer-fin-val">${deal.revenue}</span></div>
      <div><span class="drawer-fin-label">EBITDA</span><span class="drawer-fin-val">${deal.ebitda}</span></div>
      <div><span class="drawer-fin-label">Margin</span><span class="drawer-fin-val">${deal.ebitdaMargin}</span></div>
      <div><span class="drawer-fin-label">Channel</span><span class="drawer-fin-val">${deal.channel}</span></div>
      <div><span class="drawer-fin-label">Sourced</span><span class="drawer-fin-val">${deal.sourcedDate}</span></div>
      <div><span class="drawer-fin-label">Weighted score</span><span class="drawer-fin-val">${score.toFixed(2)} / 5</span></div>
    </div>
    <div class="drawer-note"><strong>Thesis note:</strong> ${deal.thesisNote}</div>
    <h3 class="drawer-section-head">Five-box breakdown</h3>
    ${critRows}
  `;

  drawer.classList.add("open");
  overlay.classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
}

init();
