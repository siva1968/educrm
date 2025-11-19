const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.INVENTORY_PORT || 4160;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const items = new Map();
const purchaseOrders = new Map();
const suppliers = new Map();
const assets = new Map();
const stockMovements = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Inventory Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Stock management',
      'Purchase order processing',
      'Supplier management',
      'Asset tracking',
      'Stock movement tracking'
    ]
  });
});

// Health check
app.get('/api/v1/inventory/health', (req, res) => {
  res.json({ service: 'Inventory Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Add inventory item
app.post('/api/v1/inventory/items', (req, res) => {
  const { name, category, sku, quantity, unitPrice, reorderLevel, location } = req.body;

  const item = {
    id: uuidv4(),
    itemId: `ITEM-${Date.now()}`,
    name,
    category,
    sku,
    quantity,
    unitPrice,
    reorderLevel,
    location,
    status: quantity > reorderLevel ? 'in-stock' : 'low-stock',
    createdAt: new Date().toISOString()
  };

  items.set(item.id, item);

  res.status(201).json({
    success: true,
    message: 'Item added successfully',
    data: item
  });
});

// Get all items
app.get('/api/v1/inventory/items', (req, res) => {
  const { category, status } = req.query;
  let itemList = Array.from(items.values());

  if (category) itemList = itemList.filter(i => i.category === category);
  if (status) itemList = itemList.filter(i => i.status === status);

  res.json({
    success: true,
    count: itemList.length,
    data: itemList
  });
});

// Get item by ID
app.get('/api/v1/inventory/items/:id', (req, res) => {
  const item = items.get(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  res.json({
    success: true,
    data: item
  });
});

// Update item quantity
app.put('/api/v1/inventory/items/:id/quantity', (req, res) => {
  const item = items.get(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  const { quantity, type, reason } = req.body;
  const oldQuantity = item.quantity;

  if (type === 'add') {
    item.quantity += quantity;
  } else if (type === 'subtract') {
    item.quantity -= quantity;
  }

  item.status = item.quantity > item.reorderLevel ? 'in-stock' : 'low-stock';
  item.updatedAt = new Date().toISOString();

  // Record stock movement
  const movement = {
    id: uuidv4(),
    itemId: item.id,
    type,
    quantity,
    oldQuantity,
    newQuantity: item.quantity,
    reason,
    timestamp: new Date().toISOString()
  };
  stockMovements.set(movement.id, movement);

  items.set(item.id, item);

  res.json({
    success: true,
    message: 'Item quantity updated successfully',
    data: { item, movement }
  });
});

// Create purchase order
app.post('/api/v1/inventory/purchase-orders', (req, res) => {
  const { supplierId, items: orderItems, totalAmount, deliveryDate } = req.body;

  const purchaseOrder = {
    id: uuidv4(),
    poNumber: `PO-${Date.now()}`,
    supplierId,
    items: orderItems, // [{ itemId, quantity, unitPrice }]
    totalAmount,
    deliveryDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  purchaseOrders.set(purchaseOrder.id, purchaseOrder);

  res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: purchaseOrder
  });
});

// Get all purchase orders
app.get('/api/v1/inventory/purchase-orders', (req, res) => {
  const { supplierId, status } = req.query;
  let poList = Array.from(purchaseOrders.values());

  if (supplierId) poList = poList.filter(po => po.supplierId === supplierId);
  if (status) poList = poList.filter(po => po.status === status);

  res.json({
    success: true,
    count: poList.length,
    data: poList
  });
});

// Update purchase order status
app.put('/api/v1/inventory/purchase-orders/:id/status', (req, res) => {
  const po = purchaseOrders.get(req.params.id);

  if (!po) {
    return res.status(404).json({ success: false, message: 'Purchase order not found' });
  }

  po.status = req.body.status;
  if (req.body.status === 'received') {
    po.receivedAt = new Date().toISOString();
  }

  purchaseOrders.set(po.id, po);

  res.json({
    success: true,
    message: 'Purchase order updated successfully',
    data: po
  });
});

// Add supplier
app.post('/api/v1/inventory/suppliers', (req, res) => {
  const { name, contactPerson, phone, email, address, category } = req.body;

  const supplier = {
    id: uuidv4(),
    supplierId: `SUP-${Date.now()}`,
    name,
    contactPerson,
    phone,
    email,
    address,
    category,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  suppliers.set(supplier.id, supplier);

  res.status(201).json({
    success: true,
    message: 'Supplier added successfully',
    data: supplier
  });
});

// Get all suppliers
app.get('/api/v1/inventory/suppliers', (req, res) => {
  const { category, status } = req.query;
  let supplierList = Array.from(suppliers.values());

  if (category) supplierList = supplierList.filter(s => s.category === category);
  if (status) supplierList = supplierList.filter(s => s.status === status);

  res.json({
    success: true,
    count: supplierList.length,
    data: supplierList
  });
});

// Add asset
app.post('/api/v1/inventory/assets', (req, res) => {
  const { assetName, assetType, serialNumber, purchaseDate, purchaseValue, location, assignedTo } = req.body;

  const asset = {
    id: uuidv4(),
    assetId: `AST-${Date.now()}`,
    assetName,
    assetType,
    serialNumber,
    purchaseDate,
    purchaseValue,
    currentValue: purchaseValue,
    location,
    assignedTo,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  assets.set(asset.id, asset);

  res.status(201).json({
    success: true,
    message: 'Asset added successfully',
    data: asset
  });
});

// Get all assets
app.get('/api/v1/inventory/assets', (req, res) => {
  const { assetType, status, assignedTo } = req.query;
  let assetList = Array.from(assets.values());

  if (assetType) assetList = assetList.filter(a => a.assetType === assetType);
  if (status) assetList = assetList.filter(a => a.status === status);
  if (assignedTo) assetList = assetList.filter(a => a.assignedTo === assignedTo);

  res.json({
    success: true,
    count: assetList.length,
    data: assetList
  });
});

// Transfer asset
app.post('/api/v1/inventory/assets/:id/transfer', (req, res) => {
  const asset = assets.get(req.params.id);

  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const { newLocation, newAssignedTo } = req.body;

  asset.location = newLocation || asset.location;
  asset.assignedTo = newAssignedTo || asset.assignedTo;
  asset.lastTransferredAt = new Date().toISOString();

  assets.set(asset.id, asset);

  res.json({
    success: true,
    message: 'Asset transferred successfully',
    data: asset
  });
});

// Get stock movements
app.get('/api/v1/inventory/movements', (req, res) => {
  const { itemId, type } = req.query;
  let movements = Array.from(stockMovements.values());

  if (itemId) movements = movements.filter(m => m.itemId === itemId);
  if (type) movements = movements.filter(m => m.type === type);

  res.json({
    success: true,
    count: movements.length,
    data: movements
  });
});

// Get low stock items
app.get('/api/v1/inventory/items/low-stock', (req, res) => {
  const lowStockItems = Array.from(items.values())
    .filter(i => i.quantity <= i.reorderLevel);

  res.json({
    success: true,
    count: lowStockItems.length,
    data: lowStockItems
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📦 Inventory Service running on port ${PORT}\n`);
  });
}

module.exports = app;
