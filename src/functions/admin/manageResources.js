const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("allocations");

app.http('manageResources', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'GET') {
            const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
            return { jsonBody: resources };
        }
        if (request.method === 'POST') {
            const allocation = await request.json(); // { userId, project, hours, week }
            allocation.id = allocation.id || new Date().getTime().toString();
            const { resource } = await container.items.upsert(allocation);
            return { status: 201, jsonBody: resource };
        }
    }
});