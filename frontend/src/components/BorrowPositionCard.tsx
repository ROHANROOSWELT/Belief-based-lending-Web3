import React from 'react';

interface Props {
    collateral: number;
    debt: number;
}

const BorrowPositionCard: React.FC<Props> = ({ collateral, debt }) => {
    // Basic formatting
    const collateralDisplay = (collateral / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const debtDisplay = (debt / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 });

    return (
        <section className="card borrow-position-card">
            <header className="card-header">
                <h2>Active Position</h2>
            </header>
            <div className="position-grid">
                <div className="detail-item">
                    <span className="label">Collateral (SUI)</span>
                    <span className="value">{collateralDisplay}</span>
                </div>
                <div className="detail-item">
                    <span className="label">Debt (SUI)</span>
                    <span className="value">{debtDisplay}</span>
                </div>
                <div className="detail-item">
                    <span className="label">Status</span>
                    <span className={`value status-badge ${debt > 0 ? 'active' : ''}`}>
                        {debt > 0 ? "Active Loan" : "No Active Loan"}
                    </span>
                </div>
            </div>
            <style>{`
                .borrow-position-card {
                    grid-column: span 2;
                }
                .position-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                    align-items: center;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .detail-item .label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .detail-item .value {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    font-family: var(--font-mono);
                    letter-spacing: -0.02em;
                }
                .detail-item .status-badge {
                    font-size: 0.875rem;
                    font-family: var(--font-sans);
                    color: var(--text-muted);
                }
                .detail-item .status-badge.active {
                    color: var(--success);
                    font-weight: 600;
                }
            `}</style>
        </section>
    );
};

export default BorrowPositionCard;
