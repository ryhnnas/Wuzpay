import { toast } from "sonner";
import { settingsAPI } from '@/services/api';

export const handleGlobalPrint = async (transaction: any) => {
  const toastId = toast.loading("Sinkronisasi Driver Printer...");

  try {
    // 1. Ambil data dari Database (Pusat)
    const dbSettings = await settingsAPI.getReceiptSettings();
    const settings = dbSettings || {};

    // 2. Logika Ukuran Kertas Dinamis
    let paperWidth = "48mm"; // Default 58mm paper
    let bodyWidth = "58mm";

    if (settings.paper_size === '80mm') {
      paperWidth = "72mm";
      bodyWidth = "80mm";
    } else if (settings.paper_size === '47mm') {
      paperWidth = "38mm";
      bodyWidth = "47mm";
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);

    const pri = printFrame.contentWindow;
    if (!pri) return;

    const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID').format(amount || 0);

    // Hitung Subtotal (Sebelum diskon global)
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
              line-height: 1.2;
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
              text-transform: capitalize;
              font-weight: bold;
            }

            .discount-text {
              font-size: 0.9em;
              font-style: italic;
            }

            .footer { 
              margin-top: 20px; 
              text-align: center; 
              font-style: italic; 
              white-space: pre-line;
              font-size: ${Math.max((settings.font_size || 10) - 1, 8)}px;
            }

            .nexera-footer {
              margin-top: 15px;
              padding-top: 5px;
              border-top: 0.5px solid #eee;
              font-size: 7px;
              text-align: center;
              letter-spacing: 2px;
              opacity: 0.3;
            }

            .feed-area {
              height: 80px;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${settings.show_logo && settings.logo_url ? `<img src="${settings.logo_url}" class="logo" />` : ''}
            <div class="font-bold uppercase" style="font-size: ${Math.min((settings.font_size || 10) + 2, 14)}px;">
              ${settings.store_name || 'SEBLAK MLEDAK'}
            </div>
            <div style="font-size: ${Math.max((settings.font_size || 10) - 2, 7)}px;">
              ${settings.address || ''}
            </div>
          </div>

          <div class="dashed-line"></div>

          <div style="font-size: ${Math.max((settings.font_size || 10) - 1, 8)}px;">
            <div class="flex"><span>No:</span> <span>${transaction.receipt_number || 'N/A'}</span></div>
            <div class="flex"><span>Tgl:</span> <span>${new Date(transaction.created_at || new Date()).toLocaleString('id-ID')}</span></div>
            <div class="flex capitalize"><span>Cust:</span> <span>${transaction.customer_name || 'UMUM'}</span></div>
          </div>

          <div class="dashed-line"></div>

          <div class="item-container">
            ${(transaction.items || []).map((item: any) => {
              const hasItemDiscount = (item.discount_amount || 0) > 0;
              const originalPrice = (item.price_at_sale || item.price || 0) + (item.discount_amount || 0);
              
              return `
                <div style="margin-bottom: 8px;">
                  <span class="product-name">${item.product_name || item.name}</span>
                  <div class="flex">
                    <span>
                      ${item.quantity} x ${formatCurrency(item.price_at_sale || item.price)}
                    </span>
                    <span class="font-bold">${formatCurrency((item.quantity || 0) * (item.price_at_sale || item.price || 0))}</span>
                  </div>
                  ${hasItemDiscount ? `
                    <div class="discount-text">
                      <span style="text-decoration: line-through;">${formatCurrency(originalPrice)}</span>
                      (Disc. ${formatCurrency(item.discount_amount)})
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="dashed-line"></div>

          <div style="margin-top: 5px;">
            ${transaction.discount_amount > 0 ? `
              <div class="flex">
                <span>Subtotal</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              <div class="flex">
                <span>Diskon ${transaction.discount_name ? `(${transaction.discount_name})` : ''}</span>
                <span>-${formatCurrency(transaction.discount_amount)}</span>
              </div>
            ` : ''}

            <div class="flex font-bold" style="font-size: ${Math.min((settings.font_size || 10) + 2, 12)}px; margin-bottom: 2px;">
              <span>Total</span>
              <span>Rp ${formatCurrency(transaction.total_amount || 0)}</span>
            </div>
            
            <div class="flex">
              <span>Bayar (${(transaction.payment_method || 'CASH')})</span>
              <span>${formatCurrency(transaction.amount_paid || 0)}</span>
            </div>
            <div class="flex italic" style="font-weight: normal; color: #000;">
              <span>Kembali</span>
              <span>${formatCurrency(transaction.change_amount || 0)}</span>
            </div>
          </div>

          <div class="footer">
            ${settings.footer_text || 'Terima Kasih!'}
          </div>

          <div class="nexera-footer uppercase">
            SEBLAK MLEDAK SINDANGSARI
          </div>

          ${settings.extra_feed ? `
            <div class="feed-area"></div>
            <div class="text-center" style="font-size: 8px;">.</div> 
          ` : ''}

          <script>
            window.onload = function() {
              window.focus();
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    pri.document.open();
    pri.document.write(receiptHtml);
    pri.document.close();

    toast.dismiss(toastId);

    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 2000);

  } catch (error) {
    toast.error("Gagal cetak: Sinkronisasi printer error", { id: toastId });
    console.error(error);
  }
};