import { SuiJsonRpcClient as SuiClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, PRICE_ORACLE_ID, MODULE_NAME, CLOCK_ID } from '../constants';

export interface LoanState {
    id: string;
    borrower: string;
    lender: string;
    collateralAmount: number;
    borrowedAmount: number;
    status: 'Healthy' | 'Belief' | 'Liquidated';
    interestTier: number;
    beliefWindowExpiry: number;
}

export type HealthZone = 'Healthy' | 'Belief' | 'Bankruptcy';

export class BBLService {
    private client: SuiClient;

    constructor(client: SuiClient) {
        this.client = client;
    }

    // --- On-Chain Read Logic ---

    async getOraclePrice(): Promise<number> {
        try {
            const obj = await this.client.getObject({
                id: PRICE_ORACLE_ID,
                options: { showContent: true }
            });

            if (obj.data?.content?.dataType === 'moveObject') {
                const fields = obj.data.content.fields as any;
                // Move MockOracle stores 'price' as u64
                return Number(fields.price);
            }
            return 0;
        } catch (e) {
            console.error("Failed to fetch price oracle:", e);
            throw e;
        }
    }

    // "Get Loans" - In a real app we'd use an Indexer. 
    // For this self-funded demo, we can try to find objects owned by the user.
    // However, LoanObject is SHARED. 
    // We will create a helper to "find active loan" by scanning recent transactions or events if possible.
    // BUT for V1 simplicity/reliability without an indexer, we might return empty array or implementing an Event Subscriber later.
    // Let's implement a 'getSharedLoans' fallback if we can, but likely we need the user to "Import" the loan ID or just take a new loan.
    // For now, return empty array to avoid errors, dashboard will show empty state.
    async getLoans(_ownerAddress: string): Promise<LoanState[]> {
        // Placeholder: Finding shared objects by owner is hard without indexer.
        // We will implement this properly in Activity Page via Events.
        return [];
    }

    async getLoanState(loanId: string): Promise<LoanState> {
        try {
            const obj = await this.client.getObject({
                id: loanId,
                options: { showContent: true }
            });

            if (obj.data?.content?.dataType !== 'moveObject') {
                throw new Error("Invalid Object");
            }

            const fields = obj.data.content.fields as any;
            const statusMap = ['Healthy', 'Belief', 'Liquidated'];

            return {
                id: obj.data.objectId,
                borrower: fields.borrower,
                lender: fields.lender,
                collateralAmount: Number(fields.collateral),
                borrowedAmount: Number(fields.borrowed_amount),
                status: statusMap[fields.status] as any,
                interestTier: Number(fields.current_interest_tier),
                beliefWindowExpiry: Number(fields.belief_window_expiry)
            };
        } catch (e) {
            console.warn("Retrying fetch or invalid loan ID", loanId);
            throw e;
        }
    }

    // --- Write Logic (Transactions) ---

    // Scenario 1: Open a new Loan (Self-Funded for Demo)
    async createTakeLoanTransaction(
        borrowerAddress: string,
        // Amounts in MIST/raw units
        lenderFundsAmount: number,
        collateralAmount: number
    ): Promise<Transaction> {
        const tx = new Transaction();
        const COIN_TYPE = '0x2::sui::SUI';

        // Split Collateral
        const [collateralCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(collateralAmount)]);

        // Split Lender Funds
        const [lenderFundsCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(lenderFundsAmount)]);

        tx.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::scenario_1_open_loan`,
            typeArguments: [COIN_TYPE, COIN_TYPE],
            arguments: [
                lenderFundsCoin,
                collateralCoin,
                tx.pure.address(borrowerAddress), // borrower
                tx.pure.address(borrowerAddress), // lender (self)
            ],
        });

        return tx;
    }

    async createRepayTransaction(
        loanId: string,
        amount: number
    ): Promise<Transaction> {
        const tx = new Transaction();
        const COIN_TYPE = '0x2::sui::SUI';

        const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

        tx.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::scenario_3_recovery_repay`,
            typeArguments: [COIN_TYPE, COIN_TYPE],
            arguments: [
                tx.object(loanId),
                tx.object(PRICE_ORACLE_ID),
                tx.object(CLOCK_ID),
                paymentCoin
            ]
        });

        return tx;
    }

    // --- Demo Only: Real Interest Deduction ---
    async createInterestPaymentTransaction(amountMist: number): Promise<Transaction> {
        const tx = new Transaction();
        // Simply transfer SUI to a burn address or treasury to simulate interest payment
        // We use 0x0...1 (System) or similar as a sink for the demo
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
        tx.transferObjects([coin], tx.pure.address('0x0000000000000000000000000000000000000000000000000000000000000000'));
        return tx;
    }

    // --- Computations ---

    computeHealthZone(collateralValue: number, debt: number): HealthZone {
        if (debt === 0) return 'Healthy';
        const collateralRatio = collateralValue / debt;
        if (collateralRatio >= 1.2) return 'Healthy';
        if (collateralRatio >= 1.0) return 'Belief';
        return 'Bankruptcy';
    }

    computeInterestTier(zone: HealthZone): { label: string; apy: number } {
        // Match Real Protocol Config (could fetch this too)
        switch (zone) {
            case 'Healthy': return { label: 'Base Rate', apy: 4.5 };
            case 'Belief': return { label: 'Risk Premium', apy: 18.0 };
            case 'Bankruptcy': return { label: 'Liquidating', apy: 0 };
        }
    }

    computeTimeBufferMessage(zone: HealthZone): string {
        switch (zone) {
            case 'Healthy': return 'Stable Position';
            case 'Belief': return 'Protected by Belief Score';
            case 'Bankruptcy': return 'Insolvent - Liquidation Imminent';
        }
    }
}
