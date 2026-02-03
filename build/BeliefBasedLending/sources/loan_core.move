module belief_lending::loan_core {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    // use sui::transfer; // Automatic in Move 2024
    // use sui::clock::{Self, Clock}; // Automatic? No, but maybe Self/Clock alias issues.
    // Check warnings: "Unused 'use' of alias 'clock'", "Unused 'use' of alias 'Clock'".
    // Wait, if they are unused, I should remove them.
    // But I use `clock::timestamp_ms`? No, loan_core uses `BeliefWindow`?
    // loan_core does NOT use clock actually. It only has `belief_window_expiry` as u64.
    // So remove clock entirely.


    /// Error codes
    const ELoanAmountZero: u64 = 0;
    const ECollateralAmountZero: u64 = 1;

    /// Loan Status Constants
    const STATUS_HEALTHY: u8 = 0;
    // const STATUS_BELIEF: u8 = 1; // Unused in this module (only set via function? No, usually mirrored). 
    // Wait, I use STATUS_HEALTHY in create_loan.
    // Do I use STATUS_BELIEF in loan_core?
    // recover_actions uses it. loan_core just stores u8.
    // Accessors use it? 
    // "warning: unused constant STATUS_BELIEF".
    // I will comment it out.
    // const STATUS_BELIEF: u8 = 1; 
    const STATUS_LIQUIDATED: u8 = 2;

    /// The core Loan Object.
    /// Stores the collateral and tracks loan details.
    public struct LoanObject<phantom L, phantom C> has key, store {
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

    /// Reader for collateral amount
    public fun get_collateral_amount<L, C>(loan: &LoanObject<L, C>): u64 {
        balance::value(&loan.collateral)
    }

    /// Reader for borrowed amount
    public fun get_borrowed_amount<L, C>(loan: &LoanObject<L, C>): u64 {
        loan.borrowed_amount
    }

    /// Reader for status
    public fun get_status<L, C>(loan: &LoanObject<L, C>): u8 {
        loan.status
    }

    /// Reader for belief window expiry
    public fun get_belief_window_expiry<L, C>(loan: &LoanObject<L, C>): u64 {
        loan.belief_window_expiry
    }

    /// Reader for borrower
    public fun get_borrower<L, C>(loan: &LoanObject<L, C>): address {
        loan.borrower
    }

    /// Reader for lender
    public fun get_lender<L, C>(loan: &LoanObject<L, C>): address {
        loan.lender
    }

    // --- Package-Only Setters (Status & Belief) ---

    public(package) fun set_status<L, C>(loan: &mut LoanObject<L, C>, new_status: u8) {
        loan.status = new_status;
    }

    public(package) fun set_belief_window_expiry<L, C>(loan: &mut LoanObject<L, C>, expiry: u64) {
        loan.belief_window_expiry = expiry;
    }

    // --- Package-Only Mutators for Recovery ---

    public(package) fun add_collateral<L, C>(loan: &mut LoanObject<L, C>, extra: Balance<C>) {
        balance::join(&mut loan.collateral, extra);
    }

    public(package) fun decrease_borrowed_amount<L, C>(loan: &mut LoanObject<L, C>, amount: u64) {
        loan.borrowed_amount = loan.borrowed_amount - amount;
    }

    // --- Liquidation Helper ---

    public(package) fun liquidate_collateral<L, C>(loan: &mut LoanObject<L, C>): Balance<C> {
        loan.status = STATUS_LIQUIDATED;
        balance::withdraw_all(&mut loan.collateral)
    }
}
