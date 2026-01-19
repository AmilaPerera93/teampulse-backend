const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("settings");

app.http('manageSettings', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const key = request.query.get('key') || 'leave_config';
        
        if (request.method === 'GET') {
            try {
                const { resource } = await container.item(key, key).read();
                return { jsonBody: resource || {} };
            } catch (e) { return { jsonBody: {} }; }
        }

        if (request.method === 'POST') {
            const data = await request.json();
            data.id = key; 
            const { resource } = await container.items.upsert(data);
            return { jsonBody: resource };
        }
    }
});