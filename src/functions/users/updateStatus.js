const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = new CosmosClient(connectionString);
const container = client.database("TeamPulseDB").container("users");

app.http('updateStatus', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { userId, status } = await request.json();
            
            const { resource: user } = await container.item(userId, userId).read();
            if (!user) return { status: 404, body: "User not found" };

            user.onlineStatus = status; // 'Online' or 'Idle'
            user.lastSeen = new Date().toISOString();

            await container.item(userId, userId).replace(user);
            return { status: 200, jsonBody: { success: true } };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});