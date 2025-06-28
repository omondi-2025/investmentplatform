const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files like HTML, CSS, JS from this folder
app.use(express.static(__dirname));

// Catch-all route for unmatched URLs (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});