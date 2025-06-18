require('dotenv').config();
const { createClient } = require('redis');
const axios = require('axios');

const redis = createClient({ url: process.env.REDIS_URL });
const STREAM_KEY = 'webhook:sucesso';
const GROUP_NAME = 'nifi-group';
const CONSUMER_NAME = 'worker-1';
const NIFI_ENDPOINT = process.env.NIFI_ENDPOINT; // Exemplo: http://localhost:8080/nifi-api/processo

async function startWorker() {
  await redis.connect();

  try {
    await redis.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
    console.log(`Grupo "${GROUP_NAME}" criado ou já existente.`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error('Erro ao criar grupo:', err.message);
      return;
    }
  }

  console.log('Worker ativo. Aguardando mensagens...');

  while (true) {
    const response = await redis.xReadGroup(GROUP_NAME, CONSUMER_NAME, {
      key: STREAM_KEY,
      id: '>',
    }, { COUNT: 1, BLOCK: 5000 });

    if (!response) continue;

    for (const [, messages] of response) {
      for (const [id, fields] of messages) {
        const cliente = fields[1];
        const eventoJson = fields[3];

        try {
          const evento = JSON.parse(eventoJson);
          await axios.post(NIFI_ENDPOINT, evento);

          console.log(`✅ Enviado para NiFi: ${cliente} - ID ${id}`);
          await redis.xAck(STREAM_KEY, GROUP_NAME, id);
        } catch (err) {
          console.error(`❌ Falha ao enviar para NiFi (ID ${id}):`, err.message);
          // (por enquanto não reenvia nem salva em outra stream)
        }
      }
    }
  }
}

startWorker();
