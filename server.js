const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Log Sheet Muster - Android Architecture</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0F0F10; color: #E0E0E6; padding: 2rem; }
          h1 { color: #D1BCFF; }
        </style>
      </head>
      <body>
        <h1>Log Sheet Muster</h1>
        <p>This project is configured as a native Android architecture workspace.</p>
        <p>Please review the generated architecture documents in the file explorer.</p>
        <ul>
          <li><code>/project/ANDROID_ARCHITECTURE.md</code></li>
          <li><code>/project/backend_architecture/01_DATABASE_SCHEMA.md</code></li>
          <li><code>/project/backend_architecture/02_RBAC_SECURITY.md</code></li>
          <li><code>/project/backend_architecture/03_WORKFLOWS_APIS.md</code></li>
          <li><code>/project/backend_architecture/04_STORAGE_AND_MEDIA.md</code></li>
          <li><code>/firestore.rules</code></li>
          <li><code>/storage.rules</code></li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
