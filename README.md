# Mapa Panorámico Inmersivo 360° - NavCUCEI

##  Descripción del Proyecto
**NavCUCEI** es una herramienta web interactiva diseñada para ayudar a la comunidad del **Centro Universitario de Ciencias Exactas e Ingenierías (CUCEI)** de la Universidad de Guadalajara a navegar de forma óptima por sus instalaciones. 

A través de un mapa virtual y una experiencia inmersiva de 360° (estilo *Street View*), los estudiantes de nuevo ingreso, visitantes y personal del campus pueden ubicar de manera interactiva aulas, módulos, laboratorios, departamentos, auditorios y puestos de comida sin perderse.

##  Características Principales
*  **Navegación en Mapa Virtual:** Implementación de un lienzo interactivo personalizado del campus universitario utilizando la biblioteca de código abierto **Leaflet**.
*  **Modo "Planear Ruta":** Permite al usuario seleccionar un nodo de inicio y un destino. El buscador integrado permite localizar espacios por nombre del edificio, número de nodo o descripción interna (como laboratorios o departamentos). El sistema calcula y dibuja el camino más corto utilizando el algoritmo de **Dijkstra** (los recorridos se encuentran pre-cargados para optimizar el tiempo de respuesta y evitar esperas).
*  **Modo "Explorar" (Vistas 360°):** El usuario puede recorrer visualmente el campus a través de 73 fotografías panorámicas en alta resolución, simulando el entorno real mediante transiciones fluidas.
*  **Optimización con Formato Propio (.huff):** Originalmente, el banco de imágenes de alta calidad representaba un peso total cercano a los 900 MB (con archivos individuales de entre 10 y 20 MB). Para aligerar la carga, el sistema procesa y comprime las imágenes a un formato propietario optimizado utilizando la codificación de **Huffman**. El visor web se encarga de descomprimir estos archivos `.huff` en tiempo real durante la navegación.

##  Tecnologías y Algoritmos Utilizados
* **Core Frontend:** React.js
* **Mapas e Interfaz 2D:** Leaflet
* **Renderizado Inmersivo 360°:** Pannellum (Librería nativa de JavaScript sin necesidad de plugins externos)
* **Algoritmo de Enrutamiento:** Algoritmo de Dijkstra para Caminos Mínimos
* **Algoritmo de Compresión:** Codificación de Huffman (Compresión sin pérdida de datos)
* **Estructuras de Datos:** Grafos, matrices y listas de adyacencia serializadas en archivos `.json`

## Equipo: Los Power Rangers
Este proyecto es desarrollado por los alumnos de la carrera de **Ingeniería en Computación**:

* González Angulo de la Cruz Sariás
* Manzo Padilla Andrés Maximiliano
* Rivas Rodríguez Samuel
* Sánchez Rivera Rodrigo

## Contexto Académico
* **Institución:** Universidad de Guadalajara (UdeG) - CUCEI.
* **Materia:** IL355 Análisis de Algoritmos (D01).
* **Profesor:** Jorge Ernesto López Arce Delgado.

## Metodología de Diseño
El proyecto fue concebido bajo el marco de **Design Thinking**, pasando por las etapas de:
1.  **Empatizar:** Identificación del desafío que enfrentan los alumnos nuevos al navegar en CUCEI.
2.  **Definición:** Planteamiento de la solución basada en tecnología inmersiva y algoritmos de grafos.
