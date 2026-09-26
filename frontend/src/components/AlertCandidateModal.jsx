import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, X, AlertTriangle, UserCheck } from 'lucide-react';

export default function AlertCandidateModal({
  isOpen,
  onClose,
  alertCandidates = [],
  onApproveAlert
}) {
  const [approvingId, setApprovingId] = useState(null);
  const [operatorName, setOperatorName] = useState('Chief Duty Meteorologist (IMD Shift Alpha)');
  const [approvalNotes, setApprovalNotes] = useState('Convective core intensification verified via INSAT-3D Tb cooling rate and optical flow trajectory.');

  if (!isOpen) return null;

  const handleApprove = async (alertId) => {
    setApprovingId(alertId);
    try {
      await onApproveAlert(alertId, operatorName, approvalNotes);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0c1322',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '580px',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          background: 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={20} color="#f87171" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>
                OPERATIONAL ALERT CANDIDATE REVIEW
              </h2>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Human-in-the-Loop Approval Workflow (AI will not disseminate alerts automatically)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alertCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.9rem' }}>
              <CheckCircle2 size={36} color="#34d399" style={{ margin: '0 auto 10px auto' }} />
              No active alert candidates requiring approval.
            </div>
          ) : (
            alertCandidates.map((alert) => {
              const isApproved = alert.status === 'APPROVED';

              return (
                <div
                  key={alert.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '8px',
                    border: `1px solid ${isApproved ? '#10b981' : 'rgba(239, 68, 68, 0.4)'}`,
                    padding: '14px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
                      {alert.id}
                    </span>
                    <span className={isApproved ? 'badge-real' : 'badge-alert'}
                          style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                      {isApproved ? 'APPROVED BY OPERATOR' : 'PENDING HUMAN APPROVAL'}
                    </span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {alert.target_region}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '10px 0', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Estimated Arrival</div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
                        {alert.countdown}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Risk Score</div>
                      <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>
                        {alert.risk_score} / 100
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Confidence</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                        {alert.confidence}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '10px' }}>
                    <strong>Hazard Threats:</strong> {alert.hazard_types?.join(', ')}
                  </div>

                  {!isApproved ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
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

                      <button
                        onClick={() => handleApprove(alert.id)}
                        disabled={approvingId === alert.id}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
                        }}
                      >
                        <UserCheck size={16} />
                        {approvingId === alert.id ? 'Recording in Audit Log...' : 'APPROVE OFFICIAL ALERT'}
                      </button>
                    </div>
                  ) : (
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
                      <span>Approved by {alert.approved_by || operatorName} at {alert.approved_at || 'Just now'}</span>
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
