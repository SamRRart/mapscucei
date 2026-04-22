import { useState } from "react";

export default function NodeEditor() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [image, setImage] = useState("/mnt/data/Screenshot 2026-04-21 182824.png");

  const handleClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode = {
      id: `node_${nodes.length + 1}`,
      x,
      y
    };

    setNodes([...nodes, newNode]);
  };

  const handleNodeClick = (node) => {
    if (!selectedNode) {
      setSelectedNode(node);
    } else {
      if (selectedNode.id !== node.id) {
        setConnections([...connections, { from: selectedNode, to: node }]);
      }
      setSelectedNode(null);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <h1 className="text-xl mb-2">Editor de Nodos (modo prueba)</h1>

      <div
        className="relative border"
        style={{ width: 900, height: 600, backgroundImage: `url(${image})`, backgroundSize: "cover" }}
        onClick={handleClick}
      >
        <svg className="absolute top-0 left-0 w-full h-full">
          {connections.map((c, i) => (
            <line
              key={i}
              x1={c.from.x}
              y1={c.from.y}
              x2={c.to.x}
              y2={c.to.y}
              stroke="red"
              strokeWidth="2"
            />
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node);
            }}
            className="absolute w-3 h-3 bg-blue-500 rounded-full cursor-pointer"
            style={{ left: node.x - 6, top: node.y - 6 }}
          />
        ))}
      </div>

      <pre className="mt-4 text-xs bg-gray-100 p-2 w-[900px] h-40 overflow-auto">
        {JSON.stringify({ nodes, connections }, null, 2)}
      </pre>
    </div>
  );
}
