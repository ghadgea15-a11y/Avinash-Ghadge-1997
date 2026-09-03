const fs = require('fs');
let content = fs.readFileSync('src/services/bpmIntegrationService.ts', 'utf8');

// LEAVE -> leaveRequests is now leaves
content = content.replace(/'leaveRequests'/g, "'leaves'");
// OVERTIME -> overtime_requests / overtime_adjustments -> Is this correct? Let's assume yes if they exist, but 'attendance' might be the main one.
// Let's check if 'overtime_requests' is used anywhere else.
