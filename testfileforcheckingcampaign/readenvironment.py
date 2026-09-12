import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()  # This must run before os.getenv()

provider_uri = os.getenv("WEB3_PROVIDER_URI")
print("Connecting to provider:", provider_uri)  # Check if this prints your Alchemy URL instead of None

w3 = Web3(Web3.HTTPProvider(provider_uri))