    const RACES = [
      { label: "5K", distanceKm: 5 },
      { label: "10K", distanceKm: 10 },
      { label: "Half Marathon", distanceKm: 21.0975 },
      { label: "Marathon", distanceKm: 42.195 },
    ];

    const WORLD_RECORDS = {
      "5K": 12 * 60 + 49,
      "10K": 26 * 60 + 24,
      "Half Marathon": 56 * 60 + 42,
      "Marathon": 2 * 3600 + 35,
    };

    const GAP_PRESETS = [-10, -6, -3, 0, 3, 6, 10];

    const input = document.getElementById("paceInput");
    const helperText = document.getElementById("helperText");
    const copiedState = document.getElementById("copiedState");
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const themeToggleLabel = document.getElementById("themeToggleLabel");
    const clearBtn = document.getElementById("clearBtn");
    const shareSetupBtn = document.getElementById("shareSetupBtn");
    const recentWrap = document.getElementById("recentWrap");
    const unitRail = document.getElementById("unitRail");
    const sectionDivider = document.getElementById("sectionDivider");
    const dividerGame = document.getElementById("dividerGame");
    const dividerGameTrack = document.getElementById("dividerGameTrack");
    const dividerGameRunner = document.getElementById("dividerGameRunner");
    const dividerGameHint = document.getElementById("dividerGameHint");
    const dividerGameLive = document.getElementById("dividerGameLive");
    const dividerGameScore = document.getElementById("dividerGameScore");
    const projectionContent = document.getElementById("projectionContent");
    const projectionSubtitle = document.getElementById("projectionSubtitle");
    const vdotContent = document.getElementById("vdotContent");
    const vdotSubtitle = document.getElementById("vdotSubtitle");
    const trainingSubtitle = document.getElementById("trainingSubtitle");
    const trainingContent = document.getElementById("trainingContent");
    const gapSubtitle = document.getElementById("gapSubtitle");
    const gapGradeInput = document.getElementById("gapGradeInput");
    const gapPresetRow = document.getElementById("gapPresetRow");
    const gapTableWrap = document.getElementById("gapTableWrap");
    const splitsSubtitle = document.getElementById("splitsSubtitle");
    const splitToggleRow = document.getElementById("splitToggleRow");
    const splitBiasInput = document.getElementById("splitBiasInput");
    const splitBiasValue = document.getElementById("splitBiasValue");
    const splitsTableWrap = document.getElementById("splitsTableWrap");

    let currentInputType = "minPerKm";
    let selectedVdotRace = "5K";
    let selectedSplitRace = "5K";
    let hasAutoSelectedInput = false;
    let recentEntries = [];
    let currentTheme = "light";
    const dividerGameState = {
      active: false,
      rafId: 0,
      resetTimer: 0,
      lastFrame: 0,
      startTime: 0,
      lastSpawn: 0,
      score: 0,
      jumpVelocity: 0,
      jumpOffset: 0,
      runPhase: 0,
      obstacles: [],
    };

    const outputEls = {
      minPerKm: document.getElementById("value-minPerKm"),
      minPerMile: document.getElementById("value-minPerMile"),
      kmh: document.getElementById("value-kmh"),
      mph: document.getElementById("value-mph"),
    };

    const TRAINING_BANDS = [
      { label: "Easy", low: 0.59, high: 0.74, note: "Comfortable aerobic running and recovery miles." },
      { label: "Marathon", low: 0.75, high: 0.84, note: "Steady long-effort rhythm for marathon-specific work." },
      { label: "Threshold", low: 0.83, high: 0.88, note: "Controlled tempo effort you can hold without fading." },
      { label: "Interval", low: 0.97, high: 1.0, note: "VO2-focused reps with strong but repeatable effort." },
      { label: "Repetition", low: 1.05, high: 1.1, note: "Fast relaxed work for economy, turnover, and form." },
    ];

    const DETAILS_PANELS = [
      "projectionPanel",
      "vdotPanel",
      "trainingPanel",
      "gapPanel",
      "splitsPanel",
    ].map((id) => document.getElementById(id)).filter(Boolean);

    const TOOLTIP_WRAPS = Array.from(document.querySelectorAll(".tooltip-wrap"));

    function setTooltipPanelState(wrap, isOpen) {
      const panel = wrap.closest(".projection-panel");
      if (!panel) return;
      panel.classList.toggle("has-tooltip-open", isOpen);
    }

    function round(value, digits = 2) {
      const factor = 10 ** digits;
      return Math.round(value * factor) / factor;
    }

    function applyTheme(theme) {
      currentTheme = theme === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
      themeToggleBtn.setAttribute("aria-pressed", String(currentTheme === "dark"));
      themeToggleLabel.textContent = currentTheme === "dark" ? "Light mode" : "Dark mode";
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", currentTheme === "dark" ? "#07111f" : "#fafafa");
      }
      try {
        window.localStorage.setItem("mypaceTheme", currentTheme);
      } catch {}
    }

    function loadThemePreference() {
      try {
        const storedTheme = window.localStorage.getItem("mypaceTheme");
        if (storedTheme === "dark" || storedTheme === "light") {
          applyTheme(storedTheme);
          return;
        }
      } catch {}
      applyTheme("light");
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }

    function triggerLightHaptic() {
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    }

    function inverseOxygenCost(targetCost) {
      const a = 0.000104;
      const b = 0.182258;
      const c = -4.6 - targetCost;
      const discriminant = b * b - 4 * a * c;
      if (discriminant <= 0) return null;
      return (-b + Math.sqrt(discriminant)) / (2 * a);
    }

    function velocityToMinPerKm(velocityMetersPerMinute) {
      if (!isFinite(velocityMetersPerMinute) || velocityMetersPerMinute <= 0) return null;
      return 1000 / velocityMetersPerMinute;
    }

    function formatPaceBand(lowMinPerKm, highMinPerKm, system) {
      if (!lowMinPerKm || !highMinPerKm) return "—";
      const faster = system === "imperial" ? lowMinPerKm * 1.609344 : lowMinPerKm;
      const slower = system === "imperial" ? highMinPerKm * 1.609344 : highMinPerKm;
      const unitLabel = system === "imperial" ? "/mi" : "/km";
      return `${decimalMinutesToPace(faster)}-${decimalMinutesToPace(slower)} ${unitLabel}`;
    }

    function buildShareUrl() {
      const url = new URL(window.location.href);
      url.search = "";
      const params = url.searchParams;
      if (input.value.trim()) {
        params.set("value", sanitizeNumericInput(input.value.trim()));
      }
      params.set("unit", currentInputType);
      params.set("vdotRace", selectedVdotRace);
      params.set("splitRace", selectedSplitRace);
      params.set("splitBias", String(splitBiasInput.value));
      params.set("grade", String(gapGradeInput.value));
      return url.toString();
    }

    function loadRecentEntries() {
      try {
        recentEntries = JSON.parse(window.localStorage.getItem("mypaceRecentEntries") || "[]");
        if (!Array.isArray(recentEntries)) recentEntries = [];
      } catch {
        recentEntries = [];
      }
    }

    function persistRecentEntries() {
      try {
        window.localStorage.setItem("mypaceRecentEntries", JSON.stringify(recentEntries.slice(0, 5)));
      } catch {}
    }

    function renderRecentEntries() {
      recentWrap.innerHTML = "";
      if (!recentEntries.length) return;

      const label = document.createElement("span");
      label.className = "recent-label";
      label.textContent = "Recent";
      recentWrap.appendChild(label);

      recentEntries.forEach((entry) => {
        const button = document.createElement("button");
        button.className = "recent-chip";
        button.type = "button";
        button.textContent = entry.value;
        button.addEventListener("click", () => {
          input.value = entry.value;
          currentInputType = entry.unit;
          render();
          if (shouldRefocusInputAfterUnitChange()) {
            input.focus();
          }
        });
        recentWrap.appendChild(button);
      });

      const clearButton = document.createElement("button");
      clearButton.className = "recent-clear";
      clearButton.type = "button";
      clearButton.textContent = "Clear";
      clearButton.addEventListener("click", () => {
        recentEntries = [];
        persistRecentEntries();
        renderRecentEntries();
      });
      recentWrap.appendChild(clearButton);
    }

    function saveRecentEntry(parsed) {
      if (!parsed || !input.value.trim()) return;
      const entry = {
        value: sanitizeNumericInput(input.value.trim()),
        unit: currentInputType,
      };
      if (!entry.value) return;
      if (entry.value === "5:30" && entry.unit === "minPerKm") return;
      recentEntries = recentEntries.filter((item) => item.value !== entry.value);
      recentEntries.unshift(entry);
      recentEntries = recentEntries.slice(0, 5);
      persistRecentEntries();
      renderRecentEntries();
    }

    function animateDetails(details, opening) {
      const content = details.querySelector(".projection-content, .section-body");
      const summary = details.querySelector(".projection-summary");
      if (!content || !summary || details.dataset.animating === "true") return;

      const startHeight = details.offsetHeight;
      if (opening) {
        details.open = true;
      }
      const endHeight = summary.offsetHeight + content.offsetHeight;

      details.dataset.animating = "true";
      details.classList.add("is-animating");
      details.style.height = `${startHeight}px`;
      details.style.overflow = "hidden";

      requestAnimationFrame(() => {
        details.style.transition = "height 240ms ease";
        details.style.height = `${opening ? endHeight : summary.offsetHeight}px`;
      });

      window.setTimeout(() => {
        if (!opening) {
          details.open = false;
        }
        details.style.height = "";
        details.style.transition = "";
        details.style.overflow = "";
        details.dataset.animating = "false";
        details.classList.remove("is-animating");
      }, 260);
    }

    function getInputTypeLabel(type = currentInputType) {
      if (type === "minPerKm") return "min/km";
      if (type === "minPerMile") return "min/mi";
      if (type === "kmh") return "km/h";
      if (type === "mph") return "mph";
      return type;
    }

    function shouldRefocusInputAfterUnitChange() {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }

    function updateInputPlaceholder() {
      input.placeholder = "Type a number. Use the quick unit below to change units.";
    }

    function resetCopiedStateSoon() {
      window.clearTimeout(resetCopiedStateSoon._timer);
      resetCopiedStateSoon._timer = window.setTimeout(() => {
        copiedState.textContent = "Made by";
      }, 1200);
    }

    function setCopiedState(text) {
      copiedState.textContent = text;
      resetCopiedStateSoon();
    }

    function showCopyFeedback(trigger, options = {}) {
      if (!trigger) return;

      const {
        activeClass = "is-copied",
        labelSelector = "",
        copiedLabel = "Copied",
      } = options;

      trigger.classList.add(activeClass);
      window.clearTimeout(trigger._copyFeedbackTimer);

      let labelEl = null;
      let originalLabel = "";

      if (labelSelector) {
        labelEl = trigger.querySelector(labelSelector);
        if (labelEl) {
          originalLabel = trigger.dataset.copyFeedbackOriginalLabel || labelEl.textContent;
          trigger.dataset.copyFeedbackOriginalLabel = originalLabel;
          labelEl.textContent = copiedLabel;
        }
      } else {
        originalLabel = trigger.dataset.copyFeedbackOriginalText || trigger.textContent;
        trigger.dataset.copyFeedbackOriginalText = originalLabel;
        trigger.textContent = copiedLabel;
      }

      trigger._copyFeedbackTimer = window.setTimeout(() => {
        trigger.classList.remove(activeClass);
        if (labelEl) {
          labelEl.textContent = trigger.dataset.copyFeedbackOriginalLabel || originalLabel;
        } else if (originalLabel) {
          trigger.textContent = trigger.dataset.copyFeedbackOriginalText || originalLabel;
        }
      }, 1100);
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function decimalMinutesToPace(decimalMinutes) {
      if (!isFinite(decimalMinutes) || decimalMinutes <= 0) return "—";
      const totalSeconds = Math.round(decimalMinutes * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }

    function secondsToClock(totalSeconds) {
      if (!isFinite(totalSeconds) || totalSeconds <= 0) return "—";
      const roundedSeconds = Math.round(totalSeconds);
      const hours = Math.floor(roundedSeconds / 3600);
      const minutes = Math.floor((roundedSeconds % 3600) / 60);
      const seconds = roundedSeconds % 60;
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    function getPreferredSystem(type = currentInputType) {
      if (!type) return "metric";
      return type === "mph" || type === "minPerMile" ? "imperial" : "metric";
    }

    function formatPaceForSystem(totalSeconds, distanceKm, system) {
      const paceMinutes = system === "imperial"
        ? totalSeconds / 60 / (distanceKm / 1.609344)
        : totalSeconds / 60 / distanceKm;
      return `${decimalMinutesToPace(paceMinutes)} ${system === "imperial" ? "/mi" : "/km"}`;
    }

    function formatSpeedRows(minPerKm) {
      const kmh = 60 / minPerKm;
      const mph = kmh / 1.609344;
      return [
        { unit: "Minutes / kilometer", value: `${decimalMinutesToPace(minPerKm)} /km` },
        { unit: "Minutes / mile", value: `${decimalMinutesToPace(60 / mph)} /mi` },
        { unit: "Kilometers / hour", value: `${round(kmh, 2)} km/h` },
        { unit: "Miles / hour", value: `${round(mph, 2)} mph` },
      ];
    }

    function getRaceByLabel(label) {
      return RACES.find((race) => race.label === label);
    }

    function refreshUnitRail() {
      unitRail.querySelectorAll("[data-unit-target]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.unitTarget === currentInputType);
      });
    }

    function refreshActiveResultCard() {
      document.querySelectorAll(".result-card").forEach((card) => {
        card.classList.toggle("is-active-unit", card.dataset.copyType === currentInputType);
      });
    }

    function calculateVdot(distanceMeters, timeMinutes) {
      const velocity = distanceMeters / timeMinutes;
      const oxygenCost = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
      const percentMax =
        0.8 +
        0.1894393 * Math.exp(-0.012778 * timeMinutes) +
        0.2989558 * Math.exp(-0.1932605 * timeMinutes);
      return oxygenCost / percentMax;
    }

    function solveRaceTimeMinutes(distanceMeters, targetVdot) {
      let low = 1;
      let high = 1000;

      for (let i = 0; i < 80; i += 1) {
        const mid = (low + high) / 2;
        const currentVdot = calculateVdot(distanceMeters, mid);
        if (currentVdot > targetVdot) {
          low = mid;
        } else {
          high = mid;
        }
      }

      return (low + high) / 2;
    }

    function calculateGradeAdjustedMinPerKm(minPerKm, gradePercent) {
      const grade = Math.max(-0.30, Math.min(0.30, gradePercent / 100));
      const flatCost = 3.6;
      const gradeCost =
        155.4 * grade ** 5 -
        30.4 * grade ** 4 -
        43.3 * grade ** 3 +
        46.3 * grade ** 2 +
        19.5 * grade +
        3.6;

      if (!isFinite(gradeCost) || gradeCost <= 0) return null;
      return minPerKm * (flatCost / gradeCost);
    }

    function getSplitBiasLabel(bias) {
      if (bias === 0) return "Even";
      return `${bias > 0 ? "+" : ""}${bias}%`;
    }

    function buildSplitRows(distanceKm, system, minPerKm, bias) {
      const unitDistanceKm = system === "imperial" ? 1.609344 : 1;
      const unitLabel = system === "imperial" ? "mi" : "km";
      const segments = [];
      let coveredKm = 0;

      while (coveredKm < distanceKm - 1e-9) {
        const segmentKm = Math.min(unitDistanceKm, distanceKm - coveredKm);
        coveredKm += segmentKm;
        segments.push({ segmentKm, coveredKm });
      }

      const biasFactor = bias / 100;
      const weightedSegments = segments.map((segment, index) => {
        const normalized = segments.length === 1 ? 0 : (index / (segments.length - 1)) * 2 - 1;
        const baseSeconds = minPerKm * segment.segmentKm * 60;
        const rawSeconds = baseSeconds * Math.max(0.35, 1 + biasFactor * normalized);
        return { ...segment, baseSeconds, rawSeconds };
      });

      const baseTotal = weightedSegments.reduce((sum, segment) => sum + segment.baseSeconds, 0);
      const rawTotal = weightedSegments.reduce((sum, segment) => sum + segment.rawSeconds, 0);
      const normalization = rawTotal > 0 ? baseTotal / rawTotal : 1;

      const rows = [];
      let index = 1;
      let cumulativeSeconds = 0;

      weightedSegments.forEach((segment) => {
        const splitSeconds = segment.rawSeconds * normalization;
        cumulativeSeconds += splitSeconds;
        const displayedDistance = system === "imperial" ? segment.coveredKm / 1.609344 : segment.coveredKm;
        rows.push({
          distanceLabel: `${round(displayedDistance, displayedDistance % 1 === 0 ? 0 : 1)} ${unitLabel}`,
          split: secondsToClock(splitSeconds),
          cumulative: secondsToClock(cumulativeSeconds),
          copySplit: `${index} ${unitLabel} split: ${secondsToClock(splitSeconds)}`,
          copyCumulative: `${round(displayedDistance, displayedDistance % 1 === 0 ? 0 : 1)} ${unitLabel}: ${secondsToClock(cumulativeSeconds)}`,
        });
        index += 1;
      });

      return rows;
    }

    function sanitizeNumericInput(value) {
      const raw = value.replace(/[^\d:.]/g, "");
      let hasColon = false;
      let hasDot = false;
      let sanitized = "";

      for (const char of raw) {
        if (/\d/.test(char)) {
          sanitized += char;
          continue;
        }

        if (char === ":" && !hasColon && !hasDot) {
          hasColon = true;
          sanitized += char;
          continue;
        }

        if (char === "." && !hasDot && !hasColon) {
          hasDot = true;
          sanitized += char;
        }
      }

      return sanitized;
    }

    function parsePaceLike(value, type = currentInputType) {
      const trimmed = sanitizeNumericInput(value.trim().toLowerCase());
      if (!trimmed) return null;

      const mmss = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
      if (mmss) {
        const minutes = Number(mmss[1]);
        const seconds = Number(mmss[2]);
        if (seconds >= 60) return null;
        return {
          type,
          value: minutes + seconds / 60,
        };
      }

      const numeric = trimmed.match(/^(\d+(?:\.\d+)?)$/);
      if (numeric) {
        const amount = Number(numeric[1]);
        return { type, value: amount };
      }

      return null;
    }

    function convert(parsed) {
      if (!parsed) return null;

      let kmh;
      switch (parsed.type) {
        case "kmh":
          kmh = parsed.value;
          break;
        case "mph":
          kmh = parsed.value * 1.609344;
          break;
        case "minPerKm":
          kmh = 60 / parsed.value;
          break;
        case "minPerMile":
          kmh = 96.56064 / parsed.value;
          break;
        default:
          return null;
      }

      const mph = kmh / 1.609344;
      const minPerKm = 60 / kmh;
      const minPerMile = 60 / mph;

      return { kmh, mph, minPerKm, minPerMile };
    }

    function setHelperText(inputValue, parsed) {
      if (!inputValue.trim()) {
        helperText.textContent = `Type only a number like 5:30 or 5.5. The active unit is ${getInputTypeLabel()}.`;
        return;
      }
      if (!parsed) {
        helperText.textContent = "Use digits with an optional : or . only. Units now live in the quick toggles below.";
        return;
      }
      helperText.textContent = "";
    }

    function renderProjections(results) {
      if (!results) {
        projectionSubtitle.textContent = "Expand to see 5K, 10K, half-marathon, and marathon estimates.";
        projectionContent.innerHTML = '<div class="projection-empty" id="projectionEmpty">Enter a valid pace or speed to generate projected race times.</div>';
        return;
      }

      projectionSubtitle.textContent = `Based on an even pace of ${decimalMinutesToPace(results.minPerKm)} /km.`;
      projectionContent.innerHTML = RACES.map((race) => {
        const totalSeconds = results.minPerKm * race.distanceKm * 60;
        const fasterThanRecord = totalSeconds < WORLD_RECORDS[race.label];
        return `
          <button class="projection-card${fasterThanRecord ? " is-record-fast" : ""}" type="button" data-projection-copy="${race.label}">
            <div>
              <div class="projection-distance">${race.label}</div>
              <div class="projection-meta">
                <div class="projection-time">${secondsToClock(totalSeconds)}</div>
                <div class="projection-copy-hint"><span class="copy-icon">⧉</span><span>copy</span></div>
              </div>
              ${fasterThanRecord ? `<div class="record-notice">Faster than the current world record of ${secondsToClock(WORLD_RECORDS[race.label])}.</div>` : ""}
            </div>
          </button>
        `;
      }).join("");

      projectionContent.querySelectorAll("[data-projection-copy]").forEach((button) => {
        button.addEventListener("click", () => {
          copyProjection(button.dataset.projectionCopy, results.minPerKm, button);
        });
      });
    }

    function renderVdotPanel(results) {
      if (!results) {
        vdotSubtitle.textContent = "Choose a race below to treat the current input as that race pace.";
        vdotContent.innerHTML = '<div class="projection-empty">Enter a valid pace or speed to unlock VDOT equivalents.</div>';
        return;
      }

      const preferredSystem = getPreferredSystem(currentInputType);
      const selectedRace = RACES.find((race) => race.label === selectedVdotRace) || RACES[0];
      const selectedTimeMinutes = results.minPerKm * selectedRace.distanceKm;
      const vdot = calculateVdot(selectedRace.distanceKm * 1000, selectedTimeMinutes);

      vdotSubtitle.textContent = "Select a different race to compare equivalents.";
      vdotContent.innerHTML = RACES.map((race) => {
        const isSelected = race.label === selectedRace.label;
        const equivalentSeconds = isSelected
          ? selectedTimeMinutes * 60
          : solveRaceTimeMinutes(race.distanceKm * 1000, vdot) * 60;

        return `
          <button class="vdot-card${isSelected ? " is-selected" : ""}" type="button" data-vdot-race="${race.label}">
            <div>
              <div class="projection-distance">${race.label}</div>
              <div class="vdot-estimated"><sup>Estimated</sup></div>
              <div class="projection-meta">
                <div class="projection-time">${secondsToClock(equivalentSeconds)}</div>
                <div class="projection-copy-hint"><span class="copy-icon">⧉</span><span>pick</span></div>
              </div>
            </div>
            <div class="vdot-tag">${isSelected ? `Selected basis · VDOT ${round(vdot, 1)}` : `Equivalent at VDOT ${round(vdot, 1)}`} (${formatPaceForSystem(equivalentSeconds, race.distanceKm, preferredSystem)})</div>
          </button>
        `;
      }).join("");

      vdotContent.querySelectorAll("[data-vdot-race]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedVdotRace = button.dataset.vdotRace;
          render();
        });
      });
    }

    function renderTrainingPaces(results) {
      if (!results) {
        trainingSubtitle.textContent = "VDOT-based training pace bands for everyday workouts.";
        trainingContent.innerHTML = '<div class="projection-empty">Enter a valid pace or speed to unlock training paces.</div>';
        return;
      }

      const selectedRace = RACES.find((race) => race.label === selectedVdotRace) || RACES[0];
      const selectedTimeMinutes = results.minPerKm * selectedRace.distanceKm;
      const vdot = calculateVdot(selectedRace.distanceKm * 1000, selectedTimeMinutes);
      const preferredSystem = getPreferredSystem(currentInputType);

      trainingSubtitle.textContent = `Guided by VDOT ${round(vdot, 1)} using ${selectedRace.label} as the current basis.`;
      trainingContent.innerHTML = `
        <div class="training-grid">
          ${TRAINING_BANDS.map((band) => {
            const lowVelocity = inverseOxygenCost(vdot * band.high);
            const highVelocity = inverseOxygenCost(vdot * band.low);
            const fastMinPerKm = velocityToMinPerKm(lowVelocity);
            const slowMinPerKm = velocityToMinPerKm(highVelocity);
            return `
              <div class="training-card">
                <div class="training-label">${band.label}</div>
                <div class="training-pace">${formatPaceBand(fastMinPerKm, slowMinPerKm, preferredSystem)}</div>
                <div class="training-meta">${band.note}</div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    function renderGapPresets() {
      gapPresetRow.innerHTML = GAP_PRESETS.map((value) => `
        <button class="toggle-btn${Number(gapGradeInput.value) === value ? " is-active" : ""}" type="button" data-gap-preset="${value}">
          ${value > 0 ? "+" : ""}${value}%
        </button>
      `).join("");

      gapPresetRow.querySelectorAll("[data-gap-preset]").forEach((button) => {
        button.addEventListener("click", () => {
          gapGradeInput.value = button.dataset.gapPreset;
          render();
        });
      });
    }

    function renderGapTable(results) {
      if (!results) {
        renderGapPresets();
        gapSubtitle.textContent = "Adjust the grade to see the equivalent flat pace across units.";
        gapTableWrap.innerHTML = '<div class="projection-empty">Enter a valid pace or speed to unlock grade-adjusted pacing.</div>';
        return;
      }

      const gradePercent = Math.max(-15, Math.min(15, Number(gapGradeInput.value) || 0));
      gapGradeInput.value = String(gradePercent);
      renderGapPresets();
      const adjustedMinPerKm = calculateGradeAdjustedMinPerKm(results.minPerKm, gradePercent);

      if (!adjustedMinPerKm) {
        gapTableWrap.innerHTML = '<div class="projection-empty">This grade is outside the supported range for the current model.</div>';
        return;
      }

      gapSubtitle.textContent = `Equivalent flat pacing for a ${gradePercent > 0 ? "+" : ""}${gradePercent}% grade.`;
      const rows = formatSpeedRows(adjustedMinPerKm);
      gapTableWrap.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Adjusted Pace</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><div class="table-static">${row.unit}</div></td>
                <td><button class="table-copy" type="button" data-copy-value="${row.value}">${row.value}</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      gapTableWrap.querySelectorAll("[data-copy-value]").forEach((button) => {
        button.addEventListener("click", () => {
          copyText(button.dataset.copyValue, button, { copiedLabel: "Copied" });
        });
      });
    }

    function renderSplitToggles() {
      splitToggleRow.innerHTML = RACES.map((race) => `
        <button class="toggle-btn${race.label === selectedSplitRace ? " is-active" : ""}" type="button" data-split-race="${race.label}">
          ${race.label}
        </button>
      `).join("");

      splitToggleRow.querySelectorAll("[data-split-race]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedSplitRace = button.dataset.splitRace;
          render();
        });
      });
    }

    function renderSplitsTable(results) {
      renderSplitToggles();
      const splitBias = Number(splitBiasInput.value) || 0;
      splitBiasValue.textContent = getSplitBiasLabel(splitBias);

      if (!results) {
        splitsSubtitle.textContent = "Choose a distance to view consistent split breakdowns.";
        splitsTableWrap.innerHTML = '<div class="projection-empty">Enter a valid pace or speed to unlock split tables.</div>';
        return;
      }

      const preferredSystem = getPreferredSystem(currentInputType);
      const selectedRace = getRaceByLabel(selectedSplitRace) || RACES[0];
      const rows = buildSplitRows(selectedRace.distanceKm, preferredSystem, results.minPerKm, splitBias);
      const unitLabel = preferredSystem === "imperial" ? "mi" : "km";

      const biasDescription = splitBias === 0
        ? "even"
        : splitBias > 0
          ? "positive"
          : "negative";
      splitsSubtitle.textContent = `${selectedRace.label} splits in ${unitLabel} with a ${biasDescription} bias.`;
      splitsTableWrap.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Distance</th>
              <th>Split</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><div class="table-static">${row.distanceLabel}</div></td>
                <td><button class="table-copy" type="button" data-copy-value="${row.copySplit}">${row.split}</button></td>
                <td><button class="table-copy" type="button" data-copy-value="${row.copyCumulative}">${row.cumulative}</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      splitsTableWrap.querySelectorAll("[data-copy-value]").forEach((button) => {
        button.addEventListener("click", () => {
          copyText(button.dataset.copyValue, button, { copiedLabel: "Copied" });
        });
      });
    }

    function resetDividerGameUI() {
      dividerGameTrack.querySelectorAll(".divider-game-ball").forEach((ball) => ball.remove());
      dividerGameRunner.style.transform = "translate3d(0, 0, 0)";
      dividerGameHint.style.opacity = "1";
      dividerGameLive.textContent = "Dodged 0";
      dividerGameScore.classList.remove("is-visible");
      dividerGameScore.textContent = "";
    }

    function finishDividerGame() {
      window.cancelAnimationFrame(dividerGameState.rafId);
      dividerGameState.active = false;
      dividerGameHint.style.opacity = "0";
      dividerGameScore.textContent = `Game over. Balls dodged: ${dividerGameState.score}`;
      dividerGameScore.classList.add("is-visible");
      dividerGameLive.textContent = `Dodged ${dividerGameState.score}`;
      window.clearTimeout(dividerGameState.resetTimer);
      dividerGameState.resetTimer = window.setTimeout(() => {
        sectionDivider.classList.remove("is-game");
        dividerGame.setAttribute("aria-hidden", "true");
        resetDividerGameUI();
      }, 2400);
    }

    function jumpDividerRunner() {
      if (!dividerGameState.active) return;
      if (dividerGameState.jumpOffset > 4) return;
      dividerGameState.jumpVelocity = 520;
      dividerGameHint.style.opacity = "0";
    }

    function spawnDividerBall(now) {
      const elapsed = (now - dividerGameState.startTime) / 1000;
      const difficulty = 1 + elapsed / 8;
      const ballEl = document.createElement("span");
      ballEl.className = "divider-game-ball";
      dividerGameTrack.appendChild(ballEl);

      dividerGameState.obstacles.push({
        el: ballEl,
        x: dividerGameTrack.clientWidth + 18,
        size: 13 + Math.min(7, difficulty),
        speed: 180 + difficulty * 26 + Math.random() * 22,
        amplitude: 8 + Math.random() * (14 + difficulty * 4),
        frequency: 2 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        baseY: 18 + Math.random() * 30,
        counted: false,
      });
    }

    function runDividerGame(now) {
      if (!dividerGameState.active) return;

      if (!dividerGameState.lastFrame) {
        dividerGameState.lastFrame = now;
        dividerGameState.startTime = now;
        dividerGameState.lastSpawn = now;
      }

      const dt = Math.min(0.032, (now - dividerGameState.lastFrame) / 1000);
      dividerGameState.lastFrame = now;
      const elapsed = (now - dividerGameState.startTime) / 1000;

      dividerGameState.jumpVelocity -= 1120 * dt;
      dividerGameState.jumpOffset = Math.max(0, dividerGameState.jumpOffset + dividerGameState.jumpVelocity * dt);
      if (dividerGameState.jumpOffset === 0 && dividerGameState.jumpVelocity < 0) {
        dividerGameState.jumpVelocity = 0;
      }

      dividerGameState.runPhase += dt * 4.2;
      const runnerX = Math.sin(dividerGameState.runPhase) * (10 + Math.min(12, elapsed * 0.7));
      const runnerY = -dividerGameState.jumpOffset;
      dividerGameRunner.style.transform = `translate3d(${runnerX}px, ${runnerY}px, 0)`;

      const spawnInterval = Math.max(280, 820 - elapsed * 38 - dividerGameState.score * 7);
      if (now - dividerGameState.lastSpawn >= spawnInterval) {
        const extraBallChance = clamp((elapsed - 7) / 18, 0, 0.52);
        const spawnCount = Math.random() < extraBallChance ? 2 : 1;
        for (let i = 0; i < spawnCount; i += 1) {
          spawnDividerBall(now + i * 90);
        }
        dividerGameState.lastSpawn = now;
      }

      const runnerRect = {
        left: 56 + runnerX + 9,
        right: 56 + runnerX + 21,
        top: 50 + runnerY,
        bottom: 64 + runnerY,
      };

      dividerGameState.obstacles = dividerGameState.obstacles.filter((obstacle) => {
        obstacle.x -= obstacle.speed * dt;
        const y = obstacle.baseY + Math.sin(elapsed * obstacle.frequency + obstacle.phase) * obstacle.amplitude;
        obstacle.el.style.width = `${obstacle.size}px`;
        obstacle.el.style.height = `${obstacle.size}px`;
        obstacle.el.style.transform = `translate3d(${obstacle.x}px, ${y}px, 0)`;

        const left = obstacle.x;
        const right = obstacle.x + obstacle.size;
        const top = y;
        const bottom = y + obstacle.size;

        const ballCenterX = left + obstacle.size / 2;
        const ballCenterY = top + obstacle.size / 2;
        const nearestX = clamp(ballCenterX, runnerRect.left, runnerRect.right);
        const nearestY = clamp(ballCenterY, runnerRect.top, runnerRect.bottom);
        const dx = ballCenterX - nearestX;
        const dy = ballCenterY - nearestY;
        const collisionRadius = obstacle.size * 0.38;

        if (dx * dx + dy * dy < collisionRadius * collisionRadius) {
          obstacle.el.remove();
          finishDividerGame();
          return false;
        }

        if (!obstacle.counted && right < runnerRect.left) {
          obstacle.counted = true;
          dividerGameState.score += 1;
          dividerGameLive.textContent = `Dodged ${dividerGameState.score}`;
        }

        if (right < -20) {
          obstacle.el.remove();
          return false;
        }

        return true;
      });

      if (!dividerGameState.active) return;
      dividerGameState.rafId = window.requestAnimationFrame(runDividerGame);
    }

    function startDividerGame() {
      if (dividerGameState.active) {
        jumpDividerRunner();
        return;
      }

      window.clearTimeout(dividerGameState.resetTimer);
      dividerGameState.active = true;
      dividerGameState.rafId = 0;
      dividerGameState.lastFrame = 0;
      dividerGameState.startTime = 0;
      dividerGameState.lastSpawn = 0;
      dividerGameState.score = 0;
      dividerGameState.jumpVelocity = 0;
      dividerGameState.jumpOffset = 0;
      dividerGameState.runPhase = 0;
      dividerGameState.obstacles = [];
      sectionDivider.classList.add("is-game");
      dividerGame.setAttribute("aria-hidden", "false");
      resetDividerGameUI();
      dividerGameHint.textContent = "Click or press Enter to jump";
      dividerGameState.rafId = window.requestAnimationFrame(runDividerGame);
    }

    async function copyProjection(raceLabel, minPerKm, trigger) {
      const race = RACES.find((item) => item.label === raceLabel);
      if (!race) return;

      const text = `${race.label}: ${secondsToClock(minPerKm * race.distanceKm * 60)}`;

      copyText(text, trigger, {
        labelSelector: ".projection-copy-hint span:last-child",
        copiedLabel: "Copied",
      });
    }

    async function copyText(text, trigger, feedbackOptions) {
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        triggerLightHaptic();
        setCopiedState(`Copied ${text}`);
        showCopyFeedback(trigger, feedbackOptions);
      } catch {
        copiedState.textContent = "Copy failed";
      }
    }

    function render() {
      const sanitizedValue = sanitizeNumericInput(input.value);
      if (input.value !== sanitizedValue) {
        input.value = sanitizedValue;
      }

      const parsed = parsePaceLike(input.value, currentInputType);
      const results = convert(parsed);

      updateInputPlaceholder();
      setHelperText(input.value, parsed);
      refreshUnitRail();
      refreshActiveResultCard();
      renderProjections(results);
      renderVdotPanel(results);
      renderTrainingPaces(results);
      renderGapTable(results);
      renderSplitsTable(results);

      outputEls.minPerKm.textContent = results ? decimalMinutesToPace(results.minPerKm) : "—";
      outputEls.minPerMile.textContent = results ? decimalMinutesToPace(results.minPerMile) : "—";
      outputEls.kmh.textContent = results ? String(round(results.kmh, 2)) : "—";
      outputEls.mph.textContent = results ? String(round(results.mph, 2)) : "—";
    }

    async function copyByType(type, trigger) {
      const parsed = parsePaceLike(input.value, currentInputType);
      const results = convert(parsed);
      if (!results) return;

      let text = "";
      if (type === "minPerKm") text = `${decimalMinutesToPace(results.minPerKm)} /km`;
      if (type === "minPerMile") text = `${decimalMinutesToPace(results.minPerMile)} /mi`;
      if (type === "kmh") text = `${round(results.kmh, 2)} km/h`;
      if (type === "mph") text = `${round(results.mph, 2)} mph`;
      copyText(text, trigger, {
        labelSelector: ".result-suffix span:last-child",
        copiedLabel: "Copied",
      });
    }

    function hydrateInputFromQuery() {
      const rawSearch = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
      if (rawSearch && !rawSearch.includes("=")) {
        input.value = sanitizeNumericInput(decodeURIComponent(rawSearch.replace(/\+/g, " ")));
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const seededValue = params.get("q") || params.get("pace") || params.get("value");
      if (seededValue) {
        input.value = sanitizeNumericInput(seededValue);
      }
      const seededUnit = params.get("unit");
      if (seededUnit && ["minPerKm", "minPerMile", "kmh", "mph"].includes(seededUnit)) {
        currentInputType = seededUnit;
      }
      const seededVdotRace = params.get("vdotRace");
      if (seededVdotRace && RACES.some((race) => race.label === seededVdotRace)) {
        selectedVdotRace = seededVdotRace;
      }
      const seededSplitRace = params.get("splitRace");
      if (seededSplitRace && RACES.some((race) => race.label === seededSplitRace)) {
        selectedSplitRace = seededSplitRace;
      }
      const seededSplitBias = params.get("splitBias");
      if (seededSplitBias !== null) {
        splitBiasInput.value = String(clamp(Number(seededSplitBias) || 0, -20, 20));
      }
      const seededGrade = params.get("grade");
      if (seededGrade !== null) {
        gapGradeInput.value = String(clamp(Number(seededGrade) || 0, -15, 15));
      }
    }

    clearBtn.addEventListener("click", () => {
      input.value = "";
      render();
      input.focus();
    });

    themeToggleBtn.addEventListener("click", () => {
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });

    shareSetupBtn.addEventListener("click", async () => {
      const shareUrl = buildShareUrl();
      await copyText(shareUrl, shareSetupBtn, { copiedLabel: "Copied link" });
    });

    input.addEventListener("focus", () => {
      if (hasAutoSelectedInput) return;
      hasAutoSelectedInput = true;
      window.requestAnimationFrame(() => {
        input.select();
      });
    });

    unitRail.querySelectorAll("[data-unit-target]").forEach((button) => {
      button.addEventListener("click", () => {
        currentInputType = button.dataset.unitTarget;
        render();
        if (shouldRefocusInputAfterUnitChange()) {
          input.focus();
        }
      });
    });

    sectionDivider.addEventListener("click", () => {
      startDividerGame();
    });

    input.addEventListener("input", render);
    input.addEventListener("blur", () => {
      const parsed = parsePaceLike(input.value, currentInputType);
      saveRecentEntry(parsed);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;

      const unitButtons = Array.from(unitRail.querySelectorAll("[data-unit-target]"));
      const activeIndex = unitButtons.findIndex((button) => button.classList.contains("is-active"));
      const currentIndex = activeIndex >= 0 ? activeIndex : -1;
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + unitButtons.length) % unitButtons.length;

      event.preventDefault();
      unitButtons[nextIndex].click();
    });
    gapGradeInput.addEventListener("input", render);
    splitBiasInput.addEventListener("input", render);
    window.addEventListener("keydown", (event) => {
      if (!dividerGameState.active) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        jumpDividerRunner();
      }
    });

    document.querySelectorAll(".result-card").forEach((card) => {
      card.addEventListener("click", () => {
        copyByType(card.dataset.copyType, card);
      });
    });

    TOOLTIP_WRAPS.forEach((wrap) => {
      const trigger = wrap.querySelector("[data-tooltip-trigger]");
      if (!trigger) return;

      wrap.addEventListener("mouseenter", () => {
        setTooltipPanelState(wrap, true);
      });

      wrap.addEventListener("mouseleave", () => {
        if (!wrap.classList.contains("is-open")) {
          setTooltipPanelState(wrap, false);
        }
      });

      wrap.addEventListener("focusin", () => {
        setTooltipPanelState(wrap, true);
      });

      wrap.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (!wrap.matches(":focus-within") && !wrap.classList.contains("is-open")) {
            setTooltipPanelState(wrap, false);
          }
        }, 0);
      });

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const willOpen = !wrap.classList.contains("is-open");
        TOOLTIP_WRAPS.forEach((item) => {
          item.classList.remove("is-open");
          setTooltipPanelState(item, false);
          const itemTrigger = item.querySelector("[data-tooltip-trigger]");
          if (itemTrigger) {
            itemTrigger.setAttribute("aria-expanded", "false");
          }
        });

        if (willOpen) {
          wrap.classList.add("is-open");
          setTooltipPanelState(wrap, true);
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".tooltip-wrap")) return;
      TOOLTIP_WRAPS.forEach((wrap) => {
        wrap.classList.remove("is-open");
        setTooltipPanelState(wrap, false);
        const trigger = wrap.querySelector("[data-tooltip-trigger]");
        if (trigger) {
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    });

    DETAILS_PANELS.forEach((details) => {
      const summary = details.querySelector(".projection-summary");
      if (!summary) return;
      summary.addEventListener("click", (event) => {
        event.preventDefault();
        animateDetails(details, !details.open);
      });
    });

    loadThemePreference();
    registerServiceWorker();
    loadRecentEntries();
    renderRecentEntries();
    hydrateInputFromQuery();
    render();
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  
