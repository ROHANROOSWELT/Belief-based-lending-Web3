module belief_lending::loan_core {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::clock::{Self, Clock};

    /// Error codes
    const ELoanAmountZero: u64 = 0;
    const ECollateralAmountZero: u64 = 1;

    /// Loan Status Constants
    const STATUS_HEALTHY: u8 = 0;
    const STATUS_BELIEF: u8 = 1;
    const STATUS_LIQUIDATED: u8 = 2;

    /// The core Loan Object.
    /// Stores the collateral and tracks loan details.
    struct LoanObject<phantom L, phantom C> has key, store {
        id: UID,
        borrower: address,
        lender: address,
        /// The collateral loaded into the loan.
        collateral: Balance<C>,
        /// The original or tracking borrowed amount (funds were sent to borrower).
        borrowed_amount: u64,
        /// Current status of the loan (Healthy, Belief, Liquidated).
        status: u8,
        /// Dynamic interest tier (managed by price oracle logic later).
        current_interest_tier: u64,
        /// Timestamp (ms) when belief window expires. 0 if not active.
        belief_window_expiry: u64,
    }

    /// Creates a new loan.
    /// - `lender_funds`: The coin provided by the lender (to be sent to borrower).
    /// - `collateral`: The coin provided by the borrower (to be locked).
    /// - `borrower`: The address of the borrower.
    /// - `lender`: The address of the lender.
    /// The `LoanObject` is shared to allow both parties interaction (e.g. repay, liquidate).
    public fun create_loan<L, C>(
        lender_funds: Coin<L>,
        collateral: Coin<C>,
        borrower: address,
        lender: address,
        ctx: &mut TxContext
    ) {
        let borrowed_amount = coin::value(&lender_funds);
        let collateral_amount = coin::value(&collateral);

        assert!(borrowed_amount > 0, ELoanAmountZero);
        assert!(collateral_amount > 0, ECollateralAmountZero);

        // 1. Transfer the funds to the borrower directly.
        transfer::public_transfer(lender_funds, borrower);

        // 2. Wrap collateral into Balance.
        let collateral_balance = coin::into_balance(collateral);

        // 3. Create the LoanObject.
        let loan = LoanObject<L, C> {
            id: object::new(ctx),
            borrower,
            lender,
            collateral: collateral_balance,
            borrowed_amount,
            status: STATUS_HEALTHY,
            current_interest_tier: 0, // Initial tier
            belief_window_expiry: 0,
        };

        // 4. Share the object so both borrower and lender can interact with it.
        //    (e.g. Borrower interacts to Repay, Lender interacts to Liquidate/Update Belief)
        transfer::share_object(loan);
    }

    /// Updates the interest tier.
    /// Restricted to `public(package)` so only authorized modules in the same package (like interest_model) can call it.
    public(package) fun set_interest_tier<L, C>(loan: &mut LoanObject<L, C>, tier: u64) {
        loan.current_interest_tier = tier;
    }
}
