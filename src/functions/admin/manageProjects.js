const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const container = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
    .database("TeamPulseDB").container("projects");

app.http('manageProjects', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'GET') {
            const { resources } = await container.items.query("SELECT * FROM c ORDER BY c.name").fetchAll();
            return { jsonBody: resources };
        }
        if (request.method === 'POST') {
            const project = await request.json();
            project.id = project.id || new Date().getTime().toString();
            const { resource } = await container.items.create(project);
            return { jsonBody: resource };
        }
        if (request.method === 'DELETE') {
            const id = request.query.get('id');
             
            await container.item(id, id).delete(); 
            return { status: 204 };
        }
    }
});