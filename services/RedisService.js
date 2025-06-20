const { createClient } = require('redis');
const redis = createClient({ url: process.env.REDIS_URL });
const logger = require('../tools/Logger');

async function ConnectRedis() {
  if (!redis.isOpen) {
    try {
      logger.logCustom({ emoji: '🔄', message: 'Conectando ao Redis...', type: 'info' });
      await redis.connect();
      logger.logSuccess('Conexão estabelecida com Redis');
    } catch (err) {
      logger.logError(`Erro ao conectar no Redis: ${err.message}`);
      console.log(err);
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


function parsePayload(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

module.exports = {
  ConnectRedis,
  SaveRequest,
  SaveFailure,
  redis,
  parsePayload
};
