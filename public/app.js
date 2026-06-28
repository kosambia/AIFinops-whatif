let models = [];
let generations = [];
let chart = null;

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
const targetModelSelect = document.getElementById('target-model-select');
const modelInputPriceEl = document.getElementById('model-input-price');
const modelOutputPriceEl = document.getElementById('model-output-price');
const quickCompareList = document.getElementById('quick-compare-list');
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

    // Populate model selectors
    populateModelSelect();

    // Setup Event Listeners
    targetModelSelect.addEventListener('change', runSimulation);
    tableSearch.addEventListener('input', filterTable);

    // Run Initial Simulation
    runSimulation();
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Populate model dropdowns
function populateModelSelect() {
  targetModelSelect.innerHTML = '';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.model_name;
    option.textContent = model.model_name;
    // Default select gemini-1.5-pro or gpt-4o-mini
    if (model.model_name === 'gpt-4o-mini') {
      option.selected = true;
    }
    targetModelSelect.appendChild(option);
  });
}

// Run the What-If simulation
function runSimulation() {
  const selectedModelName = targetModelSelect.value;
  const selectedModel = models.find(m => m.model_name === selectedModelName) || models[0];

  // Update model pricing card
  modelInputPriceEl.textContent = `$${(selectedModel.input_price * 1000000).toFixed(2)} / 1M tokens`;
  modelOutputPriceEl.textContent = `$${(selectedModel.output_price * 1000000).toFixed(2)} / 1M tokens`;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalActualCost = 0;
  let totalScenarioCost = 0;

  // Process generation details
  const tableRows = [];
  const chartLabels = [];
  const actualCumulativeData = [];
  const scenarioCumulativeData = [];

  let cumActual = 0;
  let cumScenario = 0;

  generations.forEach(gen => {
    const inputTokens = gen.usage_details?.input || 0;
    const outputTokens = gen.usage_details?.output || gen.usage_details?.completion || 0;
    const actualCost = gen.total_cost !== null && gen.total_cost !== undefined ? Number(gen.total_cost) : 0;
    
    // Calculate scenario cost
    const scenarioCost = (inputTokens * selectedModel.input_price) + (outputTokens * selectedModel.output_price);

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalActualCost += actualCost;
    totalScenarioCost += scenarioCost;

    cumActual += actualCost;
    cumScenario += scenarioCost;

    // Formatting date
    const dateStr = new Date(gen.start_time).toLocaleString();

    tableRows.push({
      date: dateStr,
      traceId: gen.trace_id,
      model: gen.provided_model_name,
      inputTokens,
      outputTokens,
      actualCost,
      scenarioCost,
      raw: gen
    });

    chartLabels.push(new Date(gen.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    actualCumulativeData.push(cumActual);
    scenarioCumulativeData.push(cumScenario);
  });

  // Update Core UI stats
  totalGenerationsEl.textContent = generations.length;
  totalTokensEl.textContent = `${(totalInputTokens + totalOutputTokens).toLocaleString()} total tokens (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`;
  
  actualCostEl.textContent = `$${totalActualCost.toFixed(6)}`;
  actualAverageEl.textContent = `avg: $${(totalActualCost / (generations.length || 1)).toFixed(6)} / gen`;

  scenarioCostEl.textContent = `$${totalScenarioCost.toFixed(6)}`;
  scenarioAverageEl.textContent = `avg: $${(totalScenarioCost / (generations.length || 1)).toFixed(6)} / gen`;

  // Update Delta Card
  const delta = totalScenarioCost - totalActualCost;
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

  lucide.createIcons();

  // Populate Table
  renderTable(tableRows);

  // Render/Update Chart
  renderChart(chartLabels, actualCumulativeData, scenarioCumulativeData, selectedModelName);

  // Populate Quick Compare List
  renderQuickCompare(totalInputTokens, totalOutputTokens, totalActualCost);
}

// Render chart with Chart.js
function renderChart(labels, actualData, scenarioData, scenarioModel) {
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
          label: `Scenario (${scenarioModel})`,
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
    traceTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No trace records found</td></tr>`;
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
    `;
    traceTableBody.appendChild(tr);
  });
}

// Quick compare scenarios helper
function renderQuickCompare(totalInput, totalOutput, totalActual) {
  quickCompareList.innerHTML = '';
  
  // Select a subset of popular models for quick display
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
