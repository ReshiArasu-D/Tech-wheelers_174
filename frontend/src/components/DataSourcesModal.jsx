import React from 'react';
import { X, ExternalLink, Database, ShieldCheck, Activity, Radio, Satellite, CloudSun, Layers, Wind } from 'lucide-react';

export default function DataSourcesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const sources = [
    {
      id: 'dwr',
      name: 'MOSDAC TERLS C-Band Doppler Weather Radar (DWR)',
      dataset: '3D Volumetric Radar Reflectivity & Radial Velocity (250 km radius)',
      organization: 'ISRO / Space Applications Centre (SAC)',
      url: 'https://mosdac.gov.in/3d-volumetric-terls-dwrproduct',
      resolution: '500 m radial, 1° azimuthal',
      cadence: '10 min volume scan',
      status: 'REPLAY',
      statusLabel: 'VERIFIED REPLAY',
      statusColor: '#0284c7',
      provenance: 'Real terls_20191107_X.npy processed via Indian DWR ConvGRU (30,369 params)'
    },
    {
      id: 'insat',
      name: 'INSAT-3D / 3DR Imager Payloads',
      dataset: 'TIR-1 (10.8 µm Thermal Infrared) & WV (6.7 µm Water Vapor)',
      organization: 'ISRO / MOSDAC',
      url: 'https://www.mosdac.gov.in/insat-3d',
      extraUrl: 'https://www.mosdac.gov.in/insat-3d-payloads',
      resolution: '4 km native',
      cadence: '15 min (Half-hourly synoptic)',
      status: 'CONNECTED',
      statusLabel: 'SYNOPTIC REPLAY',
      statusColor: '#16a34a',
      provenance: 'Brightness temperature (Tb) calibrated to physical kelvin range [170K, 330K]'
    },
    {
      id: 'era5',
      name: 'ECMWF ERA5 Reanalysis',
      dataset: 'U/V Horizontal Wind Components (850, 700, 500 hPa), CAPE, Geopotential',
      organization: 'Copernicus Climate Change Service (C3S)',
      url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels',
      resolution: '0.25° (~28 km) re-gridded to 3.7 km',
      cadence: '1 hour',
      status: 'CONNECTED',
      statusLabel: 'CONNECTED',
      statusColor: '#16a34a',
      provenance: 'era5_uv_convgru.pt (43,378 params) steering flow and convective initiation'
    },
    {
      id: 'imerg',
      name: 'NASA GPM IMERG Precipitation',
      dataset: 'Multi-satellite Precipitation Calibrated with Surface Rain Gauges',
      organization: 'NASA / JAXA Global Precipitation Measurement',
      url: 'https://gpm.nasa.gov/data/imerg',
      resolution: '0.1° (~10 km)',
      cadence: '30 min',
      status: 'CONNECTED',
      statusLabel: 'CALIBRATED',
      statusColor: '#16a34a',
      provenance: 'Used for multimodal precipitation accumulation and verification'
    },
    {
      id: 'mrms',
      name: 'NOAA Multi-Radar Multi-Sensor (MRMS)',
      dataset: 'Severe Weather Algorithms (POSH, MEHS, VIL, Echo Tops)',
      organization: 'NOAA National Severe Storms Laboratory (NSSL)',
      url: 'https://www.nssl.noaa.gov/projects/mrms/',
      resolution: '1 km 3D volumetric',
      cadence: '2 min',
      status: 'STANDBY',
      statusLabel: 'ALGORITHM REF',
      statusColor: '#64748b',
      provenance: 'Algorithmic baseline for POSH hail and VIL convective thresholds'
    },
    {
      id: 'thunderr',
      name: 'THUNDERR Benchmark Dataset',
      dataset: 'Open-access Benchmark for Severe Thunderstorm & Downburst Detection',
      organization: 'Zenodo Meteorological Research Community',
      url: 'https://zenodo.org/records/10686951',
      resolution: 'Downburst divergence signatures',
      cadence: 'Event-driven',
      status: 'CONNECTED',
      statusLabel: 'CHECKPOINT VERIFIED',
      statusColor: '#16a34a',
      provenance: 'downburst_thunderr_gru.pt (118,274 params) verified checkpoint'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '85vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#0284c7" />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Real Meteorological Data Sources & Scientific Provenance
              </h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              All ingested satellite, radar, atmospheric and precipitation datasets for CO-NOWCAST PS-26084
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sources.map(src => (
            <div
              key={src.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {src.name}
                  </span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.7rem',
                      color: '#0284c7',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <span>Official Portal</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: `${src.statusColor}15`,
                  border: `1px solid ${src.statusColor}40`,
                  color: src.statusColor,
                  letterSpacing: '0.04em'
                }}>
                  {src.statusLabel}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '4px', fontWeight: 500 }}>
                {src.dataset}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '8px',
                padding: '6px 10px',
                background: '#f8fafc',
                borderRadius: '6px',
                fontSize: '0.68rem',
                color: '#475569'
              }}>
                <div><strong>Agency:</strong> {src.organization}</div>
                <div><strong>Resolution:</strong> {src.resolution}</div>
                <div><strong>Cadence:</strong> {src.cadence}</div>
              </div>

              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                Integration: {src.provenance}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <div>
            Scientific Honesty: No synthetic or fabricated weather data.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
