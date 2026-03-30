import pandas as pd
import requests
from pathlib import Path


def norm(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return None
    text = text.lstrip("0")
    return text if text else "0"


env = {}
for line in Path('.env').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    env[key.strip()] = value.strip()

url = env['SUPABASE_URL']
key = env['SUPABASE_SERVICE_ROLE_KEY']
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
}

products = requests.get(f"{url}/rest/v1/products?select=sku", headers=headers, timeout=120).json()
sku_set = {norm(product.get('sku')) for product in products if norm(product.get('sku'))}

csv_path = Path('..') / 'data' / 'transaksi_detail_per_no_struk.csv'
detail_df = pd.read_csv(csv_path, sep=';', dtype=str, encoding='utf-8')
normalized_code = detail_df['Kode Barang'].fillna('').astype(str).apply(norm)
missing = normalized_code[~normalized_code.isin(sku_set)]

print('unmatched_rows =', len(missing))
print('top_unmatched_codes:')
print(missing.value_counts().head(30).to_string())
