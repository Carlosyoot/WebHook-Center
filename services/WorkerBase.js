const { createClient } = require('redis');
const axios = require('axios');
const logger = require('../tools/Logger');
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
  } else {
    logger.logInfo(`Grupo Redis "${GROUP_NAME}" já existe.`);
  }
}

async function startWorker() {
  await redis.connect();
  await createGroupIfNeeded();

  logger.logSuccess('Worker Redis iniciado. Aguardando eventos...');

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
          const cliente = message.cliente || 'Desconhecido - possível erro';
          const rawEvento = message.evento || '{}';

          try {
            const evento = JSON.parse(rawEvento);
            const payload = {
              payload: JSON.parse(evento.payload || '{}'),
              data: evento.data
            };

            console.log(NIFI_ENDPOINT);
            console.log(payload.data);
            await axios.post(NIFI_ENDPOINT, payload);
            logger.logSuccess(`Enviado para NiFi (${cliente}) - ID ${id}`);
            await redis.xAck(STREAM_KEY, GROUP_NAME, id);
          } catch (err) {
            logger.logError(`Falha ao enviar para NiFi (${cliente}) - ID ${id}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.logError(`Erro no loop do worker: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

startWorker();
