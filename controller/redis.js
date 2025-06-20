require('dotenv').config();
const express = require('express');
const { ConnectRedis } = require('../services/RedisService');
const webhookRoutes = require('../routes/Webhook');
const securityRoutes = require('../routes/Security');
const inspectRoutes = require('../routes/Inspect');
const NifiRoutes = require('../routes/Nifi');
const logger = require("../tools/Logger");
const { OpenTerminal } = require("../tools/Terminal");
const { startListener } = require("../services/Listener");

const app = express();
app.use(express.json());
app.use(webhookRoutes);
app.use(securityRoutes);
app.use(inspectRoutes);
app.use(NifiRoutes);

(async () => {
  try {
    const port = process.env.PORT || 4545;
    app.listen(port, () => {
      logger.logSuccess(`Servidor rodando na porta ${port}`);
    });
    await ConnectRedis();
    startListener();
    OpenTerminal();

  } catch (err) {
    logger.logError(`Falha ao iniciar servidor: ${err.message}`);
    console.log(`Falha ao iniciar servidor: ${err.message}`)
    process.exit(1);
  }
})();
