const express = require('express');
const fileUpload = require('express-fileupload');
const displayRouter = require('./routes/display');
const path = require('path');

const app = express();
app.use(express.json());
app.use(fileUpload());

app.post('/api/ads/upload', (req, res) => {
  if (!req.files?.creative) {
    return res.status(400).json({ error: 'Field "creative" is required' });
  }
  const file = req.files.creative;
  const dest = path.join('./uploads', file.name);
  file.mv(dest, err => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    res.json({ ok: true, stored: file.name });
  });
});

app.use('/api/display', displayRouter);

module.exports = app;
