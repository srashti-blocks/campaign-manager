from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from database import SessionLocal
from models import Campaign, Pledge

app = FastAPI(title="Crowdfunding Indexer API", version="1.0")

# CORS Fix: Set allow_credentials=False since public read endpoints use no cookies/sessions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class CampaignResponse(BaseModel):
    campaign_id: str
    creator: str
    goal_amount: str
    total_pledged: str
    deadline: int
    is_successful: bool
    withdrawn: bool
    metadata_uri: Optional[str] = None  # Handled: Safe against DB NULL values
    created_at_block: int
    transaction_hash: str

    class Config:
        from_attributes = True

class PaginatedCampaignsResponse(BaseModel):
    skip: int
    limit: int
    total: int
    campaigns: List[CampaignResponse]

class PledgeResponse(BaseModel):
    backer: str
    amount: str
    refunded: bool
    created_at_block: int
    transaction_hash: str

    class Config:
        from_attributes = True

class CampaignDetailResponse(BaseModel):
    campaign: CampaignResponse
    pledges: List[PledgeResponse]


# --- Endpoints ---

@app.get("/campaigns", response_model=PaginatedCampaignsResponse)
def get_campaigns(
    skip: int = Query(0, ge=0, description="Number of campaigns to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max number of campaigns to return")
):
    """Fetches paginated campaigns with total count and full Pydantic validation."""
    with SessionLocal() as session:
        total_count = session.query(Campaign).count()
        campaigns = session.query(Campaign).offset(skip).limit(limit).all()
        
        return {
            "skip": skip,
            "limit": limit,
            "total": total_count,
            "campaigns": [CampaignResponse.model_validate(c) for c in campaigns]
        }

@app.get("/campaigns/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign_detail(campaign_id: str):
    """Fetches details and pledges for a specific campaign by ID."""
    with SessionLocal() as session:
        campaign = session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        pledges = session.query(Pledge).filter_by(campaign_id=campaign_id).all()
        
        return {
            "campaign": CampaignResponse.model_validate(campaign),
            "pledges": [PledgeResponse.model_validate(p) for p in pledges]
        }