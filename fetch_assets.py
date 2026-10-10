import os
import io
import requests
from PIL import Image
from rembg import remove

# Wikimedia requires a descriptive User-Agent header (Application name + contact/email)
HEADERS = {
    "User-Agent": "TryItClothingScraper/1.0 (educational dress-up app project; contact@example.com)"
}

def remove_background(image_bytes: bytes) -> bytes:
    """Takes image bytes, strips background using U2-Net, returns PNG bytes."""
    input_image = Image.open(io.BytesIO(image_bytes))
    output_image = remove(input_image)
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format="PNG")
    return output_buffer.getvalue()

def fetch_and_cutout(search_term: str, target_folder: str, max_items: int = 2):
    """
    Queries Wikimedia Commons API, fetches top image URLs,
    and runs rembg to save transparent PNGs.
    """
    os.makedirs(target_folder, exist_ok=True)
    print(f"\n==========================================")
    print(f"[+] Searching Wikimedia for: '{search_term}'")
    print(f"[+] Destination: {target_folder}")

    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {search_term}",
        "gsrlimit": max_items * 3,  # fetch a few extras in case some are invalid
        "prop": "imageinfo",
        "iiprop": "url|mime"
    }

    try:
        res = requests.get(api_url, headers=HEADERS, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        print(f"[-] API request failed: {e}")
        return

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        print("[-] No images found for this query.")
        return

    saved_count = 0
    for page_id, page_info in pages.items():
        if saved_count >= max_items:
            break

        image_info = page_info.get("imageinfo", [])
        if not image_info:
            continue

        img_url = image_info[0].get("url")
        mime = image_info[0].get("mime", "")

        # Skip SVGs, PDFs, or unrenderable files
        if not img_url or "image" not in mime or img_url.endswith(".svg"):
            continue

        try:
            print(f"  -> Downloading: {img_url.split('/')[-1][:35]}...")
            img_res = requests.get(img_url, headers=HEADERS, timeout=15)
            img_res.raise_for_status()

            # Ignore tiny thumbnails
            if len(img_res.content) < 15000:
                continue

            print(f"  -> Removing background (rembg)...")
            transparent_png = remove_background(img_res.content)

            filename = f"item_{saved_count + 1}.png"
            dest_path = os.path.join(target_folder, filename)

            with open(dest_path, "wb") as f:
                f.write(transparent_png)

            print(f"  [✓] Saved: {dest_path}")
            saved_count += 1

        except Exception as err:
            print(f"  [-] Skipped item: {err}")
            continue

    print(f"[Done] Stored {saved_count} assets in '{target_folder}'.")

if __name__ == "__main__":
    # Categories mapped directly to your Tryit directories
    targets = [
        {
            "query": "plain t-shirt white background",
            "folder": os.path.join("assets", "clothes", "male", "tshirt"),
            "max": 2
        },
        {
            "query": "Indian Kurta dress",
            "folder": os.path.join("assets", "clothes", "female", "kurta"),
            "max": 2
        },
        {
            "query": "Saree garment folded",
            "folder": os.path.join("assets", "clothes", "female", "saree"),
            "max": 2
        }
    ]

    for item in targets:
        fetch_and_cutout(item["query"], item["folder"], item["max"])