const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("leads");

app.http('manageLeads', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'GET') {
            const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
            return { jsonBody: resources };
        }

        if (request.method === 'POST') {
            const lead = await request.json(); // { name, email, status: 'New', value: 500 }
            lead.id = lead.id || new Date().getTime().toString();
            const { resource } = await container.items.upsert(lead);
            return { status: 201, jsonBody: resource };
        }
        
        if (request.method === 'DELETE') {
             const id = request.query.get('id');
              
             await container.item(id, "lead").delete(); 
             return { status: 204 };
        }
    }
});