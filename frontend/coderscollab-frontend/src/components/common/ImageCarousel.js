import React, { useState } from 'react';

const ImageCarousel = ({ imageUrls, height = '400px' }) => {
    const [current, setCurrent] = useState(0);

    if (!imageUrls || imageUrls.length === 0) return null;

    const BASE = 'http://localhost:8080';

    if (imageUrls.length === 1) {
        return (
            <img src={`${BASE}${imageUrls[0]}`} alt="post"
                style={{ width: '100%', height,
                    objectFit: 'cover', display: 'block' }} />
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%',
            height, overflow: 'hidden',
            background: '#000' }}>

            {/* Image */}
            <img src={`${BASE}${imageUrls[current]}`}
                alt={`slide-${current}`}
                style={{ width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block' }} />

            {/* Left Arrow */}
            {current > 0 && (
                <button onClick={e => {
                    e.stopPropagation();
                    setCurrent(prev => prev - 1);
                }}
                    style={{ position: 'absolute', left: '10px',
                        top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)', border: 'none',
                        color: '#fff', width: '32px', height: '32px',
                        borderRadius: '50%', fontSize: '16px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center' }}>
                    ‹
                </button>
            )}

            {/* Right Arrow */}
            {current < imageUrls.length - 1 && (
                <button onClick={e => {
                    e.stopPropagation();
                    setCurrent(prev => prev + 1);
                }}
                    style={{ position: 'absolute', right: '10px',
                        top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)', border: 'none',
                        color: '#fff', width: '32px', height: '32px',
                        borderRadius: '50%', fontSize: '16px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center' }}>
                    ›
                </button>
            )}

            {/* Dot Indicators */}
            <div style={{ position: 'absolute', bottom: '10px',
                left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '6px' }}>
                {imageUrls.map((_, i) => (
                    <div key={i}
                        onClick={e => {
                            e.stopPropagation();
                            setCurrent(i);
                        }}
                        style={{ width: i === current ? '18px' : '6px',
                            height: '6px', borderRadius: '3px',
                            background: i === current
                                ? '#fff' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.3s' }} />
                ))}
            </div>

            {/* Counter */}
            <div style={{ position: 'absolute', top: '10px',
                right: '10px', background: 'rgba(0,0,0,0.5)',
                color: '#fff', padding: '3px 8px',
                borderRadius: '20px', fontSize: '12px' }}>
                {current + 1}/{imageUrls.length}
            </div>
        </div>
    );
};

export default ImageCarousel;