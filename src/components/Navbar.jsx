import { useState } from 'react';
import { Calendar, ChevronDown, User, LogOut, Menu } from 'lucide-react';

export default function Navbar({ activeTab, userRole, viewMode, onLogout }) {
  const [academicYear, setAcademicYear] = useState('2567');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const getTabTitle = () => {
    if (viewMode === 'public') {
      return 'เว็บไซต์เผยแพร่ข้อมูลสวนพฤกษศาสตร์โรงเรียน (สาธารณะ)';
    }

    switch (activeTab) {
      case 'dashboard': return 'ภาพรวม (Dashboard)';
      case 'k7009-form': return 'แบบประเมินสถานศึกษา ก.7-009';
      case 'k7003-docs': return 'องค์ประกอบที่ 5: การนำไปใช้ประโยชน์';
      case 'student-portfolios': return 'องค์ประกอบที่ 4: รายงานผลการเรียนรู้';
      case 'plant-registry': return 'องค์ประกอบที่ 2: รวบรวมพรรณไม้เข้าปลูก';
      case 'plant-study': return 'องค์ประกอบที่ 3: ศึกษาข้อมูลด้านต่าง ๆ';
      case 'teacher-learning': return 'ด้านที่ 3: ผลการดำเนินงาน';
      case 'local-resources': return 'สาระที่ 3: ประโยชน์แท้แก่มหาชน';
      case 'evidence-vault': return 'ตรวจหลักฐาน / คลังหลักฐาน';
      case 'evidence-mapping': return 'สาระที่ 2: สรรพสิ่งล้วนพันเกี่ยว';
      case 'readiness-check': return 'ด้านที่ 4: ความถูกต้องทางวิชาการ';
      case 'evaluation-report': return 'รายงานและส่งออกเอกสาร';
      case 'banners-config': return 'จัดการเว็บไซต์ประชาสัมพันธ์';
      case 'settings': return 'ตั้งค่าระบบฐานข้อมูล';
      case 'profile': return 'ข้อมูลผู้ใช้งาน';
      case 'admin-management': return 'ด้านที่ 1: การบริหารและการจัดการ';
      case 'elements-management': return 'ด้านที่ 2: การดำเนินงาน 5 องค์ประกอบ';
      case 'system-audit': return 'ระบบตรวจความพร้อมภายใน';
      case 'plant-tags': return 'องค์ประกอบที่ 1: จัดทำป้ายชื่อพรรณไม้';
      case 'online-worksheets': return 'สาระที่ 1: ธรรมชาติแห่งชีวิต';
      default: return 'ภาพรวม (Dashboard)';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ (Admin)';
      case 'rspg_board': return 'คณะกรรมการ อพ.สธ.';
      case 'teacher': return 'ครูผู้รับผิดชอบ';
      case 'project_advisor': return 'ครูที่ปรึกษา';
      case 'student': return 'นักเรียน';
      case 'doc_officer': return 'เจ้าหน้าที่งานเอกสาร';
      case 'executive': return 'ผู้บริหาร';
      case 'evaluator': return 'กรรมการประเมิน';
      default: return 'ครูผู้รับผิดชอบ';
    }
  };

  return (
    <header
      className="navbar"
      style={{
        height: '64px',
        minHeight: '64px',
        maxHeight: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E7E4EA',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}
    >
      {/* Left: Hamburger + Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          style={{ background: 'none', border: 'none', color: '#24212A', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          aria-label="Menu"
        >
          <Menu size={20} color="#24212A" />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#24212A', margin: 0, lineHeight: 1.35 }}>
          {getTabTitle()}
        </h1>
      </div>

      {/* Right: Academic Year Selector + Current User Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Academic Year Selector */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #E5CA79',
              backgroundColor: '#FDF6E2',
              fontSize: '13px',
              color: '#94690A',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(197, 147, 28, 0.12)'
            }}
          >
            <Calendar size={14} color="#C5931C" />
            <span>ปีการศึกษา {academicYear}</span>
            <ChevronDown size={14} color="#94690A" />
          </div>

          {isYearDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '38px',
                left: 0,
                width: '140px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                border: '1px solid #E7E4EA',
                padding: '4px',
                zIndex: 100
              }}
            >
              {['2567', '2568', '2569'].map(yr => (
                <button
                  key={yr}
                  onClick={() => {
                    setAcademicYear(yr);
                    setIsYearDropdownOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    background: yr === academicYear ? '#F5EFFA' : 'none',
                    color: yr === academicYear ? '#7137A8' : '#24212A',
                    fontWeight: yr === academicYear ? 600 : 400,
                    fontSize: '13px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  ปีการศึกษา {yr}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direct Clean Logout Action Button (Replaces status box) */}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #F5C2C2',
              backgroundColor: '#FFF5F5',
              color: '#D32F2F',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="ออกจากระบบ"
          >
            <LogOut size={14} color="#D32F2F" />
            <span>ออกจากระบบ</span>
          </button>
        )}
      </div>
    </header>
  );
}
