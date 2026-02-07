# Belief-Based Lending Protocol (Sui Move)

**Belief-Based Lending** is a novel DeFi lending protocol built on **Sui** that eliminates panic liquidations by introducing **belief-priced time**.
Instead of liquidating borrowers during temporary market volatility, the protocol allows *solvent* borrowers to pay higher interest to buy time — while enforcing **strict insolvency-only liquidation** to protect lenders.

> **Liquidation is a last resort for insolvency — not a risk management shortcut.**

---

## 🌟 Core Idea

Traditional DeFi protocols (Aave, Compound, etc.) liquidate loans as soon as a **risk threshold** is crossed — even if the collateral still fully covers the debt.
This causes unnecessary liquidations during flash crashes and temporary drawdowns.

**Belief-Based Lending changes this fundamental rule:**

> **A loan is liquidated only when it becomes insolvent.**
> As long as collateral ≥ principal + accrued interest, liquidation is impossible.

Borrowers can remain exposed to volatility by paying higher interest — a **belief cost** — instead of being forcibly liquidated.

---

## 🧠 Economic Zones & Invariants

### 1️⃣ Healthy Zone (≥ 120%)

* **Condition:**
  `collateral_value ≥ 1.2 × debt`
* **Interest:** Normal (Base Rate)
* **Liquidation:** ❌ Blocked
* **Belief Window:** Not active

The loan is safe and unstressed.

---

### 2️⃣ Unsafe / Belief Zone (100% – 120%)

* **Condition:**
  `debt ≤ collateral_value < 1.2 × debt`
* **Status:** Unsafe (Belief Active)
* **Interest:** Increased (Risk / Time Premium)
* **Liquidation:** ❌ Blocked (even if belief window expires)

This is the **core innovation**.

The borrower is **not gambling** — they are paying interest to consume time while remaining solvent.
Panic liquidations are permanently prevented in this zone.

---

### 3️⃣ Bankruptcy / Insolvency Zone (< 100%)

* **Condition:**
  `collateral_value < principal + accrued_interest`
* **Status:** Insolvent
* **Belief Window:** Ignored
* **Recovery:** Blocked
* **Liquidation:** ✅ Immediate

At this point, waiting increases lender loss.
Liquidation is mandatory and irreversible.

---

## 🛡️ Strict Lender Protection

The protocol enforces a **hard insolvency invariant**:

> **Lender principal is never exposed once collateral can no longer cover debt.**

### Insolvency Rule

When `collateral < principal + accrued_interest`:

* ❌ Belief logic bypassed
* ❌ Interest frozen
* ❌ Recovery blocked
* ✅ Immediate liquidation executed

This guarantees lender recovery while avoiding premature liquidations.

---

## 📈 Dynamic Interest = Price of Belief

Risk is priced through **interest**, not liquidation.

| Market Condition | Interest Behavior |
| ---------------- | ----------------- |
| Safe (≤ 5% drop) | Low / Base Rate   |
| Moderate (5–10%) | Medium Increase   |
| Stress (> 10%)   | High Increase     |

Borrowers **choose** to remain exposed by paying higher interest — a mechanism not present in existing DeFi protocols.

---

## 💻 Frontend Application

The project includes a comprehensive **React-based frontend** to visualize and interact with the protocol.

### ✨ Features

*   **Interactive Dashboard**: Real-time view of borrowing capacity, health factor, and loan status.
*   **Risk Transparency**: Visual indicators for **Healthy**, **Belief**, and **Bankruptcy** zones.
*   **Demo Mode Control**: "Judges Demo Panel" to simulate ETH price crashes and time lapses.
*   **Responsive UI**: Custom CSS design with a premium, institutional financial aesthetic.

### 🚀 Getting Started

**Prerequisites:** Node.js (v16+) and npm.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the local development server:**
    ```bash
    npm run dev
    ```

4.  **Open the App:**
    Visit `http://localhost:5173` (or the URL provided in the terminal) to test the application.

---

## 🧩 Architecture Overview

The protocol is modularized into **8 clean Move modules**:

### Core Layer

* `loan_core.move` – Loan object, collateral, debt, ownership
* `price_oracle_mock.move` – Mock oracle for testing

### Logic Layer

* `health_engine.move` – Healthy / Unsafe / Bankrupt evaluation
* `interest_model.move` – Volatility-based interest tiers
* `belief_window.move` – Belief state & timing logic

### Action Layer

* `recovery_actions.move` – Repay or add collateral (solvent only)
* `liquidation.move` – Insolvency-only liquidation enforcement

### Experience Layer

* `demo_controller.move` – End-to-end lifecycle simulation

---

## 🧪 Testing & Verification

The project includes a **comprehensive automated test suite** validating:

* Belief window activation
* Liquidation protection
* Recovery correctness
* Insolvency enforcement
* Interest tier dynamics
* End-to-end economic invariants

### Run All Tests

```bash
sui move test
```

### Run Narrative Validation

```bash
sui move test narrative_tests
```

**Result:**
✅ All tests pass
✅ All economic invariants enforced

---

## 🛠️ Example Scenarios

### 🔹 Flash Crash (Safe Haven)

* ETH drops 7%
* Loan enters Unsafe Zone (115%)
* Interest increases
* Liquidation blocked
* Price recovers → loan returns Healthy

**Outcome:** No liquidation, no loss.

---

### 🔹 True Crash (Insolvency Protection)

* ETH drops until collateral < debt
* Insolvency triggered
* Belief ignored
* Immediate liquidation executed

**Outcome:** Lender fully protected.

---

## 🧠 Why This Is Different From Aave

| Feature                | Aave-like Protocols | Belief-Based Lending          |
| ---------------------- | ------------------- | ----------------------------- |
| Liquidation Trigger    | Risk Threshold      | Insolvency Only               |
| Flash Crash Protection | ❌                  | ✅                            |
| Time Buying            | ❌                  | ✅ (via interest)             |
| Panic Liquidations     | Common              | Impossible                    |
| Economic Philosophy    | Liquidate Early     | Liquidate Only When Necessary |

---

## 📄 License

MIT License
