const prisma = require('../config/prisma');

async function logAction(userId, action, metadata = {}) {
  return prisma.historyLog.create({
    data: { userId, action, metadata },
  });
}

async function getUserHistory(userId, { limit = 50, cursor } = {}) {
  return prisma.historyLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });
}

module.exports = { logAction, getUserHistory };
