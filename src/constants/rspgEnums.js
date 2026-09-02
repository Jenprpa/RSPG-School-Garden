// ============================================================================
// RSPG Standards & Whitelist Enums (Strict Backend Schema Alignment)
// ============================================================================

/**
 * Plant Uses Whitelist (PlantUse Enum)
 * Mandatory: Must be checkbox multi-select in UI. Free-text is strictly forbidden.
 */
export const PLANT_USES = [
  { value: 'medicine', label: '🌿 ยาสมุนไพร / การแพทย์พื้นบ้าน' },
  { value: 'food', label: '🍲 อาหาร / เครื่องดื่ม / พืชผัก' },
  { value: 'timber', label: '🪵 ไม้ใช้สอย / ก่อสร้าง / เครื่องเรือน' },
  { value: 'ornamental', label: '🌸 ไม้ประดับ / ให้ร่มเงา / ปรับภูมิทัศน์' },
  { value: 'culture', label: '🕯️ พิธีกรรม / ประเพณี / ความเชื่อ' },
  { value: 'fiber_dye', label: '🧵 หัตถกรรม / สีย้อมธรรมชาติ / เส้นใย' },
  { value: 'poison', label: '☠️ พืชมีพิษ / ยาเบื่อ / ป้องกันศัตรูพืช' },
  { value: 'other', label: '💡 อื่นๆ (ระบุในช่องหมายเหตุ)' }
];

/**
 * Media Category Whitelist (media.category)
 * Mandatory: Dropdown selection before upload is required.
 */
export const MEDIA_CATEGORIES = [
  { value: 'habit', label: '1. วิสัย / ทรงต้น (Habit)', icon: '🌳' },
  { value: 'root', label: '2. ระบบราก (Root)', icon: '🌱' },
  { value: 'stem', label: '3. ลำต้นและเปลือก (Stem & Bark)', icon: '🪵' },
  { value: 'leaf', label: '4. ลักษณะใบ (Leaf)', icon: '🍃' },
  { value: 'flower', label: '5. ลักษณะดอก (Flower)', icon: '🌸' },
  { value: 'fruit', label: '6. ลักษณะผล (Fruit)', icon: '🍎' },
  { value: 'seed', label: '7. ลักษณะเมล็ด (Seed)', icon: '🌰' },
  { value: 'drawing', label: '8. ภาพวาดลายเส้น ก.7-003 (Drawing)', icon: '🎨' },
  { value: 'overview', label: '9. ภาพรวมถิ่นอาศัย / ป้ายชื่อ (Overview)', icon: '📸' }
];

/**
 * Location Measurement Method (location.method)
 * Mandatory: Dropdown selection drives conditional GPS vs X/Y inputs.
 */
export const LOCATION_METHODS = [
  { value: 'gps', label: '🛰️ พิกัดดาวเทียม GPS (Latitude / Longitude)' },
  { value: 'coordinate_pair', label: '📐 คู่พิกัดระยะบนผัง (X / Y Coordinates)' },
  { value: 'compass_bearing', label: '🧭 ทิศทางและมุมเข็มทิศ (Compass Bearing)' },
  { value: 'step_count', label: '🚶 การนับก้าวระยะสำรวจ (Step Count)' }
];

/**
 * Page 8-10 Match Status (page8.matchStatus)
 * Mandatory: Dropdown selection only.
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
