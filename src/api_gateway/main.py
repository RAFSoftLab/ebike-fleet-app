from fastapi import FastAPI
from api_gateway.core.database import Base, engine
from api_gateway.routers import auth_router
from api_gateway.routers import fleet_router

app = FastAPI(title="eBike Fleet Management API")

app.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])
app.include_router(fleet_router.router, prefix="/fleet", tags=["Fleet"])

@app.get("/")
def root():
    return {"message": "eBike Fleet Management API is running."}
