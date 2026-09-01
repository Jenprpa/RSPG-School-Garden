import React, { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, setDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { Settings, Save, Plus, Trash2, Heart, Image, CheckCircle, FileText, Upload, Link } from 'lucide-react';
import PublicReleaseManager from './PublicReleaseManager';
import SurveyResultsManager from './SurveyResultsManager';

export default function BannerConfig({ userRole }) {
  const [banners, setBanners] = useState({
    title: 'สวนพฤกษศาสตร์โรงเรียนปายวิทยาคาร',
    subtitle: 'สนองพระราชดำริโครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ (อพ.สธ.)',
    banner_url: './school-banner.jpg',
    welcome_text: 'ยินดีต้อนรับสู่ระบบงานสวนพฤกษศาสตร์โรงเรียน แหล่งเรียนรู้ บ่มเพาะเยาวชน และรักษาสรรพสิ่งรอบตัว'
  });

  const [goodness, setGoodness] = useState([]);
  const [loading, setLoading] = useState(true);

  // Public publications state variables
  const [publicDocs, setPublicDocs] = useState([]);
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docUrl, setDocUrl] = useState('');
  const [docSize, setDocSize] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [schoolMapFile, setSchoolMapFile] = useState(null);
  const [mapPreviewUrl, setMapPreviewUrl] = useState('');

  // Goodness form states
  const [gTitle, setGTitle] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gAuthor, setGAuthor] = useState('');

  const loadConfigData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch current banners configurations
      const configSnap = await getDocs(collection(db, 'rspg_banners'));
      if (!configSnap.empty) {
        setBanners(configSnap.docs[0].data());
      }

      // 2. Fetch goodness items
      const goodSnap = await getDocs(collection(db, 'rspg_goodness'));
      const list = [];
      goodSnap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setGoodness(list);

      // 3. Fetch public documents
      const docsSnap = await getDocs(collection(db, 'rspg_public_docs'));
      const docsList = [];
      docsSnap.forEach(d => {
        docsList.push({ id: d.id, ...d.data() });
      });
      setPublicDocs(docsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigData();
  }, []);

  const handleUploadSchoolMap = async (file) => {
    if (!storage || !file) return '';
    try {
      // Compress school map image: max dimension 1600px, JPEG quality 80%
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop() || 'jpg';
      const fileName = `school_map/map_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert('อัปโหลดรูปภาพแผนที่โรงเรียนไม่สำเร็จ: ' + err.message);
      return '';
    }
  };

  const handleSchoolMapChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาเลือกไฟล์ขนาดเล็กกว่า 10 MB`);
      e.target.value = '';
      setSchoolMapFile(null);
      setMapPreviewUrl('');
      return;
    }

    setSchoolMapFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMapPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSchoolMap = async () => {
    if (userRole !== 'admin') {
      alert('เฉพาะบทบาทผู้ดูแลระบบเท่านั้นที่ทำรายการนี้ได้');
      return;
    }
    if (!window.confirm('ยืนยันลบรูปแผนที่ดาวเทียมจริงเพื่อกลับไปใช้แผนผังจำลองเริ่มต้นใช่หรือไม่?')) return;

    setSaving(true);
    setStatus('กำลังลบข้อมูลภาพแผนที่โรงเรียน...');
    try {
      const updatedBanners = { ...banners, school_map_url: '' };
      await setDoc(doc(db, 'rspg_banners', 'pai_config'), updatedBanners);
      setBanners(updatedBanners);
      setSchoolMapFile(null);
      setMapPreviewUrl('');
      setStatus('✅ รีเซ็ตแผนที่โรงเรียนกลับสู่แบบจำลองเริ่มต้นสำเร็จ!');
    } catch (err) {
      setStatus('เกิดข้อผิดพลาดในการรีเซ็ตแผนที่: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanners = async (e) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('เฉพาะบทบาทผู้ดูแลระบบเท่านั้นที่ทำรายการนี้ได้');
      return;
    }
    setSaving(true);
    setStatus('กำลังบันทึกตั้งค่าเว็บไซต์ประชาสัมพันธ์...');
    try {
      let finalBanners = { ...banners };

      if (schoolMapFile) {
        setStatus('กำลังบีบอัดและอัปโหลดภาพแผนที่โรงเรียน...');
        const mapUrl = await handleUploadSchoolMap(schoolMapFile);
        if (mapUrl) {
          finalBanners.school_map_url = mapUrl;
        }
      }

      await setDoc(doc(db, 'rspg_banners', 'pai_config'), finalBanners);
      setBanners(finalBanners);
      setSchoolMapFile(null);
      setMapPreviewUrl('');
      setStatus('✅ บันทึกข้อมูลส่วนหัว แบนเนอร์ และภาพแผนที่สำเร็จ!');
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoodness = async (e) => {
    e.preventDefault();
    if (!['admin', 'rspg_board', 'teacher'].includes(userRole)) {
      alert('คุณไม่มีสิทธิ์จัดการข้อมูลคุณธรรม/ความดีงาม');
      return;
    }
    try {
      const payload = {
        title: gTitle,
        description: gDesc,
        author: gAuthor || 'ปายวิทยาคาร',
        date: new Date().toISOString().split('T')[0]
      };
      await addDoc(collection(db, 'rspg_goodness'), payload);
      setGTitle('');
      setGDesc('');
      setGAuthor('');
      setStatus('✅ เพิ่มบันทึกแบ่งปันความดีงามเข้าระบบเผยแพร่สำเร็จ!');
      loadConfigData();
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleDeleteGoodness = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบรายการได้');
      return;
    }
    if (!window.confirm('ยืนยันลบการแชร์ความดีงามนี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rspg_goodness', id));
      loadConfigData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePublicDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาบีบอัดไฟล์ก่อนทำการอัปโหลด`);
        e.target.value = '';
        setDocFile(null);
        return;
      }
    }
    setDocFile(file);
  };

  const handleUploadDoc = async (file) => {
    if (!storage || !file) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const fileName = `public_docs/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message);
      return '';
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถอัปโหลดเอกสารเผยแพร่ได้');
      return;
    }
    if (uploadMode === 'file' && !docFile) {
      alert('กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด');
      return;
    }
    if (uploadMode === 'url' && !docUrl) {
      alert('กรุณากรอกลิงก์ URL เอกสาร');
      return;
    }

    setUploadingDoc(true);
    setStatus('กำลังบันทึกเอกสารเผยแพร่...');
    try {
      let fileUrl = docUrl;
      let fileName = 'External Link';
      let sizeLabel = docSize || 'ลิงก์เว็บ';

      if (uploadMode === 'file' && docFile) {
        setStatus('กำลังอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์...');
        const uploadedUrl = await handleUploadDoc(docFile);
        if (!uploadedUrl) {
          setUploadingDoc(false);
          return;
        }
        fileUrl = uploadedUrl;
        fileName = docFile.name;
        const sizeMB = (docFile.size / (1024 * 1024)).toFixed(1);
        sizeLabel = parseFloat(sizeMB) > 0.1 ? `${sizeMB} MB` : `${(docFile.size / 1024).toFixed(0)} KB`;
      }

      const payload = {
        title: docTitle,
        file_url: fileUrl,
        file_name: fileName,
        file_size: sizeLabel,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'rspg_public_docs'), payload);
      setDocTitle('');
      setDocFile(null);
      setDocUrl('');
      setDocSize('');

      e.target.reset();

      setStatus('✅ บันทึกเอกสารเผยแพร่สาธารณะสำเร็จ!');
      loadConfigData();
    } catch (err) {
      setStatus('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบเอกสารได้');
      return;
    }
    if (!window.confirm('ยืนยันลบเอกสารเผยแพร่นี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rspg_public_docs', id));
      setStatus('✅ ลบเอกสารเผยแพร่สาธารณะสำเร็จ!');
      loadConfigData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดระบบจัดการประชาสัมพันธ์...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบ Website Banner & เผยแพร่ อพ.สธ.
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ปรับแต่งส่วนหัวของหน้าเว็บไซต์สาธารณะ ข้อความต้อนรับ และการจัดการข้อมูลแบ่งปันความดีงามของโรงเรียน
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }} className="rspg-progress-grid">

        {/* Banner Configuration Panel */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              🖼️ ตั้งค่าหัวเว็บไซต์ประชาสัมพันธ์ (Banner Config)
            </h4>

            <form onSubmit={handleSaveBanners}>
              <div className="form-group">
                <label className="form-label">หัวข้อใหญ่ประชาสัมพันธ์</label>
                <input
                  type="text"
                  className="form-control"
                  value={banners.title}
                  onChange={(e) => setBanners({ ...banners, title: e.target.value })}
                  disabled={userRole !== 'admin'}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">คำอธิบายใต้หัวข้อ</label>
                <input
                  type="text"
                  className="form-control"
                  value={banners.subtitle}
                  onChange={(e) => setBanners({ ...banners, subtitle: e.target.value })}
                  disabled={userRole !== 'admin'}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">ข้อความคำกล่าวต้อนรับ (Welcome Statement)</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={banners.welcome_text}
                  onChange={(e) => setBanners({ ...banners, welcome_text: e.target.value })}
                  disabled={userRole !== 'admin'}
                  required
                />
              </div>

              {/* School Map Upload Section */}
              <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <Image size={18} color="var(--color-primary)" />
                  ภาพแผนที่ดาวเทียมโรงเรียน (Google Earth Screenshot)
                </label>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                  อัปโหลดภาพแผนที่จริงจาก Google Earth หรือภาพถ่ายดาวเทียมเพื่อใช้แสดงผลเบื้องหลังพิกัดจุดพรรณไม้ (ขนาดไฟล์ไม่เกิน 10 MB, ระบบจะบีบอัดขนาดให้อย่างเหมาะสมโดยอัตโนมัติ)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleSchoolMapChange}
                  disabled={userRole !== 'admin'}
                  style={{ padding: '0.35rem 0.5rem' }}
                />

                {/* Local preview of selected file */}
                {schoolMapFile && mapPreviewUrl && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '6px' }}>
                      ภาพตัวอย่างแผนที่ใหม่ที่จะอัปโหลด (ขนาดไฟล์จริง: {(schoolMapFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                    <img
                      src={mapPreviewUrl}
                      alt="New map preview"
                      style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                )}

                {/* Existing uploaded school map */}
                {banners.school_map_url && !schoolMapFile && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(186,85,211,0.04)', borderRadius: '6px', border: '1px solid rgba(186,85,211,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>ภาพแผนที่ปัจจุบันในระบบ:</span>
                      <button
                        type="button"
                        onClick={handleRemoveSchoolMap}
                        disabled={saving}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ลบแผนที่และกลับสู่ระบบจำลอง
                      </button>
                    </div>
                    <img
                      src={banners.school_map_url}
                      alt="Current school map background"
                      style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                )}
              </div>

              {status && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(186,85,211,0.06)',
                  color: 'var(--color-primary)',
                  fontSize: '0.82rem',
                  marginBottom: '1rem'
                }}>
                  {status}
                </div>
              )}

              {userRole === 'admin' && (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={16} /> บันทึกตั้งค่าแบนเนอร์
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Goodness Management Panel */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              ❤️ จัดการบันทึกแบ่งปันความดีงาม (คุณธรรมนำชีวิต)
            </h4>

            {/* Create Goodness Form */}
            {['admin', 'rspg_board', 'teacher'].includes(userRole) && (
              <form onSubmit={handleAddGoodness} style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h5 style={{ fontWeight: 700, marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-primary)' }}>✍️ เพิ่มบันทึกแบ่งปันความดีงามใหม่</h5>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>ชื่อกิจกรรมความดีงาม</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น นักเรียน ม.1 ช่วยกันขุดหลุมเตรียมเพาะกล้าไม้"
                    value={gTitle}
                    onChange={(e) => setGTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>ชื่อผู้แบ่งปัน / กลุ่มผู้จัดทำ</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="เช่น ครูศิริพร / สภานักเรียน"
                      value={gAuthor}
                      onChange={(e) => setGAuthor(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>การดำเนินงาน</label>
                    <span style={{ display: 'block', fontSize: '0.85rem', padding: '0.45rem', backgroundColor: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      อัตโนมัติ (ขึ้นเว็บทันที)
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>รายละเอียดความดีงาม / พฤติกรรมสะท้อนคุณธรรม</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="เล่ารายละเอียด กิจกรรม ประสิทธิภาพ และสิ่งที่ผู้เรียนเรียนรู้เกี่ยวกับความรักธรรมชาติและสิ่งแวดล้อม..."
                    value={gDesc}
                    onChange={(e) => setGDesc(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-secondary" style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.82rem' }}>
                  <Plus size={14} /> เผยแพร่ความดีงาม
                </button>
              </form>
            )}

            {/* List goodness */}
            <h5 style={{ fontWeight: 700, marginBottom: '10px' }}>รายชื่อประวัติความดีงามที่เผยแพร่อยู่ ({goodness.length})</h5>
            {goodness.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                ยังไม่มีการบันทึกแบ่งปันความดีงามเข้าระบบสาธารณะ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {goodness.map(good => (
                  <div key={good.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontWeight: 700, margin: 0, fontSize: '0.88rem', color: 'var(--color-primary)' }}>{good.title}</h5>
                      <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{good.description}</p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เขียนโดย: {good.author} เมื่อ {good.date}</span>
                    </div>
                    {userRole === 'admin' && (
                      <button onClick={() => handleDeleteGoodness(good.id)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Publications Upload Card for Admin */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="var(--color-primary)" /> จัดการเอกสารเผยแพร่งานสวนพฤกษศาสตร์ (สาธารณะ)
        </h4>

        {userRole === 'admin' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }} className="rspg-progress-grid">
            {/* Upload Form */}
            <div>
              <form onSubmit={handleAddDocument} style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h5 style={{ fontWeight: 700, marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-primary)' }}>✍️ อัปโหลดเอกสารเผยแพร่ใหม่</h5>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>ชื่อเรื่อง / ชื่อเอกสาร</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น คู่มือแนะนำพืชศึกษา ปายวิทยาคาร.pdf"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Mode Switcher */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      backgroundColor: uploadMode === 'file' ? 'var(--color-primary)' : 'transparent',
                      color: uploadMode === 'file' ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Upload size={14} />
                    อัปโหลดไฟล์
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      backgroundColor: uploadMode === 'url' ? 'var(--color-primary)' : 'transparent',
                      color: uploadMode === 'url' ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Link size={14} />
                    ระบุลิงก์ URL
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>เลือกไฟล์เอกสาร (สูงสุด 10MB สำหรับ PDF/อื่นๆ)</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={handlePublicDocChange}
                      required={uploadMode === 'file'}
                      style={{ padding: '0.35rem 0.5rem' }}
                    />
                    {docFile && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          ขนาดไฟล์: {(docFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                        {docFile.type.startsWith('image/') && (
                          <div style={{ marginTop: '5px' }}>
                            <img
                              src={URL.createObjectURL(docFile)}
                              alt="Doc Preview"
                              style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>ที่อยู่ลิงก์เอกสาร (URL)</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://drive.google.com/..."
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        required={uploadMode === 'url'}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>ขนาดไฟล์ (ระบุเอง เช่น 2.1 MB หรือ ลิงก์ภายนอก)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="เช่น 1.5 MB หรือ Google Drive"
                        value={docSize}
                        onChange={(e) => setDocSize(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="btn btn-primary"
                  style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.82rem', width: '100%', justifyContent: 'center' }}
                >
                  <Plus size={14} /> {uploadingDoc ? 'กำลังบันทึก...' : 'บันทึกเอกสารเผยแพร่'}
                </button>
              </form>
            </div>

            {/* List and Deletion */}
            <div>
              <h5 style={{ fontWeight: 700, marginBottom: '10px' }}>รายการเอกสารเผยแพร่ปัจจุบัน ({publicDocs.length})</h5>
              {publicDocs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยังไม่มีเอกสารดาวน์โหลดเพิ่มเติมในระบบ (คุณสามารถกรอกฟอร์มทางด้านซ้ายเพื่อเพิ่มเอกสารใหม่ได้)
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {publicDocs.map(item => (
                    <div key={item.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <FileText size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }} title={item.title}>{item.title}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ไฟล์: {item.file_name} ({item.file_size})</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteDocument(item.id)} className="btn btn-secondary" style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem' }}>
            เฉพาะผู้ดูแลระบบหลักเท่านั้นที่เข้าถึงหน้าอัปโหลดเอกสารเผยแพร่ประชาสัมพันธ์ได้
          </div>
        )}
      </div>

      {/* Public Release Manager Section */}
      <div style={{ marginTop: '2rem' }}>
        <PublicReleaseManager userRole={userRole} />
      </div>

      {/* Survey Results Section */}
      <div style={{ marginTop: '2rem' }}>
        <SurveyResultsManager userRole={userRole} />
      </div>
    </div>
  );
}
