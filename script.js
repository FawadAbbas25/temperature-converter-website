const UNITS = {
  C: { name: "Celsius", symbol: "°C", min: -273.15 },
  F: { name: "Fahrenheit", symbol: "°F", min: -459.67 },
  K: { name: "Kelvin", symbol: "K", min: 0 }
};

const state = { view: "all", precision: 2, target: "C" };

const $ = (id) => document.getElementById(id);
const form = $("converterForm");
const input = $("temperature");
const inputWrap = $("inputWrap");
const unitSelect = $("inputUnit");
const unitTag = $("unitTag");
const inputError = $("inputError");
const targetWrap = $("targetWrap");
const targetSelect = $("targetUnit");
const infoText = $("infoText");
const resultGrid = $("resultGrid");
const resultMessage = $("resultMessage");
const statusBadge = $("statusBadge");

/* ---------- conversion ---------- */
function toCelsius(value, unit) {
  if (unit === "F") return (value - 32) * 5 / 9;
  if (unit === "K") return value - 273.15;
  return value;
}

function fromCelsius(c, unit) {
  if (unit === "F") return c * 9 / 5 + 32;
  if (unit === "K") return c + 273.15;
  return c;
}

function convertAll(value, unit) {
  const c = toCelsius(value, unit);
  return { C: c, F: fromCelsius(c, "F"), K: fromCelsius(c, "K") };
}

function format(value) {
  // Avoid "-0.00" after rounding.
  const rounded = Number(value.toFixed(state.precision));
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString(undefined, {
    minimumFractionDigits: state.precision,
    maximumFractionDigits: state.precision
  });
}

/* ---------- validation ---------- */
function validate() {
  const raw = input.value.trim();
  const unit = unitSelect.value;

  if (raw === "") return { error: "Please enter a temperature value." };
  if (!input.checkValidity() || !Number.isFinite(Number(raw))) {
    return { error: "Please enter a valid numeric temperature." };
  }

  const value = Number(raw);
  if (value < UNITS[unit].min) {
    const limit = UNITS[unit].min.toLocaleString();
    return { error: `Below absolute zero — the minimum is ${limit}${unit === "K" ? " K" : UNITS[unit].symbol}.` };
  }
  return { value, unit };
}

/* ---------- UI helpers ---------- */
function setStatus(text, kind) {
  statusBadge.textContent = text;
  statusBadge.className = "status-badge" + (kind ? " " + kind : "");
}

function showError(message) {
  inputError.textContent = message;
  inputWrap.classList.add("invalid");
  setStatus("Error", "error");
  resultMessage.textContent = message;
  resultMessage.classList.add("error");
}

function clearError() {
  inputError.textContent = "";
  inputWrap.classList.remove("invalid");
  resultMessage.classList.remove("error");
}

function visibleUnits() {
  const source = unitSelect.value;
  if (state.view === "single") return [state.target];
  return Object.keys(UNITS).filter((u) => u !== source);
}

function renderCards(results) {
  const units = visibleUnits();
  resultGrid.innerHTML = "";
  units.forEach((u) => {
    const card = document.createElement("article");
    card.className = "result-card" + (state.view === "single" ? " single" : "");

    const top = document.createElement("div");
    top.className = "result-top";
    const name = document.createElement("span");
    name.className = "result-name";
    name.textContent = UNITS[u].name;
    const tag = document.createElement("span");
    tag.className = "unit-tag";
    tag.textContent = UNITS[u].symbol;
    top.append(name, tag);

    const value = document.createElement("strong");
    value.className = "result-value" + (results ? "" : " empty");
    value.textContent = results ? `${format(results[u])} ${UNITS[u].symbol}` : "—";

    card.append(top, value);
    resultGrid.append(card);
  });
}

function updateInfo() {
  const source = unitSelect.value;
  if (state.view === "all") {
    infoText.textContent = "Converting input simultaneously to all remaining temperature scales.";
    targetWrap.hidden = true;
  } else {
    infoText.textContent = "Converting input to a single target scale.";
    targetWrap.hidden = false;
    targetSelect.innerHTML = Object.keys(UNITS)
      .filter((u) => u !== source)
      .map((u) => `<option value="${u}">${UNITS[u].name} (${UNITS[u].symbol})</option>`)
      .join("");
    if (state.target === source) {
      state.target = Object.keys(UNITS).find((u) => u !== source);
    }
    targetSelect.value = state.target;
  }
}

function syncSourceUnit(unit) {
  unitSelect.value = unit;
  unitTag.textContent = UNITS[unit].symbol;
  document.querySelectorAll(".tile").forEach((t) => {
    const on = t.dataset.unit === unit;
    t.classList.toggle("active", on);
    t.setAttribute("aria-pressed", on);
  });
  updateInfo();
}

/* ---------- main action ---------- */
function convert() {
  const data = validate();
  if (data.error) {
    showError(data.error);
    renderCards(null);
    return;
  }
  clearError();
  renderCards(convertAll(data.value, data.unit));
  setStatus("Converted");
  resultMessage.textContent = data.value === UNITS[data.unit].min
    ? "This input sits exactly at absolute zero — the lowest possible temperature."
    : "Conversion completed successfully.";
}

/* ---------- events ---------- */
form.addEventListener("submit", (e) => { e.preventDefault(); convert(); });

input.addEventListener("input", () => {
  const data = validate();
  if (data.error) { showError(data.error); return; }
  clearError();
  setStatus("Ready", "idle");
  resultMessage.textContent = "Press Convert to update the results.";
});

unitSelect.addEventListener("change", () => {
  syncSourceUnit(unitSelect.value);
  if (input.value.trim() !== "") convert();
});

document.querySelectorAll(".tile").forEach((tile) => {
  tile.addEventListener("click", () => {
    syncSourceUnit(tile.dataset.unit);
    if (input.value.trim() !== "") convert();
  });
});

document.querySelectorAll("#viewToggle .seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    document.querySelectorAll("#viewToggle .seg").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
    updateInfo();
    convert();
  });
});

document.querySelectorAll("#precisionToggle .seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.precision = Number(btn.dataset.precision);
    document.querySelectorAll("#precisionToggle .seg").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
    convert();
  });
});

targetSelect.addEventListener("change", () => {
  state.target = targetSelect.value;
  convert();
});

document.querySelectorAll(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    input.value = btn.dataset.value;
    syncSourceUnit("F"); // presets are defined in °F
    convert();
  });
});

/* ---------- init ---------- */
syncSourceUnit(unitSelect.value);
convert();
