module belief_lending::health_engine {
    use sui::balance;
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::price_oracle_mock::{Self, PriceOracle};

    /// Error codes
    const EZeroPrice: u64 = 0;

    /// Collateralization Thresholds (in percentages)
    /// 120% - Below this, loan is "Unsafe" (Belief Window eligible)
    const THRESHOLD_UNSAFE: u64 = 120;
    /// 110% - Below this, loan is "Bankrupt" (Immediate Liquidation)
    const THRESHOLD_BANKRUPT: u64 = 110;

    /// Scaling factor for precision (e.g., 2 decimals for percentages).
    /// If we use simple integers 120 and 110, we treat them as direct percentages.
    const SCALING_FACTOR: u128 = 100;

    /// Status constants from loan_core (mirrored or returned directly)
    const STATUS_HEALTHY: u8 = 0;
    const STATUS_BELIEF: u8 = 1;
    const STATUS_LIQUIDATED: u8 = 2; // Not strictly used here, but for context.
    const STATUS_BANKRUPT_SIGNAL: u8 = 3; // Internal signal for this module

    // --- Core Logic ---

    /// Checks the health status of a loan.
    /// Returns:
    /// 0 -> Healthy
    /// 1 -> Unsafe (Needs Belief Window)
    /// 2 -> Bankrupt (Needs Liquidation)
    public fun check_health<L, C>(
        loan: &LoanObject<L, C>,
        oracle: &PriceOracle
    ): u8 {
        let current_price = price_oracle_mock::price(oracle);
        assert!(current_price > 0, EZeroPrice);

        let collateral_amount = loan_core::get_collateral_amount(loan);
        let borrowed_amount = loan_core::get_borrowed_amount(loan);
        
        if (borrowed_amount == 0) {
            return 0 // Healthy if no debt
        };

        // Calculate Collateral Value in USD
        // Formula: collateral_amount * price
        // Note: Assuming collateral_amount is in base units and price is per full unit.
        // We might need to adjust for decimals if they differ, but for this mock:
        // Value = amount * price.
        
        // We'll use u128 to prevent overflow during multiplication
        let collateral_val = (collateral_amount as u128) * (current_price as u128);
        let debt_val = (borrowed_amount as u128);

        // Calculate Collateralization Ratio (CR) % = (Collateral Value / Debt Value) * 100
        let cr = (collateral_val * SCALING_FACTOR) / debt_val;

        if (cr < (THRESHOLD_BANKRUPT as u128)) {
            return 2 // Bankrupt
        } else if (cr < (THRESHOLD_UNSAFE as u128)) {
            return 1 // Unsafe
        } else {
            return 0 // Healthy
        }
    }

    /// Public helper checks
    public fun is_unsafe<L, C>(loan: &LoanObject<L, C>, oracle: &PriceOracle): bool {
        check_health(loan, oracle) == 1
    }

    public fun is_bankrupt<L, C>(loan: &LoanObject<L, C>, oracle: &PriceOracle): bool {
        check_health(loan, oracle) == 2
    }

    /// Expose collateral value calculation separately if needed
    public fun calculate_collateral_value<C>(
        collateral_amount: u64,
        oracle: &PriceOracle
    ): u64 {
        let price = price_oracle_mock::price(oracle);
        // Return raw value (mock logic: straightforward multiplication)
        // Ensure to handle potential overflow in real apps, here we return u64 
        // but internal calc used u128. If value > u64::MAX, this might abort.
        // For the mock, we assume it fits.
        collateral_amount * price
    }
}
