# AI FinOps & Observability Workspace 📊

A premium, interactive **AI FinOps and Observability Workspace** designed for self-hosted **Langfuse** telemetry.

This project retrieves historical LLM telemetry logs from your self-hosted Langfuse databases (PostgreSQL and ClickHouse) and simulates cost/resource optimizations. It helps engineering teams model, simulate, and govern their LLM expenditures.

---

## Workspace Modules 🚀

### 1. Model "What-If" Simulator
- **Multi-Model Projections**: Instantly projects historical database costs on various target models (e.g. GPT-4o, Claude 3.5 Sonnet, Gemini Flash, GPT-4o-mini).
- **Cumulative Cost Charts**: Plot chronological actual cumulative cost curves against simulated target model scenarios.
- **Quick Comparison**: One-click summaries showing net difference projections for industry-standard models.

### 2. Prompt Caching ROI Optimizer
- **CHR Sliders**: Interactive controls to simulate Cache Hit Ratios (0-100%).
- **Discount Modeling**: Customize caching discounts (e.g. 75% cheaper input tokens) to forecast exact financial gains from caching integrations.

### 3. Intelligent Model Router
- **Routing Rules**: Configure input token size thresholds to simulate routing logic (e.g., "route prompts under 150 tokens to *Gemini 1.5 Flash*, else route to *Gemini 1.5 Pro*").
- **Cost Saving Projections**: Measures net savings and cost difference indexes automatically.

### 4. Governance & Anomalous Cost Alerts
- **Cost Limits**: Flag any trace sessions exceeding custom daily limit thresholds (USD).
- **Token Limits**: Identify bloated inputs exceeding token bounds to prevent runaway agent loops.
- **Visual Indicators**: Pulsing anomaly indicators and detailed data tables showing statuses.

---

## Technical Stack 🛠️
- **Backend**: Node.js, Express, `pg` (Postgres client), native `fetch` (for ClickHouse HTTP API).
- **Frontend**: Vanilla HTML5, CSS (Glassmorphic variables design), Chart.js (CDNs), Lucide Icons (CDNs).

---

## Getting Started 🚀

### 1. Prerequisites
Ensure your self-hosted Langfuse container stack is running and has its database ports exposed to the host machine:
- **PostgreSQL**: Bound to `127.0.0.1:5435`
- **ClickHouse**: Bound to `127.0.0.1:8123`

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/kosambia/AIFinops-whatif.git
cd AIFinops-whatif
npm install
```

### 3. Run the App
Start the Node.js server:
```bash
npm start
```
Open your browser and navigate to **[http://localhost:3002](http://localhost:3002)**.
