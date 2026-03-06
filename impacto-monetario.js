const el = {
  moneyVisitors: document.getElementById('moneyVisitors'),
  moneyCrControl: document.getElementById('moneyCrControl'),
  moneyCrVariant: document.getElementById('moneyCrVariant'),
  moneyAov: document.getElementById('moneyAov'),
  moneyMonthlyTraffic: document.getElementById('moneyMonthlyTraffic'),
  moneyCalculate: document.getElementById('moneyCalculate'),
  moneyResults: document.getElementById('moneyResults'),
  moneyError: document.getElementById('moneyError'),
  moneyFormulas: document.getElementById('moneyFormulas')
};

function asPct(value, digits = 2) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—';
}

function normalizeCr(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return NaN;
  return value > 1 ? value / 100 : value;
}

function asCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(value);
}

function clearOutput(errorMessage = '') {
  if (errorMessage) {
    el.moneyError.textContent = errorMessage;
    el.moneyError.classList.remove('hidden');
  } else {
    el.moneyError.textContent = '';
    el.moneyError.classList.add('hidden');
  }

  el.moneyResults.innerHTML = '';
  el.moneyFormulas.innerHTML = '';
  el.moneyFormulas.classList.add('hidden');
}

function validateInputs(values) {
  const entries = Object.entries(values);

  for (const [name, value] of entries) {
    if (value === '' || value === null || value === undefined) {
      return `El campo ${name} es obligatorio.`;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return `El campo ${name} debe ser numérico.`;
    if (numeric < 0) return `El campo ${name} no puede ser negativo.`;
  }

  return null;
}

function calculateMonetaryImpact() {
  const rawInputs = {
    'Visitantes en el test': el.moneyVisitors.value,
    'CR control': el.moneyCrControl.value,
    'CR variante': el.moneyCrVariant.value,
    AOV: el.moneyAov.value,
    'Tráfico mensual': el.moneyMonthlyTraffic.value
  };

  const error = validateInputs(rawInputs);
  if (error) {
    clearOutput(error);
    return;
  }

  const visitors = Number(el.moneyVisitors.value);
  const crControl = normalizeCr(el.moneyCrControl.value);
  const crVariant = normalizeCr(el.moneyCrVariant.value);
  const aov = Number(el.moneyAov.value);
  const monthlyTraffic = Number(el.moneyMonthlyTraffic.value);

  if (!Number.isFinite(crControl) || !Number.isFinite(crVariant)) {
    clearOutput('Los valores de CR deben ser numéricos.');
    return;
  }

  if (crControl <= 0 || crVariant < 0) {
    clearOutput('CR control debe ser mayor que 0 y CR variante no puede ser negativo.');
    return;
  }

  if (crControl > 1 || crVariant > 1) {
    clearOutput('Los CR deben representar un valor entre 0 y 100% (o entre 0 y 1 en decimal).');
    return;
  }

  const uplift = (crVariant - crControl) / crControl;
  const incrementalRevenue = (crVariant - crControl) * visitors * aov;
  const annualValue = (crVariant - crControl) * monthlyTraffic * 12 * aov;

  clearOutput();

  el.moneyResults.innerHTML = `
    <div class="metric">Uplift de conversión<strong>${asPct(uplift * 100)}</strong></div>
    <div class="metric">Ingresos incrementales en el test<strong>${asCurrency(incrementalRevenue)}</strong></div>
    <div class="metric">Impacto anual proyectado<strong>${asCurrency(annualValue)}</strong></div>
  `;

  el.moneyFormulas.innerHTML = `
    <h3>Fórmulas utilizadas</h3>
    <p><strong>uplift</strong> = (CR_variant - CR_control) / CR_control</p>
    <p><strong>incremental_revenue</strong> = (CR_variant - CR_control) × visitors × AOV</p>
    <p><strong>annual_value</strong> = (CR_variant - CR_control) × monthly_traffic × 12 × AOV</p>
  `;
  el.moneyFormulas.classList.remove('hidden');
}

el.moneyCalculate.addEventListener('click', calculateMonetaryImpact);
[el.moneyVisitors, el.moneyCrControl, el.moneyCrVariant, el.moneyAov, el.moneyMonthlyTraffic].forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') calculateMonetaryImpact();
  });
});
