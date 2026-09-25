import os
import json
import time
from web3 import Web3
from dotenv import load_dotenv
from database import SessionLocal
from models import Campaign, Pledge
from sqlalchemy.exc import IntegrityError

load_dotenv()

w3 = Web3(Web3.HTTPProvider(os.getenv("SEPOLIA_RPC_URL")))

# Configuration Constants
DEPLOYMENT_BLOCK = 11640840 
CONFIRMATION_BUFFER = 2      
CHUNK_SIZE = 10            
STATE_FILE = "indexer_state.json"
CONTRACT_ADDRESS = "0x52D31Da73a7901962d58FfB072107b1F19a01EF5"

# Load Contract ABI
with open("artifacts/contracts/Crowdfunding.sol/Crowdfunding.json", "r") as f:
    contract_json = json.load(f)
contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=contract_json["abi"])

def load_last_processed_block():
    if not os.path.exists(STATE_FILE):
        return None
    try:
        with open(STATE_FILE, "r") as f:
            data = json.load(f)
            return data.get("last_processed_block")
    except Exception:
        return None

def save_last_processed_block(block_number):
    with open(STATE_FILE, "w") as f:
        json.dump({"last_processed_block": block_number}, f)

def run_indexer_loop():
    print("Starting continuous indexer loop...")
    while True:
        try:
            last = load_last_processed_block()
            from_block = last + 1 if last is not None else DEPLOYMENT_BLOCK

            current_tip = w3.eth.block_number
            to_block = current_tip - CONFIRMATION_BUFFER

            if to_block >= from_block:
                print(f"\n--- New scan range found: {from_block} to {to_block} ---")
                
                current_start = from_block
                last_successful_block = last  

                while current_start <= to_block:
                    current_end = min(current_start + CHUNK_SIZE - 1, to_block)
                    print(f"Fetching logs from block {current_start} to {current_end}...")
                    
                    try:
                        campaign_created_logs = contract.events.CampaignCreated.get_logs(from_block=current_start,to_block=current_end
                        )
                        pledged_logs = contract.events.Pledged.get_logs(from_block=current_start, to_block=current_end)
                        withdrawn_logs = contract.events.Withdrawn.get_logs(from_block=current_start, to_block=current_end)
                        refunded_logs = contract.events.Refunded.get_logs(from_block=current_start, to_block=current_end)
                        with SessionLocal() as session:
                            try:
                                for event in campaign_created_logs:
                                    print(f"-> Found Event [CampaignCreated]: Campaign ID #{event.args['campaignId']}")
            
            
                                    with session.begin_nested():
                                        try:
                                            new_campaign = Campaign(
                                                campaign_id=str(event.args['campaignId']),
                                                creator=event.args['creator'],
                                                goal_amount=str(event.args['goalAmount']),
                                                total_pledged="0",  
                                                deadline=event.args['deadline'],
                                                is_successful=False,
                                                withdrawn=False,
                                                metadata_uri=event.args['metadataURI'],  
                                                created_at_block=event.blockNumber,
                                                transaction_hash=event.transactionHash.hex()
                                            )
                                            session.add(new_campaign)
                   
                                            session.flush()
                                            print(f"   [DB] Persisted Campaign #{event.args['campaignId']} successfully.")
                                        except IntegrityError:
                   
                                            print(f"   [DB] Campaign #{event.args['campaignId']} already exists (Duplicate skipped).")
                                for event in pledged_logs:
                                    cid = str(event.args['campaignId'])  # <-- FIXED: Defined 'cid' upfront here!
                                    print(f"-> Found Event [Pledge]: Campaign Id #{event.args['campaignId']} | Backer: {event.args['backer']}")
                                    with session.begin_nested():
                                        try:
                                            campaign = session.query(Campaign).filter_by(campaign_id=cid).first()
                                            if not campaign:
                                                print(f"   [DB Warning] Pledge for unknown Campaign #{event.args['campaignId']}. Skipping to prevent orphan records.")
                                                continue
                                            new_pledge = Pledge(
                                                campaign_id = str(event.args['campaignId']),
                                                backer = event.args['backer'],
                                                amount=str(event.args['amount']),
                                                created_at_block=event.blockNumber,
                                                transaction_hash=event.transactionHash.hex()
                                            )
                                            session.add(new_pledge)
                                            
                                            
                                            campaign.total_pledged = str(int(campaign.total_pledged or 0) + event.args['amount']) # type: ignore
                                            if int(campaign.total_pledged) >= int(campaign.goal_amount): # type: ignore
                                                campaign.is_successful = True # type: ignore
                                           
                                            session.flush()
                                            print(f"  [DB] Persisted pledge for Campaign #{event.args['campaignId']} successfully.")    
                                        except IntegrityError:
                                            print(f"   [DB] pledge transaction already exist (Duplicate skipped).")    
                                            
                                for event in withdrawn_logs:
                                    print(f"-> Found Event [Withdrawn]: Campaign ID #{event.args['campaignId']}")
                                    with session.begin_nested():
                                        try:
                                            campaign = session.query(Campaign).filter_by(campaign_id=str(event.args['campaignId'])).first()
                                            if  not campaign:
                                                print(f"   [DB Warning] Withdrawn event received for unknown Campaign #{event.args['campaignId']}.")
                                                continue
                                            campaign.withdrawn = True # type: ignore
                                            session.flush()
                                            print(f"   [DB] Updated Campaign #{event.args['campaignId']} status to Withdrawn.")
                                        except Exception as e:
                                                print(f"   [DB Error] Failed to process withdrawal: {e}")

                                for event in refunded_logs:
                                    cid = str(event.args['campaignId'])
                                    backer_address = event.args.get('backer')
                                    print(f"-> Found Event [Refunded]: Campaign ID #{event.args['campaignId']}")
                                    with session.begin_nested():
                                        try:
                                            query = session.query(Pledge).filter_by(campaign_id=cid, refunded=False,)
                                            if backer_address:
                                                query = query.filter_by(backer=backer_address)
                                            pledges_to_refund = query.all()
                                            if not pledges_to_refund:
                                                print(f"   [DB Warning] Refund event fired for Campaign #{event.args['campaignId']}, but no active pledges found.")
                                            for pledge in pledges_to_refund:
                                                pledge.refunded = True   # type: ignore
                                            session.flush()      
                            
                                            print(f"   [DB] Marked Refunded for Campaign #{event.args['campaignId']}.")
                                        except Exception as e:
                                            print(f"   [DB Error] Failed to process refund: {e}")






                                      
                                session.commit()
       
                                last_successful_block = current_end

                            except Exception as chunk_err:
        
                                session.rollback()
                                print(f"   [DB Error] Chunk failed, rolling back entire batch: {chunk_err}")
                                break  # Break out of the chunk loop so it retries this range next pass
                      
                    except Exception as chunk_err:
                        print(f"Error fetching range {current_start}-{current_end}: {chunk_err}")
                        break
                    current_start = current_end + 1

                
                if last_successful_block is not None and (last is None or last_successful_block > last):
                    save_last_processed_block(last_successful_block)
                    print(f"State updated: last_processed_block saved as {last_successful_block}")
            else:
                print(f"No new confirmed blocks. Current tip: {current_tip}, Target max: {to_block}. Waiting...")

        except Exception as e:
            print(f"Error encountered during loop pass: {e}")

        time.sleep(3)  

if __name__ == "__main__":
    run_indexer_loop()