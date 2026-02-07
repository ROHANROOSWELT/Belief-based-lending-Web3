import React from 'react';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery, useSuiClientContext } from '@mysten/dapp-kit';
import { BBLService } from '../services/BBLService';
import lendersData from '../data/lenders.json';

// "Protocol-Generated Offers" mapped from dynamic JSON
const OFFERS = lendersData;

export default function Marketplace() {
    const client = useSuiClient();
    const ctx = useSuiClientContext();
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const service = new BBLService(client);

    // Auto-refresh balance
    const { data: balanceData, refetch: refetchBalance } = useSuiClientQuery('getBalance', {
        owner: account?.address || '',
    }, {
        enabled: !!account,
    });

    // Form State for "Take Loan"
    const [collateralInput, setCollateralInput] = React.useState('');
    const [borrowInput, setBorrowInput] = React.useState('');

    const handleTakeLoan = async () => {
        if (!account) return alert("Please connect your wallet first.");

        // Network Check
        if (ctx.network !== 'testnet') {
            const proceed = confirm(`Network Mismatch Check:\nYour app is configured for '${ctx.network}', but you need to be on 'testnet' in your wallet.\n\nContinue anyway?`);
            if (!proceed) return;
        }

        const rawBalance = Number(balanceData?.totalBalance || 0);
        // Estimate: Collateral + LenderFunds (Self-Funded) + Gas (~0.02 SUI)
        const collateralMist = Number(collateralInput) * 1_000_000_000;
        const borrowMist = Number(borrowInput) * 1_000_000_000;
        const requiredMist = collateralMist + borrowMist + 20_000_000;

        if (rawBalance < requiredMist) {
            alert(`Insufficient SUI! \n\nRequired: ~${(requiredMist / 1e9).toFixed(2)} SUI \nAvailable: ${(rawBalance / 1e9).toFixed(2)} SUI \n\nNote: For this Testnet Demo, you fund the "Lender" portion yourself.`);
            return;
        }

        try {
            const tx = await service.createTakeLoanTransaction(
                account.address,
                borrowMist,
                collateralMist
            );

            signAndExecute(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log("Loan Executed", result);
                        alert(`Loan Created Successfully!\nDigest: ${result.digest}`);

                        // EXCEL SHEET (Persistent Storage) simulation
                        const demoLoan = {
                            id: result.digest.substr(0, 8),
                            lender: 'Genesis Protocol Pool', // Hardcoded as per single-provider rule
                            borrowedAmount: borrowMist,
                            collateralAmount: collateralMist,
                            status: 'Active',
                            timestamp: Date.now()
                        };
                        localStorage.setItem('bbl-demo-loan', JSON.stringify(demoLoan));

                        // Notify Dashboard live
                        window.dispatchEvent(new CustomEvent('demo-loan-created', { detail: demoLoan }));

                        setCollateralInput('');
                        setBorrowInput('');
                        // Refresh balance immediately
                        setTimeout(() => refetchBalance(), 2000);
                    },
                    onError: (err) => {
                        console.error("Execution Error:", err);
                        // Parse common errors
                        if (err.message.includes("No valid gas coins")) {
                            alert("Transaction Failed: No valid gas coins.\n\nPlease ensure your wallet is on SUI TESTNET and has SUI.");
                        } else if (err.message.includes("Rejected")) {
                            alert("Transaction Rejected by User.");
                        } else {
                            alert("Execution Failed: " + err.message);
                        }
                    }
                }
            );

        } catch (e: any) {
            console.error(e);
            alert("Error constructing transaction: " + e.message);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'Georgia, serif', margin: 0 }}>Loan Offer Marketplace</h1>
                {account && balanceData && (
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Raw Balance: {((Number(balanceData.totalBalance) || 0) / 1_000_000_000).toFixed(2)} SUI
                    </div>
                )}
            </div>

            <div className="offers-grid" style={{ display: 'grid', gap: '24px' }}>
                {OFFERS.map((offer: any) => (
                    <div key={offer.id} className="card offer-card">
                        <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3>{offer.name}</h3>
                            <span className="badge" style={{ background: '#e0f2f1', color: '#00695c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                Verified
                            </span>
                        </header>

                        <div className="offer-details" style={{ margin: '16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div>
                                <label className="label" style={{ color: '#2e7d32' }}>Healthy APY</label>
                                <div className="value" style={{ color: '#2e7d32' }}>{offer.baseApy}</div>
                            </div>
                            <div>
                                <label className="label" style={{ color: '#f9a825' }}>Belief APY</label>
                                <div className="value" style={{ color: '#f9a825' }}>{offer.beliefApy}</div>
                            </div>
                            <div>
                                <label className="label">Liquidity</label>
                                <div className="value">{offer.liquidity.toLocaleString()} SUI</div>
                            </div>
                            <div style={{ gridColumn: 'span 3', marginTop: '8px' }}>
                                <label className="label">Terms</label>
                                <div className="value" style={{ fontSize: '0.9rem', color: '#555' }}>
                                    {offer.terms || "Standard Protocol Terms"}
                                </div>
                            </div>
                        </div>

                        <div className="action-area" style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
                                    I want to borrow (SUI)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter Amount"
                                    value={borrowInput}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setBorrowInput(val);
                                        // Auto-calculate Collateral at 150% LTV
                                        if (val) {
                                            const required = (Number(val) * 1.5).toFixed(2);
                                            setCollateralInput(required);
                                        } else {
                                            setCollateralInput('');
                                        }
                                    }}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                <span style={{ color: '#666', fontSize: '0.9rem' }}>Required Collateral (150% LTV)</span>
                                <span style={{ fontWeight: 'bold' }}>{collateralInput ? `${collateralInput} SUI` : '---'}</span>
                            </div>

                            <button
                                className="primary-button"
                                onClick={handleTakeLoan}
                                style={{ width: '100%', padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: borrowInput ? 1 : 0.6 }}
                                disabled={!borrowInput}
                            >
                                Take Loan (On-Chain)
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: #888;
                    display: block;
                    margin-bottom: 4px;
                }
                .value {
                    font-weight: 500;
                    font-size: 1rem;
                }
                .offers-grid {
                    /* Grid Layout */
                }
            `}</style>
        </div>
    );
}
