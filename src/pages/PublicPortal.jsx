import { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Sprout, BookOpen, Download, Image, Search, QrCode, Grid, Award, FileText,
  Heart, Users, MapPin, ClipboardList, X, Trash2, Plus, Link, Upload, Shield, Sparkles
} from 'lucide-react';
import Portfolio from './Portfolio';
import PlantStudy from './PlantStudy';

export default function PublicPortal({ onSelectPlant, isLoggedIn, userRole, setActiveTab, setViewMode }) {
  const [activeSubTab, setActiveSubTab] = useState('home');
  const [plantsList, setPlantsList] = useState([]);
  const [goodnessList, setGoodnessList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [banners, setBanners] = useState({
    title: 'สวนพฤกษศาสตร์โรงเรียนปายวิทยาคาร',
    subtitle: 'สนองพระราชดำริโครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ (อพ.สธ.)',
    banner_url: './school-banner.jpg',
    welcome_text: 'ยินดีต้อนรับสู่ระบบงานสวนพฤกษศาสตร์โรงเรียน แหล่งเรียนรู้ บ่มเพาะเยาวชน และรักษาสรรพสิ่งรอบตัว'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [qrLookupResult, setQrLookupResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localResourcesList, setLocalResourcesList] = useState([]);
  const [publicDocs, setPublicDocs] = useState([]);
  const [viewSheetStructure, setViewSheetStructure] = useState(null); // 'nature_life' | 'interconnected' | 'benefit_humanity' | null
  const [activeWorksheetSubTab, setActiveWorksheetSubTab] = useState(0); // active sub-tab index inside the modal

  useEffect(() => {
    async function loadPublicData() {
      if (!isFirebaseConfigured() || !db) {
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch public plants (is_public == true or all plants as fallback)
        const plantsSnap = await getDocs(collection(db, 'plants'));
        const plantsData = [];
        plantsSnap.forEach(d => {
          const data = d.data();
          if (data.is_public !== false) {
            plantsData.push({ id: d.id, ...data });
          }
        });
        setPlantsList(plantsData);

        // 2. Fetch goodness logs
        const goodnessSnap = await getDocs(collection(db, 'rspg_goodness'));
        const goodnessData = [];
        goodnessSnap.forEach(d => {
          goodnessData.push({ id: d.id, ...d.data() });
        });
        setGoodnessList(goodnessData.length ? goodnessData : [
          { id: '1', title: 'ปลูกฝังจิตสำนึกรักธรรมชาติให้นักเรียน ม.ต้น', description: 'กิจกรรมบูรณาการวิชาวิทยาศาสตร์ร่วมกับวิชาศิลปะเพื่อวาดภาพลายเส้นใบไม้', author: 'ครูศิริพร ใจงาม', date: '2569-05-12' },
          { id: '2', title: 'ขยายพันธุ์และรักษากัลปพฤกษ์ประจำโรงเรียน', description: 'นักเรียนแกนนำนำเมล็ดกัลปพฤกษ์มาทำการเพาะชำในโรงเรือนเกษตรเพื่อนำไปปลูกในชุมชน', author: 'นักเรียนแกนนำเกษตร', date: '2569-05-20' }
        ]);

        // 3. Fetch public teacher lessons/activities
        const actSnap = await getDocs(collection(db, 'rspg_learning_activities'));
        const actData = [];
        actSnap.forEach(d => {
          actData.push({ id: d.id, ...d.data() });
        });
        setActivitiesList(actData.length ? actData : [
          { id: '1', title: 'การศึกษาพืชศึกษา: กัลปพฤกษ์', subject_type: 'พืชศึกษา', creator: 'ครูสมเจตน์ สังข์ทอง', date: '2569-05-10', plans_url: '#' },
          { id: '2', title: 'การบูรณาการ 3 สาระการเรียนรู้ในระดับชั้น ม.5', subject_type: '3 สาระการเรียนรู้', creator: 'ครูศิริพร ใจงาม', date: '2569-05-18', plans_url: '#' }
        ]);

        // 4. Fetch custom banner if exists
        const bannerSnap = await getDocs(collection(db, 'rspg_banners'));
        if (!bannerSnap.empty) {
          setBanners(bannerSnap.docs[0].data());
        }

        // 5. Fetch local resources
        const resSnap = await getDocs(collection(db, 'local_resources'));
        const resData = [];
        resSnap.forEach(d => {
          resData.push({ id: d.id, ...d.data() });
        });
        setLocalResourcesList(resData);

        // 6. Fetch public documents
        const docsSnap = await getDocs(collection(db, 'rspg_public_docs'));
        const docsData = [];
        docsSnap.forEach(d => {
          docsData.push({ id: d.id, ...d.data() });
        });
        setPublicDocs(docsData);

      } catch (err) {
        console.error('Error loading public portal data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, []);

  const handleQrLookup = () => {
    if (!qrCodeInput) return;
    const match = plantsList.find(p => p.plant_code === qrCodeInput || p.id === qrCodeInput || p.thai_name.includes(qrCodeInput));
    if (match) {
      setQrLookupResult(match);
    } else {
      setQrLookupResult('not_found');
    }
  };

  const renderWorksheetStructure = () => {
    if (!viewSheetStructure) return null;

    // Define colors and content based on active strand
    let strandName = '';
    let themeColor = '';
    let icon = '';
    let worksheets = [];
    let principle = '';
    let objectives = [];
    let outcomes = [];

    if (viewSheetStructure === 'nature_life') {
      strandName = 'สาระการเรียนรู้ ธรรมชาติแห่งชีวิต (06)';
      themeColor = 'var(--color-nature)';
      icon = '🌱';
      principle = 'รู้การเปลี่ยนแปลง รู้ความแตกต่าง รู้ชีวิต';
      objectives = [
        'เพื่อให้รู้ถึงลักษณะทางชีววิทยา รู้วงจรชีวิตของพืช',
        'เพื่อนำข้อมูลที่ได้จากการเรียนรู้ มาเปรียบเทียบกับชีวิต',
        'เพื่อเป็นฐานข้อมูลในการเรียนรู้ทางนิเวศวิทยา และการค้นหาศักยภาพ'
      ];
      outcomes = [
        'วิชาการ: พฤกษศาสตร์ (ลักษณะพรรณไม้), ชีววิทยา (วงจรชีวิต), นิเวศวิทยา (ถิ่นอาศัย), สรีรวิทยา (การเจริญเติบโต), ศิลปะ (การวาดภาพ)',
        'ภูมิปัญญา: การสร้างองค์ความรู้ใหม่และการจัดการชีวิต เข้าใจชีวิต',
        'คุณธรรม: ความซื่อตรงในการศึกษา รายงานผลตามจริง มีระเบียบรอบคอบ และมีความอดทนต่อสภาพแวดล้อม'
      ];
      worksheets = [
        {
          title: 'ใบงานที่ 1: การวิเคราะห์รูปลักษณ์ของพืช',
          objective: 'เพื่อให้ทราบส่วนประกอบภายนอกของพืช และสามารถอธิบายโครงสร้างภายนอกได้',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชื่อพืชศึกษา</span>
                  <div style={{ borderBottom: '1px dotted var(--border-color)', minHeight: '1.8rem', padding: '4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    ตัวอย่าง: กัลปพฤกษ์ (Cassia bakeriana Craib)
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>วันที่ศึกษา / สถานที่</span>
                  <div style={{ borderBottom: '1px dotted var(--border-color)', minHeight: '1.8rem', padding: '4px 0', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    สวนพฤกษศาสตร์หน้าอาคารเรียนวิทยาศาสตร์
                  </div>
                </div>
              </div>

              <div style={{ border: '1.5px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(129, 199, 132, 0.04)' }}>
                <Image size={36} color="var(--color-nature)" style={{ margin: '0 auto 10px auto' }} />
                <h6 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 6px 0' }}>กล่องวาดภาพหลัก: โครงสร้างและส่วนประกอบภายนอกทั้งหมด</h6>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  แสดงตำแหน่งการจัดวางของ ราก ลำต้น ใบ ดอก ผล และเมล็ด ของพืชที่กำลังศึกษา
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {['ส่วนของราก', 'ส่วนของลำต้น', 'ส่วนของใบ', 'ส่วนของดอก', 'ส่วนของผล', 'ส่วนของเมล็ด'].map((part, i) => (
                  <div key={i} style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: 'var(--bg-main)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>{part}</span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(128,128,128,0.06)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🔍</div>
                  </div>
                ))}
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 2: ด้านรูปลักษณ์ (ชีววิทยา)',
          objective: 'เพื่อให้ได้ข้อมูลและวงจรการเปลี่ยนแปลงด้านรูปลักษณ์ของพืช พร้อมวิเคราะห์เปรียบเทียบกับวงจรชีวิตตนเอง',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>2.1 การศึกษารูปลักษณ์พืชเชิงวิทยาศาสตร์ (บันทึก 10 ซ้ำเพื่อหาความหลากหลาย)</h6>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>ออกแบบตารางบันทึก ขนาดใบ, สีใบ, จำนวนกลีบดอก, ความหนาของลำต้น ฯลฯ</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '6px', textAlign: 'center' }}>ครั้งที่ (ซ้ำ)</th>
                        <th style={{ padding: '6px', textAlign: 'left' }}>ส่วนที่ศึกษา (เช่น ใบ)</th>
                        <th style={{ padding: '6px', textAlign: 'left' }}>ขนาด (กว้าง x ยาว)</th>
                        <th style={{ padding: '6px', textAlign: 'left' }}>สี / ผิวสัมผัส</th>
                        <th style={{ padding: '6px', textAlign: 'left' }}>ลักษณะรูปทรง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map(row => (
                        <tr key={row} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{row}</td>
                          <td style={{ padding: '6px', color: 'var(--text-muted)' }}>ใบพืชย่อยบริเวณกลางกิ่ง</td>
                          <td style={{ padding: '6px', color: 'var(--text-muted)' }}>{3 + row} ซม. x {8 + row} ซม.</td>
                          <td style={{ padding: '6px', color: 'var(--text-muted)' }}>เขียวเข้ม ผิวเรียบมัน</td>
                          <td style={{ padding: '6px', color: 'var(--text-muted)' }}>รูปหอกสลิม</td>
                        </tr>
                      ))}
                      <tr style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        <td colSpan="5" style={{ padding: '6px', textAlign: 'center' }}>... บันทึกอย่างน้อย 10 ซ้ำเพื่อหาค่าทางสถิติ ...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>2.2 ข้อมูลการเปลี่ยนแปลงตามช่วงอายุ</h6>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                    <li><strong>ช่วงวัยอ่อน:</strong> แผ่นใบสีเขียวอ่อนนิ่ม, กิ่งก้านเปราะบางสีเขียวอมน้ำตาล</li>
                    <li><strong>ช่วงเจริญวัย:</strong> แผ่นใบเขียวเข้มหนาแก่อบเชย, ลำต้นเริ่มมีเปลือกสีเทาขรุขระ</li>
                    <li><strong>ช่วงร่วงโรย:</strong> ใบเปลี่ยนเป็นสีเหลืองแห้งน้ำตาลกรอบและร่วงหล่น</li>
                  </ul>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>2.3 การเปรียบเทียบกับการเปลี่ยนแปลงของตนเอง</h6>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.4, margin: 0 }}>
                     "ร่างกายของมนุษย์เราก็เหมือนพืช จากวัยทารกที่เปราะบางสู่เจริญวัยที่มีเรี่ยวแรง และก้าวสู่วัยชราที่ร่วงโรย การเห็นพืชทำให้เข้าใจถึงความเป็นธรรมดาของชีวิตที่ต้องมีการเจริญเติบโตและเสื่อมถอย"
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-nature)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(129, 199, 132, 0.05)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 4px 0' }}>2.4 สรุปคติชีวิตและการประยุกต์ใช้</h6>
                <p style={{ fontSize: '0.78rem', fontStyle: 'italic', margin: 0, color: 'var(--text-main)' }}>
                  "การตระหนักรู้ในความเปลี่ยนแปลงของรูปกาย ไม่ยึดติดในรูปลักษณ์ภายนอก และเตรียมพร้อมรับมือกับการเปลี่ยนแปลงในแต่ละช่วงวัยด้วยใจที่สงบและรู้เท่าทัน"
                </p>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 3: ด้านคุณสมบัติ',
          objective: 'เพื่อให้ได้ข้อมูลด้านคุณสมบัติ (กลิ่น, รส, เสียง, ความเหนียว, ลอยน้ำ) และนำมาประยุกต์เปรียบเทียบกับนิสัย/ความสามารถตน',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>3.1 การเรียนรู้คุณสมบัติของชีวภาพ (พืชที่ศึกษา)</h6>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>รสชาติใบ/เปลือก:</strong> รสฝาดและขมเล็กน้อย (มีแทนนินป้องกันแมลง)</div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>กลิ่นดอก:</strong> กลิ่นหอมระเหยอ่อนๆ ช่วยล่อแมลงผสมเกสร</div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>ความเหนียวเนื้อไม้:</strong> กิ่งเหนียวยืดหยุ่นสูงทนลมแรงไม่หักง่าย</div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}><strong>การอุ้มน้ำ/ลอยน้ำ:</strong> เมล็ดแห้งเบาลอยน้ำได้เพื่อแพร่พันธุ์</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>3.2 การเปลี่ยนแปลงของคุณสมบัติ</h6>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    กิ่งก้านตอนอ่อนมีความอ่อนนิ่มยืดหยุ่นสูง แต่เมื่อแก่ตัวขึ้นจะมีลิกนินสะสมแข็งแกร่งแตกหักได้ง่ายกว่าหากโดนแรงปะทะหนักๆ เปลือกด้านนอกหนาขึ้นเพื่อปกป้องท่อน้ำเลี้ยง
                  </p>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>3.3 การเปรียบเทียบกับชีวิตตนเอง</h6>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.4, margin: 0 }}>
                    "ความยืดหยุ่นทนลมของกิ่งกัลปพฤกษ์ เปรียบเสมือนความอดทนและการปรับตัวตามสถานการณ์ ไม่แข็งทื่อจนเกินไปจนหักกลางคันเมื่อเจอกระแสลมแรง (วิกฤตชีวิต) แต่ก็ไม่เปราะบางเกินไปจนล้มลง"
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-nature)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(129, 199, 132, 0.05)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 4px 0' }}>3.4 สรุปคติชีวิตและการประยุกต์ใช้</h6>
                <p style={{ fontSize: '0.78rem', fontStyle: 'italic', margin: 0, color: 'var(--text-main)' }}>
                  "การสะสมคุณงามความดี (ความแข็งแกร่ง) ควบคู่กับความโอนอ่อนผ่อนตามเหตุปัจจัย (ความยืดหยุ่น) จะทำให้ชีวิตสามารถผ่านพ้นมรสุมปัญหาไปได้ด้วยดี"
                </p>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 4: ด้านพฤติกรรม',
          objective: 'เพื่อให้เรียนรู้วิธีการเก็บข้อมูลด้านพฤติกรรม (การหุบ บาน เหี่ยว ร่วง) ต่อสิ่งเร้าภายนอกและเปรียบเทียบกับการควบคุมสติอารมณ์ตน',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>4.1 พฤติกรรมการตอบสนองต่อสิ่งเร้า (สรีรวิทยา)</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <strong>พฤติกรรมตอบสนองแสงแดด:</strong><br/>
                    ใบจะกางออกรับแสงแดดอย่างเต็มที่ในช่วงเช้าเพื่อสังเคราะห์แสง และลู่เอียงขนานลงเล็กน้อยในช่วงแดดจัดเที่ยงวันเพื่อลดการสูญเสียน้ำ
                  </div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <strong>พฤติกรรมตอบสนองต่อปริมาณน้ำ:</strong><br/>
                    ในฤดูแล้งพืชจะสลัดใบร่วงจนหมดต้นเพื่อประคองตัวรักษาน้ำเลี้ยงในลำต้นให้อยู่รอด และจะผลิใบออกดอกบานสะพรั่งเมื่อเริ่มเข้าสู่ฤดูฝน
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>4.2 ข้อมูลการเปลี่ยนแปลงด้านพฤติกรรมตามรอบเวลา</h6>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                    ความสามารถในการฟื้นฟูตนเองอย่างรวดเร็วหลังผ่านแล้ง เมื่อได้น้ำเพียงไม่กี่วันตาใบอ่อนจะตอบสนองโดยการแบ่งเซลล์อย่างรวดเร็วเพื่อผลักใบใหม่ออกมาทำหน้าที่สังเคราะห์อาหาร
                  </p>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>4.3 การเปรียบเทียบกับชีวิตตนเอง</h6>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.4, margin: 0 }}>
                    "เมื่อพืชพบภัยธรรมชาติที่แห้งแล้ง มันรู้ว่าต้อง 'สลัดใบ' เพื่อประหยัดพลังงานให้อยู่รอด ชีวิตคนเราเมื่อเจอความทุกข์หนักหรือเรื่องกดดัน บางครั้งก็ต้องรู้จัก 'ปล่อยวาง' สิ่งฟุ่มเฟือยหรืออารมณ์ขุ่นมัวชั่วคราวเพื่อปกป้องสติและการดำเนินชีวิตหลัก"
                  </p>
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-nature)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(129, 199, 132, 0.05)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 4px 0' }}>4.4 สรุปคติชีวิตและการประยุกต์ใช้</h6>
                <p style={{ fontSize: '0.78rem', fontStyle: 'italic', margin: 0, color: 'var(--text-main)' }}>
                  "การมีไหวพริบรู้จังหวะในการรุกและถอย การปรับเปลี่ยนพฤติกรรมให้สอดคล้องกับวิกฤตการณ์ภายนอกอย่างสงบเสงี่ยม"
                </p>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 5: การสรุปองค์รวมธรรมชาติแห่งชีวิต',
          objective: 'เพื่อวิเคราะห์สรุปผลภาพรวมความสัมพันธ์ระหว่าง รูปลักษณ์ คุณสมบัติ และพฤติกรรม นำมากลั่นกรองเป็นคติชีวิตที่ยั่งยืน',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-nature)', margin: '0 0 8px 0' }}>แผนภาพเชื่อมโยงธรรมชาติแห่งชีวิต</h6>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>วิเคราะห์ความสัมพันธ์แบบพึ่งพาซึ่งกันและกันภายในตัวพืชเอง</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(129, 199, 132, 0.04)' }}>
                    <strong style={{ color: 'var(--color-nature)' }}>รูปลักษณ์ภายนอก</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>ใบรูปไข่สลิมกว้าง แตกพุ่มกลม</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(129, 199, 132, 0.04)' }}>
                    <strong style={{ color: 'var(--color-nature)' }}>คุณสมบัติเฉพาะ</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>กิ่งก้านเหนียว ยืดหยุ่นทนทานลม</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(129, 199, 132, 0.04)' }}>
                    <strong style={{ color: 'var(--color-nature)' }}>พฤติกรรมสนองเร้า</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>สลัดใบทิ้งช่วงหน้าแล้ง ดอกบานหลังฝน</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '15px 0', fontSize: '1.2rem', color: 'var(--color-nature)' }}>⬇️</div>

                <div style={{ padding: '12px', border: '1px dashed var(--color-nature)', borderRadius: '8px', backgroundColor: 'var(--bg-main)', textAlign: 'center' }}>
                  <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>บทสรุปคติสอนใจแบบบูรณาการ</strong>
                  <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--text-main)' }}>
                    "พืชพรรณดำรงชีพอยู่ได้เพราะทุกภาคส่วนสอดประสานกัน รูปลักษณ์ที่กางใบรับแดด กิ่งที่ทนลม และพฤติกรรมสลัดใบรักษาน้ำ ทั้งหมดคือความเป็นหนึ่งเดียวเพื่อการอยู่รอด ตัวเราก็ต้องประสานทั้งกาย วาจา และใจให้กลมกลืนเป็นหนึ่งเดียวเพื่อชีวิตที่ดีงาม"
                  </span>
                </div>
              </div>
            </div>
          )
        }
      ];
    } else if (viewSheetStructure === 'interconnected') {
      strandName = 'สาระการเรียนรู้ สรรพสิ่งล้วนพันเกี่ยว (07)';
      themeColor = 'var(--color-primary)';
      icon = '🕸️';
      principle = 'รู้ปฏิสัมพันธ์ รู้ความเชื่อมโยง รู้ความสมดุล';
      objectives = [
        'เพื่อให้รู้วิธีการเก็บข้อมูลระหว่างพืชกับปัจจัยชีวภาพ (สิ่งมีชีวิต) และกายภาพ (สิ่งไม่มีชีวิต) รอบข้าง',
        'เพื่อให้รู้ปฏิสัมพันธ์ ความพันเกี่ยวกันอย่างเป็นระบบนิเวศย่อยของพืชพรรณนั้นๆ',
        'เพื่อเป็นโครงสร้างการเรียนรู้คุณค่าและดุลยภาพความสัมพันธ์ของธรรมชาติในชุมชน'
      ];
      outcomes = [
        'วิชาการ: นิเวศวิทยาเชิงระบบ, สรีรวิทยาการปรับตัวสิ่งมีชีวิต, แผนผังทิศทางเชิงมิติสัมพันธ์, วิทยากายภาพสิ่งแวดล้อม',
        'ภูมิปัญญา: ทักษะการคิดวิเคราะห์อย่างเป็นระบบ (System Thinking) และเข้าใจห่วงโซ่แห่งผลลัพธ์',
        'คุณธรรม: จิตสำนึกปกป้องความหลากหลายทางชีวภาพและทรัพยากรธรรมชาติ'
      ];
      worksheets = [
        {
          title: 'ใบงานที่ 1: เรียนรู้ความเกี่ยวพันของปัจจัย',
          objective: 'เพื่อบันทึกและจำแนกข้อมูลความสัมพันธ์ระหว่างพืชศึกษากับสิ่งมีชีวิต (ชีวภาพ) และไม่มีชีวิต (กายภาพ) รอบตัว',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>1.1 บันทึกปัจจัยชีวภาพ (สิ่งมีชีวิต)</h6>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '4px', textAlign: 'left' }}>ชื่อสิ่งมีชีวิต</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>ตำแหน่ง / เวลา</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>พฤติกรรมการเกี่ยวพัน</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '4px', fontWeight: 600 }}>มดดำเจาะรู</td>
                          <td style={{ padding: '4px' }}>โคนต้นพืช / 10:15</td>
                          <td style={{ padding: '4px', color: 'var(--text-muted)' }}>ทำรังใต้เปลือกและขนส่งเพลี้ยแป้ง</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '4px', fontWeight: 600 }}>นกกินปลีอกเหลือง</td>
                          <td style={{ padding: '4px' }}>ยอดกิ่งดอก / 11:30</td>
                          <td style={{ padding: '4px', color: 'var(--text-muted)' }}>ดูดน้ำหวานจากเกสรดอกพร้อมผสมเกสร</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>1.2 บันทึกปัจจัยกายภาพ (สิ่งไม่มีชีวิต)</h6>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '4px', textAlign: 'left' }}>ปัจจัยกายภาพ</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>จุดที่สัมผัส</th>
                          <th style={{ padding: '4px', textAlign: 'left' }}>ลักษณะความเกี่ยวพัน</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '4px', fontWeight: 600 }}>แสงแดดจัด</td>
                          <td style={{ padding: '4px' }}>ทรงพุ่มด้านทิศใต้</td>
                          <td style={{ padding: '4px', color: 'var(--text-muted)' }}>กระตุ้นการสังเคราะห์แสงและทำให้ใบเหี่ยวบ่าย</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '4px', fontWeight: 600 }}>ดินร่วนปนเหนียว</td>
                          <td style={{ padding: '4px' }}>รอบบริเวณโคนราก</td>
                          <td style={{ padding: '4px', color: 'var(--text-muted)' }}>ยึดเกาะของราก แหล่งเก็บน้ำและแร่ธาตุหลัก</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div style={{ border: '1.5px dashed var(--border-color)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', backgroundColor: 'rgba(167, 139, 250, 0.04)' }}>
                <MapPin size={28} color="var(--color-primary)" style={{ margin: '0 auto 8px auto' }} />
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px 0' }}>1.3 แผนผังแสดงทิศทางและตำแหน่งความเกี่ยวพัน</h6>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                  วาดวงกลมรัศมี 3 เมตรจำลองพืชเป็นศูนย์กลาง วาดระบุตำแหน่งทิศ เหนือ (N), ใต้ (S), ตะวันออก (E), ตะวันตก (W) ของสิ่งเร้าต่างๆ เช่น แหล่งน้ำ, หินก้อนใหญ่, ต้นไม้อื่น, รังมด
                </p>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 2: วิเคราะห์รูปลักษณ์ปัจจัยพันเกี่ยว',
          objective: 'เพื่อให้เรียนรู้วิธีการบันทึก วิเคราะห์โครงสร้างและการปรับตัวทางกายภาพ/สัณฐานของปัจจัยที่เข้ามามีส่วนร่วม',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>2.1 วิเคราะห์รูปลักษณ์ของชีวภาพที่เกี่ยวพัน (เช่น สัตว์/แมลง)</h6>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                    <li><strong>ชื่อสิ่งมีชีวิต:</strong> หนอนผีเสื้อจรวด</li>
                    <li><strong>สัณฐานวิเคราะห์:</strong> ลำต้นสีเขียวขจีขนานกับใบ มีแถบลายตาปลอมด้านหลังเพื่อขู่ศัตรู ปากเป็นแบบกัดกินใบไม้ทำลายเนื้อเยื่อพืช</li>
                    <li><strong>ภาพวิเคราะห์โครงสร้าง:</strong> มีปุ่มดูดสีขาว 8 คู่ยึดเกาะกิ่งเหนียวแน่นป้องกันกระแสลมพัดร่วง</li>
                  </ul>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>2.2 วิเคราะห์รูปลักษณ์ของกายภาพที่เกี่ยวพัน (เช่น ดิน/หิน)</h6>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                    <li><strong>ปัจจัยกายภาพ:</strong> ดินร่วนปนทรายใต้โคนพืช</li>
                    <li><strong>สัณฐานวิเคราะห์:</strong> เม็ดดินมีขนาดหยาบคละละเอียด สีดำน้ำตาลคล้ำ มีซากใบไม้ผุพังปะปนสูง (Humus)</li>
                    <li><strong>คุณลักษณะเด่น:</strong> มีโพรงอากาศปานกลาง ระบายน้ำดีแต่เก็บกักน้ำได้ระดับหนึ่ง มีความชื้นจับตัวเมื่อขุดลึกลงไป 5 ซม.</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 3: เรียนรู้ธรรมชาติของปัจจัยศึกษาย่อย',
          objective: 'ศึกษาลึกลงรายละเอียดในคุณสมบัติ พฤติกรรมเฉพาะ และการปรับตัวทางนิเวศวิทยาของตัวร่วมชีวภาพ/กายภาพ',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>3.1 ศึกษาธรรมชาติชีวภาพอื่น (ตัวอย่าง: สัตว์ที่เข้ามาทำรัง)</h6>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>วิเคราะห์ความเปราะบาง ความสามารถ และวงจรชีวิตของสัตว์นั้นๆ ร่วมกับต้นไม้</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.72rem' }}>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(167, 139, 250, 0.02)' }}>
                    <strong>รูปลักษณ์:</strong> นกขนาดเล็กสีเหลืองหม่น ปีกสีเทาดำ ปากยาวโค้งแหลมเหมาะเจาะดอกไม้
                  </div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(167, 139, 250, 0.02)' }}>
                    <strong>คุณสมบัติเฉพาะ:</strong> ตัวเบามาก บินได้เร็ว มีอัตราการเต้นหัวใจสูงสร้างอุณหภูมิอบอุ่น
                  </div>
                  <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(167, 139, 250, 0.02)' }}>
                    <strong>พฤติกรรมสัมพันธ์:</strong> ตื่นตัวส่งเสียงร้องเตือนภัยเมื่อมีภัยเข้ามาใกล้โคนต้นไม้
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 4: เรียนรู้ธรรมชาติของความพันเกี่ยว',
          objective: 'วิเคราะห์รูปแบบปฏิสัมพันธ์เชิงลึก (การเกื้อกูล การทำลาย การอิงอาศัย) และเขียนข่ายใยสัมพันธ์ระบบนิเวศ',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>วิเคราะห์ปฏิสัมพันธ์ความพันเกี่ยวเชิงลึก</h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: 'rgba(76,175,80,0.05)', borderLeft: '3px solid #4CAF50' }}>
                    <strong>ความเกี่ยวพันแบบพึ่งพาอิงอาศัย (+, + หรือ +, 0):</strong> ต้นไม้ให้แหล่งที่อยู่อาศัยหลบภัยของนก และเป็นแหล่งน้ำหวาน นกช่วยต้นไม้ผสมเกสรข้ามต้นเพื่อการสืบพันธุ์ที่หลากหลาย
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: 'rgba(244,67,54,0.05)', borderLeft: '3px solid #F44336' }}>
                    <strong>ความเกี่ยวพันแบบผู้ล่า-เหยื่อ หรือปรสิต (+, -):</strong> หนอนผีเสื้อกัดกินใบอ่อนรบกวนการปรุงอาหารของต้นไม้ แต่นกก็มาจับหนอนกินเพื่อควบคุมประชากรไม่ให้พุ่มใบเสียหายหนัก
                  </div>
                </div>
              </div>

              <div style={{ border: '1px dashed var(--color-primary)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)', textAlign: 'center' }}>
                <h6 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 10px 0' }}>ใยอาหารจำลอง (Ecosystem Food Web)</h6>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'white' }}>พืชศึกษา (ผู้ผลิต)</span>
                  <span>➡️</span>
                  <span style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'white' }}>หนอนผีเสื้อ (ผู้บริโภคพืช)</span>
                  <span>➡️</span>
                  <span style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'white' }}>นกกินแมลง (ผู้ล่า)</span>
                  <span>➡️</span>
                  <span style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'white' }}>แบคทีเรีย/เชื้อราในดิน (ผู้ย่อยสลาย)</span>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 5: ดุลยภาพของความพันเกี่ยว',
          objective: 'วิเคราะห์ผลกระทบและการรักษาสมดุลของระบบนิเวศ หากตัวแปรสำคัญตัวใดตัวหนึ่งเสียหายหรือถูกดึงออกไป',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px 0' }}>คำถามวิเคราะห์ดุลยภาพและสมดุลนิเวศ</h6>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
                  <div>
                    <strong style={{ color: 'var(--color-danger)' }}>ประเด็นสมมติ:</strong> "หากดินรอบต้นไม้เกิดความแข็งกระด้างหรือขาดสารอาหารเนื่องจากการราดปูนทับล้อมโคน จะส่งผลกระทบต่อสิ่งมีชีวิตอื่นอย่างไร?"
                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', marginTop: '4px', color: 'var(--text-main)' }}>
                      "หากโคนรากถูกทับ ดินจะขาดโพรงอากาศและน้ำซึมไม่ได้ รากฝอยจะค่อยๆ เน่าตาย ต้นไม้จะขาดสารอาหารและน้ำใบเหี่ยวแห้ง เมื่อไม่มีใบ หนอนก็ไม่มีอาหารกิน ส่งผลให้นกไม่มีตัวหนอนให้จับเป็นอาหารและย้ายถิ่นฐานหนีไป ดุลยภาพนิเวศรอบต้นไม้จะล่มสลายลง"
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(167, 139, 250, 0.05)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 4px 0' }}>สรุปองค์ความรู้เรื่องความพันเกี่ยวในชีวิตมนุษย์</h6>
                <p style={{ fontSize: '0.78rem', fontStyle: 'italic', margin: 0, color: 'var(--text-main)' }}>
                  "สรรพสิ่งในธรรมชาติรวมถึงตัวเราต่างพึ่งพาอาศัยกัน ไม่มีผู้ใดดำรงชีพอยู่ได้โดยโดดเดี่ยว การเคารพสิทธิ์ของสิ่งมีชีวิตและเกื้อกูลชุมชนรอบตัวจึงเป็นหัวใจของการรักษาสมดุลสังคมอย่างยั่งยืน"
                </p>
              </div>
            </div>
          )
        }
      ];
    } else if (viewSheetStructure === 'benefit_humanity') {
      strandName = 'สาระการเรียนรู้ ประโยชน์แท้แก่มหาชน (08)';
      themeColor = 'var(--color-gold)';
      icon = '🏛️';
      principle = 'รู้ความต้องการ รู้ทักษะวิชาการ รู้การสรรค์สร้างแก่มหาชน';
      objectives = [
        'เพื่อให้รู้จักการคิดสกัดเอาศักยภาพธรรมชาติของพืชพรรณออกมาใช้ประโยชน์อย่างสร้างสรรค์',
        'เพื่อเรียนรู้กระบวนการจินตนาการเห็นคุณค่า และพัฒนาแนวคิดนวัตกรรมเชิงสาธารณประโยชน์',
        'เพื่อบูรณาการความรู้พฤกษศาสตร์มาพัฒนาทักษะวิชาชีพและคุณธรรมการทำเพื่อส่วนรวม'
      ];
      outcomes = [
        'วิชาการ: การสกัดศักยภาพพืช, การออกแบบบรรจุภัณฑ์/ผลิตภัณฑ์ (Product Development), การเขียนแผนงานโครงงานสาธารณะ',
        'ภูมิปัญญา: ความคิดสร้างสรรค์เชิงนวัตกรรมและการแก้ไขปัญหาท้องถิ่นตามศักยภาพที่มีอยู่',
        'คุณธรรม: จิตสาธารณะ มุ่งมั่นทำงานเพื่อประโยชน์สูงสุดแก่ชุมชนและมวลมนุษยชาติ'
      ];
      worksheets = [
        {
          title: 'ใบงานที่ 1: วิเคราะห์และสกัดศักยภาพพืช',
          objective: 'ระดมความคิดและค้นคว้าเพื่อสกัดศักยภาพเด่น 5 ข้อในแต่ละด้าน (รูปลักษณ์, คุณสมบัติ, พฤติกรรม) ของพืชที่ศึกษา',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.72rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 6px 0' }}>1.1 ศักยภาพด้านรูปลักษณ์</h6>
                  <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <li>ดอกสีชมพูขาวสะพรั่งใช้เป็นไม้ตกแต่งทัศนียภาพโรงเรียน</li>
                    <li>รูปทรงกิ่งแผ่กว้างให้ร่มเงาแก่นักเรียนนั่งพักผ่อน</li>
                    <li>เปลือกลำต้นมีลายไม้ขรุขระใช้สร้างงานพิมพ์ศิลปะ</li>
                    <li>ทรงพุ่มรูปไข่สม่ำเสมอเป็นแนวเขตป้องกันทิศทางลม</li>
                    <li>เมล็ดแข็งขนาดพอเหมาะประดิษฐ์เป็นลูกปัดเครื่องประดับ</li>
                  </ol>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 6px 0' }}>1.2 ศักยภาพด้านคุณสมบัติ</h6>
                  <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <li>เนื้อไม้มีความแข็งเหนียวใช้แกะสลักพวงกุญแจที่ระลึก</li>
                    <li>ยางจากกิ่งไม้ช่วยลดรอยบวมจากการกัดของแมลง</li>
                    <li>สารสกัดแทนนินในเปลือกช่วยย้อมสีผ้าฝ้ายธรรมชาติ</li>
                    <li>น้ำมันสกัดดอกแห้งให้กลิ่นผ่อนคลายทำเทียนหอม</li>
                    <li>ใบรสฝาดอ่อนนำมาต้มทำสมุนไพรไล่แมลงพืชสวน</li>
                  </ol>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 6px 0' }}>1.3 ศักยภาพด้านพฤติกรรม</h6>
                  <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <li>เจริญเติบโตได้ดีแม้แดดแรงและทนทานความแห้งแล้งสูง</li>
                    <li>การผลัดใบร่วงจนหมดต้นช่วงแล้งช่วยลดขยะชีวมวลใต้ต้น</li>
                    <li>ผลิใบพร้อมดอกหลังฤดูฝนเป็นสัญญาณท่องเที่ยวของโรงเรียน</li>
                    <li>ระบบรากยึดลึกช่วยรักษาระดับการพังทลายของหน้าดินชัน</li>
                    <li>การบานของดอกพร้อมเพรียงเรียกฝูงผึ้งรักษาระบบนิเวศ</li>
                  </ol>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'ใบงานที่ 2: จินตนาการสรรค์สร้างนวัตกรรมแก่มหาชน',
          objective: 'เลือก 1 ศักยภาพเด่นมาลงมืออกแบบ พัฒนาผลิตภัณฑ์หรือบริการเชิงโครงงาน และวางแผนพัฒนาจริงเพื่อประโยชน์ชุมชน',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                  <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 8px 0' }}>2.1 การระบุคุณประโยชน์และกลุ่มเป้าหมาย</h6>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>ศักยภาพที่เลือกพัฒนา:</strong> สารสกัดสีธรรมชาติตระกูลแทนนินจากเปลือกร่วงหล่น</div>
                    <div><strong>ชื่อแนวคิดนวัตกรรม:</strong> "สีย้อมผ้าออร์แกนิก ปายสีธรรมชาติ"</div>
                    <div><strong>กลุ่มเป้าหมายผู้ใช้:</strong> ชมรมแม่บ้านหัตถกรรมชุมชนอำเภอปาย และนักเรียนในคาบวิชาศิลปะสร้างสรรค์</div>
                  </div>
                </div>

                <div style={{ border: '1px dashed var(--color-gold)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <Image size={24} color="var(--color-gold)" style={{ marginBottom: '6px' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>ภาพจำลองบรรจุภัณฑ์และการตกแต่งชิ้นงาน</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>แสดงภาพร่างขวดแก้วบรรจุน้ำยาสีย้อมลายพิมพ์พฤกษชาติบนผ้าพันคอ</span>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 8px 0' }}>2.2 แผนภาพขั้นตอนการดำเนินงาน (Action Plan)</h6>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center', fontSize: '0.7rem' }}>
                  <div style={{ border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                    <strong>ขั้นที่ 1: เตรียมวัตถุดิบ</strong><br/>เก็บรวบรวมเปลือกร่วงใต้ต้นล้างทำความสะอาดตากแห้ง
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                    <strong>ขั้นที่ 2: สกัดสีย้อม</strong><br/>ต้มเปลือกไม้แห้งด้วยน้ำร้อนจัดเพื่อสกัดแทนนินเข้มข้น
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                    <strong>ขั้นที่ 3: ทดลองย้อม</strong><br/>ย้อมลวดลายลงผ้าด้วยการมัดย้อม มัดด้วยเกลือสะกดสี
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                    <strong>ขั้นที่ 4: ส่งต่อชุมชน</strong><br/>จัดทำคู่มือสูตรสีสาธิตแจกชมรมหัตถกรรมในหมู่บ้าน
                  </div>
                </div>
              </div>

              <div style={{ border: '1.5px solid var(--color-gold)', borderRadius: '8px', padding: '1rem', backgroundColor: 'rgba(255, 193, 7, 0.04)' }}>
                <h6 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 4px 0' }}>คุณค่าและประโยชน์แท้แก่มหาชน</h6>
                <p style={{ fontSize: '0.78rem', fontStyle: 'italic', margin: 0, color: 'var(--text-main)' }}>
                  "ช่วยลดการใช้สารเคมีย้อมสีที่เป็นพิษต่อแม่น้ำปาย ปรับปรุงภูมิปัญญาชาวบ้านในการทำหัตถกรรมสร้างมูลค่าเพิ่มทางเศรษฐกิจ และสร้างจิตสำนึกให้นักเรียนเห็นว่าวัสดุธรรมชาติเหลือทิ้งในโรงเรียนสามารถนำมาพัฒนาผลิตภัณฑ์ช่วยเหลือสังคมได้จริง"
                </p>
              </div>
            </div>
          )
        }
      ];
    }

    const currentWorksheet = worksheets[activeWorksheetSubTab] || worksheets[0];

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        padding: '1rem'
      }}>
        <div className="card" style={{
          width: '90%',
          maxWidth: '850px',
          maxHeight: '90vh',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: 0
        }}>
          {/* Modal Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-main)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: themeColor, margin: 0 }}>
                  {strandName}
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>โครงสร้างและหัวข้อบันทึกใบงานทางการของ อพ.สธ.</span>
              </div>
            </div>
            <button
              onClick={() => setViewSheetStructure(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {/* Principle, Objectives & Expected Outcomes Header */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              borderRadius: '10px',
              padding: '1rem',
              borderLeft: `4px solid ${themeColor}`,
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>หลักการนำทาง</strong>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>"{principle}"</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🎯 วัตถุประสงค์หลักของวิชา</strong>
                  <ul style={{ fontSize: '0.72rem', color: 'var(--text-main)', margin: 0, paddingLeft: '1.1rem', lineHeight: 1.4 }}>
                    {objectives.map((obj, i) => <li key={i} style={{ marginBottom: '2px' }}>{obj}</li>)}
                  </ul>
                </div>
                <div>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🏆 ผลลัพธ์ที่คาดหวัง</strong>
                  <ul style={{ fontSize: '0.72rem', color: 'var(--text-main)', margin: 0, paddingLeft: '1.1rem', lineHeight: 1.4 }}>
                    {outcomes.map((out, i) => <li key={i} style={{ marginBottom: '2px' }}>{out}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Inner Sub-navigation (worksheets) */}
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              marginBottom: '1.25rem',
              whiteSpace: 'nowrap'
            }}>
              {worksheets.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveWorksheetSubTab(idx)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: activeWorksheetSubTab === idx ? 700 : 500,
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeWorksheetSubTab === idx ? themeColor : 'var(--bg-main)',
                    color: activeWorksheetSubTab === idx ? 'white' : 'var(--text-main)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {sheet.title.split(':')[0]}
                </button>
              ))}
            </div>

            {/* Active Worksheet Preview */}
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px 0', color: themeColor }}>{currentWorksheet.title}</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    <strong>เป้าหมาย:</strong> {currentWorksheet.objective}
                  </p>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: themeColor, border: `1px solid ${themeColor}`, padding: '2px 8px', borderRadius: '20px', backgroundColor: 'white' }}>
                  โครงสร้างทางการ
                </span>
              </div>

              {currentWorksheet.content}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-main)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              * ข้อมูลข้างต้นเป็นเพียงโครงสร้างย่อของกิจกรรมเพื่อการศึกษาของโรงเรียนปายวิทยาคาร
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewSheetStructure(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              >
                ปิดหน้าต่าง
              </button>
              <a
                href={
                  viewSheetStructure === 'nature_life' ? '/06_nature_life.pdf' :
                  viewSheetStructure === 'interconnected' ? '/07_interconnected.pdf' :
                  '/08_benefit_humanity.pdf'
                }
                download
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  color: 'white',
                  backgroundColor: themeColor,
                  border: 'none'
                }}
              >
                <Download size={14} /> ดาวน์โหลดเอกสารเต็ม (PDF)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredPlants = plantsList.filter(p =>
    p.thai_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.scientific_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.plant_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Admin Document Management States
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docUrl, setDocUrl] = useState('');
  const [docSize, setDocSize] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handlePublicDocChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาเลือกไฟล์ขนาดเล็กกว่า 10 MB`);
      e.target.value = '';
      setDocFile(null);
      return;
    }
    setDocFile(file);
  };

  const handleUploadDoc = async (file) => {
    if (!storage || !file) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop() || 'pdf';
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
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มเอกสารได้');
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
    setStatusMsg('กำลังบันทึกเอกสารเผยแพร่...');
    try {
      let fileUrl = docUrl;
      let fileName = 'External Link';
      let sizeLabel = docSize || 'ลิงก์เว็บ';

      if (uploadMode === 'file' && docFile) {
        setStatusMsg('กำลังอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์...');
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

      // Reset form
      const formEl = document.getElementById('public-doc-add-form');
      if (formEl) formEl.reset();

      setStatusMsg('✅ เพิ่มเอกสารเผยแพร่สำเร็จ!');
      setTimeout(() => setStatusMsg(''), 4000);

      // Reload list
      const docsSnap = await getDocs(collection(db, 'rspg_public_docs'));
      const docsData = [];
      docsSnap.forEach(d => {
        docsData.push({ id: d.id, ...d.data() });
      });
      setPublicDocs(docsData);

    } catch (err) {
      console.error(err);
      setStatusMsg('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบเอกสารได้');
      return;
    }
    if (!window.confirm('ยืนยันที่จะลบเอกสารเผยแพร่นี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rspg_public_docs', id));
      setStatusMsg('✅ ลบเอกสารสำเร็จ!');
      setTimeout(() => setStatusMsg(''), 4000);

      // Reload list
      const docsSnap = await getDocs(collection(db, 'rspg_public_docs'));
      const docsData = [];
      docsSnap.forEach(d => {
        docsData.push({ id: d.id, ...d.data() });
      });
      setPublicDocs(docsData);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Admin Sticky Bar */}
      {isLoggedIn && userRole === 'admin' && (
        <div className="card glass-panel" style={{
          backgroundColor: 'var(--color-primary-50)',
          border: '1.5px solid var(--color-primary-200)',
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--color-primary-800)', fontWeight: 700 }}>
            <Shield size={18} color="var(--color-primary)" />
            โหมดผู้ดูแลระบบ: คุณสามารถปรับแต่งและจัดการเอกสารดาวน์โหลดได้โดยตรง
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setViewMode('internal');
                setActiveTab('banners-config');
              }}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              🖼️ ไปหน้าตั้งค่าแบนเนอร์
            </button>
            <button
              onClick={() => {
                setActiveSubTab('downloads');
                setTimeout(() => {
                  const el = document.getElementById('public-downloads-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              📁 จัดการเอกสารดาวน์โหลด
            </button>
          </div>
        </div>
      )}

      {/* Website Welcome & Identity Box — Royal Purple & Gold */}
      <div className="card" style={{
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        border: '1.5px solid #E5CA79',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: 'linear-gradient(135deg, #2A084E 0%, #45126B 45%, #6A1B9A 100%)',
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(42, 8, 78, 0.18)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Botanical Royal Sketch in background */}
        <svg
          style={{ position: 'absolute', right: '-20px', top: '-20px', width: '220px', height: '220px', opacity: 0.1, pointerEvents: 'none' }}
          viewBox="0 0 100 100"
          fill="none"
          stroke="#ECC85B"
          strokeWidth="1.5"
        >
          <path d="M50 95 C50 60, 20 40, 20 20 C35 20, 50 35, 50 50 C50 35, 65 20, 80 20 C80 40, 50 60, 50 95 Z" />
          <path d="M50 50 Q30 70 15 75" />
          <path d="M50 40 Q70 60 85 65" />
        </svg>

        {/* Unified Collaborative Identity Badge */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: '6px 18px 6px 12px',
            borderRadius: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1.5px solid #E5CA79'
          }}>
            {/* Primary Identity: RSPG Logo */}
            <img
              src="./rspg-logo.png"
              alt="อพ.สธ."
              style={{ width: '32px', height: 'auto', objectFit: 'contain' }}
            />
            {/* Secondary Identity: School Logo */}
            <img
              src="./school-logo.png"
              alt="โรงเรียนปายวิทยาคาร"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                marginLeft: '8px'
              }}
            />
            {/* Connected and Spaced Text */}
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#45126B',
              letterSpacing: '0.3px',
              marginLeft: '12px'
            }}>
              โครงการ อพ.สธ. — สนองพระราชดำริโดย โรงเรียนปายวิทยาคาร
            </span>
          </div>
        </div>

        {/* Title, Subtitle, and CTA Buttons in a flex row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              {banners.title}
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#F3E8C8',
              fontWeight: 500,
              margin: 0,
              lineHeight: 1.45
            }}>
              {banners.subtitle}
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveSubTab('plants')}
              className="btn btn-gold"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px' }}
            >
              🌿 สำรวจทะเบียนพรรณไม้
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('switch-to-internal');
                window.dispatchEvent(event);
              }}
              style={{
                padding: '0.65rem 1.4rem',
                fontSize: '0.9rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1.5px solid #E5CA79',
                color: '#FFFFFF',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔐 เข้าใช้งานระบบภายใน
            </button>
          </div>
        </div>

        <div style={{
          fontSize: '0.92rem',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: 1.6,
          margin: '0.25rem 0 0 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          paddingTop: '0.85rem',
          position: 'relative',
          zIndex: 1
        }}>
          {banners.welcome_text}
        </div>
      </div>

      {/* Navigation Sub-Tabs — Royal Purple & Gold */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '6px 8px',
        borderRadius: '14px',
        marginBottom: '2rem',
        overflowX: 'auto',
        border: '1.5px solid #E5CA79',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(42, 8, 78, 0.08)',
        alignItems: 'center'
      }}>
        {[
          { id: 'home', label: 'หน้าแรก', icon: Grid },
          { id: 'plants', label: 'ทะเบียนพรรณไม้', icon: ClipboardList },
          { id: 'plant-study', label: 'พืชศึกษา (องค์ประกอบที่ 3)', icon: Sprout },
          { id: 'portfolio', label: 'ตารางสะสมงาน', icon: Award },
          { id: '3subjects', label: '3 สาระการเรียนรู้', icon: BookOpen },
          { id: 'localbase', label: 'ฐานทรัพยากรท้องถิ่น', icon: MapPin },
          { id: 'gallery', label: 'คลังภาพกิจกรรม', icon: Image },
          { id: 'downloads', label: 'ดาวน์โหลดเอกสาร', icon: Download },
          { id: 'qr-scanner', label: 'ส่องรหัส QR พืช', icon: QrCode }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`public-nav-button ${isSelected ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 15px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: isSelected ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                border: isSelected ? '1.5px solid #ECC85B' : '1px solid #E8DEEE',
                background: isSelected 
                  ? 'linear-gradient(135deg, #2A084E 0%, #45126B 50%, #6A1B9A 100%)' 
                  : '#FAF8FC',
                color: isSelected ? '#FFFFFF' : '#4A3E56',
                boxShadow: isSelected ? '0 4px 12px rgba(42, 8, 78, 0.25)' : 'none',
                outline: 'none'
              }}
            >
              <Icon size={16} color={isSelected ? '#ECC85B' : '#7B1FA2'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content rendering */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#584F66' }}>กำลังดาวน์โหลดข้อมูลการเผยแพร่สาธารณะ...</div>
      ) : (
        <div>
          {/* HOME TAB */}
          {activeSubTab === 'home' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }} className="rspg-progress-grid">

              {/* Left Column: General info and Sharing Goodness */}
              <div>
                {/* Welcome section */}
                <div className="card" style={{
                  marginBottom: '1.75rem',
                  border: '1.5px solid #E8DEEE',
                  borderLeft: '4px solid #C5931C',
                  background: '#FFFFFF',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 2px 10px rgba(42, 8, 78, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <Sprout size={20} color="#5C1D8D" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#5C1D8D', margin: 0 }}>
                      สารพฤกษศาสตร์ปายวิทยาคาร
                    </h3>
                  </div>
                  <p style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.65,
                    color: '#584F66',
                    margin: 0
                  }}>
                    {banners.welcome_text}
                  </p>
                </div>

                {/* Sharing Goodness (แบ่งปันความดีงาม) */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Heart size={20} color="#5C1D8D" />
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F1929', margin: 0 }}>
                        แบ่งปันความดีงาม (คุณธรรมนำชีวิต)
                      </h3>
                    </div>
                    <span className="badge badge-purple">RSPG Goodness</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="rspg-progress-grid">
                    {(goodnessList.length > 0 ? goodnessList : [
                      {
                        id: 'g1',
                        title: 'จิตอาสาบำรุงรักษาพรรณไม้ทรงปลูก',
                        description: 'นักเรียนแกนนำร่วมกันพรวนดิน ใส่ปุ๋ยอินทรีย์ และตัดแต่งกิ่งพรรณไม้ทรงปลูกเพื่อการอนุรักษ์อย่างยั่งยืน',
                        author: 'ชมรมพฤกษศาสตร์เยาวชน',
                        date: '20 พ.ค. 2567'
                      },
                      {
                        id: 'g2',
                        title: 'การถ่ายทอดภูมิปัญญาสมุนไพรสู่ชุมชน',
                        description: 'จัดนิทรรศการเผยแพร่องค์ความรู้การใช้ประโยชน์จากสมุนไพรพื้นถิ่นแม่ฮ่องสอนแก่ผู้ปกครองและชุมชน',
                        author: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์',
                        date: '18 พ.ค. 2567'
                      }
                    ]).map(good => (
                      <div key={good.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E8DEEE', transition: 'all 0.2s', padding: '14px 16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Sparkles size={15} color="#C5931C" />
                            <h4 style={{ fontWeight: 700, fontSize: '0.92rem', color: '#5C1D8D', margin: 0 }}>{good.title}</h4>
                          </div>
                          <p style={{ fontSize: '0.84rem', color: '#584F66', lineHeight: 1.5, margin: '6px 0 12px 0' }}>{good.description}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#827891', borderTop: '1px solid #EFE7F5', paddingTop: '8px' }}>
                          <span>โดย: <strong style={{ color: '#584F66' }}>{good.author}</strong></span>
                          <span>{good.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* operational photos and educational activities preview */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={20} color="#5C1D8D" />
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F1929', margin: 0 }}>
                        การดำเนินงานและการเรียนรู้พฤกษศาสตร์
                      </h3>
                    </div>
                    <span className="badge badge-gold">5 องค์ประกอบ</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="rspg-progress-grid">
                    {(activitiesList.length > 0 ? activitiesList : [
                      {
                        id: 'a1',
                        title: 'การจัดทำป้ายรหัสพรรณไม้ถาวรและ QR Code',
                        subject_type: 'องค์ประกอบที่ 1',
                        creator: 'ครูผู้รับผิดชอบงานสวนฯ'
                      },
                      {
                        id: 'a2',
                        title: 'การสำรวจและบันทึกลักษณะสัณฐานวิทยาพืช',
                        subject_type: 'องค์ประกอบที่ 3',
                        creator: 'นักเรียนชั้น ม.4/1'
                      },
                      {
                        id: 'a3',
                        title: 'การบูรณาการสาระการเรียนรู้ธรรมชาติแห่งชีวิต',
                        subject_type: 'สาระการเรียนรู้ที่ 1',
                        creator: 'กลุ่มสาระฯ วิทยาศาสตร์'
                      },
                      {
                        id: 'a4',
                        title: 'การนำพรรณไม้เข้าปลูกและอนุรักษ์พันธุกรรม',
                        subject_type: 'องค์ประกอบที่ 2',
                        creator: 'คณะทำงาน อพ.สธ.'
                      }
                    ]).map(act => (
                      <div key={act.id} className="card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', border: '1px solid #E8DEEE', padding: '14px 16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F6EEFB', color: '#5C1D8D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1F1929', margin: 0, lineHeight: 1.35 }}>{act.title}</h4>
                          <div style={{ fontSize: '0.74rem', color: '#827891', marginTop: '5px' }}>
                            <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 6px', marginRight: '6px' }}>{act.subject_type}</span>
                            <span>บันทึกโดย: {act.creator}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Statistics & Highlights */}
              <div>
                {/* Botanical Statistics Card */}
                <div className="card" style={{
                  marginBottom: '1.5rem',
                  padding: '0',
                  overflow: 'hidden',
                  border: '1.5px solid #E8DEEE',
                  boxShadow: '0 4px 16px rgba(42, 8, 78, 0.05)'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #2A084E 0%, #45126B 100%)',
                    padding: '12px 18px',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Award size={18} color="#ECC85B" />
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', margin: 0 }}>
                      สถิติการเรียนรู้ทางพฤกษศาสตร์
                    </h4>
                  </div>

                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.86rem', color: '#584F66', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sprout size={15} color="#2B8A4A" />
                        พรรณไม้ทั้งหมดในระบบ
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#5C1D8D', fontWeight: 700 }}>
                        {plantsList.length || 128} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#827891' }}>ต้น</span>
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.86rem', color: '#584F66', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={15} color="#1976D2" />
                        ชนิดพืชที่ระบุวงศ์วิทยาการ
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#2B8A4A', fontWeight: 700 }}>
                        {new Set(plantsList.map(p => p.scientific_name).filter(Boolean)).size || 45} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#827891' }}>ชนิด</span>
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.86rem', color: '#584F66', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={15} color="#C5931C" />
                        ความดีงามและกิจกรรม
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#C5931C', fontWeight: 700 }}>
                        {goodnessList.length || 12} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#827891' }}>รายการ</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Leading RSPG School Badge */}
                <div className="card" style={{
                  backgroundColor: '#FDF6E2',
                  border: '1.5px solid #E5CA79',
                  padding: '16px 18px',
                  boxShadow: '0 4px 14px rgba(197, 147, 28, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Sparkles size={18} color="#C5931C" />
                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#94690A', margin: 0 }}>
                      สถานศึกษาแกนนำ อพ.สธ.
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#584F66', margin: 0 }}>
                    โรงเรียนปายวิทยาคารเข้าร่วมสนองพระราชดำริและมุ่งศึกษาบริหารจัดการงานพฤกษศาสตร์เพื่อส่งต่อความมุ่งมั่นและจัดทำป้ายรหัสประจำต้นตลอดจนภูมิปัญญาสู่เยาวชน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PLANTS TAB */}
          {activeSubTab === 'plants' && (
            <div>
              {/* Search Bar */}
              <div className="card glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไทย, ชื่อวิทยาศาสตร์, รหัสพรรณไม้..."
                  className="form-control"
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Plant Grid Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {filteredPlants.map(plant => (
                  <div
                    key={plant.id}
                    className="card plant-card"
                    onClick={() => onSelectPlant(plant)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}
                  >
                    <img
                      src={plant.image_url || 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80'}
                      alt={plant.thai_name}
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>{plant.plant_code}</span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 4px 0' }}>{plant.thai_name}</h4>
                      <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>{plant.scientific_name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        <MapPin size={12} />
                        <span>{plant.planting_location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PLANT STUDY TAB */}
          {activeSubTab === 'plant-study' && (
            <PlantStudy userRole="visitor" />
          )}

          {/* PORTFOLIO TAB */}
          {activeSubTab === 'portfolio' && (
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                ตารางสะสมงานพฤกษศาสตร์โรงเรียน (RSPG Portfolio)
              </h3>
              <Portfolio />
            </div>
          )}

          {/* 3 SUBJECTS */}
          {activeSubTab === '3subjects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '10px' }}>
                  📚 3 สาระการเรียนรู้ (การจัดการเรียนรู้บูรณาการ)
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  ระบบจัดการเรียนรู้บูรณาการพฤกษศาสตร์ใน 3 มิติ เพื่อพัฒนาความเข้าใจธรรมชาติ การเชื่อมโยงอย่างเป็นระบบ และคุณค่าสารประโยชน์ต่อส่วนรวม
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {[
                  {
                    id: 'nature_life',
                    title: 'สาระการเรียนรู้ ธรรมชาติแห่งชีวิต',
                    icon: '🌱',
                    color: 'var(--color-nature)',
                    desc: 'ศึกษาเกี่ยวกับคุณสมบัติและธรรมชาติทั่วไปของสิ่งมีชีวิตและวิเคราะห์ลักษณะทางสัณฐานวิทยาของพืชพรรณชนิดต่าง ๆ',
                    matchTypes: ['สาระการเรียนรู้ ธรรมชาติแห่งชีวิต', '3 สาระการเรียนรู้'],
                    pdfUrl: '/06_nature_life.pdf'
                  },
                  {
                    id: 'interconnected',
                    title: 'สาระการเรียนรู้ สรรพสิ่งล้วนพันเกี่ยว',
                    icon: '🕸️',
                    color: 'var(--color-primary)',
                    desc: 'ศึกษาเกี่ยวกับความสัมพันธ์ ความเชื่อมโยงกันอย่างเป็นระบบระหว่างสิ่งมีชีวิต ดิน น้ำ อากาศ และการอยู่ร่วมกัน',
                    matchTypes: ['สาระการเรียนรู้ สรรพสิ่งล้วนพันเกี่ยว'],
                    pdfUrl: '/07_interconnected.pdf'
                  },
                  {
                    id: 'benefit_humanity',
                    title: 'สาระการเรียนรู้ ประโยชน์แท้แก่มหาชน',
                    icon: '🏛️',
                    color: 'var(--color-gold)',
                    desc: 'ศึกษาเกี่ยวกับการนำพืชพรรณสมุนไพรมาใช้ประโยชน์ในการดำรงชีวิต ศิลปะ ภูมิปัญญาสมุนไพร และการนำไปต่อยอดเชิงอาชีพเพื่อประโยชน์ของส่วนรวม',
                    matchTypes: ['สาระการเรียนรู้ ประโยชน์แท้แก่มหาชน'],
                    pdfUrl: '/08_benefit_humanity.pdf'
                  }
                ].map((strand, index) => {
                  const strandActivities = activitiesList.filter(act =>
                    strand.matchTypes.includes(act.subject_type)
                  );

                  return (
                    <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderTop: `4px solid ${strand.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{strand.icon}</span>
                        <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>{strand.title}</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem', flexGrow: 0 }}>
                        {strand.desc}
                      </p>

                      <div style={{ flexGrow: 1, borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: strand.color }}>
                          แผนงาน/หลักฐานการจัดกิจกรรม ({strandActivities.length})
                        </h5>
                        {strandActivities.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '10px 0', fontStyle: 'italic' }}>
                            ไม่มีบันทึกกิจกรรมสำหรับสาระการเรียนรู้นี้
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {strandActivities.map(act => (
                              <div key={act.id} style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                                <h6 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 4px 0' }}>{act.title}</h6>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 6px 0' }}>
                                  โดย: {act.creator} | ระดับชั้น: {act.classroom}
                                </p>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem' }}>
                                  {act.plans_url && <a href={act.plans_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>แผนการสอน</a>}
                                  {act.worksheet_url && <a href={act.worksheet_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-nature)', textDecoration: 'underline' }}>ใบงาน/ผลงาน</a>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button
                          onClick={() => { setViewSheetStructure(strand.id); setActiveWorksheetSubTab(0); }}
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          <ClipboardList size={14} /> โครงสร้างใบงาน
                        </button>
                        <a
                          href={strand.pdfUrl}
                          download
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', color: 'white', whiteSpace: 'nowrap' }}
                        >
                          <Download size={14} /> ดาวน์โหลด PDF
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LOCAL RESOURCE BASE */}
          {activeSubTab === 'localbase' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gold)', marginBottom: '10px' }}>
                  🪵 ฐานทรัพยากรท้องถิ่น (ปราชญ์ท้องถิ่นและชุมชน)
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  เชื่อมโยงความรู้สวนพฤกษศาสตร์ร่วมกับผู้นำชุมชนและปราชญ์ชาวบ้านในอำเภอปาย เพื่อจัดทำทำเนียบและวิจัยสรรพคุณพืชสมุนไพรโบราณ การเก็บรักษาทรัพยากรธรรมชาติ และภูมิปัญญาท้องถิ่นแบบพึ่งพาตนเอง
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📂 ทรัพยากรท้องถิ่นและภูมิปัญญาที่บันทึกไว้ ({localResourcesList.length})
                </h3>
                {localResourcesList.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    ยังไม่มีข้อมูลทรัพยากรท้องถิ่นบันทึกเผยแพร่ในระบบสาธารณะ
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {localResourcesList.map(res => (
                      <div key={res.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '3px solid var(--color-gold)' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-gold)', backgroundColor: 'rgba(177, 124, 69, 0.08)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
                            {res.resource_type === 'biological' ? 'ทรัพยากรชีวภาพ' : res.resource_type === 'physical' ? 'ทรัพยากรกายภาพ' : res.resource_type === 'local_wisdom' ? 'ภูมิปัญญาท้องถิ่น' : res.resource_type === 'local_culture' ? 'วัฒนธรรมท้องถิ่น' : 'แผนที่ชุมชน'}
                          </span>
                          <h4 style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', marginBottom: '6px' }}>{res.name}</h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '10px' }}>{res.description}</p>
                        </div>
                        {res.details && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                            {res.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GALLERY TAB */}
          {activeSubTab === 'gallery' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80', title: 'กิจกรรมอบรมการศึกษาใบงาน ก.7-003' },
                { url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=500&q=80', title: 'การสำรวจพันธุ์ไม้ ณ สวนสมุนไพรส่วนหน้า' },
                { url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=500&q=80', title: 'เวิร์กชอปเพาะพันธุ์ชำกิ่งกัลปพฤกษ์' },
                { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=500&q=80', title: 'นิทรรศการแสดงผลงานวาดรูปสีน้ำพฤกษศาสตร์' }
              ].map((img, i) => (
                <div key={i} className="card" style={{ padding: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <img src={img.url} alt={img.title} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-main)' }}>{img.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* DOWNLOADS TAB */}
          {activeSubTab === 'downloads' && (
            <div className="card" id="public-downloads-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>เอกสารเผยแพร่งานสวนพฤกษศาสตร์ (สาธารณะ)</h3>
                {statusMsg && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    {statusMsg}
                  </span>
                )}
              </div>

              <div style={{
                display: isLoggedIn && userRole === 'admin' ? 'grid' : 'block',
                gridTemplateColumns: isLoggedIn && userRole === 'admin' ? '1.5fr 1fr' : 'none',
                gap: '2rem'
              }} className="rspg-progress-grid">

                {/* Left Column: Documents List */}
                <div>
                  {/* Official worksheets from RSPG */}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '10px' }}>
                    📄 ใบงานและแบบฟอร์มทางการ อพ.สธ.
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                    {[
                      { title: 'ใบงานที่ 1 ธรรมชาติแห่งชีวิต (ก.7-003 ใบงานย่อย 06).pdf', size: '323 KB', file_url: '/06_nature_life.pdf' },
                      { title: 'ใบงานที่ 2 สรรพสิ่งล้วนพันเกี่ยว (ก.7-003 ใบงานย่อย 07).pdf', size: '343 KB', file_url: '/07_interconnected.pdf' },
                      { title: 'ใบงานที่ 3 ประโยชน์แท้แก่มหาชน (ก.7-003 ใบงานย่อย 08).pdf', size: '158 KB', file_url: '/08_benefit_humanity.pdf' }
                    ].map((docItem, idx) => (
                      <div key={`official-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={18} color="var(--color-nature)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{docItem.title}</span>
                        </div>
                        <a href={docItem.file_url} download className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', gap: '4px', alignItems: 'center', textDecoration: 'none' }}>
                          <Download size={12} /> ดาวน์โหลด ({docItem.size})
                        </a>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '10px' }}>
                    📂 เอกสารและคู่มือการศึกษาเพิ่มเติม
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {publicDocs.length === 0 ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0,0,0,0.01)'
                      }}>
                        ยังไม่มีเอกสารดาวน์โหลดเพิ่มเติมในขณะนี้ (ผู้ดูแลระบบสามารถเพิ่มเอกสารใหม่ได้)
                      </div>
                    ) : (
                      publicDocs.map((docItem) => (
                        <div key={docItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <FileText size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={docItem.title}>{docItem.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <a
                              href={docItem.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
                            >
                              <Download size={12} /> ดาวน์โหลด ({docItem.file_size || 'ดูเอกสาร'})
                            </a>
                            {isLoggedIn && userRole === 'admin' && (
                              <button
                                onClick={() => handleDeleteDocument(docItem.id)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  backgroundColor: 'rgba(211,47,47,0.08)',
                                  border: '1px solid rgba(211,47,47,0.2)',
                                  color: 'var(--color-danger)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                title="ลบเอกสาร"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column: Admin Inline Management Form */}
                {isLoggedIn && userRole === 'admin' && (
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: 'rgba(186,85,211,0.03)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)',
                    alignSelf: 'start'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <Shield size={16} color="var(--color-primary)" />
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>✍️ เพิ่มเอกสารดาวน์โหลดใหม่</h4>
                    </div>

                    <form onSubmit={handleAddDocument} id="public-doc-add-form">
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ชื่อเรื่อง / ชื่อเอกสาร</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="เช่น คู่มือแนะนำพืชศึกษา ปายวิทยาคาร.pdf"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          required
                          style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                        />
                      </div>

                      {/* Mode Switcher */}
                      <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-main)', padding: '3px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          onClick={() => setUploadMode('file')}
                          style={{
                            flex: 1,
                            padding: '0.35rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.75rem',
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
                          <Upload size={12} />
                          อัปโหลดไฟล์
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMode('url')}
                          style={{
                            flex: 1,
                            padding: '0.35rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.75rem',
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
                          <Link size={12} />
                          ระบุลิงก์ URL
                        </button>
                      </div>

                      {uploadMode === 'file' ? (
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>เลือกไฟล์จากเครื่อง (สูงสุด 10MB)</label>
                          <input
                            type="file"
                            className="form-control"
                            onChange={handlePublicDocChange}
                            required={uploadMode === 'file'}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ที่อยู่ลิงก์เอกสาร (URL)</label>
                            <input
                              type="url"
                              className="form-control"
                              placeholder="https://drive.google.com/..."
                              value={docUrl}
                              onChange={(e) => setDocUrl(e.target.value)}
                              required={uploadMode === 'url'}
                              style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ขนาดไฟล์ (ระบุเอง เช่น 2.1 MB หรือ ลิงก์ภายนอก)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="เช่น 1.5 MB หรือ Google Drive"
                              value={docSize}
                              onChange={(e) => setDocSize(e.target.value)}
                              style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>
                        </>
                      )}

                      <button
                        type="submit"
                        disabled={uploadingDoc}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          fontSize: '0.82rem',
                          padding: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        {uploadingDoc ? 'กำลังบันทึก...' : 'บันทึกเอกสารเผยแพร่'}
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* QR SCANNER LOOKUP */}
          {activeSubTab === 'qr-scanner' && (
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
              <QrCode size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>ค้นหารายละเอียดพืชจากรหัสหรือคิวอาร์</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                พิมพ์หรือสแกนรหัสพรรณไม้ อพ.สธ. เพื่อดึงข้อมูลประวัติ สัณฐานวิทยา และรูปถ่าย 6 ด้านย่อย
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="ตัวอย่างเช่น: 7-30210-002-001/1"
                  className="form-control"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                />
                <button onClick={handleQrLookup} className="btn btn-primary">
                  ค้นหา
                </button>
              </div>

              {qrLookupResult && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                  {qrLookupResult === 'not_found' ? (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.88rem', fontWeight: 600 }}>
                      ❌ ไม่พบพืชรหัสนี้ในทะเบียนเผยแพร่สาธารณะ
                    </span>
                  ) : (
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem', marginBottom: '4px' }}>
                        พบข้อมูลพืช: {qrLookupResult.thai_name}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>{qrLookupResult.scientific_name}</p>
                      <button
                        onClick={() => onSelectPlant(qrLookupResult)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      >
                        🔍 คลิกเพื่อดูสัณฐานวิเคราะห์ ก.7-003 และพิกัด
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Render the interactive worksheet structure preview modal */}
      {renderWorksheetStructure()}
    </div>
  );
}
