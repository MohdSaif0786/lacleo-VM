const axios = require('axios');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');
const snovService = require('./snovService');

class DNEService {
    constructor() {
        this.baseUrl = 'https://api.snov.io/v1';
    }

    async addToDNEList(dneListId, email) {
        if (config.snov.mock) {
            logger.info(`[MOCK] SNOV DNE SEND → list=${dneListId} email=${email}`);
            return { success: true, mock: true };
        }

        if (!email || email === 'null' || !email.includes('@')) {
            logger.warn(`SNOV DNE SKIP → Invalid email: ${email}`);
            return { success: true, skipped: true, reason: 'invalid_email' };
        }

        try {
            // Add a 1.5 second delay BEFORE getting token and making request to stay under 60rpm
            await new Promise(resolve => setTimeout(resolve, 1500));

            const token = await snovService.getAccessToken();

            // Based on provided Snov.io API documentation:
            // Endpoint: https://api.snov.io/v1/do-not-email-list
            // Method: POST
            // Params: listId (required), items (array of emails/domains)
            // Note: The example shows items sent as part of the query string for some reason, 
            // but standard POST usually accepts JSON body. Let's try body first.

            const payload = {
                listId: Number(dneListId),
                items: [email]
            };

            logger.info(`SNOV DNE SEND → list=${dneListId} email=${email}`);

            const response = await axios.post(
                `${this.baseUrl}/do-not-email-list`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Snov API response for this endpoint: [{"success":true,"data":{"duplicates":[]}}]
            // or similar structure.
            const responseData = Array.isArray(response.data) ? response.data[0] : response.data;

            if (responseData.success) {
                logger.info(`SNOV DNE SUCCESS`);
                return { success: true };
            } else {
                logger.warn(`SNOV DNE FAILED: ${JSON.stringify(responseData)}`);
                return { success: false, error: 'api_failed', data: responseData };
            }
        } catch (error) {
            const errorData = error.response?.data;

            // Handle duplicate/already exists (Snov might return success: true with duplicates in data)
            // but if it throws 422:
            if (error.response?.status === 422) {
                logger.info(`SNOV DNE DUPLICATE`);
                return { success: true, duplicate: true };
            }

            // Handle rate limit (429)
            if (error.response?.status === 429 || (errorData && typeof errorData === 'string' && errorData.includes('rate is limited'))) {
                logger.error('SNOV API RATE LIMIT HIT');
                return { success: false, error: 'rate_limit', message: errorData || error.message };
            }

            logger.error('SNOV DNE FAIL', errorData || error.message);

            // Never throw blocking error as per requirements
            return { success: false, error: 'api_error', message: error.message };
        }
    }
}

module.exports = new DNEService();
