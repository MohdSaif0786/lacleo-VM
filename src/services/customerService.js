const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

class CustomerService {

  /**
   * Create or update a Shopify customer
   */
  async upsertCustomer(customerData) {
    if (!customerData || !customerData.shopifyCustomerId) {
      throw new Error('shopifyCustomerId is required');
    }

    try {

      const data = {
        email: customerData.email || null,
        firstName: customerData.firstName || null,
        lastName: customerData.lastName || null,
        phone: customerData.phone || null,
        address: customerData.address
          ? JSON.stringify(customerData.address)
          : null
      };

      const customer = await prisma.customer.upsert({
        where: {
          shopifyCustomerId: customerData.shopifyCustomerId
        },
        update: data,
        create: {
          shopifyCustomerId: customerData.shopifyCustomerId,
          ...data
        }
      });

      logger.info(
        `Customer saved | ShopifyID: ${customer.shopifyCustomerId} | Email: ${customer.email}`
      );

      return customer;

    } catch (error) {
      logger.error('Error upserting customer', {
        shopifyCustomerId: customerData.shopifyCustomerId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Update Snov email sent timestamp
   */
  async updateSnovSentAt(shopifyCustomerId) {
    if (!shopifyCustomerId) {
      throw new Error('shopifyCustomerId is required');
    }

    try {

      const result = await prisma.customer.updateMany({
        where: { shopifyCustomerId },
        data: {
          snovSentAt: new Date()
        }
      });

      if (result.count === 0) {
        logger.warn(`Customer not found for ShopifyID: ${shopifyCustomerId}`);
      }

      return result;

    } catch (error) {
      logger.error('Error updating snovSentAt', {
        shopifyCustomerId,
        error: error.message
      });

      throw error;
    }
  }

}

module.exports = new CustomerService();