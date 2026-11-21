'use strict';

// Writes the dashboard's datasource (from config.js, or sample data) to
// docs/apl-preview-data.json, ready to paste into the APL authoring tool's
// "Data" tab in the Alexa developer console for a live visual preview.
//
// Usage: node scripts/preview-data.js [Time/Zone]
const fs = require('fs');
const path = require('path');
const { buildDashboardData } = require('../lambda/apl/datasource');

const timeZone = process.argv[2] || 'UTC';
const outFile = path.join(__dirname, '..', 'docs', 'apl-preview-data.json');

buildDashboardData({ timeZone }).then((dashboard) => {
  fs.writeFileSync(outFile, `${JSON.stringify({ dashboard }, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
});
