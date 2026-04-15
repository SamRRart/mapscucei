import React, { useEffect, useState } from 'react';
import jsondata from '../functions/nodes.json';
import { useNavigate } from 'react-router-dom'

import placeholder from '../assets/smokandrew.png';
import { dijkstraRoute } from '../functions/dijkstra';

const Mainscreen = () => {
    const navigate = useNavigate();
    const landmarks = {
        key1: 'node_001',
        key2: 'node_004',
        key3: 'node_006',
        key4: 'node_008',
        key5: 'node_010',
        key6: 'node_014',
        key7: 'node_017',
        key8: 'node_019'
    }
    const [path, setPath] = useState([]);
    const [lastSelected, setLast] = useState(null);
    const [selectedPoints, setSelectedPoints] = useState([]);
    const polylinePoints = path.map(p => `${p.x},${p.y}`).join(' ');

    const handlePointClick = (point) => {
        setLast({
            name: point.name,
            node: point.node
        });
        console.log(point);
        const exists = selectedPoints.some(item => item.id == point.id);
        if (exists) {
            return;
        }
        if (selectedPoints.length == 2) {
            setSelectedPoints([point]);
            return;
        }
        setSelectedPoints([...selectedPoints, point]);
        /*if (selectedPoints.length === 2) {
            setSelectedPoints([point]);
        } else {
            setSelectedPoints([...selectedPoints, point]);
        }*/
    };

    useEffect(() => {
        if (selectedPoints.length != 2) {
            setPath([]);
            return;
        }
        const full_path = dijkstraRoute(jsondata, selectedPoints[0].node, selectedPoints[1].node);
        full_path.map((entry) => {
            const point = { node: jsondata[entry].node, x: jsondata[entry].coords_2d.x, y: jsondata[entry].coords_2d.y }
            setPath(prevState => [...prevState, point]);
        });
    }, [selectedPoints]);

    return (
        <div style={styles.wrapper}>
            {lastSelected ?
                <div style={styles.controls}>
                    <p>Selected: {lastSelected.name}</p>
                    <button onClick={() => navigate(`/viewer/${lastSelected.node}`)}>Go to: {lastSelected.name}</button>
                </div>
                : null}
            <div style={styles.container}>
                <img
                    src={placeholder}
                    alt="Background"
                    style={styles.image}
                />
                <svg style={styles.svgOverlay}>
                    {path.length > 1 && (
                        <polyline
                            points={polylinePoints}
                            fill='none'
                            stroke='blue'
                            strokeWidth='3'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                    )}
                </svg>

                {/*selectedPoints.some(p => p.name === entry[1].name) ? '#00ff00' : '#ff4444' */}
                {Object.entries(jsondata).map((entry) => (
                    <button
                        key={entry[1].name}
                        onClick={() => (handlePointClick({
                            id: entry[1].name, x: entry[1].coords_2d.x, y: entry[1].coords_2d.y, name: entry[1].name, node: entry[0]
                        }))}
                        style={{
                            ...styles.point,
                            left: entry[1].coords_2d.x,
                            top: entry[1].coords_2d.y,
                            backgroundColor: Object.values(landmarks).some(landmark => landmark == entry[0]) ? '#ff4444' : 'transparent',
                            border: Object.values(landmarks).some(landmark => landmark == entry[0]) ? '#000000' : ' transparent'
                        }}
                        title={entry[1].name}
                    />
                ))}
            </div>
        </div>
    );
};

const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#282c34',
        minHeight: '100vh',
        color: 'white'
    },
    container: {
        position: 'relative', // Necessary to anchor absolute children
        display: 'inline-block',
        border: '2px solid #555',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    image: {
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
        userSelect: 'none',
    },
    svgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Allows clicks to pass through to the buttons
    },
    point: {
        position: 'absolute',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: '2px solid white',
        transform: 'translate(-50%, -50%)', // Centers the point on the coordinate
        cursor: 'pointer',
        zIndex: 10,
        transition: 'transform 0.2s, background-color 0.2s',
    },
    controls: {
        marginTop: '20px',
        textAlign: 'center'
    }
};

export default Mainscreen;