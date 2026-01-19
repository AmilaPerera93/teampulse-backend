const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const db = client.database("TeamPulseDB");

app.http('getLogs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const type = request.query.get('type'); // 'breaks', 'power_logs', 'idle_logs', 'interruptions'
        const date = request.query.get('date');
        const userId = request.query.get('userId');

        if (!type || !date) return { status: 400, body: "Type and Date required" };

        const container = db.container(type);
        let query = "SELECT * FROM c WHERE c.date = @date";
        const parameters = [{ name: "@date", value: date }];

        if (userId) {
            query += " AND c.userId = @userId";
            parameters.push({ name: "@userId", value: userId });
        }

        const { resources } = await container.items.query({ query, parameters }).fetchAll();
        return { jsonBody: resources };
    }
});