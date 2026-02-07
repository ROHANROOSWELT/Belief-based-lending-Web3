import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';

interface Props {
    message: string;
    tierLabel: string;
}

const AutomatedTimeBuffer: React.FC<Props> = ({ message, tierLabel }) => {
    return (
        <section className="card automated-buffer-card">
            <header className="card-header">
                <h2>Protocol Automation</h2>
            </header>

            <div className="automation-content">
                <div className="automation-row">
                    <div className="auto-icon">
                        <Clock size={20} color="var(--accent-secondary)" />
                    </div>
                    <div className="auto-info">
                        <span className="label">Time Buffer Status</span>
                        <span className="value-large">{message}</span>
                    </div>
                </div>

                <div className="divider"></div>

                <div className="automation-row">
                    <div className="auto-icon">
                        <TrendingUp size={20} color="var(--text-secondary)" />
                    </div>
                    <div className="auto-info">
                        <span className="label">Dynamic Interest Tier</span>
                        <span className="value-highlight">{tierLabel}</span>
                    </div>
                </div>
            </div>

            <div className="auto-footer">
                Protocol updates automatically based on decentralized price feeds.
            </div>

            <style>{`
                .automated-buffer-card {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .automation-content {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .automation-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .auto-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--bg-tertiary);
                    border-radius: 8px; /* Modern Soft Square */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .auto-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .value-large {
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .value-highlight {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--accent-secondary);
                }
                .divider {
                    height: 1px;
                    background: var(--border-color);
                    width: 100%;
                }
                .auto-footer {
                    margin-top: 24px;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    background: var(--bg-tertiary);
                    padding: 8px 12px;
                    border-radius: 6px;
                    text-align: center;
                }
            `}</style>
        </section>
    );
};

export default AutomatedTimeBuffer;
