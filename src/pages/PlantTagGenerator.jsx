import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Printer, CheckSquare, Square, Search, Eye, Settings } from 'lucide-react';

export default function PlantTagGenerator() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  
  // Customization Options
  const [tagSize, setTagSize] = useState('medium'); // small | medium | large
  const [borderStyle, setBorderStyle] = useState('purple'); // purple | green | black
  const [showQrCode, setShowQrCode] = useState(true);

  const schoolCode = '7-30210-002';
  const schoolName = 'โรงเรียนปายวิทยาคาร';

  const fetchPlants = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'plants'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort alphabetically by plant code
      list.sort((a, b) => (a.plant_code || '').localeCompare(b.plant_code || ''));
      setPlants(list);
    } catch (err) {
      console.error('Error fetching plants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleSelectToggle = (id) => {
    setSelectedPlantIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedPlantIds(filteredPlants.map(p => p.id));
  };

  const handleClearSelection = () => {
    setSelectedPlantIds([]);
  };

  const handlePrint = () => {
    if (selectedPlantIds.length === 0) {
      alert('กรุณาเลือกพรรณไม้อย่างน้อย 1 ต้นเพื่อพิมพ์ป้ายชื่อ');
      return;
    }
    window.print();
  };

  const filteredPlants = plants.filter(p => 
    (p.thai_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.plant_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.scientific_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getBorderSize = () => {
    switch (tagSize) {
      case 'small': return { width: '8.5cm', height: '5.4cm', padding: '0.4cm', titleSize: '0.9rem', descSize: '0.62rem', codeSize: '0.55rem' };
      case 'large': return { width: '18cm', height: '12cm', padding: '1cm', titleSize: '1.8rem', descSize: '1rem', codeSize: '0.9rem' };
      case 'medium':
      default:
        return { width: '13cm', height: '9cm', padding: '0.6cm', titleSize: '1.35rem', descSize: '0.82rem', codeSize: '0.75rem' };
    }
  };

  const getBorderColor = () => {
    switch (borderStyle) {
      case 'green': return '#2E7D32';
      case 'black': return '#1a1a1a';
      case 'purple':
      default:
        return '#B15BE3'; // Primary brand color / Royal lavender purple
    }
  };

  const dimensions = getBorderSize();
  const borderColor = getBorderColor();

  const selectedPlantsList = plants.filter(p => selectedPlantIds.includes(p.id));

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลทะเบียนพรรณไม้...</div>;

  return (
    <div className="tag-generator-container">
      {/* Hide controls when printing */}
      <style>{`
        @media print {
          body {
            background: #white !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .layout-container, .sidebar, .navbar, .tag-generator-controls, .mobile-only-header, .sidebar-menu, .sidebar-footer {
            display: none !important;
          }
          .tag-generator-container {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .print-area {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .plant-tag-item {
            box-shadow: none !important;
            border: 2px solid ${borderColor} !important;
            page-break-inside: avoid !important;
            background-color: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Screen layout */}
      <div className="tag-generator-controls">
        <div className="card glass-panel" style={{ marginBottom: '2rem', border: '1px solid rgba(177, 91, 227, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                ระบบออกแบบและสั่งพิมพ์ป้ายพรรณไม้มาตรฐาน อพ.สธ. 🏷️
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                เลือกพืช ดึงข้อมูล และสั่งจัดหน้ากระดาษเพื่อจัดทำป้ายรหัสพิกัดประจำต้นไม้แบบมาตรฐาน อพ.สธ.
              </p>
            </div>
          </div>
        </div>

        <div className="grid-3" style={{ gridTemplateColumns: '1.1fr 1.9fr', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* Options & Plant Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Design Customizations Card */}
            <div className="card">
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Settings size={16} /> 1. ตั้งค่ารูปแบบป้ายพรรณไม้
              </h4>

              {/* Tag Size Select */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>ขนาดของป้ายปัก/ห้อย</label>
                <select 
                  value={tagSize} 
                  onChange={(e) => setTagSize(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
                >
                  <option value="small">ขนาดเล็ก (ห้อยกิ่ง / ติดลำต้น: 8.5 x 5.4 cm)</option>
                  <option value="medium">ขนาดกลาง (มาตรฐานปักดิน: 13 x 9 cm)</option>
                  <option value="large">ขนาดใหญ่ (แสดงนิทรรศการ: 18 x 12 cm)</option>
                </select>
              </div>

              {/* Border Color Style */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>สีและกรอบป้ายชื่อ</label>
                <select 
                  value={borderStyle} 
                  onChange={(e) => setBorderStyle(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
                >
                  <option value="purple">สีม่วง อพ.สธ. (Royal Lavender)</option>
                  <option value="green">สีเขียวพฤกษศาสตร์ (Botanical Green)</option>
                  <option value="black">สีดำคลาสสิก (Classic Black)</option>
                </select>
              </div>

              {/* Toggle QR code */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <input 
                  type="checkbox" 
                  id="show_qr"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="show_qr" style={{ fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>
                  แสดง QR Code ข้อมูลพืชบนตัวป้าย
                </label>
              </div>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                disabled={selectedPlantIds.length === 0}
              >
                <Printer size={16} /> สั่งพิมพ์ป้ายพรรณไม้ ({selectedPlantIds.length})
              </button>
            </div>

            {/* Plant Selector List Card */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                2. เลือกต้นไม้ในทะเบียนที่ต้องการ
              </h4>

              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '1rem' }}>
                <Search size={14} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อพืช หรือรหัส..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                />
              </div>

              {/* Selection Helpers */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', fontSize: '0.75rem' }}>
                <button onClick={handleSelectAll} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>เลือกทั้งหมด</button>
                <button onClick={handleClearSelection} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>ล้างการเลือก</button>
              </div>

              {/* Plant items scrollable list */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                {filteredPlants.map(plant => {
                  const isChecked = selectedPlantIds.includes(plant.id);
                  return (
                    <div 
                      key={plant.id} 
                      onClick={() => handleSelectToggle(plant.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isChecked ? 'rgba(186,85,211,0.06)' : 'var(--bg-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {isChecked ? (
                          <CheckSquare size={16} color="var(--color-primary)" />
                        ) : (
                          <Square size={16} color="var(--text-muted)" />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {plant.thai_name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            รหัส: {plant.plant_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredPlants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ไม่พบพืชที่กรอง
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Real-time Preview */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} /> ตัวอย่างขนาดจริงและดีไซน์ป้ายพรรณไม้ (Real-time Preview)
              </h4>

              {selectedPlantsList.length === 0 ? (
                <div style={{ flex: 1, border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', padding: '3rem', textAlign: 'center' }}>
                  กรุณาเลือกพรรณไม้ทางด้านซ้ายอย่างน้อยหนึ่งต้นเพื่อดูตัวอย่างป้ายรหัสประจำต้นที่จะจัดพิมพ์
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', overflowY: 'auto', maxHeight: '420px', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  {selectedPlantsList.map(plant => (
                    <div 
                      key={plant.id}
                      className="plant-tag-item"
                      style={{
                        width: dimensions.width,
                        height: dimensions.height,
                        padding: dimensions.padding,
                        border: `3px solid ${borderColor}`,
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        color: '#000',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        position: 'relative',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Inner border line */}
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        right: '4px',
                        bottom: '4px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '6px',
                        pointerEvents: 'none'
                      }}></div>

                      {/* Header block */}
                      <div style={{ borderBottom: `2px solid ${borderColor}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                        <div>
                          <span style={{ fontSize: dimensions.codeSize, fontWeight: 'bold', color: borderColor, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {schoolName} ({schoolCode})
                          </span>
                          <span style={{ fontSize: '0.52rem', color: '#555', display: 'block', fontWeight: 600 }}>
                            โครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ (อพ.สธ.)
                          </span>
                        </div>
                        <span style={{ fontSize: dimensions.codeSize, fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          รหัส: {plant.plant_code}
                        </span>
                      </div>

                      {/* Body block */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', gap: '10px', zIndex: 2 }}>
                        
                        {/* Text fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <div>
                            <span style={{ fontSize: '0.62rem', color: '#555', display: 'block' }}>ชื่อไทย / Local Name:</span>
                            <span style={{ fontSize: dimensions.titleSize, fontWeight: 800, color: borderColor, display: 'block', lineHeight: 1.1 }}>
                              {plant.thai_name || 'ไม่ระบุ'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.55rem', color: '#555', display: 'block' }}>ชื่อวิทยาศาสตร์ / Scientific Name:</span>
                            <span style={{ fontSize: dimensions.descSize, fontStyle: 'italic', fontWeight: '600', color: '#222', display: 'block', lineHeight: 1.1 }}>
                              {plant.scientific_name || 'ไม่ระบุ'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.55rem', color: '#555', display: 'block' }}>วงศ์ / Family Name:</span>
                            <span style={{ fontSize: dimensions.descSize, fontWeight: 'bold', color: '#333', display: 'block' }}>
                              {plant.family_name || 'ไม่ระบุ'}
                            </span>
                          </div>
                        </div>

                        {/* QR Code */}
                        {showQrCode && (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: '#fff', 
                            padding: '6px', 
                            border: '1px solid #ddd', 
                            borderRadius: '6px'
                          }}>
                            <QRCodeSVG 
                              value={`https://rspg-school-garden.web.app/plant-info?code=${plant.plant_code}`} 
                              size={dimensions.width === '8.5cm' ? 42 : dimensions.width === '18cm' ? 100 : 70}
                              level={"M"}
                              includeMargin={false}
                            />
                            <span style={{ fontSize: '0.42rem', color: '#666', marginTop: '4px', fontWeight: 600 }}>SCAN DATA</span>
                          </div>
                        )}
                      </div>

                      {/* Footer block */}
                      <div style={{ borderTop: `1px solid #eee`, paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: '#666', zIndex: 2 }}>
                        <span>วิสัย: {plant.habit || plant.plant_type || 'ไม้ต้น'}</span>
                        <span>จุดพิกัดในผัง: {plant.planting_location || 'บริเวณโรงเรียน'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Hidden print layout container rendered only for printing */}
      <div className="print-area" style={{ display: 'none' }}>
        {selectedPlantsList.map(plant => (
          <div 
            key={plant.id}
            className="plant-tag-item"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              padding: dimensions.padding,
              border: `2px solid ${borderColor}`,
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#000',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              right: '4px',
              bottom: '4px',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              pointerEvents: 'none'
            }}></div>

            <div style={{ borderBottom: `2px solid ${borderColor}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: dimensions.codeSize, fontWeight: 'bold', color: borderColor, display: 'block', textTransform: 'uppercase' }}>
                  {schoolName} ({schoolCode})
                </span>
                <span style={{ fontSize: '0.5rem', color: '#555', display: 'block' }}>
                  โครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ (อพ.สธ.)
                </span>
              </div>
              <span style={{ fontSize: dimensions.codeSize, fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                รหัส: {plant.plant_code}
              </span>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <div>
                  <span style={{ fontSize: '0.55rem', color: '#555', display: 'block' }}>ชื่อไทย:</span>
                  <span style={{ fontSize: dimensions.titleSize, fontWeight: 800, color: borderColor, display: 'block', lineHeight: 1.1 }}>
                    {plant.thai_name || 'ไม่ระบุ'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', color: '#555', display: 'block' }}>ชื่อวิทยาศาสตร์:</span>
                  <span style={{ fontSize: dimensions.descSize, fontStyle: 'italic', fontWeight: '600', color: '#111', display: 'block', lineHeight: 1.1 }}>
                    {plant.scientific_name || 'ไม่ระบุ'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.5rem', color: '#555', display: 'block' }}>วงศ์:</span>
                  <span style={{ fontSize: dimensions.descSize, fontWeight: 'bold', color: '#222', display: 'block' }}>
                    {plant.family_name || 'ไม่ระบุ'}
                  </span>
                </div>
              </div>

              {showQrCode && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#fff', 
                  padding: '5px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px'
                }}>
                  <QRCodeSVG 
                    value={`https://rspg-school-garden.web.app/plant-info?code=${plant.plant_code}`} 
                    size={dimensions.width === '8.5cm' ? 45 : dimensions.width === '18cm' ? 100 : 75}
                    level={"M"}
                    includeMargin={false}
                  />
                  <span style={{ fontSize: '0.4rem', color: '#666', marginTop: '2px', fontWeight: 600 }}>SCAN DATA</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid #ddd`, paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.48rem', color: '#555' }}>
              <span>วิสัย: {plant.habit || plant.plant_type || 'ไม้ต้น'}</span>
              <span>ตำแหน่ง: {plant.planting_location || 'บริเวณโรงเรียน'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
