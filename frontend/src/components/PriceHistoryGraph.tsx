import React from 'react';

interface PricePoint {
    timestamp: number;
    price: number;
}

interface PriceHistoryGraphProps {
    data: PricePoint[];
    width?: number;
    height?: number;
    color?: string;
    showGradient?: boolean;
}

export default function PriceHistoryGraph({
    data,
    width = 300,
    height = 60,
    color = '#2e7d32',
    showGradient = true
}: PriceHistoryGraphProps) {
    // Handle empty data
    if (!data || data.length === 0) {
        return null;
    }

    // Handle single point (Pre-fill with a second point for visualization)
    let renderData = [...data];
    if (renderData.length === 1) {
        // Create a fake previous point for flat line effect
        renderData.unshift({
            timestamp: renderData[0].timestamp - 1,
            price: renderData[0].price
        });
    }

    // 1. Find Min/Max for Scaling
    const prices = renderData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Add some padding to min/max so the line isn't hugging the edge
    const range = maxPrice - minPrice;
    // If range is 0 (flat line), add artificial padding
    const effectiveRange = range === 0 ? maxPrice * 0.01 : range;

    // Google Style: Tighter vertical bounds
    const padding = effectiveRange * 0.2;
    const yMin = minPrice - padding;
    const yMax = maxPrice + padding;
    const yRange = yMax - yMin;

    // 2. Map Data to SVG Coordinates
    const points = renderData.map((d, i) => {
        // x is purely based on index (even spacing)
        const x = (i / (renderData.length - 1)) * width;
        const normalizedY = (d.price - yMin) / yRange;
        const y = height - (normalizedY * height); // SVG y is top-down
        return `${x},${y}`;
    }).join(' ');

    // 3. Create Area Path (for gradient)
    const firstX = 0;
    const lastX = width;
    const areaPath = `
        M ${firstX},${height} 
        L ${points.split(' ')[0]} 
        L ${points.replace(/ /g, ' L ')} 
        L ${lastX},${height} 
        Z
    `;

    // Google Finance Green/Red
    const startPrice = renderData[0].price;
    const endPrice = renderData[renderData.length - 1].price;
    const isUp = endPrice >= startPrice;
    const graphColor = color || (isUp ? '#137333' : '#d93025'); // Google's exact hex codes

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={graphColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={graphColor} stopOpacity={0} />
                </linearGradient>
            </defs>

            {showGradient && (
                <path d={areaPath} fill="url(#graphGradient)" stroke="none" />
            )}

            <polyline
                points={points}
                fill="none"
                stroke={graphColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* End Dot */}
            <circle
                cx={width}
                cy={height - ((renderData[renderData.length - 1].price - yMin) / yRange * height)}
                r="3.5"
                fill={graphColor}
                stroke="#fff"
                strokeWidth="1.5"
            />
        </svg>
    );
}
