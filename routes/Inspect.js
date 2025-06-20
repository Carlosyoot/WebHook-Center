const express = require('express');
const redisService = require('../services/RedisService');
const router = express.Router();

const STREAM_KEY = 'webhook:sucesso';

router.get('/inspect/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await redisService.redis.xRange(STREAM_KEY, id, id);

    if (!Array.isArray(result) || result.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    const { id: eventId, message } = result[0];

    let cliente = message.cliente;
    let evento = message.evento;

    try {
      if (typeof evento === 'string') {
        evento = JSON.parse(evento);
      }

      if (evento.payload && typeof evento.payload === 'string') {
        evento.payload = JSON.parse(evento.payload);
      }
    } catch (e) {
        
    }

    return res.json({
      id: eventId,
      cliente,
      endpoint: evento.endpoint || null,
      data: evento.data || null,
      payload: evento.payload || evento || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
