from sqlalchemy import Column ,String , Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    campaign_id = Column(String, primary_key=True, index=True)
    creator = Column(String, nullable=False, index=True)
    goal_amount = Column(String, nullable=False)
    total_pledged = Column(String, nullable=False, default="0")
    deadline = Column(Integer, nullable=False)
    is_successful = Column(Boolean, default=False)
    withdrawn = Column(Boolean, default=False)
    metadata_uri = Column(String, nullable=True)
    
    created_at_block = Column(Integer, nullable=False)
    transaction_hash = Column(String, unique=True, nullable=False)

    
    pledges = relationship("Pledge", back_populates="campaign")
    def __repr__(self):
        return f"<Campaign(id={self.campaign_id}, creator={self.creator}, goal={self.goal_amount})>"
    
class Pledge(Base):
    __tablename__ = "pledges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String, ForeignKey("campaigns.campaign_id"), nullable=False, index=True)
    backer = Column(String, nullable=False, index=True)
    amount = Column(String, nullable=False)
    refunded = Column(Boolean, default=False)  # Explicit flag for refunds
    created_at_block = Column(Integer, nullable=False)
    transaction_hash = Column(String, unique=True, nullable=False)

    campaign = relationship("Campaign", back_populates="pledges")

    def __repr__(self):
        return f"<Pledge(campaign_id={self.campaign_id}, backer={self.backer}, amount={self.amount})>"    