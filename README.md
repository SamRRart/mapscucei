

Sistema de navegación interna del campus del **Centro Universitario de Ciencias Exactas e Ingenierías (CUCEI)**, estilo Google Street View / Google Maps, construido con React + Leaflet.

---

## Cómo ejecutar el proyecto

### Requisitos
- Node.js **v20.19 o superior** (recomendado: v24)
- nvm para Windows instalado

### Pasos
```powershell
# 1. Activar Node 24
nvm use 24.13.1

# 2. Entrar al directorio del proyecto
cd "ruta\al\proyecto\mapscucei"

# 3. Instalar dependencias (solo la primera vez)
npm install

# 4. Iniciar el servidor de desarrollo
node node_modules\vite\bin\vite.js
```

Abrir en el navegador: **http://localhost:5173/**

> **Nota:** Si el comando `npm run dev` falla con error de Node 14, usar directamente `node node_modules\vite\bin\vite.js` para evitar el conflicto con instalaciones antiguas de Node en el PATH.

---

## Estructura del proyecto

```
mapscucei/
├── src/
│   ├── components/
│   │   ├── Mainscreen.jsx   ← Pantalla del mapa con selección de origen/destino
│   │   └── Viewer.jsx       ← Visor Street View con imágenes 360° y minimapa
│   ├── functions/
│   │   ├── nodes.json       ← Base de datos de los 44 nodos del campus
│   │   └── dijkstra.jsx     ← Algoritmo de ruta más corta
│   ├── styles/
│   │   └── viewer.css       ← Estilos para los hotspots de Pannellum
│   ├── App.jsx              ← Rutas de React Router
│   └── main.jsx             ← Punto de entrada de la app
├── editor_mapa.html         ← Herramienta para editar nodos (abrir en navegador)
├── package.json
└── vite.config.js
```

---

## Archivos principales

### `src/functions/nodes.json`
Base de datos de los puntos del campus. Cada nodo tiene esta estructura:

```json
"node_001": {
  "node": "node_001",
  "name": "Nombre del lugar",
  "landmark": false,
  "image_360": "null",
  "coords_gps": { "lat": 20.65906, "lng": -103.32962 },
  "coords_2d": { "x": 0, "y": 0 },
  "conections": { "node_002": 12.5, "node_003": 8.3 },
  "hotspot_360": []
}
```

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre visible del nodo |
| `landmark` | `true` si es un punto de interés (se pinta de rojo) |
| `image_360` | URL de la imagen equirectangular 360°, o `"null"` si no hay |
| `coords_gps` | Coordenadas GPS reales del punto |
| `conections` | Nodos vecinos y distancia en metros |
| `hotspot_360` | Puntos de clic dentro de la imagen 360° |

### `src/functions/dijkstra.jsx`
Implementación del **algoritmo de Dijkstra** para encontrar la ruta más corta en el grafo del campus.

- Recibe: el mapa de nodos, la clave del nodo origen, la clave del nodo destino
- Devuelve: array ordenado de claves de nodos (`["node_001", "node_005", "node_012"]`)

### `src/components/Mainscreen.jsx`
Pantalla de inicio con el mapa del campus.

- Usa **Leaflet** con tiles de OpenStreetMap centrado en CUCEI
- Al hacer clic, aplica la **fórmula Haversine** para encontrar el nodo más cercano (snapping)
- Dibuja la ruta calculada por Dijkstra como una línea amarilla
- Botón "Iniciar navegación" lleva al `Viewer` pasando la ruta como estado

### `src/components/Viewer.jsx`
Pantalla del visor estilo Street View.

- Si el nodo tiene `image_360`, carga **Pannellum** (visor 360° desde CDN) con hotspots navegables
- Si no tiene imagen, muestra un marcador de posición con el nombre del nodo
- **Minimapa** con Leaflet muestra la posición actual y los vecinos
- **Barra de progreso** cuando viene con ruta (modo guiado)
- **Modo guiado**: botones ATRÁS / SIGUIENTE EN RUTA + badge " Llegaste a tu destino"
- **Modo libre**: muestra todos los nodos vecinos con distancia

### `editor_mapa.html`
Herramienta independiente (no forma parte de la app React) para gestionar los nodos.

Abrir directamente en el navegador (doble clic en el archivo o arrastrar a Chrome).

**Flujo de trabajo:**
1. Pulsar **"Importar nodes.json"** → carga los 44 nodos existentes en el mapa
2. Seleccionar modo **"＋ Agregar nodo"** → hacer clic en el mapa para añadir un punto
3. Seleccionar modo **"⟵ Conectar"** → hacer clic en dos nodos para conectarlos
4. Pulsar **"⬇ Descargar nodes.json"** → reemplazar el archivo en `src/functions/nodes.json`

---



## Cómo agregar imágenes 360°

1. Capturar una foto **equirectangular** (360° horizontal, 180° vertical) de cada punto
2. Guardar el archivo en la carpeta `public/` (ej. `public/images/node_001.jpg`)
3. Editar `nodes.json` y cambiar el campo `image_360` de ese nodo:
   ```json
   "image_360": "/images/node_001.jpg"
   ```
4. El Viewer detectará automáticamente la imagen y cargará Pannellum

---

## Cómo agregar más nodos

1. Abrir `editor_mapa.html` en el navegador
2. Importar el `nodes.json` actual
3. Agregar nuevos nodos haciendo clic en el mapa
4. Conectarlos con nodos existentes
5. Descargar el nuevo `nodes.json` y reemplazarlo en `src/functions/`
