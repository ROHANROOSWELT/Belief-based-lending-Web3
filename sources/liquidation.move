module belief_lending::liquidation {
    // use sui::transfer; // Duplicate
    use sui::coin::{Self};
    use sui::clock::{Clock, timestamp_ms};
    // use sui::tx_context::TxContext; // Duplicate
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::health_engine;
    use belief_lending::belief_window;
    use belief_lending::price_oracle_mock::{PriceOracle};

    /// Error codes
    const ELoanHealthy: u64 = 0;
    const ELoanProtected: u64 = 1; 
    const ELoanSolvent: u64 = 3; // Cannot liquidate if collateral >= debt

    /// Liquidates a loan if it meets the criteria.
    /// 
    /// Policies:
    /// 1. BANKRUPT (CR < 100%) -> Immediate Liquidation.
    /// 2. UNSAFE (100% <= CR < 120%) -> NO LIQUIDATION.
    public fun liquidate_loan<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        let is_bankrupt = health_engine::is_bankrupt(loan, oracle);

        if (is_bankrupt) {
            // Proceed with Liquidation
            let collateral_balance = loan_core::liquidate_collateral(loan);
             
            // Wrap in Coin and send to lender
            let collateral_coin = coin::from_balance(collateral_balance, ctx);
            let lender = loan_core::get_lender(loan);
             
            transfer::public_transfer(collateral_coin, lender);
        } else {
             // If not bankrupt, checks:
             let is_unsafe = health_engine::is_unsafe(loan, oracle);
             if (is_unsafe) {
                 // Unsafe but Solvent -> Protected
                 abort ELoanSolvent
             } else {
                 // Healthy -> Protected
                 abort ELoanHealthy
             }
        }
    }
}
