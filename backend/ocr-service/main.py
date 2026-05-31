from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from openai import AsyncOpenAI
from dotenv import load_dotenv
import shutil
import os
import json
import base64
import asyncio
import uuid

app = FastAPI(title="WuzPay OCR Service", version="1.0.0")
load_dotenv(dotenv_path="../.env")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ambil dari environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_URL = os.getenv("OPENAI_API_URL", "https://api.groq.com/openai/v1")

client_ai = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_API_URL)

BASE_PROMPT_STRUCTURE = (
    "ATURAN MUTLAK:\n"
    "1. Anda HANYA boleh merespons dengan JSON murni.\n"
    "2. DILARANG KERAS menambahkan teks pengantar, penjelasan, atau penutup.\n"
    "3. DILARANG KERAS menggunakan format markdown block (jangan gunakan ```json atau ```).\n"
    "4. Jika nilai tidak ditemukan dalam teks, isi dengan null (bukan string kosong atau 0).\n"
    "5. Bersihkan angka dari simbol mata uang (seperti Rp, $, .) dan kembalikan sebagai tipe data integer/number. "
    "Format tanggal usahakan menjadi YYYY-MM-DD.\n\n"
    "STRUKTUR JSON YANG DIWAJIBKAN:\n"
    "{\n"
    '  "tanggal": "string (YYYY-MM-DD) atau null",\n'
    '  "total_belanja": integer atau null,\n'
    '  "items": [\n'
    "    {\n"
    '      "nama_barang": "string",\n'
    '      "kuantitas": integer atau null,\n'
    '      "harga_per_barang": integer atau null\n'
    "    }\n"
    '  ]\n'
    "}"
)

SYSTEM_PROMPT_OCR = (
    "Anda adalah mesin ekstraksi data resit (struk belanja) yang sangat presisi. "
    "Tugas Anda adalah menganalisis teks hasil OCR dan mengubahnya menjadi format JSON yang valid.\n\n"
    + BASE_PROMPT_STRUCTURE
)

SYSTEM_PROMPT_VISION = (
    "Anda adalah mesin ekstraksi data resit (struk belanja) yang sangat presisi. "
    "Tugas Anda adalah menganalisis gambar resit dan mengubahnya menjadi format JSON yang valid.\n\n"
    + BASE_PROMPT_STRUCTURE
)

ocr = PaddleOCR(use_textline_orientation=True, lang='en')


async def parse_with_openai(raw_text: str) -> dict:
    """Kirim teks OCR mentah ke LLM dan kembalikan JSON terstruktur."""
    try:
        response = await client_ai.chat.completions.create(
            model="llama-3.1-8b-instant",
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_OCR},
                {
                    "role": "user",
                    "content": (
                        "Ekstrak data dari teks resit mentah berikut:\n\n"
                        + raw_text
                    ),
                },
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error parsing with OpenAI: {e}")
        return {"tanggal": None, "total_belanja": None, "items": []}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "WuzPay OCR Service"}


@app.post("/upload-resit/")
async def proses_resit(file: UploadFile = File(...)):
    """Metode OCR: PaddleOCR → teks → LLM parsing → JSON"""
    # Gunakan UUID agar unik dan tidak race condition
    file_id = uuid.uuid4().hex
    extension = os.path.splitext(file.filename)[1]
    temp_file = f"temp_{file_id}{extension}"
    
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # PENTING: Gunakan asyncio.to_thread agar tidak memblokir event loop
        result = await asyncio.to_thread(ocr.ocr, temp_file, cls=True)

        extracted_lines = []
        if result and len(result) > 0:
            for idx in range(len(result)):
                res = result[idx]
                if res is not None:
                    for line in res:
                        extracted_lines.append(line[1][0])
    except Exception as e:
        print(f"Error during OCR process: {e}")
        extracted_lines = []
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

    raw_text = "\n".join(extracted_lines)
    parsed_data = await parse_with_openai(raw_text)

    return {
        "success": True,
        "filename": file.filename,
        "raw_text": extracted_lines,
        "data": parsed_data,
    }


@app.post("/upload-resit-vision/")
async def ocr_with_vision(file: UploadFile = File(...)) -> dict:
    """Metode LLM Vision: Kirim gambar langsung ke LLM vision model → JSON"""
    try:
        contents = await file.read()
        b64_image = base64.b64encode(contents).decode("utf-8")
        mime_type = file.content_type or "image/png"

        # Gunakan model vision original
        response = await client_ai.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_VISION},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Ekstrak data dari resit berikut:"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}",
                            },
                        },
                    ],
                },
            ],
        )

        parsed = json.loads(response.choices[0].message.content)
        return {
            "success": True,
            "data": parsed,
        }
    except Exception as e:
        print(f"Error in vision OCR: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {"tanggal": None, "total_belanja": None, "items": []}
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
