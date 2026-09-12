import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup connection
w3 = Web3(Web3.HTTPProvider(os.getenv("SEPOLIA_RPC_URL")))
private_key = os.getenv("SEPOLIA_PRIVATE_KEY")  # Ensure your private key is in your .env
account = w3.eth.account.from_key(private_key)

contract_address = "0x52D31Da73a7901962d58FfB072107b1F19a01EF5"

# Minimal ABI containing only createCampaign
abi = [
    {
        "inputs": [
            {"name": "_goalAmount", "type": "uint256"},
            {"name": "_deadline", "type": "uint256"},
            {"name": "_metadataURI", "type": "string"}
        ],
        "name": "createCampaign",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=contract_address, abi=abi)

# Build transaction parameters
goal_amount = Web3.to_wei(1, 'ether')  # 1 ETH
deadline = 1788774994                  # Future timestamp we generated
metadata_uri = "ipfs://test"

nonce = w3.eth.get_transaction_count(account.address)

txn = contract.functions.createCampaign(
    goal_amount, deadline, metadata_uri
).build_transaction({
    'from': account.address,
    'nonce': nonce,
    'gas': 300000,
    'maxFeePerGas': w3.to_wei('50', 'gwei'),
    'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
})

# Sign and send transaction
signed_txn = w3.eth.account.sign_transaction(txn, private_key=private_key)
tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

print(f"Transaction sent! Hash: {w3.to_hex(tx_hash)}")