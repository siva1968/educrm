const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.FLEET_PORT || 4150;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const vehicles = new Map();
const drivers = new Map();
const routes = new Map();
const trips = new Map();
const tracking = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Fleet Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Vehicle management',
      'Driver management',
      'Route planning',
      'Trip tracking',
      'Real-time vehicle tracking'
    ]
  });
});

// Health check
app.get('/api/v1/fleet/health', (req, res) => {
  res.json({ service: 'Fleet Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Add vehicle
app.post('/api/v1/fleet/vehicles', (req, res) => {
  const { vehicleNumber, type, capacity, model, year, fuelType } = req.body;

  const vehicle = {
    id: uuidv4(),
    vehicleId: `VEH-${Date.now()}`,
    vehicleNumber,
    type, // bus, van, car
    capacity,
    model,
    year,
    fuelType,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  vehicles.set(vehicle.id, vehicle);

  res.status(201).json({
    success: true,
    message: 'Vehicle added successfully',
    data: vehicle
  });
});

// Get all vehicles
app.get('/api/v1/fleet/vehicles', (req, res) => {
  const { type, status } = req.query;
  let vehicleList = Array.from(vehicles.values());

  if (type) vehicleList = vehicleList.filter(v => v.type === type);
  if (status) vehicleList = vehicleList.filter(v => v.status === status);

  res.json({
    success: true,
    count: vehicleList.length,
    data: vehicleList
  });
});

// Get vehicle by ID
app.get('/api/v1/fleet/vehicles/:id', (req, res) => {
  const vehicle = vehicles.get(req.params.id);

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  res.json({
    success: true,
    data: vehicle
  });
});

// Update vehicle
app.put('/api/v1/fleet/vehicles/:id', (req, res) => {
  const vehicle = vehicles.get(req.params.id);

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const updatedVehicle = { ...vehicle, ...req.body, updatedAt: new Date().toISOString() };
  vehicles.set(vehicle.id, updatedVehicle);

  res.json({
    success: true,
    message: 'Vehicle updated successfully',
    data: updatedVehicle
  });
});

// Add driver
app.post('/api/v1/fleet/drivers', (req, res) => {
  const { name, phone, licenseNumber, licenseExpiry, experience } = req.body;

  const driver = {
    id: uuidv4(),
    driverId: `DRV-${Date.now()}`,
    name,
    phone,
    licenseNumber,
    licenseExpiry,
    experience,
    status: 'active',
    assignedVehicle: null,
    createdAt: new Date().toISOString()
  };

  drivers.set(driver.id, driver);

  res.status(201).json({
    success: true,
    message: 'Driver added successfully',
    data: driver
  });
});

// Get all drivers
app.get('/api/v1/fleet/drivers', (req, res) => {
  const { status } = req.query;
  let driverList = Array.from(drivers.values());

  if (status) driverList = driverList.filter(d => d.status === status);

  res.json({
    success: true,
    count: driverList.length,
    data: driverList
  });
});

// Assign driver to vehicle
app.post('/api/v1/fleet/drivers/:driverId/assign/:vehicleId', (req, res) => {
  const driver = drivers.get(req.params.driverId);
  const vehicle = vehicles.get(req.params.vehicleId);

  if (!driver || !vehicle) {
    return res.status(404).json({ success: false, message: 'Driver or vehicle not found' });
  }

  driver.assignedVehicle = vehicle.id;
  vehicle.assignedDriver = driver.id;

  drivers.set(driver.id, driver);
  vehicles.set(vehicle.id, vehicle);

  res.json({
    success: true,
    message: 'Driver assigned to vehicle successfully',
    data: { driver, vehicle }
  });
});

// Create route
app.post('/api/v1/fleet/routes', (req, res) => {
  const { name, stops, distance, estimatedTime } = req.body;

  const route = {
    id: uuidv4(),
    routeId: `RT-${Date.now()}`,
    name,
    stops, // [{ name, location, sequence }]
    distance,
    estimatedTime,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  routes.set(route.id, route);

  res.status(201).json({
    success: true,
    message: 'Route created successfully',
    data: route
  });
});

// Get all routes
app.get('/api/v1/fleet/routes', (req, res) => {
  const { status } = req.query;
  let routeList = Array.from(routes.values());

  if (status) routeList = routeList.filter(r => r.status === status);

  res.json({
    success: true,
    count: routeList.length,
    data: routeList
  });
});

// Start trip
app.post('/api/v1/fleet/trips/start', (req, res) => {
  const { vehicleId, driverId, routeId, startTime } = req.body;

  const trip = {
    id: uuidv4(),
    tripId: `TRIP-${Date.now()}`,
    vehicleId,
    driverId,
    routeId,
    startTime: startTime || new Date().toISOString(),
    endTime: null,
    status: 'in-progress',
    createdAt: new Date().toISOString()
  };

  trips.set(trip.id, trip);

  res.status(201).json({
    success: true,
    message: 'Trip started successfully',
    data: trip
  });
});

// End trip
app.post('/api/v1/fleet/trips/:id/end', (req, res) => {
  const trip = trips.get(req.params.id);

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }

  trip.endTime = new Date().toISOString();
  trip.status = 'completed';
  trip.actualDistance = req.body.actualDistance;

  trips.set(trip.id, trip);

  res.json({
    success: true,
    message: 'Trip completed successfully',
    data: trip
  });
});

// Get all trips
app.get('/api/v1/fleet/trips', (req, res) => {
  const { vehicleId, driverId, status } = req.query;
  let tripList = Array.from(trips.values());

  if (vehicleId) tripList = tripList.filter(t => t.vehicleId === vehicleId);
  if (driverId) tripList = tripList.filter(t => t.driverId === driverId);
  if (status) tripList = tripList.filter(t => t.status === status);

  res.json({
    success: true,
    count: tripList.length,
    data: tripList
  });
});

// Update vehicle location
app.post('/api/v1/fleet/tracking/:vehicleId', (req, res) => {
  const { latitude, longitude, speed, heading } = req.body;

  const location = {
    id: uuidv4(),
    vehicleId: req.params.vehicleId,
    latitude,
    longitude,
    speed,
    heading,
    timestamp: new Date().toISOString()
  };

  tracking.set(location.id, location);

  res.status(201).json({
    success: true,
    message: 'Vehicle location updated',
    data: location
  });
});

// Get vehicle tracking
app.get('/api/v1/fleet/tracking/:vehicleId', (req, res) => {
  const locations = Array.from(tracking.values())
    .filter(t => t.vehicleId === req.params.vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    count: locations.length,
    data: locations
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚌 Fleet Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
