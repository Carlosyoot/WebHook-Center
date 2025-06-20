const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const logger = require("../tools/Logger");
const { decrypt } = require('../services/crypto');
const { SaveRequest, SaveFailure, ListError } = require('../services/RedisService');

const clients = JSON.parse(fs.readFileSync(path.join(__dirname, '../secrets/clients.json'), 'utf8'));

router.post(process.env.WEBHOOK_ENDPOINT || '/webhook', async (req, res) => {
    const timestamp = new Date().toISOString();
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    const { endpoint, ...payload } = req.body;

    if (!token) {
        return res.status(401).json({ error: 'Token ausente' });
    }

    const matchedClient = Object.values(clients).find(client => {
        if (!client.ativo) return false;
        try {
            return decrypt(client.secret_enc) === token;
        } catch {
            return false;
        }
    });

    if (!matchedClient) {
        await SaveFailure({
            endpoint: endpoint || 'indefinido',
            motivo: 'Token inválido ou cliente inativo',
            data: timestamp
        });
        return res.status(403).json({ error: 'Autenticação falhou' });
    }

    if (!endpoint || typeof endpoint !== 'string') {
        await SaveFailure({
            endpoint: 'indefinido',
            motivo: 'Campo "endpoint" ausente ou inválido',
            data: timestamp
        });
        return res.status(400).json({ error: 'Campo "endpoint" é obrigatório' });
    }

    const evento = {
        cliente: matchedClient.nome,
        endpoint,
        payload: JSON.stringify(payload),
        data: timestamp
    };

    try {
        const id = await SaveRequest(evento);
        logger.logSuccess(`Evento registrado (${matchedClient.nome} - ${endpoint}) - ID ${process.env.INSPECT_ENDPOINT}${id}`)
        return res.status(200).json({ success: true});
    } catch (err) {
        await SaveFailure({
            endpoint,
            motivo: err.message || 'Erro ao registrar evento',
            data: timestamp
        });
        logger.logError(`Erro ao registrar evento: ${err.message}`);
        return res.status(500).json({ error: 'Erro interno ao registrar evento' });
    }
});

router.get('/errors', async (req, res) => {
    try {
        const erros = await ListError();
        res.json(erros);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao consultar erros' });
    }
});

module.exports = router;
