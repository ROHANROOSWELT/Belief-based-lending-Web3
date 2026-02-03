module belief_lending::liquidation {
    use sui::transfer;
    use sui::coin::{Self};
    use sui::clock::{Clock, timestamp_ms};
    use sui::tx_context::TxContext;
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::health_engine;
    use belief_lending::belief_window;
    use belief_lending::price_oracle_mock::{PriceOracle};

    /// Error codes
    const ELoanHealthy: u64 = 0;
    const ELoanProtected: u64 = 1; // Protected by belief window
    const EBeliefNotTriggered: u64 = 2; // Should have entered belief first but didn't (or expiry issue)

    /// Liquidates a loan if it meets the criteria.
    /// 
    /// Paths:
    /// 1. BANKRUPT -> Immediate Liquidation.
    /// 2. UNSAFE + BELIEF EXPIRED -> Delayed Liquidation.
    /// 
    /// Protected:
    /// - Healthy loans.
    /// - Unsafe loans within active Belief Window.
    public fun liquidate_loan<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let is_bankrupt = health_engine::is_bankrupt(loan, oracle);
        let is_unsafe = health_engine::is_unsafe(loan, oracle);

        let proceed = if (is_bankrupt) {
            // Path 1: Immediate Bankruptcy
            true
        } else if (is_unsafe) {
            // Path 2: Unsafe check
            if (belief_window::is_belief_active(loan, clock)) {
                abort ELoanProtected
            };

            // Check if belief window has expired or was never set properly?
            // If it's unsafe and NOT belief active, there are two cases:
            // a) Belief window expired.
            // b) Belief window never entered (expiry is 0).
            // Prompt says: "if belief window expired".
            // If expiry is 0, it means it never entered belief. 
            // Should we force `enter_belief_window` first? 
            // In a strict implementation, yes. But if it's unsafe and not in belief, 
            // practically it means "belief window opportunity is gone or wasn't taken". 
            // However, "eligible for belief window" implies it *should* go there first.
            // BUT, if I am a liquidator, I want to liquidate. 
            // If I try to liquidate a loan that just became unsafe, `is_belief_active` is false (expiry 0).
            // Should I be allowed to liquidate immediately? No, that defeats the purpose ("Prevent panic liquidations").
            // So: If expiry is 0, we must abort and say "Must Enter Belief First" or similar?
            
            let expiry = loan_core::get_belief_window_expiry(loan);
            let now = timestamp_ms(clock);
            
            if (expiry == 0) {
                 // It hasn't entered belief window yet, so it's technically eligible for belief, not liquidation. 
                 // Unless we allow auto-entry? No, 'enter_belief' is separate.
                 // So we abort. The loan must enter belief state first.
                 abort EBeliefNotTriggered
            };
            
            // If expiry > 0, and `is_belief_active` is false, it means `now >= expiry`.
            // So we proceed.
            true
        } else {
            // Healthy
            abort ELoanHealthy
        };

        if (proceed) {
             // Perform Liquidation
             let collateral_balance = loan_core::liquidate_collateral(loan);
             
             // Wrap in Coin and send to lender
             let collateral_coin = coin::from_balance(collateral_balance, ctx);
             let lender = loan_core::get_lender(loan);
             
             transfer::public_transfer(collateral_coin, lender);
        }
    }
}
