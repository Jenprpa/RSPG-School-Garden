from PIL import Image, ImageDraw
import os
import math

input_path = r"C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\public\school-logo.jpg"
output_path = r"C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\public\school-logo.png"

if os.path.exists(input_path):
    print("Loading image...")
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # Create circular mask
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw a white circle slightly inside the boundaries to remove edges
    margin = 2
    draw.ellipse((margin, margin, width - margin, height - margin), fill=255)
    
    # Apply mask as alpha channel
    result = Image.new("RGBA", (width, height))
    result.paste(img, (0, 0), mask=mask)
    
    # Optional: also turn any black-ish pixels near the edge to transparent
    # (since the original logo might have a black circular outline with some white around it,
    # or the background is black and the logo itself is a circle)
    # Let's inspect the pixels to see if we need to remove black background
    datas = result.getdata()
    newData = []
    cx, cy = width / 2, height / 2
    r = min(width, height) / 2
    
    for x in range(width):
        for y in range(height):
            pixel = result.getpixel((x, y))
            # Calculate distance from center
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            
            # If distance is close to the boundary and pixel is black-ish, make it transparent
            if dist > (r - 6) and pixel[0] < 60 and pixel[1] < 60 and pixel[2] < 60:
                newData.append((0, 0, 0, 0))
            else:
                newData.append(pixel)
                
    # Re-apply newData to result
    final_img = Image.new("RGBA", (width, height))
    final_img.putdata(newData)
    
    final_img.save(output_path, "PNG")
    print("Saved transparent logo to", output_path)
else:
    print("Error: school-logo.jpg not found at", input_path)
