import os
import re
import json
import base64

import google.generativeai as genai
from pricing import PRICE_TABLE, CONDITION_MULT

CATEGORY_GUIDE = "\n".join(f"- {k}: {v['label']}" for k, v in PRICE_TABLE.items())
SYSTEM = (
    "You are an e-waste inspector for an Indian recycling marketplace. Look at the photo and classify the lot.\n"
    f"Allowed category keys:\n{CATEGORY_GUIDE}\n"
    "Allowed condition keys: working, repairable, scrap.\n"
    "Estimate the total weight of the visible items in kilograms using typical device weights (smartphone 0.2kg, laptop 2kg, desktop tower 8kg, CRT monitor 12kg, LCD monitor 4kg, printer 8kg, fridge 60kg, inverter battery 15kg).\n"
    "Respond with ONLY a JSON object, no prose, in this exact shape: "
    '{"category": "<key>", "condition": "<key>", "weight_kg": <number>, "confidence": <0-1>, "items": ["<short item>", ...], "notes": "<one sentence>"}'
)

MODEL = "gemini-1.5-flash"  # free-tier friendly, supports vision
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel(MODEL, system_instruction=SYSTEM)


async def analyze_photo(image_bytes: bytes, hint: str = "") -> dict:
    text = "Classify this e-waste photo and estimate its weight."
    if hint:
        text += f" Collector's note: {hint}"

    response = model.generate_content(
        [
            text,
            {"mime_type": "image/jpeg", "data": image_bytes},
        ]
    )

    out = response.text or ""

    match = re.search(r"\{.*\}", out, re.S)
    if not match:
        raise ValueError("Model did not return JSON")
    data = json.loads(match.group())

    category = data.get("category") if data.get("category") in PRICE_TABLE else "mixed"
    condition = data.get("condition") if data.get("condition") in CONDITION_MULT else "repairable"
    try:
        weight = round(min(5000.0, max(0.1, float(data.get("weight_kg", 1)))), 1)
    except (TypeError, ValueError):
        weight = 1.0

    return {
        "category": category,
        "label": PRICE_TABLE[category]["label"],
        "per_kg": PRICE_TABLE[category]["per_kg"],
        "condition": condition,
        "weight_kg": weight,
        "confidence": round(float(data.get("confidence", 0.7) or 0.7), 2),
        "items": [str(i) for i in (data.get("items") or [])][:8],
        "notes": str(data.get("notes", ""))[:300],
        "model": MODEL,
    }
