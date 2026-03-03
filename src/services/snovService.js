const axios = require('axios');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

class SnovService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://api.snov.io/v1';
  }

  async getAccessToken() {
    if (config.snov.mock) {
      logger.info('[MOCK] Using mock Snov.io access token');
      return 'mock_access_token';
    }

    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      logger.info('Fetching new Snov.io access token');

      const response = await axios.post(`${this.baseUrl}/oauth/access_token`, {
        grant_type: 'client_credentials',
        client_id: config.snov.clientId,
        client_secret: config.snov.clientSecret
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      logger.info('Snov.io access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      const errorData = error.response?.data;
      if (error.response?.status === 429 || (errorData && typeof errorData === 'string' && errorData.includes('rate is limited'))) {
        logger.error('Snov.io API Rate Limit Hit in Auth:', errorData);
      } else {
        logger.error('Failed to get Snov.io access token:', errorData || error.message);
      }
      throw new Error(typeof errorData === 'string' && errorData.includes('rate is limited') ? 'Snov.io Rate Limit' : 'Failed to authenticate with Snov.io');
    }
  }

  async addToList(listId, email, firstName, lastName) {
    if (config.snov.mock) {
      logger.info(`[MOCK] SNOV SEND → list=${listId} email=${email}`);
      return { success: true, mock: true };
    }

    const token = await this.getAccessToken();

    if (!email || email === 'null' || !email.includes('@')) {
      logger.warn(`SNOV SKIP → Invalid email: ${email}`);
      return { success: true, skipped: true, reason: 'invalid_email' };
    }

    const payload = {
      listId: Number(listId),
      email: email,
      firstName: firstName || '',
      lastName: lastName || ''
    };

    logger.info(`SNOV SEND → list=${listId} email=${email}`);

    try {
      const response = await axios.post(
        'https://api.snov.io/v1/add-prospect-to-list',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`SNOV SUCCESS → ${email}`, response.data);

      // PART 3: DNE SYNC (Do not block main flow)
      try {
        const dneService = require('./dneService');
        if (listId == config.snov.lists.welcome) {
          await dneService.addToDNEList(config.snov.lists.dneWelcome, email);
        } else if (listId == config.snov.lists.upsell) {
          await dneService.addToDNEList(config.snov.lists.dneUpsell, email);
        }
      } catch (dneError) {
        logger.error('SNOV DNE SYNC ERROR (NON-BLOCKING)', dneError.message);
      }

      return response.data;
    } catch (error) {
      const errorData = error.response?.data;

      // If prospect already exists, treat as success to prevent infinite retries
      if (error.response?.status === 422 && (errorData?.errors?.includes('already exists') || errorData?.errors === 'Prospect with same email already exists in your list')) {
        logger.info(`SNOV SUCCESS (ALREADY EXISTS) → ${email}`);

        // PART 3: DNE SYNC (Do not block main flow)
        try {
          const dneService = require('./dneService');
          if (listId == config.snov.lists.welcome) {
            await dneService.addToDNEList(config.snov.lists.dneWelcome, email);
          } else if (listId == config.snov.lists.upsell) {
            await dneService.addToDNEList(config.snov.lists.dneUpsell, email);
          }
        } catch (dneError) {
          logger.error('SNOV DNE SYNC ERROR (NON-BLOCKING)', dneError.message);
        }

        return { success: true, alreadyExists: true };
      }

      // If Snov cannot process this email (e.g. bounce/invalid), skip it permanently
      if (error.response?.status === 400 && errorData?.message?.includes('can not process this email')) {
        logger.warn(`SNOV SKIP (INVALID) → ${email}: ${errorData.message}`);
        return { success: true, skipped: true, reason: 'snov_rejected' };
      }

      logger.error('SNOV FAIL', errorData || error.message);
      throw error;
    }
  }

  async triggerAbandoned(email, firstName, lastName) {
    const listId = config.snov.lists.abandoned;
    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_ABANDONED not configured, skipping');
      return { skipped: true };
    }
    return await this.addToList(listId, email, firstName, lastName);
  }

  async triggerUpsell(email, firstName, lastName) {
    const listId = config.snov.lists.upsell;
    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_UPSELL not configured, skipping');
      return { skipped: true };
    }
    return await this.addToList(listId, email, firstName, lastName);
  }

  async triggerWelcome(email, firstName, lastName) {
    const listId = config.snov.lists.welcome;
    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_WELCOME not configured, skipping');
      return { skipped: true };
    }
    return await this.addToList(listId, email, firstName, lastName);
  }
}

module.exports = new SnovService();
