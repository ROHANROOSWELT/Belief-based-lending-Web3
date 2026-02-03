# Belief-Based Lending Protocol (Sui Move)

> **"Belief-Based Lending"**: A novel DeFi lending protocol on Sui that introduces a **Belief Window**—a grace period for unsafe loans—preventing panic liquidations during temporary market volatility.

## 🌟 Core Concept

Traditional lending protocols liquidate borrowers immediately when their collateral ratio drops below a threshold. This often leads to unnecessary losses during "flash crashes" where prices recover quickly.

**Belief-Based Lending** changes this by introducing a dual-threshold system:
1.  **Unsafe Threshold (120%)**: Triggers the **Belief Window**. Liquidation is paused for a fixed duration, giving the borrower time to recover or the market time to bounce back.
2.  **Bankruptcy Threshold (110%)**: Triggers **Immediate Liquidation** to protect lender solvency.

## 📦 Modules & Architecture

The protocol is modularized into 8 distinct components:
🌟 Core Concept

Traditional lending protocols liquidate borrowers immediately when their collateral ratio drops below a threshold. This often leads to unnecessary losses during "flash crashes" where prices recover quickly.

Belief-Based Lending changes this by introducing a dual-threshold system:

    Unsafe Threshold (120%): Triggers the Belief Window. Liquidation is paused for a fixed duration, giving the borrower time to recover or the market time to bounce back.
    Bankruptcy Threshold (110%): Triggers Immediate Liquidation to protect lender solvency.

📦 Modules & Architecture

The protocol is modularized into 8 distinct components:
1. Core Layer

    loan_core.move: Defines the LoanObject, managing collateral, debt, and ownership.
    price_oracle_mock.move: Simulates ETH price feeds for development and testing.

2. Logic Layer

    health_engine.move: Evaluates loan health (Healthy, Unsafe, Bankrupt) based on collateral value.
    interest_model.move: Adjusts interest tiers dynamically based on market volatility (price drops trigger higher rates).
    belief_window.move: Manages the logic for the grace period (Belief Window), preventing premature liquidation.

3. Action Layer

    recovery_actions.move: Allows borrowers to rescue their loans during the Belief Window by adding collateral or repaying debt.
    liquidation.move: Executes liquidations via two paths:
        Immediate: If Bankrupt.
        Delayed: If Belief Window has expired and loan is still Unsafe.

4. Experience Layer

    demo_controller.move: A unified interface to simulate the entire lifecycle (Open Loan → Market Crash → Recovery/Liquidation) for demonstration purposes.

🚀 Getting Started
Prerequisites

    Sui CLI installed.

Build the Project

sui move build

Run Tests (Simulated via Demo Controller)

Since this is a prototype, use the demo_controller to verify flows:

# Example command to run a test script (if implemented) or use Sui Console
sui client call --package <PKG> --module demo_controller --function scenario_1_open_loan ...

🛠️ Usage Scenarios
1. The "Flash Crash" Safe Haven

    Scenario: ETH drops 15%. Loan LTV goes to 115% (Unsafe).
    Traditional Protocol: LIQUIDATED immediately.
    Belief Protocol: Enters Belief Window. Liquidation PAUSED.
    Outcome: Price rebounds after 10 minutes. Loan returns to Healthy. No Liquidation.

2. The "True Crash" Protection

    Scenario: ETH continually dumps. LTV drops to 109% (Bankrupt).
    Protocol Action: Immediate Liquidation triggers to ensure the lender doesn't lose principal.

📄 License
### 1. Core Layer
*   **`loan_core.move`**: Defines the `LoanObject`, managing collateral, debt, and ownership.
*   **`price_oracle_mock.move`**: Simulates ETH price feeds for development and testing.

### 2. Logic Layer
*   **`health_engine.move`**: Evaluates loan health (`Healthy`, `Unsafe`, `Bankrupt`) based on collateral value.
*   **`interest_model.move`**: Adjusts interest tiers dynamically based on market volatility (price drops trigger higher rates).
*   **`belief_window.move`**: Manages the logic for the grace period (Belief Window), preventing premature liquidation.

### 3. Action Layer
*   **`recovery_actions.move`**: Allows borrowers to rescue their loans during the Belief Window by adding collateral or repaying debt.
*   **`liquidation.move`**: Executes liquidations via two paths:
    *   *Immediate*: If Bankrupt.
    *   *Delayed*: If Belief Window has expired and loan is still Unsafe.

### 4. Experience Layer
*   **`demo_controller.move`**: A unified interface to simulate the entire lifecycle (Open Loan → Market Crash → Recovery/Liquidation) for demonstration purposes.

## 🚀 Getting Started

### Prerequisites
*   [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) installed.

### Build the Project
```bash
sui move build
```

### Run Tests (Simulated via Demo Controller)
Since this is a prototype, use the `demo_controller` to verify flows:
```bash
# Example command to run a test script (if implemented) or use Sui Console
sui client call --package <PKG> --module demo_controller --function scenario_1_open_loan ...
```

## 🛠️ Usage Scenarios

### 1. The "Flash Crash" Safe Haven
*   **Scenario**: ETH drops 15%. Loan LTV goes to 115% (Unsafe).
*   **Traditional Protocol**: LIQUIDATED immediately.
*   **Belief Protocol**: Enters **Belief Window**. Liquidation PAUSED.
*   **Outcome**: Price rebounds after 10 minutes. Loan returns to Healthy. **No Liquidation.**

### 2. The "True Crash" Protection
*   **Scenario**: ETH continually dumps. LTV drops to 109% (Bankrupt).
*   **Protocol Action**: **Immediate Liquidation** triggers to ensure the lender doesn't lose principal.

## 📄 License
MIT License.
