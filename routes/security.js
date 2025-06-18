const express = require('express');
const fs = require('fs');
const path = require('path');
const { encrypt } = require('../services/crypto');

const router = express.Router();
const secretsPath = path.join(__dirname, '../secrets/clients.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;


function readSecrets() {
  return JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
}

function writeSecrets(data) {
  fs.writeFileSync(secretsPath, JSON.stringify(data, null, 2));
}

router.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  next();
});

router.post('/admin/add-client', (req, res) => {
    const { id, nome, secret } = req.body;
    if (!id || !nome || !secret) {
    return res.status(400).json({ error: 'Campos obrigatórios: id, nome, secret' });
    }

    const clients = readSecrets();
    if (clients[id]) {
    return res.status(409).json({ error: 'Cliente já existente' });
    }

    clients[id] = {
        id,
        nome,
        secret_enc: encrypt(secret),
        ativo: true,
        data: new Date().toISOString()
};

writeSecrets(clients);
return res.status(201).json({ success: true, id });
});

router.get('/admin/clients', (req, res) => {
    const clients = readSecrets();
    return res.json(clients);
});

router.put('/admin/update-client/:id', (req, res) => {
    const { id } = req.params;
    const { nome, ativo } = req.body;

    const clients = readSecrets();
    if (!clients[id]) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (nome) clients[id].nome = nome;
    if (typeof ativo === 'boolean') clients[id].ativo = ativo;

    writeSecrets(clients);
    return res.json({ success: true });
});

router.patch('/admin/deactivate-client/:id', (req, res) => {
    const { id } = req.params;
    const clients = readSecrets();

    if (!clients[id]) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    clients[id].ativo = false;
    writeSecrets(clients);
    return res.json({ success: true });
});

module.exports = router;
