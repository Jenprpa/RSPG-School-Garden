import React from 'react';
import { Tag, MapPin, Calendar, User, Eye, QrCode } from 'lucide-react';

export default function PlantCard({ plant, onView, onPrintLabel }) {
  // Fallback default image for plants using SVGs
  const defaultImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%232E7D32" opacity="0.1"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="40">🌿</text></svg>`;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '65%', overflow: 'hidden', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#e2ebe2' }}>
        <img
          src={plant.image_url || defaultImage}
          alt={plant.thai_name}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(46, 125, 50, 0.9)',
          color: '#fff',
          padding: '0.2rem 0.6rem',
          borderRadius: '50px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          {plant.plant_type || 'ไม่ระบุประเภท'}
        </div>
        {plant.status === 'รอการตรวจสอบ' && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#e65100',
            color: '#fff',
            padding: '0.2rem 0.6rem',
            borderRadius: '50px',
            fontSize: '0.72rem',
            fontWeight: 600
          }}>
            🕒 รอตรวจ
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <Tag size={12} />
          <span>{plant.plant_code}</span>
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
          {plant.thai_name}
        </h3>

        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 600, color: 'var(--color-orchid)', marginBottom: '8px' }}>
          {plant.scientific_name || 'ไม่มีชื่อวิทยาศาสตร์'}
        </p>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          <b>วงศ์:</b> {plant.family_name || 'ไม่ระบุ'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={12} />
            <span>{plant.planting_location || 'ไม่ระบุสถานที่'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={12} />
            <span>{plant.survey_date || 'ไม่ระบุวันที่'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={12} />
            <span>ผู้สำรวจ: {plant.surveyor || 'ไม่ระบุ'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <button
            onClick={() => onView(plant)}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
          >
            <Eye size={14} /> รายละเอียด
          </button>
          <button
            onClick={() => onPrintLabel(plant)}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
          >
            <QrCode size={14} /> พิมพ์ป้าย QR
          </button>
        </div>
      </div>
    </div>
  );
}
