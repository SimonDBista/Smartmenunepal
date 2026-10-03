import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In development, if schema models were added while dev server was running, ensure client is fresh
function getPrisma(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    (globalForPrisma.prisma as any).historicalSale &&
    (globalForPrisma.prisma as any).ingredient
  ) {
    return globalForPrisma.prisma;
  }

  try {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('.prisma') || key.includes('@prisma')) {
        delete require.cache[key];
      }
    });
  } catch {}

  const FreshClient = require('@prisma/client').PrismaClient;
  const newClient = new FreshClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = newClient;
  }
  return newClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
export default prisma;
