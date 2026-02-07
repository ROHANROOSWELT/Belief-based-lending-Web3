import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, MODULE_NAME } from '../constants';
import { BBLService } from '../services/BBLService';
import { useQuery } from '@tanstack/react-query';

export function useCreateLoan() {
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const createLoan = (coinTypeL: string, coinTypeC: string, lenderFunds: string, collateral: string, borrower: string, lender: string) => {
        const tx = new Transaction();

        tx.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::scenario_1_open_loan`,
            typeArguments: [coinTypeL, coinTypeC],
            arguments: [
                tx.object(lenderFunds),
                tx.object(collateral),
                tx.pure.address(borrower),
                tx.pure.address(lender),
            ],
        });

        signAndExecuteTransaction({
            transaction: tx,
        }, {
            onSuccess: (result) => {
                console.log('Loan created:', result);
            },
            onError: (error) => {
                console.error('Error creating loan:', error);
            }
        });
    };

    return { createLoan };
}

export function useLoanState(loanId: string) {
    const client = useSuiClient();
    const service = new BBLService(client);

    return useQuery({
        queryKey: ['loan', loanId],
        queryFn: async () => {
            if (!loanId) return null;
            return await service.getLoanState(loanId);
        },
        enabled: !!loanId
    });
}
