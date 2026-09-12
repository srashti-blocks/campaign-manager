from database import SessionLocal, init_db
from models import Campaign

# Ensure tables exist
init_db()

# Open a session
session = SessionLocal()

try:
    # Create a mock campaign matching our exact schema
    mock_campaign = Campaign(
        campaign_id="999",
        creator="0x1234567890abcdef1234567890abcdef12345678",
        goal_amount="1000000000000000000", # 1 ETH in wei
        total_pledged="0",
        deadline=1800000000,
        is_successful=False,
        withdrawn=False,
        metadata_uri="ipfs://testmetadatahash",
        created_at_block=11585851,
        transaction_hash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    )

    session.add(mock_campaign)
    session.commit()
    print("[SUCCESS] Mock campaign successfully written to database!")

except Exception as e:
    session.rollback()
    print(f"[ERROR] Failed to write mock campaign: {e}")

finally:
    session.close()

# Verify by querying it back
session = SessionLocal()
results = session.query(Campaign).all()
print(f"Current campaigns in DB: {results}")
session.close()