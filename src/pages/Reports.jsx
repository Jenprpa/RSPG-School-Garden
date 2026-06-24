import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { Award, Printer, Download, FileText, CheckCircle, FileSpreadsheet, File } from 'lucide-react';

export default function Reports({ userRole }) {
  const [selectedReportType, setSelectedReportType] = useState('registry'); // registry, k7003, annual, study, subjects, local, checklist, portfolio, readiness
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [plantsList, setPlantsList] = useState([]);
  const [k7List, setK7List] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  const [learningActivities, setLearningActivities] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [mappingsList, setMappingsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleSignReport = async () => {
    if (userRole !== 'executive' && userRole !== 'admin') {
      alert('เฉพาะบทบาทผู้บริหารหรือผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ลงนามอนุมัติ');
      return;
    }
    if (window.confirm('คุณแน่ใจว่าต้องการลงนามอนุมัติรายงานสรุปการดำเนินงานนี้ดิจิทัล?')) {
      try {
        const updated = {
          ...schoolInfo,
          report_is_signed: true,
          signed_date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        };
        await setDoc(doc(db, 'rspg_school_info', 'pai_wittyakarn'), updated);
        setSchoolInfo(updated);
        alert('ลงนามอนุมัติออนไลน์เสร็จสิ้นเรียบร้อยแล้ว!');
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการบันทึกการลงนาม: ' + err.message);
      }
    }
  };

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch school info
      const infoSnap = await getDoc(doc(db, 'rspg_school_info', 'pai_wittyakarn'));
      if (infoSnap.exists()) {
        setSchoolInfo(infoSnap.data());
      }

      // 2. Fetch plants
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const pData = [];
      plantsSnap.forEach(d => pData.push({ id: d.id, ...d.data() }));
      setPlantsList(pData);

      // 3. Fetch K7
      const k7Snap = await getDocs(collection(db, 'k7_worksheets'));
      const kData = [];
      k7Snap.forEach(d => kData.push({ id: d.id, ...d.data() }));
      setK7List(kData);

      // 4. Fetch evaluation criteria
      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const cData = [];
      critSnap.forEach(d => cData.push({ id: d.id, ...d.data() }));
      cData.sort((a, b) => a.criteria_id.localeCompare(b.criteria_id, undefined, { numeric: true }));
      setCriteriaList(cData);

      // 5. Fetch teacher learning activities
      const learnSnap = await getDocs(collection(db, 'rspg_learning_activities'));
      const lData = [];
      learnSnap.forEach(d => lData.push({ id: d.id, ...d.data() }));
      setLearningActivities(lData);

      // 6. Fetch portfolio
      const portSnap = await getDocs(collection(db, 'rspg_portfolio'));
      const portData = [];
      portSnap.forEach(d => portData.push({ id: d.id, ...d.data() }));
      setPortfolioData(portData.length ? portData : [
        { id: '1', order: 1, name: 'นร.หญิง กานดา สุวรรณ', level: 'แกนนำ ม.3', type: 'นักเรียน', training_rspg: 'เข้าอบรมปี 2568', audit_accuracy: 'ผ่าน (ถูกต้อง)', score_1: 20, score_2: 30, score_3: 30, report_status: 'ส่งเล่มแล้ว', media_status: 'มีสไลด์' },
        { id: '2', order: 2, name: 'นร.ชาย ธวัชชัย มีสุข', level: 'แกนนำ ม.3', type: 'นักเรียน', training_rspg: 'เข้าอบรมปี 2569', audit_accuracy: 'ผ่าน (ถูกต้อง)', score_1: 20, score_2: 25, score_3: 30, report_status: 'ส่งเล่มแล้ว', media_status: 'มีสไลด์' },
        { id: '3', order: 3, name: 'ครูสมเจตน์ สังข์ทอง', level: 'ครูผู้ประสานงาน', type: 'ครู', training_rspg: 'เข้าอบรมครูระดับประเทศ', audit_accuracy: 'ผ่าน (ถูกต้อง)', score_1: 20, score_2: 30, score_3: 30, report_status: 'ส่งเล่มแล้ว', media_status: 'มีวิดีโอแนะนำ' }
      ]);

      // 7. Fetch plant changes
      const incSnap = await getDocs(collection(db, 'rspg_plant_changes'));
      const incData = [];
      incSnap.forEach(d => incData.push({ id: d.id, ...d.data() }));
      setIncidents(incData);

      // 8. Fetch evidence mapping
      const mapSnap = await getDocs(collection(db, 'evidence_mapping'));
      const mapList = [];
      mapSnap.forEach(d => mapList.push({ id: d.id, ...d.data() }));
      setMappingsList(mapList);

    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Client-side HTML wrapper for Excel (.xls)
  const handleExportExcel = (tableId, filename) => {
    const table = document.getElementById(tableId);
    if (!table) {
      alert('ไม่พบข้อมูลตารางรายงานสำหรับการส่งออก');
      return;
    }
    const html = table.outerHTML;
    const blob = new Blob(["\uFEFF" + html], {
      type: 'application/vnd.ms-excel;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side HTML wrapper for MS Word (.doc)
  const handleExportWord = (containerId, filename) => {
    const element = document.getElementById(containerId);
    if (!element) {
      alert('ไม่พบเนื้อหารายงานสำหรับการส่งออก');
      return;
    }
    const htmlContent = element.innerHTML;
    const documentTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          body { font-family: 'Prompt', 'TH Sarabun PSK', sans-serif; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #aaa; padding: 8px; font-size: 11pt; }
          th { backgroundColor: #f2f2f2; }
          h2, h3, h4 { text-align: center; color: #4a148c; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF" + documentTemplate], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังจัดรูปแบบเอกสารนำเสนอ...</div>;

  const totalMaxScore = criteriaList.reduce((sum, c) => sum + (c.max_score || 0), 0);
  const totalSelfScore = criteriaList.reduce((sum, c) => sum + (c.self_score || 0), 0);

  // Audit calculations for readiness report
  const critMissingEvidence = criteriaList.filter(c => !mappingsList.some(m => m.criteria_id === c.criteria_id));
  const critMissingOwner = criteriaList.filter(c => !c.responsible_person || c.responsible_person === '-');
  const critMissingSelfScore = criteriaList.filter(c => c.self_score === undefined || c.self_score === 0);
  const plantsMissingLabel = plantsList.filter(p => p.is_tagged === 'ไม่มี');
  const plantsMissingGps = plantsList.filter(p => !p.gps_lat || !p.gps_lng);
  const plantsMissingDesc = plantsList.filter(p => !p.description || p.description.length < 10);
  const plantsMissingK7 = plantsList.filter(p => !k7List.some(s => s.plant_id === p.id));
  const k7MissingPhotos = k7List.filter(s => !s.habit_photo_url || !s.stem_photo_url || !s.leaf_photo_url || !s.flower_photo_url || !s.fruit_photo_url || !s.seed_photo_url);
  const k7Unapproved = k7List.filter(s => s.status !== 'ผ่าน');

  // Define Report Titles
  const reportTitles = {
    registry: 'รายงานทะเบียนพรรณไม้โรงเรียน',
    k7003: 'รายงานข้อมูลสัณฐานพฤกษศาสตร์ ก.7-003 รายต้น',
    annual: 'รายงานผลดำเนินงานสวนพฤกษศาสตร์โรงเรียนรอบปี',
    study: 'รายงานวิจัยและวิเคราะห์พืชศึกษา',
    subjects: 'รายงานแผนการจัดเรียนรู้ 3 กลุ่มสาระการเรียนรู้',
    local: 'รายงานวิจัยฐานทรัพยากรภูมิปัญญาท้องถิ่น',
    checklist: 'รายงานสรุปหลักฐานประเมินขอรับเกียรติบัตรขั้นที่ 1',
    portfolio: 'ตารางสะสมงานผู้ดำเนินงานสวนพฤกษศาสตร์',
    readiness: 'รายงานผลการตรวจเช็คความพร้อมรับการประเมินสถานศึกษา'
  };

  const currentFilename = `${reportTitles[selectedReportType]}_${new Date().toISOString().split('T')[0]}`;

  return (
    <div>
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1.25cm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #fff !important;
            color: #000 !important;
          }
          .no-print-element {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Panel (no-print) */}
      <div className="card glass-panel no-print-element" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              ระบบพิมพ์และส่งออกเอกสารรายงานสวนพฤกษศาสตร์ (Export System)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              เลือกรูปแบบรายงานที่ต้องการดูตัวอย่าง จากนั้นสั่งพิมพ์เป็น PDF/กระดาษ หรือดาวน์โหลดเป็นไฟล์ Microsoft Word และ Excel
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => handleExportWord('printable-document', currentFilename)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <File size={14} /> ส่งออกเป็น Word
            </button>
            <button onClick={() => handleExportExcel('report-table-id', currentFilename)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileSpreadsheet size={14} /> ส่งออกเป็น Excel
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} /> พิมพ์รายงาน (PDF)
            </button>
          </div>
        </div>

        {/* Report Selection Dropdown */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <label className="form-label" style={{ fontWeight: 'bold' }}>เลือกรายงานเพื่อเผยแพร่หรือส่งออก:</label>
          <select 
            value={selectedReportType} 
            onChange={(e) => setSelectedReportType(e.target.value)} 
            className="form-control"
            style={{ maxWidth: '400px' }}
          >
            <option value="registry">1. รายงานทะเบียนพรรณไม้โรงเรียน (Plant Registry)</option>
            <option value="k7003">2. รายงานข้อมูลสัณฐานพฤกษศาสตร์ ก.7-003 รายต้น</option>
            <option value="annual">3. รายงานสรุปผลดำเนินงานสวนพฤกษศาสตร์โรงเรียนรอบปี</option>
            <option value="study">4. รายงานการศึกษาเรียนรู้พืชศึกษา (Plant Study)</option>
            <option value="subjects">5. รายงานกิจกรรมการสอนบูรณาการ 3 กลุ่มสาระการเรียนรู้</option>
            <option value="local">6. รายงานภูมิปัญญาทรัพยากรท้องถิ่น (Local Resources Base)</option>
            <option value="checklist">7. รายงานสรุปหลักฐานประเมินขอรับเกียรติบัตรขั้นที่ 1</option>
            <option value="portfolio">8. ตารางสะสมงานผู้ดำเนินงาน (RSPG Portfolio)</option>
            <option value="readiness">9. รายงานผลการตรวจสอบความพร้อมรับการประเมิน (Readiness Audit)</option>
          </select>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div id="printable-document" className="card printable-report" style={{ backgroundColor: '#fff', color: '#111', padding: '2.5rem', boxShadow: 'var(--shadow-md)', maxWidth: '950px', margin: '0 auto 2rem auto', border: '1px solid #ddd' }}>
        
        {/* Document Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/rspg-logo.png" alt="อพ.สธ." style={{ width: '80px', height: 'auto', margin: '0 auto 10px auto', display: 'block' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '5px 0', color: '#333' }}>
            {reportTitles[selectedReportType]}
          </h3>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0', color: '#666' }}>
            โรงเรียนปายวิทยาคาร อำเภอปาย จังหวัดแม่ฮ่องสอน
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#777', margin: '5px 0' }}>
            ข้อมูลรายงาน ณ วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* RENDER SELECTED REPORT PREVIEW */}
        
        {/* REPORT 1: PLANT REGISTRY */}
        {selectedReportType === 'registry' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              ตารางสรุปรายชื่อทะเบียนพรรณไม้ ทั้งที่ปลูกในพื้นที่ศึกษา สวนสมุนไพร และโซนบำรุงป่าประจำปีการศึกษา {schoolInfo?.academic_year || '2569'}
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>รหัสพรรณไม้</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ชื่อไทย</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ชื่อวิทยาศาสตร์ / วงศ์</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ลักษณะวิสัย</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>จุดปลูก</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center' }}>สถานะป้ายรหัส</th>
                </tr>
              </thead>
              <tbody>
                {plantsList.map(p => (
                  <tr key={p.id}>
                    <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{p.plant_code}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>{p.thai_name}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.82rem' }}>
                      <i>{p.scientific_name || '-'}</i> <br /> {p.family_name}
                    </td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>{p.habit || p.plant_type || '-'}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>{p.planting_location}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center' }}>{p.is_tagged || 'ไม่มี'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 2: K.7-003 WORKSHEET REPORT */}
        {selectedReportType === 'k7003' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              สรุปผลการวิเคราะห์ลักษณะทางสัณฐานวิทยาของพืชรายต้น (ก.7-003) ประจำภาคเรียนศึกษาธิการ
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left', width: '120px' }}>ชื่อไทย (รหัสพืช)</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>วิเคราะห์ลำต้นและราก</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>วิเคราะห์ใบและขอบใบ</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>วิเคราะห์ดอกและผล</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ประโยชน์และภูมิปัญญา</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center', width: '80px' }}>ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {k7List.map(k => {
                  const match = plantsList.find(p => p.id === k.plant_id);
                  const name = match ? `${match.thai_name} (${match.plant_code})` : 'ไม่พบชื่อพืช';
                  return (
                    <tr key={k.id}>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{name}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.78rem' }}>{k.stem_detail || '-'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.78rem' }}>{k.leaf_detail || '-'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.78rem' }}>{k.flower_detail || '-'} / {k.fruit_detail || '-'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.78rem' }}>{k.local_wisdom || k.utility || '-'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center', fontSize: '0.78rem' }}>{k.recorder || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 3: ANNUAL OPERATION REPORT */}
        {selectedReportType === 'annual' && (
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <h4>ความคืบหน้าการจัดทำกิจกรรมโครงการสวนพฤกษศาสตร์รอบปี</h4>
            <p>
              ตามที่โรงเรียนปายวิทยาคารได้ดำเนินกิจกรรมสนองพระราชดำริ อพ.สธ. ในการบันทึกฐานข้อมูลระบบสารสนเทศ ทะเบียนพรรณไม้ และการสำรวจพืชสมุนไพร เพื่อยกระดับสู่การขอรับเกียรติบัตรขั้นที่ 1 ในปีการศึกษา {schoolInfo?.academic_year} นี้ โรงเรียนมีผลการดำเนินการดังนี้:
            </p>
            <ul>
              <li><b>จำนวนพืชที่ลงทะเบียนคีย์เข้าระบบสะสม</b>: {plantsList.length} ต้น</li>
              <li><b>สัดส่วนการติดป้ายชื่อรหัสประจำต้นถาวร</b>: มีป้ายแล้ว {plantsList.filter(p => p.is_tagged === 'มี').length} ต้น จากจำนวนทั้งหมด</li>
              <li><b>จํานวนแผนการจัดการเรียนรู้บูรณาการของครู</b>: {learningActivities.length} กิจกรรม/แผนการสอน</li>
              <li><b>จํานวนอุบัติการณ์ความปลอดภัยและรายงานการดูแลรักษาต้นไม้</b>: มีบันทึกแจ้งบำรุงรักษาและตัดแต่งกิ่งไม้ {incidents.length} รายการ</li>
            </ul>
            
            <table id="report-table-id" style={{ display: 'none' }}>
              <thead>
                <tr><th>หัวข้อดำเนินงาน</th><th>สถิติจำนวน</th></tr>
              </thead>
              <tbody>
                <tr><td>พรรณไม้ทั้งหมด</td><td>{plantsList.length}</td></tr>
                <tr><td>การติดป้ายชื่อถาวร</td><td>{plantsList.filter(p => p.is_tagged === 'มี').length}</td></tr>
                <tr><td>แผนจัดการเรียนรู้</td><td>{learningActivities.length}</td></tr>
                <tr><td>ประวัติอุบัติการณ์และบำรุงรักษา</td><td>{incidents.length}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 4: PLANT STUDY REPORT */}
        {selectedReportType === 'study' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              รายละเอียดการศึกษาเชิงเปรียบเทียบพืชศึกษา (Plant Study) ของโรงเรียนปายวิทยาคาร เน้นศึกษาพืชเด่น เช่น **กัลปพฤกษ์**
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>รหัสพืชหลัก</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ชื่อไทย</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ข้อมูลพฤกษศาสตร์วิจัย</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ผลการใช้ประเมิน</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>การประยุกต์ใช้</th>
                </tr>
              </thead>
              <tbody>
                {k7List.filter(k => k.botanical_data).map(k => {
                  const match = plantsList.find(p => p.id === k.plant_id);
                  return (
                    <tr key={k.id}>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{match?.plant_code}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{match?.thai_name}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.8rem' }}>{k.botanical_data}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.8rem' }}>{k.study_results}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.8rem' }}>{k.utility}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 5: 3 SUBJECTS REPORT */}
        {selectedReportType === 'subjects' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              สรุปทำเนียบโครงการการจัดการเรียนรู้บูรณาการ 3 กลุ่มสาระการเรียนรู้ และรายงานกิจกรรมของคณะครูประจำปี
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>หัวข้อแผนกิจกรรมการเรียนรู้</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>หมวดหมู่ อพ.สธ.</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ระดับชั้น</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ครูผู้รับผิดชอบ</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ผลการเรียนรู้หลังสอน (Post-teaching)</th>
                </tr>
              </thead>
              <tbody>
                {learningActivities.map(act => (
                  <tr key={act.id}>
                    <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{act.title}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>{act.subject_type}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center' }}>{act.classroom}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>{act.creator}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.8rem' }}>{act.post_teaching_log || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 6: LOCAL RESOURCES REPORT */}
        {selectedReportType === 'local' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              รายงานการสืบค้นข้อมูลและศึกษาความเชื่อมโยงของพืชสวนพฤกษศาสตร์กับวัฒนธรรม ภูมิปัญญา และระบบนิเวศท้องถิ่นในอำเภอปาย
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left', width: '150px' }}>ชื่อพรรณไม้</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>ข้อมูลการใช้ประโยชน์ด้านสมุนไพร/ปราชญ์ปาย</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>แหล่งที่พบและพิกัดภูมิประวัติ</th>
                </tr>
              </thead>
              <tbody>
                {k7List.filter(k => k.local_wisdom).map(k => {
                  const match = plantsList.find(p => p.id === k.plant_id);
                  return (
                    <tr key={k.id}>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{match?.thai_name} ({match?.plant_code})</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.82rem' }}>{k.local_wisdom}</td>
                      <td style={{ border: '1px solid #bbb', padding: '8px', fontSize: '0.82rem' }}>
                        พบหนาแน่นในจุดศึกษา {match?.planting_location} (พิกัด: {match?.gps_lat || '-'}, {match?.gps_lng || '-'})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 7: EVALUATION SUMMARY / CHECKLIST */}
        {selectedReportType === 'checklist' && (
          <div style={{ marginTop: '1.5rem' }}>
            {/* Score Banner */}
            <div style={{ border: '2px solid #4a148c', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: '#4a148c' }}>ความพร้อมแฟ้มหลักฐานเสนอรับเกียรติบัตรขั้นที่ 1</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#666' }}>รวมสถิติด้านดำเนินงานตามแบบประเมิน ก.7-009 และเกณฑ์ ก.7-008</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4a148c' }}>{totalSelfScore} / 500 คะแนน</span>
              </div>
            </div>

            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left', width: '80px' }}>รหัสตัวชี้วัด</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left' }}>หัวข้อเกณฑ์มาตรฐาน อพ.สธ.</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center', width: '100px' }}>สถานะ</th>
                  <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'right', width: '80px' }}>คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {criteriaList.map(crit => (
                  <tr key={crit.id}>
                    <td style={{ border: '1px solid #bbb', padding: '8px', fontWeight: 'bold' }}>{crit.criteria_id}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{crit.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}><b>หลักฐานอ้างอิง:</b> {crit.evidence_text || 'ยังไม่ได้บันทึกระบุ'}</div>
                    </td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'center' }}>{crit.status || 'รอตรวจ'}</td>
                    <td style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{crit.self_score || 0} / {crit.max_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 8: PORTFOLIO TABLE */}
        {selectedReportType === 'portfolio' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>
              ตารางแสดงรายชื่อผู้จัดทำและสะสมงานกิจกรรมพืชศึกษา ผลงานสเก็ตช์ลายเส้น ผลงานประเมิน 3 ด้าน และสื่อนำเสนอของโรงเรียนปายวิทยาคาร
            </p>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>ชื่อ-สกุล</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>ระดับชั้น / หน้าที่</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>การเข้าอบรม อพ.สธ.</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>ความถูกต้องทางวิชาการ</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right' }}>ก.7-003 (60)</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right' }}>รายงาน (30)</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right' }}>รวม (90)</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>รายงานผลงาน</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>สื่อนำเสนอ</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((row, idx) => {
                  const scoreTotal = (row.score_1 || 0) + (row.score_2 || 0) + (row.score_3 || 0);
                  return (
                    <tr key={row.id}>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{row.name}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px' }}>{row.level}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px' }}>{row.training_rspg}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>{row.audit_accuracy}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right' }}>{row.score_1 || 0}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right' }}>{row.score_2 || 0}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{scoreTotal}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>{row.report_status || 'ส่งแล้ว'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center' }}>{row.media_status || 'มีสไลด์'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 9: READINESS AUDIT REPORT */}
        {selectedReportType === 'readiness' && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              รายงานผลสรุปข้อบกพร่องและจุดพัฒนาการดำเนินงาน (Readiness Audit) สำหรับเตรียมรับคณะกรรมการประเมินโครงการสวนพฤกษศาสตร์โรงเรียน อพ.สธ.
            </p>

            <h4 style={{ color: '#4a148c', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginTop: '1.5rem' }}>
              1. จุดบกพร่องตามเกณฑ์ตัวชี้วัด (ก.7-009)
            </h4>
            <table id="report-table-id" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '6px', width: '80px' }}>รหัสตัวชี้วัด</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>หัวข้อเกณฑ์</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>ประเภทความบกพร่องที่พบ</th>
                </tr>
              </thead>
              <tbody>
                {critMissingEvidence.map(c => (
                  <tr key={`me-${c.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>ข้อ {c.criteria_id}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px' }}>{c.title}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#c62828', fontWeight: 600 }}>⚠️ ยังไม่มีแผนผังหรือเชื่อมโยงหลักฐานอ้างอิง</td>
                  </tr>
                ))}
                {critMissingOwner.map(c => (
                  <tr key={`mo-${c.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>ข้อ {c.criteria_id}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px' }}>{c.title}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#ef6c00' }}>⚠️ ยังไม่ได้ระบุผู้รับผิดชอบหลัก</td>
                  </tr>
                ))}
                {critMissingSelfScore.map(c => (
                  <tr key={`ms-${c.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>ข้อ {c.criteria_id}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px' }}>{c.title}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#ef6c00' }}>⚠️ ยังไม่ได้ทำคะแนนประเมินตนเอง</td>
                  </tr>
                ))}
                {critMissingEvidence.length === 0 && critMissingOwner.length === 0 && critMissingSelfScore.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'center', color: '#2e7d32', fontWeight: 'bold' }}>
                      ✓ ไม่พบข้อบกพร่องในระบบเกณฑ์ตัวชี้วัด ก.7-009
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4 style={{ color: '#4a148c', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginTop: '1.5rem' }}>
              2. จุดบกพร่องด้านการทะเบียนและป้ายชื่อพรรณไม้
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '6px', width: '150px' }}>ชื่อพรรณไม้</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>ประเภทความบกพร่อง</th>
                </tr>
              </thead>
              <tbody>
                {plantsMissingLabel.map(p => (
                  <tr key={`pl-${p.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{p.thai_name}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#c62828' }}>❌ ยังไม่มีการปักป้ายรหัสประจำต้นหรือป้ายถาวร</td>
                  </tr>
                ))}
                {plantsMissingGps.map(p => (
                  <tr key={`pg-${p.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{p.thai_name}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#ef6c00' }}>⚠️ ขาดพิกัดระบุตำแหน่งบนแผนที่ (GPS)</td>
                  </tr>
                ))}
                {plantsMissingDesc.map(p => (
                  <tr key={`pd-${p.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{p.thai_name}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#ef6c00' }}>⚠️ คำอธิบายลักษณะพฤกษศาสตร์ขาดหายหรือสั้นเกินไป</td>
                  </tr>
                ))}
                {plantsMissingLabel.length === 0 && plantsMissingGps.length === 0 && plantsMissingDesc.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'center', color: '#2e7d32', fontWeight: 'bold' }}>
                      ✓ ไม่พบข้อบกพร่องในระบบทะเบียนและป้ายชื่อพรรณไม้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4 style={{ color: '#4a148c', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginTop: '1.5rem' }}>
              3. จุดบกพร่องด้านสมุดสัณฐานวิทยาพืช ก.7-003
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #bbb', padding: '6px', width: '200px' }}>ชื่อพืชศึกษา</th>
                  <th style={{ border: '1px solid #bbb', padding: '6px', textAlign: 'left' }}>ประเภทความบกพร่อง</th>
                </tr>
              </thead>
              <tbody>
                {plantsMissingK7.map(p => (
                  <tr key={`pk-${p.id}`}>
                    <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{p.thai_name}</td>
                    <td style={{ border: '1px solid #bbb', padding: '6px', color: '#c62828' }}>❌ ยังไม่ได้บันทึกเล่มศึกษา ก.7-003</td>
                  </tr>
                ))}
                {k7MissingPhotos.map(s => {
                  const match = plantsList.find(p => p.id === s.plant_id);
                  return (
                    <tr key={`kp-${s.id}`}>
                      <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{match?.thai_name || 'ไม่พบพืช'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', color: '#c62828' }}>❌ ภาพถ่ายศึกษา 6 จุดพฤกษศาสตร์ไม่ครบถ้วน (วิสัย ลำต้น ใบ ดอก ผล เมล็ด)</td>
                    </tr>
                  );
                })}
                {k7Unapproved.map(s => {
                  const match = plantsList.find(p => p.id === s.plant_id);
                  return (
                    <tr key={`ku-${s.id}`}>
                      <td style={{ border: '1px solid #bbb', padding: '6px', fontWeight: 'bold' }}>{match?.thai_name || 'ไม่พบพืช'}</td>
                      <td style={{ border: '1px solid #bbb', padding: '6px', color: '#ef6c00' }}>⚠️ รอครูตรวจประเมินผลผ่านเล่มทะเบียน ก.7-003</td>
                    </tr>
                  );
                })}
                {plantsMissingK7.length === 0 && k7MissingPhotos.length === 0 && k7Unapproved.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ border: '1px solid #bbb', padding: '10px', textAlign: 'center', color: '#2e7d32', fontWeight: 'bold' }}>
                      ✓ สมุดทะเบียน ก.7-003 ครบถ้วนและได้รับการอนุมัติเรียบร้อยแล้ว
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Box Block at the bottom of the printable A4 pages */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4.5rem', fontSize: '0.85rem', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <p>ลงชื่อ..............................................................ผู้ตรวจสอบรายงาน</p>
            <p style={{ marginTop: '8px' }}>(..............................................................)</p>
            <p style={{ color: '#555', fontSize: '0.74rem', marginTop: '4px' }}>ตำแหน่ง: ครูผู้สอนวิชาการสวนพฤกษศาสตร์โรงเรียน</p>
          </div>

          <div style={{ textAlign: 'center', width: '45%', position: 'relative' }}>
            {schoolInfo?.report_is_signed && (
              <div style={{ 
                position: 'absolute', 
                top: '-35px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                border: '2px solid #2e7d32', 
                color: '#2e7d32', 
                backgroundColor: '#e8f5e9',
                padding: '4px 10px', 
                borderRadius: '4px', 
                fontWeight: 'bold', 
                fontSize: '0.72rem',
                whiteSpace: 'nowrap'
              }}>
                ✓ ลงนามอนุมัติออนไลน์แล้ว เมื่อ {schoolInfo.signed_date}
              </div>
            )}
            <p>ลงชื่อ..............................................................ผู้อนุมัติและผู้บริหารโครงการ</p>
            <p style={{ marginTop: '8px' }}>
              {schoolInfo?.report_is_signed ? `( นายวรวิทย์ จิตรบริสุทธิ์ )` : `(..............................................................)`}
            </p>
            <p style={{ color: '#555', fontSize: '0.74rem', marginTop: '4px' }}>ตำแหน่ง: ผู้อำนวยการโรงเรียนปายวิทยาคาร</p>
            
            {!schoolInfo?.report_is_signed && (userRole === 'executive' || userRole === 'admin') && (
              <button
                onClick={handleSignReport}
                className="btn btn-primary"
                style={{ marginTop: '10px', fontSize: '0.75rem', padding: '4px 10px' }}
              >
                ✍️ ลงนามอนุมัติรายงาน (Sign)
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
