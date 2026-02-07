import React from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '../constants';

export default function ActivityPage() {
    const client = useSuiClient();
    const account = useCurrentAccount();
    const [events, setEvents] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (!account) return;

        const fetchEvents = async () => {
            try {
                // Query events where the user is the sender (for simplified activity tracking)
                // Filter by Package ID to find Protocol Events
                await client.queryEvents({
                    query: { MoveModule: { package: PACKAGE_ID, module: 'loan_core' } },
                    // Note: 'loan_core' might not emit events natively yet? 
                    // Actually, 'scenario_1_open_loan' is in 'demo_controller'.
                    // And `transfer::share_object` doesn't emit a module event unless we defined one.
                    // The system events `NewObject` are not querying by MoveModule.
                    // 
                    // fallback: Query Transaction Blocks from the user and filter.

                    limit: 20
                });

                // Since our Move code (loan_core) doesn't explicitly emit "LoanCreated" events (I checked the file), 
                // we might not get nice event logs. 
                // We will rely on Transaction Query for now.

                // Actually, let's query transactions by sender = user
                const txs = await client.queryTransactionBlocks({
                    filter: { FromAddress: account.address },
                    options: { showEffects: true, showInput: true, showBalanceChanges: true },
                    limit: 10
                });

                setEvents(txs.data);
            } catch (e) {
                console.error("Activity fetch error", e);
            }
        };

        fetchEvents();
    }, [account, client]);

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'Georgia, serif', marginBottom: '24px' }}>Activity Log</h1>

            <div className="activity-list">
                {events.length === 0 ? (
                    <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                        No recent on-chain activity found.
                    </div>
                ) : (
                    events.map((tx) => (
                        <div key={tx.digest} className="card activity-item" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Transaction</div>
                                <a
                                    href={`https://suiscan.xyz/testnet/tx/${tx.digest}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.85rem', color: '#1a73e8' }}
                                >
                                    {tx.digest.slice(0, 10)}...
                                </a>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className={`status ${tx.effects?.status.status === 'success' ? 'success' : 'failure'}`}>
                                    {tx.effects?.status.status}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                    Epoch: {tx.epoch}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .status.success { color: green; }
                .status.failure { color: red; }
            `}</style>
        </div>
    );
}
