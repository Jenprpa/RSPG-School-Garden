import React, { useState } from 'react';
import { MapPin, Info, X, Filter, Search } from 'lucide-react';

export default function PlantMap({ plants, onSelectPlant, schoolMapUrl }) {
  // Map lat/lng coordinates to SVG x/y canvas size 600x400
  const width = 600;
  const height = 400;

  // Filter and popover states
  const [selectedMapPlant, setSelectedMapPlant] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | tree | other
  const [tagFilter, setTagFilter] = useState('all'); // all | yes | no

  // Find min/max coordinate bounds to map them into SVG canvas
  const getCoordinates = () => {
    if (!plants || plants.length === 0) return [];

    // Fixed geographic bounds matching the downloaded Pai Wittayakarn satellite map image:
    const minLat = 19.35450;
    const maxLat = 19.35744;
    const minLng = 98.44061;
    const maxLng = 98.44439;

    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;

    return plants.map(p => {
      const lat = parseFloat(p.gps_lat) || 19.3559;
      const lng = parseFloat(p.gps_lng) || 98.4420;

      // Translate coordinates to SVG space (Invert Y because SVG 0 is top)
      const x = ((lng - minLng) / (lngRange || 1)) * (width - 100) + 50;
      const y = (1 - (lat - minLat) / (latRange || 1)) * (height - 100) + 50;

      return {
        ...p,
        mapX: x,
        mapY: y
      };
    });
  };

  const mappedPlants = getCoordinates();

  // Apply filters
  const filteredPlants = mappedPlants.filter(p => {
    const matchSearch = (p.thai_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.plant_code || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.scientific_name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' ||
                      (typeFilter === 'tree' && p.plant_type === 'ไม้ต้น') ||
                      (typeFilter === 'other' && p.plant_type !== 'ไม้ต้น');
    const matchTag = tagFilter === 'all' ||
                     (tagFilter === 'yes' && p.is_tagged === 'มี') ||
                     (tagFilter === 'no' && p.is_tagged !== 'มี');
    return matchSearch && matchType && matchTag;
  });

  return (
    <div className="card" style={{ padding: '1rem', position: 'relative' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} color="var(--color-primary)" />
          แผนที่สารสนเทศภูมิศาสตร์พิกัดพรรณไม้ (Interactive GIS Map) 🗺️
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          คลิกหมุดกลมสีต่าง ๆ เพื่อเปิดแผงข้อมูลการศึกษาพืช
        </span>
      </div>

      {/* Map Control Filters Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '180px', backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพืช หรือรหัส..."
            className="form-control"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedMapPlant(null); }}
            style={{ border: 'none', fontSize: '0.78rem', padding: '4px 2px', width: '100%', outline: 'none', backgroundColor: 'transparent' }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setSelectedMapPlant(null); }}
          className="form-control"
          style={{ width: '130px', fontSize: '0.78rem', padding: '4px 8px', cursor: 'pointer', height: '28px' }}
        >
          <option value="all">ทุกวิสัย / พืชศึกษา</option>
          <option value="tree">ไม้ยืนต้น / ไม้ต้น</option>
          <option value="other">พืชล้มลุก / อื่น ๆ</option>
        </select>

        <select
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setSelectedMapPlant(null); }}
          className="form-control"
          style={{ width: '135px', fontSize: '0.78rem', padding: '4px 8px', cursor: 'pointer', height: '28px' }}
        >
          <option value="all">ทุกสถานะป้ายรหัส</option>
          <option value="yes">ติดตั้งป้ายชื่อแล้ว</option>
          <option value="no">ยังไม่ติดตั้งป้าย</option>
        </select>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Interactive SVG School Layout */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render satellite Google Earth image if available */}
          <image
            href={schoolMapUrl || "./pai-satellite-map.png"}
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
            opacity="0.9"
          />

          {/* Plant Nodes */}
          {filteredPlants.map((plant) => {
            const isSelected = selectedMapPlant?.id === plant.id;
            return (
              <g
                key={plant.id}
                onClick={() => setSelectedMapPlant(plant)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulsing glow ring */}
                <circle
                  cx={plant.mapX}
                  cy={plant.mapY}
                  r={isSelected ? "14" : "10"}
                  fill={isSelected ? "var(--color-gold)" : "var(--color-primary)"}
                  opacity={isSelected ? "0.5" : "0.3"}
                >
                  <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Center point */}
                <circle
                  cx={plant.mapX}
                  cy={plant.mapY}
                  r="6"
                  fill={plant.plant_type === 'ไม้ต้น' ? 'var(--color-primary)' : 'var(--color-orchid)'}
                  stroke={isSelected ? "var(--color-gold)" : "#fff"}
                  strokeWidth={isSelected ? "2.5" : "1.5"}
                />

                {/* Text label */}
                <text
                  x={plant.mapX}
                  y={plant.mapY - 12}
                  fontSize="8"
                  fontWeight="bold"
                  fill={isSelected ? "var(--color-gold)" : "var(--text-main)"}
                  textAnchor="middle"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '2px',
                    pointerEvents: 'none'
                  }}
                >
                  {plant.thai_name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '15px',
          padding: '0.75rem',
          fontSize: '0.78rem',
          backgroundColor: 'rgba(0,0,0,0.03)',
          borderTop: '1px solid var(--border-color)',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></span>
            <span>ไม้ยืนต้น / ไม้ต้น ({filteredPlants.filter(p => p.plant_type === 'ไม้ต้น').length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-orchid)' }}></span>
            <span>พืชล้มลุก / อื่นๆ ({filteredPlants.filter(p => p.plant_type !== 'ไม้ต้น').length})</span>
          </div>
        </div>

        {/* Interactive GIS Popover Card Overlay */}
        {selectedMapPlant && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            backgroundColor: 'var(--bg-sidebar)',
            border: '1px solid rgba(177, 91, 227, 0.25)',
            boxShadow: '0 8px 25px rgba(132, 59, 206, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            gap: '14px',
            color: '#fff',
            zIndex: 10,
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(15px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>

            {/* Thumbnail */}
            <img
              src={selectedMapPlant.image_url || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="%23a855f7" opacity="0.1"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="24">🌿</text></svg>`}
              alt={selectedMapPlant.thai_name}
              style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}
            />

            {/* Information */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                    {selectedMapPlant.thai_name}
                  </h4>
                  <button
                    onClick={() => setSelectedMapPlant(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {selectedMapPlant.scientific_name || 'ไม่ระบุชื่อวิทยาศาสตร์'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>
                  <span>รหัส: <b>{selectedMapPlant.plant_code}</b></span>
                  <span>•</span>
                  <span>ป้ายรหัส: <b>{selectedMapPlant.is_tagged === 'มี' ? 'ติดตั้งแล้ว' : 'ไม่มี'}</b></span>
                </div>

                <button
                  onClick={() => onSelectPlant(selectedMapPlant)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Info size={10} /> ดูข้อมูลพฤกษศาสตร์ ก.7-003
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
