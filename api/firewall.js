const express = require('express');
const app = express();

app.use(express.json());

// Lista de IPs bloqueados (exemplo)
const blockedIPs = [
  '192.168.1.100',
  '10.0.0.5'
];

// Middleware de firewall
function firewall(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (blockedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Acesso negado pelo firewall.' });
  }
  next();
}

// Aplica o middleware de firewall em todas as rotas
app.use(firewall);

// Exemplo de rota protegida
app.get('/', (req, res) => {
  res.json({ message: 'Bem-vindo! Seu acesso foi permitido pelo firewall.' });
});

// Rota para adicionar IP à lista de bloqueio
app.post('/block', (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP é obrigatório.' });
  }
  if (!blockedIPs.includes(ip)) {
    blockedIPs.push(ip);
  }
  res.json({ message: `IP ${ip} bloqueado.` });
});

// Rota para remover IP da lista de bloqueio
app.post('/unblock', (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP é obrigatório.' });
  }
  const index = blockedIPs.indexOf(ip);
  if (index !== -1) {
    blockedIPs.splice(index, 1);
    return res.json({ message: `IP ${ip} desbloqueado.` });
  }
  res.status(404).json({ error: 'IP não encontrado na lista de bloqueio.' });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API de firewall rodando na porta ${PORT}`);
});