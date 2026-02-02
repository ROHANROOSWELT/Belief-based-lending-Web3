module belief_lending::price_oracle_mock {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    /// The mock Price Oracle object.
    /// Acts as the single source of truth for the protocol's ETH price.
    struct PriceOracle has key, store {
        id: UID,
        /// Price of ETH in USD (scaled, e.g., 2 decimals implied or raw).
        /// For simple demo logic, we can treat this as integer USD.
        price: u64
    }

    /// Function to initialize the oracle.
    /// This is a one-time setup called on module publish.
    fun init(ctx: &mut TxContext) {
        let oracle = PriceOracle {
            id: object::new(ctx),
            price: 3000, // Initial price: $3000
        };
        transfer::share_object(oracle);
    }

    /// Read the current ETH price.
    public fun price(oracle: &PriceOracle): u64 {
        oracle.price
    }

    /// Updates the price.
    /// Allows valid simulation of:
    /// - Price Increase
    /// - Mild Decrease
    /// - Severe Decrease
    /// marked as public to be accessible by the demo controller.
    public fun set_price(oracle: &mut PriceOracle, new_price: u64) {
        oracle.price = new_price;
    }
}
