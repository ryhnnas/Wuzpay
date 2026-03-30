import os
import re
import math
import requests
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
ENV_PATH = BASE_DIR / ".env"

TX_CSV = DATA_DIR / "transaksi_per_no_struk.csv"
ITEM_CSV = DATA_DIR / "transaksi_detail_per_no_struk.csv"


def load_env(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        env[key] = val
    return env


def parse_number(val: Any) -> float:
    if val is None:
        return 0.0
    s = str(val).strip()
    if s == "" or s.lower() in {"nan", "none"}:
        return 0.0
    s = re.sub(r"[^0-9,.-]", "", s)
    if s == "":
        return 0.0
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def clean_text(val: Any) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in {"nan", "none"}:
        return None
    return s


def norm_sku(val: Any) -> Optional[str]:
    raw = clean_text(val)
    if not raw:
        return None
    stripped = raw.lstrip("0")
    return stripped if stripped else "0"


def chunked(items: List[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def main():
    env = load_env(ENV_PATH)
    supabase_url = env.get("SUPABASE_URL")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di backend/.env")

    tx_df = pd.read_csv(TX_CSV, sep=";", dtype=str, encoding="utf-8")
    item_df = pd.read_csv(ITEM_CSV, sep=";", dtype=str, encoding="utf-8")

    print(f"Loaded transaksi: {len(tx_df)} rows")
    print(f"Loaded transaksi detail: {len(item_df)} rows")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    base_rest = f"{supabase_url}/rest/v1"

    # 1) Build transaction payloads
    tx_payload: List[Dict[str, Any]] = []
    for _, row in tx_df.iterrows():
        receipt_number = clean_text(row.get("Kode Transaksi"))
        if not receipt_number:
            continue

        tx_payload.append({
            "receipt_number": receipt_number,
            "transaction_sequence": int(parse_number(row.get("No"))) if clean_text(row.get("No")) else None,
            "created_at": clean_text(row.get("Waktu")),
            "total_amount": parse_number(row.get("Total Pendapatan")),
            "total_real_amount": parse_number(row.get("Total Uang Real")),
            "profit": parse_number(row.get("Keuntungan")),
            "amount_paid": parse_number(row.get("Bayar")),
            "change_amount": parse_number(row.get("Uang Kembalian")),
            "cashier_name": clean_text(row.get("Kasir")),
            "payment_type": clean_text(row.get("Tipe Pembayaran")),
            "payment_method": (clean_text(row.get("Metode Pembayaran")) or "cash").lower(),
            "customer_email": clean_text(row.get("Email Pelanggan")),
            "customer_name": clean_text(row.get("Nama Pelanggan")),
            "due_date": clean_text(row.get("Jatuh Tempo")),
            "discount_amount": parse_number(row.get("Diskon")),
            "discount_name": clean_text(row.get("Nama Diskon")),
            "tax_amount": parse_number(row.get("Pajak")),
            "notes": clean_text(row.get("Keterangan")),
            "return_reason": clean_text(row.get("Alasan Retur")),
            "table_number": clean_text(row.get("No. Meja")),
            "service_charge": parse_number(row.get("Biaya Layanan")),
            "rounding_amount": parse_number(row.get("Pembulatan")),
            "customer_type": clean_text(row.get("Tipe Pelanggan")),
            "status": "completed",
        })

    print(f"Prepared transaksi payload: {len(tx_payload)} rows")

    # 2) Upsert transactions in batches
    upsert_url = f"{base_rest}/transactions?on_conflict=receipt_number"
    upsert_headers = {
        **headers,
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for batch in chunked(tx_payload, 500):
        r = requests.post(upsert_url, headers=upsert_headers, json=batch, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Upsert transactions gagal: {r.status_code} {r.text}")

    print("Transactions upserted.")

    # 3) Fetch transaction id map by receipt number
    receipt_numbers = list({p["receipt_number"] for p in tx_payload})
    tx_id_by_receipt: Dict[str, str] = {}
    for chunk in chunked(receipt_numbers, 250):
        in_clause = ",".join(chunk)
        url = f"{base_rest}/transactions?select=id,receipt_number&receipt_number=in.({in_clause})"
        r = requests.get(url, headers=headers, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Fetch transactions id map gagal: {r.status_code} {r.text}")
        for row in r.json():
            tx_id_by_receipt[row["receipt_number"]] = row["id"]

    print(f"Resolved transaction ids: {len(tx_id_by_receipt)}")

    # 4) Build product sku map
    r = requests.get(f"{base_rest}/products?select=id,sku,name", headers=headers, timeout=120)
    if r.status_code >= 300:
        raise RuntimeError(f"Fetch products gagal: {r.status_code} {r.text}")

    product_id_by_sku: Dict[str, str] = {}
    for p in r.json():
        sku = norm_sku(p.get("sku"))
        if sku:
            product_id_by_sku[sku] = p["id"]

    print(f"Loaded product sku map: {len(product_id_by_sku)}")

    # 5) Delete old items for same transactions (safe re-run)
    tx_ids = list({v for v in tx_id_by_receipt.values()})
    for chunk in chunked(tx_ids, 150):
        in_clause = ",".join(chunk)
        del_url = f"{base_rest}/transaction_items?transaction_id=in.({in_clause})"
        r = requests.delete(del_url, headers=headers, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Delete old transaction_items gagal: {r.status_code} {r.text}")

    print("Old transaction_items deleted for targeted transactions.")

    # 6) Build item payload
    item_payload: List[Dict[str, Any]] = []
    skipped_no_tx = 0
    skipped_no_product = 0

    for _, row in item_df.iterrows():
        receipt = clean_text(row.get("Kode Transaksi"))
        if not receipt:
            continue

        tx_id = tx_id_by_receipt.get(receipt)
        if not tx_id:
            skipped_no_tx += 1
            continue

        sku_norm = norm_sku(row.get("Kode Barang"))
        product_id = product_id_by_sku.get(sku_norm) if sku_norm else None
        if not product_id:
            skipped_no_product += 1
            continue

        qty = int(round(parse_number(row.get("Jumlah"))))
        price = parse_number(row.get("Harga Jual"))
        cost = parse_number(row.get("Harga Beli"))
        total = parse_number(row.get("Total"))
        if total <= 0:
            total = qty * price

        item_payload.append({
            "transaction_id": tx_id,
            "product_id": product_id,
            "transaction_time": clean_text(row.get("Timestamp")),
            "category_name": clean_text(row.get("Kategori")),
            "product_code": clean_text(row.get("Kode Barang")),
            "product_name": clean_text(row.get("Nama Barang")),
            "quantity": qty,
            "cost_at_sale": cost,
            "price_at_sale": price,
            "total_amount": total,
            "discount_amount": parse_number(row.get("Diskon")),
            "tax_amount": parse_number(row.get("Pajak")),
            "cashier_name": clean_text(row.get("Kasir")),
            "payment_type": clean_text(row.get("Tipe Pembayaran")),
            "payment_method": (clean_text(row.get("Metode Pembayaran")) or "cash").lower(),
            "customer_email": clean_text(row.get("Email Pelanggan")),
            "customer_name": clean_text(row.get("Nama Pelanggan")),
            "short_note": clean_text(row.get("Catatan Singkat")),
        })

    print(f"Prepared transaction_items payload: {len(item_payload)}")
    print(f"Skipped detail rows without matching transaksi: {skipped_no_tx}")
    print(f"Skipped detail rows without matching product sku: {skipped_no_product}")

    # 7) Insert items in batches
    ins_headers = {
        **headers,
        "Prefer": "return=minimal",
    }
    ins_url = f"{base_rest}/transaction_items"
    for batch in chunked(item_payload, 800):
        r = requests.post(ins_url, headers=ins_headers, json=batch, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Insert transaction_items gagal: {r.status_code} {r.text}")

    print("Import selesai.")


if __name__ == "__main__":
    main()
