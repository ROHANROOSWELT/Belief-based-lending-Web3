#[test_only]
module belief_lending::tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::sui::SUI; 
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::price_oracle_mock::{Self, PriceOracle};
    use belief_lending::health_engine;
    use belief_lending::belief_window;
    use belief_lending::recovery_actions;
    use belief_lending::liquidation;
    use belief_lending::demo_controller;

    // --- Test Types ---
    public struct BTC {}
    public struct USDC {}

    // --- Constants ---
    const ADMIN: address = @0xA;
    const BORROWER: address = @0xB;
    const LENDER: address = @0xC;
    const LIQUIDATOR: address = @0xD;

    // Initial Setup Values
    const PRICE_BTC: u64 = 60000;
    const COLLATERAL_AMOUNT: u64 = 10; // 10 BTC
    const BORROW_AMOUNT: u64 = 300000; // 300k USDC => 50% LTV initially (600k val / 300k debt)

    // --- Helpers ---

    fun setup_test(ctx: &mut Scenario): (Clock, PriceOracle) {
        let clock = clock::create_for_testing(test_scenario::ctx(ctx));
        let oracle = price_oracle_mock::create_for_testing(PRICE_BTC, test_scenario::ctx(ctx));
        (clock, oracle)
    }

    fun create_loan_helper(scenario: &mut Scenario, _clock: &Clock) {
        let ctx = test_scenario::ctx(scenario);
        
        let bTC_coin = coin::mint_for_testing<BTC>(COLLATERAL_AMOUNT, ctx);
        let uSDC_coin = coin::mint_for_testing<USDC>(BORROW_AMOUNT, ctx);

        demo_controller::scenario_1_open_loan(
            uSDC_coin,
            bTC_coin,
            BORROWER,
            LENDER,
            ctx
        );
    }

    fun cleanup(scenario: Scenario, clock: Clock, oracle: PriceOracle) {
        clock::destroy_for_testing(clock);
        price_oracle_mock::destroy_for_testing(oracle);
        test_scenario::end(scenario);
    }

    // --- C. Belief Window Core Tests ---

    #[test]
    fun test_unsafe_enters_belief() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        
        // 1. Open Loan
        create_loan_helper(&mut scenario, &clock);
        test_scenario::next_tx(&mut scenario, BORROWER);

        // 2. Drop price to make it UNSAFE (CR < 120%) but NOT BANKRUPT (CR >= 110%)
        // Initial: 10 BTC * 60k = 600k. Debt = 300k. CR = 200%.
        // Target CR = 115%. 
        // 1.15 = (10 * P) / 300k  => P = (1.15 * 300k)/10 = 34500.
        price_oracle_mock::set_price(&mut oracle, 34500);

        // Retrieve Loan
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        // Assert Unsafe
        assert!(health_engine::is_unsafe(&loan, &oracle), 0);
        assert!(!health_engine::is_bankrupt(&loan, &oracle), 0);

        // 3. Enter Belief Window
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);

        // 4. Verify Active
        assert!(belief_window::is_belief_active(&loan, &clock), 1);
        
        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    fun test_belief_expiry_set() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        // Drop price to 34500 (Unsafe)
        price_oracle_mock::set_price(&mut oracle, 34500);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        // Capture start time
        let start_time = clock::timestamp_ms(&clock);
        
        // Enter Belief
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);

        let expiry = loan_core::get_belief_window_expiry(&loan);
        // Duration is 30000ms
        assert!(expiry == start_time + 30000, 0);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    fun test_belief_remains_active_before_expiry() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        // Advance time by 29 seconds
        clock::increment_for_testing(&mut clock, 29000);
        
        assert!(belief_window::is_belief_active(&loan, &clock), 0);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    #[expected_failure(abort_code = belief_window::EBeliefAlreadyActive)]
    fun test_cannot_reenter_belief_while_active() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        // Fail here
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    // --- D. Liquidation Protection Tests ---

    #[test]
    #[expected_failure(abort_code = liquidation::ELoanProtected)]
    fun test_liquidation_blocked_during_belief() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500); // Unsafe
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        // Enter Belief
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        // Try Liquidate immediately
        let ctx = test_scenario::ctx(&mut scenario); // Hack to get ctx
        liquidation::liquidate_loan(&mut loan, &oracle, &clock, ctx);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    #[expected_failure(abort_code = liquidation::ELoanHealthy)]
    fun test_liquidation_blocked_healthy() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        test_scenario::next_tx(&mut scenario, LIQUIDATOR);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        let ctx = test_scenario::ctx(&mut scenario);
        liquidation::liquidate_loan(&mut loan, &oracle, &clock, ctx);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    fun test_liquidation_allowed_after_expiry() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500); // Unsafe
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        // Enter Belief
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        // Fast forward 31 seconds (Expired)
        clock::increment_for_testing(&mut clock, 31000);
        
        // Liquidate
        let ctx = test_scenario::ctx(&mut scenario);
        liquidation::liquidate_loan(&mut loan, &oracle, &clock, ctx);

        // Verify Status Liquidated
        assert!(loan_core::get_status(&loan) == 2, 0); // 2 = Liquidated

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    // --- E. Recovery Action Tests ---

    #[test]
    fun test_recovery_add_collateral() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500); // Unsafe
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        // Prepare extra collateral
        let extra_collateral = coin::mint_for_testing<BTC>(5, test_scenario::ctx(&mut scenario)); // Add 5 BTC => Total 15
        
        recovery_actions::add_collateral_action(
            &mut loan, 
            &oracle, 
            &clock, 
            extra_collateral, 
            test_scenario::ctx(&mut scenario)
        );

        // Check if collateral increased
        assert!(loan_core::get_collateral_amount(&loan) == 15, 0);
        
        // Check if healthy again?
        // New Collateral = 15. Debt = 300k. Price = 34500.
        // Val = 15 * 34500 = 517500.
        // CR = 517500 / 300000 = 1.725 (172.5%). Healthy!
        // Should exit belief automatically.
        assert!(!belief_window::is_belief_active(&loan, &clock), 1);
        assert!(loan_core::get_status(&loan) == 0, 2); // Healthy

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    fun test_recovery_repay_debt() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500); // Unsafe
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        // Prepare repayment
        // Original Debt 300k. CR ~ 115%.
        // Repay 50k. New Debt 250k.
        // Val = 345000. CR = 345k/250k = 1.38 (138%). Healthy.
        let repayment = coin::mint_for_testing<USDC>(50000, test_scenario::ctx(&mut scenario));
        
        recovery_actions::repay_debt_action(
            &mut loan,
            &oracle,
            &clock,
            repayment,
            test_scenario::ctx(&mut scenario)
        );

        assert!(loan_core::get_borrowed_amount(&loan) == 250000, 0);
        assert!(loan_core::get_status(&loan) == 0, 1); // Healthy

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    #[expected_failure(abort_code = recovery_actions::EBeliefNotActive)]
    fun test_recovery_rejected_after_expiry() {
        // Technically this checks "NotActive". 
        // If expired, `is_belief_active` returns false.
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        price_oracle_mock::set_price(&mut oracle, 34500);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        
        clock::increment_for_testing(&mut clock, 31000); // Expired
        
        let repayment = coin::mint_for_testing<USDC>(50000, test_scenario::ctx(&mut scenario));
        recovery_actions::repay_debt_action(
            &mut loan,
            &oracle,
            &clock,
            repayment,
            test_scenario::ctx(&mut scenario)
        );

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    // --- G. Safety & Abuse Tests ---

    #[test]
    #[expected_failure(abort_code = recovery_actions::ELoanIsBankrupt)]
    fun test_cannot_recover_bankrupt_loan() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);
        
        // 1. Enter belief first (standard path)
        price_oracle_mock::set_price(&mut oracle, 34500);
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);
        test_scenario::return_shared(loan);

        // 2. Crash to Bankruptcy
        // CR < 110%. Target 100% -> Price 30000.
        price_oracle_mock::set_price(&mut oracle, 30000);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        let repayment = coin::mint_for_testing<USDC>(50000, test_scenario::ctx(&mut scenario));
        recovery_actions::repay_debt_action(
            &mut loan,
            &oracle,
            &clock,
            repayment,
            test_scenario::ctx(&mut scenario)
        );

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    // --- H. End-to-End Judge Scenario ---

    #[test]
    fun test_scenario_mild_drop_recover() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);

        // Mild drop -> Belief
        price_oracle_mock::set_price(&mut oracle, 34500);
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        belief_window::enter_belief_window(&mut loan, &oracle, &clock);

        // Verify active
        assert!(belief_window::is_belief_active(&loan, &clock), 0);

        // Recover by Price Improvement (e.g. Oracle updates back up)
        // Note: Currently `is_belief_active` checks STATUS == BELIEF && time < expiry.
        // It does NOT auto-check health status in the getter.
        // However, `liquidation` checks `is_unsafe`.
        // If we improve price, `is_unsafe` becomes false.
        // The loan status might still be "BELIEF" until someone updates it?
        // Let's see `recovery_actions` handles explicit user actions.
        // What if price just recovers? 
        // `demo_controller::scenario_2_market_crash` (or logic) might update it?
        // Actually, there isn't an explicit "exit belief if price recovers" function called automatically.
        // But `liquidation` checks `is_unsafe`. If `!is_unsafe` (Healthy), it aborts liquidation.
        // So the user is safe effectively.
        // But for this test, let's use explicit Repay Recovery.
        
        let repayment = coin::mint_for_testing<USDC>(100000, test_scenario::ctx(&mut scenario));
        recovery_actions::repay_debt_action(
            &mut loan,
            &oracle,
            &clock,
            repayment,
            test_scenario::ctx(&mut scenario)
        );

        // Verify Healthy
        assert!(loan_core::get_status(&loan) == 0, 1);
        assert!(!belief_window::is_belief_active(&loan, &clock), 2);

        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }

    #[test]
    fun test_scenario_severe_crash_liquidation() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        create_loan_helper(&mut scenario, &clock);

        // 1. Severe Crash to Bankruptcy (CR < 110%)
        // Initial Price: 60000. Debt: 300000. Collateral: 10 BTC.
        // Target CR = 100%. Price = 30000.
        price_oracle_mock::set_price(&mut oracle, 30000);

        test_scenario::next_tx(&mut scenario, LIQUIDATOR);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, BTC>>(&scenario);
        
        // 2. Liquidate Immediately (No Belief Window needed for Bankruptcy)
        // Check health first just to be sure
        assert!(health_engine::is_bankrupt(&loan, &oracle), 0);
        
        let ctx = test_scenario::ctx(&mut scenario);
        liquidation::liquidate_loan(&mut loan, &oracle, &clock, ctx);

        // 3. Verify Liquidated Status
        assert!(loan_core::get_status(&loan) == 2, 1);

        // 4. Verify Lender received collateral
        // We need to check the effects. 
        // In this mock, the collateral is sent to lender address.
        // Test scenario effects can be checked by `take_from_address`.
        
        test_scenario::next_tx(&mut scenario, LENDER);
        let collateral_payback = test_scenario::take_from_address<Coin<BTC>>(&scenario, LENDER);
        
        // Should be all 10 BTC
        assert!(coin::value(&collateral_payback) == COLLATERAL_AMOUNT, 2);
        
        test_scenario::return_to_address(LENDER, collateral_payback);
        test_scenario::return_shared(loan);
        cleanup(scenario, clock, oracle);
    }
}
