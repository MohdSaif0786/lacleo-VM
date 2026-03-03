const prisma = require('../src/config/prisma');
const { config } = require('../src/config/env');
const { logger } = require('../src/utils/logger');
const dneService = require('../src/services/dneService');

async function manualDNEPush() {
    logger.info('Starting MANUAL DNE PUSH for current data');

    try {
        // 1. Process Customers (Welcome DNE)
        const unsyncedCustomers = await prisma.customer.findMany({
            where: {
                email: { not: null },
                dneSyncedAt: null
            }
        });

        logger.info(`Found ${unsyncedCustomers.length} unsynced Customers`);
        let custCount = 0;
        for (const customer of unsyncedCustomers) {
            custCount++;
            logger.info(`Processing Customer ${custCount}/${unsyncedCustomers.length}: ${customer.email}`);
            const result = await dneService.addToDNEList(config.snov.lists.dneWelcome, customer.email);
            if (result.success) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { dneSyncedAt: new Date() }
                });
            } else if (result.error === 'rate_limit' || (result.message && result.message.includes('rate is limited'))) {
                logger.error('RATE LIMITED. Stopping manual push. Please try again in 5 minutes.');
                process.exit(1);
            } else {
                logger.warn(`Failed to sync ${customer.email}: ${result.message}`);
            }
        }

        // 2. Process Orders (Upsell DNE)
        const unsyncedOrders = await prisma.order.findMany({
            where: {
                email: { not: null },
                dneSyncedAt: null
            }
        });

        logger.info(`Found ${unsyncedOrders.length} unsynced Orders`);
        let orderCount = 0;
        for (const order of unsyncedOrders) {
            orderCount++;
            logger.info(`Processing Order ${orderCount}/${unsyncedOrders.length}: ${order.email}`);
            const result = await dneService.addToDNEList(config.snov.lists.dneUpsell, order.email);
            if (result.success) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { dneSyncedAt: new Date() }
                });
            } else if (result.error === 'rate_limit' || (result.message && result.message.includes('rate is limited'))) {
                logger.error('RATE LIMITED. Stopping manual push. Please try again in 5 minutes.');
                process.exit(1);
            } else {
                logger.warn(`Failed to sync ${order.email}: ${result.message}`);
            }
        }

        logger.info('MANUAL DNE PUSH COMPLETE');
        process.exit(0);
    } catch (error) {
        logger.error('MANUAL DNE PUSH FAILED:', error);
        process.exit(1);
    }
}

manualDNEPush();
