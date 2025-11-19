const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.SCHOOL_DRIVE_PORT || 4182;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const files = new Map();
const folders = new Map();
const shares = new Map();
const permissions = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'School Drive Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'File storage and management',
      'File sharing',
      'Collaborative editing',
      'Access control',
      'Version history'
    ]
  });
});

// Health check
app.get('/api/v1/drive/health', (req, res) => {
  res.json({ service: 'School Drive', status: 'healthy', timestamp: new Date().toISOString() });
});

// Upload file
app.post('/api/v1/drive/files', (req, res) => {
  const { name, type, size, url, folderId, ownerId, tags } = req.body;

  const file = {
    id: uuidv4(),
    fileId: `FILE-${Date.now()}`,
    name,
    type,
    size,
    url,
    folderId: folderId || null,
    ownerId,
    tags: tags || [],
    version: 1,
    versions: [],
    uploadedAt: new Date().toISOString()
  };

  files.set(file.id, file);

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: file
  });
});

// Get all files
app.get('/api/v1/drive/files', (req, res) => {
  const { folderId, ownerId, type } = req.query;
  let fileList = Array.from(files.values());

  if (folderId) fileList = fileList.filter(f => f.folderId === folderId);
  if (ownerId) fileList = fileList.filter(f => f.ownerId === ownerId);
  if (type) fileList = fileList.filter(f => f.type === type);

  res.json({
    success: true,
    count: fileList.length,
    data: fileList
  });
});

// Get file by ID
app.get('/api/v1/drive/files/:id', (req, res) => {
  const file = files.get(req.params.id);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.json({
    success: true,
    data: file
  });
});

// Update file
app.put('/api/v1/drive/files/:id', (req, res) => {
  const file = files.get(req.params.id);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  // Save previous version
  file.versions.push({
    version: file.version,
    url: file.url,
    modifiedAt: file.modifiedAt || file.uploadedAt
  });

  file.version++;
  file.url = req.body.url || file.url;
  file.modifiedAt = new Date().toISOString();

  files.set(file.id, file);

  res.json({
    success: true,
    message: 'File updated successfully',
    data: file
  });
});

// Delete file
app.delete('/api/v1/drive/files/:id', (req, res) => {
  if (!files.has(req.params.id)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  files.delete(req.params.id);

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// Create folder
app.post('/api/v1/drive/folders', (req, res) => {
  const { name, parentId, ownerId } = req.body;

  const folder = {
    id: uuidv4(),
    folderId: `FOLDER-${Date.now()}`,
    name,
    parentId: parentId || null,
    ownerId,
    createdAt: new Date().toISOString()
  };

  folders.set(folder.id, folder);

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: folder
  });
});

// Get all folders
app.get('/api/v1/drive/folders', (req, res) => {
  const { parentId, ownerId } = req.query;
  let folderList = Array.from(folders.values());

  if (parentId) folderList = folderList.filter(f => f.parentId === parentId);
  if (ownerId) folderList = folderList.filter(f => f.ownerId === ownerId);

  res.json({
    success: true,
    count: folderList.length,
    data: folderList
  });
});

// Share file
app.post('/api/v1/drive/files/:fileId/share', (req, res) => {
  const file = files.get(req.params.fileId);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const { sharedWith, permission } = req.body;

  const share = {
    id: uuidv4(),
    shareId: `SHARE-${Date.now()}`,
    fileId: file.id,
    sharedBy: file.ownerId,
    sharedWith,
    permission, // view, edit, comment
    sharedAt: new Date().toISOString()
  };

  shares.set(share.id, share);

  res.status(201).json({
    success: true,
    message: 'File shared successfully',
    data: share
  });
});

// Get file shares
app.get('/api/v1/drive/files/:fileId/shares', (req, res) => {
  const shareList = Array.from(shares.values())
    .filter(s => s.fileId === req.params.fileId);

  res.json({
    success: true,
    count: shareList.length,
    data: shareList
  });
});

// Get shared with me
app.get('/api/v1/drive/shared/:userId', (req, res) => {
  const sharedFiles = Array.from(shares.values())
    .filter(s => s.sharedWith === req.params.userId);

  const filesWithShares = sharedFiles.map(share => {
    const file = files.get(share.fileId);
    return {
      ...file,
      sharedBy: share.sharedBy,
      permission: share.permission,
      sharedAt: share.sharedAt
    };
  });

  res.json({
    success: true,
    count: filesWithShares.length,
    data: filesWithShares
  });
});

// Set file permissions
app.post('/api/v1/drive/files/:fileId/permissions', (req, res) => {
  const { userId, role } = req.body;

  const permission = {
    id: uuidv4(),
    fileId: req.params.fileId,
    userId,
    role, // owner, editor, viewer
    grantedAt: new Date().toISOString()
  };

  permissions.set(permission.id, permission);

  res.status(201).json({
    success: true,
    message: 'Permissions set successfully',
    data: permission
  });
});

// Get file permissions
app.get('/api/v1/drive/files/:fileId/permissions', (req, res) => {
  const permissionList = Array.from(permissions.values())
    .filter(p => p.fileId === req.params.fileId);

  res.json({
    success: true,
    count: permissionList.length,
    data: permissionList
  });
});

// Search files
app.get('/api/v1/drive/search', (req, res) => {
  const { q, type, ownerId } = req.query;

  let results = Array.from(files.values());

  if (q) {
    results = results.filter(f =>
      f.name.toLowerCase().includes(q.toLowerCase()) ||
      (f.tags && f.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase())))
    );
  }

  if (type) results = results.filter(f => f.type === type);
  if (ownerId) results = results.filter(f => f.ownerId === ownerId);

  res.json({
    success: true,
    count: results.length,
    data: results
  });
});

// Get storage statistics
app.get('/api/v1/drive/storage/:userId', (req, res) => {
  const userFiles = Array.from(files.values())
    .filter(f => f.ownerId === req.params.userId);

  const totalSize = userFiles.reduce((sum, f) => sum + f.size, 0);

  const statistics = {
    totalFiles: userFiles.length,
    totalSize,
    byType: {}
  };

  userFiles.forEach(f => {
    if (!statistics.byType[f.type]) {
      statistics.byType[f.type] = { count: 0, size: 0 };
    }
    statistics.byType[f.type].count++;
    statistics.byType[f.type].size += f.size;
  });

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📁 School Drive Service running on port ${PORT}\n`);
  });
}

module.exports = app;
