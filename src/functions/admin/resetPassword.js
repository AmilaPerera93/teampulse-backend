const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require('bcryptjs');

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = new CosmosClient(connectionString);
const container = client.database("TeamPulseDB").container("users");

app.http('resetPassword', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { userId, newPassword } = await request.json();

            // 1. Fetch the user from Cosmos
            const { resource: user } = await container.item(userId, userId).read();
            if (!user) return { status: 404, body: "User not found" };

            // 2. Hash the new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);

            // 3. Update the record
            await container.item(userId, userId).replace(user);

            return { 
                status: 200, 
                jsonBody: { success: true, message: "Password updated successfully" } 
            };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});