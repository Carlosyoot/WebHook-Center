/*

const { createClient } = require('redis');
const { axios } = require('axios');
const { ConnectRedis } = require("./RedisService");
require('dotenv').config();


const redis = createClient({url: process.env.REDIS_URL});



async function Group() {

    await ConnectRedis();

    try {
        const groups = await redis.xInfoGroups(STREAM_KEY).catch(err => {
        if (err.message.includes('No such key')) return [];
        throw err;
    });
    if (!groups.some(g => g.name === GROUP_NAME)) {
        await redis.xGroupCreate(STREAM_KEY, GROUP_NAME, '0', { MKSTREAM: true });
    }
    } finally {
    await redis.off();
    }




}

async function group() {
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
  }*/