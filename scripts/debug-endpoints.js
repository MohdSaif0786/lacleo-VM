const axios = require('axios');
const snovService = require('../src/services/snovService');
const { config } = require('../src/config/env');

async function debugEndpoints() {
    const token = await snovService.getAccessToken();
    const testEmail = `test-endpoint-${Date.now()}@example.com`;
    const listId = config.snov.lists.dneWelcome;

    const endpoints = [
        'https://api.snov.io/v1/add-emails-to-dne',
        'https://api.snov.io/v1/add-to-do-not-contact-list',
        'https://api.snov.io/v1/add-to-dnc-list',
        'https://api.snov.io/v1/add-prospect-to-do-not-contact-list'
    ];

    for (const url of endpoints) {
        try {
            console.log(`Testing ${url}...`);
            const response = await axios.post(
                url,
                { listId: Number(listId), emails: [testEmail] },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`SUCCESS ${url}:`, response.data);
            return url;
        } catch (error) {
            console.error(`FAIL ${url}:`, error.response?.status, error.response?.data?.errors || error.message);
        }
    }
}

debugEndpoints();
