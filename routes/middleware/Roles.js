module.exports = function authAdmin(req, res, next) {
    const auth = req.headers['authorization'];
    const token = auth?.replace('Bearer ', '');

    if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    next();
};
