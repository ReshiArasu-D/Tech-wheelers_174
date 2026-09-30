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
      background: 'rgba(2, 6, 23, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0f1d',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 0 50px rgba(239, 68, 68, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh',
        overflow: 'hidden'
      }}>
        {/* Header - Explicitly saying ALERT CANDIDATE & HUMAN APPROVAL REQUIRED */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={22} color="#f87171" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.04em' }}>
                  ALERT CANDIDATE
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5'
                }}>
                  HUMAN APPROVAL REQUIRED
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                Operational Decision Support: AI will NEVER autonomously broadcast emergency alerts
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid #1e293b',
          background: 'rgba(15, 23, 42, 0.4)'
        }}>
          <button
            onClick={() => setActiveTab('candidates')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'candidates' ? '1px solid #ef4444' : '1px solid #334155',
              background: activeTab === 'candidates' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: activeTab === 'candidates' ? '#fca5a5' : '#94a3b8'
            }}
          >
            Pending Review ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'approved' ? '1px solid #10b981' : '1px solid #334155',
              background: activeTab === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'approved' ? '#6ee7b7' : '#94a3b8'
            }}
          >
            Approved ({approvedList.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'rejected' ? '1px solid #64748b' : '1px solid #334155',
              background: activeTab === 'rejected' ? 'rgba(100, 116, 139, 0.2)' : 'transparent',
              color: activeTab === 'rejected' ? '#cbd5e1' : '#94a3b8'
            }}
          >
            Rejected ({rejectedList.length})
          </button>
        </div>

        {/* Workflow Chain Banner */}
        <div style={{
          padding: '8px 20px',
          background: 'rgba(30, 41, 59, 0.4)',
          borderBottom: '1px solid #1e293b',
          fontSize: '0.68rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontWeight: 700, color: '#f59e0b' }}>OPERATIONAL FLOW:</span>
          <span>Forecast</span> → <span>Risk Threshold</span> → <span style={{ color: '#f87171', fontWeight: 700 }}>Alert Candidate</span> → <span style={{ color: '#38bdf8', fontWeight: 700 }}>Human Approval</span> → <span>Dissemination</span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '0.88rem' }}>
              <CheckCircle2 size={38} color="#34d399" style={{ margin: '0 auto 10px auto' }} />
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
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    borderRadius: '8px',
                    border: `1px solid ${isApproved ? '#10b981' : isRejected ? '#64748b' : 'rgba(239, 68, 68, 0.4)'}`,
                    padding: '16px',
                    position: 'relative'
                  }}
                >
                  {/* Candidate Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
                        {alert.id}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        Timestamp: {alert.timestamp}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isApproved ? 'rgba(16, 185, 129, 0.2)' : isRejected ? 'rgba(100, 116, 139, 0.2)' : 'rgba(239, 68, 68, 0.25)',
                        color: isApproved ? '#34d399' : isRejected ? '#94a3b8' : '#f87171',
                        border: `1px solid ${isApproved ? '#10b981' : isRejected ? '#64748b' : '#ef4444'}`
                      }}
                    >
                      {isApproved ? 'APPROVED BY OPERATOR' : isRejected ? 'REJECTED' : 'PENDING HUMAN APPROVAL'}
                    </span>
                  </div>

                  {/* Target Region & Hazard Title */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                      {alert.target_region}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: alert.severity === 'SEVERE' ? '#ef4444' : alert.severity === 'HIGH' ? '#f97316' : '#f59e0b' }}>
                      {alert.severity} SEVERITY
                    </div>
                  </div>

                  {/* 8 Required Scientific Fields Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    margin: '10px 0',
                    background: 'rgba(0,0,0,0.35)',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {/* 1. Hazard */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Hazard Threats</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                        {alert.hazard_types ? alert.hazard_types.join(', ') : 'Thunderstorm'}
                      </div>
                    </div>

                    {/* 2. Probability */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Probability</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>
                        {alert.probability ? `${(alert.probability * 100).toFixed(0)}%` : '75%'}
                      </div>
                    </div>

                    {/* 3. Confidence */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Confidence</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: alert.confidence === 'HIGH' ? '#34d399' : '#38bdf8' }}>
                        {alert.confidence || 'MEDIUM'}
                      </div>
                    </div>

                    {/* 4. Uncertainty */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Uncertainty</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                        {alert.uncertainty !== undefined ? `${(alert.uncertainty * 100).toFixed(0)}%` : '35%'}
                      </div>
                    </div>

                    {/* 5. Arrival Countdown */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Arrival Countdown</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171' }}>
                        {alert.countdown || '00:42:00'}
                      </div>
                    </div>

                    {/* 6. Affected Area */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Affected Area</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
                        {alert.affected_area_km2 ? `${alert.affected_area_km2} km²` : '350 km²'}
                      </div>
                    </div>

                    {/* 7. Risk Score */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Composite Risk</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>
                        {alert.risk_score || 72} / 100
                      </div>
                    </div>

                    {/* 8. Exposure */}
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Exposure Level</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc' }}>
                        CRITICAL TIER
                      </div>
                    </div>
                  </div>

                  {/* Exposure Details & Evidence Provenance */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      <strong style={{ color: '#cbd5e1' }}>Exposure Zone:</strong> {alert.exposure || `${alert.target_region} Coastal Urban Belt & Shipping Hub`}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      <strong style={{ color: '#cbd5e1' }}>Evidence / Provenance:</strong> {alert.evidence_provenance || 'INSAT-3D TIR1 Cooling Rate (<210K) + Dense Optical Flow Leading-Edge Advection Corridor'}
                    </div>
                  </div>

                  {/* Action Controls */}
                  {isCandidate ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                          Duty Meteorologist Sign-off Name:
                        </label>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#090e17',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>

                      {/* Explicit [ APPROVE ] and [ REJECT ] buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          disabled={actingId === alert.id}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '9px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          <UserCheck size={16} />
                          {actingId === alert.id ? 'Processing...' : 'APPROVE'}
                        </button>

                        <button
                          onClick={() => handleReject(alert.id)}
                          disabled={actingId === alert.id}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '9px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)'
                          }}
                        >
                          <UserX size={16} />
                          {actingId === alert.id ? 'Processing...' : 'REJECT'}
                        </button>
                      </div>
                    </div>
                  ) : isApproved ? (
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '8px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={16} />
                      <span>Approved by <strong>{alert.approved_by || operatorName}</strong> at {alert.approved_at || 'Recently'}. Ready for official CAP dissemination.</span>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      background: 'rgba(100, 116, 139, 0.1)',
                      border: '1px solid rgba(100, 116, 139, 0.3)',
                      padding: '8px 10px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <XCircle size={16} color="#94a3b8" />
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
