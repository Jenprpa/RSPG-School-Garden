import { useState } from 'react';
import { saveCredentials, getSavedCredentials, db } from '../firebaseClient';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Database, Key, Check, AlertTriangle, Cpu, BookOpen, Trash2 } from 'lucide-react';

export default function FirebaseWizard() {
  const creds = getSavedCredentials() || {};
  const [configText, setConfigText] = useState(
    creds.apiKey ? JSON.stringify(creds, null, 2) : ''
  );
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('rspg_gemini_key') || '');
  const [status, setStatus] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (!configText) {
      setStatus('กรุณากรอก Firebase Configuration Object');
      return;
    }

    try {
      // Try to parse the pasted config
      // Support clean JSON or raw JS object strings
      let cleanJson = configText.trim();
      if (cleanJson.startsWith('const firebaseConfig =')) {
        cleanJson = cleanJson.replace('const firebaseConfig =', '').trim();
      }
      if (cleanJson.endsWith(';')) {
        cleanJson = cleanJson.slice(0, -1).trim();
      }

      // Convert JS object keys format to JSON parsable (in case it lacks quotes on keys)
      // A quick way is using Function evaluator since it is user-provided client configuration
      const parserFn = new Function(`return ${cleanJson};`);
      const parsedConfig = parserFn();

      if (!parsedConfig.projectId || !parsedConfig.apiKey) {
        throw new Error('โครงสร้างวัตถุกำหนดค่า Firebase ไม่ถูกต้อง (ขาด projectId หรือ apiKey)');
      }

      saveCredentials(parsedConfig, geminiKey);
      setStatus('บันทึกการเชื่อมตั้งค่าสำเร็จ ระบบกำลังโหลดใหม่...');
    } catch (err) {
      setStatus('เกิดข้อผิดพลาดในการประมวลผลวัตถุตั้งค่า: ' + err.message);
    }
  };

  const handleSeedDatabase = async () => {
    if (!db) {
      alert('กรุณาบันทึกข้อมูลตั้งค่าและเชื่อมต่อ Firebase ก่อนทำการนำเข้าข้อมูล');
      return;
    }

    setSeeding(true);
    setStatus('กำลังเตรียมการเชื่อมต่อและนำเข้าข้อมูลไปยัง Cloud Firestore...');

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 8000);
    });

    try {
      // Run database seeding wrapped with an 8-second timeout
      await Promise.race([
        (async () => {
          // 1. Seed Study Areas
          const demoAreas = [
            { id: 'area_a01', area_code: 'A-01', area_name: 'สวนพฤกษศาสตร์ส่วนหน้าอาคารเรียน 1', description: 'พื้นที่ศึกษาพืชสมุนไพรและไม้นำสายตา' },
            { id: 'area_a02', area_code: 'A-02', area_name: 'พื้นที่ปลูกป่าเฉลิมพระเกียรติ', description: 'พื้นที่ศึกษาโครงสร้างป่า 3 อย่าง ประโยชน์ 4 อย่าง' },
            { id: 'area_a03', area_code: 'A-03', area_name: 'สวนหย่อมลานวิชาการ', description: 'พื้นที่ศึกษาพืชไม้ประดับและไม้ดอกสี orchid' }
          ];
          for (const area of demoAreas) {
            await setDoc(doc(db, 'study_areas', area.id), area);
          }

          // 2. Seed Plants (with habit and tag status)
          const demoPlants = [
            {
              id: 'plant_kalpa',
              plant_code: '7-30210-002-001/1',
              thai_name: 'กัลปพฤกษ์',
              scientific_name: 'Cassia bakeriana Craib',
              family_name: 'FABACEAE (LEGUMINOSAE-CAESALPINIOIDEAE)',
              plant_type: 'ไม้ต้น',
              habit: 'ไม้ต้น',
              planting_location: 'สวนหย่อมลานวิชาการ',
              surveyor: 'ครูสมเจตน์ สังข์ทอง',
              survey_date: '2026-05-10',
              gps_lat: 19.3621,
              gps_lng: 98.4372,
              is_tagged: 'มี',
              status: 'สมบูรณ์',
              description: 'เป็นไม้ยืนต้นขนาดกลาง ผลัดใบ สูง 5-15 เมตร เรือนยอดกลมหรือแบน ดอกเริ่มบานสีชมพู แล้วเปลี่ยนเป็นสีขาวปนชมพู ออกดอกเป็นช่อตามกิ่งก้าน ใบประกอบแบบขนนกปลายคู่ นิยมปลูกเป็นไม้ประดับตามสถานศึกษาและสถานที่ราชการ'
            },
            {
              id: 'plant_thong',
              plant_code: '7-30210-002-002/1',
              thai_name: 'ทองกวาว',
              scientific_name: 'Butea monosperma (Lam.) Taub.',
              family_name: 'FABACEAE (LEGUMINOSAE-PAPILIONOIDEAE)',
              plant_type: 'ไม้ต้น',
              habit: 'ไม้ต้น',
              planting_location: 'พื้นที่ปลูกป่าเฉลิมพระเกียรติ',
              surveyor: 'นร.หญิง กานดา สุวรรณ',
              survey_date: '2026-05-15',
              gps_lat: 19.3628,
              gps_lng: 98.4379,
              is_tagged: 'มี',
              status: 'สมบูรณ์',
              description: 'ไม้ยืนต้นขนาดกลาง สูง 5-15 เมตร ออกดอกสีแดงส้มสว่างไสวในช่วงฤดูหนาว นิยมใช้ศึกษาระบบราก การทนแล้ง และการแปรรูปเนื้อไม้ดอกทองกวาวสามารถสกัดสีธรรมชาติเพื่อใช้ในวิชาการเรียนรู้ศิลปะได้'
            },
            {
              id: 'plant_fah',
              plant_code: '7-30210-002-003/1',
              thai_name: 'ฟ้าทะลายโจร',
              scientific_name: 'Andrographis paniculata (Burm.f.) Nees',
              family_name: 'ACANTHACEAE',
              plant_type: 'ไม้ล้มลุก',
              habit: 'ไม้ล้มลุก',
              planting_location: 'สวนพฤกษศาสตร์ส่วนหน้าอาคารเรียน 1',
              surveyor: 'นร.ชาย ธวัชชัย มีสุข',
              survey_date: '2026-05-20',
              gps_lat: 19.3615,
              gps_lng: 98.4365,
              is_tagged: 'ไม่มี',
              status: 'สมบูรณ์',
              description: 'ไม้ล้มลุก สูง 30-70 เซนติเมตร ลำต้นเป็นสี่เหลี่ยม แตกกิ่งก้านมาก ใบเดี่ยวสีเขียวเข้มเป็นมัน ดอกช่อสีขาว มีสารสำคัญแอนโดรกราโฟไลด์ (Andrographolide) มีสรรพคุณช่วยบรรเทาอาการไข้หวัด เจ็บคอ'
            }
          ];
          for (const plant of demoPlants) {
            await setDoc(doc(db, 'plants', plant.id), plant);
          }

          // 3. Seed Worksheets K7 (with detailed habit/stem/leaf/flower/fruit/seed photo URLs)
          const worksheets = [
            {
              id: 'k7_kalpa',
              plant_id: 'plant_kalpa',
              habit_photo_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80',
              stem_photo_url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80',
              leaf_photo_url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=80',
              flower_photo_url: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=400&q=80',
              fruit_photo_url: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&w=400&q=80',
              seed_photo_url: 'https://images.unsplash.com/photo-1574944985070-8f3ebc24c93c?auto=format&fit=crop&w=400&q=80',
              stem_detail: 'เปลือกลำต้นเรียบ สีเทาเข้ม แตกกิ่งก้านสาขาแผ่กว้าง เนื้อไม้เหนียวแข็งแรง',
              leaf_detail: 'ใบประกอบแบบขนนก ใบย่อยรูปไข่แกมรูปรี โคนใบมน ปลายใบแหลม แผ่นใบมีขนอ่อนนุ่มทั้งสองด้าน',
              flower_detail: 'ช่อดอกออกตามกิ่ง ดอกตูมสีชมพูเข้ม ดอกบานสีชมพูอ่อนถึงขาว กลีบดอก 5 กลีบ เกสรเพศผู้ 10 อัน',
              fruit_detail: 'ผลเป็นฝักกลม ยาว 30-40 ซม. สีน้ำตาลเข้ม มีขนสีเทาปกคลุมหนาแน่น',
              seed_detail: 'เมล็ดแบน รูปไข่ สีน้ำตาล เป็นมันเงา เรียงตัวตามขวางในฝัก',
              local_wisdom: 'ชาวล้านนานิยมนำเปลือกต้นมาต้มน้ำอมเพื่อแก้ปวดฟัน และรักษาโรคเหงือกบวม',
              botanical_data: 'Cassia bakeriana เป็นพืชในวงศ์ Fabaceae มีสรรพคุณทางสมุนไพรและเป็นดัชนีชี้วัดฤดูกาลผลัดใบในพื้นที่ราบสูงปาย',
              utility: 'ปลูกเป็นไม้ร่มเงา ปรับปรุงทัศนียภาพ และสกัดน้ำยาบำบัดรักษาโรคผิวหนังโบราณ',
              study_results: 'วิเคราะห์โครงสร้างพรรณไม้ พบว่าสอดคล้องตามเกณฑ์ อพ.สธ. ในการปลูกเพื่อปรับภูมิทัศน์และเรียนรู้สัณฐานวิทยา',
              is_completed: true,
              updated_at: new Date().toISOString()
            },
            {
              id: 'k7_fah',
              plant_id: 'plant_fah',
              habit_photo_url: 'https://images.unsplash.com/photo-1530076886511-b5d158f24451?auto=format&fit=crop&w=400&q=80',
              stem_photo_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
              leaf_photo_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=400&q=80',
              flower_photo_url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=400&q=80',
              fruit_photo_url: '',
              seed_photo_url: '',
              stem_detail: 'ลำต้นตั้งตรง สี่เหลี่ยม แตกกิ่งก้านสาขามาก ผิวเรียบ สีเขียวเข้ม',
              leaf_detail: 'ใบเดี่ยว เรียงตรงข้ามรูปใบหอกหรือรูปไข่ ขอบใบเรียบ แผ่นใบสีเขียวเข้มเป็นมัน',
              flower_detail: 'ช่อดอกออกแบบกระจุกตามซอกใบและปลายยอด ดอกเล็กสีขาว กลีบดอกเชื่อมติดกันเป็นหลอด ปลายแยกเป็น 2 ปาก',
              fruit_detail: 'ผลเป็นฝักรูปทรงกระบอก ผิวเรียบ สีเขียว เมื่อแก่จะเปลี่ยนเป็นสีน้ำตาล แตกได้เป็น 2 ซีก',
              seed_detail: 'เมล็ดขนาดเล็ก สีน้ำตาลแกมส้ม จำนวนมากในฝัก',
              local_wisdom: 'ต้มใบสดดื่มแก้ไอ แก้เจ็บคอ และบำบัดอาการไข้จับสั่นตามปราชญ์ปายโบราณ',
              botanical_data: 'Andrographis paniculata มีสารสำคัญกลุ่ม Diterpene lactones สูงที่สุดในชั้นศึกษาที่มีแสงแดดส่องผ่านรำไร',
              utility: 'สกัดเป็นยารับประทานเพื่อบรรเทาอาการอักเสบของระบบทางเดินหายใจส่วนบน',
              study_results: 'การศึกษาทางเภสัชเวทพบว่ามีรสขมจัด มีฤทธิ์ลดการอักเสบและแก้ไข้',
              is_completed: false,
              updated_at: new Date().toISOString()
            }
          ];
          for (const sheet of worksheets) {
            await setDoc(doc(db, 'k7_worksheets', sheet.id), sheet);
          }

          // 4. Seed General School Assessment Details (ก.7-009)
          const schoolInfo = {
            id: 'pai_wittyakarn',
            school_name: 'โรงเรียนปายวิทยาคาร',
            location: 'อำเภอปาย จังหวัดแม่ฮ่องสอน',
            education_levels: 'มัธยมศึกษาตอนต้น - มัธยมศึกษาตอนปลาย',
            student_count: 850,
            teacher_count: 55,
            coordinator: 'ครูสมเจตน์ สังข์ทอง',
            academic_year: '2569',
            action_date: '2026-05-31',
            attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/assessments%2Fsample_info.pdf?alt=media',
            updated_at: new Date().toISOString()
          };
          await setDoc(doc(db, 'rspg_school_info', schoolInfo.id), schoolInfo);

          // 5. Seed ด้านที่ 1: การบริหารและการจัดการ
          const adminDocs = [
            {
              id: 'doc_admin_01',
              document_type: 'คำสั่งแต่งตั้งคณะกรรมการ',
              title: 'คำสั่งแต่งตั้งคณะกรรมการดำเนินงานสวนพฤกษศาสตร์โรงเรียน ประจำปีการศึกษา 2569',
              description: 'แต่งตั้งครูและนักเรียนแกนนำแบ่งหน้าที่รับผิดชอบตาม 5 องค์ประกอบงาน อพ.สธ.',
              responsible_person: 'ผู้อำนวยการโรงเรียนปายวิทยาคาร',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/admin%2Fcommittee_order.pdf?alt=media',
              created_at: '2026-05-02'
            },
            {
              id: 'doc_admin_02',
              document_type: 'แผนงาน/โครงการ',
              title: 'แผนปฏิบัติการประจำปี โครงการสวนพฤกษศาสตร์โรงเรียนปายวิทยาคาร',
              description: 'กำหนดงบประมาณ แผนการปลูก และการจัดทำทะเบียน ก.7-003 ประจำปี',
              responsible_person: 'ครูสมเจตน์ สังข์ทอง',
              attachment_url: '',
              created_at: '2026-05-05'
            },
            {
              id: 'doc_admin_03',
              document_type: 'ปฏิทินดำเนินงาน',
              title: 'ปฏิทินปฏิบัติงานสวนพฤกษศาสตร์โรงเรียน ประจำภาคเรียนที่ 1/2569',
              description: 'ตารางสรุปกิจกรรมการลงสนามสำรวจต้นไม้และการวาดรูปสเก็ตช์ลายเส้น',
              responsible_person: 'ครูศิริพร ใจงาม',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/admin%2Fcalendar.pdf?alt=media',
              created_at: '2026-05-06'
            },
            {
              id: 'doc_admin_04',
              document_type: 'รายงานการประชุม',
              title: 'รายงานการประชุมคณะกรรมการสวนพฤกษศาสตร์โรงเรียน ครั้งที่ 1/2569',
              description: 'ประชุมชี้แจงเป้าหมายเพื่อขอประเมินรับเกียรติบัตรขั้นที่ 1 อพ.สธ.',
              responsible_person: 'ครูสมเจตน์ สังข์ทอง',
              attachment_url: '',
              created_at: '2026-05-10'
            },
            {
              id: 'doc_admin_05',
              document_type: 'ภาพกิจกรรม',
              title: 'ภาพกิจกรรมอบรมเชิงปฏิบัติการการบันทึกข้อมูลสัณฐานวิทยาพืช ก.7-003',
              description: 'ครูแกนนำจัดฝึกอบรมสอนนักเรียน ม.3 สำรวจราก ลำต้น ดอก ผล เมล็ดพืชจริงในสนาม',
              responsible_person: 'คณะครูแกนนำพฤกษศาสตร์',
              attachment_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
              created_at: '2026-05-14'
            }
          ];
          for (const docObj of adminDocs) {
            await setDoc(doc(db, 'rspg_admin_management', docObj.id), docObj);
          }

          // 6. Seed ด้านที่ 2: ดำเนินงาน 5 องค์ประกอบ (15 ตัวชี้วัดมาตรฐาน ก.7-008/ก.7-009)
          const evaluationCriteria = [
            // Element 1 (1.1 - 1.5)
            {
              id: 'criteria_1_1',
              element_num: 1,
              criteria_id: '1.1',
              title: 'การสำรวจพรรณไม้ในพื้นที่ศึกษา',
              max_score: 20,
              self_score: 20,
              description: 'ดำเนินการสำรวจพรรณไม้ทั่วมุมโรงเรียนปายวิทยาคาร จดบันทึกชื่อท้องถิ่น และกำหนดจุดปักไม้ตัวอย่างชั่วคราวเสร็จสิ้น',
              evidence_text: 'ใบรายชื่อพรรณไม้เริ่มต้น สมุดจดฟิลด์โน้ตของนักเรียนแกนนำ',
              image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel1_1.pdf?alt=media',
              responsible_person: 'นร.แกนนำ ม.3',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_1_2',
              element_num: 1,
              criteria_id: '1.2',
              title: 'การทำผังแสดงตำแหน่งพรรณไม้',
              max_score: 20,
              self_score: 15,
              description: 'ระบุตำแหน่งพิกัดพืชหลักบนแผนที่ SVG ดิจิทัลในระบบแอปพลิเคชัน อยู่ในระหว่างสำรวจเพิ่มเติมให้ครบ 100%',
              evidence_text: 'ผังระบบดิจิทัลบนแดชบอร์ด และแผนผังตำแหน่งสวนพฤกษศาสตร์ส่วนหน้า',
              image_url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
              attachment_url: '',
              responsible_person: 'นร.กลุ่มสำรวจสีเขียว',
              status: 'กำลังดำเนินการ',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_1_3',
              element_num: 1,
              criteria_id: '1.3',
              title: 'การตั้งชื่อและรหัสประจำต้นพืช',
              max_score: 20,
              self_score: 20,
              description: 'กำหนดรหัสพรรณไม้ตามมาตรฐาน อพ.สธ. (รหัสสถานศึกษา-ลำดับ-ชนิด) ผูกทะเบียนรหัสเรียบร้อยสมบูรณ์',
              evidence_text: 'ทะเบียนจัดเก็บรหัสและบัญชีรายชื่อพืชปายวิทยาคาร',
              image_url: '',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel1_3.pdf?alt=media',
              responsible_person: 'ครูสมเจตน์ สังข์ทอง',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_1_4',
              element_num: 1,
              criteria_id: '1.4',
              title: 'การจัดทำป้ายชื่อพรรณไม้ชั่วคราวและสมบูรณ์',
              max_score: 20,
              self_score: 10,
              description: 'จัดทำป้ายชื่อพลาสติกสีม่วงระบุชื่อไทย ชื่อวิทยาศาสตร์ วงศ์ และบาร์โค้ด แต่อยู่ระหว่างปรับปรุงข้อมูลสะกดคำบางส่วน',
              evidence_text: 'ตัวอย่างไฟล์กราฟิกออกแบบป้ายปายวิทยาคาร',
              image_url: '',
              attachment_url: '',
              responsible_person: 'ครูศิริพร ใจงาม',
              status: 'ปรับปรุง',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_1_5',
              element_num: 1,
              criteria_id: '1.5',
              title: 'การติดตั้งป้ายชื่อพรรณไม้ถาวร',
              max_score: 20,
              self_score: 0,
              description: 'ยังไม่ได้นำป้ายถาวรไปผูกแขวนที่โคนต้นไม้ของพืชเนื่องจากติดขัดฤดูฝน รอดำเนินการในภาคเรียนถัดไป',
              evidence_text: '-',
              image_url: '',
              attachment_url: '',
              responsible_person: 'ครูและนักเรียนทุกห้องเรียน',
              status: 'ยังไม่มีหลักฐาน',
              updated_at: new Date().toISOString()
            },
            // Element 2
            {
              id: 'criteria_2_1',
              element_num: 2,
              criteria_id: '2.1',
              title: 'การจัดตั้งพื้นที่และเตรียมจุดศึกษา',
              max_score: 30,
              self_score: 30,
              description: 'จัดตั้งสวนสมุนไพร ลานเฉลิมพระเกียรติ และโซนป่าเพื่อให้นักเรียนทุกคนสามารถเข้าศึกษาพันธุ์ไม้ได้โดยสะดวก',
              evidence_text: 'แผนผังเขตการบริหารพืชและภาพถ่ายผังโซนโรงเรียน',
              image_url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel2_1.pdf?alt=media',
              responsible_person: 'ครูศิริพร ใจงาม',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_2_2',
              element_num: 2,
              criteria_id: '2.2',
              title: 'การรวบรวมพรรณไม้เข้าปลูกเพิ่มและขยายพันธุ์',
              max_score: 40,
              self_score: 35,
              description: 'ขยายพันธุ์กล้าไม้กัลปพฤกษ์ และนำพืชท้องถิ่นอำเภอปายเข้ามาเสริมภูมิทัศน์โรงเรียนและเพาะชำ',
              evidence_text: 'สมุดบันทึกสถิติการเพาะขยายพันธุ์พืชของนักเรียนการงานอาชีพ',
              image_url: '',
              attachment_url: '',
              responsible_person: 'นักเรียนกลุ่มการงานอาชีพ',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_2_3',
              element_num: 2,
              criteria_id: '2.3',
              title: 'การดูแลรักษาและการทำทะเบียนประวัติการบำรุงรักษา',
              max_score: 30,
              self_score: 30,
              description: 'มีแผนกำหนดการรดน้ำ ใส่ปุ๋ย ถอนวัชพืช และเก็บประวัติลงในแอปพลิเคชันอย่างครบถ้วนและสม่ำเสมอ',
              evidence_text: 'ตารางเวรการทำสวนพฤกษศาสตร์โรงเรียน และประวัติบันทึกบำรุงรักษาในระบบ',
              image_url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel2_3.pdf?alt=media',
              responsible_person: 'คณะครูและสภานักเรียน',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            // Element 3
            {
              id: 'criteria_3_1',
              element_num: 3,
              criteria_id: '3.1',
              title: 'การจัดทำทะเบียนพรรณไม้ ก.7-003 รายต้น',
              max_score: 40,
              self_score: 30,
              description: 'เขียนข้อมูลการสัณฐานพืชลงในใบงาน ก.7-003 อยู่ระหว่างเก็บบันทึกเพิ่มเติมให้ครบถ้วนทุกต้นตามระบบทะเบียน',
              evidence_text: 'แฟ้มเอกสาร ก.7-003 ของกัลปพฤกษ์และทองกวาวในระบบคลาวด์',
              image_url: '',
              attachment_url: '',
              responsible_person: 'นร.หญิง กานดา สุวรรณ',
              status: 'กำลังดำเนินการ',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_3_2',
              element_num: 3,
              criteria_id: '3.2',
              title: 'การศึกษาลักษณะสัณฐานวิทยาของแต่ละส่วนประกอบพืช',
              max_score: 30,
              self_score: 30,
              description: 'การนำใบ ดอก ลำต้นพืชจริงมาส่องกล้อง วิเคราะห์รูปร่าง ขอบใบ กลีบดอก และจำนวนเกสรครบถ้วน',
              evidence_text: 'สไลด์ประกอบการเรียนรู้วิทยาศาสตร์ชีววิทยา ม.5 และตารางจำแนกชนิดใบพืช',
              image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel3_2.pdf?alt=media',
              responsible_person: 'กลุ่มวิทยาศาสตร์ ม.5',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_3_3',
              element_num: 3,
              criteria_id: '3.3',
              title: 'การวาดภาพวาดทางพฤกษศาสตร์และการถ่ายภาพ',
              max_score: 30,
              self_score: 20,
              description: 'ทำภาพวาดทางพฤกษศาสตร์สีน้ำ แต่บางภาพเส้นลายมือยังไม่ตรงตามสเกล อพ.สธ. อยู่ในระหว่างปรับปรุงการวาดสเก็ตช์',
              evidence_text: 'รูปภาพสเก็ตช์ในแกลเลอรี และผลงานวาดลายเส้นของนักเรียน',
              image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
              attachment_url: '',
              responsible_person: 'นร.ชาย ธวัชชัย มีสุข',
              status: 'ปรับปรุง',
              updated_at: new Date().toISOString()
            },
            // Element 4
            {
              id: 'criteria_4_1',
              element_num: 4,
              criteria_id: '4.1',
              title: 'การรายงานผลการเรียนรู้รายบุคคลของนักเรียน',
              max_score: 50,
              self_score: 45,
              description: 'จัดทำสมุดรายงานชั่วโมงวิชาการเรียนรู้พฤกษศาสตร์ของนักเรียนชั้น ม.3 ทุกสัปดาห์ สมบูรณ์ 90%',
              evidence_text: 'สมุดรายงานผลนักเรียน ม.3 รายบุคคล',
              image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel4_1.pdf?alt=media',
              responsible_person: 'นร. ม.3 ทุกห้องเรียน',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_4_2',
              element_num: 4,
              criteria_id: '4.2',
              title: 'การสรุปรวบรวมรายงานผลการเรียนรู้ส่ง อพ.สธ.',
              max_score: 50,
              self_score: 20,
              description: 'อยู่ระหว่างเขียนสรุปวิเคราะห์เปรียบเทียบผลการเติบโตประจำภาคเรียน เพื่อจัดรวมเล่มส่ง อพ.สธ.',
              evidence_text: 'ร่างหน้าปกรายงานวิชาการ และหัวข้อสรุปการเติบโตพืช',
              image_url: '',
              attachment_url: '',
              responsible_person: 'ครูสมเจตน์ สังข์ทอง',
              status: 'กำลังดำเนินการ',
              updated_at: new Date().toISOString()
            },
            // Element 5
            {
              id: 'criteria_5_1',
              element_num: 5,
              criteria_id: '5.1',
              title: 'การบูรณาการหลักสูตรงานสวนพฤกษศาสตร์โรงเรียนเข้ากับกลุ่มสาระวิชา',
              max_score: 50,
              self_score: 40,
              description: 'จัดทำแผนบูรณาการจัดวิชาเรียนหลักสูตร อพ.สธ. ในกลุ่มวิชาวิทยาศาสตร์ (ชีววิทยา) ศิลปะ และการงานอาชีพเรียบร้อย',
              evidence_text: 'เล่มแผนการจัดการเรียนรู้บูรณาการของทั้ง 3 กลุ่มสาระ',
              image_url: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&w=400&q=80',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel5_1.pdf?alt=media',
              responsible_person: 'คณะครูวิชาการบูรณาการ',
              status: 'เสร็จสิ้น',
              updated_at: new Date().toISOString()
            },
            {
              id: 'criteria_5_2',
              element_num: 5,
              criteria_id: '5.2',
              title: 'การนำความรู้ไปใช้ประโยชน์ในการศึกษาและเผยแพร่สู่ชุมชน',
              max_score: 50,
              self_score: 10,
              description: 'จัดแผนการเผยแพร่สมุนไพรพื้นบ้านให้ผู้ปกครองนักเรียน แต่อยู่ในขั้นตอนวางโครงสร้างนิทรรศการรอบจุดบริการ',
              evidence_text: 'เอกสารแผนงานจัดหน่วยอบรมความรู้พฤกษศาสตร์แก่ชุมชนปาย',
              image_url: '',
              attachment_url: '',
              responsible_person: 'กลุ่มนักเรียนแกนนำ ม.6',
              status: 'กำลังดำเนินการ',
              updated_at: new Date().toISOString()
            }
          ];
          for (const crit of evaluationCriteria) {
            await setDoc(doc(db, 'rspg_evaluation_criteria', crit.id), crit);
          }

          // 7. Seed sample documents to Evidence Vault (rspg_evidence_vault)
          const sampleEvidence = [
            {
              id: 'vault_ev_01',
              title: 'รายงานการประเมินตนเองตามตัวชี้วัดที่ 1.1',
              category: 'องค์ประกอบที่ 1',
              description: 'แฟ้มผลการสำรวจและบันทึกชื่อต้นไม้เริ่มต้น พร้อมพิกัด GPS ทั้งหมด',
              responsible_person: 'ครูสมเจตน์ สังข์ทอง',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel1_1.pdf?alt=media',
              status: 'เสร็จสิ้น',
              created_at: new Date().toISOString()
            },
            {
              id: 'vault_ev_02',
              title: 'หลักฐานการจัดตั้งสวนพฤกษศาสตร์ประจำจุดศึกษา A-01',
              category: 'องค์ประกอบที่ 2',
              description: 'แผนภาพระบุขอบเขตและเป้าหมายการรวบรวมพรรณไม้เข้าปลูก',
              responsible_person: 'ครูศิริพร ใจงาม',
              attachment_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel2_1.pdf?alt=media',
              status: 'เสร็จสิ้น',
              created_at: new Date().toISOString()
            }
          ];
          for (const ev of sampleEvidence) {
            await setDoc(doc(db, 'rspg_evidence_vault', ev.id), ev);
          }

          // 8. Seed goodness items (rspg_goodness)
          const sampleGoodness = [
            { id: 'good_01', title: 'ปลูกฝังจิตสำนึกรักธรรมชาติให้นักเรียน ม.ต้น', description: 'กิจกรรมบูรณาการวิชาวิทยาศาสตร์ร่วมกับวิชาศิลปะเพื่อวาดภาพลายเส้นใบไม้', author: 'ครูศิริพร ใจงาม', date: '2569-05-12', created_at: new Date().toISOString() },
            { id: 'good_02', title: 'ขยายพันธุ์และรักษากัลปพฤกษ์ประจำโรงเรียน', description: 'นักเรียนแกนนำนำเมล็ดกัลปพฤกษ์มาทำการเพาะชำในโรงเรือนเกษตรเพื่อนำไปปลูกในชุมชน', author: 'นักเรียนแกนนำเกษตร', date: '2569-05-20', created_at: new Date().toISOString() }
          ];
          for (const gd of sampleGoodness) {
            await setDoc(doc(db, 'rspg_goodness', gd.id), gd);
          }

          // 9. Seed learning activities (rspg_learning_activities)
          const sampleLearning = [
            { id: 'learn_01', title: 'การศึกษาพืชศึกษา: กัลปพฤกษ์', subject_type: 'พืชศึกษา', classroom: 'ม.3/1', creator: 'ครูสมเจตน์ สังข์ทอง', description: 'สำรวจลักษณะลำต้น ทรงพุ่ม และปักไม้ตัวอย่างชั่วคราว', post_teaching_log: 'นักเรียนร้อยละ 90 สามารถจดบันทึกและจำแนกลักษณะใบประกอบปลายคู่ได้ถูกต้อง', plans_url: '#', worksheet_url: '#', date: '2569-05-10', created_at: new Date().toISOString() },
            { id: 'learn_02', title: 'การบูรณาการ 3 สาระการเรียนรู้ในระดับชั้น ม.5', subject_type: '3 สาระการเรียนรู้', classroom: 'ม.5/2', creator: 'ครูศิริพร ใจงาม', description: 'ศึกษาความงดงามทางสุนทรียภาพ ผสมผสานวรรณกรรม และเขียนภาพสีน้ำทองกวาว', post_teaching_log: 'นักเรียนสร้างสรรค์ภาพวาดสีน้ำพฤกษศาสตร์ได้สวยงามและสัดส่วนถูกต้องตามสเกล', plans_url: '#', worksheet_url: '#', date: '2569-05-18', created_at: new Date().toISOString() }
          ];
          for (const ln of sampleLearning) {
            await setDoc(doc(db, 'rspg_learning_activities', ln.id), ln);
          }

          // 10. Seed plant changes / incidents (rspg_plant_changes)
          const sampleIncidents = [
            { id: 'inc_01', plant_id: 'plant_kalpa', plant_code: '7-30210-002-001/1', plant_name: 'กัลปพฤกษ์', change_type: 'ตัดแต่ง (Pruned)', description: 'ตัดแต่งกิ่งแขนงด้านล่างที่ขวางแนวการเดิน และพ่นน้ำยาประสานแผลต้นไม้เรียบร้อย', before_photo_url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=300&q=80', after_photo_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=300&q=80', reporter: 'นักเรียนกลุ่มสวน 2', approver: 'ครูสมเจตน์ สังข์ทอง', reason: 'ตัดแต่งเพื่อความปลอดภัยทางกายภาพ', status: 'อนุมัติแล้ว', date: '2569-05-24', created_at: new Date().toISOString() }
          ];
          for (const ic of sampleIncidents) {
            await setDoc(doc(db, 'rspg_plant_changes', ic.id), ic);
          }

          // 11. Seed website banners (rspg_banners)
          const defaultBanners = {
            title: 'สวนพฤกษศาสตร์โรงเรียนปายวิทยาคาร',
            subtitle: 'สนองพระราชดำริโครงการอนุรักษ์พันธุกรรมพืชอันเนื่องมาจากพระราชดำริฯ (อพ.สธ.)',
            banner_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
            welcome_text: 'ยินดีต้อนรับสู่ระบบงานสวนพฤกษศาสตร์โรงเรียน แหล่งเรียนรู้ บ่มเพาะเยาวชน และรักษาสรรพสิ่งรอบตัวให้คงอยู่'
          };
          await setDoc(doc(db, 'rspg_banners', 'pai_config'), defaultBanners);

          // 12. Seed Student Portfolios (student_portfolios)
          const samplePortfolios = [
            {
              id: 'port_ganda',
              student_name: 'นร.หญิง กานดา สุวรรณ',
              classroom: 'ม.3/2',
              academic_year: '2569',
              teacher_name: 'ครูสมเจตน์ สังข์ทอง',
              plant_name: 'กัลปพฤกษ์',
              plant_code: '7-30210-002-001/1',
              k7003_status: 'ผ่าน',
              drawing_type: 'ภาพวาดสีน้ำพฤกษศาสตร์',
              drawing_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
              worksheet_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel3_2.pdf?alt=media',
              report_url: 'https://firebasestorage.googleapis.com/v0/b/rspg-school-garden.appspot.com/o/evidence%2Fel4_1.pdf?alt=media',
              video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
              status: 'ผ่าน',
              feedback: 'ผลงานประณีตงดงามมาก การลงสีน้ำถูกต้องตามสัดส่วนสเกลพฤกษศาสตร์ใบเลี้ยงคู่'
            },
            {
              id: 'port_thawatchai',
              student_name: 'นร.ชาย ธวัชชัย มีสุข',
              classroom: 'ม.3/2',
              academic_year: '2569',
              teacher_name: 'ครูศิริพร ใจงาม',
              plant_name: 'ทองกวาว',
              plant_code: '7-30210-002-002/1',
              k7003_status: 'รอตรวจ',
              drawing_type: 'ภาพวาดลายเส้นลายมือ',
              drawing_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80',
              worksheet_url: '',
              report_url: '',
              video_url: '',
              status: 'รอตรวจ',
              feedback: 'ลายเส้นลำต้นดีแล้ว แต่รายละเอียดเปลือกและยางไม้ยังไม่ชัดเจน ขอให้ปรับปรุงเพิ่ม'
            }
          ];
          for (const port of samplePortfolios) {
            await setDoc(doc(db, 'student_portfolios', port.id), port);
          }

          // 13. Seed Evidence Mappings (evidence_mapping)
          const sampleMappings = [
            {
              id: 'map_01',
              evidence_id: 'vault_ev_01',
              criteria_id: 'criteria_1_1',
              mapped_at: new Date().toISOString()
            },
            {
              id: 'map_02',
              evidence_id: 'vault_ev_02',
              criteria_id: 'criteria_2_1',
              mapped_at: new Date().toISOString()
            }
          ];
          for (const mapping of sampleMappings) {
            await setDoc(doc(db, 'evidence_mapping', mapping.id), mapping);
          }

          // 14. Seed Users (users)
          const sampleUsers = [
            {
              email: 'jenprapa@pwtk.ac.th',
              name: 'ครูเจนประภา แก้วงาม',
              role: 'admin',
              created_at: new Date().toISOString()
            },
            {
              email: 'ganda@pwtk.ac.th',
              name: 'นร.หญิง กานดา สุวรรณ',
              role: 'student',
              classroom: 'ม.3/2',
              created_at: new Date().toISOString()
            },
            {
              email: 'somjet@pwtk.ac.th',
              name: 'ครูสมเจตน์ สังข์ทอง',
              role: 'teacher',
              created_at: new Date().toISOString()
            }
          ];
          for (const u of sampleUsers) {
            await setDoc(doc(db, 'users', u.email.toLowerCase()), u);
          }
        })(),
        timeoutPromise
      ]);

      setStatus('การเชื่อมต่อสำเร็จ! นำเข้าข้อมูลทั่วไป ก.7-009, เกณฑ์ตัวชี้วัด 15 รายการ, ทะเบียนพืช, แฟ้มสะสมงานนักเรียน, ผังความสัมพันธ์ และรายชื่อบัญชีโปรไฟล์ผู้ใช้งาน เรียบร้อยแล้ว! (หมายเหตุ: ผู้ใช้งานต้องเพิ่มบัญชีและตั้งรหัสผ่านบนระบบ Firebase Authentication ก่อนการเข้าใช้งาน)');
    } catch (err) {
      console.error(err);
      if (err.message === 'TIMEOUT_EXCEEDED') {
        setStatus('❌ การเชื่อมต่อล่าช้าผิดปกติ! กรุณาตรวจสอบว่า: 1. ได้กดสร้าง "Cloud Firestore Database" ในหน้าคอนโซล Firebase แล้วหรือยัง? 2. ได้เปิดสิทธิ์การอ่านเขียนของกฎความปลอดภัย (Security Rules) เป็นโหมดทดสอบ (Test Mode) หรือยัง?');
      } else {
        setStatus(`เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${err.message}`);
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!db) {
      alert('กรุณาบันทึกข้อมูลตั้งค่าและเชื่อมต่อ Firebase ก่อนทำการล้างข้อมูล');
      return;
    }
    if (!window.confirm('คุณแน่ใจว่าต้องการล้างข้อมูลทดสอบทั้งหมดในฐานข้อมูล Firestore หรือไม่? (ข้อมูลโครงสร้างพื้นฐานจะถูกเคลียร์ออก)')) {
      return;
    }

    setClearing(true);
    setStatus('กำลังดำเนินงานล้างข้อมูลในระบบ Firestore...');
    try {
      const docsToDelete = [
        { col: 'study_areas', ids: ['area_a01', 'area_a02', 'area_a03'] },
        { col: 'plants', ids: ['plant_kalpa', 'plant_thong', 'plant_fah'] },
        { col: 'k7_worksheets', ids: ['k7_kalpa', 'k7_fah'] },
        { col: 'rspg_school_info', ids: ['pai_wittyakarn'] },
        { col: 'rspg_admin_management', ids: ['doc_admin_01', 'doc_admin_02', 'doc_admin_03', 'doc_admin_04', 'doc_admin_05'] },
        { col: 'rspg_evaluation_criteria', ids: [
          'criteria_1_1', 'criteria_1_2', 'criteria_1_3', 'criteria_1_4', 'criteria_1_5',
          'criteria_2_1', 'criteria_2_2', 'criteria_2_3', 'criteria_3_1', 'criteria_3_2',
          'criteria_3_3', 'criteria_4_1', 'criteria_4_2', 'criteria_5_1', 'criteria_5_2'
        ] },
        { col: 'rspg_evidence_vault', ids: ['vault_ev_01', 'vault_ev_02'] },
        { col: 'rspg_goodness', ids: ['good_01', 'good_02'] },
        { col: 'rspg_learning_activities', ids: ['learn_01', 'learn_02'] },
        { col: 'rspg_plant_changes', ids: ['inc_01'] },
        { col: 'rspg_banners', ids: ['pai_config'] },
        { col: 'student_portfolios', ids: ['port_ganda', 'port_thawatchai'] },
        { col: 'evidence_mapping', ids: ['map_01', 'map_02'] },
        { col: 'users', ids: ['jenprapa@pwtk.ac.th', 'ganda@pwtk.ac.th', 'somjet@pwtk.ac.th'] }
      ];

      for (const group of docsToDelete) {
        for (const docId of group.ids) {
          try {
            await deleteDoc(doc(db, group.col, docId));
          } catch (e) {
            console.warn(`Skip clearing ${group.col}/${docId}:`, e);
          }
        }
      }

      setStatus('✅ ล้างข้อมูลทดสอบออกจาก Firestore สำเร็จเรียบร้อยแล้ว!');
    } catch (err) {
      setStatus('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="card glass-panel" style={{ maxWidth: '650px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <Database size={32} color="var(--color-primary)" />
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>ตั้งค่าการเชื่อมต่อฐานข้อมูล (Firebase Wizard)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เชื่อมโยง Cloud Firestore ของคุณเพื่อจัดเก็บข้อมูลจริงโดยไม่มี Mock Data</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} /> Firebase Web Config Object
          </label>
          <textarea
            className="form-control"
            rows="8"
            placeholder={`{
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
}`}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} /> Gemini API Key (ตัวเลือก - สำหรับ AI ช่วยเขียนคำอธิบาย)
          </label>
          <input
            type="password"
            className="form-control"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
        </div>

        {status && (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: status.includes('สำเร็จ') ? 'rgba(46, 125, 50, 0.1)' : 'rgba(255, 152, 0, 0.1)',
            color: status.includes('สำเร็จ') ? 'var(--color-success)' : 'var(--color-warning)',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} />
            <span>{status}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            <Check size={18} /> บันทึกการตั้งค่า
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <BookOpen size={18} color="var(--color-orchid)" /> ขั้นตอนเปิดใช้งานและเขียนข้อมูลลงระบบ
        </h3>
        <ol style={{ fontSize: '0.88rem', paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>เปิดไปที่เบราว์เซอร์เข้าหน้า <b>Firebase Console</b> แล้วสร้างโปรเจกต์ใหม่</li>
          <li>ในแท็บ <b>Build</b>, เปิดใช้งานบริการ <b>Cloud Firestore Database</b> และ <b>Storage</b> (สิทธิ์การเข้าถึงกำหนดให้อ่านเขียนได้สาธารณะชั่วคราวในการทดสอบ)</li>
          <li>ไปที่ฟันเฟืองตั้งค่าโครงการ คัดลอกออบเจกต์ <b>SDK Setup properties (Web Configuration)</b> มาวางในช่องด้านบนแล้วกดบันทึก</li>
          <li>เมื่อตั้งค่าเสร็จแล้ว ให้กดปุ่มนำเข้าข้อมูลด้านล่างเพื่อทำการสร้างคอลเลกชันและบันทึกข้อมูลตัวอย่างทันที:</li>
        </ol>

        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
          <button
            onClick={handleSeedDatabase}
            disabled={seeding || clearing || !configText}
            className="btn btn-orchid"
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Database size={16} /> {seeding ? 'กำลังนำเข้าข้อมูล...' : 'นำเข้าข้อมูลทดสอบเริ่มต้น (Seed Firestore)'}
          </button>

          <button
            onClick={handleClearDatabase}
            disabled={seeding || clearing || !configText}
            className="btn btn-secondary"
            style={{ flex: 1, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Trash2 size={16} /> {clearing ? 'กำลังล้าง...' : 'ล้างข้อมูลทดสอบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
