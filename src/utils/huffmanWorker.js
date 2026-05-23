class Nodo {
    constructor(byte, freq) {
        this.byte = byte;
        this.freq = freq;
        this.izq = null;
        this.der = null;
    }
}

// self.onmessage escucha cuando la página web le pide ayuda
self.onmessage = async function(e) {
    const { urlArchivoHuff } = e.data;
    
    try {
        const response = await fetch(urlArchivoHuff);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        let splitIndex = -1;
        for (let i = 0; i < bytes.length - 4; i++) {
            if (bytes[i] === 10 && bytes[i+1] === 45 && bytes[i+2] === 45 && bytes[i+3] === 45 && bytes[i+4] === 10) {
                splitIndex = i;
                break;
            }
        }

        if (splitIndex === -1) throw new Error("Formato .huff inválido.");

        const metaBytes = bytes.slice(0, splitIndex);
        const metaText = new TextDecoder().decode(metaBytes);
        const metadatos = JSON.parse(metaText);

        const datosComprimidos = bytes.slice(splitIndex + 5);

        let nodos = Object.keys(metadatos.frecuencias).map(b => new Nodo(parseInt(b), metadatos.frecuencias[b]));
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

        let bits = "";
        for(let i = 0; i < datosComprimidos.length; i++) {
            bits += datosComprimidos[i].toString(2).padStart(8, '0');
        }
        
        if (metadatos.relleno > 0) bits = bits.slice(0, -metadatos.relleno);

        const datosOriginales = [];
        let actual = raiz;
        for (let i = 0; i < bits.length; i++) {
            actual = bits[i] === '0' ? actual.izq : actual.der;
            if (actual.byte !== null) {
                datosOriginales.push(actual.byte);
                actual = raiz; 
            }
        }

        // Envolvemos los píxeles en un Blob y se los devolvemos a la app
        const originalArray = new Uint8Array(datosOriginales);
        const blob = new Blob([originalArray]); 
        
        self.postMessage({ success: true, blob: blob });

    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};