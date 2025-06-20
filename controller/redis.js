require('dotenv').config();
const express = require('express');
const { ConnectRedis } = require('../services/RedisService');
const webhookRoutes = require('../routes/Webhook');
const securityRoutes = require('../routes/Security');
const logger = require("../tools/Logger");
const { OpenTerminal } = require("../tools/Terminal");

const app = express();
app.use(express.json());
app.use(webhookRoutes);
app.use(securityRoutes);

(async () => {
  const port = process.env.PORT || 4747;
  app.listen(port, () => {
    logger.logSuccess(`Servidor rodando na porta ${port}`);
  });
  await ConnectRedis();
  OpenTerminal();
})();
