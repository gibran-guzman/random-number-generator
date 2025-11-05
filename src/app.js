document.addEventListener("DOMContentLoaded", () => {
  const getById = (id) => document.getElementById(id);
  const mInput = getById("m");
  const aInput = getById("a");
  const cInput = getById("c");
  const seedInput = getById("seed");
  const countInput = getById("count");
  const generateButton = getById("generate");
  const resetButton = getById("reset");
  const messageBox = getById("messages");
  const resultsTbody = document.querySelector("#table tbody");
  const chartCtx = getById("scatterChart").getContext("2d");
  const DEFAULTS = { m: 100, a: 19, c: 33, seed: 37, count: 10 };
  function setMessage(text = "", isError = true) {
    messageBox.textContent = text;
    messageBox.style.color = isError ? "var(--danger)" : "green";
  }

  function isIntegerString(value) {
    if (value === "" || value === null || value === undefined) return false;
    return /^-?\d+$/.test(String(value).trim());
  }

  function parseAndValidateInputs() {
    const mVal = mInput.value;
    const aVal = aInput.value;
    const cVal = cInput.value;
    const seedVal = seedInput.value;
    const countVal = countInput.value;

    if (![mVal, aVal, cVal, seedVal, countVal].every(isIntegerString)) {
      setMessage("Todos los parámetros deben ser enteros.");
      return null;
    }

    const m = Number(mVal);
    const a = Number(aVal);
    const c = Number(cVal);
    const seed = Number(seedVal);
    const count = Number(countVal);

    if (!(Number.isInteger(m) && m > 1)) {
      setMessage("El módulo m debe ser entero mayor que 1.");
      return null;
    }

    if (
      !Number.isInteger(a) ||
      !Number.isInteger(c) ||
      !Number.isInteger(seed) ||
      !Number.isInteger(count)
    ) {
      setMessage("Parámetros deben ser enteros.");
      return null;
    }

    if (seed < 0 || seed >= m) {
      setMessage("La semilla debe cumplir 0 ≤ semilla < m.");
      return null;
    }

    if (count <= 0) {
      setMessage("La cantidad debe ser al menos 1.");
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
            backgroundColor: "rgba(43,108,176,0.9)",
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
      const u = X / (m - 1);
      results.push({ X, u });
    }

    renderResultsTable(results);
    updateScatterChart(results);
    setMessage(`Generados ${count} números.`, false);
  }

  function resetToDefaults() {
    mInput.value = DEFAULTS.m;
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
