import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileSpreadsheet, Plus, Trash2, Edit3, Save, X, Upload, ExternalLink, RefreshCw } from 'lucide-react';

export default function Portfolio({ userRole }) {
  const [portfolioRows, setPortfolioRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  // School metadata info
  const [memberId, setMemberId] = useState('7-30210-002');
  const [schoolName, setSchoolName] = useState('โรงเรียนปายวิทยาคาร');
  const [district, setDistrict] = useState('ปาย');
  const [province, setProvince] = useState('แม่ฮ่องสอน');
  const [formDate, setFormDate] = useState('13 เมษายน 2563');

  // Form fields for adding/editing portfolio row
  const [rowNum, setRowNum] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [training, setTraining] = useState('');
  const [correctness, setCorrectness] = useState('');
  const [selfEval1, setSelfEval1] = useState('');
  const [selfEval2, setSelfEval2] = useState('');
  const [selfEval3, setSelfEval3] = useState('');
  const [annualResult, setAnnualResult] = useState('');
  const [reportPlantStudy, setReportPlantStudy] = useState('');
  const [reportAspect1, setReportAspect1] = useState('');
  const [reportAspect2, setReportAspect2] = useState('');
  const [reportAspect3, setReportAspect3] = useState('');
  const [reportSurveyDb, setReportSurveyDb] = useState('');
  const [media3Aspects, setMedia3Aspects] = useState('');
  const [media3Subjects, setMedia3Subjects] = useState('');
  const [media9Worksheets, setMedia9Worksheets] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadField, setUploadField] = useState(''); // helper to track which file field is uploading

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_portfolio'));
      let list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort by row number
      list.sort((a, b) => (a.row_num || 0) - (b.row_num || 0));
      setPortfolioRows(list);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (row = null) => {
    if (row) {
      setEditingRow(row);
      setRowNum(row.row_num || '');
      setDateStr(row.date_str || '');
      setTraining(row.training || '');
      setCorrectness(row.correctness || '');
      setSelfEval1(row.self_eval_1 || '');
      setSelfEval2(row.self_eval_2 || '');
      setSelfEval3(row.self_eval_3 || '');
      setAnnualResult(row.annual_result || '');
      setReportPlantStudy(row.report_plant_study || '');
      setReportAspect1(row.report_aspect_1 || '');
      setReportAspect2(row.report_aspect_2 || '');
      setReportAspect3(row.report_aspect_3 || '');
      setReportSurveyDb(row.report_survey_db || '');
      setMedia3Aspects(row.media_3_aspects || '');
      setMedia3Subjects(row.media_3_subjects || '');
      setMedia9Worksheets(row.media_9_worksheets || '');
    } else {
      setEditingRow(null);
      setRowNum(portfolioRows.length + 1);
      setDateStr('');
      setTraining('-');
      setCorrectness('-');
      setSelfEval1('-');
      setSelfEval2('-');
      setSelfEval3('-');
      setAnnualResult('-');
      setReportPlantStudy('-');
      setReportAspect1('-');
      setReportAspect2('-');
      setReportAspect3('-');
      setReportSurveyDb('-');
      setMedia3Aspects('-');
      setMedia3Subjects('-');
      setMedia9Worksheets('-');
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file, fieldSetter) => {
    if (!storage) return;
    setUploadField(fieldSetter);
    try {
      const ext = file.name.split('.').pop();
      const path = `portfolio/file_${Date.now()}.${ext}`;
      const fileRef = ref(storage, path);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Determine which state to set
      if (fieldSetter === 'correctness') setCorrectness(downloadUrl);
      else if (fieldSetter === 'annual') setAnnualResult(downloadUrl);
      else if (fieldSetter === 'study') setReportPlantStudy(downloadUrl);
      else if (fieldSetter === 'asp1') setReportAspect1(downloadUrl);
      else if (fieldSetter === 'asp2') setReportAspect2(downloadUrl);
      else if (fieldSetter === 'asp3') setReportAspect3(downloadUrl);
      else if (fieldSetter === 'survey') setReportSurveyDb(downloadUrl);
      else if (fieldSetter === 'media3asp') setMedia3Aspects(downloadUrl);
      else if (fieldSetter === 'media3sub') setMedia3Subjects(downloadUrl);
      else if (fieldSetter === 'media9ws') setMedia9Worksheets(downloadUrl);

      alert('อัปโหลดไฟล์สำเร็จ!');
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
    } finally {
      setUploadField('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;
    setSaving(true);

    try {
      const payload = {
        row_num: parseInt(rowNum) || 0,
        date_str: dateStr,
        training: training,
        correctness: correctness,
        self_eval_1: selfEval1,
        self_eval_2: selfEval2,
        self_eval_3: selfEval3,
        annual_result: annualResult,
        report_plant_study: reportPlantStudy,
        report_aspect_1: reportAspect1,
        report_aspect_2: reportAspect2,
        report_aspect_3: reportAspect3,
        report_survey_db: reportSurveyDb,
        media_3_aspects: media3Aspects,
        media_3_subjects: media3Subjects,
        media_9_worksheets: media9Worksheets
      };

      const docId = editingRow?.id || `row_${rowNum}`;
      await setDoc(doc(db, 'rspg_portfolio', docId), payload);

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกตารางสะสมงาน: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole === 'visitor') return;
    if (window.confirm('คุณแน่ใจว่าต้องการลบแถวสะสมงานแถวนี้?')) {
      try {
        await deleteDoc(doc(db, 'rspg_portfolio', id));
        loadData();
      } catch (err) {
        alert('ลบแถวไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const renderCellContent = (text) => {
    if (!text || text === '-') return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    if (text.startsWith('http')) {
      return (
        <a href={text} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '2px 5px', fontSize: '0.7rem', display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
          ลิงก์ไฟล์ <ExternalLink size={8} />
        </a>
      );
    }
    return <span style={{ whiteSpace: 'pre-line' }}>{text}</span>;
  };

  return (
    <div>
      {/* Upper header description */}
      <div className="card glass-panel no-print-element" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={22} />
              ตารางสะสมงานสมาชิกสวนพฤกษศาสตร์โรงเรียน (อพ.สธ.)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              แบบฟอร์มบันทึกการประชุม ฝึกอบรมประเมินตนเอง และระดับรายงานผลงานพืชศึกษา/ใบงานตามแนวทาง อพ.สธ.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadData} className="btn btn-secondary" style={{ padding: '0.5rem' }} title="รีเฟรช">
              <RefreshCw size={14} />
            </button>
            {userRole !== 'visitor' && (
              <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                <Plus size={14} /> เพิ่มรายการสะสมงาน
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official RSPG Table Container */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: '#fff', color: '#000', border: '1px solid #ccc', overflowX: 'auto' }}>

        {/* Table Title Banner */}
        <div style={{ backgroundColor: '#1b5e20', color: '#fff', textAlign: 'center', padding: '10px', fontWeight: 800, fontSize: '1.15rem', borderRadius: '4px', marginBottom: '1rem' }}>
          ตัวอย่างตารางสะสมงาน ของสมาชิกสวนพฤกษศาสตร์โรงเรียน
        </div>

        {/* Member meta metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', fontSize: '0.82rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          <div><b>รหัสสมาชิก:</b> <span style={{ borderBottom: '1px dashed #333', padding: '0 5px' }}>{memberId}</span></div>
          <div><b>ชื่อสถานศึกษา:</b> <span style={{ borderBottom: '1px dashed #333', padding: '0 5px' }}>{schoolName}</span></div>
          <div><b>อำเภอ:</b> <span style={{ borderBottom: '1px dashed #333', padding: '0 5px' }}>{district}</span></div>
          <div><b>จังหวัด:</b> <span style={{ borderBottom: '1px dashed #333', padding: '0 5px' }}>{province}</span></div>
        </div>

        {/* Table Layout */}
        <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', color: '#000', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f4f0' }}>
              <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>ลำดับที่</th>
              <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>วัน เดือน ปี</th>
              <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>ฝึกอบรม/ประชุมกลุ่ม</th>
              <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>ความถูกต้องทางวิชาการ (100)</th>
              <th colSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>ประเมินตนเอง</th>
              <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>ผลการดำเนินงานประจำปี</th>
              <th colSpan="5" style={{ border: '1.5px solid #aaa', padding: '8px' }}>รายงาน (เล่ม/ไฟล์)</th>
              <th colSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }}>สื่อนำเสนอ (ไฟล์)</th>
              {userRole !== 'visitor' && <th rowSpan="3" style={{ border: '1.5px solid #aaa', padding: '8px' }} className="no-print-element">จัดการ</th>}
            </tr>
            <tr style={{ backgroundColor: '#f0f4f0' }}>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>ด้านที่ 1 (250)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>ด้านที่ 2 (500)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>ด้านที่ 3 (250)</th>
              <th rowSpan="2" style={{ border: '1.5px solid #aaa', padding: '6px' }}>พืชศึกษา</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระธรรมชาติแห่งชีวิต (400)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระสรรพสิ่งล้วนพันเกี่ยว (300)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระประโยชน์แท้แก่มหาชน (300)</th>
              <th rowSpan="2" style={{ border: '1.5px solid #aaa', padding: '6px' }}>การสำรวจและจัดทำฐานฯ</th>
              <th rowSpan="2" style={{ border: '1.5px solid #aaa', padding: '6px' }}>3 ด้าน</th>
              <th rowSpan="2" style={{ border: '1.5px solid #aaa', padding: '6px' }}>3 สาระ</th>
              <th rowSpan="2" style={{ border: '1.5px solid #aaa', padding: '6px' }}>9 ใบงาน</th>
            </tr>
            <tr style={{ backgroundColor: '#f0f4f0' }}>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระธรรมชาติแห่งชีวิต (400)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระสรรพสิ่งล้วนพันเกี่ยว (300)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>สาระประโยชน์แท้แก่มหาชน (300)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>(เล่ม/ไฟล์)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>(เล่ม/ไฟล์)</th>
              <th style={{ border: '1.5px solid #aaa', padding: '6px' }}>(เล่ม/ไฟล์)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={userRole !== 'visitor' ? 17 : 16} style={{ border: '1.5px solid #aaa', padding: '2rem' }}>กำลังดาวน์โหลดข้อมูลตารางสะสมงาน...</td>
              </tr>
            ) : portfolioRows.length === 0 ? (
              <tr>
                <td colSpan={userRole !== 'visitor' ? 17 : 16} style={{ border: '1.5px solid #aaa', padding: '2rem' }}>ไม่มีรายการสะสมงาน</td>
              </tr>
            ) : (
              portfolioRows.map((row, index) => (
                <tr key={row.id || index}>
                  <td style={{ border: '1px solid #aaa', padding: '8px', fontWeight: 'bold' }}>{row.row_num}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px', minWidth: '90px' }}>{row.date_str}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px', minWidth: '110px', textAlign: 'left' }}>{renderCellContent(row.training)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.correctness)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.self_eval_1)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.self_eval_2)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.self_eval_3)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.annual_result)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.report_plant_study)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.report_aspect_1)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.report_aspect_2)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.report_aspect_3)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.report_survey_db)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.media_3_aspects)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.media_3_subjects)}</td>
                  <td style={{ border: '1px solid #aaa', padding: '8px' }}>{renderCellContent(row.media_9_worksheets)}</td>
                  {userRole !== 'visitor' && (
                    <td style={{ border: '1px solid #aaa', padding: '8px' }} className="no-print-element">
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenModal(row)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '0.7rem' }}>
                          แก้ไข
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="btn btn-secondary" style={{ padding: '3px 6px', fontSize: '0.7rem', color: 'var(--color-danger)' }}>
                          ลบ
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Accumulation Row Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {editingRow ? 'แก้ไขรายการสะสมงาน' : 'เพิ่มรายการสะสมงานสมาชิก อพ.สธ.'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr 3fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">ลำดับที่</label>
                  <input
                    type="number"
                    className="form-control"
                    value={rowNum}
                    onChange={(e) => setRowNum(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">วัน เดือน ปี</label>
                  <input
                    type="text"
                    className="form-control"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    placeholder="เช่น 13-16 เม.ย. 63"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ฝึกอบรม/ประชุมกลุ่ม</label>
                  <input
                    type="text"
                    className="form-control"
                    value={training}
                    onChange={(e) => setTraining(e.target.value)}
                    placeholder="เช่น ฝึก 5 องค์ (มทส)_5 คน"
                    required
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '1rem 0' }}>
                ความถูกต้องทางวิชาการ & การประเมินตนเอง
              </h4>

              <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">ความถูกต้องวิชาการ</label>
                  <input type="text" className="form-control" value={correctness} onChange={(e) => setCorrectness(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ด้านที่ 1 (250)</label>
                  <input type="text" className="form-control" value={selfEval1} onChange={(e) => setSelfEval1(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ด้านที่ 2 (500)</label>
                  <input type="text" className="form-control" value={selfEval2} onChange={(e) => setSelfEval2(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ด้านที่ 3 (250)</label>
                  <input type="text" className="form-control" value={selfEval3} onChange={(e) => setSelfEval3(e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '1rem 0' }}>
                ผลการดำเนินงานประจำปี & รายงาน (เล่ม/ไฟล์)
              </h4>

              <div className="grid-3" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">ผลดำเนินงานประจำปี</label>
                  <input type="text" className="form-control" value={annualResult} onChange={(e) => setAnnualResult(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">รายงานพืชศึกษา</label>
                  <input type="text" className="form-control" value={reportPlantStudy} onChange={(e) => setReportPlantStudy(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">สาระธรรมชาติแห่งชีวิต</label>
                  <input type="text" className="form-control" value={reportAspect1} onChange={(e) => setReportAspect1(e.target.value)} />
                </div>
              </div>

              <div className="grid-3" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">สาระสรรพสิ่งล้วนพันเกี่ยว</label>
                  <input type="text" className="form-control" value={reportAspect2} onChange={(e) => setReportAspect2(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">สาระประโยชน์แท้แก่มหาชน</label>
                  <input type="text" className="form-control" value={reportAspect3} onChange={(e) => setReportAspect3(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">รายงานการสำรวจ/ทำฐานฯ</label>
                  <input type="text" className="form-control" value={reportSurveyDb} onChange={(e) => setReportSurveyDb(e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: '1rem 0' }}>
                สื่อนำเสนอ (ไฟล์)
              </h4>

              <div className="grid-3" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">สื่อนำเสนอ 3 ด้าน</label>
                  <input type="text" className="form-control" value={media3Aspects} onChange={(e) => setMedia3Aspects(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">สื่อนำเสนอ 3 สาระ</label>
                  <input type="text" className="form-control" value={media3Subjects} onChange={(e) => setMedia3Subjects(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">สื่อนำเสนอ 9 ใบงาน</label>
                  <input type="text" className="form-control" value={media9Worksheets} onChange={(e) => setMedia9Worksheets(e.target.value)} />
                </div>
              </div>

              {/* Upload helper links */}
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
                💡 <b>คำแนะนำ:</b> คุณสามารถพิมพ์ข้อความสรุป (เช่น "ปี62 (เล่ม/ไฟล์)") ลงในช่องต่างๆ ได้โดยตรง หรือเลือกใช้การอัปโหลดไฟล์จริงเก็บใน Firebase Storage แล้วระบบจะผูกเป็นปุ่มดาวน์โหลดไฟล์อ้างอิงให้โดยอัตโนมัติ
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลตารางสะสมงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
