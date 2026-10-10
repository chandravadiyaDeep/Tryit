import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Set realistic browser headers so target sites don't reject your requests
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

def download_images_from_url(page_url, target_folder, max_images=10):
    """
    Scrapes image tags from page_url and saves them directly to target_folder.
    """
    os.makedirs(target_folder, exist_ok=True)
    
    print(f"\n[+] Fetching: {page_url}")
    try:
        response = requests.get(page_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"[-] Failed to load page: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    img_tags = soup.find_all("img")

    print(f"[*] Found {len(img_tags)} image tags. Starting download into '{target_folder}'...")

    saved_count = 0
    for idx, img in enumerate(img_tags):
        if saved_count >= max_images:
            break

        # Check standard src attributes as well as lazy-load attributes
        src = (
            img.get("src")
            or img.get("data-src")
            or img.get("data-original")
        )

        if not src:
            continue

        # Convert relative URLs (e.g. /images/pic.png) to full URLs
        img_url = urljoin(page_url, src)

        # Skip tiny tracking icons, SVGs, base64 strings, or data URIs
        if img_url.startswith("data:"):
            continue

        # Extract file extension or default to .png/.jpg
        parsed_path = urlparse(img_url).path
        ext = os.path.splitext(parsed_path)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".png"

        filename = f"item_{saved_count + 1}{ext}"
        filepath = os.path.join(target_folder, filename)

        try:
            img_res = requests.get(img_url, headers=HEADERS, timeout=10)
            img_res.raise_for_status()

            # Filter out tiny spacer/tracking images (under 5KB)
            if len(img_res.content) < 5000:
                continue

            with open(filepath, "wb") as f:
                f.write(img_res.content)

            print(f"    -> Saved: {filename}")
            saved_count += 1

        except Exception as err:
            # Skip failed image downloads silently or log them
            continue

    print(f"[✓] Finished: {saved_count} images downloaded to {target_folder}")


if __name__ == "__main__":
    # Define which webpage targets which folder in your Tryit repo:
    scrape_tasks = [
        {
            "url": "https://unsplash.com/s/photos/t-shirt-white-background",
            "folder": os.path.join("assets", "clothes", "male", "kurta"),
            "max": 8
        },
        {
            "url": "https://unsplash.com/s/photos/women-saree",
            "folder": os.path.join("assets", "clothes", "female", "saree"),
            "max": 8
        },
        {
            "url": "https://www.pexels.com/search/male%20fashion%20model%20standing",
            "folder": os.path.join("assets", "poses", "male"),
            "max": 5
        }
    ]

    for task in scrape_tasks:
        download_images_from_url(
            page_url=task["url"],
            target_folder=task["folder"],
            max_images=task["max"]
        )