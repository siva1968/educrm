const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.CONTENT_MANAGEMENT_PORT || 4120;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const documents = new Map();
const versions = new Map();
const mediaLibrary = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Content Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Document storage',
      'Version control',
      'Content publishing',
      'Media library',
      'Search functionality'
    ]
  });
});

// Health check
app.get('/api/v1/content/health', (req, res) => {
  res.json({ service: 'Content Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create document
app.post('/api/v1/content/documents', (req, res) => {
  const { title, content, type, category, tags, author } = req.body;

  const document = {
    id: uuidv4(),
    title,
    content,
    type,
    category,
    tags: tags || [],
    author,
    version: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  documents.set(document.id, document);

  res.status(201).json({
    success: true,
    message: 'Document created successfully',
    data: document
  });
});

// Get all documents
app.get('/api/v1/content/documents', (req, res) => {
  const { status, category, type } = req.query;
  let docs = Array.from(documents.values());

  if (status) docs = docs.filter(d => d.status === status);
  if (category) docs = docs.filter(d => d.category === category);
  if (type) docs = docs.filter(d => d.type === type);

  res.json({
    success: true,
    count: docs.length,
    data: docs
  });
});

// Get document by ID
app.get('/api/v1/content/documents/:id', (req, res) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  res.json({
    success: true,
    data: document
  });
});

// Update document
app.put('/api/v1/content/documents/:id', (req, res) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Save previous version
  const versionKey = `${document.id}-v${document.version}`;
  versions.set(versionKey, { ...document });

  // Update document
  const updatedDocument = {
    ...document,
    ...req.body,
    version: document.version + 1,
    updatedAt: new Date().toISOString()
  };

  documents.set(document.id, updatedDocument);

  res.json({
    success: true,
    message: 'Document updated successfully',
    data: updatedDocument
  });
});

// Delete document
app.delete('/api/v1/content/documents/:id', (req, res) => {
  if (!documents.has(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  documents.delete(req.params.id);

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
});

// Publish document
app.post('/api/v1/content/documents/:id/publish', (req, res) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  document.status = 'published';
  document.publishedAt = new Date().toISOString();
  documents.set(document.id, document);

  res.json({
    success: true,
    message: 'Document published successfully',
    data: document
  });
});

// Search documents
app.get('/api/v1/content/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, message: 'Search query required' });
  }

  const results = Array.from(documents.values()).filter(doc =>
    doc.title.toLowerCase().includes(q.toLowerCase()) ||
    doc.content.toLowerCase().includes(q.toLowerCase()) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase())))
  );

  res.json({
    success: true,
    query: q,
    count: results.length,
    data: results
  });
});

// Upload media
app.post('/api/v1/content/media', (req, res) => {
  const { filename, type, size, url, alt, caption } = req.body;

  const media = {
    id: uuidv4(),
    filename,
    type,
    size,
    url,
    alt,
    caption,
    uploadedAt: new Date().toISOString()
  };

  mediaLibrary.set(media.id, media);

  res.status(201).json({
    success: true,
    message: 'Media uploaded successfully',
    data: media
  });
});

// Get all media
app.get('/api/v1/content/media', (req, res) => {
  const { type } = req.query;
  let media = Array.from(mediaLibrary.values());

  if (type) media = media.filter(m => m.type === type);

  res.json({
    success: true,
    count: media.length,
    data: media
  });
});

// Get document versions
app.get('/api/v1/content/documents/:id/versions', (req, res) => {
  const docVersions = Array.from(versions.entries())
    .filter(([key]) => key.startsWith(req.params.id))
    .map(([, value]) => value);

  res.json({
    success: true,
    count: docVersions.length,
    data: docVersions
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📄 Content Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
