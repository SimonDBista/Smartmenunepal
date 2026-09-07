import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In development, if schema models were added while dev server was running, ensure client is fresh
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma && (globalForPrisma.prisma as any).historicalSale) {
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

export const prisma = getPrisma();
export default prisma;
