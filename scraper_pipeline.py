import os
import io
import requests
from bs4 import BeautifulSoup
from PIL import Image
from rembg import remove
from playwright.sync_api import sync_playwright

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

def remove_background(image_bytes: bytes) -> bytes:
    """Takes image bytes, strips background using U2-Net, returns PNG bytes."""
    input_image = Image.open(io.BytesIO(image_bytes))
    output_image = remove(input_image)
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format="PNG")
    return output_buffer.getvalue()

def extract_best_url(img_tag) -> str:
    """Extracts the highest-quality URL from src or srcset."""
    srcset = img_tag.get("srcset")
    if srcset:
        # Split srcset entries and pick the largest candidate
        candidates = [entry.strip().split(" ")[0] for entry in srcset.split(",") if entry.strip()]
        if candidates:
            return candidates[-1]
    return img_tag.get("src") or ""

def scrape_and_process(page_url: str, target_folder: str, max_images: int = 2):
    os.makedirs(target_folder, exist_ok=True)
    print(f"\n==========================================")
    print(f"[+] Scraping: {page_url}")
    print(f"[+] Destination: {target_folder}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Unsplash can take a moment to settle; use domcontentloaded + brief delay
        page.goto(page_url, wait_until="domcontentloaded", timeout=45000)
        page.evaluate("window.scrollBy(0, 1200)")
        page.wait_for_timeout(3000)
        
        html_content = page.content()
        browser.close()

    soup = BeautifulSoup(html_content, "html.parser")
    # Filter directly for photo CDN tags while ignoring profile avatars
    all_imgs = soup.find_all("img")
    valid_imgs = [
        img for img in all_imgs 
        if "images.unsplash.com/photo-" in (img.get("src", "") + img.get("srcset", ""))
    ]

    print(f"[*] Found {len(valid_imgs)} matching product/model photos.")

    saved_count = 0
    for idx, img in enumerate(valid_imgs):
        if saved_count >= max_images:
            break

        img_url = extract_best_url(img)
        if not img_url:
            continue

        try:
            print(f"  -> Downloading item {saved_count + 1}...")
            res = requests.get(img_url, headers=HEADERS, timeout=15)
            res.raise_for_status()

            if len(res.content) < 15000:
                continue

            print(f"  -> Removing background (rembg)...")
            clean_png_bytes = remove_background(res.content)

            filename = f"item_{saved_count + 1}.png"
            filepath = os.path.join(target_folder, filename)

            with open(filepath, "wb") as f:
                f.write(clean_png_bytes)

            print(f"  [✓] Saved: {filepath}")
            saved_count += 1

        except Exception as e:
            print(f"  [-] Failed on image {idx + 1}: {e}")
            continue

    print(f"[Done] Stored {saved_count} assets in '{target_folder}'.")

if __name__ == "__main__":
    tasks = [
        {
            "url": "https://unsplash.com/s/photos/t-shirt-white-background",
            "folder": os.path.join("assets", "clothes", "male", "tshirt"),
            "max": 2
        },
        {
            "url": "https://unsplash.com/s/photos/kurta",
            "folder": os.path.join("assets", "clothes", "female", "kurta"),
            "max": 2
        }
    ]

    for task in tasks:
        scrape_and_process(
            page_url=task["url"],
            target_folder=task["folder"],
            max_images=task["max"]
        )