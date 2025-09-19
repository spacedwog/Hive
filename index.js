const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// eslint-disable-next-line expo/no-env-var-destructuring
const { VERCEL_TOKEN, VERCEL_API_URL } = process.env;

const app = express();
app.use(cors());
app.use(express.json());

const RULES_FILE = './firewall-rules.json';

// Função utilitária para carregar e salvar regras
const loadRules = () => JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
const saveRules = (rules) => fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));

// ----------------------------
// GET /api/firewall/rules
// ----------------------------
app.get('/api/firewall/rules', (req, res) => {
  try {
    const rules = loadRules();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler as regras', details: err.message });
  }
});

// ----------------------------
// POST /api/firewall/rules
// ----------------------------
app.post('/api/firewall/rules', (req, res) => {
  try {
    const { type, value, action } = req.body;
    if (!type || !value || !action) {
      return res.status(400).json({ error: 'Campos obrigatórios: type, value, action' });
    }

    const rules = loadRules();
    const newRule = { id: Date.now(), type, value, action };
    rules.push(newRule);
    saveRules(rules);

    res.status(201).json(newRule);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar regra', details: err.message });
  }
});

// ----------------------------
// DELETE /api/firewall/rules/:id
// ----------------------------
app.delete('/api/firewall/rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    let rules = loadRules();
    rules = rules.filter(r => r.id !== id);
    saveRules(rules);
    res.json({ message: 'Regra removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover regra', details: err.message });
  }
});

// ----------------------------
// (Opcional) Bloquear deploys da Vercel
// ----------------------------
app.post('/api/firewall/block-deploys', async (req, res) => {
  try {
    if (!VERCEL_TOKEN) {
      return res.status(500).json({ error: 'VERCEL_TOKEN não definido' });
    }

    const response = await fetch(`${VERCEL_API_URL}/v9/projects`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({ error: 'Erro ao acessar API da Vercel', details: body });
    }

    const projects = await response.json();
    // Aqui você poderia bloquear deploys se IP/domínio estiver nas regras
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message });
  }
});

// ----------------------------
// Iniciar servidor
// ----------------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API de Firewall rodando na porta ${PORT}`));