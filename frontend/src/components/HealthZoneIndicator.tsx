import React from 'react';

interface Props {
    zone: 'Healthy' | 'Belief' | 'Bankruptcy';
    ltv: number;
    apy: number;
}

const HealthZoneIndicator: React.FC<Props> = ({ zone, ltv, apy }) => {

    const getZoneColor = () => {
        switch (zone) {
            case 'Healthy': return 'var(--success)';
            case 'Belief': return 'var(--warning)';
            case 'Bankruptcy': return 'var(--error)';
        }
    };

    return (
        <section className="card health-zone-card">
            <header className="card-header">
                <h2>Health Zone</h2>
                <span className="status-badge" style={{
                    color: getZoneColor(),
                    background: 'var(--bg-tertiary)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    letterSpacing: '0.05em'
                }}>
                    {zone.toUpperCase()}
                </span>
            </header>

            <div className="zone-visual">
                <div className="zone-bar">
                    <div className="zone-segment healthy"></div>
                    <div className="zone-segment belief"></div>
                    <div className="zone-segment bankrupt"></div>

                    {/* Marker */}
                    <div className="zone-marker" style={{ left: `${Math.min(100, Math.max(0, ltv))}%` }}>
                        <div className="marker-head" style={{ background: getZoneColor() }}></div>
                        <div className="marker-line" style={{ background: getZoneColor() }}></div>
                    </div>
                </div>
                <div className="zone-labels">
                    <span>Safe</span>
                    <span>Belief Window</span>
                    <span>Insolvency</span>
                </div>
            </div>

            <div className="health-metrics">
                <div className="metric">
                    <span className="label">Current LTV</span>
                    <span className="value" style={{ color: getZoneColor() }}>{ltv.toFixed(1)}%</span>
                </div>
                <div className="metric">
                    <span className="label">Zone Status</span>
                    <span className="value">{zone === 'Belief' ? 'Grace Period' : 'Standard'}</span>
                </div>
                <div className="metric">
                    <span className="label">Dynamic APY</span>
                    <span className="value" style={{ fontWeight: '700' }}>{apy.toFixed(1)}%</span>
                </div>
            </div>

            <style>{`
                .zone-visual {
                    margin: 24px 0;
                    position: relative;
                }
                .zone-bar {
                    display: flex;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                    background: #f1f5f9;
                }
                .zone-segment { flex: 1; height: 100%; opacity: 0.3; }
                .zone-segment.healthy { flex: 3; background: var(--success); }
                .zone-segment.belief { flex: 1; background: var(--warning); }
                .zone-segment.bankrupt { flex: 1; background: var(--error); }
                
                .zone-marker {
                    position: absolute;
                    top: -6px;
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .marker-head {
                    width: 4px; /* Minimalist marker */
                    height: 20px;
                    border-radius: 2px;
                }

                .zone-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 12px;
                    font-weight: 500;
                }
                .health-metrics {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    border-top: 1px solid var(--border-color);
                    padding-top: 20px;
                }
                .metric {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .metric .label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .metric .value {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
            `}</style>
        </section>
    );
};

export default HealthZoneIndicator;
