const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("clients");
}

app.http('getClients', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const container = await getContainer();
            const { resources } = await container.items.query("SELECT * FROM c").fetchAll();
            return { jsonBody: resources };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});

app.http('saveClient', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const data = await request.json();
            const container = await getContainer();
            data.id = data.id || new Date().getTime().toString();
            const { resource } = await container.items.upsert(data);
            return { status: 201, jsonBody: resource };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});