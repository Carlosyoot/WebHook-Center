const { createClient } = require('redis');
const redis = createClient({ url: process.env.REDIS_URL });
const logger = require("../tools/Logger")

async function ConnectRedis() {
    if (!redis.isOpen) {
    try {
        await redis.connect();
        logger.logInfo("Conexão estabelecida com Redis")
    } catch (err) {
        logger.logError(`Erro ao conectar no Redis: ${err.message}`);
        throw err; 
    }
  }
}

async function SaveRequest(payload) {
    const { cliente, ...rest } = payload;
    const eventoJson = JSON.stringify(rest);

    return redis.xAdd('webhook:sucesso', '*', {
        cliente,          
        evento: eventoJson 
    });
}

async function SaveFailure(payload) {
    return redis.xAdd('webhook:erro', '*', payload);
}

async function ListError() {
    const response = await redis.xRange('eventos_erro', '-', '+');
    return response.map(([id, fields]) => ({
        id,
        rota: getField(fields, 'rota'),
        motivo: getField(fields, 'motivo'),
        data: getField(fields, 'data')
    }));
}

function getField(fields, key) {
    const index = fields.findIndex((f) => f === key);
    return index !== -1 ? fields[index + 1] : null;
}

function parsePayload(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

module.exports = {
    ConnectRedis,
    SaveRequest,
    SaveFailure,
    ListError,
};
