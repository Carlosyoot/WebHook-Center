require('dotenv').config();
const express = require('express');
const { ConnectRedis } = require('../services/RedisService');
const webhookRoutes = require('../routes/webhook');
const securityRoutes = require('../routes/security');

const app = express();
app.use(express.json());
app.use(webhookRoutes);
app.use(securityRoutes);

(async () => {
  await ConnectRedis();

  const port = process.env.PORT || 4747;
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
})();
