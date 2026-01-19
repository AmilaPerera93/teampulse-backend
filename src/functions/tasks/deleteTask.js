const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("TeamPulseDB").container("tasks");

app.http('deleteTask', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const id = request.query.get('id');
        const assignedTo = request.query.get('assignedTo');  

        if (!id || !assignedTo) return { status: 400, body: "Missing ID or AssignedTo" };

        try {
             
            await container.item(id, assignedTo).delete();
            return { status: 204 }; 
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});