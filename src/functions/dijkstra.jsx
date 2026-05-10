// ─────────────────────────────────────────────────────────────────────────────
// dijkstra.jsx  –  Algoritmo de ruta más corta
//
// Esta función recibe el mapa de nodos (nodes.json), un nodo de inicio y
// un nodo de destino, y devuelve la lista ordenada de nodos que forman el
// camino más corto entre ambos puntos del campus.
//
// Retorna:
//   - Array de claves (ej. ["node_001","node_005","node_012"]) si hay camino
//   - { ruta: [], distancia: Infinity }  si no existe camino posible
// ─────────────────────────────────────────────────────────────────────────────

export function dijkstraRoute(data, inicio, destino) {
    // Tabla de distancias: cuánto cuesta llegar a cada nodo desde el inicio
    let distances = {};
    // Tabla de predecesores: qué nodo viene antes en la ruta óptima
    let prev_nodes = {};
    // Lista de nodos que todavía no hemos procesado
    let not_visited_nodes = [];

    // Inicializar: distancia 0 al nodo de inicio, Infinity a todos los demás
    for (let key in data) {
        if (key === inicio) {
            distances[key] = 0;
        } else {
            distances[key] = Infinity;
        }
        prev_nodes[key] = null;
        not_visited_nodes.push(key);
    }

    // Procesar nodos mientras queden por visitar
    while (not_visited_nodes.length > 0) {
        // Elegir el nodo no visitado con menor distancia acumulada
        let actual_node = not_visited_nodes.reduce((minNode, node) => {
            return distances[node] < distances[minNode] ? node : minNode;
        });

        // Sacar el nodo actual de la lista de pendientes
        not_visited_nodes.splice(not_visited_nodes.indexOf(actual_node), 1);

        // Si el nodo más cercano tiene distancia infinita, el resto es inalcanzable
        if (distances[actual_node] === Infinity) {
            break;
        }

        // Revisar cada vecino conectado al nodo actual
        for (let neighbor in data[actual_node].conections) {
            // Costo de llegar al vecino pasando por el nodo actual
            let nuevo_costo = distances[actual_node] + data[actual_node].conections[neighbor];

            // Si encontramos un camino más corto, actualizamos
            if (nuevo_costo < distances[neighbor]) {
                distances[neighbor] = nuevo_costo;
                prev_nodes[neighbor] = actual_node;
            }
        }
    }

    // Si el destino sigue en Infinity, no hay camino posible
    if (distances[destino] === Infinity) {
        return { ruta: [], distancia: Infinity };
    }

    // Reconstruir la ruta recorriendo los predecesores hacia atrás
    let ruta_final = [];
    let nodo_actual = destino;
    while (nodo_actual !== null) {
        ruta_final.push(nodo_actual);
        nodo_actual = prev_nodes[nodo_actual];
    }
    // Invertir para que quede de origen → destino
    return ruta_final.reverse();
}

// Ejemplo de uso:
// import { dijkstraRoute } from './dijkstra';
// import data from './nodes.json';
// const ruta = dijkstraRoute(data, "node_001", "node_044");
// console.log(ruta); // ["node_001", "node_005", ..., "node_044"]