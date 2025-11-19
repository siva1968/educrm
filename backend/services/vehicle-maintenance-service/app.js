const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.VEHICLE_MAINTENANCE_PORT || 4152;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const maintenanceSchedules = new Map();
const serviceRecords = new Map();
const partsInventory = new Map();
const workOrders = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Vehicle Maintenance Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Maintenance scheduling',
      'Service history tracking',
      'Parts inventory management',
      'Work order management',
      'Preventive maintenance alerts'
    ]
  });
});

// Health check
app.get('/api/v1/maintenance/health', (req, res) => {
  res.json({ service: 'Vehicle Maintenance', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create maintenance schedule
app.post('/api/v1/maintenance/schedules', (req, res) => {
  const { vehicleId, serviceType, frequency, nextDueDate, nextDueMileage } = req.body;

  const schedule = {
    id: uuidv4(),
    scheduleId: `SCH-${Date.now()}`,
    vehicleId,
    serviceType, // oil-change, tire-rotation, inspection
    frequency, // days or mileage
    nextDueDate,
    nextDueMileage,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  maintenanceSchedules.set(schedule.id, schedule);

  res.status(201).json({
    success: true,
    message: 'Maintenance schedule created successfully',
    data: schedule
  });
});

// Get all schedules
app.get('/api/v1/maintenance/schedules', (req, res) => {
  const { vehicleId, status } = req.query;
  let scheduleList = Array.from(maintenanceSchedules.values());

  if (vehicleId) scheduleList = scheduleList.filter(s => s.vehicleId === vehicleId);
  if (status) scheduleList = scheduleList.filter(s => s.status === status);

  res.json({
    success: true,
    count: scheduleList.length,
    data: scheduleList
  });
});

// Get upcoming maintenance
app.get('/api/v1/maintenance/schedules/upcoming', (req, res) => {
  const { days = 7 } = req.query;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days));

  const upcomingSchedules = Array.from(maintenanceSchedules.values())
    .filter(s => {
      const dueDate = new Date(s.nextDueDate);
      return dueDate <= futureDate && dueDate >= new Date() && s.status === 'active';
    });

  res.json({
    success: true,
    count: upcomingSchedules.length,
    data: upcomingSchedules
  });
});

// Create service record
app.post('/api/v1/maintenance/services', (req, res) => {
  const { vehicleId, serviceType, description, cost, mileage, performedBy, parts } = req.body;

  const service = {
    id: uuidv4(),
    serviceId: `SRV-${Date.now()}`,
    vehicleId,
    serviceType,
    description,
    cost,
    mileage,
    performedBy,
    parts: parts || [],
    serviceDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  serviceRecords.set(service.id, service);

  res.status(201).json({
    success: true,
    message: 'Service record created successfully',
    data: service
  });
});

// Get all service records
app.get('/api/v1/maintenance/services', (req, res) => {
  const { vehicleId, serviceType } = req.query;
  let serviceList = Array.from(serviceRecords.values());

  if (vehicleId) serviceList = serviceList.filter(s => s.vehicleId === vehicleId);
  if (serviceType) serviceList = serviceList.filter(s => s.serviceType === serviceType);

  res.json({
    success: true,
    count: serviceList.length,
    data: serviceList
  });
});

// Get service history by vehicle
app.get('/api/v1/maintenance/services/vehicle/:vehicleId', (req, res) => {
  const serviceHistory = Array.from(serviceRecords.values())
    .filter(s => s.vehicleId === req.params.vehicleId)
    .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

  const totalCost = serviceHistory.reduce((sum, s) => sum + s.cost, 0);

  res.json({
    success: true,
    count: serviceHistory.length,
    totalCost,
    data: serviceHistory
  });
});

// Add parts to inventory
app.post('/api/v1/maintenance/parts', (req, res) => {
  const { partNumber, name, category, quantity, unitPrice, reorderLevel } = req.body;

  const part = {
    id: uuidv4(),
    partId: `PART-${Date.now()}`,
    partNumber,
    name,
    category,
    quantity,
    unitPrice,
    reorderLevel,
    status: quantity > reorderLevel ? 'available' : 'low-stock',
    createdAt: new Date().toISOString()
  };

  partsInventory.set(part.id, part);

  res.status(201).json({
    success: true,
    message: 'Part added to inventory successfully',
    data: part
  });
});

// Get all parts
app.get('/api/v1/maintenance/parts', (req, res) => {
  const { category, status } = req.query;
  let partsList = Array.from(partsInventory.values());

  if (category) partsList = partsList.filter(p => p.category === category);
  if (status) partsList = partsList.filter(p => p.status === status);

  res.json({
    success: true,
    count: partsList.length,
    data: partsList
  });
});

// Update parts quantity
app.put('/api/v1/maintenance/parts/:id/quantity', (req, res) => {
  const part = partsInventory.get(req.params.id);

  if (!part) {
    return res.status(404).json({ success: false, message: 'Part not found' });
  }

  const { quantity, type } = req.body; // type: add or subtract

  if (type === 'add') {
    part.quantity += quantity;
  } else if (type === 'subtract') {
    part.quantity -= quantity;
  }

  part.status = part.quantity > part.reorderLevel ? 'available' : 'low-stock';
  part.updatedAt = new Date().toISOString();

  partsInventory.set(part.id, part);

  res.json({
    success: true,
    message: 'Parts quantity updated successfully',
    data: part
  });
});

// Get low stock parts
app.get('/api/v1/maintenance/parts/low-stock', (req, res) => {
  const lowStockParts = Array.from(partsInventory.values())
    .filter(p => p.quantity <= p.reorderLevel);

  res.json({
    success: true,
    count: lowStockParts.length,
    data: lowStockParts
  });
});

// Create work order
app.post('/api/v1/maintenance/work-orders', (req, res) => {
  const { vehicleId, description, priority, assignedTo, estimatedCost } = req.body;

  const workOrder = {
    id: uuidv4(),
    workOrderId: `WO-${Date.now()}`,
    vehicleId,
    description,
    priority, // low, medium, high, urgent
    assignedTo,
    estimatedCost,
    actualCost: 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  workOrders.set(workOrder.id, workOrder);

  res.status(201).json({
    success: true,
    message: 'Work order created successfully',
    data: workOrder
  });
});

// Get all work orders
app.get('/api/v1/maintenance/work-orders', (req, res) => {
  const { vehicleId, status, priority } = req.query;
  let orderList = Array.from(workOrders.values());

  if (vehicleId) orderList = orderList.filter(w => w.vehicleId === vehicleId);
  if (status) orderList = orderList.filter(w => w.status === status);
  if (priority) orderList = orderList.filter(w => w.priority === priority);

  res.json({
    success: true,
    count: orderList.length,
    data: orderList
  });
});

// Update work order status
app.put('/api/v1/maintenance/work-orders/:id/status', (req, res) => {
  const workOrder = workOrders.get(req.params.id);

  if (!workOrder) {
    return res.status(404).json({ success: false, message: 'Work order not found' });
  }

  workOrder.status = req.body.status;
  if (req.body.actualCost) workOrder.actualCost = req.body.actualCost;
  if (req.body.status === 'completed') workOrder.completedAt = new Date().toISOString();

  workOrders.set(workOrder.id, workOrder);

  res.json({
    success: true,
    message: 'Work order updated successfully',
    data: workOrder
  });
});

// Get maintenance statistics
app.get('/api/v1/maintenance/statistics', (req, res) => {
  const { vehicleId } = req.query;
  let services = Array.from(serviceRecords.values());

  if (vehicleId) services = services.filter(s => s.vehicleId === vehicleId);

  const statistics = {
    totalServices: services.length,
    totalCost: services.reduce((sum, s) => sum + s.cost, 0),
    averageCost: services.length > 0 ? services.reduce((sum, s) => sum + s.cost, 0) / services.length : 0,
    byServiceType: {}
  };

  // Group by service type
  services.forEach(s => {
    if (!statistics.byServiceType[s.serviceType]) {
      statistics.byServiceType[s.serviceType] = { count: 0, totalCost: 0 };
    }
    statistics.byServiceType[s.serviceType].count++;
    statistics.byServiceType[s.serviceType].totalCost += s.cost;
  });

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🔧 Vehicle Maintenance Service running on port ${PORT}\n`);
  });
}

module.exports = app;
