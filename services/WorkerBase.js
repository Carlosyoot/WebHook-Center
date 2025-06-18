const { createClient } = require('redis');
const axios = require('axios');
require('dotenv').config();

const STREAM_KEY = 'webhook:sucesso';
const GROUP_NAME = 'nifi-group';
const CONSUMER_NAME = 'worker-1';
const NIFI_ENDPOINT = process.env.NIFI_ENDPOINT;

const redis = createClient({ url: process.env.REDIS_URL });

async function startWorker() {
  await redis.connect();

  try {
    await redis.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
    console.log(`Grupo "${GROUP_NAME}" criado ou já existente.`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error('Erro ao criar o grupo:', err.message);
      return;
    }
    console.log(`Grupo "${GROUP_NAME}" já existe.`);
  }

  console.log('Worker ativo. Aguardando mensagens...');

  while (true) {
    try {
      const response = await redis.xReadGroup(GROUP_NAME, CONSUMER_NAME, {
        key: STREAM_KEY,
        id: '>'
      }, { COUNT: 1, BLOCK: 5000 });

      if (!response) continue;

      for (const [streamName, messages] of response) {
        for (const [id, fieldsArray] of messages) {
          const fields = {};
          for (let i = 0; i < fieldsArray.length; i += 2) {
            fields[fieldsArray[i]] = fieldsArray[i + 1];
          }

          const evento = JSON.parse(fields.evento || '{}');
          const payload = {
            payload: JSON.parse(evento.payload || '{}'),
            data: evento.data
          };

          try {
            await axios.post(NIFI_ENDPOINT, payload);
            console.log(`✅ Enviado para NiFi (${fields.cliente}) - ID ${id}`);
            await redis.xAck(STREAM_KEY, GROUP_NAME, id);
          } catch (err) {
            console.error(`❌ Erro ao enviar para NiFi (${fields.cliente}) - ID ${id}: ${err.message}`);
          }
        }
      }

    } catch (err) {
      console.error('Erro inesperado no loop do worker:', err.message);
      await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
  }
}

startWorker();
