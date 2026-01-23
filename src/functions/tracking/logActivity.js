const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

// Helper to switch containers dynamically
async function getContainer(type) {
    if (!client) client = new CosmosClient(connectionString);
    const db = client.database("TeamPulseDB");
    
    // Normalize type (handle variations like break-start, break-end)
    const normalizedType = type.toLowerCase().replace(/-start|-end/g, '');
    
    // Map request 'type' to Container ID
    if (normalizedType === 'break') return db.container("breaks");
    if (normalizedType === 'power') return db.container("power_logs");
    if (normalizedType === 'interruption') return db.container("interruptions");
    if (normalizedType === 'idle') return db.container("idle_logs");
    
    throw new Error("Invalid log type: " + type);
}

// Main endpoint (matches frontend URL pattern: /api/logActivity?type=idle)
app.http('logActivity', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Get type from query string (?type=idle) or body
            const url = new URL(request.url);
            const typeFromQuery = url.searchParams.get('type');
            
            let type, data;
            
            if (request.method === 'POST') {
                const body = await request.json();
                type = typeFromQuery || body.type;
                data = body.data || body;
            } else {
                type = typeFromQuery;
                data = {};
            }

            if (!type) {
                return { status: 400, jsonBody: { success: false, message: "Missing type parameter" } };
            }

            // Ensure userId partition key exists (required for Cosmos DB)
            if (!data.userId) {
                context.log('Missing userId in request:', JSON.stringify(data));
                return { status: 400, jsonBody: { success: false, message: "Missing userId in request data" } };
            }

            const container = await getContainer(type);
            
            // Ensure ID and timestamp
            data.id = data.id || `${data.userId}_${Date.now()}`;
            data.uploadedAt = new Date().toISOString();
            
            context.log(`Creating log entry in container for type: ${type}, userId: ${data.userId}`);

            const { resource } = await container.items.create(data);
            return { status: 201, jsonBody: { success: true, data: resource } };

        } catch (error) {
            context.error('logActivity error:', error);
            return { status: 500, jsonBody: { success: false, message: error.message, details: error.toString() } };
        }
    }
});

// Legacy endpoint for backward compatibility
app.http('saveLog', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { type, data } = await request.json(); 

            if (!type || !data) return { status: 400, body: "Missing type or data" };

            const container = await getContainer(type);
            
            // Ensure ID and timestamp
            data.id = data.id || new Date().getTime().toString();
            data.uploadedAt = new Date().toISOString();

            const { resource } = await container.items.create(data);
            return { status: 201, jsonBody: resource };

        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});