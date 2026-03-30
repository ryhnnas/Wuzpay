-- =====================================================
-- TEMPLATE IMPORT TRANSAKSI DARI EXCEL (1x EKSEKUSI)
-- Source file:
-- 1) transaksi_per_no_struk.xlsx
-- 2) transaksi_detail_per_no_struk.xlsx
--
-- Langkah pakai:
-- A. Jalankan file SQL ini dulu di Supabase SQL Editor.
-- B. Import CSV transaksi ke tabel staging_transactions_excel.
-- C. Import CSV transaksi detail ke tabel staging_transaction_items_excel.
-- D. Jalankan lagi bagian "EKSEKUSI IMPORT KE TABEL PRODUKSI".
--
-- Catatan:
-- - Disarankan convert XLSX -> CSV UTF-8 terlebih dulu.
-- - Header CSV boleh apa pun, yang penting mapping ke kolom staging sesuai nama kolom di bawah.
-- =====================================================

begin;

-- ================================
-- 1) STAGING TABLES
-- ================================
create table if not exists staging_transactions_excel (
  transaction_no text,
  receipt_number text,
  transaction_time text,
  total_amount text,
  total_real_amount text,
  profit text,
  amount_paid text,
  change_amount text,
  cashier_name text,
  payment_type text,
  payment_method text,
  customer_email text,
  customer_name text,
  due_date text,
  discount_amount text,
  discount_name text,
  tax_amount text,
  notes text,
  return_reason text,
  table_number text,
  service_charge text,
  rounding_amount text,
  customer_type text
);

create table if not exists staging_transaction_items_excel (
  receipt_number text,
  item_time text,
  category_name text,
  product_code text,
  product_name text,
  quantity text,
  cost_at_sale text,
  price_at_sale text,
  line_total text,
  discount_amount text,
  tax_amount text,
  cashier_name text,
  payment_type text,
  payment_method text,
  customer_email text,
  customer_name text,
  short_note text
);

-- Optional: kosongkan staging sebelum import baru
-- truncate table staging_transactions_excel;
-- truncate table staging_transaction_items_excel;

-- ================================
-- 2) HELPER FUNCTIONS
-- ================================
create or replace function public.normalize_number(val text)
returns numeric
language sql
immutable
as $$
  select case
    when val is null or btrim(val) = '' then 0::numeric
    else coalesce(
      -- format umum: 12.345,67 -> 12345.67
      nullif(replace(replace(regexp_replace(val, '[^0-9,.-]', '', 'g'), '.', ''), ',', '.'), '')::numeric,
      0::numeric
    )
  end;
$$;

create or replace function public.parse_datetime_flexible(val text)
returns timestamptz
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if val is null or btrim(val) = '' then
    return null;
  end if;

  cleaned := btrim(val);

  begin
    return cleaned::timestamptz;
  exception when others then
    null;
  end;

  begin
    return to_timestamp(cleaned, 'DD/MM/YYYY HH24:MI:SS')::timestamptz;
  exception when others then
    null;
  end;

  begin
    return to_timestamp(cleaned, 'DD/MM/YYYY HH24:MI')::timestamptz;
  exception when others then
    null;
  end;

  begin
    return to_timestamp(cleaned, 'YYYY-MM-DD HH24:MI:SS')::timestamptz;
  exception when others then
    null;
  end;

  begin
    return to_timestamp(cleaned, 'YYYY-MM-DD HH24:MI')::timestamptz;
  exception when others then
    null;
  end;

  return null;
end;
$$;

-- ================================
-- 3) EKSEKUSI IMPORT KE TABEL PRODUKSI
-- ================================
with clean_tx as (
  select
    nullif(btrim(transaction_no), '')::int as transaction_sequence,
    nullif(btrim(receipt_number), '') as receipt_number,
    coalesce(parse_datetime_flexible(transaction_time), now()) as created_at,
    normalize_number(total_amount) as total_amount,
    normalize_number(total_real_amount) as total_real_amount,
    normalize_number(profit) as profit,
    normalize_number(amount_paid) as amount_paid,
    normalize_number(change_amount) as change_amount,
    nullif(btrim(cashier_name), '') as cashier_name,
    nullif(btrim(payment_type), '') as payment_type,
    lower(coalesce(nullif(btrim(payment_method), ''), 'cash')) as payment_method,
    nullif(btrim(customer_email), '') as customer_email,
    nullif(btrim(customer_name), '') as customer_name,
    parse_datetime_flexible(due_date) as due_date,
    normalize_number(discount_amount) as discount_amount,
    nullif(btrim(discount_name), '') as discount_name,
    normalize_number(tax_amount) as tax_amount,
    nullif(btrim(notes), '') as notes,
    nullif(btrim(return_reason), '') as return_reason,
    nullif(btrim(table_number), '') as table_number,
    normalize_number(service_charge) as service_charge,
    normalize_number(rounding_amount) as rounding_amount,
    nullif(btrim(customer_type), '') as customer_type
  from staging_transactions_excel
  where nullif(btrim(receipt_number), '') is not null
),
upserted_tx as (
  insert into transactions (
    receipt_number,
    transaction_sequence,
    created_at,
    total_amount,
    total_real_amount,
    profit,
    amount_paid,
    change_amount,
    cashier_name,
    payment_type,
    payment_method,
    customer_email,
    customer_name,
    due_date,
    discount_amount,
    discount_name,
    tax_amount,
    notes,
    return_reason,
    table_number,
    service_charge,
    rounding_amount,
    customer_type,
    status
  )
  select
    receipt_number,
    transaction_sequence,
    created_at,
    total_amount,
    total_real_amount,
    profit,
    amount_paid,
    change_amount,
    cashier_name,
    payment_type,
    payment_method,
    customer_email,
    customer_name,
    due_date,
    discount_amount,
    discount_name,
    tax_amount,
    notes,
    return_reason,
    table_number,
    service_charge,
    rounding_amount,
    customer_type,
    'completed'
  from clean_tx
  on conflict (receipt_number)
  do update set
    transaction_sequence = excluded.transaction_sequence,
    created_at = excluded.created_at,
    total_amount = excluded.total_amount,
    total_real_amount = excluded.total_real_amount,
    profit = excluded.profit,
    amount_paid = excluded.amount_paid,
    change_amount = excluded.change_amount,
    cashier_name = excluded.cashier_name,
    payment_type = excluded.payment_type,
    payment_method = excluded.payment_method,
    customer_email = excluded.customer_email,
    customer_name = excluded.customer_name,
    due_date = excluded.due_date,
    discount_amount = excluded.discount_amount,
    discount_name = excluded.discount_name,
    tax_amount = excluded.tax_amount,
    notes = excluded.notes,
    return_reason = excluded.return_reason,
    table_number = excluded.table_number,
    service_charge = excluded.service_charge,
    rounding_amount = excluded.rounding_amount,
    customer_type = excluded.customer_type
  returning id, receipt_number
),
delete_old_items as (
  delete from transaction_items ti
  using upserted_tx ut
  where ti.transaction_id = ut.id
  returning ti.id
),
clean_items as (
  select
    nullif(btrim(receipt_number), '') as receipt_number,
    parse_datetime_flexible(item_time) as transaction_time,
    nullif(btrim(category_name), '') as category_name,
    nullif(btrim(product_code), '') as product_code,
    nullif(btrim(product_name), '') as product_name,
    coalesce(nullif(btrim(quantity), '')::int, 0) as quantity,
    normalize_number(cost_at_sale) as cost_at_sale,
    normalize_number(price_at_sale) as price_at_sale,
    normalize_number(line_total) as line_total,
    normalize_number(discount_amount) as discount_amount,
    normalize_number(tax_amount) as tax_amount,
    nullif(btrim(cashier_name), '') as cashier_name,
    nullif(btrim(payment_type), '') as payment_type,
    lower(nullif(btrim(payment_method), '')) as payment_method,
    nullif(btrim(customer_email), '') as customer_email,
    nullif(btrim(customer_name), '') as customer_name,
    nullif(btrim(short_note), '') as short_note
  from staging_transaction_items_excel
  where nullif(btrim(receipt_number), '') is not null
)
insert into transaction_items (
  transaction_id,
  product_id,
  transaction_time,
  category_name,
  product_code,
  product_name,
  quantity,
  cost_at_sale,
  price_at_sale,
  total_amount,
  discount_amount,
  tax_amount,
  cashier_name,
  payment_type,
  payment_method,
  customer_email,
  customer_name,
  short_note
)
select
  ut.id as transaction_id,
  p.id as product_id,
  coalesce(ci.transaction_time, t.created_at) as transaction_time,
  ci.category_name,
  ci.product_code,
  coalesce(ci.product_name, p.name) as product_name,
  ci.quantity,
  ci.cost_at_sale,
  ci.price_at_sale,
  case
    when ci.line_total > 0 then ci.line_total
    else ci.quantity * ci.price_at_sale
  end as total_amount,
  ci.discount_amount,
  ci.tax_amount,
  ci.cashier_name,
  ci.payment_type,
  ci.payment_method,
  ci.customer_email,
  ci.customer_name,
  ci.short_note
from clean_items ci
join upserted_tx ut on ut.receipt_number = ci.receipt_number
join transactions t on t.id = ut.id
left join products p
  on (
    p.sku = ci.product_code
    or ltrim(coalesce(p.sku, ''), '0') = ltrim(coalesce(ci.product_code, ''), '0')
  );

commit;

-- =====================================================
-- CONTOH MAPPING HEADER EXCEL -> STAGING
-- =====================================================
-- FILE transaksi_per_no_struk.xlsx
-- No                    -> transaction_no
-- Kode Transaksi        -> receipt_number
-- Waktu                 -> transaction_time
-- Total Pendapatan      -> total_amount
-- Total Uang Real       -> total_real_amount
-- Keuntungan            -> profit
-- Bayar                 -> amount_paid
-- Uang Kembalian        -> change_amount
-- Kasir                 -> cashier_name
-- Tipe Pembayaran       -> payment_type
-- Metode Pembayaran     -> payment_method
-- Email Pelanggan       -> customer_email
-- Nama Pelanggan        -> customer_name
-- Jatuh Tempo           -> due_date
-- Diskon                -> discount_amount
-- Nama Diskon           -> discount_name
-- Pajak                 -> tax_amount
-- Keterangan            -> notes
-- Alasan Retur          -> return_reason
-- No. Meja              -> table_number
-- Biaya Layanan         -> service_charge
-- Pembulatan            -> rounding_amount
-- Tipe Pelanggan        -> customer_type
--
-- FILE transaksi_detail_per_no_struk.xlsx
-- Kode Transaksi        -> receipt_number
-- Timestamp             -> item_time
-- Kategori              -> category_name
-- Kode Barang           -> product_code
-- Nama Barang           -> product_name
-- Jumlah                -> quantity
-- Harga Beli            -> cost_at_sale
-- Harga Jual            -> price_at_sale
-- Total                 -> line_total
-- Diskon                -> discount_amount
-- Pajak                 -> tax_amount
-- Kasir                 -> cashier_name
-- Tipe Pembayaran       -> payment_type
-- Metode Pembayaran     -> payment_method
-- Email Pelanggan       -> customer_email
-- Nama Pelanggan        -> customer_name
-- Catatan Singkat       -> short_note
