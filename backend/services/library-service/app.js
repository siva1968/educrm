const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.LIBRARY_PORT || 4121;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const books = new Map();
const issues = new Map();
const reservations = new Map();
const fines = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Library Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Book catalog management',
      'Issue and return tracking',
      'Fine management',
      'Book reservations',
      'Digital library access'
    ]
  });
});

// Health check
app.get('/api/v1/library/health', (req, res) => {
  res.json({ service: 'Library Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Add book to catalog
app.post('/api/v1/library/books', (req, res) => {
  const { title, author, isbn, publisher, category, quantity, location } = req.body;

  const book = {
    id: uuidv4(),
    title,
    author,
    isbn,
    publisher,
    category,
    quantity,
    available: quantity,
    location,
    createdAt: new Date().toISOString()
  };

  books.set(book.id, book);

  res.status(201).json({
    success: true,
    message: 'Book added to catalog successfully',
    data: book
  });
});

// Get all books
app.get('/api/v1/library/books', (req, res) => {
  const { category, author, available } = req.query;
  let bookList = Array.from(books.values());

  if (category) bookList = bookList.filter(b => b.category === category);
  if (author) bookList = bookList.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
  if (available === 'true') bookList = bookList.filter(b => b.available > 0);

  res.json({
    success: true,
    count: bookList.length,
    data: bookList
  });
});

// Get book by ID
app.get('/api/v1/library/books/:id', (req, res) => {
  const book = books.get(req.params.id);

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  res.json({
    success: true,
    data: book
  });
});

// Update book
app.put('/api/v1/library/books/:id', (req, res) => {
  const book = books.get(req.params.id);

  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  const updatedBook = { ...book, ...req.body, updatedAt: new Date().toISOString() };
  books.set(book.id, updatedBook);

  res.json({
    success: true,
    message: 'Book updated successfully',
    data: updatedBook
  });
});

// Delete book
app.delete('/api/v1/library/books/:id', (req, res) => {
  if (!books.has(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  books.delete(req.params.id);

  res.json({
    success: true,
    message: 'Book deleted successfully'
  });
});

// Issue book
app.post('/api/v1/library/issues', (req, res) => {
  const { bookId, userId, dueDate } = req.body;

  const book = books.get(bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }

  if (book.available <= 0) {
    return res.status(400).json({ success: false, message: 'Book not available' });
  }

  const issue = {
    id: uuidv4(),
    bookId,
    userId,
    issueDate: new Date().toISOString(),
    dueDate,
    status: 'issued',
    returnDate: null
  };

  book.available -= 1;
  books.set(bookId, book);
  issues.set(issue.id, issue);

  res.status(201).json({
    success: true,
    message: 'Book issued successfully',
    data: issue
  });
});

// Return book
app.post('/api/v1/library/issues/:issueId/return', (req, res) => {
  const issue = issues.get(req.params.issueId);

  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue record not found' });
  }

  if (issue.status === 'returned') {
    return res.status(400).json({ success: false, message: 'Book already returned' });
  }

  const book = books.get(issue.bookId);
  book.available += 1;
  books.set(issue.bookId, book);

  issue.status = 'returned';
  issue.returnDate = new Date().toISOString();

  // Check for fine
  const dueDate = new Date(issue.dueDate);
  const returnDate = new Date(issue.returnDate);
  if (returnDate > dueDate) {
    const daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
    const fineAmount = daysLate * 5; // $5 per day

    const fine = {
      id: uuidv4(),
      issueId: issue.id,
      userId: issue.userId,
      amount: fineAmount,
      daysLate,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    fines.set(fine.id, fine);
    issue.fineId = fine.id;
  }

  issues.set(issue.id, issue);

  res.json({
    success: true,
    message: 'Book returned successfully',
    data: issue
  });
});

// Get all issues
app.get('/api/v1/library/issues', (req, res) => {
  const { userId, status } = req.query;
  let issueList = Array.from(issues.values());

  if (userId) issueList = issueList.filter(i => i.userId === userId);
  if (status) issueList = issueList.filter(i => i.status === status);

  res.json({
    success: true,
    count: issueList.length,
    data: issueList
  });
});

// Create reservation
app.post('/api/v1/library/reservations', (req, res) => {
  const { bookId, userId } = req.body;

  const reservation = {
    id: uuidv4(),
    bookId,
    userId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reservations.set(reservation.id, reservation);

  res.status(201).json({
    success: true,
    message: 'Reservation created successfully',
    data: reservation
  });
});

// Get all reservations
app.get('/api/v1/library/reservations', (req, res) => {
  const { userId, status } = req.query;
  let reservationList = Array.from(reservations.values());

  if (userId) reservationList = reservationList.filter(r => r.userId === userId);
  if (status) reservationList = reservationList.filter(r => r.status === status);

  res.json({
    success: true,
    count: reservationList.length,
    data: reservationList
  });
});

// Get all fines
app.get('/api/v1/library/fines', (req, res) => {
  const { userId, status } = req.query;
  let fineList = Array.from(fines.values());

  if (userId) fineList = fineList.filter(f => f.userId === userId);
  if (status) fineList = fineList.filter(f => f.status === status);

  res.json({
    success: true,
    count: fineList.length,
    data: fineList
  });
});

// Pay fine
app.post('/api/v1/library/fines/:fineId/pay', (req, res) => {
  const fine = fines.get(req.params.fineId);

  if (!fine) {
    return res.status(404).json({ success: false, message: 'Fine not found' });
  }

  fine.status = 'paid';
  fine.paidAt = new Date().toISOString();
  fines.set(fine.id, fine);

  res.json({
    success: true,
    message: 'Fine paid successfully',
    data: fine
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📚 Library Service running on port ${PORT}\n`);
  });
}

module.exports = app;
