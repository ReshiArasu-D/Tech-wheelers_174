import React, { useState } from 'react';
import { 
  Globe2, 
  Layers, 
  AlertTriangle, 
  TrendingUp, 
  Scissors, 
  Ruler, 
  Bookmark,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LeftToolbar({
  is3D = true,
  onToggle3D,
  visibleLayers = {},
  onToggleLayer,
  onSelectHazardQuick,
  onOpenCrossSection,
  onFlyToLocation
}) {
  const [activeMenu, setActiveMenu] = useState(null); // 'layers' | 'bookmarks' | null

  const tools = [
    { id: '3d', label: '3D Map', icon: Globe2, active: is3D, onClick: onToggle3D },
    { id: 'layers', label: 'Layers', icon: Layers, active: activeMenu === 'layers', onClick: () => setActiveMenu(activeMenu === 'layers' ? null : 'layers') },
    { id: 'hazards', label: 'Hazards', icon: AlertTriangle, active: false, onClick: onSelectHazardQuick },
    { id: 'tracks', label: 'Storm Tracks', icon: TrendingUp, active: visibleLayers.tracks !== false, onClick: () => onToggleLayer?.('tracks') },
    { id: 'cross', label: 'Cross Section', icon: Scissors, active: false, onClick: onOpenCrossSection },
    { id: 'measure', label: 'Measure', icon: Ruler, active: false, onClick: () => alert('Spatial Distance Measurement: Click two points on satellite map to calculate range in km.') },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, active: activeMenu === 'bookmarks', onClick: () => setActiveMenu(activeMenu === 'bookmarks' ? null : 'bookmarks') },
  ];

  const layerItems = [
    { id: 'sat_hybrid', label: 'Base: Satellite Hybrid', fixed: true },
    { id: 'terrain', label: '3D Elevation (DEM)' },
    { id: 'sat_ir', label: 'INSAT-3D Thermal IR' },
    { id: 'dwr_obs', label: 'DWR Observed Reflectivity' },
    { id: 'dwr_pred', label: 'DWR Predicted (ConvGRU)' },
    { id: 'storms', label: 'Storm Objects & Centers' },
    { id: 'tracks', label: 'Storm Tracks & Corridors' },
    { id: 'motion', label: 'ERA5 U/V Wind Field' },
    { id: 'hazards', label: 'Active Hazard Field' },
  ];

  const bookmarkLocations = [
    { name: 'TERLS Radar (Kerala)', coords: [76.9366, 8.5241], zoom: 7.2 },
    { name: 'Odisha / Bhubaneswar', coords: [85.8245, 20.2961], zoom: 6.5 },
    { name: 'Bay of Bengal Deep Core', coords: [88.5480, 16.0000], zoom: 6.0 },
    { name: 'Kolkata Convective Hub', coords: [88.3639, 22.5726], zoom: 7.0 },
    { name: 'Andhra Coast (Visakhapatnam)', coords: [83.2185, 17.6868], zoom: 7.0 },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '14px',
      left: '14px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Compact Tool Button Rail */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '5px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        {tools.map(tool => {
          const Icon = tool.icon;
          const isSelected = tool.active;
          const isPrimary3D = tool.id === '3d' && isSelected;
          return (
            <button
              key={tool.id}
              onClick={tool.onClick}
              title={tool.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '46px',
                height: '46px',
                borderRadius: '6px',
                background: isPrimary3D ? '#2563EB' : (isSelected ? '#EFF6FF' : 'transparent'),
                border: isPrimary3D ? 'none' : (isSelected ? '1px solid #BFDBFE' : '1px solid transparent'),
                color: isPrimary3D ? '#FFFFFF' : (isSelected ? '#2563EB' : '#475569'),
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isPrimary3D) {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#0F172A';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isPrimary3D) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              <Icon size={17} />
              <span style={{ 
                fontSize: '8px', 
                fontWeight: 600, 
                marginTop: '3px', 
                textAlign: 'center', 
                letterSpacing: '-0.02em',
                lineHeight: 1
              }}>
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Layers Flyout Popover */}
      {activeMenu === 'layers' && (
        <div style={{
          position: 'absolute',
          left: '60px',
          top: '30px',
          width: '235px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '0.04em' }}>
            MAP LAYER STACK (ORDERED)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {layerItems.map(l => {
              const isVis = visibleLayers[l.id] !== false;
              return (
                <div
                  key={l.id}
                  onClick={() => !l.fixed && onToggleLayer?.(l.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    background: isVis ? '#EFF6FF' : '#F8FAFC',
                    border: isVis ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                    cursor: l.fixed ? 'default' : 'pointer',
                    fontSize: '11px',
                    fontWeight: isVis ? 600 : 500,
                    color: isVis ? '#1E40AF' : '#64748B'
                  }}
                >
                  <span>{l.label}</span>
                  {l.fixed ? (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563EB' }}>LOCKED</span>
                  ) : (
                    isVis ? <Eye size={13} color="#2563EB" /> : <EyeOff size={13} color="#94A3B8" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookmarks Flyout Popover */}
      {activeMenu === 'bookmarks' && (
        <div style={{
          position: 'absolute',
          left: '60px',
          top: '160px',
          width: '210px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '0.04em' }}>
            RADAR COVERAGE REGIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {bookmarkLocations.map((b, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onFlyToLocation?.(b);
                  setActiveMenu(null);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '5px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{b.name}</span>
                <ChevronRight size={13} color="#64748B" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
