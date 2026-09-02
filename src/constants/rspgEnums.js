// ============================================================================
// RSPG Standards & Whitelist Enums (Strict Backend Schema Alignment with types.ts)
// ============================================================================

/**
 * Plant Uses Whitelist (PlantUse Enum from types.ts)
 * Whitelist: food, medicine, construction, tools, pest_control, tradition_culture, toxic_danger, other
 */
export const PLANT_USES = [
  { value: 'food', label: '🍲 อาหาร / เครื่องดื่ม / พืชผัก' },
  { value: 'medicine', label: '🌿 ยาสมุนไพร / การแพทย์พื้นบ้าน' },
  { value: 'construction', label: '🪵 ก่อสร้าง / เครื่องเรือน / ที่อยู่อาศัย' },
  { value: 'tools', label: '🔨 เครื่องมือ / อุปกรณ์ / เครื่องใช้สอย' },
  { value: 'pest_control', label: '🐛 ควบคุมศัตรูพืช / ป้องกันแมลง' },
  { value: 'tradition_culture', label: '🕯️ ประเพณี / พิธีกรรม / ความเชื่อ / วัฒนธรรม' },
  { value: 'toxic_danger', label: '⚠️ พืชมีพิษ / อันตราย' },
  { value: 'other', label: '💡 อื่นๆ (ระบุในช่องหมายเหตุ)' }
];

/**
 * Media Category Whitelist (PlantMediaCategory from types.ts)
 * Whitelist: whole_plant, leaf, flower, fruit, seed, dried_specimen, preserved_specimen, part_specimen, complete_label, study_sheet_scan
 */
export const MEDIA_CATEGORIES = [
  { value: 'whole_plant', label: '🌳 ภาพต้นไม้ทั้งต้น (Whole Plant)', icon: '🌳' },
  { value: 'leaf', label: '🍃 ภาพลักษณะใบ (Leaf)', icon: '🍃' },
  { value: 'flower', label: '🌸 ภาพลักษณะดอก (Flower)', icon: '🌸' },
  { value: 'fruit', label: '🍎 ภาพลักษณะผล (Fruit)', icon: '🍎' },
  { value: 'seed', label: '🌰 ภาพลักษณะเมล็ด (Seed)', icon: '🌰' },
  { value: 'dried_specimen', label: '📄 ตัวอย่างพรรณไม้แห้ง (Dried Specimen)', icon: '📄' },
  { value: 'preserved_specimen', label: '🧪 ตัวอย่างพรรณไม้ดอง (Preserved Specimen)', icon: '🧪' },
  { value: 'part_specimen', label: '🪵 ตัวอย่างชิ้นส่วนเฉพาะ/เปลือก/ลำต้น/ราก (Part Specimen)', icon: '🪵' },
  { value: 'complete_label', label: '🏷️ ป้ายชื่อพรรณไม้สมบูรณ์ (Complete Label)', icon: '🏷️' },
  { value: 'study_sheet_scan', label: '📝 สแกนเอกสารใบงาน ก.7-003 (Study Sheet Scan)', icon: '📝' }
];

/**
 * Location Measurement Method (location.method from types.ts)
 * Whitelist: step_count, compass_bearing, coordinate_pair, gps
 */
export const LOCATION_METHODS = [
  { value: 'gps', label: '🛰️ พิกัดดาวเทียม GPS (Latitude / Longitude)' },
  { value: 'coordinate_pair', label: '📐 คู่พิกัดระยะบนผัง (X / Y Coordinates)' },
  { value: 'compass_bearing', label: '🧭 ทิศทางและมุมเข็มทิศ (Compass Bearing)' },
  { value: 'step_count', label: '🚶 การนับก้าวระยะสำรวจ (Step Count)' }
];

/**
 * Page 8-10 Match Status (page8.matchStatus from types.ts)
 * Whitelist: match, partial, mismatch
 */
export const PAGE8_MATCH_STATUS = [
  { value: 'match', label: '✅ ตรงกับเอกสารอ้างอิงทั้งหมด (100% Match)', color: '#1E6B37', bg: '#EAF7ED' },
  { value: 'partial', label: '⚠️ ตรงบางส่วน / อยู่ระหว่างเทียบเคียง (Partial Match)', color: '#94690A', bg: '#FFF9E6' },
  { value: 'mismatch', label: '❌ ไม่ตรงกับเอกสารอ้างอิง / ยังไม่พบข้อมูล (Mismatch)', color: '#D32F2F', bg: '#FDEAEA' }
];

/**
 * Academic Years
 */
export const ACADEMIC_YEARS = ['2569', '2568', '2567', '2566'];

/**
 * School Zones
 */
export const SCHOOL_ZONES = [
  { id: 'Zone A', name: 'โซน A: สวนพฤกษศาสตร์หน้าอาคาร 1', color: '#5C1D8D', x: 25, y: 30 },
  { id: 'Zone B', name: 'โซน B: สวนหย่อมเรือนเพาะชำ', color: '#1E6B37', x: 70, y: 35 },
  { id: 'Zone C', name: 'โซน C: แปลงเกษตรและพืชสมุนไพร', color: '#C5931C', x: 30, y: 75 },
  { id: 'Zone D', name: 'โซน D: ลานพรรณไม้ทรงปลูกหน้าหอประชุม', color: '#1565C0', x: 75, y: 75 },
  { id: 'Zone E', name: 'โซน E: แนวรั้วรอบโรงเรียนและพืชริมทาง', color: '#7B1FA2', x: 50, y: 15 },
  { id: 'Zone F', name: 'โซน F: พื้นที่อนุรักษ์ป่าธรรมชาติหลังโรงเรียน', color: '#00695C', x: 50, y: 90 }
];
