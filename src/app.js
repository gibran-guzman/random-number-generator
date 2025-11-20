document.addEventListener("DOMContentLoaded", () => {
  const getById = (id) => document.getElementById(id);
  const mSelect = getById("m");
  const aInput = getById("a");
  const cInput = getById("c");
  const seedInput = getById("seed");
  const countInput = getById("count");
  const generateButton = getById("generate");
  const resetButton = getById("reset");
  const messageBox = getById("messages");
  const resultsTbody = document.querySelector("#table tbody");
  const scatterChartElement = getById("scatterChart");
  const chartCtx = scatterChartElement
    ? scatterChartElement.getContext("2d")
    : null;
  const DEFAULTS = { m: "16", a: 17, c: 1, seed: 1, count: 10 };
  const mHelp = getById("mHelp");
  const seedHelp = getById("seedHelp");
  const countHelp = getById("countHelp");

  const validationSection = getById("validationSection");
  const independenceIcon = getById("independenceIcon");
  const uniformityIcon = getById("uniformityIcon");
  const meanIcon = getById("meanIcon");
  const varianceIcon = getById("varianceIcon");
  const independenceDetails = getById("independenceDetails");
  const uniformityDetails = getById("uniformityDetails");
  const meanDetails = getById("meanDetails");
  const varianceDetails = getById("varianceDetails");
  const resultBadge = getById("resultBadge");
  const badgeIcon = getById("badgeIcon");
  const badgeText = getById("badgeText");
  const resultMessage = getById("resultMessage");
  const regenerateBtn = getById("regenerateBtn");

  let lastResults = [];

  function getExponent(m) {
    return Math.log2(parseInt(m));
  }

  function validateNonNegative(input, fieldName) {
    const value = parseFloat(input.value);
    if (value < 0) {
      input.value = Math.abs(value);
      setMessage(
        `No se permiten números negativos en ${fieldName}. Se ha convertido a positivo.`
      );
      return false;
    }
    return true;
  }

  function nextPowerOf2(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  function updateModuleBasedOnCount() {
    const count = parseInt(countInput.value);
    if (!isNaN(count) && count > 0) {
      const requiredM = nextPowerOf2(count);
      const options = Array.from(mSelect.options);
      const bestOption = options.reduce((prev, curr) => {
        const prevDiff = Math.abs(parseInt(prev.value) - requiredM);
        const currDiff = Math.abs(parseInt(curr.value) - requiredM);
        return currDiff < prevDiff ? curr : prev;
      });
      mSelect.value = bestOption.value;
      setMessage(
        `Se ha ajustado el módulo a ${bestOption.value} para acomodar ${count} números.`,
        false
      );
      updateMRelatedHelp();
    }
  }

  [
    { input: aInput, name: "multiplicador a" },
    { input: cInput, name: "constante c" },
    { input: seedInput, name: "semilla X₀" },
  ].forEach(({ input, name }) => {
    input.addEventListener("input", () => validateNonNegative(input, name));
  });

  countInput.addEventListener("input", () => {
    if (validateNonNegative(countInput, "cantidad n")) {
      updateModuleBasedOnCount();
    }
  });

  mSelect.addEventListener("change", () => {
    const m = parseInt(mSelect.value);
    if (m) {
      setMessage("", false);
    }
    updateMRelatedHelp();
  });

  function updateMRelatedHelp() {
    const m = parseInt(mSelect.value);
    if (m && isPowerOfTwo(m)) {
      const g = getExponent(m);
      if (mHelp) mHelp.textContent = `Auto: ${m} | g = ${g} | m = 2^${g}`;
      if (seedHelp) seedHelp.textContent = `0 ≤ semilla < ${m}`;
      if (countHelp) countHelp.textContent = `Números a generar (g = ${g})`;
    }
  }

  function setMessage(text = "", isError = true) {
    messageBox.textContent = text;
    messageBox.style.color = isError ? "var(--danger)" : "green";
  }

  function isIntegerString(value) {
    if (value === "" || value === null || value === undefined) return false;
    return /^\d+$/.test(String(value).trim());
  }

  function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function isRelativelyPrime(a, b) {
    return gcd(a, b) === 1;
  }

  function parseAndValidateInputs() {
    const mVal = mSelect.value;
    const aVal = aInput.value;
    const cVal = cInput.value;
    const seedVal = seedInput.value;
    const countVal = countInput.value;

    if (![mVal, aVal, cVal, seedVal, countVal].every(isIntegerString)) {
      setMessage("Todos los parámetros deben ser enteros positivos.");
      return null;
    }

    const m = Number(mVal);
    const a = Number(aVal);
    const c = Number(cVal);
    const seed = Number(seedVal);
    const count = Number(countVal);

    if (c % 2 === 0) {
      setMessage("El incremento c debe ser impar.");
      return null;
    }

    if (!isRelativelyPrime(c, m)) {
      setMessage("El incremento c debe ser relativamente primo a m.");
      return null;
    }

    if (seed < 0 || seed >= m) {
      setMessage(`La semilla debe cumplir 0 ≤ semilla < ${m}.`);
      return null;
    }

    if ((a - 1) % 4 !== 0) {
      const sugerencia = Math.floor((a - 1) / 4);
      const valorSugerido = 1 + 4 * sugerencia;
      setMessage(
        `⚠️ Advertencia: Para periodo máximo, a debe ser 1+4k. Sugerencia: a=${valorSugerido} (k=${sugerencia}) o a=${
          valorSugerido + 4
        } (k=${sugerencia + 1}). Generando de todas formas...`,
        false
      );
    } else {
      setMessage("", false);
    }

    return { m, a, c, seed, count };
  }

  function createScatterChart(context) {
    return new Chart(context, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "u_k",
            data: [],
            pointRadius: 4,
            backgroundColor: "#2B7FFF",
          },
        ],
      },
      options: {
        animation: false,
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "índice #" },
            ticks: { precision: 0 },
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: "Valor normalizado" },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  const scatterChart = createScatterChart(chartCtx);

  function renderResultsTable(results) {
    resultsTbody.innerHTML = "";
    results.forEach((row, index) => {
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = index + 1;

      const tdX = document.createElement("td");
      tdX.textContent = row.X;

      const tdu = document.createElement("td");
      tdu.textContent = row.u.toFixed(4);

      tr.appendChild(tdIndex);
      tr.appendChild(tdX);
      tr.appendChild(tdu);
      resultsTbody.appendChild(tr);
    });
  }

  function updateScatterChart(results) {
    const points = results.map((r, i) => ({ x: i + 1, y: r.u }));
    scatterChart.data.datasets[0].data = points;
    scatterChart.update();
  }

  function testIndependence(uValues) {
    const n = uValues.length;
    if (n < 2)
      return { pass: false, message: "Se requieren al menos 2 valores" };

    const mean = uValues.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;

    for (let i = 0; i < n - 1; i++) {
      num += (uValues[i] - mean) * (uValues[i + 1] - mean);
    }
    for (let i = 0; i < n; i++) {
      den += (uValues[i] - mean) * (uValues[i] - mean);
    }

    if (den === 0)
      return {
        pass: false,
        r: 0,
        threshold: 0,
        message:
          "Varianza cero: todos los valores son iguales (falla independencia)",
      };

    const r = num / den;
    const threshold = 1.96 / Math.sqrt(n);
    const pass = Math.abs(r) <= threshold;

    return {
      pass,
      r: r.toFixed(4),
      threshold: threshold.toFixed(4),
      message: pass ? `No se detecta correlación` : `Correlación detectada`,
    };
  }

  function testUniformity(uValues) {
    const n = uValues.length;
    if (n < 2)
      return { pass: false, message: "Se requieren al menos 2 valores" };

    const sorted = [...uValues].sort((a, b) => a - b);
    let dPlus = -Infinity;
    let dMinus = -Infinity;

    for (let i = 0; i < n; i++) {
      const ui = sorted[i];
      const i1 = (i + 1) / n;
      dPlus = Math.max(dPlus, i1 - ui);
      dMinus = Math.max(dMinus, ui - i / n);
    }

    const d = Math.max(dPlus, dMinus);
    const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;

    let sum = 0;
    for (let j = 1; j <= 100; j++) {
      const term = Math.pow(-1, j - 1) * Math.exp(-2 * j * j * lambda * lambda);
      sum += term;
      if (Math.abs(term) < 1e-8) break;
    }

    const pValue = Math.max(0, Math.min(1, 2 * sum));
    const pass = pValue >= 0.05;

    return {
      pass,
      d: d.toFixed(4),
      pValue: pValue.toFixed(4),
      message: pass
        ? `Distribución con uniformidad`
        : `Distribución no uniforme`,
    };
  }

  function testMean(uValues) {
    const n = uValues.length;
    if (n < 2)
      return { pass: false, message: "Se requieren al menos 2 valores" };

    const mean = uValues.reduce((s, v) => s + v, 0) / n;
    const expectedMean = 0.5;
    const variance = 1 / (12 * n);
    const stdDev = Math.sqrt(variance);

    // Estadístico Z
    const z = (mean - expectedMean) / stdDev;

    // Valor crítico para α = 0.05 (bilateral)
    const zCritical = 1.96;
    const pass = Math.abs(z) <= zCritical;

    return {
      pass,
      mean: mean.toFixed(4),
      z: z.toFixed(4),
      zCritical: zCritical.toFixed(2),
      message: pass
        ? `Media aceptable (μ = ${mean.toFixed(4)})`
        : `Media fuera de rango (μ = ${mean.toFixed(4)})`,
    };
  }

  function testVariance(uValues) {
    const n = uValues.length;
    if (n < 2)
      return { pass: false, message: "Se requieren al menos 2 valores" };

    const mean = uValues.reduce((s, v) => s + v, 0) / n;
    const variance =
      uValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1);
    const expectedVariance = 1 / 12;

    // Estadístico Chi-cuadrado
    const chiSquared = ((n - 1) * variance) / expectedVariance;

    // Valores críticos aproximados para α = 0.05 (bilateral)
    // χ²(α/2, n-1) y χ²(1-α/2, n-1)
    const chiLower = Math.max(0, (n - 1) * (1 - 1.96 / Math.sqrt(2 * (n - 1))));
    const chiUpper = (n - 1) * (1 + 1.96 / Math.sqrt(2 * (n - 1)));

    const pass = chiSquared >= chiLower && chiSquared <= chiUpper;

    return {
      pass,
      variance: variance.toFixed(4),
      chiSquared: chiSquared.toFixed(4),
      chiLower: chiLower.toFixed(2),
      chiUpper: chiUpper.toFixed(2),
      message: pass
        ? `Varianza aceptable (σ² = ${variance.toFixed(4)})`
        : `Varianza fuera de rango (σ² = ${variance.toFixed(4)})`,
    };
  }

  function runValidationTests(results) {
    if (!results || results.length < 2) {
      if (validationSection) validationSection.style.display = "none";
      return;
    }

    if (validationSection) validationSection.style.display = "block";

    const uValues = results.map((r) => r.u);

    const indTest = testIndependence(uValues);
    if (independenceIcon) {
      independenceIcon.textContent = indTest.pass ? "✓" : "✗";
      independenceIcon.className = `test-icon ${
        indTest.pass ? "pass" : "fail"
      }`;
    }
    if (independenceDetails) {
      independenceDetails.textContent = `${indTest.message} | r = ${indTest.r} | umbral = ${indTest.threshold}`;
    }

    const unifTest = testUniformity(uValues);
    if (uniformityIcon) {
      uniformityIcon.textContent = unifTest.pass ? "✓" : "✗";
      uniformityIcon.className = `test-icon ${unifTest.pass ? "pass" : "fail"}`;
    }
    if (uniformityDetails) {
      uniformityDetails.textContent = `${unifTest.message} | D = ${unifTest.d} | p = ${unifTest.pValue}`;
    }

    const meanTest = testMean(uValues);
    if (meanIcon) {
      meanIcon.textContent = meanTest.pass ? "✓" : "✗";
      meanIcon.className = `test-icon ${meanTest.pass ? "pass" : "fail"}`;
    }
    if (meanDetails) {
      meanDetails.textContent = meanTest.message;
    }

    const varTest = testVariance(uValues);
    if (varianceIcon) {
      varianceIcon.textContent = varTest.pass ? "✓" : "✗";
      varianceIcon.className = `test-icon ${varTest.pass ? "pass" : "fail"}`;
    }
    if (varianceDetails) {
      varianceDetails.textContent = varTest.message;
    }

    const allPass =
      indTest.pass && unifTest.pass && meanTest.pass && varTest.pass;
    if (resultBadge) {
      resultBadge.className = `result-badge ${allPass ? "valid" : "invalid"}`;
    }
    if (badgeIcon) {
      badgeIcon.textContent = allPass ? "✓" : "✗";
    }
    if (badgeText) {
      badgeText.textContent = allPass
        ? "Números Válidos"
        : "Números No Válidos";
    }
    if (resultMessage) {
      resultMessage.textContent = allPass
        ? "Los números generados cumplen con todas las pruebas estadísticas (independencia, uniformidad, media y varianza)."
        : "Los números no cumplen con todas las pruebas. Se recomienda regenerar con diferentes parámetros.";
    }

    if (regenerateBtn) {
      regenerateBtn.style.display = allPass ? "none" : "inline-block";
    }
  }

  function handleGenerate() {
    const params = parseAndValidateInputs();
    if (!params) return;

    if (params.count > 100) {
      const confirmContinue = confirm(
        `Has pedido generar ${params.count} números. Esto puede ser mucha información en pantalla. ¿Deseas continuar?`
      );
      if (!confirmContinue) {
        setMessage("Generación cancelada por el usuario.");
        return;
      }
    }

    const { m, a, c, seed, count } = params;
    const results = [];
    let X = seed;

    for (let k = 0; k < count; k++) {
      X = (a * X + c) % m;
      X = Math.floor(X);
      const u = X / m;
      results.push({ X, u });
    }

    renderResultsTable(results);
    updateScatterChart(results);
    setMessage(`Generados ${count} números.`, false);

    lastResults = results;
    runValidationTests(results);
  }

  function resetToDefaults() {
    mSelect.value = DEFAULTS.m;
    aInput.value = DEFAULTS.a;
    cInput.value = DEFAULTS.c;
    seedInput.value = DEFAULTS.seed;
    countInput.value = DEFAULTS.count;

    resultsTbody.innerHTML = "";
    scatterChart.data.datasets[0].data = [];
    scatterChart.update();
    setMessage("Valores restablecidos.", false);
    updateMRelatedHelp();

    lastResults = [];
    if (validationSection) validationSection.style.display = "none";
  }

  generateButton.addEventListener("click", (e) => {
    e.preventDefault();
    handleGenerate();
  });

  resetButton.addEventListener("click", (e) => {
    e.preventDefault();
    resetToDefaults();
  });

  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleGenerate();
    });
  }

  resetToDefaults();
  updateMRelatedHelp();
});
