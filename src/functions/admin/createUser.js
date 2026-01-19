const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("users");
}

app.http('createUser', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userData = await request.json();

            // Validation
            if (!userData.username || !userData.password || !userData.role) {
                return { status: 400, body: "Missing username, password, or role" };
            }

            const container = await getContainer();
            
            // Check if user already exists
            const { resources } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.username = @u",
                    parameters: [{ name: "@u", value: userData.username }]
                })
                .fetchAll();

            if (resources.length > 0) {
                return { status: 409, body: "User already exists" };
            }

            // Create User (ID = username is a good strategy for uniqueness)
            userData.id = userData.username; 
            userData.createdAt = new Date().toISOString();

            const { resource } = await container.items.create(userData);
            
            // Remove password from response
            delete resource.password;
            return { status: 201, jsonBody: resource };

        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});