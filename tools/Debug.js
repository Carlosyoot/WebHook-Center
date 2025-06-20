const { createClient } = require('redis');
const redis = createClient({ url: process.env.REDIS_URL });

async function listStreamMessages() {
  await redis.connect();

  const streamKey = 'webhook:sucesso';

  try {
    const messages = await redis.xRange(streamKey, '-', '+');

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log(`🚫 Nenhuma mensagem encontrada no stream "${streamKey}".`);
      return;
    }

    console.log(`📥 Mensagens no stream "${streamKey}":\n`);

    for (const entry of messages) {
      const { id, message } = entry;

      if (!id || typeof message !== 'object') {
        console.log('⚠️ Entrada inválida ignorada:', entry);
        continue;
      }

      const { cliente, evento } = message;

      let eventoParseado = evento;
      try {
        eventoParseado = JSON.parse(evento);
      } catch {
        eventoParseado = { raw: evento };
      }

      console.log(`🆔 ID: ${id}`);
      console.log(`👤 Cliente: ${cliente}`);
      console.log(`📦 Evento:`);
      console.log(JSON.stringify(eventoParseado, null, 2));
      console.log('---');
    }
  } catch (err) {
    console.error('❌ Erro ao listar mensagens:', err);
  } finally {
    await redis.disconnect();
  }
}

listStreamMessages();
