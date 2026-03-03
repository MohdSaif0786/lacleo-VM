const cron = require('node-cron');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { config } = require('../config/env');
const dneService = require('../services/dneService');

const BATCH_SIZE = 50;

let isRunning = false;

function startDNEMigrationJob() {
    logger.info('Starting DNE migration cron job (runs every 10 minutes)');

    cron.schedule('*/10 * * * *', async () => {
        if (isRunning) {
            logger.info('DNE migration job already running, skipping this iteration');
            return;
        }

        isRunning = true;
        logger.info('DNE SYNC START');

        try {
            // 1. Process Customers (Welcome DNE)
            const unsyncedCustomers = await prisma.customer.findMany({
                where: {
                    email: { not: null },
                    dneSyncedAt: null
                },
                take: BATCH_SIZE
            });

            const totalUnsyncedCustomers = await prisma.customer.count({
                where: {
                    email: { not: null },
                    dneSyncedAt: null
                }
            });

            if (unsyncedCustomers.length > 0) {
                logger.info(`DNE MIGRATION → Processed ${unsyncedCustomers.length} / Total ${totalUnsyncedCustomers}`);
                for (const customer of unsyncedCustomers) {
                    const result = await dneService.addToDNEList(config.snov.lists.dneWelcome, customer.email);
                    if (result.success) {
                        await prisma.customer.update({
                            where: { id: customer.id },
                            data: { dneSyncedAt: new Date() }
                        });
                    }
                }
            }

            // 2. Process Orders (Upsell DNE)
            const unsyncedOrders = await prisma.order.findMany({
                where: {
                    email: { not: null },
                    dneSyncedAt: null
                },
                take: BATCH_SIZE
            });

            const totalUnsyncedOrders = await prisma.order.count({
                where: {
                    email: { not: null },
                    dneSyncedAt: null
                }
            });

            if (unsyncedOrders.length > 0) {
                logger.info(`DNE MIGRATION → Processed ${unsyncedOrders.length} / Total ${totalUnsyncedOrders}`);
                for (const order of unsyncedOrders) {
                    const result = await dneService.addToDNEList(config.snov.lists.dneUpsell, order.email);
                    if (result.success) {
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { dneSyncedAt: new Date() }
                        });
                    }
                }
            }

            if (unsyncedCustomers.length === 0 && unsyncedOrders.length === 0) {
                logger.info('No unsynced records left for DNE migration');
            }

            logger.info('DNE SYNC COMPLETE');
        } catch (error) {
            logger.error('DNE migration job error:', error);
        } finally {
            isRunning = false;
        }
    });

    logger.info('DNE migration cron job started successfully');
}

module.exports = { startDNEMigrationJob };
