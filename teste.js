const cron = require('node-cron');
const redis = require('./services/RedisService');
const logger = require('./tools/Logger');

const CONCLUIDO_STREAM = 'nifi:sucesso';

const trimCount = 1000;

// Função que faz o trim
async function trimConcluidoStream() {

    redis.ConnectRedis();

  try {
    await redis.redis.xTrim(CONCLUIDO_STREAM, 'MAXLEN', trimCount);
    logger.logCustom({
      emoji: '🔸',
      message: `Limpeza aplicada em "${CONCLUIDO_STREAM}" (MAXLEN = ${trimCount})`,
      type: 'info',
    });
  } catch (err) {
    console.log("erro",err.message)
    logger.logError(`Falha ao limpar ${CONCLUIDO_STREAM}:`, err.message);
  }
}

cron.schedule('0 0 */14 * *', trimConcluidoStream);

// 👉 Execução imediata (para testar manualmente)
trimConcluidoStream();

module.exports = {}; // ou module.exports = router se fizer parte de rotas
