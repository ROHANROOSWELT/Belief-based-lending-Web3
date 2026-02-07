import React from 'react';
import type { HealthZone } from '../services/BBLService';
import HealthZoneIndicator from './HealthZoneIndicator';
import AutomatedTimeBuffer from './AutomatedTimeBuffer';
import RiskTransparencyCard from './RiskTransparencyCard';
import BorrowPositionCard from './BorrowPositionCard';


export interface SimulatedLoan {
    id: string;
    lender: string;
    borrowedAmount: number; // MIST
    collateralAmount: number; // MIST

    // Simulation State
    history: { t: number, p: number, z: HealthZone }[];
    isLiquidated: boolean;
    dailyInterestTier: { label: string; apy: number } | null;
    status: 'Active' | 'Liquidated';
}

interface LoanCardProps {
    loan: SimulatedLoan;
    currentPrice: number;
    timeOffsetHours: number;
    isSimulating: boolean;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, currentPrice, timeOffsetHours, isSimulating }) => {

    // --- Local Logic for Display ---
    // (This largely mirrors Dashboard logic, but purely for render)

    const calculateDisplayStatus = () => {
        if (loan.isLiquidated) {
            return {
                ltv: 0,
                z: 'Bankruptcy' as HealthZone,
                tier: { label: 'Liquidated', apy: 0 },
                msg: "PERMANENTLY LIQUIDATED. ACCOUNT INSOLVENT."
            };
        }

        const collateralVal = loan.collateralAmount * currentPrice;
        const debt = loan.borrowedAmount;

        let ltv = 0;
        let z: HealthZone = 'Healthy';

        if (debt > 0) {
            ltv = (debt / collateralVal) * 100;
            const ratio = collateralVal / debt;
            if (ratio < 1.0) z = 'Bankruptcy';
            else if (ratio < 1.2) z = 'Belief';
        }

        // Determine Tier
        // If we have a 'dailyInterestTier' locked in from previous day, use it.
        // Otherwise, compute speculative tier based on current zone (or just say "Base Rate" if day 0)
        let tier = { label: 'Base Rate', apy: 4.5 };
        if (z === 'Belief') tier = { label: 'Risk Premium', apy: 18.0 };
        if (z === 'Bankruptcy') tier = { label: 'Liquidating', apy: 0 };

        if (isSimulating && loan.dailyInterestTier) {
            tier = loan.dailyInterestTier;
        }

        // Buffer Message
        let msg = 'Stable Position';
        if (z === 'Belief') {
            const remaining = Math.max(0, 24 - (timeOffsetHours % 24));
            msg = `Protected by Belief Score. Next review in ${remaining}h.`;
        } else if (z === 'Bankruptcy') {
            msg = "Liq. Imminent!";
        }

        return { ltv, z, tier, msg };
    };

    const { ltv, z, tier, msg } = calculateDisplayStatus();

    // Calculate Cycle Stats for Risk Card
    const cycleStats = isSimulating ? (() => {
        const dayStart = Math.floor((timeOffsetHours - 0.1) / 24) * 24;
        const daySnapshots = loan.history.filter(h => h.t > dayStart && h.t <= timeOffsetHours);
        return {
            healthy: daySnapshots.filter(s => s.z === 'Healthy').length,
            belief: daySnapshots.filter(s => s.z === 'Belief').length,
            bankruptcy: daySnapshots.filter(s => s.z === 'Bankruptcy').length,
            total: daySnapshots.length
        };
    })() : undefined;

    return (
        <div className="loan-card-container">
            {/* Header / ID Badge */}
            <div className="loan-meta-header">
                <div>
                    <span className="lender-label">Lender Pool</span>
                    <span className="lender-name">{loan.lender}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('settle-loan', { detail: { id: loan.id } }))}
                        disabled={loan.isLiquidated}
                        style={{
                            background: loan.isLiquidated ? '#eee' : 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: loan.isLiquidated ? 'not-allowed' : 'pointer',
                        }}
                    >
                        SETTLE LOAN
                    </button>
                    <span className={`status-pill ${loan.isLiquidated ? 'liquidated' : 'active'}`}>
                        {loan.isLiquidated ? 'LIQUIDATED' : 'ACTIVE LOAN'}
                    </span>
                </div>
            </div>

            <div className="loan-widgets-grid">
                <HealthZoneIndicator
                    zone={z}
                    ltv={ltv}
                    apy={tier.apy}
                />

                <AutomatedTimeBuffer
                    message={msg}
                    tierLabel={tier.label}
                />

                <BorrowPositionCard
                    collateral={loan.collateralAmount}
                    debt={loan.borrowedAmount}
                />

                <RiskTransparencyCard
                    cycleStats={cycleStats}
                />
            </div>

            <style>{`
                .loan-card-container {
                    background: var(--bg-secondary); /* Same as card bg, but acts as a container */
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 32px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .loan-meta-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                }
                .lender-label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .lender-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .status-pill {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 20px;
                    letter-spacing: 0.05em;
                }
                .status-pill.active {
                    background: #ecfdf5;
                    color: var(--success);
                    border: 1px solid #d1fae5;
                }
                .status-pill.liquidated {
                    background: #fef2f2;
                    color: var(--error);
                    border: 1px solid #fee2e2;
                }

                .loan-widgets-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }
            `}</style>
        </div>
    );
};

export default LoanCard;
