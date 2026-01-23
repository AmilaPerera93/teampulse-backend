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
            // FIXED: Added onlineStatus, lastSeen to SELECT query
            const { resources } = await container.items
                .query("SELECT c.id, c.fullname, c.username, c.role, c.email, c.onlineStatus, c.lastSeen, c.department FROM c WHERE c.role = 'MEMBER'")
                .fetchAll();

            // Calculate real-time online status based on lastSeen
            const now = new Date();
            const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
            const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
            
            const usersWithActualStatus = resources.map(user => {
                let actualStatus = 'Offline';
                
                if (user.lastSeen) {
                    const lastSeenTime = new Date(user.lastSeen);
                    const timeDiff = now - lastSeenTime;
                    
                    if (timeDiff < ONLINE_THRESHOLD) {
                        actualStatus = 'Online';
                    } else if (timeDiff < IDLE_THRESHOLD) {
                        actualStatus = 'Idle';
                    }
                }
                
                return {
                    ...user,
                    onlineStatus: actualStatus
                };
            });

            return { jsonBody: usersWithActualStatus };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});