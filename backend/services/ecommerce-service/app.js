const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.ECOMMERCE_PORT || 4174;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const products = new Map();
const carts = new Map();
const orders = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'E-commerce Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Product catalog',
      'Shopping cart',
      'Checkout process',
      'Order management',
      'Payment processing'
    ]
  });
});

// Health check
app.get('/api/v1/ecommerce/health', (req, res) => {
  res.json({ service: 'E-commerce', status: 'healthy', timestamp: new Date().toISOString() });
});

// Add product
app.post('/api/v1/ecommerce/products', (req, res) => {
  const { name, description, category, price, stock, images } = req.body;

  const product = {
    id: uuidv4(),
    productId: `PROD-${Date.now()}`,
    name,
    description,
    category,
    price,
    stock,
    images: images || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  products.set(product.id, product);

  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    data: product
  });
});

// Get all products
app.get('/api/v1/ecommerce/products', (req, res) => {
  const { category, status } = req.query;
  let productList = Array.from(products.values());

  if (category) productList = productList.filter(p => p.category === category);
  if (status) productList = productList.filter(p => p.status === status);

  res.json({
    success: true,
    count: productList.length,
    data: productList
  });
});

// Get product by ID
app.get('/api/v1/ecommerce/products/:id', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.json({
    success: true,
    data: product
  });
});

// Update product
app.put('/api/v1/ecommerce/products/:id', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updatedProduct = { ...product, ...req.body, updatedAt: new Date().toISOString() };
  products.set(product.id, updatedProduct);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
});

// Add to cart
app.post('/api/v1/ecommerce/cart/add', (req, res) => {
  const { userId, productId, quantity } = req.body;

  const product = products.get(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ success: false, message: 'Insufficient stock' });
  }

  let cart = carts.get(userId);
  if (!cart) {
    cart = {
      id: uuidv4(),
      userId,
      items: [],
      total: 0,
      createdAt: new Date().toISOString()
    };
  }

  const existingItem = cart.items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity
    });
  }

  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cart.updatedAt = new Date().toISOString();

  carts.set(userId, cart);

  res.json({
    success: true,
    message: 'Item added to cart successfully',
    data: cart
  });
});

// Get cart
app.get('/api/v1/ecommerce/cart/:userId', (req, res) => {
  const cart = carts.get(req.params.userId);

  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart is empty' });
  }

  res.json({
    success: true,
    data: cart
  });
});

// Remove from cart
app.delete('/api/v1/ecommerce/cart/:userId/items/:productId', (req, res) => {
  const cart = carts.get(req.params.userId);

  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  cart.items = cart.items.filter(item => item.productId !== req.params.productId);
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cart.updatedAt = new Date().toISOString();

  carts.set(req.params.userId, cart);

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: cart
  });
});

// Checkout
app.post('/api/v1/ecommerce/checkout', (req, res) => {
  const { userId, shippingAddress, paymentMethod } = req.body;

  const cart = carts.get(userId);
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const order = {
    id: uuidv4(),
    orderNumber: `ORD-${Date.now()}`,
    userId,
    items: cart.items,
    subtotal: cart.total,
    shipping: 50,
    total: cart.total + 50,
    shippingAddress,
    paymentMethod,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.set(order.id, order);

  // Clear cart
  carts.delete(userId);

  // Update product stock
  cart.items.forEach(item => {
    const product = products.get(item.productId);
    if (product) {
      product.stock -= item.quantity;
      products.set(product.id, product);
    }
  });

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: order
  });
});

// Get orders
app.get('/api/v1/ecommerce/orders', (req, res) => {
  const { userId, status } = req.query;
  let orderList = Array.from(orders.values());

  if (userId) orderList = orderList.filter(o => o.userId === userId);
  if (status) orderList = orderList.filter(o => o.status === status);

  res.json({
    success: true,
    count: orderList.length,
    data: orderList
  });
});

// Get order by ID
app.get('/api/v1/ecommerce/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.json({
    success: true,
    data: order
  });
});

// Update order status
app.put('/api/v1/ecommerce/orders/:id/status', (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();

  if (req.body.status === 'shipped') {
    order.shippedAt = new Date().toISOString();
  } else if (req.body.status === 'delivered') {
    order.deliveredAt = new Date().toISOString();
  }

  orders.set(order.id, order);

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🛒 E-commerce Service running on port ${PORT}\n`);
  });
}

module.exports = app;
