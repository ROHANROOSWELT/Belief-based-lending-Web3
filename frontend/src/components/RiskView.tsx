import RiskTransparencyCard from './RiskTransparencyCard';

export default function RiskView() {
    return (
        <div className="view-container">
            <header className="view-header">
                <h1>Risk & Safety</h1>
                <p>Understand how the protocol protects your position.</p>
            </header>

            <div className="risk-grid">
                <RiskTransparencyCard />

                <section className="card">
                    <header className="card-header">
                        <h2>Belief Window Mechanics</h2>
                    </header>
                    <div className="text-content">
                        <p>
                            The <strong>Belief Window</strong> is a time-based safety mechanism. When your LTV rises above 83%, you enter the Belief Zone.
                        </p>
                        <ul className="risk-list">
                            <li>You are <strong>NOT liquidated</strong> immediately.</li>
                            <li>You pay a <strong>Risk Premium</strong> interest rate.</li>
                            <li>The window gives you time to add collateral or repay debt.</li>
                            <li>Liquidation only happens if you reach <strong>Insolvency (100% LTV)</strong>.</li>
                        </ul>
                    </div>
                </section>
            </div>

            <style>{`
                .view-container {
                    padding: var(--space-md);
                    max-width: 800px;
                    margin: 0 auto;
                }
                .view-header {
                    margin-bottom: var(--space-xl);
                }
                .risk-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                }
                .risk-list {
                    padding-left: 20px;
                    margin-top: 16px;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }
                .risk-list li {
                    margin-bottom: 8px;
                }
                .text-content p {
                    color: var(--text-primary);
                    line-height: 1.6;
                }
            `}</style>
        </div>
    );
}
