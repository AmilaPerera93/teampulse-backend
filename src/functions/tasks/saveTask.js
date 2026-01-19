const { app } = require('@azure/functions');
const { getContainer } = require('../../../shared/cosmos');

app.http('saveTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const task = await request.json();

        if (!task.assignedTo || !task.description) {
            return { status: 400, body: "Missing task details" };
        }

        try {
            const container = await getContainer('tasks');
            
            // Automatically add required fields
            task.id = task.id || new Date().getTime().toString();
            task.partitionKey = task.assignedTo; // Add partition key
            task.createdAt = task.createdAt || new Date().toISOString(); // Add timestamp
            task.date = task.date || new Date().toISOString().split('T')[0]; // Add date if missing
            
            const { resource } = await container.items.upsert(task);
            return { status: 201, jsonBody: resource };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});