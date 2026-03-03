const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const checkoutService = require('../services/checkoutService');
const snovService = require('../services/snovService');
const { logger } = require('../utils/logger');

router.post('/checkout', async (req, res) => {
  try {
    const { checkoutId, email, firstName, lastName, cartValue, currency } = req.body;

    if (!checkoutId || !email) {
      return res.status(400).json({ error: 'checkoutId and email are required' });
    }

    const checkout = await checkoutService.upsertCheckout({
      checkoutId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      recoveryUrl: `https://test-recovery.com/checkout/${checkoutId}`,
      cartValue: cartValue || 100.00,
      currency: currency || 'USD'
    });

    res.json({ success: true, checkout });
  } catch (error) {
    logger.error('Test checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/order', async (req, res) => {
  try {
    const { orderId, email, totalPrice, currency } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({ error: 'orderId and email are required' });
    }

    const order = await prisma.order.create({
      data: {
        orderId,
        email,
        totalPrice: totalPrice || 100.00,
        currency: currency || 'USD'
      }
    });

    await checkoutService.markAsConverted(email);

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Test order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/customer', async (req, res) => {
  try {
    const { shopifyCustomerId, email, firstName, lastName } = req.body;

    if (!shopifyCustomerId || !email) {
      return res.status(400).json({ error: 'shopifyCustomerId and email are required' });
    }

    const customer = await prisma.customer.create({
      data: {
        shopifyCustomerId,
        email,
        firstName: firstName || '',
        lastName: lastName || ''
      }
    });

    res.json({ success: true, customer });
  } catch (error) {
    logger.error('Test customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/checkouts', async (req, res) => {
  try {
    const checkouts = await prisma.checkout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, count: checkouts.length, checkouts });
  } catch (error) {
    logger.error('Get checkouts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/reset', async (req, res) => {
  try {
    await prisma.checkout.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.customer.deleteMany({});

    logger.info('Database reset successfully');
    res.json({ success: true, message: 'All data deleted' });
  } catch (error) {
    logger.error('Reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/snov', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    logger.info(`Test Snov: Pushing ${email} to abandoned list`);
    const result = await snovService.triggerAbandoned(email, firstName || 'Test', lastName || 'User');

    res.json({ success: true, result });
  } catch (error) {
    logger.error('Test Snov error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/dne-status', async (req, res) => {
  try {
    const unsyncedCustomers = await prisma.customer.count({
      where: { email: { not: null }, dneSyncedAt: null }
    });
    const unsyncedOrders = await prisma.order.count({
      where: { email: { not: null }, dneSyncedAt: null }
    });
    const unsyncedCheckouts = await prisma.checkout.count({
      where: { email: { not: null }, dneSyncedAt: null }
    });

    res.json({
      unsyncedCustomers,
      unsyncedOrders,
      unsyncedCheckouts
    });
  } catch (error) {
    logger.error('DNE status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
