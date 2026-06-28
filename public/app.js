let models = [];
let generations = [];
let chart = null;
let activeTab = 'whatif';

// DOM Elements
const totalGenerationsEl = document.getElementById('total-generations');
const totalTokensEl = document.getElementById('total-tokens');
const actualCostEl = document.getElementById('actual-cost');
const actualAverageEl = document.getElementById('actual-average');
const scenarioCostEl = document.getElementById('scenario-cost');
const scenarioAverageEl = document.getElementById('scenario-average');
const deltaCardEl = document.getElementById('delta-card');
const deltaLabelEl = document.getElementById('delta-label');
const deltaIconEl = document.getElementById('delta-icon');
const deltaValueEl = document.getElementById('delta-value');
const deltaPercentageEl = document.getElementById('delta-percentage');

// Tab Panels
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Model What-If Selectors
const targetModelSelect = document.getElementById('target-model-select');
const modelInputPriceEl = document.getElementById('model-input-price');
const modelOutputPriceEl = document.getElementById('model-output-price');
const quickCompareList = document.getElementById('quick-compare-list');

// Caching Sliders
const cacheHitSlider = document.getElementById('cache-hit-slider');
const cacheHitVal = document.getElementById('cache-hit-val');
const cacheDiscountSlider = document.getElementById('cache-discount-slider');
const cacheDiscountVal = document.getElementById('cache-discount-val');
const cachingRoiPercentage = document.getElementById('caching-roi-percentage');

// Router Selectors
const routeThresholdSlider = document.getElementById('route-threshold-slider');
const routeThresholdVal = document.getElementById('route-threshold-val');
const routeCheapSelect = document.getElementById('route-cheap-select');
const routePremiumSelect = document.getElementById('route-premium-select');

// Governance Inputs
const alertCostThreshold = document.getElementById('alert-cost-threshold');
const alertTokenThreshold = document.getElementById('alert-token-threshold');
const anomalyBadgeCount = document.getElementById('anomaly-badge-count');

// Search & Table
const traceTableBody = document.getElementById('trace-table-body');
const tableSearch = document.getElementById('table-search');

// Initialize the Application
async function init() {
  try {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Fetch models and generations in parallel
    const [modelsRes, generationsRes] = await Promise.all([
      fetch('/api/models'),
      fetch('/api/generations')
    ]);

    models = await modelsRes.json();
    generations = await generationsRes.json();

    // Populate all selectors
    populateModelSelectors();

    // Setup Tab Click Listeners
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        document.getElementById(`panel-${activeTab}`).classList.add('active');

        // Re-run simulation under new tab mode
        runSimulation();
      });
    });

    // Setup Event Listeners for Simulator Widgets
    targetModelSelect.addEventListener('change', runSimulation);
    
    cacheHitSlider.addEventListener('input', () => {
      cacheHitVal.textContent = `${cacheHitSlider.value}%`;
      runSimulation();
    });
    cacheDiscountSlider.addEventListener('input', () => {
      cacheDiscountVal.textContent = `${cacheDiscountSlider.value}%`;
      runSimulation();
    });

    routeThresholdSlider.addEventListener('input', () => {
      routeThresholdVal.textContent = routeThresholdSlider.value;
      runSimulation();
    });
    routeCheapSelect.addEventListener('change', runSimulation);
    routePremiumSelect.addEventListener('change', runSimulation);

    alertCostThreshold.addEventListener('input', runSimulation);
    alertTokenThreshold.addEventListener('input', runSimulation);

    tableSearch.addEventListener('input', filterTable);

    // Run Initial Simulation
    runSimulation();
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Populate model dropdowns
function populateModelSelectors() {
  // Clear existing
  targetModelSelect.innerHTML = '';
  routeCheapSelect.innerHTML = '';
  routePremiumSelect.innerHTML = '';

  models.forEach(model => {
    // What-If
    const opt1 = document.createElement('option');
    opt1.value = model.model_name;
    opt1.textContent = model.model_name;
    if (model.model_name === 'gpt-4o-mini') opt1.selected = true;
    targetModelSelect.appendChild(opt1);

    // Router Cheap Option
    const opt2 = document.createElement('option');
    opt2.value = model.model_name;
    opt2.textContent = model.model_name;
    if (model.model_name === 'gemini-1.5-flash') opt2.selected = true;
    routeCheapSelect.appendChild(opt2);

    // Router Premium Option
    const opt3 = document.createElement('option');
    opt3.value = model.model_name;
    opt3.textContent = model.model_name;
    if (model.model_name === 'gemini-1.5-pro') opt3.selected = true;
    routePremiumSelect.appendChild(opt3);
  });
}

// Run the Simulation based on the active tab mode
function runSimulation() {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalActualCost = 0;
  let totalSimulatedCost = 0;

  // Process data parameters based on mode
  const tableRows = [];
  const chartLabels = [];
  const actualCumulativeData = [];
  const simulatedCumulativeData = [];

  let cumActual = 0;
  let cumSimulated = 0;
  let anomalyCount = 0;

  // 1. What-If Mode parameters
  const selectedModelName = targetModelSelect.value;
  const selectedModel = models.find(m => m.model_name === selectedModelName) || models[0];

  // Update What-If price tags
  modelInputPriceEl.textContent = `$${(selectedModel.input_price * 1000000).toFixed(2)} / 1M`;
  modelOutputPriceEl.textContent = `$${(selectedModel.output_price * 1000000).toFixed(2)} / 1M`;

  // 2. Caching Mode parameters
  const chr = Number(cacheHitSlider.value) / 100;
  const discountMultiplier = 1 - (Number(cacheDiscountSlider.value) / 100);

  // 3. Routing Mode parameters
  const threshold = Number(routeThresholdSlider.value);
  const cheapModel = models.find(m => m.model_name === routeCheapSelect.value) || models[0];
  const premiumModel = models.find(m => m.model_name === routePremiumSelect.value) || models[0];

  // 4. Governance parameters
  const costLimit = Number(alertCostThreshold.value);
  const tokenLimit = Number(alertTokenThreshold.value);

  // Core loop
  generations.forEach(gen => {
    const inputTokens = gen.usage_details?.input || 0;
    const outputTokens = gen.usage_details?.output || gen.usage_details?.completion || 0;
    const actualCost = gen.total_cost !== null && gen.total_cost !== undefined ? Number(gen.total_cost) : 0;
    
    let simulatedCost = 0;
    let statusBadge = '<span class="badge badge-success">Normal</span>';

    // Calculate simulated cost depending on the active tab mode
    if (activeTab === 'whatif') {
      simulatedCost = (inputTokens * selectedModel.input_price) + (outputTokens * selectedModel.output_price);
    } 
    else if (activeTab === 'caching') {
      // Simulate prompt caching savings on targetModel
      const cachedInput = inputTokens * chr;
      const nonCachedInput = inputTokens * (1 - chr);
      simulatedCost = (nonCachedInput * selectedModel.input_price) + 
                      (cachedInput * selectedModel.input_price * discountMultiplier) + 
                      (outputTokens * selectedModel.output_price);
    } 
    else if (activeTab === 'routing') {
      // Dynamic routing simulation
      const routerModel = inputTokens < threshold ? cheapModel : premiumModel;
      simulatedCost = (inputTokens * routerModel.input_price) + (outputTokens * routerModel.output_price);
    } 
    else if (activeTab === 'governance') {
      // Governance simulation (uses standard model, flags anomalies)
      simulatedCost = (inputTokens * selectedModel.input_price) + (outputTokens * selectedModel.output_price);
      
      const isAnomaly = (actualCost > costLimit) || ((inputTokens + outputTokens) > tokenLimit);
      if (isAnomaly) {
        anomalyCount++;
        statusBadge = '<span class="badge badge-danger">Anomaly</span>';
      }
    }

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalActualCost += actualCost;
    totalSimulatedCost += simulatedCost;

    cumActual += actualCost;
    cumSimulated += simulatedCost;

    tableRows.push({
      date: new Date(gen.start_time).toLocaleString(),
      traceId: gen.trace_id,
      model: gen.provided_model_name,
      inputTokens,
      outputTokens,
      actualCost,
      scenarioCost: simulatedCost,
      statusBadge
    });

    chartLabels.push(new Date(gen.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    actualCumulativeData.push(cumActual);
    simulatedCumulativeData.push(cumSimulated);
  });

  // Update Core UI stats
  totalGenerationsEl.textContent = generations.length;
  totalTokensEl.textContent = `${(totalInputTokens + totalOutputTokens).toLocaleString()} total tokens (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`;
  
  actualCostEl.textContent = `$${totalActualCost.toFixed(6)}`;
  actualAverageEl.textContent = `avg: $${(totalActualCost / (generations.length || 1)).toFixed(6)} / gen`;

  scenarioCostEl.textContent = `$${totalSimulatedCost.toFixed(6)}`;
  scenarioAverageEl.textContent = `avg: $${(totalSimulatedCost / (generations.length || 1)).toFixed(6)} / gen`;

  // Update Caching ROI box indicator
  if (activeTab === 'caching' && totalActualCost > 0) {
    const roi = ((totalActualCost - totalSimulatedCost) / totalActualCost) * 100;
    cachingRoiPercentage.textContent = roi > 0 ? `${roi.toFixed(1)}% Saved` : `0.0%`;
  }

  // Update Delta Card
  const delta = totalSimulatedCost - totalActualCost;
  const deltaPercentage = totalActualCost > 0 ? (delta / totalActualCost) * 100 : 0;

  if (delta < 0) {
    deltaCardEl.className = 'stat-card savings-positive';
    deltaLabelEl.textContent = 'Potential Cost Savings';
    deltaValueEl.textContent = `-$${Math.abs(delta).toFixed(6)}`;
    deltaValueEl.className = 'text-emerald';
    deltaPercentageEl.textContent = `${Math.abs(deltaPercentage).toFixed(1)}% cheaper`;
    deltaPercentageEl.className = 'text-emerald';
    deltaIconEl.setAttribute('data-lucide', 'trending-down');
    deltaIconEl.className = 'card-icon text-emerald';
  } else {
    deltaCardEl.className = 'stat-card savings-negative';
    deltaLabelEl.textContent = 'Potential Cost Increase';
    deltaValueEl.textContent = `+$${delta.toFixed(6)}`;
    deltaValueEl.className = 'text-rose';
    deltaPercentageEl.textContent = `${deltaPercentage.toFixed(1)}% more expensive`;
    deltaPercentageEl.className = 'text-rose';
    deltaIconEl.setAttribute('data-lucide', 'trending-up');
    deltaIconEl.className = 'card-icon text-rose';
  }

  // Governance Alerts Badge
  if (activeTab === 'governance') {
    anomalyBadgeCount.style.display = 'inline-block';
    anomalyBadgeCount.textContent = `${anomalyCount} Anomalies Flagged`;
  } else {
    anomalyBadgeCount.style.display = 'none';
  }

  lucide.createIcons();

  // Populate Table
  renderTable(tableRows);

  // Render/Update Chart
  let chartTitle = 'Cumulative Cost Projection';
  if (activeTab === 'caching') chartTitle = `Caching ROI (${selectedModelName})`;
  else if (activeTab === 'routing') chartTitle = `Router Simulation (${cheapModel.model_name} / ${premiumModel.model_name})`;
  else if (activeTab === 'governance') chartTitle = `Governance Limits Simulation`;

  document.getElementById('chart-main-title').textContent = chartTitle;
  renderChart(chartLabels, actualCumulativeData, simulatedCumulativeData, activeTab.toUpperCase());

  // Populate Quick Compare List (if What-If is selected)
  if (activeTab === 'whatif') {
    renderQuickCompare(totalInputTokens, totalOutputTokens, totalActualCost);
  }
}

// Render chart with Chart.js
function renderChart(labels, actualData, scenarioData, modeLabel) {
  if (chart) {
    chart.destroy();
  }

  const ctx = document.getElementById('costChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Actual Cost',
          data: actualData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
        },
        {
          label: `Simulated (${modeLabel})`,
          data: scenarioData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#9ca3af',
            font: {
              family: 'Inter'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            callback: function(value) {
              return '$' + value.toFixed(6);
            }
          }
        }
      }
    }
  });
}

// Render Table Rows
function renderTable(rows) {
  traceTableBody.innerHTML = '';
  if (rows.length === 0) {
    traceTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No trace records found</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date}</td>
      <td><a href="http://localhost:3001/project/proj-local/traces/${row.traceId}" target="_blank" class="trace-id-link">${row.traceId.substring(0, 18)}...</a></td>
      <td><span class="model-badge">${row.model || 'Unknown'}</span></td>
      <td>${row.inputTokens.toLocaleString()}</td>
      <td>${row.outputTokens.toLocaleString()}</td>
      <td class="price-val">$${row.actualCost.toFixed(6)}</td>
      <td class="price-val text-violet">$${row.scenarioCost.toFixed(6)}</td>
      <td>${row.statusBadge}</td>
    `;
    traceTableBody.appendChild(tr);
  });
}

// Quick compare scenarios helper
function renderQuickCompare(totalInput, totalOutput, totalActual) {
  quickCompareList.innerHTML = '';
  
  const quickModels = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-flash', 'gpt-4o-mini'];
  
  quickModels.forEach(mName => {
    const model = models.find(m => m.model_name === mName);
    if (!model) return;

    const totalSim = (totalInput * model.input_price) + (totalOutput * model.output_price);
    const diff = totalSim - totalActual;
    const diffColor = diff < 0 ? 'text-emerald' : 'text-rose';
    const prefix = diff < 0 ? '-' : '+';

    const item = document.createElement('div');
    item.className = 'compare-item';
    item.onclick = () => {
      targetModelSelect.value = mName;
      runSimulation();
    };

    item.innerHTML = `
      <div>
        <div class="compare-name">${mName}</div>
        <div class="compare-cost ${diffColor}">${prefix}$${Math.abs(diff).toFixed(6)}</div>
      </div>
      <div class="compare-cost">$${totalSim.toFixed(6)}</div>
    `;
    quickCompareList.appendChild(item);
  });
}

// Filter table search
function filterTable() {
  const filter = tableSearch.value.toLowerCase();
  const rows = document.querySelectorAll('#trace-table-body tr');

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(filter)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Start application
window.onload = init;
