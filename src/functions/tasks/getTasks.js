const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("tasks");
}

app.http('getTasks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const user = request.query.get('user');
        const date = request.query.get('date');

        if (!date) return { status: 400, body: "Date is required" };

        try {
            const container = await getContainer();
            let querySpec;

            // Scenario 1: Specific User (For Member Dashboard)
            if (user) {
                querySpec = {
                    query: "SELECT * FROM c WHERE c.assignedTo = @user AND c.date = @date",
                    parameters: [{ name: "@user", value: user }, { name: "@date", value: date }]
                };
            } 
            // Scenario 2: Admin Dashboard (All Tasks for Date)
            else {
                querySpec = {
                    query: "SELECT * FROM c WHERE c.date = @date",
                    parameters: [{ name: "@date", value: date }]
                };
            }

            const { resources } = await container.items.query(querySpec).fetchAll();
            return { jsonBody: resources };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});