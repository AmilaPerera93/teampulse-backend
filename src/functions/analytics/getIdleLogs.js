const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
let client = null;

async function getContainer() {
    if (!client) client = new CosmosClient(connectionString);
    return client.database("TeamPulseDB").container("idle_logs");
}

app.http('getIdleLogs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const userId = request.query.get('userId');
        const date = request.query.get('date');

        if (!userId || !date) return { status: 400, body: "Missing params" };

        try {
            const container = await getContainer();
            const { resources: logs } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.userId = @u AND c.date = @d",
                    parameters: [{ name: "@u", value: userId }, { name: "@d", value: date }]
                })
                .fetchAll();

            // --- Server-Side Logic Calculation ---
            let calculatedIdleMs = 0;
            let patternBuffer = [];
            const TEN_MINS = 600000;
            const P_50 = 50000;
            const P_110 = 110000;

            logs.sort((a, b) => a.startTime - b.startTime);

            logs.forEach((log) => {
                const dur = Number(log.durationMs) || 0;
                
                // Rule 1: Long Breaks
                if (dur >= TEN_MINS) {
                    calculatedIdleMs += dur;
                    if (patternBuffer.length >= 3) {
                         calculatedIdleMs += patternBuffer.reduce((a, b) => a + b, 0);
                    }
                    patternBuffer = [];
                } 
                // Rule 2: Pattern Buffer
                else if (dur === P_50 || dur === P_110) {
                    patternBuffer.push(dur);
                } 
                // Reset Buffer on normal activity
                else {
                    if (patternBuffer.length >= 3) {
                        calculatedIdleMs += patternBuffer.reduce((a, b) => a + b, 0);
                    }
                    patternBuffer = [];
                }
            });
            // Flush remaining buffer
            if (patternBuffer.length >= 3) {
                calculatedIdleMs += patternBuffer.reduce((a, b) => a + b, 0);
            }

            return { jsonBody: { logs, totalIdleMs: calculatedIdleMs } };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});