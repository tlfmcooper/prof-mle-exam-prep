import os
from PIL import Image
import sys

def generate_assets(master_image_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        img = Image.open(master_image_path)
    except Exception as e:
        print(f"Error opening image: {e}")
        sys.exit(1)

    # Define sizes and filenames
    assets = [
        ("icon-512.png", (512, 512)),
        ("icon-192.png", (192, 192)),
        ("apple-touch-icon.png", (180, 180)),
        ("favicon-48.png", (48, 48)),
        ("favicon-32.png", (32, 32)),
        ("favicon-16.png", (16, 16)),
        ("logo.png", (512, 512)) # Using high-res png as logo
    ]

    # Maskable icons (usually need some padding, but for now we'll just resize)
    # Ideally maskable icons should have a safe zone. 
    # We will generate them same as others for now, assuming the logo is centered with margins as prompted.
    assets.extend([
        ("icon-maskable-512.png", (512, 512)),
        ("icon-maskable-192.png", (192, 192))
    ])

    print(f"Generating assets from {master_image_path}...")

    for filename, size in assets:
        try:
            # Resize with high quality resampling
            resized_img = img.resize(size, Image.Resampling.LANCZOS)
            output_path = os.path.join(output_dir, filename)
            resized_img.save(output_path, "PNG")
            print(f"Generated {filename} ({size[0]}x{size[1]})")
        except Exception as e:
            print(f"Error generating {filename}: {e}")

    print("Asset generation complete.")

if __name__ == "__main__":
    # Hardcoded paths based on the context
    # The generated image is in the artifacts directory. I need to copy it or reference it.
    # I will assume the script is run from the project root and the image is passed as arg or hardcoded if I move it.
    # For this run, I'll expect the master image path as the first argument.
    
    if len(sys.argv) < 2:
        print("Usage: python generate_assets.py <master_image_path>")
        sys.exit(1)

    master_path = sys.argv[1]
    # Output to public directory
    public_dir = os.path.join(os.getcwd(), "public")
    
    generate_assets(master_path, public_dir)
