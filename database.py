import os 
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base , sessionmaker
DB_NAME ="crowdfunding.db"
DATABASE_URL = f"sqlite:///{DB_NAME}"
engine = create_engine(DATABASE_URL, echo = False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush= False, bind=engine)
Base = declarative_base()
def init_db():
    import models
    Base.metadata.create_all(bind=engine)
