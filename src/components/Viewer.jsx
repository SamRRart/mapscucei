// ─────────────────────────────────────────────────────────────────────────────
// Viewer.jsx  –  Visor estilo Street View del campus CUCEI
//
// Esta pantalla muestra el punto actual del campus (nodo) con:
//   - Imagen 360° interactiva con Pannellum (si el nodo tiene imagen)
//   - Pantalla de marcador de posición si aún no hay imagen 360°
//   - Minimapa con la posición actual y nodos vecinos
//   - Barra de navegación para moverse al siguiente/anterior nodo
//   - Barra de progreso de la ruta (cuando viene de Mainscreen)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import nodesData from '../functions/nodes.json';
import '../styles/viewer.css';

// Pannellum se carga dinámicamente (CDN) la primera vez que se monta el viewer
// Esto evita agregarlo como dependencia npm; se descarga solo cuando se necesita
let pannellumReady = false;
function loadPannellum() {
    return new Promise((resolve) => {
        if (pannellumReady || window.pannellum) { pannellumReady = true; resolve(); return; }
        // Inyectar el CSS de Pannellum
        const css = document.createElement('link');
        css.rel  = 'stylesheet';
        css.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(css);

        // Inyectar el JS de Pannellum y resolver la promesa cuando cargue
        const js = document.createElement('script');
        js.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
        js.onload = () => { pannellumReady = true; resolve(); };
        document.head.appendChild(js);
    });
}

export default function Viewer() {
    // ID del nodo actual (viene de la URL, ej: /viewer/node_001)
    const { node: nodeId } = useParams();
    const navigate  = useNavigate();
    const location  = useLocation();

    // La ruta calculada por Dijkstra se pasa desde Mainscreen como estado de navegación
    // Si el usuario abre el viewer directamente, routePath será null (modo libre)
    const routePath = location.state?.route ?? null;

    const nodeData  = nodesData[nodeId];                          // datos del nodo actual
    const neighbors = Object.keys(nodeData?.conections ?? {});    // lista de nodos vecinos
    const has360    = nodeData?.image_360 && nodeData.image_360 !== 'null'; // ¿tiene imagen 360°?

    // Cálculo de posición dentro de la ruta
    const routeIdx  = routePath ? routePath.indexOf(nodeId) : -1;
    const nextRouteNode = routePath && routeIdx >= 0 && routeIdx < routePath.length - 1
        ? routePath[routeIdx + 1]   // siguiente nodo en la ruta
        : null;
    const prevRouteNode = routePath && routeIdx > 0
        ? routePath[routeIdx - 1]   // nodo anterior en la ruta
        : null;
    const isLastNode = routePath && routeIdx === routePath.length - 1; // ¿llegamos al destino?

    // Referencias al DOM (no causan re-render al cambiar)
    const pannellumRef   = useRef(null);  // div donde se monta el visor 360°
    const viewerRef      = useRef(null);  // instancia activa de Pannellum
    const minimapRef     = useRef(null);  // div del minimapa
    const mapInstanceRef = useRef(null);  // instancia del minimapa Leaflet

    // Estado de hover en los botones de vecinos
    const [hoveredNeighbor, setHoveredNeighbor] = useState(null);

    // ── Navega a otro nodo conservando la ruta activa ──────────────────────
    // Siempre pasa el array de ruta como state para que el siguiente nodo
    // también sepa en qué posición de la ruta está
    const goTo = useCallback((targetId) => {
        navigate(`/viewer/${targetId}`, { state: { route: routePath } });
    }, [navigate, routePath]);

    // ── Inicia o actualiza el visor de imágenes 360° (Pannellum) ──────────
    // Se ejecuta cada vez que cambia el nodo o si el nodo tiene/no tiene imagen 360°
    // Si el nodo no tiene imagen 360°, no hace nada (muestra el placeholder)
    useEffect(() => {
        if (!pannellumRef.current) return;

        loadPannellum().then(() => {
            // Destruir el visor anterior antes de crear uno nuevo
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch (_) {}
                viewerRef.current = null;
            }
            if (!has360 || !pannellumRef.current) return;

            // Convertir los hotspots del JSON en objetos que entiende Pannellum
            const hotspots = (nodeData.hotspot_360 ?? [])
                .filter(h => h.destiny && h.destiny !== 'placeholder')
                .map(h => ({
                    pitch: h.pitch,
                    yaw:   h.yaw,
                    type:  'info',
                    text:  h.text || nodesData[h.destiny]?.name || h.destiny,
                    clickHandlerFunc: () => goTo(h.destiny),
                    cssClass: 'pnlm-hotspot-custom',
                }));

            viewerRef.current = window.pannellum.viewer(pannellumRef.current, {
                type:        'equirectangular',
                panorama:    nodeData.image_360,
                autoLoad:    true,
                compass:     false,
                showZoomCtrl: false,
                showFullscreenCtrl: false,
                hotSpots:    hotspots,
            });
        });

        return () => {
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch (_) {}
                viewerRef.current = null;
            }
        };
    }, [nodeId, has360]);   // re-run when node changes

    // ── Inicia o actualiza el minimapa (Leaflet) ───────────────────────
    // Muestra el grafo completo del campus en pequeño:
    //   - Líneas azules = conexiones entre nodos
    //   - Puntos azules claros = nodos vecinos del actual (navegables)
    //   - Punto gris = resto de nodos
    //   - Punto amarillo grande = nodo actual
    useEffect(() => {
        if (!minimapRef.current || !nodeData?.coords_gps?.lat) return;

        // Destruir el minimapa anterior si existe
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const { lat, lng } = nodeData.coords_gps;
        const map = L.map(minimapRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
        }).setView([lat, lng], 18);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(map);

        // Dibujar todas las conexiones del grafo (aristas) en azul tenue
        const drawn = new Set(); // evitar dibujar cada conexión dos veces
        Object.entries(nodesData).forEach(([k, n]) => {
            if (!n.coords_gps?.lat) return;
            Object.keys(n.conections ?? {}).forEach(nbKey => {
                const eid = [k, nbKey].sort().join('|');
                if (drawn.has(eid)) return; drawn.add(eid);
                const nb = nodesData[nbKey];
                if (!nb?.coords_gps?.lat) return;
                L.polyline([[n.coords_gps.lat, n.coords_gps.lng],[nb.coords_gps.lat, nb.coords_gps.lng]],
                    { color: '#536dfe', weight: 1.5, opacity: 0.5 }).addTo(map);
            });
        });

        // Dibujar todos los nodos: azul claro si es vecino, gris si no lo es
        Object.entries(nodesData).forEach(([k, n]) => {
            if (!n.coords_gps?.lat || k === nodeId) return;
            L.circleMarker([n.coords_gps.lat, n.coords_gps.lng], {
                radius: 4, color: '#fff', weight: 1,
                fillColor: neighbors.includes(k) ? '#4fc3f7' : '#555',
                fillOpacity: 1,
            }).on('click', () => goTo(k)).addTo(map);
        });

        // Nodo actual: punto amarillo grande en el centro del minimapa
        L.circleMarker([lat, lng], {
            radius: 8, color: '#fff', weight: 2,
            fillColor: '#ffd54f', fillOpacity: 1,
        }).addTo(map);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [nodeId]);

    // ── If node not found ─────────────────────────────────────────────────
    if (!nodeData) {
        return (
            <div style={S.notFound}>
                <p>Nodo <b>{nodeId}</b> no encontrado.</p>
                <button style={S.backBtn} onClick={() => navigate('/')}>← Volver al mapa</button>
            </div>
        );
    }

    // Route progress bar data
    const routeProgress = routePath
        ? `${routeIdx + 1} / ${routePath.length}`
        : null;

    return (
        <div style={S.root}>

            {/* ── 360° view OR placeholder ── */}
            <div style={S.panorama}>
                {has360
                    ? <div ref={pannellumRef} style={S.pnlmContainer} />
                    : (
                        <div style={S.placeholder}>
                            <div style={S.placeholderIcon}>📷</div>
                            <p style={S.placeholderTitle}>{nodeData.name}</p>
                            <p style={S.placeholderSub}>Imagen 360° aún no disponible</p>
                        </div>
                    )
                }

                {/* ── Top bar ── */}
                <div style={S.topBar}>
                    <button style={S.backBtn} onClick={() => navigate('/')}>← Mapa</button>
                    <span style={S.nodeLabel}>{nodeData.name}</span>
                    {routeProgress && (
                        <span style={S.routeProgress}>Paso {routeProgress}</span>
                    )}
                </div>

                {/* ── Route progress strip (only when navigating a route) ── */}
                {routePath && (
                    <div style={S.progressStrip}>
                        {routePath.map((k, i) => (
                            <div
                                key={k}
                                title={nodesData[k]?.name ?? k}
                                style={{
                                    ...S.progressDot,
                                    ...(i === routeIdx   ? S.progressDotCurrent : {}),
                                    ...(i < routeIdx     ? S.progressDotDone    : {}),
                                    ...(i === routePath.length - 1 ? S.progressDotDest : {}),
                                }}
                                onClick={() => goTo(k)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Minimap ── */}
                <div ref={minimapRef} style={S.minimap} />

                {/* ── Navigation bar ── */}
                <div style={S.navBar}>
                    {/* ROUTE MODE: show only prev/next route buttons + free neighbors */}
                    {routePath ? (
                        <>
                            {prevRouteNode && (
                                <button
                                    style={{ ...S.navBtn, ...S.navBtnRoute }}
                                    onClick={() => goTo(prevRouteNode)}
                                >
                                    <span style={S.navArrow}>◀</span>
                                    <span style={S.navName}>{nodesData[prevRouteNode]?.name}</span>
                                    <span style={S.navTag}>RUTA · ATRÁS</span>
                                </button>
                            )}

                            {isLastNode ? (
                                <div style={S.arrivedBadge}>
                                    🎉 Llegaste a tu destino
                                    <button style={S.newSearchBtn} onClick={() => navigate('/')}>
                                        Nueva búsqueda
                                    </button>
                                </div>
                            ) : nextRouteNode && (
                                <button
                                    style={{ ...S.navBtn, ...S.navBtnRoute, ...S.navBtnNext }}
                                    onClick={() => goTo(nextRouteNode)}
                                >
                                    <span style={S.navArrow}>▶</span>
                                    <span style={S.navName}>{nodesData[nextRouteNode]?.name}</span>
                                    <span style={S.navTag}>SIGUIENTE EN RUTA</span>
                                </button>
                            )}

                            {/* Other neighbors (off-route) */}
                            {neighbors.filter(n => n !== nextRouteNode && n !== prevRouteNode).map(nbrId => (
                                <button
                                    key={nbrId}
                                    style={{
                                        ...S.navBtn,
                                        ...(hoveredNeighbor === nbrId ? S.navBtnHover : {})
                                    }}
                                    onMouseEnter={() => setHoveredNeighbor(nbrId)}
                                    onMouseLeave={() => setHoveredNeighbor(null)}
                                    onClick={() => goTo(nbrId)}
                                >
                                    <span style={S.navArrow}>↗</span>
                                    <span style={S.navName}>{nodesData[nbrId]?.name ?? nbrId}</span>
                                    <span style={S.navDist}>{nodeData.conections[nbrId]} m</span>
                                </button>
                            ))}
                        </>
                    ) : (
                        /* FREE MODE: show all neighbors */
                        <>
                            <span style={S.navLabel}>IR A:</span>
                            {neighbors.map(nbrId => (
                                <button
                                    key={nbrId}
                                    style={{
                                        ...S.navBtn,
                                        ...(hoveredNeighbor === nbrId ? S.navBtnHover : {})
                                    }}
                                    onMouseEnter={() => setHoveredNeighbor(nbrId)}
                                    onMouseLeave={() => setHoveredNeighbor(null)}
                                    onClick={() => goTo(nbrId)}
                                >
                                    <span style={S.navArrow}>▶</span>
                                    <span style={S.navName}>{nodesData[nbrId]?.name ?? nbrId}</span>
                                    <span style={S.navDist}>{nodeData.conections[nbrId]} m</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
    root: { width:'100vw', height:'100vh', background:'#0a0a0f', overflow:'hidden', position:'relative', display:'flex' },

    panorama: { flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' },
    pnlmContainer: { width:'100%', height:'100%', position:'absolute', top:0, left:0 },

    placeholder: {
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        width:'100%', height:'100%',
        background:'linear-gradient(135deg, #0d1b2a 0%, #111827 100%)',
        color:'white', textAlign:'center', gap:12, userSelect:'none',
    },
    placeholderIcon:  { fontSize:80, opacity:.2 },
    placeholderTitle: { fontSize:28, fontWeight:700, margin:0 },
    placeholderSub:   { fontSize:14, color:'#4b5563', margin:0 },

    topBar: {
        position:'absolute', top:0, left:0, right:0, zIndex:1000,
        display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        background:'linear-gradient(to bottom, rgba(0,0,0,.8) 0%, transparent 100%)',
    },
    backBtn: {
        background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
        color:'#fff', padding:'6px 14px', borderRadius:20,
        cursor:'pointer', fontSize:13, backdropFilter:'blur(6px)',
    },
    nodeLabel:     { fontSize:15, fontWeight:700, color:'#fff', flex:1 },
    routeProgress: { fontSize:12, color:'#fcd34d', background:'rgba(0,0,0,.4)', padding:'3px 10px', borderRadius:12, backdropFilter:'blur(4px)' },

    progressStrip: {
        position:'absolute', top:52, left:'50%', transform:'translateX(-50%)',
        zIndex:1000, display:'flex', alignItems:'center', gap:4,
        background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)',
        padding:'6px 12px', borderRadius:20,
    },
    progressDot: {
        width:10, height:10, borderRadius:'50%',
        background:'#374151', cursor:'pointer',
        transition:'transform .15s, background .15s',
        flexShrink:0,
    },
    progressDotDone:    { background:'#22c55e' },
    progressDotCurrent: { background:'#fcd34d', transform:'scale(1.5)', boxShadow:'0 0 6px #fcd34d' },
    progressDotDest:    { background:'#ef4444' },

    minimap: {
        position:'absolute', bottom:90, right:16, zIndex:1000,
        width:200, height:160, borderRadius:10, overflow:'hidden',
        border:'2px solid rgba(255,255,255,.15)', boxShadow:'0 4px 20px rgba(0,0,0,.6)',
    },

    navBar: {
        position:'absolute', bottom:0, left:0, right:0, zIndex:1000,
        display:'flex', alignItems:'center', gap:6, padding:'12px 16px',
        background:'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%)',
        overflowX:'auto', flexWrap:'nowrap',
    },
    navLabel: { fontSize:10, color:'#555', letterSpacing:1, flexShrink:0, marginRight:4 },
    navBtn: {
        display:'flex', flexDirection:'column', alignItems:'center',
        background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)',
        borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'#fff', flexShrink:0,
        transition:'background .15s, border-color .15s', gap:2, minWidth:90,
    },
    navBtnHover: { background:'rgba(79,195,247,.15)', borderColor:'rgba(79,195,247,.4)' },
    navBtnRoute: { background:'rgba(252,211,77,.1)', borderColor:'rgba(252,211,77,.35)' },
    navBtnNext:  { background:'rgba(252,211,77,.2)', borderColor:'rgba(252,211,77,.7)', transform:'scale(1.05)' },
    navArrow: { fontSize:18, color:'#fcd34d' },
    navName:  { fontSize:11, fontWeight:600, textAlign:'center', lineHeight:1.2 },
    navDist:  { fontSize:10, color:'#6b7280' },
    navTag:   { fontSize:9, color:'#fcd34d', fontWeight:700, letterSpacing:.5 },

    arrivedBadge: {
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.4)',
        borderRadius:10, padding:'10px 18px', color:'#86efac', fontSize:14, fontWeight:700,
    },
    newSearchBtn: {
        background:'#22c55e', color:'#fff', border:'none', borderRadius:8,
        padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700,
    },

    notFound: { width:'100vw', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0f', color:'white', gap:16, fontFamily:'Segoe UI,sans-serif' },
};
