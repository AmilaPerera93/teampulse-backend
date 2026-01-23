const { app } = require('@azure/functions');

app.setup({
    enableHttpStream: true,
});

// Import all functions to register them
// Admin functions
require('./functions/admin/createUser');
require('./functions/admin/getUsers');
require('./functions/admin/manageClients');
require('./functions/admin/manageProjects');
require('./functions/admin/manageResources');
require('./functions/admin/manageSettings');
require('./functions/admin/manageUsers');
require('./functions/admin/resetPassword');

// Analytics functions
require('./functions/analytics/getHistory');
require('./functions/analytics/getIdleLogs');
require('./functions/analytics/getTrainings');

// Auth functions
require('./functions/auth/heartbeat');
require('./functions/auth/login');
require('./functions/auth/validateToken');

// Academy functions
require('./functions/academy/manageTrainings');

// Business functions
require('./functions/business/manageInvoices');
require('./functions/business/manageLeads');

// HR functions
require('./functions/hr/manageLeaves');

// Tasks functions
require('./functions/tasks/deleteTask');
require('./functions/tasks/getTasks');
require('./functions/tasks/saveTask');

// Tracking functions
require('./functions/tracking/getLogs');
require('./functions/tracking/logActivity');

// Users functions
require('./functions/users/updateStatus');

// Seed function
require('./functions/seedAdmin');
