const express = require('express');
const cron = require('node-cron');
const logger = require("../tools/Logger");
const redisService = require('../services/RedisService');
const retryService = require('../services/RetryService');

const router = express.Router();

const SUCESSO_STREAM = 'webhook:sucesso';
const ERRO_STREAM = 'nifi:erro';
const CONCLUIDO_STREAM = 'nifi:sucesso'; 
const FALHA_STREAM = 'nifi:falha';

router.post('/nifi/confirm/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await redisService.redis.xRange(SUCESSO_STREAM, id, id);
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado no webhook:sucesso' });
    }

    const { message: evento } = result[0];

    await redisService.redis.xAdd(CONCLUIDO_STREAM, '*', evento);
    await redisService.redis.xDel(SUCESSO_STREAM, id);
    await redisService.redis.xDel(ERRO_STREAM, id).catch(() => {});
    await retryService.resetRetry(id);

    return res.json({ success: true, movedTo: CONCLUIDO_STREAM });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/nifi/failure/:id', async (req, res) => {
    const { id } = req.params;

  try {
    const result = await redisService.redis.xRange(SUCESSO_STREAM, id, id);
    if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Evento não encontrado no webhook:sucesso' });
    }

    const { message: evento } = result[0];

    await redisService.redis.xAdd(FALHA_STREAM, '*', evento);
    await redisService.redis.xDel(SUCESSO_STREAM, id);
    await redisService.redis.xDel(CONCLUIDO_STREAM, id).catch(() => {});
    await retryService.resetRetry(id);

    return res.json({ failed: true, movedTo: FALHA_STREAM });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

cron.schedule('0 2 * * *', async () => {
  try {
    const redis = redisService.redis;
    const limiteTimestamp = Date.now() - TTL_DIAS * 24 * 60 * 60 * 1000;
    const limiteId = `${Math.floor(limiteTimestamp)}-0`;

    const antigos = await redis.xRange(CONCLUIDO_STREAM, '0-0', limiteId);
    if (antigos.length > 0) {
      const ids = antigos.map(([id]) => id);
      for (const id of ids) {
        await redis.xDel(CONCLUIDO_STREAM, id);
      }
      logger.logCustom({
        emoji: '🧹',
        message: `Removidos ${ids.length} eventos com mais de ${TTL_DIAS} dias de "${CONCLUIDO_STREAM}"`,
        type: 'info',
      });
    }

    await redis.xTrim(CONCLUIDO_STREAM, 'MAXLEN', TRIM_MAXLEN);
    logger.logCustom({
      emoji: '🔸',
      message: `Limpeza por quantidade aplicado em "${CONCLUIDO_STREAM}" (MAXLEN = ${TRIM_MAXLEN})`,
      type: 'info',
    });

  } catch (err) {
    logger.logError(`Erro ao aplicar trim no stream "${CONCLUIDO_STREAM} : ${err.message}"`);
  }
});

module.exports = router;
