const { app } = require('@azure/functions');
const { getContainer } = require('../../shared/cosmos');

app.http('updateStatus', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const container = await getContainer('users');
            const { userId, status } = await request.json();
            
            if (!userId || !status) {
                return { status: 400, jsonBody: { success: false, message: "userId and status are required" } };
            }
            
            // Get user by id (cross-partition query) so we know the partition key (username)
            const { resources } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.id = @id",
                    parameters: [{ name: "@id", value: userId }]
                })
                .fetchAll();
                
            if (resources.length === 0) {
                return { status: 404, jsonBody: { success: false, message: "User not found" } };
            }
            
            const user = resources[0];
            user.onlineStatus = status;
            user.lastSeen = new Date().toISOString();
            
            await container.item(user.id, user.username).replace(user);
            
            return { status: 200, jsonBody: { success: true } };
        } catch (error) {
            context.log('updateStatus error:', error);
            return { status: 500, jsonBody: { success: false, message: error.message } };
        }
    }
});