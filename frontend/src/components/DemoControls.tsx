import React from 'react';
import { RotateCcw, Clock, TrendingDown, TrendingUp, Plus } from 'lucide-react';

interface DemoControlsProps {
    price: number;
    setPrice: React.Dispatch<React.SetStateAction<number>>;
    timeOffset: number;
    setTimeOffset: (t: number) => void;
    reset: () => void;
    isSimulating: boolean;
    onToggle: (active: boolean) => void;
    onAddLoan?: () => void;
    hasActiveLoan?: boolean;
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '340px',
    background: '#1e293b', // Dark slate theme
    color: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    zIndex: 9999, // Ensure top
    fontFamily: '"Inter", sans-serif',
    border: '1px solid rgba(255,255,255,0.1)'
};

const controlGroupStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid rgba(255,255,255,0.05)'
};

const btnBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    border: 'none',
    fontWeight: 600,
    transition: 'all 0.2s',
    fontSize: '0.85rem'
};

export default function DemoControls({
    price,
    setPrice,
    timeOffset,
    setTimeOffset,
    reset,
    isSimulating,
    onToggle,
    onAddLoan,
    hasActiveLoan
}: DemoControlsProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Force updates via functional state to bypass closure staleness
    const handleUp = () => {
        if (!isSimulating) return alert("Enable Simulation First");
        setPrice(p => Number((p + 0.05).toFixed(2))); // Prevent float drift
    };

    const handleDown = () => {
        if (!isSimulating) return alert("Enable Simulation First");
        setPrice(p => Number(Math.max(0.01, p - 0.05).toFixed(2)));
    };

    const handleCrash = () => {
        if (!isSimulating) return alert("Enable Simulation First");
        setPrice(p => Number(Math.max(0.01, p - 0.50).toFixed(2)));
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 9999,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    fontSize: '0.9rem'
                }}
            >
                JDGS
            </button>
        );
    }

    return (
        <div style={overlayStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                    <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>JUDGES PANEL</span>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}>×</button>
            </div>

            {/* Toggle Switch */}
            <div style={{ ...controlGroupStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: isSimulating ? '#fff' : 'rgba(255,255,255,0.5)' }}>Simulation Mode</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                    <input type="checkbox" checked={isSimulating} onChange={(e) => onToggle(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isSimulating ? '#10b981' : 'rgba(255,255,255,0.1)', borderRadius: '34px', transition: '.4s' }}>
                        <span style={{ position: 'absolute', content: "", height: '18px', width: '18px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: isSimulating ? 'translateX(20px)' : 'translateX(0)' }}></span>
                    </span>
                </label>
            </div>

            {/* Controls */}
            <div style={{ opacity: isSimulating ? 1 : 0.3, pointerEvents: isSimulating ? 'auto' : 'none', transition: 'opacity 0.2s' }}>

                {/* Price Section */}
                <div style={controlGroupStyle}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600 }}>Market Price Control</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px', textAlign: 'center', fontFamily: 'monospace' }}>${price.toFixed(2)}</div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={handleUp} style={{ ...btnBaseStyle, background: '#059669', color: '#fff' }}>
                            <TrendingUp size={16} /> +0.05
                        </button>
                        <button onClick={handleDown} style={{ ...btnBaseStyle, background: '#b91c1c', color: '#fff' }}>
                            <TrendingDown size={16} /> -0.05
                        </button>
                    </div>
                    <button onClick={handleCrash} style={{ ...btnBaseStyle, background: 'rgba(185, 28, 28, 0.2)', color: '#fca5a5', border: '1px solid #b91c1c' }}>
                        CRASH MARKET (-0.50)
                    </button>
                </div>

                {/* Time Section */}
                <div style={controlGroupStyle}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600 }}>Time Travel</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem' }}>Current Offset</span>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>+{timeOffset}h</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setTimeOffset(timeOffset + 3)} style={{ ...btnBaseStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                            <Clock size={16} /> +3H
                        </button>
                        <button onClick={() => setTimeOffset(timeOffset + 24)} style={{ ...btnBaseStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                            <Clock size={16} /> +24H
                        </button>
                    </div>
                </div>

                {/* System Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={reset} style={{ ...btnBaseStyle, flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                        <RotateCcw size={14} /> RESET
                    </button>

                    {onAddLoan && !hasActiveLoan && (
                        <button onClick={onAddLoan} style={{ ...btnBaseStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>
                            <Plus size={14} /> NEW LOAN
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
