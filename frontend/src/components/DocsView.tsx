export default function DocsView() {
    return (
        <div className="view-container">
            <section className="docs-content">
                <h1>Belief-Based Lending Protocol</h1>
                <p className="subtitle">Documentation & Rules</p>

                <div className="section">
                    <h2>1. Core Philosophy</h2>
                    <p>
                        BBL is designed to prevent panic liquidations. We believe that temporary price dips should not destroy long-term value.
                        Time is treated as a purchasable asset, funded by paying higher interest (Belief).
                    </p>
                </div>

                <div className="section">
                    <h2>2. Health Zones</h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Zone</th>
                                    <th>LTV Range</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span className="dot healthy"></span> Healthy</td>
                                    <td>0% - 83%</td>
                                    <td>Base Interest (4.5%)</td>
                                </tr>
                                <tr>
                                    <td><span className="dot belief"></span> Belief</td>
                                    <td>83% - 100%</td>
                                    <td>Risk Premium (18%)</td>
                                </tr>
                                <tr>
                                    <td><span className="dot bankrupt"></span> Bankruptcy</td>
                                    <td>&gt; 100%</td>
                                    <td>Immediate Liquidation</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="section">
                    <h2>3. Oracle Updates</h2>
                    <p>
                        The protocol samples ETH price every 3 hours. State changes (Zone transitions) only occur on these distinct tick intervals.
                    </p>
                </div>
            </section>

            <style>{`
                .view-container {
                    padding: var(--space-lg);
                    max-width: 800px;
                    margin: 0 auto;
                }
                .docs-content h1 {
                    font-size: 2.5rem;
                    margin-bottom: 8px;
                }
                .subtitle {
                    font-size: 1.2rem;
                    color: var(--text-muted);
                    margin-bottom: var(--space-xl);
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: var(--space-lg);
                }
                .section {
                    margin-bottom: var(--space-xl);
                }
                .section h2 {
                    font-size: 1.5rem;
                    margin-bottom: var(--space-md);
                    color: var(--text-primary);
                }
                .section p {
                    color: var(--text-secondary);
                    line-height: 1.7;
                }
                .table-wrapper {
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: var(--space-md);
                    border: 1px solid var(--border-color);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th {
                    text-align: left;
                    padding: 12px;
                    color: var(--text-muted);
                    border-bottom: 1px solid var(--border-color);
                }
                td {
                    padding: 12px;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--bg-primary);
                }
                .dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                .dot.healthy { background: var(--success); }
                .dot.belief { background: var(--warning); }
                .dot.bankrupt { background: var(--error); }
            `}</style>
        </div>
    );
}
