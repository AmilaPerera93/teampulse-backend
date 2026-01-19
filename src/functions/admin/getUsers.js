const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("users");
}

app.http('getUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const container = await getContainer();
            // Get all users who are just 'MEMBERS' (not admins)
            const { resources } = await container.items
                .query("SELECT * FROM c WHERE c.role = 'MEMBER'")
                .fetchAll();

            return { jsonBody: resources };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});