const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require('bcryptjs');

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = new CosmosClient(connectionString);
const container = client.database("TeamPulseDB").container("users");

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { username, password } = await request.json();
            
            // 1. Find user across all partitions
            const { resources } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.username = @u",
                    parameters: [{ name: "@u", value: username }]
                }, { forceQueryPlan: true }) 
                .fetchAll();

            if (resources.length === 0) {
                return { status: 401, jsonBody: { success: false, message: "User not found" } };
            }

            const user = resources[0];
            let isMatch = false;

            // 2. Hybrid Password Check (Bcrypt vs Plain Text)
            try {
                isMatch = await bcrypt.compare(password, user.password);
            } catch (e) {
                isMatch = (password === user.password);
            }

            if (isMatch) {
                // Generate a session token for the Web App auto-login
                const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
                
                // Update user status to Online
                user.onlineStatus = 'Online';
                user.lastSeen = new Date().toISOString();
                user.sessionToken = sessionToken;
                
                await container.item(user.id, user.id).replace(user);

                const { password: _, ...safeUser } = user;
                return { status: 200, jsonBody: { success: true, user: safeUser } };
            } else {
                return { status: 401, jsonBody: { success: false, message: "Invalid Credentials" } };
            }
        } catch (error) {
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});