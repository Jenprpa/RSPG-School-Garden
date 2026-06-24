import https from 'https';
import fs from 'fs';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const urls = {
  "06_nature_life.pdf": "https://www.rspg.or.th/botanical_school/pdf/06%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%98%E0%B8%A3%E0%B8%A3%E0%B8%A1%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B5%E0%B8%A7%E0%B8%B4%E0%B8%95.pdf",
  "07_interconnected.pdf": "https://www.rspg.or.th/botanical_school/pdf/07%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%AA%E0%B8%A3%E0%B8%A3%E0%B8%9E%E0%B8%AA%E0%B8%B4%E0%B8%87%E0%B8%A5%E0%B9%89%E0%B8%A7%E0%B8%99%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7.pdf",
  "08_benefit_humanity.pdf": "https://www.rspg.or.th/botanical_school/pdf/08%E0%B9%83%E0%B8%9A%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%82%E0%B8%A2%E0%B8%8A%E0%B8%99%E0%B9%8C%E0%B9%81%E0%B8%97%E0%B9%89%E0%B9%81%E0%B8%81%E0%B9%88%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%8A%E0%B8%99.pdf"
};

const assetsDir = path.resolve('./src/assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

Object.entries(urls).forEach(([filename, url]) => {
  const destPath = path.join(assetsDir, filename);
  console.log(`Downloading ${url} to ${destPath}...`);
  
  const file = fs.createWriteStream(destPath);
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${filename}: Status code ${response.statusCode}`);
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename} successfully!`);
    });
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error(`Error downloading ${filename}:`, err.message);
  });
});
