const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("TeamPulseDB").container("leaves");

app.http('manageLeaves', {
    methods: ['GET', 'POST', 'PATCH'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const method = request.method;

        if (method === 'GET') {
            const userId = request.query.get('userId');
            // User sees theirs, Admin sees all
            const query = userId 
                ? "SELECT * FROM c WHERE c.userId = @u ORDER BY c.createdAt DESC"
                : "SELECT * FROM c ORDER BY c.createdAt DESC";
            const parameters = userId ? [{ name: "@u", value: userId }] : [];
            
            const { resources } = await container.items.query({ query, parameters }).fetchAll();
            return { jsonBody: resources };
        }

        if (method === 'POST') {
            const leave = await request.json(); // { userId, userName, type, startDate, endDate, reason }
            leave.id = new Date().getTime().toString();
            leave.status = 'Pending';
            leave.createdAt = new Date().toISOString();
            
            const { resource } = await container.items.create(leave);
            return { status: 201, jsonBody: resource };
        }

        if (method === 'PATCH') {
            const { id, userId, status, adminNote } = await request.json(); // userId needed for partition key
            // Update status (Approved/Rejected)
            const { resource } = await container.item(id, userId).patch([
                { op: "set", path: "/status", value: status },
                { op: "set", path: "/adminNote", value: adminNote }
            ]);
            return { jsonBody: resource };
        }
    }
});