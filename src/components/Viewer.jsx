import React from 'react';
import { useParams } from 'react-router-dom';

export default function Viewer() {
    const { id } = useParams();
    return (
        <div>
            <p>viewer</p>
        </div>
    )
}
