#[test_only]
module belief_lending::narrative_tests {
    use std::debug;
    use std::string::{Self, String};
    use sui::test_scenario::{Self, Scenario};
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use belief_lending::loan_core::{Self, LoanObject};
    use belief_lending::demo_controller;
    use belief_lending::price_oracle_mock::{Self, PriceOracle};
    
    // Check types
    public struct ETH {}
    public struct USDC {}

    const ADMIN: address = @0xA;
    const BORROWER: address = @0xB;
    const LENDER: address = @0xC;
    const LIQUIDATOR: address = @0xD;

    // Based on calculations:
    // Collateral: 400M Token units (e.g. 400 ETH? No, user says "400M SUI" ~ 400M units).
    // Price: 3000.
    // To match user's implied "CR=115% at Price 2000" logic with their specified drop:
    // "Simulate a 33% ETH price drop (3000 -> 2000)" -> "CR ~ 115%".
    // 115 = (Collateral * 2000 * 100) / Debt
    // Debt = (Collateral * 2000 * 100) / 115.
    // If Collateral = 400,000,000 (400M).
    // Debt = (400,000,000 * 200,000) / 115. (Wait 2000 * 100).
    const COLLATERAL_AMOUNT: u64 = 400000000; 
    // Debt = 695,652,173,913. (695B).
    const BORROW_AMOUNT: u64 = 695652173913;
    const PRICE_START: u64 = 3000;
    const PRICE_MILD_DROP: u64 = 2000; // 33% drop, results on CR 115% with correct debt.
    // Bankruptcy < 110%. Target 100% -> Price 1739.
    const PRICE_SEVERE_CRASH: u64 = 1739; 

    // --- Helpers ---

    fun print_log(header: vector<u8>, loan: &LoanObject<USDC, ETH>, clock: &Clock) {
        debug::print(&string::utf8(header));
        
        debug::print(&string::utf8(b"Loan Status (0=Healthy, 1=Belief, 2=Liquidated): "));
        debug::print(&loan_core::get_status(loan));
        
        debug::print(&string::utf8(b"Collateral Amount: "));
        debug::print(&loan_core::get_collateral_amount(loan));
        
        debug::print(&string::utf8(b"Borrowed Amount: "));
        debug::print(&loan_core::get_borrowed_amount(loan));
        
        debug::print(&string::utf8(b"Interest Tier (1=Low, 2=Normal, 3=High): "));
        debug::print(&loan_core::get_interest_tier(loan));

        debug::print(&string::utf8(b"Belief Window Expiry: "));
        debug::print(&loan_core::get_belief_window_expiry(loan));
        
        debug::print(&string::utf8(b"--------------------------------------------------"));
    }

    fun setup_test(ctx: &mut Scenario): (Clock, PriceOracle) {
        let clock = clock::create_for_testing(test_scenario::ctx(ctx));
        let oracle = price_oracle_mock::create_for_testing(PRICE_START, test_scenario::ctx(ctx));
        (clock, oracle)
    }

    // --- TEST FLOW 1-4: Creation -> Belief -> Recovery -> Expiry Liquidation ---
    // Note: To test recovery and then expiry liquidation, we need to re-crash.
    // The user flow:
    // Case 1: Create.
    // Case 2: Crash -> Belief.
    // Case 3: Recovery -> Healthy.
    // Case 4: Re-enter unsafe -> Activate Belief -> Wait 30s -> Liquidate.
    
    #[test]
    fun test_cases_1_to_4_flow() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        // --- TEST CASE 1: Loan Creation ---
        
        let eth_coin = coin::mint_for_testing<ETH>(COLLATERAL_AMOUNT, ctx);
        let usdc_coin = coin::mint_for_testing<USDC>(BORROW_AMOUNT, ctx);

        demo_controller::scenario_1_open_loan(usdc_coin, eth_coin, BORROWER, LENDER, ctx);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, ETH>>(&scenario);
        
        print_log(b"TEST CASE 1: Loan Creation (Baseline)", &loan, &clock);
        
        assert!(loan_core::get_status(&loan) == 0, 101); // Healthy

        // --- TEST CASE 2: Mild Market Drop -> Belief Window Activation ---

        // Drop price 3000 -> 2000
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, PRICE_MILD_DROP);

        print_log(b"TEST CASE 2: Mild Market Drop -> Belief Window Activation", &loan, &clock);

        assert!(loan_core::get_status(&loan) == 1, 201); // Belief
        // assert!(belief_window::is_belief_active(&loan, &clock), 202); 
        // Note: is_belief_active checks time. Expiry should be > now.
        // Expiry should be set.

        // --- TEST CASE 3: Recovery During Belief Window ---
        
        // Recover by Repaying Debt.
        // We need to repay enough to get CR > 120%.
        // Current CR = 115%. Debt = 695B. Value = 400M * 2000 = 800B.
        // 800 * 100 / Debt = 115.
        // Target CR = 120%. 120 = 80000/D_new.
        // D_new = 80000 / 120 = 666.6B.
        // Repay = 695.6 - 666.6 = ~29B.
        // Let's repay 30B units.
        let repay_amt = 30000000000;
        let repayment = coin::mint_for_testing<USDC>(repay_amt, test_scenario::ctx(&mut scenario));
        
        demo_controller::scenario_3_recovery_repay(&mut loan, &oracle, &clock, repayment, test_scenario::ctx(&mut scenario));

        print_log(b"TEST CASE 3: Recovery During Belief Window", &loan, &clock);
        
        assert!(loan_core::get_status(&loan) == 0, 301); // Return to Healthy
        assert!(loan_core::get_interest_tier(&loan) < 3, 302); // Should decrease (likely to Low/Normal)

        test_scenario::return_shared(loan);

        // --- TEST CASE 4: Belief Window Expiry -> Liquidation Allowed ONLY IF INSOLVENT ---
        
        // 1. Re-crash or Re-Unsafe.
        let price_unsafe_2 = 1900; // CR ~ 114% (Unsafe but Solvent)
        price_oracle_mock::set_price(&mut oracle, price_unsafe_2);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, ETH>>(&scenario);

        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, price_unsafe_2);
        
        // 2. Advance Time > 30s
        clock::increment_for_testing(&mut clock, 31000);
        
        // Note: At this point (Solvent + Expired), Liquidation should fail. 
        // But we can't assert failure without aborting test.
        // We proceed to demonstrate Insolvent Liquidation.
        
        // 3. Drop to Insolvency (< 100% CR)
        // Debt ~ 666B. Collateral 400M. 100% CR Price = 1665.
        // Set Price to 1600 (CR ~ 96%).
        let price_insolvent = 1600;
        price_oracle_mock::set_price(&mut oracle, price_insolvent);
        
        // 4. Liquidation (Should Succeed now)
        let ctx = test_scenario::ctx(&mut scenario);
        demo_controller::scenario_4_liquidation(&mut loan, &oracle, &clock, ctx);

        print_log(b"TEST CASE 4: Insolvency -> Strict Liquidation Success", &loan, &clock);
        
        assert!(loan_core::get_status(&loan) == 2, 402); // Liquidated
        assert!(loan_core::get_collateral_amount(&loan) == 0, 403);
        
        test_scenario::return_shared(loan);
        clock::destroy_for_testing(clock);
        price_oracle_mock::destroy_for_testing(oracle);
        test_scenario::end(scenario);
    }
    
    // --- TEST CASE 5: Bankruptcy Override ---
    #[test]
    fun test_case_5_bankruptcy() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let eth_coin = coin::mint_for_testing<ETH>(COLLATERAL_AMOUNT, ctx);
        let usdc_coin = coin::mint_for_testing<USDC>(BORROW_AMOUNT, ctx);
        demo_controller::scenario_1_open_loan(usdc_coin, eth_coin, BORROWER, LENDER, ctx);
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, ETH>>(&scenario);

        // Severe Crash -> < 110%. Price 1700.
        // Debt 695B. Val = 400M * 1700 = 680B. CR = 97%. Bankrupt.
        let price_crash = 1700;
        
        // Using scenario_2 will try to enter belief but SHOULD FAIL/SKIP because bankrupt.
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, price_crash);
        // Note: scenario_2 checks `!is_bankrupt` before entering belief. So it won't enter belief. Status stays Healthy (0) in logic, or Unsafe? 
        // Logic: if unsafe && !bankrupt -> Enter Belief.
        // If bankrupt -> Do nothing (Stay 0). Or does health engine mark it?
        // `loan_core` status is stored. `health_engine` computes it.
        // Status remains 0 (Healthy flag used for storage), but health check says Bankrupt.
        
        // Attempt Recovery (Should fail)
        // We verify failure by assert `is_bankrupt` logic in recovery_actions.
        // If I try to repay, it should abort ELoanIsBankrupt.
        
        debug::print(&string::utf8(b"TEST CASE 5: Bankruptcy Override check..."));
        
        // Liquidate
        let ctx = test_scenario::ctx(&mut scenario);
        demo_controller::scenario_4_liquidation(&mut loan, &oracle, &clock, ctx);

        print_log(b"TEST CASE 5: Bankruptcy Override -> Immediate Liquidation", &loan, &clock);
        assert!(loan_core::get_status(&loan) == 2, 501); // Liquidated

        test_scenario::return_shared(loan);
        clock::destroy_for_testing(clock);
        price_oracle_mock::destroy_for_testing(oracle);
        test_scenario::end(scenario);
    }

    // --- TEST CASE 6: Dynamic Interest Adaptation ---
    #[test]
    fun test_case_6_interest() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let eth_coin = coin::mint_for_testing<ETH>(COLLATERAL_AMOUNT, ctx);
        let usdc_coin = coin::mint_for_testing<USDC>(BORROW_AMOUNT, ctx);
        demo_controller::scenario_1_open_loan(usdc_coin, eth_coin, BORROWER, LENDER, ctx);
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, ETH>>(&scenario);

        // 1. ±5% change. 3000 -> 2880 (-4%). Expect Low (1).
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, 2880);
        debug::print(&string::utf8(b"Case 6a: 4% Drop"));
        debug::print(&loan_core::get_interest_tier(&loan));
        assert!(loan_core::get_interest_tier(&loan) == 1, 601);

        // 2. -7% change. 3000 -> 2790.
        // We reset price to 3000 first? Or from 2880?
        // Prompt: "Simulate multiple price movements... -7% price drop". Usually implies from baseline or sequentially?
        // "Interest always correlates with risk level".
        // Let's reset to 3000 to be clean, or simulate drop from 3000.
        price_oracle_mock::set_price(&mut oracle, 3000); 
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, 2790); // 3000 * 0.93
        debug::print(&string::utf8(b"Case 6b: 7% Drop"));
        debug::print(&loan_core::get_interest_tier(&loan));
        assert!(loan_core::get_interest_tier(&loan) == 2, 602); // Normal (Moderate)

        // 3. -15% change. 3000 -> 2550.
        price_oracle_mock::set_price(&mut oracle, 3000);
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, 2550);
        debug::print(&string::utf8(b"Case 6c: 15% Drop"));
        debug::print(&loan_core::get_interest_tier(&loan));
        assert!(loan_core::get_interest_tier(&loan) == 3, 603); // High

        print_log(b"TEST CASE 6: Dynamic Interest Adaptation Verified", &loan, &clock);
        
        test_scenario::return_shared(loan);
        clock::destroy_for_testing(clock);
        price_oracle_mock::destroy_for_testing(oracle);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // ELoanSolvent
    fun test_validation_block_solvent_liquidation() {
        let mut scenario = test_scenario::begin(ADMIN);
        let (mut clock, mut oracle) = setup_test(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);

        let eth_coin = coin::mint_for_testing<ETH>(COLLATERAL_AMOUNT, ctx);
        let usdc_coin = coin::mint_for_testing<USDC>(BORROW_AMOUNT, ctx);
        demo_controller::scenario_1_open_loan(usdc_coin, eth_coin, BORROWER, LENDER, ctx);
        
        test_scenario::next_tx(&mut scenario, BORROWER);
        let mut loan = test_scenario::take_shared<LoanObject<USDC, ETH>>(&scenario);

        // Drop to Unsafe (114%)
        price_oracle_mock::set_price(&mut oracle, 2000); // 115%
        demo_controller::scenario_2_market_crash(&mut loan, &mut oracle, &clock, 2000);

        // Expire Belief
        clock::increment_for_testing(&mut clock, 31000);

        // Try Liquidate
        let ctx = test_scenario::ctx(&mut scenario);
        demo_controller::scenario_4_liquidation(&mut loan, &oracle, &clock, ctx);

        test_scenario::return_shared(loan);
        clock::destroy_for_testing(clock);
        price_oracle_mock::destroy_for_testing(oracle);
        test_scenario::end(scenario);
    }
}
