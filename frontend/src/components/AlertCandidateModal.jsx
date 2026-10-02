import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, X, AlertTriangle, UserCheck, UserX, Clock, MapPin, Activity, HelpCircle } from 'lucide-react';

export default function AlertCandidateModal({
  isOpen,
  onClose,
  alertCandidates = [],
  onApproveAlert,
  onRejectAlert
}) {
  const [actingId, setActingId] = useState(null);
  const [operatorName, setOperatorName] = useState('Chief Duty Meteorologist (Shift Alpha)');
  const [notes, setNotes] = useState('Convective core intensification verified via INSAT-3D Tb cooling rate and optical flow trajectory.');
  const [rejectReason, setRejectReason] = useState('Convective decay observed; cell weakening below severe warning threshold.');
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates', 'approved', 'rejected'

  if (!isOpen) return null;

  const handleApprove = async (alertId) => {
    setActingId(alertId);
    try {
      if (onApproveAlert) {
        await onApproveAlert(alertId, operatorName, notes);
      }
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (alertId) => {
    setActingId(alertId);
    try {
      if (onRejectAlert) {
        await onRejectAlert(alertId, operatorName, rejectReason);
      }
    } finally {
      setActingId(null);
    }
  };

  const pendingList = alertCandidates.filter(a => a.status === 'CANDIDATE');
  const approvedList = alertCandidates.filter(a => a.status === 'APPROVED');
  const rejectedList = alertCandidates.filter(a => a.status === 'REJECTED');

  const displayedList = activeTab === 'candidates'
    ? pendingList
    : (activeTab === 'approved' ? approvedList : rejectedList);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div 
        className="box-card"
        style={{
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden'
        }}
      >
        {/* Header - Explicitly saying ALERT CANDIDATE & HUMAN APPROVAL REQUIRED */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #FECACA',
          background: 'linear-gradient(90deg, #FEF2F2 0%, #FFFFFF 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={22} color="#DC2626" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.01em' }}>
                  ALERT CANDIDATE
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  letterSpacing: '0.04em'
                }}>
                  HUMAN APPROVAL REQUIRED
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                Operational Decision Support: AI will NEVER autonomously broadcast emergency alerts
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="box-btn"
            style={{ 
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B'
            }}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Tab Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC'
        }}>
          <button
            onClick={() => setActiveTab('candidates')}
            className="box-btn"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: activeTab === 'candidates' ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
              background: activeTab === 'candidates' ? '#FEE2E2' : '#FFFFFF',
              color: activeTab === 'candidates' ? '#DC2626' : '#64748B'
            }}
          >
            Pending Review ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className="box-btn"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: activeTab === 'approved' ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
              background: activeTab === 'approved' ? '#DCFCE7' : '#FFFFFF',
              color: activeTab === 'approved' ? '#15803D' : '#64748B'
            }}
          >
            Approved ({approvedList.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className="box-btn"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: activeTab === 'rejected' ? '1.5px solid #64748B' : '1px solid #CBD5E1',
              background: activeTab === 'rejected' ? '#F1F5F9' : '#FFFFFF',
              color: activeTab === 'rejected' ? '#0F172A' : '#64748B'
            }}
          >
            Rejected ({rejectedList.length})
          </button>
        </div>

        {/* Workflow Chain Banner */}
        <div style={{
          padding: '8px 20px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '0.68rem',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontWeight: 800, color: '#D97706' }}>OPERATIONAL FLOW:</span>
          <span>Forecast</span> → <span>Risk Threshold</span> → <span style={{ color: '#DC2626', fontWeight: 800 }}>Alert Candidate</span> → <span style={{ color: '#2563EB', fontWeight: 800 }}>Human Approval</span> → <span>Dissemination</span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#F8FAFC' }}>
          {displayedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748B', fontSize: '0.88rem' }}>
              <CheckCircle2 size={38} color="#16A34A" style={{ margin: '0 auto 10px auto' }} />
              No {activeTab === 'candidates' ? 'pending alert candidates' : activeTab} in current queue.
            </div>
          ) : (
            displayedList.map((alert) => {
              const isApproved = alert.status === 'APPROVED';
              const isRejected = alert.status === 'REJECTED';
              const isCandidate = alert.status === 'CANDIDATE';

              return (
                <div
                  key={alert.id}
                  className="box-card"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: `1px solid ${isApproved ? '#86EFAC' : isRejected ? '#CBD5E1' : '#FCA5A5'}`,
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  {/* Candidate Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                        {alert.id}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                        Timestamp: {alert.timestamp}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isApproved ? '#DCFCE7' : isRejected ? '#F1F5F9' : '#FEE2E2',
                        color: isApproved ? '#15803D' : isRejected ? '#64748B' : '#DC2626',
                        border: `1px solid ${isApproved ? '#86EFAC' : isRejected ? '#CBD5E1' : '#FCA5A5'}`
                      }}
                    >
                      {isApproved ? 'APPROVED BY OPERATOR' : isRejected ? 'REJECTED' : 'PENDING HUMAN APPROVAL'}
                    </span>
                  </div>

                  {/* Target Region & Hazard Title */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                      {alert.target_region}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: alert.severity === 'SEVERE' ? '#DC2626' : alert.severity === 'HIGH' ? '#EA580C' : '#D97706' }}>
                      {alert.severity} SEVERITY
                    </div>
                  </div>

                  {/* 8 Required Scientific Fields Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    margin: '10px 0',
                    background: '#F8FAFC',
                    padding: '10px',
                    borderRadius: '7px',
                    border: '1px solid #E2E8F0'
                  }}>
                    {/* 1. Hazard */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Hazard Threats</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
                        {alert.hazard_types ? alert.hazard_types.join(', ') : 'Thunderstorm'}
                      </div>
                    </div>

                    {/* 2. Probability */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Probability</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                        {alert.probability ? `${(alert.probability * 100).toFixed(0)}%` : '75%'}
                      </div>
                    </div>

                    {/* 3. Confidence */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Confidence</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: alert.confidence === 'HIGH' ? '#16A34A' : '#2563EB' }}>
                        {alert.confidence || 'MEDIUM'}
                      </div>
                    </div>

                    {/* 4. Uncertainty */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Uncertainty</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#D97706', fontFamily: 'var(--font-mono)' }}>
                        {alert.uncertainty !== undefined ? `${(alert.uncertainty * 100).toFixed(0)}%` : '35%'}
                      </div>
                    </div>

                    {/* 5. Arrival Countdown */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Arrival Countdown</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#DC2626', fontFamily: 'var(--font-mono)' }}>
                        {alert.countdown || '00:42:00'}
                      </div>
                    </div>

                    {/* 6. Affected Area */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Affected Area</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                        {alert.affected_area_km2 ? `${alert.affected_area_km2} km²` : '350 km²'}
                      </div>
                    </div>

                    {/* 7. Risk Score */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Composite Risk</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#D97706', fontFamily: 'var(--font-mono)' }}>
                        {alert.risk_score || 72} / 100
                      </div>
                    </div>

                    {/* 8. Exposure */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Exposure Level</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED' }}>
                        CRITICAL TIER
                      </div>
                    </div>
                  </div>

                  {/* Exposure Details & Evidence Provenance */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.70rem', color: '#475569' }}>
                      <strong style={{ color: '#0F172A' }}>Exposure Zone:</strong> {alert.exposure || `${alert.target_region} Coastal Urban Belt & Shipping Hub`}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#475569' }}>
                      <strong style={{ color: '#0F172A' }}>Evidence / Provenance:</strong> {alert.evidence_provenance || 'INSAT-3D TIR1 Cooling Rate (<210K) + Dense Optical Flow Leading-Edge Advection Corridor'}
                    </div>
                  </div>

                  {/* Action Controls */}
                  {isCandidate ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#475569', display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                          Duty Meteorologist Sign-off Name:
                        </label>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            borderRadius: '6px',
                            padding: '7px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Explicit [ APPROVE ] and [ REJECT ] buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          disabled={actingId === alert.id}
                          className="box-btn"
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                            border: '1px solid #15803D',
                            color: '#FFFFFF',
                            padding: '10px 16px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                          }}
                        >
                          <UserCheck size={16} />
                          {actingId === alert.id ? 'Processing...' : 'APPROVE'}
                        </button>

                        <button
                          onClick={() => handleReject(alert.id)}
                          disabled={actingId === alert.id}
                          className="box-btn"
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                            border: '1px solid #B91C1C',
                            color: '#FFFFFF',
                            padding: '10px 16px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                          }}
                        >
                          <UserX size={16} />
                          {actingId === alert.id ? 'Processing...' : 'REJECT'}
                        </button>
                      </div>
                    </div>
                  ) : isApproved ? (
                    <div style={{
                      fontSize: '0.74rem',
                      color: '#15803D',
                      background: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={16} color="#16A34A" />
                      <span>Approved by <strong>{alert.approved_by || operatorName}</strong> at {alert.approved_at || 'Recently'}. Ready for official CAP dissemination.</span>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '0.74rem',
                      color: '#475569',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <XCircle size={16} color="#64748B" />
                      <span>Rejected by <strong>{alert.rejected_by || operatorName}</strong>. Reason: {alert.rejection_reason || 'Convective dissipation.'}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
