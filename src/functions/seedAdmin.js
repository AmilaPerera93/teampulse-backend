const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require('bcryptjs');

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("TeamPulseDB").container("users");

app.http('seedAdmin', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 1. Check if Admin exists
            const { resources } = await container.items
                .query("SELECT * FROM c WHERE c.username = 'admin'")
                .fetchAll();

            if (resources.length > 0) return { body: "Admin already exists." };

            // 2. Create Admin
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("admin123", salt);

            const adminUser = {
                id: "admin_001",
                username: "admin",
                password: hashedPassword,
                fullname: "System Admin",
                role: "ADMIN",
                onlineStatus: "Offline",
                lastSeen: new Date().toISOString()
            };

            await container.items.create(adminUser);
            return { body: "Success! Admin user created. Login with 'admin' / 'admin123'" };

        } catch (error) {
            return { status: 500, body: "Error: " + error.message };
        }
    }
});