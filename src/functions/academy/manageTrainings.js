const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = new CosmosClient(connectionString);
const container = client.database("TeamPulseDB").container("trainings");

app.http('manageTrainings', {
    methods: ['GET', 'POST', 'PUT'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const method = request.method;

        // --- GET: Fetch Trainings ---
        if (method === 'GET') {
            const assignedTo = request.query.get('assignedTo');
            // If assignedTo provided, get My Trainings. Else get ALL (Admin).
            const query = assignedTo 
                ? "SELECT * FROM c WHERE c.assignedTo = @u" 
                : "SELECT * FROM c";
            const parameters = assignedTo ? [{ name: "@u", value: assignedTo }] : [];

            const { resources } = await container.items.query({ query, parameters }).fetchAll();
            return { jsonBody: resources };
        }

        // --- POST: Assign Training ---
        if (method === 'POST') {
            const data = await request.json();
            data.id = data.id || new Date().getTime().toString();
            data.status = 'Pending';
            data.assignedAt = new Date().toISOString();
            
            const { resource } = await container.items.create(data);
            return { status: 201, jsonBody: resource };
        }

        // --- PUT: Mark as Done ---
        if (method === 'PUT') {
            const data = await request.json();
            // Expects { id, status: "Completed" }
            const { resource } = await container.item(data.id, data.assignedTo).patch([
                { op: "set", path: "/status", value: data.status },
                { op: "set", path: "/completedAt", value: new Date().toISOString() }
            ]);
            return { jsonBody: resource };
        }
    }
});