import re

PRICE_TABLE = {
    "smartphone": {"label": "Smartphones & Tablets", "per_kg": 350, "keywords": ["phone", "mobile", "iphone", "android", "tablet", "ipad", "smartphone"]},
    "laptop": {"label": "Laptops", "per_kg": 450, "keywords": ["laptop", "notebook", "macbook", "chromebook"]},
    "desktop": {"label": "Desktop PCs & Servers", "per_kg": 200, "keywords": ["desktop", "pc", "cpu", "server", "tower", "computer"]},
    "monitor_tv": {"label": "Monitors & TVs", "per_kg": 110, "keywords": ["monitor", "tv", "television", "screen", "display", "lcd", "led"]},
    "large_appliance": {"label": "Large Appliances", "per_kg": 55, "keywords": ["fridge", "refrigerator", "washing machine", "air conditioner", "microwave", "oven", "cooler"]},
    "small_appliance": {"label": "Small Appliances", "per_kg": 70, "keywords": ["mixer", "iron", "kettle", "toaster", "fan", "heater", "grinder"]},
    "printer": {"label": "Printers & Scanners", "per_kg": 90, "keywords": ["printer", "scanner", "photocopier", "xerox", "cartridge"]},
    "cables": {"label": "Cables & Wires", "per_kg": 180, "keywords": ["cable", "cables", "wire", "wires", "charger", "adapter", "cord"]},
    "batteries": {"label": "Batteries & UPS", "per_kg": 150, "keywords": ["battery", "batteries", "ups", "inverter", "power bank"]},
    "pcb": {"label": "Circuit Boards (PCB)", "per_kg": 900, "keywords": ["pcb", "circuit", "motherboard", "ram", "chip", "gpu", "graphics card"]},
    "mixed": {"label": "Mixed E-Waste", "per_kg": 80, "keywords": []},
}

CONDITION_MULT = {"working": 1.3, "repairable": 1.0, "scrap": 0.8}


def categorize(text: str) -> dict:
    t = text.lower()
    scores = {}
    for key, cfg in PRICE_TABLE.items():
        hits = [k for k in cfg["keywords"] if re.search(rf"\b{re.escape(k)}\b", t)]
        if hits:
            scores[key] = hits
    if not scores:
        return {"category": "mixed", "label": PRICE_TABLE["mixed"]["label"], "per_kg": 80, "confidence": 0.35, "matched": []}
    best = max(scores, key=lambda k: len(scores[k]))
    return {
        "category": best,
        "label": PRICE_TABLE[best]["label"],
        "per_kg": PRICE_TABLE[best]["per_kg"],
        "confidence": round(min(0.96, 0.6 + 0.12 * len(scores[best])), 2),
        "matched": scores[best],
    }


def estimate(category: str, weight_kg: float, condition: str) -> dict:
    cfg = PRICE_TABLE.get(category) or PRICE_TABLE["mixed"]
    key = category if category in PRICE_TABLE else "mixed"
    mult = CONDITION_MULT.get(condition, 1.0)
    return {
        "category": key,
        "label": cfg["label"],
        "price_per_kg": cfg["per_kg"],
        "multiplier": mult,
        "weight_kg": weight_kg,
        "condition": condition if condition in CONDITION_MULT else "repairable",
        "estimated_price": round(cfg["per_kg"] * weight_kg * mult, 2),
    }
