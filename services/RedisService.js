const { createClient } = require('redis');
const redis = createClient({ url: process.env.REDIS_URL });

async function ConnectRedis() {
    if (!redis.isOpen) {
    await redis.connect();
    }
}

async function SaveRequest(payload) {
    return redis.xAdd('eventos_usuarios', '*', payload);
}

async function SaveFailure(payload) {
    return redis.xAdd('eventos_erro', '*', payload);
}

async function ListError() {
    const response = await redis.xRange('eventos_erro', '-', '+');
    return response.map(([id, fields]) => ({
        id,
        ...fields
    }));
}

module.exports = {
    ConnectRedis,
    SaveRequest,
    SaveFailure,
    ListError
};
