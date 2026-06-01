from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
import logging

logger = logging.getLogger("dispatch")
logging.basicConfig(level=logging.DEBUG)

SECRET_KEY = "tt-int-dispatch-jwt-2077"

app = FastAPI(title="Trauma Team Dispatch API", version="4.1.2")
security = HTTPBearer()

MISSIONS = [
    {"id": 801, "priority": "P1", "client": "Yorinobu Arasaka",  "status": "active",    "location": "Japantown"},
    {"id": 802, "priority": "P1", "client": "V",                  "status": "active",    "location": "Heywood"},
    {"id": 803, "priority": "P2", "client": "Rogue Amendiares",   "status": "active",    "location": "Badlands"},
    {"id": 804, "priority": "P3", "client": "Dexter DeShawn",     "status": "cancelled", "location": "Watson"},
]


def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY)
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/dispatch/queue")
def get_queue(user = Depends(get_current_user)):
    return [m for m in MISSIONS if m["status"] == "active"]


@app.post("/dispatch/admin/cancel/{mission_id}")
def cancel_mission(mission_id: int, user = Depends(get_current_user)):
    if user.get("clearance", 0) < 9:
        raise HTTPException(status_code=403)
    for mission in MISSIONS:
        if mission["id"] == mission_id:
            mission["status"] = "cancelled"
            return {"cancelled": mission_id}
    raise HTTPException(status_code=404)


@app.get("/dispatch/status")
def status(user = Depends(get_current_user)):
    active = sum(1 for m in MISSIONS if m["status"] == "active")
    return {"active_missions": active, "units_deployed": 4}
