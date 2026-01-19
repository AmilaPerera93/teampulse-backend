const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("invoices");

app.http('manageInvoices', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'GET') {
            const { resources } = await container.items.query("SELECT * FROM c ORDER BY c.date DESC").fetchAll();
            return { jsonBody: resources };
        }

        if (request.method === 'POST') {
            const invoice = await request.json(); 
            invoice.id = invoice.id || new Date().getTime().toString();
            invoice.createdAt = new Date().toISOString();
            const { resource } = await container.items.upsert(invoice);
            return { status: 201, jsonBody: resource };
        }
    }
});