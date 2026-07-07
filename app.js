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

const PRESETS = [
  { name: "Balanced", weights: { fragmentation: 20, unitEconomics: 20, aiLeverage: 20, moat: 20, exitPath: 20 } },
  { name: "AI-Leverage Max", weights: { fragmentation: 10, unitEconomics: 15, aiLeverage: 45, moat: 15, exitPath: 15 } },
  { name: "Margin First", weights: { fragmentation: 10, unitEconomics: 45, aiLeverage: 15, moat: 15, exitPath: 15 } },
  { name: "Moat & Exit", weights: { fragmentation: 10, unitEconomics: 15, aiLeverage: 15, moat: 30, exitPath: 30 } },
];

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
  renderPresets();
  renderFramework();
  renderControls();
  renderPipeline();
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

function renderPresets() {
  const root = document.getElementById("presetsRoot");
  root.innerHTML = "";
  PRESETS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className = "preset-btn" + (i === 0 ? " active" : "");
    btn.textContent = p.name;
    btn.addEventListener("click", () => applyPreset(p, btn));
    root.appendChild(btn);
  });
}

function applyPreset(preset, btn) {
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  DATA.framework.criteria.forEach((c) => {
    WEIGHTS[c.key] = preset.weights[c.key];
    document.getElementById(`slider-${c.key}`).value = preset.weights[c.key];
  });
  updateWeightLabels();
  renderPipeline();
}

function clearPresetHighlight() {
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
}

function renderFramework() {
  const root = document.getElementById("frameworkRoot");
  root.innerHTML = "";
  DATA.framework.criteria.forEach((c) => {
    const card = document.createElement("div");
    card.className = "crit-card";
    card.innerHTML = `
      <div class="crit-head">
        <span class="crit-label">${c.short}</span>
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
      clearPresetHighlight();
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

function scoreClass(score) {
  if (score >= 4) return "hi";
  if (score < 2.5) return "lo";
  return "";
}

function renderPipeline() {
  const deals = filteredDeals();
  const ranked = sortedDeals(deals);
  renderStats(deals);

  const root = document.getElementById("pipelineRoot");
  root.innerHTML = "";
  if (ranked.length === 0) {
    root.innerHTML = '<tr><td colspan="5" class="empty-state">No deals match these filters.</td></tr>';
    return;
  }
  ranked.forEach(({ d, score }) => {
    const cls = scoreClass(score);
    const row = document.createElement("tr");
    row.dataset.id = d.id;
    row.innerHTML = `
      <td>
        <span class="deal-name">${d.name}</span>
        <span class="deal-sub">${d.vertical} · ${d.location}</span>
        <span class="row-note">${d.thesisNote}</span>
      </td>
      <td><span class="deal-badge stage-${slug(d.stage)}">${d.stage}</span></td>
      <td>${d.channel}</td>
      <td class="fin-cell">${d.revenue} rev<br>${d.ebitda} EBITDA<br><span class="deal-margin">${d.ebitdaMargin}</span></td>
      <td>
        <div class="deal-score-cell">
          <div class="score-bar-track"><div class="score-bar-fill ${cls}" style="width:${(score / 5) * 100}%"></div></div>
          <span class="score-num ${cls}">${score.toFixed(1)}</span>
        </div>
      </td>
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
    <div class="stat-box"><span class="stat-num">${String(total).padStart(2, "0")}</span><span class="stat-label">Deals shown</span></div>
    <div class="stat-box"><span class="stat-num">${String(active).padStart(2, "0")}</span><span class="stat-label">Active pipeline</span></div>
    <div class="stat-box"><span class="stat-num">${String(closed).padStart(2, "0")}</span><span class="stat-label">Closed</span></div>
    <div class="stat-box"><span class="stat-num">${avgScore.toFixed(2)}</span><span class="stat-label">Avg weighted score</span></div>
  `;
  document.getElementById("tickerScore").textContent = avgScore.toFixed(2);
}

/* Radar chart: 5 axes starting at 12 o'clock, clockwise. */
function radarSVG(deal) {
  const SIZE = 240;
  const CX = SIZE / 2, CY = SIZE / 2;
  const R = 82;
  const criteria = DATA.framework.criteria;
  const n = criteria.length;

  const point = (i, r) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
  };
  const ring = (r) =>
    Array.from({ length: n }, (_, i) => point(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");

  const rings = [R, R * 0.66, R * 0.33]
    .map((r) => `<polygon points="${ring(r)}" fill="none" stroke="#262b26" stroke-width="1"/>`)
    .join("");

  const axes = Array.from({ length: n }, (_, i) => {
    const [x, y] = point(i, R);
    return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#3a423a" stroke-width="1"/>`;
  }).join("");

  const dataPoints = criteria.map((c, i) => point(i, (deal.scores[c.key] / 5) * R));
  const shape = dataPoints.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
  const dots = dataPoints
    .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#3ddc84"/>`)
    .join("");

  const RADAR_LABELS = { fragmentation: "FRAG", unitEconomics: "ECON", aiLeverage: "AI LEV", moat: "MOAT", exitPath: "EXIT" };
  const labels = criteria.map((c, i) => {
    const [x, y] = point(i, R + 16);
    let anchor = "middle";
    if (x > CX + 8) anchor = "start";
    else if (x < CX - 8) anchor = "end";
    const dy = y > CY + 8 ? 8 : y < CY - 8 ? 0 : 4;
    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" fill="#7c877c" font-size="9" font-family="SF Mono, Menlo, Consolas, monospace" text-anchor="${anchor}" letter-spacing="0.05em">${RADAR_LABELS[c.key] || c.short.toUpperCase()}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="Five-box radar for ${deal.name}">
    ${rings}${axes}
    <polygon points="${shape}" fill="#3ddc84" fill-opacity="0.18" stroke="#3ddc84" stroke-width="2"/>
    ${dots}${labels}
  </svg>`;
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
          <div class="score-bar-track"><div class="score-bar-fill hi" style="width:${(s / 5) * 100}%"></div></div>
          <p class="drawer-crit-rationale">${deal.rationale[c.key]}</p>
        </div>
      `;
    })
    .join("");

  body.innerHTML = `
    <div class="drawer-badge stage-${slug(deal.stage)}">${deal.stage}</div>
    <h2 class="drawer-title">${deal.name}</h2>
    <p class="drawer-sub">${deal.vertical} · ${deal.location}</p>
    <div class="drawer-radar">${radarSVG(deal)}</div>
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
