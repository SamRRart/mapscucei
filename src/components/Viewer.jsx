import React from 'react';
import { useParams } from 'react-router-dom';

import '../styles/viewer.css';

const images = import.meta.glob('../assets/images/*.jpg', { eager: true });

export default function Viewer() {
    const { node } = useParams();
    const imageSrc = images[`../assets/images/${node}.jpg`]?.default;

    return (
        <div id='main-div-viewer'>
            {imageSrc ? (
                <img id='main-image-viewer' src={imageSrc} alt='some image' />
            ) : (
                <p>Image not found for node {node}</p>
            )}
        </div>
    );
}
