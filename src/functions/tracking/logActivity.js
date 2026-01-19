const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

// Helper to switch containers dynamically
async function getContainer(type) {
    if (!client) client = new CosmosClient(connectionString);
    const db = client.database("TeamPulseDB");
    
    // Map request 'type' to Container ID
    if (type === 'break') return db.container("breaks");
    if (type === 'power') return db.container("power_logs");
    if (type === 'interruption') return db.container("interruptions");
    if (type === 'idle') return db.container("idle_logs");
    
    throw new Error("Invalid log type");
}

app.http('saveLog', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { type, data } = await request.json(); 

            if (!type || !data) return { status: 400, body: "Missing type or data" };

            const container = await getContainer(type);
            
            // Ensure ID and timestamp
            data.id = data.id || new Date().getTime().toString();
            data.uploadedAt = new Date().toISOString();

            const { resource } = await container.items.create(data);
            return { status: 201, jsonBody: resource };

        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});