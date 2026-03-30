import requests
from pathlib import Path

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
    'Prefer': 'count=exact',
}

for table in ['transactions', 'transaction_items']:
    response = requests.get(f"{url}/rest/v1/{table}?select=id", headers=headers, timeout=120)
    print(table, 'status', response.status_code, 'count', response.headers.get('Content-Range', '?'))
