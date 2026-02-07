import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
    content: React.ReactNode;
    color?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, color = '#888' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="tooltip-container"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px', cursor: 'help' }}
        >
            <HelpCircle size={14} color={color} />

            {isVisible && (
                <div className="tooltip-popup">
                    {content}
                </div>
            )}

            <style>{`
                .tooltip-popup {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-bottom: 8px;
                    background: #333;
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    width: max-content;
                    max-width: 200px;
                    z-index: 100;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    text-align: center;
                    line-height: 1.4;
                    pointer-events: none;
                }
                .tooltip-popup::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 4px;
                    border-style: solid;
                    border-color: #333 transparent transparent transparent;
                }
            `}</style>
        </div>
    );
};

export default Tooltip;
