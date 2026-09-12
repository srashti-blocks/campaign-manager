from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
rpc_url = os.getenv('SEPOLIA_RPC_URL')
w3 = Web3(Web3.HTTPProvider(rpc_url))

# Use a hardcoded, safe historical range where your contract was deployed
from_b = 11640000
to_b = 11641000

print(f"Querying fixed historical blocks from {from_b} to {to_b}...")

try:
    logs = w3.eth.get_logs({
        "fromBlock": from_b,
        "toBlock": to_b,
        "address": "0x52D31Da73a7901962d58FfB072107b1F19a01EF5"
    })
    print(f"Success! Found {len(logs)} logs.")
    for log in logs:
        print(log)
except Exception as e:
    print(f"Request failed: {e}")