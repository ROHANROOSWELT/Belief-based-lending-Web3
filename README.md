# Belief-Based Lending Protocol (Sui Move)

> **"Belief-Based Lending"**: A novel DeFi lending protocol on Sui that introduces a **Belief Window**—a grace period for unsafe loans—preventing panic liquidations during temporary market volatility, while strictly enforcing **Lender Principal Protection**.

## 🌟 Core Concept

Traditional lending protocols liquidate borrowers immediately when their collateral ratio drops below a threshold. This often leads to unnecessary losses during "flash crashes" where prices recover quickly.

**Belief-Based Lending** changes this by introducing a dual-threshold system with a hard safety floor:

1.  **Unsafe Threshold (120%)**: Triggers the **Belief Window**. Liquidation is paused for a fixed duration, giving the borrower time to recover or the market time to bounce back.
2.  **Bankruptcy Threshold (110%)**: Triggers **Immediate Liquidation** to protect lender solvency. **This overrides all belief logic.**

## 🛡️ Strict Lender Protection

The protocol is designed with a "Safety First" architecture. Lender principal recovery is guaranteed at any cost.

### 1. Hard Safety Rule (Bankruptcy)
If a loan's collateral value drops to **110%** of the debt:
*   ❌ **Belief Window Bypassed**: The grace period is immediately revoked.
*   ❌ **Interest Updates Stopped**: No further interest changes are allowed.
*   ❌ **Recovery Blocked**: Borrowers cannot manually add collateral or repay to "save" the loan.
*   ✅ **Immediate Liquidation**: The collateral is seized to cover the debt.

### 2. Dynamic Interest Zones
Interest rates adapt to market volatility to price the "belief" risk:
*   **Safe Zone (< 5% Drop)**: Regular Low Interest.
*   **Moderate Zone (5% - 10% Drop)**: Moderate Interest Increase.
*   **Stress Zone (> 10% Drop)**: High Interest Increase.

## 📦 Modules & Architecture

The protocol is modularized into 8 distinct components (`sources/`):

### 1. Core Layer
*   **`loan_core.move`**: Defines the `LoanObject`, managing collateral, debt, and ownership.
*   **`price_oracle_mock.move`**: Simulates ETH price feeds for development and testing.

### 2. Logic Layer
*   **`health_engine.move`**: Evaluates loan health (`Healthy`, `Unsafe`, `Bankrupt`) based on collateral value.
*   **`interest_model.move`**: Implements the granular interest zones and safety blockers.
*   **`belief_window.move`**: Manages the grace period logic.

### 3. Action Layer
*   **`recovery_actions.move`**: Allows borrowers to rescue *non-bankrupt* loans.
*   **`liquidation.move`**: Executes liquidations, strictly prioritizing bankruptcy cases.

### 4. Experience Layer
*   **`demo_controller.move`**: A unified interface to simulate the entire lifecycle (Open Loan → Market Crash → Recovery/Liquidation).

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

### 1. The "Flash Crash" (Safe Haven)
*   **Scenario**: ETH drops 7%. Loan LTV goes to 115% (Unsafe).
*   **Protocol Action**: Enters **Belief Window**. Interest increases moderately. Liquidation is PAUSED.
*   **Outcome**: Price rebounds. Loan returns to Healthy. **No Liquidation.**

### 2. The "True Crash" (Principal Protection)
*   **Scenario**: ETH dumps 15%. Loan LTV drops to 109% (Bankrupt).
*   **Protocol Action**: **Immediate Liquidation**. Belief window is ignored.
*   **Outcome**: Lender recovers funds before the collateral becomes insolvent.

## 📄 License
MIT License.
