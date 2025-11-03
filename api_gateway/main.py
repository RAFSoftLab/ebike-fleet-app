from fastapi import FastAPI
from api_gateway.core.database import Base, engine
from api_gateway.routers import auth_router

app = FastAPI(title="eBike Fleet Management API")

Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])

@app.get("/")
def root():
    return {"message": "eBike Fleet Management API is running 🚴‍♂️"}
