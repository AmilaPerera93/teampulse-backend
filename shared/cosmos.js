const { CosmosClient } = require("@azure/cosmos");

// This reads the connection string we will set in Azure later
const connectionString = process.env.COSMOS_CONNECTION_STRING;

let client = null;

async function getContainer(containerName) {
  if (!client) {
    client = new CosmosClient(connectionString);
  }
  const database = client.database("TeamPulseDB");
  const container = database.container(containerName);
  return container;
}

module.exports = { getContainer };