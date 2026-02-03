module belief_lending::interest_model {
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::health_engine;
    use belief_lending::price_oracle_mock::{PriceOracle};

    /// Interest Tiers
    const TIER_LOW: u64 = 1;
    const TIER_NORMAL: u64 = 2;
    const TIER_HIGH: u64 = 3;

    /// Thresholds in percent
    const DROP_THRESHOLD_MODERATE: u64 = 5;
    const DROP_THRESHOLD_HIGH: u64 = 10;

    /// Updates the loan's interest tier based on ETH price movement.
    /// 
    /// Logic:
    /// - If Bankrupt -> STOP updates (Liquidation priority).
    /// - If Change < 5% -> Low.
    /// - If 5% <= Change < 10% -> Normal (Moderate).
    /// - If Change >= 10% -> High.
    public fun update_interest_tier<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        old_price: u64,
        new_price: u64
    ) {
        // 1. Strict Principal Protection: Stop interest updates if Bankrupt.
        //    (The Oracle is already updated to `new_price` by the controller before calling this,
        //     so `is_bankrupt` checks current state).
        if (health_engine::is_bankrupt(loan, oracle)) {
            return
        };

        // 2. Determine Tier based on Price Movement
        let tier = if (new_price >= old_price) {
            // Price increased or stayed same -> Safe Zone -> Low Interest
            TIER_LOW
        } else {
            // Price decreased
            let delta = old_price - new_price;
            let drop_percent = (delta * 100) / old_price;

            if (drop_percent < DROP_THRESHOLD_MODERATE) {
                // < 5% drop -> Safe Zone
                TIER_LOW
            } else if (drop_percent < DROP_THRESHOLD_HIGH) {
                // 5% <= drop < 10% -> Moderate Zone
                TIER_NORMAL
            } else {
                // >= 10% drop -> High Stress Zone
                TIER_HIGH
            }
        };

        loan_core::set_interest_tier(loan, tier);
    }

    /// Accessors for tiers
    public fun tier_low(): u64 { TIER_LOW }
    public fun tier_normal(): u64 { TIER_NORMAL }
    public fun tier_high(): u64 { TIER_HIGH }
}
