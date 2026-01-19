const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("trainings");
}

app.http('getTrainings', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const assignedTo = request.query.get('assignedTo');
        try {
            const container = await getContainer();
            let querySpec = { query: "SELECT * FROM c" };
            
            if (assignedTo) {
                querySpec = {
                    query: "SELECT * FROM c WHERE c.assignedTo = @u",
                    parameters: [{ name: "@u", value: assignedTo }]
                };
            }

            const { resources } = await container.items.query(querySpec).fetchAll();
            return { jsonBody: resources };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});