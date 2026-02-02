module belief_lending::interest_model {
    use belief_lending::loan_core::{Self, LoanObject};

    /// Interest Tiers
    const TIER_LOW: u64 = 1;
    const TIER_NORMAL: u64 = 2;
    const TIER_HIGH: u64 = 3;

    /// Threshold for "Significant" price drop (e.g., 10%).
    /// If new price is < 90% of old price, it's a significant drop.
    const SIGNIFICANT_DROP_PERCENT: u64 = 10;

    /// Updates the loan's interest tier based on ETH price movement.
    /// - `old_price`: Reference price (e.g. from previous update or loan creation).
    /// - `new_price`: Current price from Oracle.
    public fun update_interest_tier<L, C>(
        loan: &mut LoanObject<L, C>,
        old_price: u64,
        new_price: u64
    ) {
        let tier = if (new_price > old_price) {
            // Price increased -> Low Interest
            TIER_LOW
        } else if (new_price == old_price) {
             // No change -> Keep Normal (or current) - equating to Normal for simplicity
            TIER_NORMAL
        } else {
            // Price decreased
            // Check magnitude of drop
            let delta = old_price - new_price;
            let drop_percent = (delta * 100) / old_price;

            if (drop_percent >= SIGNIFICANT_DROP_PERCENT) {
                // > 10% drop -> High Interest
                TIER_HIGH
            } else {
                // Slight drop -> Normal/Slightly Increased (mapping "Slightly Increased" to NORMAL or a mid-tier)
                // Prompt: "ETH price decreases slightly → interest increases slightly"
                // Let's assume TIER_NORMAL is the baseline "slightly increased" from the "low" state of a bull market,
                // or we could add a TIER_MEDIUM.
                // Given 3 tiers usually suffice: Low (Bull), Normal (Bear/Crab), High (Crash).
                TIER_NORMAL
            }
        };

        loan_core::set_interest_tier(loan, tier);
    }

    /// Accessors for tiers (optional, for frontend/demo)
    public fun tier_low(): u64 { TIER_LOW }
    public fun tier_normal(): u64 { TIER_NORMAL }
    public fun tier_high(): u64 { TIER_HIGH }
}
