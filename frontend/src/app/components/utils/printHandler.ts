import { toast } from "sonner";
import { settingsAPI } from '@/services/api';

export const handleGlobalPrint = async (transaction: any) => {
  const toastId = toast.loading("Sinkronisasi WuzPay Print Driver...");

  try {
    // 1. Ambil Konfigurasi dari Database Cloud
    const dbSettings = await settingsAPI.getReceiptSettings();
    const settings = dbSettings || {};

    // 2. Kalkulasi Dimensi Kertas (Standar Thermal)
    let paperWidth = "48mm"; // Area cetak efektif untuk kertas 58mm
    let bodyWidth = "58mm";

    if (settings.paper_size === '80mm') {
      paperWidth = "72mm";
      bodyWidth = "80mm";
    } else if (settings.paper_size === '47mm') {
      paperWidth = "38mm";
      bodyWidth = "47mm";
    }

    // 3. Setup Iframe Tersembunyi (Teknik Print Browser Tanpa Ganggu UI)
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);

    const pri = printFrame.contentWindow;
    if (!pri) return;

    const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID').format(amount || 0);

    // Hitung Subtotal Real (Harga x Qty per item)
    const subtotal = transaction?.items?.reduce((acc: number, item: any) => 
      acc + (item.quantity * (item.price_at_sale || item.price || 0)), 0) || 0;

    const receiptHtml = `
      <html>
        <head>
          <style>
            @page { 
              size: ${bodyWidth} auto; 
              margin: 0; 
            }
            body { 
              font-family: ${settings.font_family || 'monospace'}; 
              font-size: ${settings.font_size || 10}px;
              width: ${paperWidth}; 
              margin: 0 auto; 
              padding: 10px ${settings.margin_h || 0}px 0px ${settings.margin_h || 0}px;
              color: #000;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .flex { display: flex; justify-content: space-between; width: 100%; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            
            .dashed-line { 
              border-top: 1px dashed #000; 
              margin: 8px 0; 
              width: 100%;
            }

            .logo { 
              max-height: 60px; 
              width: auto; 
              display: block; 
              margin: 0 auto 10px auto; 
              filter: grayscale(100%); 
            }

            .product-name {
              display: block;
              word-wrap: break-word;
              max-width: ${settings.max_chars || 32}ch;
              text-transform: uppercase;
              font-weight: bold;
              font-size: 0.9em;
            }

            .footer { 
              margin-top: 15px; 
              text-align: center; 
              font-style: italic; 
              white-space: pre-line;
              font-size: ${Math.max((settings.font_size || 10) - 1, 8)}px;
            }

            .wuzpay-watermark {
              margin-top: 15px;
              padding-top: 5px;
              border-top: 0.5px solid #eee;
              font-size: 7px;
              text-align: center;
              letter-spacing: 2px;
              opacity: 0.5;
              font-weight: bold;
            }

            .feed-area {
              height: ${settings.margin_b || 80}px;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${settings.show_logo && settings.logo_url ? `<img src="${settings.logo_url}" class="logo" />` : ''}
            <div class="font-bold uppercase" style="font-size: ${Math.min((settings.font_size || 10) + 2, 14)}px;">
              ${settings.store_name || 'WUZPAY SINDANGSARI'}
            </div>
            <div style="font-size: ${Math.max((settings.font_size || 10) - 2, 7)}px;">
              ${settings.address || ''}
            </div>
          </div>

          <div class="dashed-line"></div>

          <div style="font-size: ${Math.max((settings.font_size || 10) - 1, 8)}px;">
            <div class="flex"><span>No:</span> <span>${transaction.receipt_number || 'WUZ-NEW'}</span></div>
            <div class="flex"><span>Tgl:</span> <span>${new Date(transaction.created_at || new Date()).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <div class="flex uppercase"><span>Cust:</span> <span>${transaction.customer_name || 'UMUM'}</span></div>
          </div>

          <div class="dashed-line"></div>

          <div class="item-container">
            ${(transaction.items || []).map((item: any) => {
              const price = item.price_at_sale || item.price || 0;
              const sub = item.quantity * price;
              
              return `
                <div style="margin-bottom: 6px;">
                  <span class="product-name">${item.product_name || item.name}</span>
                  <div class="flex">
                    <span>${item.quantity} x ${formatCurrency(price)}</span>
                    <span class="font-bold">${formatCurrency(sub)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="dashed-line"></div>

          <div style="margin-top: 5px;">
            <div class="flex">
              <span>Subtotal</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            
            ${transaction.discount_amount > 0 ? `
              <div class="flex">
                <span>Promo (${transaction.discount_name || 'Diskon'})</span>
                <span>-${formatCurrency(transaction.discount_amount)}</span>
              </div>
            ` : ''}

            <div class="flex font-bold" style="font-size: ${Math.min((settings.font_size || 10) + 2, 12)}px; margin-top: 4px;">
              <span>TOTAL</span>
              <span>Rp ${formatCurrency(transaction.total_amount || 0)}</span>
            </div>
            
            <div class="dashed-line"></div>

            <div class="flex">
              <span>Bayar (${(transaction.payment_method || 'CASH').toUpperCase()})</span>
              <span>${formatCurrency(transaction.paid_amount || transaction.total_amount)}</span>
            </div>
            ${(transaction.change_amount || 0) > 0 ? `
              <div class="flex italic">
                <span>Kembali</span>
                <span>${formatCurrency(transaction.change_amount)}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            ${settings.footer_text || 'Terima Kasih!'}
          </div>

          <div class="wuzpay-watermark uppercase">
            WUZPAY POS • SINDANGSARI
          </div>

          <div class="feed-area"></div>

          <script>
            window.onload = function() {
              window.focus();
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    pri.document.open();
    pri.document.write(receiptHtml);
    pri.document.close();

    toast.dismiss(toastId);

    // Hapus iframe setelah print dialog muncul
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 2000);

  } catch (error) {
    toast.error("Hardware Error: Gagal sinkronisasi printer", { id: toastId });
    console.error(error);
  }
};