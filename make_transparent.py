from PIL import Image
import os

img_path = r"C:\Users\jenpr\.gemini\antigravity\brain\5fb60726-3703-482b-ad49-f2c884520ac0\media__1780242271729.png"
output_path = r"C:\Users\jenpr\.gemini\antigravity\scratch\rspg-botanical-garden\public\rspg-logo.png"

if os.path.exists(img_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # If it is close to white (RGB above 240), convert to transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print("Success: Transparent logo saved to", output_path)
else:
    print("Error: Input image not found")
