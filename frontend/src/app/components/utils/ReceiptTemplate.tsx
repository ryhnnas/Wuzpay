import React from 'react';

export const ReceiptTemplate = ({ transaction, settings }: { transaction: any, settings: any }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID').format(amount || 0);

  // Ambil nilai margin bawah dari settings, default ke 10px jika tidak ada
  const mbValue = settings?.marginBottom || settings?.margin_b || 10;

  return (
    <div
      className="text-black bg-white"
      style={{
        fontFamily: settings?.fontFamily || settings?.font_family || 'monospace',
        fontSize: `${settings?.fontSize || settings?.font_size || 12}px`,
        width: '100%',
        padding: '4px',
        // Padding bottom dinamis untuk kontrol hemat kertas
        paddingBottom: `${mbValue}px`, 
      }}
    >
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        {(settings?.showLogo || settings?.show_logo) && (settings?.logo || settings?.logo_url) && (
          <img 
            src={settings.logo || settings.logo_url} 
            style={{ height: 35, objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} 
          />
        )}
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '105%' }}>
          {settings?.storeName || settings?.store_name || 'SEBLAK MLEDAK'}
        </div>
        <div style={{ opacity: 0.8, fontSize: '85%', lineHeight: '1.2' }}>
          {settings?.address || '-'}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* INFO TRANSAKSI */}
      <div style={{ fontSize: '85%', lineHeight: '1.2' }}>
        <Row label="NO" value={transaction?.receipt_number || '-'} />
        <Row 
          label="TGL" 
          value={transaction?.created_at 
            ? new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) 
            : new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} 
        />
        <Row label="CUST" value={(transaction?.customer_name || 'Umum').toUpperCase()} />
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* LIST ITEMS - PERBAIKAN NAMA PRODUK KECIL/NORMAL */}
      <div>
        {transaction?.items?.map((item: any, idx: number) => {
          const hasItemDiscount = item.discount_amount > 0;
          return (
            <div key={idx} style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 'normal', fontSize: '100%', textTransform: 'capitalize' }}>
                {(item.product_name || item.name || item.nama_produk || 'Produk Tidak Diketahui').toString().toLowerCase()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '85%', opacity: 0.7 }}>
                  {item.quantity} x {formatCurrency(item.price_at_sale || item.price)}
                </div>
                <div style={{ fontWeight: 'bold' }}>
                  {formatCurrency(item.quantity * (item.price_at_sale || item.price))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* RINCIAN PEMBAYARAN */}
      <div style={{ lineHeight: '1.3' }}>
        {transaction?.discount_amount > 0 && (
          <Row label="SUBTOTAL" value={formatCurrency(transaction?.total_real_amount || transaction?.subtotal)} />
        )}
        {transaction?.discount_amount > 0 && (
          <Row 
            label="DISKON" 
            value={`-${formatCurrency(transaction.discount_amount)}`} 
          />
        )}
        <RowBold label="TOTAL" value={formatCurrency(transaction?.total_amount)} />
        <Row label="BAYAR" value={formatCurrency(transaction?.amount_paid || transaction?.paid_amount)} />
        <Row label="KEMBALI" value={formatCurrency(transaction?.change_amount || 0)} />
      </div>

      {/* FOOTER: Dibuat lebih rapat */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: '85%' }}>
        <div style={{ fontStyle: 'italic' }}>
          {settings?.footer || settings?.footer_text || 'Terima kasih!'}
        </div>
        <div style={{ marginTop: 4, fontSize: '7px', opacity: 0.3, letterSpacing: '1px' }}>
          SEBLAK MLEDAK SINDANGSARI
        </div>
      </div>
    </div>
  );
};

// Row helper agar lebih ringkas
const Row = ({ label, value }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const RowBold = ({ label, value }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #eee', marginTop: '2px', paddingTop: '2px' }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);