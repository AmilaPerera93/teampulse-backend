const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("tasks");
}

app.http('saveTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const task = await request.json();

        if (!task.assignedTo || !task.description) {
            return { status: 400, body: "Missing task details" };
        }

        try {
            const container = await getContainer();
            // Ensure ID exists
            task.id = task.id || new Date().getTime().toString();
            
            // Upsert (Create or Update)
            const { resource } = await container.items.upsert(task);
            return { status: 201, jsonBody: resource };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});