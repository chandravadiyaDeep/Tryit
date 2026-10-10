import os
import io
import requests
from PIL import Image
from rembg import remove

def remove_background(image_bytes: bytes) -> bytes:
    """Uses rembg (U2-Net) to extract the garment with an alpha channel."""
    input_image = Image.open(io.BytesIO(image_bytes))
    output_image = remove(input_image)
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format="PNG")
    return output_buffer.getvalue()

def download_and_process(image_url: str, dest_folder: str, filename: str):
    os.makedirs(dest_folder, exist_ok=True)
    out_path = os.path.join(dest_folder, filename)
    print(f"[+] Fetching: {image_url}")
    
    try:
        res = requests.get(image_url, timeout=15)
        res.raise_for_status()
        
        print(f"    -> Removing background with rembg...")
        clean_png = remove_background(res.content)
        
        with open(out_path, "wb") as f:
            f.write(clean_png)
        print(f"    [✓] Saved transparent asset: {out_path}")
    except Exception as e:
        print(f"    [-] Failed to process {filename}: {e}")

if __name__ == "__main__":
    print("==========================================")
    print("Populating Tryit Apparel Assets...")
    print("==========================================")

    # 1. Fetch real Men's and Women's clothing from FakeStore developer catalog
    try:
        # Men's apparel
        men_res = requests.get("https://fakestoreapi.com/products/category/men's clothing", timeout=15)
        men_products = men_res.json()
        
        # Save Men's shirts/tshirts
        tshirt_dir = os.path.join("assets", "clothes", "male", "tshirt")
        for i, prod in enumerate(men_products[:2]):
            download_and_process(prod["image"], tshirt_dir, f"item_{i+1}.png")

        # Save Men's shirts
        shirt_dir = os.path.join("assets", "clothes", "male", "shirt")
        for i, prod in enumerate(men_products[2:4]):
            download_and_process(prod["image"], shirt_dir, f"item_{i+1}.png")

        # Women's apparel
        women_res = requests.get("https://fakestoreapi.com/products/category/women's clothing", timeout=15)
        women_products = women_res.json()

        # Save Women's tops/tshirts
        women_top_dir = os.path.join("assets", "clothes", "female", "tshirt")
        for i, prod in enumerate(women_products[:2]):
            download_and_process(prod["image"], women_top_dir, f"item_{i+1}.png")

    except Exception as err:
        print(f"[-] API catalog query error: {err}")

    # 2. Add high-quality curated sample ethnic wear directly to kurta folders
    # (Direct static images that do not trigger 429 rate limits)
    curated_items = [
        {
            "url": "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=600",
            "dir": os.path.join("assets", "clothes", "male", "kurta"),
            "name": "item_1.png"
        },
        {
            "url": "https://images.pexels.com/photos/991509/pexels-photo-991509.jpeg?auto=compress&cs=tinysrgb&w=600",
            "dir": os.path.join("assets", "clothes", "female", "kurta"),
            "name": "item_1.png"
        }
    ]

    for item in curated_items:
        download_and_process(item["url"], item["dir"], item["name"])

    print("\n[Done] Pipeline complete. Check assets/clothes for PNG files.")