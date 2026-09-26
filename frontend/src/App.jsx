import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import GisMap from './components/GisMap';
import ReplayTimeline from './components/ReplayTimeline';
import SensorPanel from './components/SensorPanel';
import ModelComparisonPanel from './components/ModelComparisonPanel';
import MultiHazardPanel from './components/MultiHazardPanel';
import RiskAndArrivalPanel from './components/RiskAndArrivalPanel';
import AlertCandidateModal from './components/AlertCandidateModal';
import { api } from './services/api';

export default function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [stormState, setStormState] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState('NOW');
  const [selectedModel, setSelectedModel] = useState('CONVGRU');
  const [modelInfo, setModelInfo] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sensor Dropout Simulation State
  const [sensorStatus, setSensorStatus] = useState({
    insat: 'available',
    era5: 'available',
    dwr: 'unavailable',
    lightning: 'unavailable'
  });

  // 1. Initial Load: Fetch Events, Timestamps & Model Status
  useEffect(() => {
    api.getModelInfo()
      .then(info => setModelInfo(info))
      .catch(err => console.error("Error loading model info:", err));

    api.getEvents().then((evList) => {
      setEvents(evList);
      if (evList.length > 0) {
        const ev = evList[0];
        setSelectedEvent(ev);
        const tList = ev.timeline_timestamps || [];
        setTimestamps(tList);
        if (tList.length > 0) {
          // Default to central storm frame (e.g. index 4: 05:00 UTC)
          const defaultTs = tList[Math.min(4, tList.length - 1)];
          setCurrentTimestamp(defaultTs);
        }
      }
    }).catch(err => console.error("Error loading events:", err));
  }, []);

  // 2. Load Pipeline State whenever timestamp, model, or sensor status changes
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
      if (data.sensor_status) {
        setSensorStatus(prev => ({ ...prev, ...data.sensor_status }));
      }
    } catch (err) {
      console.error("Pipeline execution error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (currentTimestamp) {
      loadFrameState(currentTimestamp, selectedModel, sensorStatus);
    }
  }, [currentTimestamp, selectedModel, loadFrameState]);

  // Handle Sensor Dropout Toggle
  const handleToggleSensor = (sensorId) => {
    setSensorStatus(prev => {
      const newStatus = {
        ...prev,
        [sensorId]: prev[sensorId] === 'available' ? 'unavailable' : 'available'
      };
      // Trigger pipeline re-run with new sensor mask
      loadFrameState(currentTimestamp, selectedModel, newStatus);
      return newStatus;
    });
  };

  // Handle Model Change
  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
  };

  // Handle Alert Approval
  const handleApproveAlert = async (alertId, operatorName, comments) => {
    try {
      await api.approveAlert(alertId, operatorName, comments);
      // Reload current state to refresh alert status
      loadFrameState(currentTimestamp, selectedModel, sensorStatus);
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const activeAlertCount = stormState?.alert_candidates?.filter(a => a.status === 'CANDIDATE').length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Application Header */}
      <Header
        eventInfo={selectedEvent}
        currentTimestamp={currentTimestamp}
        provenanceBadge={stormState?.provenance_badge}
        sensorStatus={sensorStatus}
        activeAlertCount={activeAlertCount}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
      />

      {/* Main Center Area: Map + Telemetry Dashboard */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left Side: Interactive GIS Map */}
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          <GisMap
            storms={stormState?.storms || []}
            forecasts={stormState?.forecasts || {}}
            selectedHorizon={selectedHorizon}
            arrival={stormState?.arrival || {}}
            hazards={stormState?.hazards || {}}
          />
        </div>

        {/* Right Side: Telemetry & Controls Panel */}
        <div style={{
          width: '420px',
          height: '100%',
          overflowY: 'auto',
          background: 'rgba(10, 15, 26, 0.96)',
          borderLeft: '1px solid rgba(56, 189, 248, 0.18)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sensor Availability Mask & Dropout Demo */}
          <SensorPanel
            sensorStatus={sensorStatus}
            onToggleSensor={handleToggleSensor}
            uncertaintyMetrics={stormState?.uncertainty}
          />

          {/* Model Comparison & Horizon Selection */}
          <ModelComparisonPanel
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            selectedHorizon={selectedHorizon}
            onSelectHorizon={setSelectedHorizon}
            modelInfo={modelInfo}
            uncertaintyMetrics={stormState?.uncertainty}
          />

          {/* Multi-Hazard Proxy Heads */}
          <MultiHazardPanel
            hazards={stormState?.hazards || {}}
          />

          {/* Risk Engine & Arrival Countdowns */}
          <RiskAndArrivalPanel
            risk={stormState?.risk || {}}
            arrival={stormState?.arrival || {}}
          />
        </div>
      </div>

      {/* Bottom: Replay Timeline Scrub Bar */}
      <ReplayTimeline
        timestamps={timestamps}
        currentTimestamp={currentTimestamp}
        onSelectTimestamp={setCurrentTimestamp}
        isLoading={isLoading}
      />

      {/* Modal: Human Operational Sign-off */}
      <AlertCandidateModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        alertCandidates={stormState?.alert_candidates || []}
        onApproveAlert={handleApproveAlert}
      />
    </div>
  );
}
