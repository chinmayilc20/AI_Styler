import os
import json
import traceback
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_server_api_key = os.getenv("GEMINI_API_KEY")

PLACEHOLDER = "your_gemini_api_key_here"


def _resolve_key(user_key: str = None) -> str | None:
    """Return user-supplied key if valid, else fall back to server key."""
    if user_key and user_key.strip() and user_key.strip() != PLACEHOLDER:
        return user_key.strip()
    if _server_api_key and _server_api_key != PLACEHOLDER:
        return _server_api_key
    return None


def _parse_json(text: str):
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


# ── Vision tagging ────────────────────────────────────────────────────────────

def analyze_image_for_tags(file_path: str, user_key: str = None) -> dict:
    """Raises on failure — caller must handle and return HTTP error."""
    key = _resolve_key(user_key)
    if not key:
        raise ValueError("No Gemini API key configured. Add yours in Settings.")

    client = genai.Client(api_key=key)
    sample_file = client.files.upload(file=file_path)
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[sample_file, """
Analyze this clothing or accessory item. Return ONLY a valid JSON object with these keys:
- "category": one of [top, bottom, outerwear, shoes, accessory, dress]
- "sub_type": if category is "accessory" then one of [belt, watch, bag, hat, sunglasses, jewellery, scarf]; otherwise null
- "color": primary color mapped to the closest Wada Sanzo color concept (e.g. Carmine, Celadon, Mustard, Charcoal, Ivory)
- "formality": one of [casual, smart-casual, formal]
- "description": a single concise descriptive sentence

Return raw JSON only — no markdown, no code fences.
"""]
        )
        return _parse_json(response.text)
    except Exception:
        traceback.print_exc()
        raise
    finally:
        try:
            client.files.delete(name=sample_file.name)
        except Exception:
            pass


# ── Outfit generation ─────────────────────────────────────────────────────────

def generate_outfits(available_items: list, event_description: str,
                     weather_data: dict, user_key: str = None) -> list:
    key = _resolve_key(user_key)
    if not key:
        return []

    try:
        client = genai.Client(api_key=key)
        prompt = f"""
You are an expert fashion stylist deeply trained in Wada Sanzo's "A Dictionary of Color Combinations".

Generate 2-3 complete outfit recommendations from the wardrobe items below for the given event and weather.
Each outfit must use only items from the wardrobe (reference by 'id'). Where appropriate, include 1 accessory
(category = "accessory") per outfit — its sub_type is provided to help you reason about it.

Event: {event_description}
Weather: {json.dumps(weather_data, indent=2)}
Wardrobe: {json.dumps(available_items, indent=2)}

Return ONLY a valid JSON array. Each element must have:
- "item_ids": array of integer item IDs (include the accessory ID when relevant)
- "reasoning": object with:
    - "weather_fit": why this works for the weather
    - "event_fit": why this works for the event
    - "overall_note": aesthetic note explicitly referencing Wada Sanzo color principles

Return raw JSON only — no markdown, no code fences.
"""
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return _parse_json(response.text)
    except Exception as e:
        print(f"Error in outfit generation: {e}")
        traceback.print_exc()
        return []


# ── Outfit image generation (Nano Banana / gemini-3.1-flash-image) ────────────

def _upload_path(client, path: str):
    if path.startswith("http"):
        import urllib.request, tempfile
        suffix = os.path.splitext(path.split("?")[0])[-1] or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            urllib.request.urlretrieve(path, tmp.name)
            f = client.files.upload(file=tmp.name)
        os.unlink(tmp.name)
        return f
    elif os.path.exists(path):
        return client.files.upload(file=path)
    return None


def generate_outfit_image(item_paths: list, event_description: str,
                          user_photo_path: str = None, user_key: str = None):
    """Returns a data-URI string, or None if generation fails."""
    key = _resolve_key(user_key)
    if not key:
        return None

    uploaded_files = []
    client = genai.Client(api_key=key)
    try:
        user_file = None
        if user_photo_path:
            user_file = _upload_path(client, user_photo_path)
            if user_file:
                uploaded_files.append(user_file)

        for path in item_paths:
            f = _upload_path(client, path)
            if f:
                uploaded_files.append(f)

        if not uploaded_files:
            return None

        if user_file:
            prompt = (
                f"Virtual try-on: the first image is a photo of a person. "
                f"The remaining images are clothing items and accessories. "
                f"Generate a realistic image of that exact person wearing all those clothes and accessories together. "
                f"Keep the person's face, body, and skin tone accurate. "
                f"The outfit is styled for: {event_description}."
            )
        else:
            prompt = (
                f"Flat-lay fashion photograph: arrange these clothing items neatly on a clean white background. "
                f"Top-down view, professional product photography style. Styled for: {event_description}."
            )

        response = client.models.generate_content(
            model='gemini-3.1-flash-image',
            contents=[*uploaded_files, prompt],
            config=types.GenerateContentConfig(response_modalities=['IMAGE'])
        )

        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                return f"data:{part.inline_data.mime_type};base64,{part.inline_data.data}"
        return None

    except Exception as e:
        print(f"Outfit image generation failed: {e}")
        traceback.print_exc()
        return None
    finally:
        for f in uploaded_files:
            try:
                client.files.delete(name=f.name)
            except Exception:
                pass
