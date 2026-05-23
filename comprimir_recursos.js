import fs from 'fs';
import path from 'path';

// --- 1. Lógica Matemática de Huffman (Sin cambios) ---
class Nodo {
    constructor(byte, freq) {
        this.byte = byte;
        this.freq = freq;
        this.izq = null;
        this.der = null;
    }
}

function generarCodigos(raiz, codigoActual = "", codigos = {}) {
    if (!raiz) return;
    if (raiz.byte !== null) {
        codigos[raiz.byte] = codigoActual;
        return codigos;
    }
    generarCodigos(raiz.izq, codigoActual + "0", codigos);
    generarCodigos(raiz.der, codigoActual + "1", codigos);
    return codigos;
}

// --- 2. Función de Compresión Individual ---
function comprimirArchivo(rutaEntrada, rutaSalida) {
    const datos = fs.readFileSync(rutaEntrada);
    const frecuencias = {};
    for (let i = 0; i < datos.length; i++) {
        const byte = datos[i];
        frecuencias[byte] = (frecuencias[byte] || 0) + 1;
    }

    let nodos = Object.keys(frecuencias).map(b => new Nodo(parseInt(b), frecuencias[b]));
    if (nodos.length === 0) return;

    while (nodos.length > 1) {
        nodos.sort((a, b) => b.freq - a.freq); 
        let der = nodos.pop();
        let izq = nodos.pop();
        let padre = new Nodo(null, izq.freq + der.freq);
        padre.izq = izq;
        padre.der = der;
        nodos.push(padre);
    }
    
    const raiz = nodos[0];
    const tablaCodigos = generarCodigos(raiz);

    let cadenaBits = "";
    for (let i = 0; i < datos.length; i++) {
        cadenaBits += tablaCodigos[datos[i]];
    }

    let relleno = 8 - (cadenaBits.length % 8);
    if (relleno !== 8) {
        cadenaBits += "0".repeat(relleno);
    } else {
        relleno = 0;
    }

    const bufferComprimido = Buffer.alloc(cadenaBits.length / 8);
    for (let i = 0; i < cadenaBits.length; i += 8) {
        const byteStr = cadenaBits.slice(i, i + 8);
        bufferComprimido[i / 8] = parseInt(byteStr, 2);
    }

    const dirSalida = path.dirname(rutaSalida);
    if (!fs.existsSync(dirSalida)) {
        fs.mkdirSync(dirSalida, { recursive: true });
    }

    const metadatos = JSON.stringify({ frecuencias, relleno });
    const bufferMetadatos = Buffer.from(metadatos + "\n---\n"); 
    const archivoFinal = Buffer.concat([bufferMetadatos, bufferComprimido]);
    fs.writeFileSync(rutaSalida, archivoFinal);
}

// --- 3. NUEVO: Función de Procesamiento por Lotes (Batch) ---
function comprimirCarpetaCompleta(carpetaEntrada, carpetaSalida) {
    console.log(`Iniciando compresión masiva desde: ${carpetaEntrada}`);
    
    // Validar que la carpeta de entrada exista
    if (!fs.existsSync(carpetaEntrada)) {
        console.error(`❌ Error: La carpeta ${carpetaEntrada} no existe.`);
        return;
    }

    // Leer todos los archivos dentro de la carpeta
    const archivos = fs.readdirSync(carpetaEntrada);
    
    // Filtrar solo las imágenes (puedes añadir más extensiones si lo necesitas)
    const imagenes = archivos.filter(archivo => {
        const ext = path.extname(archivo).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.bmp'].includes(ext);
    });

    if (imagenes.length === 0) {
        console.log("No se encontraron imágenes en la carpeta.");
        return;
    }

    console.log(`Se encontraron ${imagenes.length} imágenes. Procesando...`);
    let procesadas = 0;

    // Procesar cada imagen
    imagenes.forEach(archivo => {
        const rutaCompletaEntrada = path.join(carpetaEntrada, archivo);
        // Cambiar la extensión original por .huff para el archivo de salida
        const nombreSalida = path.basename(archivo, path.extname(archivo)) + '.huff';
        const rutaCompletaSalida = path.join(carpetaSalida, nombreSalida);

        comprimirArchivo(rutaCompletaEntrada, rutaCompletaSalida);
        procesadas++;
        
        // Imprimir progreso en la misma línea
        process.stdout.write(`\rProcesando: ${procesadas}/${imagenes.length} completadas...`);
    });

    console.log(`\n✅ ¡Proceso terminado! ${procesadas} archivos comprimidos en: ${carpetaSalida}`);
}

// --- 4. EJECUCIÓN MASIVA ---
// Define la carpeta donde están tus 73 imágenes originales
const carpetaOrigen = './public'; 

// Define la carpeta donde se guardarán los 73 archivos .huff
const carpetaDestino = './public/mapcomprimido';

comprimirCarpetaCompleta(carpetaOrigen, carpetaDestino);