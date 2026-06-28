import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;

// PostgreSQL Connection Config
const pgPool = new pg.Pool({
  host: '127.0.0.1',
  port: 5435,
  user: 'postgres',
  password: '48vPmSzBz5Tse7tEzXOMs83pmWLfJ8PqvF7ZLEjOyPY=',
  database: 'postgres',
});

// ClickHouse Connection Config
const chUrl = 'http://localhost:8123/?user=clickhouse&password=2b14c46d183afca589cb8ebdfe6def787f0e46aba98612905a8d86e4286c56e4';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: Fetch models
app.get('/api/models', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT model_name, input_price, output_price FROM models');
    
    // Add default models with simulated prices if not present in DB
    const dbModels = result.rows;
    const defaultModels = [
      { model_name: 'gpt-4o', input_price: 0.000005, output_price: 0.000015 },
      { model_name: 'gpt-4o-mini', input_price: 0.00000015, output_price: 0.0000006 },
      { model_name: 'claude-3-5-sonnet', input_price: 0.000003, output_price: 0.000015 },
      { model_name: 'claude-3-5-haiku', input_price: 0.0000008, output_price: 0.000004 },
      { model_name: 'gemini-1.5-pro', input_price: 0.00000125, output_price: 0.000005 },
      { model_name: 'gemini-1.5-flash', input_price: 0.000000075, output_price: 0.0000003 },
      { model_name: 'llama-3.1-70b', input_price: 0.0000006, output_price: 0.0000006 },
      { model_name: 'deepseek-chat', input_price: 0.00000014, output_price: 0.00000028 }
    ];

    // Merge database models with default models
    const merged = [...defaultModels];
    for (const dbModel of dbModels) {
      if (!dbModel.model_name) continue;
      const existing = merged.find(m => m.model_name.toLowerCase() === dbModel.model_name.toLowerCase());
      if (existing) {
        if (dbModel.input_price !== null) existing.input_price = Number(dbModel.input_price);
        if (dbModel.output_price !== null) existing.output_price = Number(dbModel.output_price);
      } else {
        merged.push({
          model_name: dbModel.model_name,
          input_price: dbModel.input_price !== null ? Number(dbModel.input_price) : 0,
          output_price: dbModel.output_price !== null ? Number(dbModel.output_price) : 0,
        });
      }
    }

    res.json(merged);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch generations from ClickHouse
app.get('/api/generations', async (req, res) => {
  try {
    const query = 'SELECT id, trace_id, provided_model_name, usage_details, cost_details, total_cost, start_time FROM default.observations WHERE type = \'GENERATION\' ORDER BY start_time ASC FORMAT JSONEachRow';
    const chRes = await fetch(chUrl, {
      method: 'POST',
      body: query,
    });
    
    if (!chRes.ok) {
      throw new Error(`ClickHouse query failed: ${chRes.statusText}`);
    }
    
    const text = await chRes.text();
    const rows = text.trim().split('\n').filter(Boolean).map(JSON.parse);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Langfuse Cost Analyzer running at http://localhost:${port}`);
});
