module belief_lending::demo_controller {
    // use sui::coin::{Self, Coin}; // Warning: Unused 'use' of alias 'coin'. 
    // Wait, I use Coin<L>. So keep `Coin`, but maybe `coin` alias is unused.
    use sui::coin::{Coin}; 
    use sui::clock::{Clock};
    // use sui::tx_context::{Self, TxContext}; // Duplicate TxContext.
    // I use `ctx: &mut TxContext`.
    // I likely need `sui::tx_context`.
    // Move 2024 provides `TxContext`?
    // The warning says "Unnecessary alias 'TxContext'".
    // So I can remove the explicit use if it's implicit, or just `use sui::tx_context;`.
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::price_oracle_mock::{Self, PriceOracle};
    use belief_lending::interest_model;
    use belief_lending::health_engine;
    use belief_lending::belief_window;
    use belief_lending::recovery_actions;
    use belief_lending::liquidation;

    /// Scenario 1: Open a new Loan
    /// Wraps loan_core::create_loan
    public fun scenario_1_open_loan<L, C>(
        lender_funds: Coin<L>,
        collateral: Coin<C>,
        borrower: address,
        lender: address,
        ctx: &mut TxContext
    ) {
        loan_core::create_loan(lender_funds, collateral, borrower, lender, ctx);
    }

    /// Scenario 2: Market Crash Simulation
    /// 1. Updates Oracle Price.
    /// 2. Updates Interest Tier based on drop.
    /// 3. Checks Health & Enters Belief Window if Unsafe.
    public fun scenario_2_market_crash<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &mut PriceOracle,
        clock: &Clock,
        new_price: u64
    ) {
        // 1. Capture old price for interest model
        let old_price = price_oracle_mock::price(oracle);

        // 2. Update Oracle
        price_oracle_mock::set_price(oracle, new_price);

        // 3. Update Interest Model
        interest_model::update_interest_tier(loan, oracle, old_price, new_price);

        // 4. Check Health & Belief
        // If unsafe and not bankrupt, try to enter belief window.
        if (health_engine::is_unsafe(loan, oracle) && !health_engine::is_bankrupt(loan, oracle)) {
            // Only enter if not already active to avoid error
            if (!belief_window::is_belief_active(loan, clock)) {
                // If expiry is 0, we can enter. 
                // Note: logic in belief_window ensures one-time entry per unsafe event essentially,
                // or refreshes? `enter_belief_window` sets expiry to now + duration.
                // We just call it.
                // However, `enter_belief_window` asserts `!belief_active`.
                // We checked that above.
                belief_window::enter_belief_window(loan, oracle, clock);
            }
        }
    }

    /// Scenario 3: Recovery
    /// Borrower adds collateral to save the loan.
    public fun scenario_3_recovery_add_collateral<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        collateral: Coin<C>,
        ctx: &TxContext
    ) {
        recovery_actions::add_collateral_action(loan, oracle, clock, collateral, ctx);
    }

    /// Scenario 3b: Recovery
    /// Borrower repays debt.
    public fun scenario_3_recovery_repay<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        payment: Coin<L>,
        ctx: &TxContext
    ) {
        recovery_actions::repay_debt_action(loan, oracle, clock, payment, ctx);
    }

    /// Scenario 4: Liquidation
    /// Tries to liquidate. Will abort if protected.
    public fun scenario_4_liquidation<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        liquidation::liquidate_loan(loan, oracle, clock, ctx);
    }

    /// Helper: Get full status for UI/Demo
    /// Returns: (Status, Interest Tier, Health Status (0=Healthy, 1=Unsafe, 2=Bankrupt), Belief Active?)
    public fun check_status_full<L, C>(
        loan: &LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock
    ): (u8, u64, u8, bool) {
        let status = loan_core::get_status(loan);
        let tier = loan_core::get_interest_tier(loan);
        
        let health = health_engine::check_health(loan, oracle);
        let belief_active = belief_window::is_belief_active(loan, clock);

        (status, tier, health, belief_active)
    }
}
