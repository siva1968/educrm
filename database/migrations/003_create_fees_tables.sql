-- =============================================
-- Migration: Create Fee Management Tables
-- Version: 003
-- Date: 2025-11-19
-- =============================================

-- Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id),
  academic_year VARCHAR(20) NOT NULL,

  -- Fee Components
  tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  lab_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  library_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  sports_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  exam_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_fees JSONB DEFAULT '{}',

  -- Totals
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),

  -- Amount Details
  gross_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),

  -- Term/Period
  term VARCHAR(50),  -- Q1, Q2, Annual, etc.
  academic_year VARCHAR(20) NOT NULL,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR(50) UNIQUE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  student_id UUID NOT NULL REFERENCES students(id),

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'online', 'cheque', 'bank_transfer', 'upi')),
  payment_gateway VARCHAR(50),  -- razorpay, stripe, etc.
  transaction_id VARCHAR(200),

  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Dates
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Additional
  remarks TEXT,
  receipt_number VARCHAR(50),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Payment Reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  student_id UUID NOT NULL REFERENCES students(id),

  -- Reminder Details
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'notification', 'call')),
  message TEXT NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_fee_structures_class_year ON fee_structures(class_id, academic_year);
CREATE INDEX idx_fee_structures_status ON fee_structures(status);

CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_academic_year ON invoices(academic_year);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);

-- Auto-update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    paid_amount = COALESCE((
      SELECT SUM(amount)
      FROM payments
      WHERE invoice_id = NEW.invoice_id AND status = 'completed'
    ), 0),
    due_amount = total_amount - COALESCE((
      SELECT SUM(amount)
      FROM payments
      WHERE invoice_id = NEW.invoice_id AND status = 'completed'
    ), 0),
    status = CASE
      WHEN total_amount <= COALESCE((
        SELECT SUM(amount)
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND status = 'completed'
      ), 0) THEN 'paid'
      WHEN COALESCE((
        SELECT SUM(amount)
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND status = 'completed'
      ), 0) > 0 THEN 'partial'
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    paid_date = CASE
      WHEN total_amount <= COALESCE((
        SELECT SUM(amount)
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND status = 'completed'
      ), 0) THEN NEW.paid_at
      ELSE NULL
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

COMMENT ON TABLE fee_structures IS 'Fee structure templates for different classes';
COMMENT ON TABLE invoices IS 'Student fee invoices';
COMMENT ON TABLE payments IS 'Payment records against invoices';
COMMENT ON TABLE payment_reminders IS 'Payment reminder notifications';
