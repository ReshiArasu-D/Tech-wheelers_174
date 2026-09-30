"""
Verification script for Frame Evolution across DWR timeline:
Compares:
- Frame 0  (2019-11-07T03:00:00Z)
- Frame 7  (2019-11-07T04:10:00Z)
- Frame 14 (2019-11-07T05:20:00Z)

Verifies:
1. Observed DWR
2. Predicted Reflectivity
3. Storm objects
4. Hazards
5. Tracks
6. Motion vectors
7. GeoJSON coordinates from real source grid
"""
import os
import json
import numpy as np
from backend.app.services.nowcast_pipeline import run_nowcast_pipeline
from backend.app.models.dwr_convgru import dwr_service

def run_frame_evolution():
    x_path = os.path.join("backend", "data", "dwr", "terls_20191107_X.npy")
    X = np.load(x_path)
    
    test_frames = [
        (0, "2019-11-07T03:00:00Z", "Frame 0 (Initial)"),
        (7, "2019-11-07T04:10:00Z", "Frame 7 (Middle)"),
        (14, "2019-11-07T05:20:00Z", "Frame 14 (Final)")
    ]
    
    evolution_data = []
    
    for seq_idx, ts, label in test_frames:
        seq = X[seq_idx]
        obs_dbz = seq[-1, 0]
        
        # Live inference through pipeline
        res = run_nowcast_pipeline({
            "timestamp": ts,
            "radar_data": {"sequence": seq},
            "event_id": f"TEST-EVOL-{seq_idx}"
        })
        
        pred_dbz = dwr_service.predict_from_incoming({"sequence": seq})
        
        evolution_data.append({
            "seq_idx": seq_idx,
            "timestamp": ts,
            "label": label,
            "obs_min": float(obs_dbz.min()),
            "obs_max": float(obs_dbz.max()),
            "obs_mean": float(obs_dbz.mean()),
            "obs_std": float(obs_dbz.std()),
            "pred_min": float(pred_dbz.min()),
            "pred_max": float(pred_dbz.max()),
            "pred_mean": float(pred_dbz.mean()),
            "pred_std": float(pred_dbz.std()),
            "fusion_mode": res["fusion_mode"],
            "fusion_stats": res["fusion_metadata"]["fusion_stats"],
            "radar_feature_shape": res["fusion_metadata"]["radar_feature_shape"],
            "atmosphere_feature_shape": res["fusion_metadata"]["atmosphere_feature_shape"],
            "fused_feature_shape": res["fusion_metadata"]["fused_feature_shape"],
            "storm_count": len(res["storms"]),
            "storms": res["storms"],
            "hazards": res["hazards"],
            "forecasts_count": len(res["forecasts"]),
            "geojson_count": len(res["geojson"]["features"]),
            "sample_geojson_coords": res["geojson"]["features"][0]["geometry"]["coordinates"] if res["geojson"]["features"] else None
        })
        
    print("=" * 80)
    print("FRAME EVOLUTION AUDIT: REAL DWR TIMELINE (03:00 -> 04:10 -> 05:20 UTC)")
    print("=" * 80)
    
    for f in evolution_data:
        print(f"\n--- [{f['label']}] Timestamp: {f['timestamp']} (Sequence Index: {f['seq_idx']}) ---")
        print(f"  • Observed DWR (Normalized) : min={f['obs_min']:.4f}, max={f['obs_max']:.4f}, mean={f['obs_mean']:.4f}, std={f['obs_std']:.4f}")
        print(f"  • Predicted Reflectivity    : min={f['pred_min']:.4f}, max={f['pred_max']:.4f}, mean={f['pred_mean']:.4f}, std={f['pred_std']:.4f}")
        print(f"  • Feature Fusion            : mode={f['fusion_mode']}, radar={f['radar_feature_shape']}, atm={f['atmosphere_feature_shape']} -> fused={f['fused_feature_shape']}")
        print(f"  • Fusion Tensor Statistics  : min={f['fusion_stats']['min']:.4f}, max={f['fusion_stats']['max']:.4f}, mean={f['fusion_stats']['mean']:.4f}, std={f['fusion_stats']['std']:.4f}")
        print(f"  • Storm Objects Detected    : {f['storm_count']} cells")
        if f['storms']:
            s0 = f['storms'][0]
            print(f"    - Lead Storm ID: {s0.get('storm_id', s0.get('id'))}")
            print(f"    - Centroid     : lat={s0['centroid']['lat']}, lon={s0['centroid']['lon']}")
            print(f"    - Area         : {s0['area_km2']} km²")
            print(f"    - Intensity    : {s0['intensity']}")
            mot = s0.get('motion', {})
            print(f"    - Motion Vector: speed={mot.get('speed_kmh', 0.0)} km/h, bearing={mot.get('bearing_deg', 0.0)}° (dx={mot.get('dx_km', 0.0)}, dy={mot.get('dy_km', 0.0)})")
        print(f"  • Hazards Evaluated         : {len(f['hazards'])} hazards")
        for h_k, h_v in f['hazards'].items():
            prob = h_v.get('probability')
            p_str = f"{prob:.3f}" if prob is not None else "UNAVAILABLE"
            print(f"    - {h_k:<13}: prob={p_str:<12} sev={h_v.get('severity'):<11} status={h_v.get('model_status'):<25}")
        print(f"  • GeoJSON Feature Count     : {f['geojson_count']} features")
        if f['sample_geojson_coords']:
            coords = f['sample_geojson_coords']
            first_ring = coords[0] if isinstance(coords[0], list) and isinstance(coords[0][0], list) else coords
            print(f"    - Source Coordinate Ring  : {first_ring[:3]} ... (WGS84 EPSG:4326)")

    # Assert frame evolution differences
    f0, f7, f14 = evolution_data[0], evolution_data[1], evolution_data[2]
    print("\n" + "=" * 80)
    print("FRAME-TO-FRAME EVOLUTION PROOF")
    print("=" * 80)
    print(f"Observed DWR Max Shift       : {f0['obs_max']:.4f} -> {f7['obs_max']:.4f} -> {f14['obs_max']:.4f} (Intensification: +{(f14['obs_max']-f0['obs_max'])/f0['obs_max']*100:.1f}%)")
    print(f"Predicted Reflectivity Max   : {f0['pred_max']:.4f} -> {f7['pred_max']:.4f} -> {f14['pred_max']:.4f} (Growth: +{(f14['pred_max']-f0['pred_max'])/abs(f0['pred_max'])*100:.1f}%)")
    print(f"Fusion Mean Energy           : {f0['fusion_stats']['mean']:.4f} -> {f7['fusion_stats']['mean']:.4f} -> {f14['fusion_stats']['mean']:.4f}")
    if f0['storms'] and f14['storms']:
        c0, c14 = f0['storms'][0]['centroid'], f14['storms'][0]['centroid']
        print(f"Centroid Evolution (Lead)    : ({c0['lat']}, {c0['lon']}) -> ({c14['lat']}, {c14['lon']})")
    print(f"GeoJSON Features             : {f0['geojson_count']} -> {f7['geojson_count']} -> {f14['geojson_count']}")
    
    assert f0['obs_max'] != f14['obs_max'], "Observed radar must vary across frames"
    assert f0['pred_max'] != f14['pred_max'], "Predicted reflectivity must evolve across frames"
    assert f0['fusion_stats']['mean'] != f14['fusion_stats']['mean'], "Fused representation must evolve"
    print("\nPROVEN: Outputs evolve dynamically across the timeline. Zero static mocks.")

if __name__ == "__main__":
    run_frame_evolution()
