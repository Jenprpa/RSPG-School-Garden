import urllib.request
import ssl

ssl_context = ssl._create_unverified_context()

urls = {
    "06_nature_life.pdf": "https://www.rspg.or.th/botanical_school/pdf/06%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%98%E0%B8%A3%E0%B8%A3%E0%B8%A1%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B5%E0%B8%A7%E0%B8%B4%E0%B8%95.pdf",
    "07_interconnected.pdf": "https://www.rspg.or.th/botanical_school/pdf/07%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%AA%E0%B8%A3%E0%B8%A3%E0%B8%9E%E0%B8%AA%E0%B8%B4%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%A7%E0%B8%99%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7.pdf",
    "08_benefit_humanity.pdf": "https://www.rspg.or.th/botanical_school/pdf/08%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%82%E0%B8%A2%E0%B8%8A%E0%B8%99%E0%B9%8C%E0%B9%81%E0%B8%97%E0%B9%89%E0%B9%81%E0%B8%81%E0%B9%88%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%8A%E0%B8%99.pdf"
}

for name, url in urls.items():
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, context=ssl_context) as response:
            with open(f"./src/assets/{name}", "wb") as f:
                f.write(response.read())
        print(f"Successfully downloaded {name}")
    except Exception as e:
        print(f"Error downloading {name}: {e}")
