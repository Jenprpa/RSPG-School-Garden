import React from 'react';
import { Shield, BookOpen, Globe, Lock, CheckSquare } from 'lucide-react';

export default function Navbar({ activeTab, userRole, viewMode, setViewMode }) {
  const getTabTitle = () => {
    if (viewMode === 'public') {
      return 'เว็บไซต์เผยแพร่ข้อมูลสวนพฤกษศาสตร์โรงเรียน (สาธารณะ)';
    }

    switch (activeTab) {
      case 'dashboard': return 'แดชบอร์ดบริหารดำเนินงานและปีการศึกษา';
      case 'k7009-form': return 'แบบประเมินสถานศึกษา ก.7-009';
      case 'k7003-docs': return 'ระบบวิเคราะห์สัณฐานพรรณไม้ ก.7-003';
      case 'student-portfolios': return 'ผลงานนักเรียน ก.7-003 (Student Portfolios)';
      case 'plant-registry': return 'ทะเบียนพรรณไม้โรงเรียน (Plant Registry)';
      case 'plant-study': return 'พืชศึกษา (องค์ประกอบที่ 3)';
      case 'teacher-learning': return 'ระบบเก็บเอกสารจัดการสอนของครู';
      case 'local-resources': return 'ฐานทรัพยากรท้องถิ่น (Local Resources)';
      case 'evidence-vault': return 'คลังหลักฐานสรุปผลเสนอประเมิน';
      case 'evidence-mapping': return 'ระบบจัดแผนผังหลักฐานประเมิน (Evidence Mapping)';
      case 'readiness-check': return 'ระบบเช็คความพร้อมการประเมิน (Readiness Audit)';
      case 'evaluation-report': return 'ระบบพิมพ์และส่งออกเอกสารรายงาน';
      case 'banners-config': return 'จัดการเว็บไซต์ประชาสัมพันธ์สาธารณะ';
      case 'settings': return 'ตั้งค่าระบบฐานข้อมูล อพ.สธ.';
      case 'profile': return 'ข้อมูลผู้ใช้งานและเปลี่ยนรหัสผ่าน';
      case 'admin-management': return 'ด้านที่ 1: การบริหารและการจัดการดำเนินงาน อพ.สธ.';
      case 'elements-management': return 'ด้านที่ 2: ดำเนินงาน 5 องค์ประกอบพฤกษศาสตร์โรงเรียน';
      case 'system-audit': return 'ระบบตรวจความพร้อมและการตรวจสอบภายใน (System Audit)';
      default: return 'ระบบงานสวนพฤกษศาสตร์โรงเรียน (อพ.สธ.)';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '1. ผู้ดูแลระบบ (Admin)';
      case 'rspg_board': return '2. คณะกรรมการ อพ.สธ.';
      case 'teacher': return '3. ครูผู้สอน';
      case 'project_advisor': return '4. ครูที่ปรึกษาโครงงาน';
      case 'student': return '5. นักเรียน';
      case 'doc_officer': return '6. เจ้าหน้าที่งานเอกสาร';
      case 'executive': return '7. ผู้บริหาร';
      case 'evaluator': return '8. กรรมการประเมิน (Read-Only)';
      default: return 'ผู้ใช้ทั่วไป';
    }
  };

  return (
    <header className="navbar" style={{ padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
      
      {/* Title */}
      <div className="navbar-left">
        <h2 className="page-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            backgroundColor: '#fff', 
            borderRadius: '50%', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 0 6px rgba(0, 0, 0, 0.1)',
            padding: '0px',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img src="/rspg-logo.png" alt="อพ.สธ." style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {getTabTitle()}
        </h2>
      </div>

      {/* Center: 3-Way Mode Switcher */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--bg-main)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setViewMode('public')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.9rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: viewMode === 'public' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'public' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s'
          }}
        >
          <Globe size={14} />
          <span>เว็บสาธารณะ</span>
        </button>

        <button
          onClick={() => setViewMode('internal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.9rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: viewMode === 'internal' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'internal' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s'
          }}
        >
          <Lock size={14} />
          <span>ดำเนินงานภายใน</span>
        </button>

        <button
          onClick={() => setViewMode('evaluation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.9rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: viewMode === 'evaluation' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'evaluation' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s'
          }}
        >
          <CheckSquare size={14} />
          <span>ตรวจสอบประเมินผล</span>
        </button>
      </div>

      {/* Right User Role Badge */}
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {viewMode !== 'public' ? (
          <span className={`role-badge role-${userRole === 'rspg_teacher' ? 'teacher' : userRole}`} style={{ fontSize: '0.78rem' }}>
            <Shield size={12} />
            {getRoleLabel(userRole)}
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🟢 บุคคลทั่วไปเข้าเยี่ยมชม
          </span>
        )}
      </div>

    </header>
  );
}
