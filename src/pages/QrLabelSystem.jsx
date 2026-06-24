import React, { useState, useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Search, Check, ListChecks } from 'lucide-react';
import jsPDF from 'jspdf';

export default function QrLabelSystem({ selectedPlantFromProps }) {
  const [plants, setPlants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const printAreaRef = useRef();

  useEffect(() => {
    async function fetchPlants() {
      if (!isFirebaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'plants'), orderBy('plant_code'));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPlants(list);

        if (selectedPlantFromProps) {
          setSelectedPlants([selectedPlantFromProps.id]);
        } else if (list.length > 0) {
          setSelectedPlants([list[0].id]);
        }
      } catch (err) {
        console.error('Error fetching plants:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlants();
  }, [selectedPlantFromProps]);

  const toggleSelectPlant = (id) => {
    if (selectedPlants.includes(id)) {
      setSelectedPlants(selectedPlants.filter(pId => pId !== id));
    } else {
      setSelectedPlants([...selectedPlants, id]);
    }
  };

  const selectAll = () => {
    if (selectedPlants.length === plants.length) {
      setSelectedPlants([]);
    } else {
      setSelectedPlants(plants.map(p => p.id));
    }
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>พิมพ์ป้ายชื่อพรรณไม้ อพ.สธ.</title>');
    printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap" rel="stylesheet">');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: 'Prompt', sans-serif; padding: 20px; background-color: white; color: black; }
      .label-page { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; page-break-after: always; }
      .label-card { border: 3px double #2E7D32; border-radius: 8px; padding: 15px; display: flex; align-items: center; justify-content: space-between; background-color: #fff; width: 360px; height: 180px; box-sizing: border-box; }
      .label-info { flex: 1; padding-right: 10px; }
      .label-title { font-size: 14px; font-weight: bold; color: #2E7D32; margin-bottom: 2px; }
      .label-code { font-size: 10px; color: #555; font-weight: 600; margin-bottom: 6px; }
      .label-text { font-size: 9px; line-height: 1.3; margin-bottom: 3px; color: #111; }
      .label-qr { width: 85px; height: 85px; display: flex; justify-content: center; align-items: center; border: 1px solid #ddd; padding: 3px; border-radius: 4px; }
      @media print {
        body { padding: 0; }
        .label-page { gap: 15px; }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const activePlants = plants.filter(p => selectedPlants.includes(p.id));
    if (activePlants.length === 0) return;

    doc.setFont("Helvetica");
    
    activePlants.forEach((plant, index) => {
      if (index > 0 && index % 4 === 0) {
        doc.addPage();
      }

      const row = Math.floor((index % 4) / 2);
      const col = index % 2;

      const startX = 10 + col * 95;
      const startY = 15 + row * 60;

      doc.setDrawColor(46, 125, 50);
      doc.setLineWidth(1);
      doc.rect(startX, startY, 90, 50);

      doc.setFontSize(12);
      doc.setTextColor(46, 125, 50);
      doc.text(plant.thai_name, startX + 5, startY + 8);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Code: ${plant.plant_code}`, startX + 5, startY + 14);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.text(`Sci: ${plant.scientific_name || '-'}`, startX + 5, startY + 22, { maxWidth: 50 });
      doc.text(`Family: ${plant.family_name || '-'}`, startX + 5, startY + 30);
      doc.text(`Loc: ${plant.planting_location || '-'}`, startX + 5, startY + 36);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(startX + 65, startY + 12, 20, 20);
      doc.setFontSize(6);
      doc.text("SCAN QR", startX + 69, startY + 36);
      doc.text("FOR DETAIL", startX + 68, startY + 39);
    });

    doc.save('RSPG_Plant_Labels.pdf');
  };

  const filteredPlants = plants.filter(p => 
    p.thai_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.scientific_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.plant_code.includes(searchQuery)
  );

  return (
    <div>
      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Side: Plant Checklist Selector */}
        <div className="card">
          <h3 className="card-title">เลือกพรรณไม้สำหรับพิมพ์ป้าย</h3>
          
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="ค้นหาพืช..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.85rem', paddingLeft: '2.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button onClick={selectAll} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <ListChecks size={14} /> เลือกทั้งหมด
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              เลือกแล้ว {selectedPlants.length} ต้น
            </span>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredPlants.map(p => (
              <div 
                key={p.id}
                onClick={() => toggleSelectPlant(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: selectedPlants.includes(p.id) ? 'rgba(46, 125, 50, 0.05)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedPlants.includes(p.id) ? 'var(--color-primary)' : 'transparent'
                }}>
                  {selectedPlants.includes(p.id) && <Check size={10} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.thai_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.plant_code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Print Layout Template Preview */}
        <div>
          <div className="card glass-panel" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>พรีวิวป้ายชื่อรูปแบบมาตรฐาน อพ.สธ.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleDownloadPDF} disabled={selectedPlants.length === 0} className="btn btn-secondary">
                <Download size={16} /> ดาวน์โหลด PDF (A4)
              </button>
              <button onClick={handlePrint} disabled={selectedPlants.length === 0} className="btn btn-primary">
                <Printer size={16} /> สั่งพิมพ์ป้ายชื่อ (Print)
              </button>
            </div>
          </div>

          {/* Printable Labels Canvas */}
          <div 
            ref={printAreaRef}
            style={{
              padding: '1.5rem',
              backgroundColor: '#f9f9f9',
              border: '1px dashed #ccc',
              borderRadius: '12px',
              maxHeight: '520px',
              overflowY: 'auto'
            }}
          >
            <div className="label-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
              {plants.filter(p => selectedPlants.includes(p.id)).map(plant => {
                const qrUrl = `${window.location.origin}/?plantId=${plant.id}`;
                return (
                  <div 
                    key={plant.id} 
                    className="label-card"
                    style={{
                      border: '3px double var(--color-primary)',
                      borderRadius: '8px',
                      padding: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      height: '170px',
                      color: '#000'
                    }}
                  >
                    <div className="label-info" style={{ flex: 1, paddingRight: '12px' }}>
                      <h4 className="label-title" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0, padding: 0 }}>
                        {plant.thai_name}
                      </h4>
                      <p className="label-code" style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600, margin: '2px 0 6px 0' }}>
                        รหัสพืช: {plant.plant_code}
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#333' }}>
                        <div><b>ชื่อวิทยาศาสตร์:</b> <span style={{ fontStyle: 'italic' }}>{plant.scientific_name || '-'}</span></div>
                        <div><b>วงศ์:</b> {plant.family_name || '-'}</div>
                        <div><b>สถานที่ปลูก:</b> {plant.planting_location || '-'}</div>
                        <div><b>ประโยชน์:</b> {plant.description ? plant.description.substring(0, 30) + '...' : 'เพื่อการศึกษาพฤกษศาสตร์'}</div>
                      </div>
                    </div>

                    <div 
                      className="label-qr"
                      style={{
                        border: '1px solid #eaeaea',
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <QRCodeSVG value={qrUrl} size={70} />
                      <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>สแกนข้อมูล</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedPlants.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                ไม่มีพรรณไม้ถูกเลือก กรุณาเลือกจากแถบเมนูด้านซ้าย
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
