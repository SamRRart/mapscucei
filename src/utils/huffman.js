// src/utils/huffman.js

export function cargarMapaComprimido(urlArchivoHuff) {
    return new Promise((resolve, reject) => {
        // En Vite, así se manda llamar a un Web Worker
        const worker = new Worker(new URL('./huffmanWorker.js', import.meta.url), { type: 'module' });

        worker.onmessage = (e) => {
            const { success, blob, error } = e.data;
            if (success) {
                // Convertimos el blob devuelto por el worker a una URL visual
                const url = URL.createObjectURL(blob);
                resolve(url);
            } else {
                reject(new Error(error));
            }
            // Despedimos al ayudante para liberar memoria RAM
            worker.terminate(); 
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };

        // Le damos la orden al Worker de empezar
        worker.postMessage({ urlArchivoHuff });
    });
}