require('dotenv').config();
const { json, urlencoded } = require("body-parser");
const express = require('express');
const nodeHtmlToImage = require('node-html-to-image');

// Initialize express app
const app = express();

// Load configuration from environment variables
const API_TOKEN = process.env.API_TOKEN;
const PORT = process.env.PORT || 3001;

console.log('ENV PORT - ', process.env.PORT)
console.log('ENV API_TOKEN - ', process.env.API_TOKEN)

// Validate required environment variables
if (!API_TOKEN) {
  console.error('FATAL: API_TOKEN is not defined in environment variables');
  process.exit(1);
}

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
};

app.use(express.json());
app.use(json({ limit: '10mb' }))
app.use(urlencoded({ limit: '10mb', extended: true }))

app.post('/images', authenticateToken, async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  const fs = require('fs');
  // Sanitize filename to avoid invalid characters
  const requestTime = new Date().toISOString().replace(/[:.]/g, '-');
  const imagesDir = 'images';
  const outputPath = `${imagesDir}/${requestTime}.png`;

  // Ensure images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  try {
    const image = await nodeHtmlToImage({
      html,
      output: outputPath,
      puppeteerArgs: { args: ['--no-sandbox'] }
    });
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    res.json({ url: `${protocol}://${host}/${outputPath}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.use('/images', express.static('./images'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
