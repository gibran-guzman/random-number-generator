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
  const DEFAULTS = { m: "16", a: 13, c: 7, seed: 6, count: 100 };

  // Función para obtener el exponente g dado m
  function getExponent(m) {
    return Math.log2(parseInt(m));
  }

  // Función para validar que un número no sea negativo
  function validateNonNegative(input, fieldName) {
    const value = parseFloat(input.value);
    if (value < 0) {
      input.value = Math.abs(value); // Convertir a positivo
      setMessage(
        `No se permiten números negativos en ${fieldName}. Se ha convertido a positivo.`
      );
      return false;
    }
    return true;
  }

  // Agregar validación en tiempo real para cada input
  [
    { input: aInput, name: "multiplicador a" },
    { input: cInput, name: "constante c" },
    { input: seedInput, name: "semilla X₀" },
    { input: countInput, name: "cantidad n" },
  ].forEach(({ input, name }) => {
    input.addEventListener("input", () => validateNonNegative(input, name));
  });

  // Ya no necesitamos actualizar la información del módulo
  mSelect.addEventListener("change", () => {
    // Solo validar el cambio del módulo
    const m = parseInt(mSelect.value);
    if (m) {
      setMessage("", false);
    }
  });

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

    // Verificar que a = 1 + 4k donde k es entero
    if ((a - 1) % 4 !== 0) {
      const sugerencia = Math.floor((a - 1) / 4);
      const valorSugerido = 1 + 4 * sugerencia;
      setMessage(
        `El multiplicador a debe ser de la forma 1 + 4k donde k es entero. Prueba con a = ${valorSugerido} (k = ${sugerencia}) o a = ${
          valorSugerido + 4
        } (k = ${sugerencia + 1}).`
      );
      return null;
    }

    // Verificar que c sea impar
    if (c % 2 === 0) {
      setMessage("La constante aditiva c debe ser impar.");
      return null;
    }

    // Verificar que c sea relativamente primo a m
    if (!isRelativelyPrime(c, m)) {
      setMessage("La constante c debe ser relativamente prima a m.");
      return null;
    }

    // Verificar que la semilla esté en el rango correcto
    if (seed < 0 || seed >= m) {
      setMessage(`La semilla debe cumplir 0 ≤ semilla < ${m}.`);
      return null;
    }

    setMessage("", false);
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
      const u = X / m; // Usando m como denominador para obtener valores en [0,1)
      results.push({ X, u });
    }

    renderResultsTable(results);
    updateScatterChart(results);
    setMessage(`Generados ${count} números.`, false);
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
  }

  generateButton.addEventListener("click", (e) => {
    e.preventDefault();
    handleGenerate();
  });

  resetButton.addEventListener("click", (e) => {
    e.preventDefault();
    resetToDefaults();
  });

  resetToDefaults();
});
