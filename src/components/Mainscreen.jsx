// ─────────────────────────────────────────────────────────────────────────────
// Mainscreen.jsx  –  Pantalla principal del navegador de CUCEI
//
// Esta pantalla muestra el mapa real del campus (con OpenStreetMap + Leaflet)
// y permite al usuario:
//   1. Hacer clic en cualquier punto del mapa → se ajusta al nodo más cercano (origen A)
//   2. Hacer clic en otro punto → se ajusta al nodo más cercano (destino B)
//   3. Se calcula la ruta más corta con Dijkstra y se dibuja en amarillo
//   4. El usuario puede pulsar "Iniciar navegación" para entrar al modo Street View
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import jsondata from '../functions/nodes.json';
import { dijkstraRoute } from '../functions/dijkstra';

// ── Fórmula Haversine: calcula distancia en metros entre dos coordenadas GPS ──
// Se usa para saber cuál es el nodo del mapa más cercano al clic del usuario
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Busca el nodo más cercano a una coordenada GPS ────────────────────────────
// Recorre todos los nodos del JSON y devuelve la clave y distancia del más próximo
function nearestNode(lat, lng) {
    let bestKey = null;
    let bestDist = Infinity;
    Object.entries(jsondata).forEach(([key, node]) => {
        if (!node.coords_gps?.lat) return;
        const d = haversine(lat, lng, node.coords_gps.lat, node.coords_gps.lng);
        if (d < bestDist) { bestDist = d; bestKey = key; }
    });
    return { key: bestKey, dist: Math.round(bestDist) };
}

// ── Estados del flujo de selección ───────────────────────────────────────────
// step 0: esperando que el usuario haga clic para marcar el origen
// step 1: origen marcado, esperando clic para el destino
// step 2: ambos marcados, ruta dibujada en el mapa

const Mainscreen = () => {
    const navigate = useNavigate();
    // Referencias al DOM y a instancias de Leaflet (no provocan re-render)
    const mapContainerRef = useRef(null);  // div donde se monta el mapa
    const mapRef = useRef(null);  // instancia del mapa Leaflet
    const routeLayerRef = useRef(null);  // línea amarilla de la ruta
    const tempMarkerRef = useRef(null);  // marcador pulsante al hacer clic
    const originMarkerRef = useRef(null);  // pin verde (A)
    const destMarkerRef = useRef(null);  // pin rojo (B)

    // Modo del mapa: 'route' = planear ruta (flujo A→B), 'explore' = explorar libremente
    const [mapMode, setMapMode] = useState('route');
    const mapModeRef = useRef('route');

    // Estado del flujo de selección: 0=origen, 1=destino, 2=ruta lista
    const [step, setStep] = useState(0);
    const [origin, setOrigin] = useState(null);   // { key, dist }
    const [dest, setDest] = useState(null);   // { key, dist }
    const [routeInfo, setRouteInfo] = useState(null);   // { path, distance, steps }
    // stepRef permite leer el paso actual dentro del evento click de Leaflet
    const stepRef = useRef(0);

    // Mantener stepRef y mapModeRef sincronizados con el state de React
    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);

    // ── Cambia el color y tamaño del punto de un nodo en el mapa ──────────
    // Se usa para resaltar origen (verde), destino (rojo) y ruta (amarillo)
    const paintDot = useCallback((key, color, scale = 1) => {
        const el = document.getElementById(`mdot-${key}`);
        if (!el) return;
        el.style.background = color;
        el.style.transform = `scale(${scale})`;
        el.style.borderColor = color === '#4fc3f7' || color === '#ef5350' ? 'white' : color;
    }, []);

    // ── Limpia todo y vuelve al estado inicial (paso 0) ───────────────────
    // Elimina marcadores, la línea de ruta y resetea origen/destino
    const resetAll = useCallback(() => {
        if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
        if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
        if (originMarkerRef.current) { originMarkerRef.current.remove(); originMarkerRef.current = null; }
        if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }

        // Reset all node dot colours
        Object.entries(jsondata).forEach(([key, node]) => {
            paintDot(key, node.landmark ? '#ef5350' : '#4fc3f7', 1);
        });
        setStep(0); stepRef.current = 0;
        setOrigin(null); setDest(null); setRouteInfo(null);
    }, [paintDot]);

    // ── Muestra un círculo pulsante donde el usuario hizo clic ─────────────
    // Desaparece automáticamente al cabo de 1 segundo
    const flashTempMarker = useCallback((map, lat, lng) => {
        if (tempMarkerRef.current) { tempMarkerRef.current.remove(); }
        const icon = L.divIcon({
            className: '',
            iconSize: [24, 24], iconAnchor: [12, 12],
            html: `<div style="
                width:24px;height:24px;border-radius:50%;
                border:3px solid white;opacity:.7;
                animation:pulse 1s ease-out forwards"></div>`
        });
        tempMarkerRef.current = L.marker([lat, lng], { icon, interactive: false }).addTo(map);
        setTimeout(() => {
            if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
        }, 1000);
    }, []);

    // ── Crea el ícono de pin (estilo Google Maps) para origen y destino ─────
    // color: verde para A (origen), rojo para B (destino)
    const pinIcon = (color, label) => L.divIcon({
        className: '',
        iconSize: [28, 36], iconAnchor: [14, 36],
        html: `<div style="
            width:28px;height:28px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${color};border:3px solid white;
            box-shadow:0 3px 10px rgba(0,0,0,.5)">
            <span style="display:block;transform:rotate(45deg);
                text-align:center;line-height:22px;font-size:10px;
                font-weight:700;color:white">${label}</span>
        </div>`
    });

    // ── Calcula y dibuja la ruta más corta entre origen y destino ──────────
    // Usa Dijkstra, traza una línea amarilla y pinta los nodos intermedios
    const drawRoute = useCallback((map, originKey, destKey) => {
        // Limpiar ruta anterior si existe
        if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }

        // Llamar al algoritmo de Dijkstra
        const path = dijkstraRoute(jsondata, originKey, destKey);
        if (!Array.isArray(path) || path.length === 0) {
            setRouteInfo({ error: true }); return; // No hay camino posible
        }

        const coords = path
            .map(k => jsondata[k]?.coords_gps)
            .filter(Boolean)
            .map(g => [g.lat, g.lng]);

        routeLayerRef.current = L.polyline(coords, {
            color: '#ffd54f', weight: 6, opacity: 1
        }).addTo(map);

        // Highlight route nodes
        path.forEach((k, i) => {
            if (i === 0 || i === path.length - 1) return;
            paintDot(k, '#ffd54f', 1.4);
        });

        let dist = 0;
        for (let i = 0; i < path.length - 1; i++) {
            dist += jsondata[path[i]]?.conections?.[path[i + 1]] ?? 0;
        }
        setRouteInfo({ path, distance: Math.round(dist), steps: path.length });

        // Fit map to route
        map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
    }, [paintDot]);

    // ── Maneja el clic en el mapa: ajusta al nodo más cercano ─────────────
    // Modo explorar: clic único → abre Viewer en el nodo más cercano (libre)
    // Modo ruta: primer clic = origen (pin verde A), segundo clic = destino (pin rojo B)
    const handleMapClick = useCallback((e, map) => {
        const { lat, lng } = e.latlng;
        flashTempMarker(map, lat, lng);            // mostrar efecto visual
        const { key, dist } = nearestNode(lat, lng); // snapping al nodo más cercano
        const node = jsondata[key];

        // MODO EXPLORAR: ir directo al viewer sin ruta
        if (mapModeRef.current === 'explore') {
            navigate(`/viewer/${key}`);
            return;
        }

        // MODO RUTA
        if (stepRef.current === 0) {
            // Primer clic: establecer origen
            if (originMarkerRef.current) originMarkerRef.current.remove();
            originMarkerRef.current = L.marker(
                [node.coords_gps.lat, node.coords_gps.lng],
                { icon: pinIcon('#22c55e', 'A'), zIndexOffset: 500 }
            ).addTo(map);
            paintDot(key, '#22c55e', 1.8);
            setOrigin({ key, dist });
            setStep(1); stepRef.current = 1;

        } else if (stepRef.current === 1) {
            // Segundo clic: establecer destino y calcular ruta
            if (destMarkerRef.current) destMarkerRef.current.remove();
            destMarkerRef.current = L.marker(
                [node.coords_gps.lat, node.coords_gps.lng],
                { icon: pinIcon('#ef4444', 'B'), zIndexOffset: 500 }
            ).addTo(map);
            paintDot(key, '#ef4444', 1.8);
            setDest({ key, dist });
            setStep(2); stepRef.current = 2;

            // Need origin key from ref — read from state via callback
            setOrigin(prev => {
                drawRoute(map, prev.key, key);
                return prev;
            });
        }
        // step 2: ignorar clics hasta que el usuario pulse "Nueva búsqueda"
    }, [flashTempMarker, paintDot, drawRoute, navigate]);

    // ── Inicializa el mapa Leaflet (solo una vez al montar el componente) ──
    // Centra el mapa en CUCEI, dibuja las conexiones (aristas) y los nodos
    useEffect(() => {
        if (mapRef.current || !mapContainerRef.current) return;

        // Inyectar animación CSS para el marcador pulsante
        if (!document.getElementById('pulse-style')) {
            const st = document.createElement('style');
            st.id = 'pulse-style';
            st.textContent = `@keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.5);opacity:0}}`;
            document.head.appendChild(st);
        }

        const map = L.map(mapContainerRef.current).setView([20.65906, -103.32962], 17);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        // Dibujar conexiones entre nodos (aristas del grafo) en color azul
        const drawn = new Set(); // evitar duplicar cada conexión A↔B
        Object.entries(jsondata).forEach(([key, node]) => {
            if (!node.coords_gps?.lat) return;
            Object.keys(node.conections ?? {}).forEach(nbKey => {
                const eid = [key, nbKey].sort().join('|');
                if (drawn.has(eid)) return; drawn.add(eid);
                const nb = jsondata[nbKey];
                if (!nb?.coords_gps?.lat) return;
                L.polyline(
                    [[node.coords_gps.lat, node.coords_gps.lng], [nb.coords_gps.lat, nb.coords_gps.lng]],
                    { color: '#536dfe', weight: 2, opacity: 0.5 }
                ).addTo(map);
            });
        });

        // Dibujar puntos de nodo (rojo = punto de interés, azul = nodo normal)
        Object.entries(jsondata).forEach(([key, node]) => {
            if (!node.coords_gps?.lat) return;
            const icon = L.divIcon({
                className: '',
                iconSize: [14, 14], iconAnchor: [7, 7],
                html: `<div id="mdot-${key}" style="
                    width:14px;height:14px;border-radius:50%;
                    background:${node.landmark ? '#ef5350' : '#4fc3f7'};
                    border:2px solid white;
                    box-shadow:0 0 5px rgba(0,0,0,.5);
                    transition:transform .15s,background .15s"></div>`
            });
            L.marker([node.coords_gps.lat, node.coords_gps.lng], { icon, zIndexOffset: 100 })
                .bindTooltip(node.name, { permanent: false, direction: 'top', offset: [0, -10] })
                .addTo(map);
        });

        // Registrar el evento de clic en el mapa
        map.on('click', (e) => handleMapClick(e, map));

        return () => { map.remove(); mapRef.current = null; };
    }, [handleMapClick]);

    // ── UI helpers ────────────────────────────────────────────────────────
    const stepMessages = [
        'Haz clic en el mapa donde estás parado',
        'Ahora haz clic en tu destino',
        null,
    ];

    const originNode = origin ? jsondata[origin.key] : null;
    const destNode = dest ? jsondata[dest.key] : null;

    return (
        <div style={S.wrapper}>
            {/* ── Side panel ── */}
            <div style={S.panel}>
                <div style={S.panelHeader}>
                    <h2 style={S.title}>🏫 CUCEI</h2>
                    <p style={S.subtitle}>Navegación peatonal</p>
                </div>

                {/* ── Toggle de modo ── */}
                <div style={S.modeToggle}>
                    <button
                        style={{ ...S.modeBtn, ...(mapMode === 'route' ? S.modeBtnActive : {}) }}
                        onClick={() => { setMapMode('route'); mapModeRef.current = 'route'; resetAll(); }}
                    >
                        🗺 Planear ruta
                    </button>
                    <button
                        style={{ ...S.modeBtn, ...(mapMode === 'explore' ? S.modeBtnActiveExplore : {}) }}
                        onClick={() => { setMapMode('explore'); mapModeRef.current = 'explore'; resetAll(); }}
                    >
                        🚶 Explorar
                    </button>
                </div>

                {/* ── Contenido según modo ── */}
                {mapMode === 'explore' ? (
                    <div style={S.exploreInfo}>
                        <p style={S.exploreTitle}>Modo exploración</p>
                        <p style={S.exploreSub}>Haz clic en cualquier punto del mapa y te posicionarás en el nodo más cercano.</p>
                        <p style={S.exploreSub}>Desde ahí podrás moverte libremente entre nodos conectados.</p>
                    </div>
                ) : (
                    <>
                        {/* Step indicator */}
                        {step < 2 && (
                            <div style={S.stepBanner}>
                                <span style={S.stepNum}>{step + 1}/2</span>
                                <span style={S.stepMsg}>{stepMessages[step]}</span>
                            </div>
                        )}

                        {/* Origin */}
                        <p style={S.label}>📍 ESTÁS AQUÍ</p>
                        <div style={{ ...S.nodeBox, ...(originNode ? S.nodeBoxFilled : {}) }}>
                            {originNode ? (
                                <>
                                    <span style={dot('#22c55e')} />
                                    <div>
                                        <div style={S.nodeName}>{originNode.name}</div>
                                        {origin.dist > 0 && (
                                            <div style={S.nodeSnap}>Nodo más cercano · {origin.dist} m</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span style={S.hint}>Clic en el mapa</span>
                            )}
                        </div>

                        {/* Destination */}
                        <p style={S.label}>🎯 DESTINO</p>
                        <div style={{ ...S.nodeBox, ...(destNode ? S.nodeBoxFilled : {}) }}>
                            {destNode ? (
                                <>
                                    <span style={dot('#ef4444')} />
                                    <div>
                                        <div style={S.nodeName}>{destNode.name}</div>
                                        {dest.dist > 0 && (
                                            <div style={S.nodeSnap}>Nodo más cercano · {dest.dist} m</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span style={S.hint}>{originNode ? 'Clic en el mapa' : '—'}</span>
                            )}
                        </div>

                        {/* Route card */}
                        {routeInfo && !routeInfo.error && (
                            <div style={S.routeCard}>
                                <p style={S.routeCardLabel}>RUTA MÁS CORTA</p>
                                <p style={S.routeDist}>
                                    {routeInfo.distance}
                                    <span style={S.routeUnit}> m</span>
                                </p>
                                <p style={S.routeSteps}>{routeInfo.steps} puntos en el camino</p>
                                <button
                                    style={S.startBtn}
                                    onClick={() => navigate(`/viewer/${origin.key}`, {
                                        state: { route: routeInfo.path }
                                    })}
                                >
                                    ▶ Iniciar navegación
                                </button>
                            </div>
                        )}

                        {routeInfo?.error && (
                            <div style={S.errorCard}>Sin ruta disponible entre estos puntos</div>
                        )}

                        {/* Reset */}
                        {step > 0 && (
                            <button style={S.resetBtn} onClick={resetAll}>
                                ↺ Nueva búsqueda
                            </button>
                        )}
                    </>
                )}

                {/* Legend */}
                <div style={S.legend}>
                    <p style={S.legendTitle}>LEYENDA</p>
                    <div style={S.legendRow}><span style={dot('#4fc3f7')} /> Nodo del campus</div>
                    <div style={S.legendRow}><span style={dot('#ef5350')} /> Punto de interés</div>
                    {mapMode === 'route' && <>
                        <div style={S.legendRow}><span style={dot('#22c55e')} /> Tu posición (A)</div>
                        <div style={S.legendRow}><span style={dot('#ef4444')} /> Destino (B)</div>
                        <div style={S.legendRow}><span style={routeLine('#ffd54f')} /> Ruta calculada</div>
                    </>}
                </div>
            </div>

            {/* ── Map ── */}
            <div ref={mapContainerRef} style={S.map} />
        </div>
    );
};

// ── Helpers de estilo inline ────────────────────────────────────────────────
const dot = c => ({ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 });
const routeLine = c => ({ display: 'inline-block', width: 22, height: 4, borderRadius: 2, background: c, flexShrink: 0 });

const S = {
    wrapper: { display: 'flex', width: '100vw', height: '100vh', background: '#0f0f1a', fontFamily: 'Segoe UI,sans-serif' },

    panel: { width: 270, minWidth: 270, background: '#111827', borderRight: '1px solid #1f2937', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, color: 'white', overflowY: 'auto' },
    panelHeader: { borderBottom: '1px solid #1f2937', paddingBottom: 10, marginBottom: 2 },
    title: { fontSize: 17, fontWeight: 700, margin: 0 },
    subtitle: { fontSize: 11, color: '#6b7280', margin: '3px 0 0' },

    stepBanner: { display: 'flex', alignItems: 'center', gap: 8, background: '#1e3a5f', border: '1px solid #2563eb', borderRadius: 8, padding: '8px 10px' },
    stepNum: { background: '#2563eb', color: '#fff', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0 },
    stepMsg: { fontSize: 12, color: '#93c5fd', lineHeight: 1.3 },

    modeToggle: { display: 'flex', gap: 6, background: '#1f2937', borderRadius: 10, padding: 4 },
    modeBtn: { flex: 1, padding: '7px 4px', border: 'none', borderRadius: 7, background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s' },
    modeBtnActive: { background: '#2563eb', color: '#fff' },
    modeBtnActiveExplore: { background: '#059669', color: '#fff' },

    exploreInfo: { background: '#064e3b', border: '1px solid #065f46', borderRadius: 8, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
    exploreTitle: { fontSize: 13, fontWeight: 700, color: '#6ee7b7', margin: 0 },
    exploreSub: { fontSize: 11, color: '#a7f3d0', margin: 0, lineHeight: 1.5 },

    label: { fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: 1, margin: 0 },
    nodeBox: { background: '#1f2937', borderRadius: 8, padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 },
    nodeBoxFilled: { background: '#1a2e1a' },
    nodeName: { fontWeight: 600, fontSize: 13 },
    nodeSnap: { fontSize: 10, color: '#6b7280', marginTop: 1 },
    hint: { color: '#374151', fontStyle: 'italic', fontSize: 12 },

    routeCard: { background: '#1a2535', border: '1px solid rgba(255,213,79,.25)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
    routeCardLabel: { fontSize: 10, color: '#fcd34d', fontWeight: 700, letterSpacing: 1, margin: 0 },
    routeDist: { fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 },
    routeUnit: { fontSize: 14, color: '#9ca3af', fontWeight: 400 },
    routeSteps: { fontSize: 11, color: '#6b7280', margin: 0 },
    startBtn: { background: '#fcd34d', color: '#111', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 },

    errorCard: { background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#fca5a5' },

    resetBtn: { background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12 },

    legend: { marginTop: 'auto', borderTop: '1px solid #1f2937', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 },
    legendTitle: { fontSize: 10, color: '#374151', letterSpacing: 1, margin: '0 0 3px' },
    legendRow: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#6b7280' },

    map: { flex: 1 },
};

export default Mainscreen;