const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { decrypt } = require('../services/crypto');
const { SaveRequest, SaveFailure, ListError } = require('../services/RedisService');

const secretsPath = path.join(__dirname, '../secrets/clients.json');
const clients = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));

router.post(process.env.WEBHOOK_ENDPOINT || '/webhook', async (req, res) => {
    const timestamp = new Date().toISOString();
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    const { endpoint, ...payload } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
        await SaveFailure({
            endpoint: endpoint || 'indefinido',
            motivo: 'Campo "endpoint" ausente ou inválido',
            data: timestamp
        });
        return res.status(400).json({ error: 'Campo "endpoint" é obrigatório' });
    }

    const client = clients[endpoint];
    if (!client || !client.secret_enc || client.ativo === false) {
        await SaveFailure({
            endpoint,
            motivo: 'Endpoint sem cliente autorizado',
            data: timestamp
        });
        return res.status(403).json({ error: 'Endpoint não autorizado' });
    }

    let secretDecrypted;
    try {
        secretDecrypted = decrypt(client.secret_enc);
    } catch (err) {
        await SaveFailure({
            endpoint,
            motivo: 'Falha ao descriptografar secret',
            data: timestamp
        });
        return res.status(500).json({ error: 'Erro ao verificar segurança do endpoint' });
    }

    if (token !== secretDecrypted) {
        await SaveFailure({
            endpoint,
            motivo: 'Token inválido para o endpoint',
            data: timestamp
        });
        return res.status(401).json({ error: 'Token inválido' });
    }

    const evento = {
        endpoint,
        cliente: client.nome || client.id || 'desconhecido',
        payload: JSON.stringify(payload),
        data: timestamp
    };

    try {
        const id = await SaveRequest(evento);
        console.log(`[${timestamp}] ✅ Evento registrado (${client.nome}) - ID ${id}`);
        return res.status(200).json({ success: true, id });
    } catch (err) {
        await SaveFailure({
            endpoint,
            motivo: err.message || 'Erro ao registrar evento',
            data: timestamp
        });
        return res.status(500).json({ error: 'Erro interno ao registrar evento' });
    }
});

router.get('/Errors', async (req, res) => {
    try {
        const erros = await ListError();
        res.json(erros);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao consultar erros' });
    }
});

module.exports = router;
