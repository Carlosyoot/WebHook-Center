const { createClient } = require('redis');
const axios = require('axios');
const logger = require('../tools/Logger');
const RetryService = require('../services/RetryService');
require('dotenv').config();

const STREAM_KEY = 'webhook:sucesso';
const GROUP_NAME = 'nifi-group';
const CONSUMER_NAME = 'worker-1';
const NIFI_ENDPOINT = process.env.NIFI_ENDPOINT;

const redis = createClient({ url: process.env.REDIS_URL });

async function groupExists() {
  try {
    const groups = await redis.xInfoGroups(STREAM_KEY);
    return groups.some(g => g.name === GROUP_NAME);
  } catch (err) {
    return false;
  }
}

async function createGroupIfNeeded() {
  const exists = await groupExists();
  if (!exists) {
    try {
      await redis.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
      logger.logSuccess(`Grupo Redis "${GROUP_NAME}" criado.`);
    } catch (err) {
      logger.logError(`Erro ao criar grupo Redis: ${err.message}`);
      throw err;
    }
  }
}

async function processMessage(id, message) {
  const cliente = message.cliente || 'Desconhecido';
  const rawEvento = message.evento || '{}';

  try {
    const evento = JSON.parse(rawEvento);
    const payload = {
      payload: JSON.parse(evento.payload || '{}'),
      data: evento.data,
      id: id
    };

    await axios.post(NIFI_ENDPOINT, payload);
    logger.logSuccess(`Enviado para NiFi (${cliente}) - ID ${id}`);

    await redis.xAck(STREAM_KEY, GROUP_NAME, id);
    await RetryService.resetRetry(id);
  } catch (err) {
    logger.logError(`Erro ao enviar para Nifi (${cliente}) - ID ${id}: ${err.message}`);
    const attempts = await RetryService.registerRetry(id);
    const shouldRetry = await RetryService.shouldRetry(id);

    if (shouldRetry) {
      const delay = RetryService.getBackoffDelay(attempts);
      logger.logCustom({ emoji: '⭕', message: `Tentativa ${attempts} para ID ${id} falhou. Reprocessando em ${delay}ms.`, type: 'warning'});
      
      setTimeout(() => processMessage(id, message), delay);
    } else {
      logger.logError(`Tentativas esgotadas para ID ${id}: ${err.message}`);
    }
  }
}

async function startListener() {
  await redis.connect();
  await createGroupIfNeeded();

  logger.logCustom({
  emoji: '🔁',
  message: 'Worker Redis iniciado. Aguardando eventos...',
  type: 'success'
  });


  while (true) {
    try {
      const response = await redis.xReadGroup(GROUP_NAME, CONSUMER_NAME, {
        key: STREAM_KEY,
        id: '>'
      }, {
        COUNT: 1,
        BLOCK: 5000
      });

      if (!response || response.length === 0) continue;

      for (const { messages: streamMessages } of response) {
        for (const { id, message } of streamMessages) {
          await processMessage(id, message);
        }
      }
    } catch (err) {
      logger.logError(`Erro no loop do listener: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = { startListener };
