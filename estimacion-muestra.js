const plannerEl = {
  testType: document.getElementById('testType'),
  variantCount: document.getElementById('variantCount'),
  baselineRate: document.getElementById('baselineRate'),
  expectedMode: document.getElementById('expectedMode'),
  expectedFinalField: document.getElementById('expectedFinalField'),
  relativeLiftField: document.getElementById('relativeLiftField'),
  expectedRate: document.getElementById('expectedRate'),
  relativeLift: document.getElementById('relativeLift'),
  alpha: document.getElementById('alpha'),
  power: document.getElementById('power'),
  monthlyTraffic: document.getElementById('monthlyTraffic'),
  calculateBtn: document.getElementById('calculateBtn'),
  plannerResultContent: document.getElementById('plannerResultContent')
};

function normalInv(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p <= 0 || p >= 1) return NaN;

  let q;
  let r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
      / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
    / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function formatNumber(value, maxDigits = 2) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDigits }).format(value);
}

function validatePlannerInputs({ p1, p2, alpha, power, variantCount, monthlyTraffic }) {
  if (!(variantCount >= 2)) return 'El número de variantes debe ser al menos 2.';
  if (!(p1 > 0 && p1 < 1)) return 'La conversión actual debe estar entre 0% y 100%.';
  if (!(p2 > 0 && p2 < 1)) return 'La conversión esperada debe estar entre 0% y 100%.';
  if (Math.abs(p2 - p1) < 1e-9) return 'La conversión esperada debe ser distinta de la actual para calcular muestra.';
  if (!(alpha > 0 && alpha < 1)) return 'El nivel de significancia α debe estar entre 0 y 1.';
  if (!(power > 0 && power < 1)) return 'La potencia (1-β) debe estar entre 0 y 1.';
  if (monthlyTraffic !== null && !(monthlyTraffic > 0)) return 'Si indicas tráfico mensual, debe ser mayor que 0.';
  return null;
}

function calculateSampleSizePerVariant({ p1, p2, alpha, power }) {
  const pBar = (p1 + p2) / 2;
  const zAlpha = normalInv(1 - alpha / 2);
  const zPower = normalInv(power);

  const numerator = (
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar))
    + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
  ) ** 2;

  const denominator = (p2 - p1) ** 2;
  return Math.ceil(numerator / denominator);
}

function getExpectedRate(baselineRate, mode, expectedRateInput, relativeLiftInput) {
  if (mode === 'relative') {
    return baselineRate * (1 + relativeLiftInput / 100);
  }
  return expectedRateInput;
}

function renderPlannerResult({ p1, p2, perVariant, totalSample, variantCount, monthlyTraffic }) {
  const durationMetrics = monthlyTraffic
    ? (() => {
      const dailyTraffic = monthlyTraffic / 30;
      const estimatedDays = totalSample / dailyTraffic;
      const estimatedWeeks = estimatedDays / 7;

      return `
        <div class="metric">Tráfico diario estimado<strong>${formatNumber(dailyTraffic, 0)} usuarios/día</strong></div>
        <div class="metric">Duración estimada<strong>${formatNumber(estimatedDays)} días (${formatNumber(estimatedWeeks)} semanas)</strong></div>
      `;
    })()
    : '<div class="metric">Duración estimada<strong>—</strong><span class="metric-sub">Añade tráfico mensual (opcional) para estimarla.</span></div>';

  const splitNote = variantCount === 2
    ? 'reparto 50/50 entre A y B'
    : `reparto equitativo entre ${variantCount} variantes`;

  plannerEl.plannerResultContent.innerHTML = `
    <div class="result-grid">
      <div class="metric">Conversión actual (p1)<strong>${formatNumber(p1 * 100)}%</strong></div>
      <div class="metric">Conversión esperada (p2)<strong>${formatNumber(p2 * 100)}%</strong></div>
      <div class="metric">Variantes del experimento<strong>${formatNumber(variantCount, 0)}</strong></div>
      <div class="metric">Sample size por variante<strong>${formatNumber(perVariant, 0)}</strong></div>
      <div class="metric">Sample size total<strong>${formatNumber(totalSample, 0)}</strong></div>
      ${durationMetrics}
    </div>
    <p class="note">El cálculo temporal asume ${splitNote} y tráfico mensual constante.</p>
  `;
}

function syncPlannerMode() {
  const isRelative = plannerEl.expectedMode.value === 'relative';
  plannerEl.expectedFinalField.classList.toggle('hidden', isRelative);
  plannerEl.relativeLiftField.classList.toggle('hidden', !isRelative);
}

function syncTestType() {
  const isAB = plannerEl.testType.value === 'ab';
  if (isAB) {
    plannerEl.variantCount.value = '2';
    plannerEl.variantCount.setAttribute('readonly', 'readonly');
  } else {
    plannerEl.variantCount.removeAttribute('readonly');
    if (Number(plannerEl.variantCount.value) < 3) {
      plannerEl.variantCount.value = '3';
    }
  }
}

function calculatePlanner() {
  const baselineRate = Number(plannerEl.baselineRate.value);
  const expectedRateInput = Number(plannerEl.expectedRate.value);
  const relativeLiftInput = Number(plannerEl.relativeLift.value);
  const alpha = Number(plannerEl.alpha.value);
  const power = Number(plannerEl.power.value);
  const variantCount = Math.floor(Number(plannerEl.variantCount.value));
  const monthlyTrafficRaw = plannerEl.monthlyTraffic.value.trim();
  const monthlyTraffic = monthlyTrafficRaw === '' ? null : Number(monthlyTrafficRaw);

  const expectedRate = getExpectedRate(baselineRate, plannerEl.expectedMode.value, expectedRateInput, relativeLiftInput);
  const p1 = baselineRate / 100;
  const p2 = expectedRate / 100;

  const validationError = validatePlannerInputs({ p1, p2, alpha, power, variantCount, monthlyTraffic });
  if (validationError) {
    plannerEl.plannerResultContent.innerHTML = `<p class="error">${validationError}</p>`;
    return;
  }

  const perVariant = calculateSampleSizePerVariant({ p1, p2, alpha, power });
  const totalSample = perVariant * variantCount;

  renderPlannerResult({ p1, p2, perVariant, totalSample, variantCount, monthlyTraffic });
}

plannerEl.expectedMode.addEventListener('change', syncPlannerMode);
plannerEl.testType.addEventListener('change', syncTestType);
plannerEl.calculateBtn.addEventListener('click', calculatePlanner);

syncPlannerMode();
syncTestType();
calculatePlanner();
