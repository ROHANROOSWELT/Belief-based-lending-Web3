module belief_lending::recovery_actions {
    use sui::coin::{Self, Coin};
    use sui::clock::{Clock};
    // use sui::transfer; // Duplicate
    // use sui::tx_context::TxContext; // Duplicate
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::belief_window;
    use belief_lending::health_engine;
    use belief_lending::price_oracle_mock::{PriceOracle};

    /// Error codes
    const EBeliefNotActive: u64 = 0;
    const EUnauthorized: u64 = 1; // If we enforce borrower check (prompt says "only borrower")
    const ELoanIsBankrupt: u64 = 2; // Strict Principal Protection

    /// Check if caller is the borrower
    fun check_borrower<L, C>(loan: &LoanObject<L, C>, ctx: &TxContext) {
        assert!(loan_core::get_borrower(loan) == sui::tx_context::sender(ctx), EUnauthorized);
    }

    // --- Actions ---

    /// Borrower adds more collateral to improve LTV.
    public fun add_collateral_action<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        collateral: Coin<C>,
        ctx: &TxContext
    ) {
        check_borrower(loan, ctx);

        // Strict Principal Protection: Cannot recover if Bankrupt.
        assert!(!health_engine::is_bankrupt(loan, oracle), ELoanIsBankrupt);

        // Enforce Belief Window
        assert!(belief_window::is_belief_active(loan, clock), EBeliefNotActive);
        let added_balance = coin::into_balance(collateral);
        loan_core::add_collateral(loan, added_balance);

        // 2. Re-evaluate Health
        check_and_exit_belief(loan, oracle);
    }

    /// Borrower repays part of the debt.
    public fun repay_debt_action<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        payment: Coin<L>,
        ctx: &TxContext
    ) {
        check_borrower(loan, ctx);
        
        // Strict Principal Protection: Cannot recover if Bankrupt.
        assert!(!health_engine::is_bankrupt(loan, oracle), ELoanIsBankrupt);

        assert!(belief_window::is_belief_active(loan, clock), EBeliefNotActive);

        let amount = coin::value(&payment);
        
        // 1. Send funds to Lender
        // We need the lender address. Again, need a getter. `loan_core::get_lender(loan)`.
        // For now, I'll transfer to the stored lender address assuming getter exists.
        // I WILL ADD GETTERS IN THE NEXT STEP.
        let lender = loan_core::get_lender(loan); 
        transfer::public_transfer(payment, lender);

        // 2. Reduce Debt
        loan_core::decrease_borrowed_amount(loan, amount);

        // 3. Re-evaluate Health
        check_and_exit_belief(loan, oracle);
    }

    /// Helper to exit belief if healthy
    fun check_and_exit_belief<L, C>(loan: &mut LoanObject<L, C>, oracle: &PriceOracle) {
        // 0 = Healthy
        if (health_engine::check_health(loan, oracle) == 0) {
            loan_core::set_status(loan, 0); // STATUS_HEALTHY
            loan_core::set_belief_window_expiry(loan, 0);
            loan_core::set_interest_tier(loan, 1); // Reset to Low upon recovery
        }
    }
}
