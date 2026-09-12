import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup connection
w3 = Web3(Web3.HTTPProvider(os.getenv("SEPOLIA_RPC_URL")))
private_key = os.getenv("SEPOLIA_PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)
contract_address = Web3.to_checksum_address("0x52D31Da73a7901962d58FfB072107b1F19a01EF5")

# ABI for the pledge function
abi = [
    {
        "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}],
        "name": "pledge",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=contract_address, abi=abi)

def send_pledge():
    # Specify the campaign ID you want to pledge to (e.g., the newly created campaign ID)
    campaign_id = 1  # Update this if your new campaign took a different ID (check your indexer output or contract's campaign counter)
    
    # Pledge 0.05 ETH (keep it below the 0.1 ETH goal so it fails and qualifies for a refund later)
    pledge_amount = w3.to_wei(0.001, "ether")

    print(f"Pledging 0.05 ETH to Campaign #{campaign_id} from {account.address}...")
    
    nonce = w3.eth.get_transaction_count(account.address)
    
    # Build transaction calling the payable pledge function
    txn = contract.functions.pledge(campaign_id).build_transaction({
        'from': account.address,
        'value': pledge_amount,
        'nonce': nonce,
        'gas': 200000,
        'gasPrice': w3.eth.gas_price
    })

    # Sign and send transaction
    signed_txn = w3.eth.account.sign_transaction(txn, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    
    print(f"Pledge transaction sent! Hash: {tx_hash.hex()}")
    print("Waiting for confirmation...")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"Pledge successfully confirmed in block #{receipt.blockNumber}!")

if __name__ == "__main__":
    send_pledge()