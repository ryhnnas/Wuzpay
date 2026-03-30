import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
ENV_PATH = BASE_DIR / ".env"

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
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def clean_text(val: Any) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in {"nan", "none"}:
        return None
    return s


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


def norm_sku(val: Any) -> Optional[str]:
    raw = clean_text(val)
    if not raw:
        return None
    stripped = raw.lstrip("0")
    return stripped if stripped else "0"


def chunked(items: List[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


Signature = Tuple[str, str, str, str, int, float]


def build_signature(
    transaction_id: str,
    product_id: str,
    transaction_time: Optional[str],
    product_code: Optional[str],
    quantity: int,
    price_at_sale: float,
) -> Signature:
    return (
        transaction_id,
        product_id,
        transaction_time or "",
        product_code or "",
        quantity,
        round(float(price_at_sale), 4),
    )


def main():
    env = load_env(ENV_PATH)
    supabase_url = env.get("SUPABASE_URL")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di backend/.env")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    base_rest = f"{supabase_url}/rest/v1"

    detail_df = pd.read_csv(ITEM_CSV, sep=";", dtype=str, encoding="utf-8")
    print(f"Loaded transaksi detail: {len(detail_df)} rows")

    # Map receipt -> transaction_id
    receipts = (
        detail_df["Kode Transaksi"]
        .fillna("")
        .astype(str)
        .str.strip()
    )
    receipt_list = sorted({v for v in receipts if v})

    tx_id_by_receipt: Dict[str, str] = {}
    for chunk in chunked(receipt_list, 250):
        in_clause = ",".join(chunk)
        url = f"{base_rest}/transactions?select=id,receipt_number&receipt_number=in.({in_clause})"
        r = requests.get(url, headers=headers, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Fetch transactions id map gagal: {r.status_code} {r.text}")
        for row in r.json():
            tx_id_by_receipt[row["receipt_number"]] = row["id"]
    print(f"Resolved transaction ids: {len(tx_id_by_receipt)}")

    # Map sku -> product_id
    r = requests.get(f"{base_rest}/products?select=id,sku", headers=headers, timeout=120)
    if r.status_code >= 300:
        raise RuntimeError(f"Fetch products gagal: {r.status_code} {r.text}")

    product_id_by_sku: Dict[str, str] = {}
    for p in r.json():
        sku_norm = norm_sku(p.get("sku"))
        if sku_norm:
            product_id_by_sku[sku_norm] = p["id"]
    print(f"Loaded product sku map: {len(product_id_by_sku)}")

    # Expected signatures from CSV + keep representative payload per signature
    expected_counter: Counter[Signature] = Counter()
    payload_by_signature: Dict[Signature, Dict[str, Any]] = {}
    skipped_no_tx = 0
    skipped_no_product = 0

    for _, row in detail_df.iterrows():
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

        transaction_time = clean_text(row.get("Timestamp"))
        product_code = clean_text(row.get("Kode Barang"))

        signature = build_signature(
            transaction_id=tx_id,
            product_id=product_id,
            transaction_time=transaction_time,
            product_code=product_code,
            quantity=qty,
            price_at_sale=price,
        )
        expected_counter[signature] += 1

        if signature not in payload_by_signature:
            payload_by_signature[signature] = {
                "transaction_id": tx_id,
                "product_id": product_id,
                "transaction_time": transaction_time,
                "category_name": clean_text(row.get("Kategori")),
                "product_code": product_code,
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
            }

    print(f"Expected mapped rows: {sum(expected_counter.values())}")
    print(f"Skipped no matching transaksi: {skipped_no_tx}")
    print(f"Skipped no matching product sku: {skipped_no_product}")

    # Existing signatures currently in DB for relevant transactions
    tx_ids = list({v for v in tx_id_by_receipt.values()})
    existing_counter: Counter[Signature] = Counter()

    for chunk in chunked(tx_ids, 120):
        in_clause = ",".join(chunk)
        select_cols = "transaction_id,product_id,transaction_time,product_code,quantity,price_at_sale"
        url = f"{base_rest}/transaction_items?select={select_cols}&transaction_id=in.({in_clause})&limit=100000"
        r = requests.get(url, headers=headers, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Fetch existing transaction_items gagal: {r.status_code} {r.text}")

        for row in r.json():
            signature = build_signature(
                transaction_id=row["transaction_id"],
                product_id=row["product_id"],
                transaction_time=clean_text(row.get("transaction_time")),
                product_code=clean_text(row.get("product_code")),
                quantity=int(row.get("quantity") or 0),
                price_at_sale=float(row.get("price_at_sale") or 0.0),
            )
            existing_counter[signature] += 1

    print(f"Existing mapped rows in DB: {sum(existing_counter.values())}")

    # Build reinsert payload by deficits only
    reinsert_payload: List[Dict[str, Any]] = []
    deficit_rows = 0
    for sig, expected_count in expected_counter.items():
        current_count = existing_counter.get(sig, 0)
        deficit = expected_count - current_count
        if deficit > 0:
            deficit_rows += deficit
            row_payload = payload_by_signature[sig]
            for _ in range(deficit):
                reinsert_payload.append(row_payload)

    print(f"Rows to reinsert (deficit): {deficit_rows}")

    if not reinsert_payload:
        print("Tidak ada baris gagal yang perlu diinsert ulang.")
        return

    ins_url = f"{base_rest}/transaction_items"
    ins_headers = {**headers, "Prefer": "return=minimal"}
    for batch in chunked(reinsert_payload, 800):
        r = requests.post(ins_url, headers=ins_headers, json=batch, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"Insert reimport transaction_items gagal: {r.status_code} {r.text}")

    print("Reimport baris gagal selesai.")


if __name__ == "__main__":
    main()
