-- Sinkronisasi schema Supabase agar cocok dengan file transaksi_per_no_struk.xlsx
-- dan transaksi_detail_per_no_struk.xlsx
-- Aman dijalankan pada database existing (menggunakan IF NOT EXISTS)

alter table if exists transactions
  add column if not exists receipt_number text,
  add column if not exists transaction_sequence int,
  add column if not exists total_real_amount numeric(10,2) default 0,
  add column if not exists profit numeric(12,2) default 0,
  add column if not exists amount_paid numeric(12,2) default 0,
  add column if not exists change_amount numeric(12,2) default 0,
  add column if not exists cashier_name text,
  add column if not exists payment_type text,
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists due_date timestamp with time zone,
  add column if not exists discount_amount numeric(12,2) default 0,
  add column if not exists discount_name text,
  add column if not exists tax_amount numeric(12,2) default 0,
  add column if not exists notes text,
  add column if not exists return_reason text,
  add column if not exists table_number text,
  add column if not exists service_charge numeric(12,2) default 0,
  add column if not exists rounding_amount numeric(12,2) default 0,
  add column if not exists customer_type text,
  add column if not exists reference_id text,
  add column if not exists payment_details jsonb;

create unique index if not exists uq_transactions_receipt_number on transactions(receipt_number);
create index if not exists idx_transactions_created_at on transactions(created_at);
create index if not exists idx_transactions_payment_method on transactions(payment_method);

alter table if exists transaction_items
  add column if not exists transaction_time timestamp with time zone,
  add column if not exists category_name text,
  add column if not exists product_code text,
  add column if not exists product_name text,
  add column if not exists cost_at_sale numeric(10,2) default 0,
  add column if not exists total_amount numeric(12,2) default 0,
  add column if not exists discount_amount numeric(12,2) default 0,
  add column if not exists tax_amount numeric(12,2) default 0,
  add column if not exists cashier_name text,
  add column if not exists payment_type text,
  add column if not exists payment_method text,
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists short_note text;

create index if not exists idx_transaction_items_transaction_id on transaction_items(transaction_id);
create index if not exists idx_transaction_items_category_name on transaction_items(category_name);
