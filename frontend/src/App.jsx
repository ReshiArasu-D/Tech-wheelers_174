import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import SensorStrip from './components/SensorStrip';
import LeftToolbar from './components/LeftToolbar';
import GisMap from './components/GisMap';
import RightStormPanel from './components/RightStormPanel';
import HazardBanner from './components/HazardBanner';
import ScientificPanels from './components/ScientificPanels';
import TimelineControl from './components/TimelineControl';

import DataSourcesModal from './components/DataSourcesModal';
import AlertCandidateModal from './components/AlertCandidateModal';
import AiSummaryModal from './components/AiSummaryModal';
import AiChatDrawer from './components/AiChatDrawer';
import LandingModal from './components/LandingModal';

import { api } from './services/api';

export default function App() {
  // Global Application Mode & Shared State
  const [mode, setMode] = useState('replay'); // 'live' | 'replay'
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [stormState, setStormState] = useState(null);

  // Synchronized Selection State across Map & Panels
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [selectedStorm, setSelectedStorm] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState('NOW');
  const [selectedModel, setSelectedModel] = useState('CONVGRU');
  const [selectedRegion, setSelectedRegion] = useState('TERLS');
  const [modelInfo, setModelInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Map Controls State
  const [is3D, setIs3D] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState({
    sat_hybrid: true,
    terrain: true,
    sat_ir: true,
    dwr_obs: true,
    dwr_pred: true,
    storms: true,
    tracks: true,
    motion: true,
    hazards: true
  });
  const [flyToLocation, setFlyToLocation] = useState(null);

  // Modals & Panels State
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isLandingOpen, setIsLandingOpen] = useState(true);


  // Real DWR Historical Replay State (03:00 to 05:20 UTC)
  const [dwrReplayInfo, setDwrReplayInfo] = useState(null);
  const [dwrCurrentSeq, setDwrCurrentSeq] = useState(0);
  const [dwrFrameData, setDwrFrameData] = useState(null);

  // Sensor Availability State
  const [sensorStatus, setSensorStatus] = useState({
    insat: 'available',
    era5: 'available',
    dwr: 'replay',
    lightning: 'available',
    imerg: 'available',
    imd_nowcast: 'available',
    imd_warnings: 'available'
  });

  // ── 1. WebSocket Live Stream ───────────────────────────────────────────────
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/live` : 'ws://localhost:8000/ws/live');
    let socket;
    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => console.log('[App] WebSocket connected for Live updates.');
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'live_update' && data.payload) {
            if (mode === 'live') {
              setStormState(data.payload);
              if (data.payload.timestamp) {
                setCurrentTimestamp(data.payload.timestamp);
              }
            }
          }
        } catch (err) {
          console.error('[App] Error parsing WebSocket message:', err);
        }
      };
      socket.onclose = () => console.log('[App] WebSocket disconnected.');
    } catch (e) {
      console.warn('[App] WebSocket init error:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [mode]);

  // ── 2. Initial Setup: Load Model Info & DWR Replay Timestamps ──────────────
  useEffect(() => {
    api.getModelInfo()
      .then(info => setModelInfo(info))
      .catch(err => console.error('[App] Error loading model info:', err));

    api.getDwrReplayInfo()
      .then(info => {
        setDwrReplayInfo(info);
        const tList = info.timestamps || [];
        setTimestamps(tList);
        if (tList.length > 0) {
          setCurrentTimestamp(tList[0]);
        }
        setSensorStatus(prev => ({ ...prev, dwr: 'replay' }));
      })
      .catch(err => {
        console.warn('[App] DWR replay info fallback:', err);
      });

    api.getEvents()
      .then(evList => {
        setEvents(evList);
        if (evList.length > 0) setSelectedEvent(evList[0]);
      })
      .catch(err => console.error('[App] Error loading events:', err));
  }, []);

  // ── 3. Sync Sequence Index with Timestamp ──────────────────────────────────
  useEffect(() => {
    if (!dwrReplayInfo || !currentTimestamp) return;
    const idx = dwrReplayInfo.timestamps?.indexOf(currentTimestamp);
    if (idx !== undefined && idx >= 0) {
      setDwrCurrentSeq(idx);
    }
  }, [currentTimestamp, dwrReplayInfo]);

  // ── 4. Pipeline Execution for active timestamp ─────────────────────────────
  const loadFrameState = useCallback(async (ts, model, sensors) => {
    if (!selectedEvent || !ts) return;
    setIsLoading(true);
    try {
      const data = await api.predictFrame(
        selectedEvent.event_id,
        ts,
        sensors,
        model
      );
      setStormState(data);
    } catch (err) {
      console.error('[App] Pipeline state error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (currentTimestamp && mode === 'replay') {
      loadFrameState(currentTimestamp, selectedModel, sensorStatus);
    }
  }, [currentTimestamp, selectedModel, mode, loadFrameState]);

  // ── 5. Sync Selected Storm and Frame State from DWR Replay Frame ─────────
  const handleDwrFrameLoaded = (frame) => {
    setDwrFrameData(frame);
    if (frame) {
      setStormState(prev => ({
        ...prev,
        hazards: frame.hazards || prev?.hazards,
        risk: frame.risk || prev?.risk,
        arrival: frame.arrival || prev?.arrival,
        storms: frame.storms || prev?.storms,
        sensor_data: {
          ...prev?.sensor_data,
          satellite: frame.insat_frame || prev?.sensor_data?.satellite,
        },
        optical_flow: frame.optical_flow || prev?.optical_flow,
        vertical_profile: frame.vertical_profile || prev?.vertical_profile
      }));
    }
    if (frame?.storms && frame.storms.length > 0) {
      // If no storm selected, or selected storm is not from this sequence, select primary
      setSelectedStorm(prev => {
        if (!prev) return frame.storms[0];
        const match = frame.storms.find(s => s.storm_id === prev.storm_id);
        return match || frame.storms[0];
      });
    }
  };

  // ── 6. Layer and Sensor Toggles ────────────────────────────────────────────
  const handleToggleLayer = (layerId) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layerId]: prev[layerId] === false ? true : false
    }));
  };

  const handleToggleSensor = (sensorId) => {
    setSensorStatus(prev => {
      const next = {
        ...prev,
        [sensorId]: prev[sensorId] === 'available' ? 'unavailable' : 'available'
      };
      loadFrameState(currentTimestamp, selectedModel, next);
      return next;
    });
  };

  // ── 7. Alert Actions ───────────────────────────────────────────────────────
  const handleApproveAlert = async (alertId, operatorName, comments) => {
    try {
      await api.approveAlert(alertId, operatorName, comments);
      loadFrameState(currentTimestamp, selectedModel, sensorStatus);
    } catch (err) {
      console.error('Alert approval error:', err);
    }
  };

  const handleRejectAlert = async (alertId, operatorName, reason) => {
    try {
      await api.rejectAlert(alertId, operatorName, reason);
      loadFrameState(currentTimestamp, selectedModel, sensorStatus);
    } catch (err) {
      console.error('Alert rejection error:', err);
    }
  };

  const activeAlertCount = stormState?.alert_candidates?.filter(a => a.status === 'CANDIDATE').length || 0;

  // ── 8. Live / Replay Handlers ──────────────────────────────────────────────
  const handleSelectMode = (newMode) => {
    setMode(newMode);
    if (newMode === 'live') {
      if (timestamps.length > 0) {
        setCurrentTimestamp(timestamps[timestamps.length - 1]);
      }
    }
  };

  const handleGoToLive = () => {
    setMode('live');
    if (timestamps.length > 0) {
      setCurrentTimestamp(timestamps[timestamps.length - 1]);
    }
  };

  // Combined storms list: include BOTH DWR radar storms (Kerala) and INSAT satellite storms (Bay of Bengal)
  const displayStorms = useMemo(() => {
    const dwrStorms = dwrFrameData?.storms || [];
    const satStorms = stormState?.storms || [];
    const map = new Map();
    dwrStorms.forEach(s => map.set(s.storm_id, s));
    satStorms.forEach(s => {
      if (!map.has(s.storm_id)) map.set(s.storm_id, s);
    });
    return Array.from(map.values());
  }, [dwrFrameData?.storms, stormState?.storms]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#F5F7FA',
      color: '#0F172A'
    }}>
      {/* 1. TOP HEADER */}
      <Header
        mode={mode}
        onSelectMode={handleSelectMode}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
        activeAlertCount={activeAlertCount}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
        onOpenChatDrawer={() => setIsChatDrawerOpen(true)}
        onOpenDataSources={() => setIsDataSourcesOpen(true)}
        currentTimestamp={currentTimestamp}
        dwrReplayInfo={dwrReplayInfo}
      />

      {/* 2. SENSOR STATUS STRIP */}
      <SensorStrip
        sensorStatus={sensorStatus}
        mode={mode}
        isDwrReplay={!!dwrReplayInfo}
        onToggleSensor={handleToggleSensor}
        currentTimestamp={currentTimestamp}
      />

      {/* 3. MAIN CENTER WORKSPACE: LEFT TOOLBAR + DOMINANT SATELLITE MAP + RIGHT STORM PANEL */}
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Left Floating Compact Toolbar */}
        <LeftToolbar
          is3D={is3D}
          onToggle3D={() => setIs3D(!is3D)}
          visibleLayers={visibleLayers}
          onToggleLayer={handleToggleLayer}
          onSelectHazardQuick={() => {
            const nextHazard = selectedHazard === 'lightning' ? 'thunderstorm' 
                             : selectedHazard === 'thunderstorm' ? 'hail'
                             : selectedHazard === 'hail' ? 'heavy_rain'
                             : selectedHazard === 'heavy_rain' ? 'cloudburst'
                             : selectedHazard === 'cloudburst' ? 'downburst'
                             : 'lightning';
            setSelectedHazard(nextHazard);
          }}
          onOpenCrossSection={() => {}}
          onFlyToLocation={(loc) => setFlyToLocation(loc)}
        />

        {/* DOMINANT MAPTILER SATELLITE HYBRID GIS MAP */}
        <GisMap
          storms={displayStorms}
          forecasts={stormState?.forecasts || {}}
          selectedHorizon={selectedHorizon}
          arrival={stormState?.arrival || {}}
          hazards={stormState?.hazards || {}}
          selectedHazard={selectedHazard}
          selectedStorm={selectedStorm}
          onSelectStorm={(storm) => {
            setSelectedStorm(storm);
            setIsRightPanelOpen(true);
          }}
          is3D={is3D}
          visibleLayers={visibleLayers}
          dwrReplayInfo={dwrReplayInfo}
          dwrCurrentSeq={dwrCurrentSeq}
          onDwrSeqChange={(idx) => {
            setDwrCurrentSeq(idx);
            if (dwrReplayInfo?.timestamps?.[idx]) {
              setCurrentTimestamp(dwrReplayInfo.timestamps[idx]);
            }
          }}
          flyToLocation={flyToLocation}
          onDwrFrameLoaded={handleDwrFrameLoaded}
          stormState={stormState}
        />


        {/* RIGHT STORM PANEL (SCROLLABLE, REAL BACKEND TELEMETRY) */}
        {isRightPanelOpen && (
          <RightStormPanel
            selectedStorm={selectedStorm}
            storms={displayStorms}
            onSelectStorm={(storm) => {
              setSelectedStorm(storm);
              setIsRightPanelOpen(true);
            }}
            dwrFrameData={dwrFrameData}
            stormState={stormState}
            selectedHazard={selectedHazard}
            onSelectHazard={(hId) => setSelectedHazard(hId)}
            selectedHorizon={selectedHorizon}
            onSelectHorizon={setSelectedHorizon}
            currentTimestamp={currentTimestamp}
            onClose={() => setIsRightPanelOpen(false)}
          />
        )}
      </div>

      {/* 4. HAZARD VIEW STATUS BANNER */}
      <HazardBanner
        selectedHazard={selectedHazard}
        onClearHazard={() => setSelectedHazard(null)}
      />

      {/* 5. BOTTOM SCIENTIFIC PANELS (4 PANELS EXACT ORDER) */}
      <ScientificPanels
        currentTimestamp={currentTimestamp}
        dwrReplayInfo={dwrReplayInfo}
        dwrFrameData={dwrFrameData}
        stormState={stormState}
        selectedStorm={selectedStorm}
        selectedHazard={selectedHazard}
      />

      {/* 6. BOTTOM FULL-WIDTH TIMELINE */}
      <TimelineControl
        timestamps={timestamps}
        currentTimestamp={currentTimestamp}
        thumbnails={dwrReplayInfo?.thumbnails}
        onSelectTimestamp={(ts) => {
          setCurrentTimestamp(ts);
        }}
        isLive={mode === 'live'}
        onToggleLive={handleGoToLive}
        isLoading={isLoading}
      />

      {/* MODALS */}
      <DataSourcesModal
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
      />

      <AlertCandidateModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        alertCandidates={stormState?.alert_candidates || []}
        onApproveAlert={handleApproveAlert}
        onRejectAlert={handleRejectAlert}
      />

      <AiSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        stormState={stormState}
        selectedHorizon={selectedHorizon}
        selectedModel={selectedModel}
        currentTimestamp={currentTimestamp}
      />

      <AiChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        stormState={stormState}
        selectedHorizon={selectedHorizon}
        selectedModel={selectedModel}
        currentTimestamp={currentTimestamp}
      />

      <LandingModal
        isOpen={isLandingOpen}
        onClose={() => setIsLandingOpen(false)}
        onStartReplay={() => {
          if (timestamps.length > 0) setCurrentTimestamp(timestamps[0]);
          setIsLandingOpen(false);
        }}
      />
    </div>
  );
}
