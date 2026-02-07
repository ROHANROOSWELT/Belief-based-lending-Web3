import { useState, useEffect } from 'react';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { BBLService } from '../services/BBLService';
import type { HealthZone } from '../services/BBLService';
import DemoControls from './DemoControls';
import PriceHistoryGraph from './PriceHistoryGraph';
import LoanCard from './LoanCard';
import type { SimulatedLoan } from './LoanCard';

export default function Dashboard() {
    const client = useSuiClient();
    const account = useCurrentAccount();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const service = new BBLService(client);

    // --- State ---
    const [realPrice, setRealPrice] = useState(0);

    // Multi-Loan State
    const [loans, setLoans] = useState<SimulatedLoan[]>([]);

    // User Request: Simulation ON by default
    const [isSimulating, setIsSimulating] = useState(true);
    const [simPrice, setSimPrice] = useState<number>(2.00);
    const [timeOffsetHours, setTimeOffsetHours] = useState(0);

    // Global Price History (Shared Context)
    const [priceHistory, setPriceHistory] = useState<{ t: number, p: number }[]>([]);

    // --- Wallet Balance ---
    const { data: balanceData } = useSuiClientQuery('getBalance', {
        owner: account?.address || '',
    }, {
        enabled: !!account,
        refetchInterval: 5000
    });

    const balanceSUI = ((Number(balanceData?.totalBalance) || 0) / 1_000_000_000).toFixed(2);

    // --- Derived Values ---
    const ethPrice = isSimulating ? simPrice : realPrice;

    // --- Core Logic ---

    // Helper to calc status for simulation engine (same as LoanCard logic but needed for history)
    const calculateStatus = (price: number, loan: SimulatedLoan) => {
        const collateralVal = loan.collateralAmount * price;
        const debt = loan.borrowedAmount;
        if (debt <= 0) return 'Healthy';
        const ratio = collateralVal / debt;
        if (ratio < 1.0) return 'Bankruptcy';
        if (ratio < 1.2) return 'Belief';
        return 'Healthy';
    };

    const handleSimToggle = (active: boolean) => {
        setIsSimulating(active);
        if (active) {
            const base = 2.00;
            setSimPrice(base);
            setTimeOffsetHours(0);

            // Re-read storage on toggle or clear if not present
            const savedLoan = localStorage.getItem('bbl-demo-loan');
            if (savedLoan) {
                const parsed = JSON.parse(savedLoan);
                const recovered: SimulatedLoan = {
                    id: parsed.id,
                    lender: parsed.lender,
                    borrowedAmount: parsed.borrowedAmount,
                    collateralAmount: parsed.collateralAmount,
                    history: [{ t: 0, p: base, z: 'Healthy' }],
                    isLiquidated: false,
                    dailyInterestTier: null,
                    status: 'Active'
                };
                setLoans([recovered]);
            } else {
                setLoans([]);
            }
            setPriceHistory([{ t: 0, p: base }]);

        } else {
            setPriceHistory([]);
            setLoans([]);
            setTimeOffsetHours(0);
        }
    };

    const addDemoLoan = () => {
        // DEMO RULE: Exactly ONE loan allowed.
        if (loans.length > 0) return;

        const newLoan: SimulatedLoan = {
            id: 'genesis-loan-001',
            lender: 'Genesis Protocol Pool',
            borrowedAmount: 1000 * 1_000_000_000,   // 1 ETH (~$2450)
            collateralAmount: 1500 * 1_000_000_000, // 1.5 ETH (~$3675) -> LTV ~66%
            history: [{ t: timeOffsetHours, p: ethPrice, z: 'Healthy' }],
            isLiquidated: false,
            dailyInterestTier: null,
            status: 'Active'
        };
        // Recalc initial status
        const z = calculateStatus(ethPrice, newLoan);
        newLoan.history[0].z = z;

        setLoans([newLoan]);
    };

    const advanceTime = (hoursToAdd: number) => {
        if (!isSimulating) return;

        let currentP = simPrice;
        let currentT = timeOffsetHours;
        const currentPriceHist = [...priceHistory];

        // Deep copy loans to mutate
        let currentLoans = loans.map(l => ({
            ...l,
            history: [...l.history],
            dailyInterestTier: l.dailyInterestTier ? { ...l.dailyInterestTier } : null
        }));

        const snapshotsNeeded = Math.floor(hoursToAdd / 3);

        for (let i = 0; i < snapshotsNeeded; i++) {
            currentT += 3;
            currentPriceHist.push({ t: currentT, p: currentP });

            // Update EACH loan independently
            currentLoans.forEach(loan => {
                if (loan.isLiquidated) return; // Dead loans stay dead

                const snapZone = calculateStatus(currentP, loan);
                loan.history.push({ t: currentT, p: currentP, z: snapZone });

                // Check Liquidation Rule (Absolute)
                if (snapZone === 'Bankruptcy') {
                    loan.isLiquidated = true;
                    loan.status = 'Liquidated';
                    loan.dailyInterestTier = { label: 'Liquidated', apy: 0 };
                    console.log(`Loan ${loan.id} LIQUIDATED at t=${currentT}`);
                }

                // Check 24h Cycle
                if (!loan.isLiquidated && currentT > 0 && currentT % 24 === 0) {
                    const daySnapshots = loan.history.filter(h => h.t > (currentT - 24) && h.t <= currentT);

                    // If ANY bankruptcy in history -> Liquidate (Catch-up rule)
                    if (daySnapshots.some(s => s.z === 'Bankruptcy')) {
                        loan.isLiquidated = true;
                        loan.status = 'Liquidated';
                        loan.dailyInterestTier = { label: 'Liquidated', apy: 0 };
                    } else {
                        // Majority Rule
                        const healthyCount = daySnapshots.filter(s => s.z === 'Healthy').length;
                        // const beliefCount = daySnapshots.filter(s => s.z === 'Belief').length;

                        let dayVerdict: HealthZone = 'Belief';
                        if (healthyCount >= 5) dayVerdict = 'Healthy';

                        const tier = service.computeInterestTier(dayVerdict);
                        loan.dailyInterestTier = tier;

                        // Trigger Payment (Per Loan)
                        if (tier.apy > 0) {
                            console.log(`Loan ${loan.id}: Paying Interest ${tier.apy}%`);
                            // We only trigger ONE huge wallet popup for usability or loop?
                            // For demo, let's trigger the first active loan's payment to show proof of life
                            // Or just log it. The user wants "Independent Accounting".
                            // Let's TRY to trigger.
                            triggerInterestPayment(tier.apy);
                        }
                    }
                }
            });
        }

        setLoans(currentLoans);
        setPriceHistory(currentPriceHist);
        setTimeOffsetHours(currentT);
    };

    const triggerInterestPayment = async (apy: number) => {
        if (!account?.address) return;
        const amountMist = apy > 5 ? 5000000 : 1000000;
        try {
            const tx = await service.createInterestPaymentTransaction(amountMist);
            signAndExecuteTransaction({ transaction: tx }, {
                onSuccess: (res) => console.log("Interest Paid", res),
                onError: (err) => console.error("Interest Failed", err)
            });
        } catch (e) {
            console.error("Tx Build Fail", e);
        }
    };

    useEffect(() => {
        const fetchLive = async () => {
            try {
                const p = await service.getOraclePrice();
                setRealPrice(p);
            } catch (e) { console.error(e); }
        };
        fetchLive();
        const i = setInterval(fetchLive, 10000);
        return () => clearInterval(i);
    }, [account?.address]);

    // 1. Initialize Simulation on Mount (Run ONCE or when account changes)
    useEffect(() => {
        const savedLoan = localStorage.getItem('bbl-demo-loan');
        if (savedLoan) {
            try {
                const parsed = JSON.parse(savedLoan);
                const recovered: SimulatedLoan = {
                    id: parsed.id,
                    lender: parsed.lender,
                    borrowedAmount: parsed.borrowedAmount,
                    collateralAmount: parsed.collateralAmount,
                    history: [{ t: 0, p: 2.00, z: 'Healthy' }],
                    isLiquidated: false,
                    dailyInterestTier: null,
                    status: 'Active'
                };
                setLoans([recovered]);
                setPriceHistory([{ t: 0, p: 2.00 }]);
                setSimPrice(2.00);
            } catch (e) {
                console.error("Parse Fail", e);
            }
        } else if (isSimulating && priceHistory.length === 0) {
            setPriceHistory([{ t: 0, p: 2.00 }]);
            setSimPrice(2.00);
        }
    }, [account?.address]); // Only run on mount or account switch. NOT on loans change.

    // 2. Event Listeners for Cross-Component Communication
    useEffect(() => {
        // Listen for NEW loans from Borrow Tab
        const handleNewLoan = (e: any) => {
            const data = e.detail;
            const newLoan: SimulatedLoan = {
                id: data.id,
                lender: data.lender,
                borrowedAmount: data.borrowedAmount,
                collateralAmount: data.collateralAmount,
                history: [{ t: 0, p: 2.00, z: 'Healthy' }],
                isLiquidated: false,
                dailyInterestTier: null,
                status: 'Active'
            };
            setLoans([newLoan]);
            setPriceHistory([{ t: 0, p: 2.00 }]);
            setSimPrice(2.00);
            setTimeOffsetHours(0);
        };

        // Clear Storage on Settle
        const handleSettle = async (e: any) => {
            const loanId = e.detail?.id;
            const loanToSettle = loans.find(l => l.id === loanId);

            if (loanToSettle && account?.address) {
                const confirmSettle = confirm(`Confirm Repayment of ~${(loanToSettle.borrowedAmount / 1e9).toFixed(2)} SUI?\n\nThis will transfer funds from your wallet.`);
                if (!confirmSettle) return;

                try {
                    // Create a "Repayment" transaction (Transfer SUI to system sink)
                    const tx = await service.createInterestPaymentTransaction(loanToSettle.borrowedAmount);

                    signAndExecuteTransaction({ transaction: tx }, {
                        onSuccess: (res) => {
                            alert("Loan Repaid Successfully!");
                            setLoans([]);
                            localStorage.removeItem('bbl-demo-loan');
                        },
                        onError: (err) => {
                            console.error("Repayment Failed", err);
                            alert("Repayment Transaction Failed.");
                        }
                    });
                } catch (err) {
                    alert("Failed to build repayment transaction.");
                }
            } else {
                // Fallback for no wallet or instant clear
                setLoans([]);
                localStorage.removeItem('bbl-demo-loan');
            }
        };

        window.addEventListener('settle-loan', handleSettle);
        window.addEventListener('demo-loan-created', handleNewLoan);

        return () => {
            window.removeEventListener('settle-loan', handleSettle);
            window.removeEventListener('demo-loan-created', handleNewLoan);
        };
    }, [loans, account]); // Keep this deps because handleSettle needs latest 'loans' state

    // Reactive Loan Status Update when Price Changes
    useEffect(() => {
        if (loans.length === 0) return;

        setLoans(prevLoans => {
            let hasChanges = false;
            const nextLoans = prevLoans.map(loan => {
                if (loan.isLiquidated) return loan;

                const newStatus = calculateStatus(simPrice, loan); // Use simPrice directly
                let isLiq = false;
                let statusStr = loan.status;
                let tier = loan.dailyInterestTier;

                if (newStatus === 'Bankruptcy') {
                    isLiq = true;
                    statusStr = 'Liquidated';
                    tier = { label: 'Liquidated', apy: 0 };
                    hasChanges = true;
                } else if (newStatus !== 'Healthy' && loan.status === 'Active') {
                    // Just status change?
                    // For now, simpler equality check is hard without deep compare.
                    // But we map anyway.
                }

                // Optimization: If nothing changed, return exact same object ref? 
                // Currently we rebuild object. That's fine for demo scale (1 loan).
                return {
                    ...loan,
                    isLiquidated: isLiq,
                    status: statusStr,
                    dailyInterestTier: tier
                };
            });

            // If we wanted to avoid render loops we could check equality, 
            // but for now simpler is safer for functionality.
            return nextLoans;
        });
    }, [simPrice]); // Only run when simPrice changes

    return (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto' }}>

            {/* Wallet Balance Header */}
            {account && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>Wallet Balance:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{balanceSUI} SUI</span>
                    </div>
                </div>
            )}

            {/* Global Context Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>

                {/* 1. Price Card */}
                <section className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                    <header className="card-header">
                        <h2>Current ETH Price</h2>
                        {isSimulating ? (
                            <div style={{ padding: '4px 12px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                                LIVE
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="pulsing-dot live"></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live</span>
                            </div>
                        )}
                    </header>

                    <div>
                        <div style={{ fontSize: '3.5rem', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
                            ${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </section>

                {/* 2. Graph Card */}
                <section className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                    <header className="card-header" style={{ marginBottom: '16px' }}>
                        <h2>Market Trend</h2>
                        {isSimulating && (
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                                T+{timeOffsetHours}h
                            </span>
                        )}
                    </header>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSimulating ? (
                            <div style={{ width: '100%', height: '100px' }}>
                                <PriceHistoryGraph
                                    data={priceHistory.map(h => ({ timestamp: h.t, price: h.p }))}
                                    color={'#10b981'}
                                />
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Enable Demo Mode to view history
                            </div>
                        )}
                    </div>
                </section>

            </div>

            {/* Loan List */}
            {loans.length > 0 ? (
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--text-primary)' }}>Active Loan Positions</h3>
                    {loans.map(loan => (
                        <LoanCard
                            key={loan.id}
                            loan={loan}
                            currentPrice={ethPrice}
                            timeOffsetHours={timeOffsetHours}
                            isSimulating={isSimulating}
                        />
                    ))}
                </div>
            ) : (
                isSimulating ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No Active Loans. Create a genesis loan to begin.
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Connect Wallet & Enable Simulation to Load Positions.
                    </div>
                )
            )}

            <style>{`
                .pulsing-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
                .pulsing-dot.live { background-color: #10b981; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            `}</style>

            <DemoControls
                price={ethPrice}
                setPrice={setSimPrice}
                timeOffset={timeOffsetHours}
                setTimeOffset={(newOffset) => {
                    if (newOffset > timeOffsetHours) {
                        advanceTime(newOffset - timeOffsetHours);
                    } else {
                        setTimeOffsetHours(newOffset);
                    }
                }}
                reset={() => handleSimToggle(false)}
                isSimulating={isSimulating}
                onToggle={handleSimToggle}
                onAddLoan={addDemoLoan}
                hasActiveLoan={loans.length > 0}
            />
        </div>
    );
}
