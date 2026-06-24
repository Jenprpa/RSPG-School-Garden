import React, { useEffect, useState, useRef } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, addDoc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BookOpen, FileText, Image, PenTool, Check, Upload, Save, Eraser, ClipboardList } from 'lucide-react';
import ElementRecordsSection from '../components/ElementRecordsSection';

export default function Element3({ userRole }) {
  const [subTab, setSubTab] = useState('records'); // 'records' or 'k7'
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  
  // Worksheet states
  const [stemDetail, setStemDetail] = useState('');
  const [leafDetail, setLeafDetail] = useState('');
  const [flowerDetail, setFlowerDetail] = useState('');
  const [fruitDetail, setFruitDetail] = useState('');
  const [seedDetail, setSeedDetail] = useState('');
  const [studyResults, setStudyResults] = useState('');
  const [drawingUrl, setDrawingUrl] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  // Sketchpad states
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const fetchPlants = async () => {
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

      if (list.length > 0) {
        setSelectedPlantId(list[0].id);
        fetchWorksheet(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorksheet = async (plantId) => {
    try {
      const q = query(collection(db, 'k7_worksheets'), where('plant_id', '==', plantId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setStemDetail(data.stem_detail || '');
        setLeafDetail(data.leaf_detail || '');
        setFlowerDetail(data.flower_detail || '');
        setFruitDetail(data.fruit_detail || '');
        setSeedDetail(data.seed_detail || '');
        setStudyResults(data.study_results || '');
        setDrawingUrl(data.botanical_drawing_url || '');
      } else {
        // Reset fields
        setStemDetail('');
        setLeafDetail('');
        setFlowerDetail('');
        setFruitDetail('');
        setSeedDetail('');
        setStudyResults('');
        setDrawingUrl('');
      }
      clearCanvas();
    } catch (err) {
      console.error('Error fetching worksheet:', err.message);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handlePlantChange = (e) => {
    const id = e.target.value;
    setSelectedPlantId(id);
    fetchWorksheet(id);
  };

  // Setup Sketchpad Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 400;
      canvas.height = 300;
      canvas.style.width = "100%";
      canvas.style.height = "300px";

      const context = canvas.getContext("2d");
      context.lineCap = "round";
      context.strokeStyle = "black";
      context.lineWidth = 3;
      contextRef.current = context;
    }
  }, [selectedPlantId]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveWorksheet = async (e) => {
    e.preventDefault();
    if (!selectedPlantId) return;

    setStatusText('กำลังบันทึกใบงานทะเบียน ก.7-003...');
    try {
      let finalDrawingUrl = drawingUrl;

      // Check if user drew something on the canvas
      // A simple check is checking if any pixels are colored or if canvas width > 0
      // We will export and upload it
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `sketch-${selectedPlantId}.png`, { type: "image/png" });
        
        const fileName = `sketches/sketch-${selectedPlantId}-${Date.now()}.png`;
        const storageRef = ref(storage, fileName);
        
        const snapshot = await uploadBytes(storageRef, file);
        finalDrawingUrl = await getDownloadURL(snapshot.ref);
        setDrawingUrl(finalDrawingUrl);
      }

      const worksheetData = {
        plant_id: selectedPlantId,
        stem_detail: stemDetail,
        leaf_detail: leafDetail,
        flower_detail: flowerDetail,
        fruit_detail: fruitDetail,
        seed_detail: seedDetail,
        study_results: studyResults,
        botanical_drawing_url: finalDrawingUrl,
        updated_at: new Date().toISOString()
      };

      const q = query(collection(db, 'k7_worksheets'), where('plant_id', '==', selectedPlantId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await setDoc(doc(db, 'k7_worksheets', docId), worksheetData, { merge: true });
      } else {
        await addDoc(collection(db, 'k7_worksheets'), worksheetData);
      }

      setStatusText('บันทึกทะเบียน ก.7-003 สำเร็จ!');
      setTimeout(() => setStatusText(''), 3000);
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleUploadSketch = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `drawings/${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      setDrawingUrl(downloadUrl);
      alert('อัปโหลดภาพวาดสำเร็จ! อย่าลืมกดบันทึกใบงาน');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดภาพวาด: ' + err.message);
    }
  };

  return (
    <div>
      {/* Intro Header */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          องค์ประกอบที่ 3: การศึกษาข้อมูลด้านต่าง ๆ (ใบงาน ก.7-003)
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          เน้นการบันทึกข้อมูลทางสัณฐานวิทยาของพืชอย่างละเอียดลงในใบงานวิชาการ <b>ทะเบียนพรรณไม้ (ก.7-003)</b> ประกอบด้วยข้อมูลวิเคราะห์ส่วนประกอบต่างๆ (ลำต้น, ใบ, ดอก, ผล, เมล็ด) ภาพวาดทางพฤกษศาสตร์ (สเก็ตช์ลายเส้น) ภาพถ่าย และวิเคราะห์ผลการศึกษาทดลอง
        </p>

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
          <button 
            type="button"
            onClick={() => setSubTab('records')} 
            className={`btn ${subTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <ClipboardList size={14} /> บันทึกกิจกรรมและหลักฐาน (6 ฟิลด์หลัก)
          </button>
          
          <button 
            type="button"
            onClick={() => setSubTab('k7')} 
            className={`btn ${subTab === 'k7' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <BookOpen size={14} /> บันทึกข้อมูลใบงาน ก.7-003
          </button>
        </div>
      </div>

      {subTab === 'records' ? (
        <ElementRecordsSection elementNum={3} userRole={userRole} />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลพรรณไม้...</div>
      ) : (
        <form onSubmit={handleSaveWorksheet}>
          <div className="card glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>เลือกพรรณไม้เพื่อเข้าศึกษาข้อมูล ก.7-003 :</span>
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <select 
                className="form-control"
                value={selectedPlantId}
                onChange={handlePlantChange}
                required
              >
                {plants.map(p => (
                  <option key={p.id} value={p.id}>{p.plant_code} - {p.thai_name}</option>
                ))}
              </select>
            </div>
            {statusText && (
              <span style={{
                color: 'var(--color-success)',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Check size={16} /> {statusText}
              </span>
            )}
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            {/* Left Hand: K.7-003 Forms */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} color="var(--color-primary)" />
                  รายละเอียดสัณฐานวิเคราะห์และวิทยศาสตร์พืช
                </span>
              </h3>

              <div className="form-group">
                <label className="form-label">1. ลักษณะวิเคราะห์ลำต้น (Stem Detail)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="เช่น ลำต้นตรง สีน้ำตาลอมเทา เปลือกมีปุ่มหนามรอบ..."
                  value={stemDetail}
                  onChange={(e) => setStemDetail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">2. ลักษณะวิเคราะห์ใบ (Leaf Detail)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="เช่น ใบเดี่ยว เรียงตรงข้ามสลับตั้งฉาก ใบรูปหัวใจ แผ่นใบสาก..."
                  value={leafDetail}
                  onChange={(e) => setLeafDetail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">3. ลักษณะวิเคราะห์ดอก (Flower Detail)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="เช่น ออกดอกช่อกระจุกสีขาว กลีบเลี้ยงรูปถ้วยสี orchid..."
                  value={flowerDetail}
                  onChange={(e) => setFlowerDetail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">4. ลักษณะวิเคราะห์ผล (Fruit Detail)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="เช่น ผลเมล็ดเปลือกแข็งแห้งไม่แตก ทรงกลมรีเมื่อแก่สีดำส้ม..."
                  value={fruitDetail}
                  onChange={(e) => setFruitDetail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">5. ลักษณะวิเคราะห์เมล็ด (Seed Detail)</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="เช่น เมล็ดกลมแบน ผิวนอกแข็งสีน้ำตาล มีเนื้อหุ้มเมล็ดบางๆ..."
                  value={seedDetail}
                  onChange={(e) => setSeedDetail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">สรุปผลการศึกษาวิจัยทางพฤกษศาสตร์</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  placeholder="สรุปผลลัพธ์การเรียนรู้และการพัฒนาโครงงานทางพฤกษศาสตร์..."
                  value={studyResults}
                  onChange={(e) => setStudyResults(e.target.value)}
                />
              </div>

              {userRole !== 'visitor' && (
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <Save size={16} /> บันทึกข้อมูลใบงาน ก.7-003
                </button>
              )}
            </div>

            {/* Right Hand: Botanical Sketches & Pad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card">
                <h3 className="card-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PenTool size={18} color="var(--color-orchid)" />
                    กระดานสเก็ตช์ภาพวาดพฤกษศาสตร์
                  </span>
                </h3>
                
                <div style={{
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <canvas 
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ cursor: 'crosshair', display: 'block' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" onClick={clearCanvas} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
                    <Eraser size={12} /> ล้างกระดาน
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image size={18} color="var(--color-primary)" />
                    รูปภาพวาดพฤกษศาสตร์
                  </span>
                </h3>
                
                {drawingUrl ? (
                  <div style={{ marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={drawingUrl} alt="ภาพวาดพฤกษศาสตร์" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ยังไม่ได้บันทึกหรืออัปโหลดภาพวาดลายเส้นพืช
                  </div>
                )}

                {userRole !== 'visitor' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleUploadSketch(e.target.files[0])}
                      id="sketch-file-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="sketch-file-upload" className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
                      <Upload size={14} /> อัปโหลดภาพสเก็ตช์แทนวาด
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
