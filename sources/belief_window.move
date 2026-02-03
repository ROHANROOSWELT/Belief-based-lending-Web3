module belief_lending::belief_window {
    use sui::clock::{Self, Clock};
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::price_oracle_mock::{PriceOracle};
    use belief_lending::health_engine;

    /// Error codes
    const ELoanNotUnsafe: u64 = 0;
    const ELoanIsBankrupt: u64 = 1;
    const EBeliefAlreadyActive: u64 = 2; // Fixed incorrect usage in plan (EBeliefActive -> EBeliefAlreadyActive)

    /// Constants
    const BELIEF_DURATION_MS: u64 = 30000; // 30 seconds for demo/testing purposes
    
    // Status constants mirrored from loan_core
    const STATUS_HEALTHY: u8 = 0;
    const STATUS_BELIEF: u8 = 1;
    const STATUS_LIQUIDATED: u8 = 2;

    /// Checks if the belief window is currently active for a loan.
    /// Active means: Status is BELIEF AND Current Time < Expiry.
    public fun is_belief_active<L, C>(loan: &LoanObject<L, C>, clock: &Clock): bool {
        let status = loan_core::get_status(loan);
        let expiry = loan_core::get_belief_window_expiry(loan);
        let now = clock::timestamp_ms(clock);

        status == STATUS_BELIEF && now < expiry
    }

    /// Attempts to trigger the Belief Window for a loan.
    /// 
    /// Preconditions:
    /// - Loan must be UNSAFE (Health Engine says unsafe).
    /// - Loan must NOT be BANKRUPT (Health Engine says bankrupt).
    /// - Loan must NOT already be in Belief Window.
    /// 
    /// Effect:
    /// - Sets status to STATUS_BELIEF.
    /// - Sets expiry to NOW + BELIEF_DURATION_MS.
    public fun enter_belief_window<L, C>(
        loan: &mut LoanObject<L, C>,
        oracle: &PriceOracle,
        clock: &Clock
    ) {
        // 1. Check Health (Unsafe = true, Bankrupt = false)
        let is_unsafe = health_engine::is_unsafe(loan, oracle);
        let is_bankrupt = health_engine::is_bankrupt(loan, oracle);

        assert!(is_unsafe, ELoanNotUnsafe);
        assert!(!is_bankrupt, ELoanIsBankrupt);

        // 2. Check current status
        let current_status = loan_core::get_status(loan);
        // If already in belief, we might want to extend or error. 
        // For simplicity, if it's already belief, we error to avoid redundant calls or define specific extension logic.
        assert!(current_status != STATUS_BELIEF, EBeliefAlreadyActive);

        // 3. Activate Belief Window
        let now = clock::timestamp_ms(clock);
        let valid_until = now + BELIEF_DURATION_MS;

        loan_core::set_status(loan, STATUS_BELIEF);
        loan_core::set_belief_window_expiry(loan, valid_until);
    }
}
