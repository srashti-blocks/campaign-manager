import os
import json
from web3 import Web3
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load the .env file from the current directory
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

provider_uri = os.getenv("SEPOLIA_RPC_URL")
# print("Connecting to provider:", provider_uri)  # This should now print your Alchemy URL!

w3 = Web3(Web3.HTTPProvider(provider_uri))

# Load ABI
with open("artifacts/contracts/Crowdfunding.sol/Crowdfunding.json", "r") as f:
    contract_json = json.load(f)
abi = contract_json["abi"]

CONTRACT_ADDRESS ="0x52D31Da73a7901962d58FfB072107b1F19a01EF5"
contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=abi)

private_key = os.getenv("SEPOLIA_PRIVATE_KEY")
sender_account = w3.eth.account.from_key(private_key)

# Campaign parameters
goal_amount = w3.to_wei(1, 'ether')
duration = 86400
metadata_uri = "ipfs://test-metadata-uri"

nonce = w3.eth.get_transaction_count(sender_account.address)

txn = contract.functions.createCampaign(
    goal_amount,
    duration,
    metadata_uri
).build_transaction({
    'from': sender_account.address,
    'nonce': nonce,
    'gas': 300000,
    'maxFeePerGas': w3.to_wei('50', 'gwei'),
    'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
})

signed_txn = w3.eth.account.sign_transaction(txn, private_key=private_key)
tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

print(f"Transaction sent! Hash: {w3.to_hex(tx_hash)}")
print("Waiting for confirmation...")
receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("Transaction mined! Campaign created successfully.")
print(f"Mined in block: {receipt['blockNumber']}")