const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require('bcryptjs');

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("users");

app.http('manageUsers', {
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const method = request.method;

        // --- GET: List All Users (Fix for hidden data) ---
        if (method === 'GET') {
            const { resources } = await container.items
                .query("SELECT * FROM c", { forceQueryPlan: true }) // <--- CRITICAL FIX
                .fetchAll();
            
            const sanitized = resources.map(({password, ...u}) => u);
            return { jsonBody: sanitized };
        }

        // --- POST: Create User (Fix for duplicate usernames) ---
        if (method === 'POST') {
            const userData = await request.json();

            // 1. Check if username already exists anywhere in the DB
            const { resources: existing } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.username = @u",
                    parameters: [{ name: "@u", value: userData.username }]
                }, { forceQueryPlan: true })
                .fetchAll();

            if (existing.length > 0) {
                return { status: 409, body: "Username already exists." };
            }

            userData.id = userData.id || new Date().getTime().toString();
            
            // 2. Hash Password
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
            
            const { resource } = await container.items.create(userData);
            return { status: 201, jsonBody: resource };
        }

        // --- DELETE: Remove User ---
        if (method === 'DELETE') {
            const id = request.query.get('id');
            // Uses id as partition key
            await container.item(id, id).delete();
            return { status: 204 };
        }

        // --- PATCH: Reset Password ---
        if (method === 'PATCH') {
            const { id, newPassword } = await request.json();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            await container.item(id, id).patch([
                { op: "set", path: "/password", value: hashedPassword }
            ]);
            return { status: 200, body: "Password updated" };
        }
    }
});