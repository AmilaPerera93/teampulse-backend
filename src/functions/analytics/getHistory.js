const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getDb() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB");
}

app.http('getHistory', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const userId = request.query.get('userId');
        const fullname = request.query.get('fullname');
        const startDate = request.query.get('startDate');

        if (!userId || !startDate) return { status: 400, body: "Missing params" };

        try {
            const db = await getDb();
            
            // 1. Fetch Tasks
            const { resources: tasks } = await db.container("tasks").items
                .query({
                    query: "SELECT * FROM c WHERE c.assignedTo = @f AND c.date >= @s",
                    parameters: [{ name: "@f", value: fullname }, { name: "@s", value: startDate }]
                }).fetchAll();

            // 2. Fetch Breaks
            const { resources: breaks } = await db.container("breaks").items
                .query({
                    query: "SELECT * FROM c WHERE c.userId = @u AND c.date >= @s",
                    parameters: [{ name: "@u", value: userId }, { name: "@s", value: startDate }]
                }).fetchAll();

            // 3. Fetch Power Logs
            const { resources: power } = await db.container("power_logs").items
                .query({
                    query: "SELECT * FROM c WHERE c.userId = @u AND c.date >= @s",
                    parameters: [{ name: "@u", value: userId }, { name: "@s", value: startDate }]
                }).fetchAll();

            return { jsonBody: { tasks, breaks, power } };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});