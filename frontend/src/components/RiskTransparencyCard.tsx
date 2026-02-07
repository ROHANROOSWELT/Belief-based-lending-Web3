import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskTransparencyCardProps {
    cycleStats?: {
        healthy: number;
        belief: number;
        bankruptcy: number;
        total: number;
    };
}

const RiskTransparencyCard: React.FC<RiskTransparencyCardProps> = ({ cycleStats }) => {
    return (
        <section className="card risk-transparency-card">
            <header className="card-header">
                <h2>Risk & Consensus</h2>
            </header>

            <div className="risk-content">

                {/* Modern Consensus Widget */}
                {cycleStats && (
                    <div className="consensus-widget">
                        <div className="consensus-header">
                            <span className="consensus-title">24h Protocol Governance</span>
                            <span className="consensus-count">{cycleStats.total}/8 Snapshots</span>
                        </div>

                        <div className="progress-track">
                            <div className="progress-fill healthy" style={{ flex: cycleStats.healthy }}></div>
                            <div className="progress-fill belief" style={{ flex: cycleStats.belief }}></div>
                            <div className="progress-fill bankrupt" style={{ flex: cycleStats.bankruptcy }}></div>
                            <div className="progress-fill empty" style={{ flex: 8 - cycleStats.total }}></div>
                        </div>

                        <div className="consensus-legend">
                            <div className="legend-item">
                                <div className="dot healthy"></div>
                                <span>Healthy ({cycleStats.healthy})</span>
                            </div>
                            <div className="legend-item">
                                <div className="dot belief"></div>
                                <span>Belief ({cycleStats.belief})</span>
                            </div>
                            <div className="legend-item">
                                <div className="dot bankrupt"></div>
                                <span>Insolvency ({cycleStats.bankruptcy})</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="risk-items-grid">
                    <div className="risk-item">
                        <div className="icon-wrapper warning">
                            <AlertTriangle size={18} />
                        </div>
                        <div className="text">
                            <h3>Insolvency Condition</h3>
                            <p>Liquidation triggers if Collateral &lt; 110% of Borrowed Value.</p>
                        </div>
                    </div>

                    <div className="risk-item">
                        <div className="icon-wrapper success">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="text">
                            <h3>Belief Protection</h3>
                            <p>Prices drops are protected by <strong>Belief Score</strong> buffer.</p>
                        </div>
                    </div>
                </div>

                <div className="metric-row">
                    <div className="metric">
                        <span className="label">Liquidation Price</span>
                        <span className="value">$1,840.50</span>
                    </div>
                    <div className="metric">
                        <span className="label">Current Price</span>
                        <span className="value">$2,450.00</span>
                    </div>
                </div>
            </div>

            <style>{`
                .risk-transparency-card {
                     grid-column: span 2;
                }
                .risk-content {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                /* Consensus Widget */
                .consensus-widget {
                    background: var(--bg-tertiary);
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                .consensus-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .progress-track {
                    display: flex;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    background: #e2e8f0;
                    margin-bottom: 12px;
                }
                .progress-fill.healthy { background: var(--success); }
                .progress-fill.belief { background: var(--warning); }
                .progress-fill.bankrupt { background: var(--error); }
                .progress-fill.empty { background: transparent; }

                .consensus-legend {
                    display: flex;
                    gap: 16px;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .dot.healthy { background: var(--success); }
                .dot.belief { background: var(--warning); }
                .dot.bankrupt { background: var(--error); }


                .risk-items-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .risk-item {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .icon-wrapper {
                    padding: 8px;
                    border-radius: 8px;
                    flex-shrink: 0;
                }
                .icon-wrapper.warning {
                    background: #fffbeb;
                    color: var(--warning);
                }
                .icon-wrapper.success {
                    background: #ecfdf5;
                    color: var(--success);
                }
                .risk-item h3 {
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: var(--text-primary);
                }
                .risk-item p {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }
                
                .metric-row {
                    display: flex;
                    justify-content: space-between;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
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
                     font-family: var(--font-mono);
                     font-weight: 600;
                     color: var(--text-primary);
                     font-size: 1.1rem;
                }
            `}</style>
        </section>
    );
};

export default RiskTransparencyCard;
