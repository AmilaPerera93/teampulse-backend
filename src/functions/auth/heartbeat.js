const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = new CosmosClient(connectionString);
const container = client.database("TeamPulseDB").container("users");

app.http('heartbeat', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const { userId, status } = await request.json();

        if (!userId) return { status: 400 };

        try {
            
            await container.item(userId, userId).patch([
                { op: "set", path: "/lastSeen", value: new Date().toISOString() },
                { op: "set", path: "/onlineStatus", value: status || "Online" }
            ]);
            return { status: 200 };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});