const cron = require('node-cron');
const axios = require('axios');
const redisService = require('./RedisService');
const retryService = require('./RetryService');
const logger = require('../tools/Logger');

const FALHA_STREAM = 'nifi:falha';
const AUDITORIA_STREAM = 'nifi:auditoria';
const MAX_TENTATIVAS = 21; 
const NIFI_ENDPOINT = process.env.NIFI_ENDPOINT

cron.schedule('0 */8 * * *', async () => {
    try {
    const eventos = await redisService.redis.xRange(FALHA_STREAM, '-', '+');
    if (!eventos || eventos.length === 0) {
        return;
    }

    for (const [id, fields] of eventos) {
        const evento = {};
        for (let i = 0; i < fields.length; i += 2) {
            evento[fields[i]] = fields[i + 1];
    }

    const tentativas = await retryService.registerRetry(id);
    const shouldRetry = await retryService.shouldRetry(id, MAX_TENTATIVAS);

    if (!shouldRetry) {
        await redisService.redis.xAdd(AUDITORIA_STREAM, '*', evento);
        await redisService.redis.xDel(FALHA_STREAM, id);
        await retryService.resetRetry(id);
        logger.logCustom({ emoji: '📁', message: `Evento ${id} movido para auditoria (tentativas esgotadas).`, type: 'warning' });
        continue;
    }

    const cliente = evento.cliente || 'Desconhecido';
    try {
        const raw = JSON.parse(evento.evento);
        const payload = {
            payload: JSON.parse(raw.payload || '{}'),
            data: raw.data,
            id
        };

        await axios.post(NIFI_ENDPOINT, payload);
        await redisService.redis.xDel(FALHA_STREAM, id);
        await retryService.resetRetry(id);

        logger.logSuccess(`Evento reprocessado com sucesso para NiFi (${cliente}) - ID ${id}`);
        } catch (err) {
        logger.logError(`Reprocessamento falhou para ID ${id} (${cliente}): ${err.message}`);
    }
    }
    } catch (err) {
    logger.logError(`Erro no cron de reprocessamento do nifi:falha: ${err.message}`);
    }
});
