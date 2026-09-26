# Decentralized Crowdfunding DApp

A full-stack decentralized crowdfunding platform built on **Ethereum (Sepolia Testnet)**. It combines a Solidity smart contract, a Python event-indexing backend, and a React frontend into a working, live-tested application for creating campaigns, pledging ETH, and reclaiming or withdrawing funds based on campaign outcome.

## Key Features

- **Smart Contract (`contracts/Crowdfunding.sol`)** — manages campaign creation, ETH pledging, goal-threshold success detection, creator withdrawals, and backer refunds. Enforces invariants on-chain (positive goal amounts, future deadlines, one-time withdrawal/refund per state).
- **Python Indexer (`indexer.py`)** — polls Sepolia in confirmed, chunked block ranges and syncs `CampaignCreated`, `Pledged`, `CampaignSuccessful`, `Withdrawn`, and `Refunded` events into a local database, with idempotent per-event transactions and crash-safe checkpointing.
- **FastAPI Read Layer (`api.py`)** — serves paginated campaign listings and campaign detail (with full pledge history) via a typed, validated REST API.
- **React Frontend (`frontend/`)** — wallet connection with live network-mismatch detection, campaign discovery and detail views, and three mutually exclusive on-chain actions per campaign: pledge, reclaim (refund), and withdraw — each gated by real campaign state (deadline, goal, caller identity) before being shown.

## Project Structure

This is a single repository with the Solidity project, indexer, and API living at the root (Hardhat's default layout), and the frontend as its own subfolder:

```
.
├── contracts/              # Solidity smart contracts
├── scripts/                # Hardhat deployment scripts
├── test/                   # Contract tests
├── frontend/                # React + Vite client app
├── api.py                  # FastAPI read layer
├── indexer.py               # Python event indexer
├── models.py                # SQLAlchemy models
├── database.py               # DB session setup
├── indexer_state.json        # Indexer's last-processed-block checkpoint
├── .env.example              # Template for indexer/API secrets
└── hardhat.config.js
```

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- MetaMask (or another browser wallet) configured for the Sepolia testnet, with test ETH

### 1. Smart Contracts (Hardhat)
```bash
npm install
npx hardhat compile
```

### 2. Indexer + API (project root)
No `requirements.txt` is committed yet, so install the core dependencies directly:
```bash
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install fastapi uvicorn "web3" sqlalchemy python-dotenv
```

Copy the environment template and fill in real values:
```bash
cp .env.example .env
```
`.env` requires:
```
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

Run the indexer (keep this running in its own terminal — it polls continuously):
```bash
python indexer.py
```

Run the API (separate terminal):
```bash
uvicorn api:app --reload
```
The API is now available at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
cp .env.example .env
```
Fill in `frontend/.env`:
```
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddressOnSepolia
```
Then start the dev server:
```bash
npm run dev
```

## Live Testnet Status

All four on-chain actions have been implemented, code-reviewed against the actual contract source, and exercised on Sepolia:

- **Create campaign** — verified live: transaction confirms, `CampaignCreated` event is parsed directly from the receipt logs for an immediate redirect (no dependency on indexer polling lag).
- **Pledge** — verified live with a confirmed Etherscan receipt; indexer correctly picks up the event and updates campaign totals.
- **Refund** — verified live across a multi-pledge scenario; all of a backer's unrefunded pledge rows correctly flip to `refunded: true` in one indexed event, matching the contract's lump-sum refund behavior.
- **Withdraw** — implemented and exercised once on a live successful/expired test campaign; working at time of test. Not currently backed by a fresh, reproducible log (terminal session was closed), so treat as tested-but-due-for-a-rerun rather than continuously verified like the other three.

## Engineering Notes

A few decisions and bugs worth knowing about, since they shaped the design:

- **Unit consistency across languages**: Solidity deadlines are Unix seconds; JavaScript's `Date.now()` is milliseconds. Every deadline comparison in the frontend explicitly converts (`Math.floor(Date.now() / 1000)`) to avoid a class of bug that surfaced more than once during development.
- **Address comparisons are case-normalized** (`.toLowerCase()`) throughout, since Ethereum addresses can appear checksummed or lowercase depending on source, and a naive `===` comparison would silently produce false negatives.
- **Wei-scale arithmetic uses `BigInt`, never `Number`**, anywhere the result needs to be exact (e.g., summing a backer's refundable pledges) — `Number` is only used for display-only percentages, where float rounding is harmless.
- **Every write action refetches campaign state after `tx.wait()` confirms**, so the UI never shows a stale "you can still withdraw" button after a withdrawal has already succeeded.
- **A single bad or missing metadata URI never crashes the page** — metadata fetching (the off-chain JSON a campaign's `metadataURI` points to) is wrapped in its own try/catch, separate from the core campaign-data fetch, so optional data failing gracefully degrades instead of taking down the pledge form.
- **Cross-layer field naming is verified against source, not assumed** — Solidity, SQLAlchemy, Pydantic, and JavaScript each use their own naming conventions (`metadataURI` vs. `metadata_uri`, for example), and mismatches between layers were a recurring source of bugs during development, caught by checking actual schemas rather than pattern-matching from memory.

## Known Gaps / Deferred Work

- No IPFS pinning integration yet — `metadataURI` currently expects a manually-hosted static JSON URL rather than a real IPFS upload flow.
- `indexer_state.json` (the block-checkpoint file) has not yet been folded into the main database, despite both existing side by side.
- No database migration tooling (e.g., Alembic) — schema changes currently require manual table changes or a fresh database.
- Withdrawal provenance (which block/transaction a withdrawal happened in) is not tracked — only a boolean `withdrawn` flag, deferred to avoid a schema migration mid-project.