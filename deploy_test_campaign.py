import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup connection
rpc_url = os.getenv("SEPOLIA_RPC_URL")
private_key = os.getenv("SEPOLIA_PRIVATE_KEY")  # Your wallet's private key in .env
contract_address =   "0x52D31Da73a7901962d58FfB072107b1F19a01EF5" # Your deployed Crowdfunding contract address

w3 = Web3(Web3.HTTPProvider(rpc_url))
account = w3.eth.account.from_key(private_key)

# Minimal ABI for creating a campaign
abi = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "goalAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "durationInSeconds", "type": "uint256"},
            {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
        "name": "createCampaign",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)

def deploy_short_campaign():
    # Set deadline to 300 seconds (5 minutes) from now
    duration = 300 
    goal = w3.to_wei(0.5, "ether")  # 0.5 ETH goal
    metadata = "ipfs://test-short-deadline"

    print(f"Preparing transaction from {account.address}...")
    
    nonce = w3.eth.get_transaction_count(account.address)
    
    # Build transaction
    txn = contract.functions.createCampaign(
        goal,
        duration,
        metadata
    ).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 300000,
        'gasPrice': w3.eth.gas_price
    })

    # Sign and send transaction
    signed_txn = w3.eth.account.sign_transaction(txn, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    
    print(f"Transaction sent! Hash: {tx_hash.hex()}")
    print("Waiting for confirmation...")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Campaign successfully created in block #{receipt.blockNumber}!")

if __name__ == "__main__":
    deploy_short_campaign()