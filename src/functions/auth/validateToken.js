const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("users");
}

app.http('validateToken', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { sessionToken } = await request.json();
            
            if (!sessionToken) {
                return { status: 400, jsonBody: { success: false, message: "Session token required" } };
            }
            
            const container = await getContainer();
            const { resources } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.sessionToken = @token",
                    parameters: [{ name: "@token", value: sessionToken }]
                })
                .fetchAll();
                
            if (resources.length > 0) {
                const user = resources[0];
                
                // Check if token has expired
                if (user.tokenExpiry) {
                    const expiryTime = new Date(user.tokenExpiry);
                    if (expiryTime <= new Date()) {
                        return { status: 401, jsonBody: { success: false, message: "Session expired" } };
                    }
                }
                
                // Token is valid, update lastSeen
                user.lastSeen = new Date().toISOString();
                user.onlineStatus = 'Online';
                
                // Use username as partition key (not user.id)
                await container.item(user.id, user.username).replace(user);
                
                const { password: _, ...safeUser } = user;
                return { status: 200, jsonBody: { success: true, user: safeUser } };
            }
            
            return { status: 401, jsonBody: { success: false, message: "Invalid token" } };
        } catch (error) {
            context.log('validateToken error:', error);
            return { status: 500, jsonBody: { success: false, message: "Server Error: " + error.message } };
        }
    }
});
