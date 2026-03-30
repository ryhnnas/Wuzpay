import React from 'react';

export const ReceiptTemplate = ({ transaction, settings }: { transaction: any, settings: any }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID').format(amount || 0);

  // Fallback values untuk margin dan konfigurasi
  const mbValue = settings?.marginBottom || settings?.margin_b || 10;
  const fontSizeBase = settings?.fontSize || settings?.font_size || 12;

  return (
    <div
      className="text-black bg-white select-none shadow-sm"
      style={{
        fontFamily: settings?.fontFamily || settings?.font_family || 'monospace',
        fontSize: `${fontSizeBase}px`,
        width: '100%',
        padding: '8px',
        paddingBottom: `${mbValue}px`, 
        color: '#000',
      }}
    >
      {/* HEADER: LOGO & IDENTITAS */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        {(settings?.showLogo || settings?.show_logo) && (settings?.logo || settings?.logo_url) && (
          <img 
            src={settings.logo || settings.logo_url} 
            style={{ height: 40, objectFit: 'contain', margin: '0 auto 6px', display: 'block', filter: 'grayscale(100%)' }} 
          />
        )}
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '110%', letterSpacing: '1px' }}>
          {settings?.storeName || settings?.store_name || 'WUZPAY SINDANGSARI'}
        </div>
        <div style={{ opacity: 0.8, fontSize: '85%', lineHeight: '1.2', marginTop: '2px' }}>
          {settings?.address || '-'}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* INFO TRANSAKSI */}
      <div style={{ fontSize: '90%', lineHeight: '1.4' }}>
        <Row label="NO" value={transaction?.receipt_number || (transaction?._id || transaction?.id || 'N/A').toString().substring(18).toUpperCase()} />
        <Row 
          label="TGL" 
          value={transaction?.created_at 
            ? new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) 
            : new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} 
        />
        <Row label="CUST" value={(transaction?.customer_name || 'UMUM').toUpperCase()} />
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* LIST ITEMS */}
      <div style={{ margin: '4px 0' }}>
        {transaction?.items?.map((item: any, idx: number) => {
          const price = item.price_at_sale || item.price || 0;
          const sub = (item.quantity || 0) * price;
          
          return (
            <div key={idx} style={{ marginBottom: 6 }}>
              {/* Nama Produk Bold & Uppercase agar mudah dibaca kasir */}
              <div style={{ fontWeight: 'bold', fontSize: '95%', textTransform: 'uppercase', wordBreak: 'break-word' }}>
                {item.product_name || item.name || 'ITEM WUZPAY'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                <div style={{ fontSize: '85%', opacity: 0.8 }}>
                  {item.quantity} x {formatCurrency(price)}
                </div>
                <div style={{ fontWeight: 'bold' }}>
                  {formatCurrency(sub)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* RINCIAN TOTAL & PEMBAYARAN */}
      <div style={{ lineHeight: '1.5', marginTop: '4px' }}>
        {/* Subtotal muncul jika ada diskon agar rinciannya jelas */}
        {(transaction?.discount_amount > 0) && (
          <Row label="SUBTOTAL" value={formatCurrency(transaction?.subtotal || transaction?.total_real_amount)} />
        )}
        
        {transaction?.discount_amount > 0 && (
          <Row 
            label={`PROMO (${(transaction?.discount_name || 'DISKON').toUpperCase()})`} 
            value={`-${formatCurrency(transaction.discount_amount)}`} 
          />
        )}

        <div style={{ margin: '4px 0', borderTop: '1px solid #eee' }} />

        <RowBold label="TOTAL" value={`Rp ${formatCurrency(transaction?.total_amount)}`} fontSize={fontSizeBase + 2} />
        
        <Row label={`BAYAR (${(transaction?.payment_method || 'CASH').toUpperCase()})`} value={formatCurrency(transaction?.amount_paid || transaction?.paid_amount || transaction?.total_amount)} />
        
        {(transaction?.change_amount > 0) && (
          <Row label="KEMBALI" value={formatCurrency(transaction?.change_amount)} italic />
        )}
      </div>

      {/* FOOTER RAUTAN KERTAS */}
      <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '85%', paddingBottom: '10px' }}>
        <div style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
          {settings?.footer || settings?.footer_text || 'Terima kasih atas kunjungannya!'}
        </div>
        <div style={{ marginTop: '10px', fontSize: '7px', opacity: 0.4, letterSpacing: '2px', fontWeight: 'bold' }}>
          WUZPAY POS • SINDANGSARI
        </div>
      </div>
    </div>
  );
};

// Row helper agar kode utama tidak "spaghetti"
const Row = ({ label, value, italic = false }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontStyle: italic ? 'italic' : 'normal' }}>
    <span style={{ fontWeight: 'normal' }}>{label}</span>
    <span style={{ fontWeight: 'bold' }}>{value}</span>
  </div>
);

const RowBold = ({ label, value, fontSize }: any) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    fontWeight: '900', 
    fontSize: fontSize ? `${fontSize}px` : 'inherit',
    marginTop: '2px', 
    marginBottom: '2px' 
  }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);