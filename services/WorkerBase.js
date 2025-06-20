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
    console.log(`👷 Grupo "${GROUP_NAME}" criado.`);
  } catch (err) {
    if (err.message.includes('BUSYGROUP')) {
      console.log(`👷 Grupo "${GROUP_NAME}" já existe.`);
    } else {
      console.error('❌ Erro ao criar grupo:', err.message);
      console.log(process.env.NIFI_ENDPOINT);
      return;
    }
  }

  console.log('🚀 Worker ativo. Aguardando mensagens...');

  while (true) {
    try {
      const messages = await redis.xReadGroup(GROUP_NAME, CONSUMER_NAME, {
        key: STREAM_KEY,
        id: '>'
      }, {
        COUNT: 1,
        BLOCK: 5000
      });

      if (!messages || messages.length === 0) continue;

      for (const { messages: streamMessages } of messages) {
        for (const { id, message } of streamMessages) {
          try {
            const cliente = message.cliente || 'desconhecido';
            const eventoRaw = message.evento || '{}';
            const evento = JSON.parse(eventoRaw);

            const payload = {
              payload: JSON.parse(evento.payload || '{}'),
              data: evento.data
            };

            console.log("NIFI: " , NIFI_ENDPOINT, " Contéudo: ", payload);
            await axios.post(process.env.NIFI_ENDPOINT, payload);
            console.log(`✅ Enviado para NiFi (${cliente}) - ID ${id}`);
            await redis.xAck(STREAM_KEY, GROUP_NAME, id);
          } catch (err) {
            console.log(process.env.NIFI_ENDPOINT);
            console.error(`❌ Erro ao processar mensagem - ID ${id}:`, err.message);
          }
        }
      }

    } catch (err) {
      console.error('❌ Erro no loop do worker:', err.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

startWorker();
