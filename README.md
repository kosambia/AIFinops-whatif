# AI FinOps What-If Cost Analyzer 📊

A beautiful, interactive "What-If" cost analysis dashboard designed for self-hosted **Langfuse** telemetry.

This project retrieves historical LLM telemetry logs from your self-hosted Langfuse databases (PostgreSQL and ClickHouse) and simulates cost scenarios. It helps teams analyze and project how much their LLM traces *would* have cost on other models (e.g., swapping **GPT-4o** or **Claude 3.5 Sonnet** to budget-friendly models like **Gemini 1.5 Flash** or **GPT-4o-mini**).

---

## Features ✨
- 📈 **Cumulative Cost Projection**: Dynamic line charts plotting historical actual cumulative cost vs. simulated scenario costs over time.
- ⚡ **Real-time Cost Deltas**: Computes net savings or cost increases (absolute USD and percentage difference) instantly upon model changes.
- 🔄 **Quick Compare Panel**: Shows one-click comparative cost summaries for industry-standard models.
- 🔍 **Detailed Search & Breakdown**: Interactive list of all generation events showing input/output tokens, timestamp, original model, and projected costs.
- 🎨 **Premium Aesthetics**: Built with a sleek dark-mode glassmorphic interface, Outfit headings, and responsive layout.

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
