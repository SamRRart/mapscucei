//const data = require('./nodes.json');
//import data from './nodes.json' with {type: 'json'}

export function dijkstraRoute(data, inicio, destino) {
    let distances = {};
    let prev_nodes = {};
    let not_visited_nodes = [];

    for (let key in data) {
        if (key === inicio) {
            distances[key] = 0;
        } else {
            distances[key] = Infinity;
        }
        prev_nodes[key] = null;
        not_visited_nodes.push(key);
    }
    while (not_visited_nodes.length > 0) {
        let actual_node = not_visited_nodes.reduce((minNode, node) => {
            return distances[node] < distances[minNode] ? node : minNode;
        });
        not_visited_nodes.splice(not_visited_nodes.indexOf(actual_node), 1);
        if (distances[actual_node] === Infinity) {
            break;
        }

        for (let neighbor in data[actual_node].conections) {
            let nuevo_costo = distances[actual_node] + data[actual_node].conections[neighbor];

            if (nuevo_costo < distances[neighbor]) {
                distances[neighbor] = nuevo_costo;
                prev_nodes[neighbor] = actual_node;
            }
        }
    }

    let ruta_final = [];
    let nodo_actual = destino;

    if (distances[destino] === Infinity) {
        return { ruta: [], distancia: Infinity };
    }

    while (nodo_actual !== null) {
        ruta_final.push(nodo_actual);
        nodo_actual = prev_nodes[nodo_actual];
    }
    return ruta_final.reverse();
}

// Ejemplo de uso con tu JSON:
//const resultado = dijkstraRoute(data, "node_001", "node_004");
//console.log(resultado);