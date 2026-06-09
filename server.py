import os
import json
import uvicorn
import datetime
import copy
from icats_engine import normalize_documents

def mask_aadhaar(aadhaar_str: str) -> str:
    if not aadhaar_str:
        return ""
    cleaned = aadhaar_str.replace("-", "").strip()
    if len(cleaned) == 12:
        return f"XXXX-XXXX-{cleaned[-4:]}"
    return "XXXX-XXXX-xxxx"

def mask_claim_details_for_role(claim_data: dict, role: str) -> dict:
    copied = copy.deepcopy(claim_data)
    claimant = copied.get("claim", {}).get("claimant", {})
    if claimant and "aadhaar" in claimant:
        if role != "claimant":
            claimant["aadhaar"] = mask_aadhaar(claimant["aadhaar"])
    return copied

ALLOWED_TRANSITIONS = {
    "SUBMITTED": ["UNDER_REVIEW"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED", "QUERY_RAISED"],
    "QUERY_RAISED": ["RESUBMITTED"],
    "RESUBMITTED": ["UNDER_REVIEW"],
    "APPROVED": [],
    "REJECTED": []
}
def transition_claim_status(claim, next_status: str, by: str):
    current_status = claim.get("status", "SUBMITTED").upper()
    next_status = next_status.upper()
    if current_status == next_status:
        return
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    if next_status not in allowed:
        raise ValueError(f"Invalid state transition: {current_status} -> {next_status}")
        
    if "state_history" not in claim:
        claim["state_history"] = [
            {"from": "INIT", "to": "SUBMITTED", "at": "05/11/2024 10:00:00", "by": "claimant"}
        ]
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    claim["state_history"].append({
        "from": current_status,
        "to": next_status,
        "at": now_str,
        "by": by
    })
    claim["status"] = next_status


from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import the rules engine from our TDD script
from icats_engine import evaluate_claim

app = FastAPI(title="ICATS - Insurance Claim Assistance & Tracking System API")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claims_db.json")

# ================= REQUEST / RESPONSE SCHEMAS =================
class LoginRequest(BaseModel):
    email: str
    password: str

class ClaimantModel(BaseModel):
    name: str
    relationship: str
    aadhaar: str
    phone: str
    address: str

class ClaimFormsModel(BaseModel):
    Form_A: bool = False
    Form_B: bool = False
    Form_C: bool = False

class BankDetailsModel(BaseModel):
    account_number: str
    ifsc: str
    bank_name: str
    name_on_cheque: str

class MedicalDetailsModel(BaseModel):
    hospital_discharge_summary: Optional[str] = None
    treating_doctor: Optional[str] = None
    underlying_disease: Optional[str] = None
    icd_code: Optional[str] = None
    hospitalization_history: Optional[str] = None

class InvestigationModel(BaseModel):
    investigation_status: Optional[str] = "NOT_APPLICABLE"
    police_final_report_status: Optional[str] = "NOT_APPLICABLE"
    accident_details: Optional[str] = None

class LegalStatusModel(BaseModel):
    nominee_verified: bool = False
    legal_heir_required: bool = False
    succession_certificate_status: Optional[str] = "NOT_REQUIRED"

class PolicyModel(BaseModel):
    policy_number: str
    commencement_date: str
    maturity_date: str
    sum_assured: float
    premium_paying_term_years: int
    premiums_paid_years: int
    nominee_name: str
    life_assured: str
    exclusions: List[str]
    last_premium_paid_date: Optional[str] = None
    policy_status: Optional[str] = "ACTIVE"

class DocumentModel(BaseModel):
    type: str
    url: str
    verification_status: str
    source: str
    uploaded_at: str

class ClaimModel(BaseModel):
    date_of_death: str
    cause_of_death: str
    place_of_death: str
    date_of_intimation: str
    submitted_documents: Optional[List[str]] = None
    documents: Optional[List[DocumentModel]] = None
    claimant: ClaimantModel
    claim_forms: ClaimFormsModel
    bank_details: BankDetailsModel
    medical_details: MedicalDetailsModel
    investigation: InvestigationModel
    legal_status: LegalStatusModel

class EvaluateRequest(BaseModel):
    policy: PolicyModel
    claim: ClaimModel

class SubmitClaimRequest(BaseModel):
    id: str
    policy: PolicyModel
    claim: ClaimModel

class DecisionRequest(BaseModel):
    case_id: str
    status: str

# ================= DATABASE OPERATIONS =================
MONGO_AVAILABLE = False
claims_col = None

try:
    import pymongo
    # Try to connect with a short timeout (1.5 seconds)
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=1500)
    # Check server availability
    client.server_info()
    db = client["icats_db"]
    claims_col = db["claims"]
    MONGO_AVAILABLE = True
    print("[INFO] Successfully connected to MongoDB. Using MongoDB storage.")
except Exception as e:
    MONGO_AVAILABLE = False
    print(f"[INFO] MongoDB connection failed or pymongo not installed ({e}). Falling back to JSON database.")

def load_db() -> List[Dict[str, Any]]:
    mock_initial = [
        {
            "id": "CASE-001",
            "status": "UNDER_REVIEW",
            "trackingId": "CLM-2026-8273-9021",
            "policy": {
                "policy_number": "502918273",
                "commencement_date": "15/01/2024",
                "maturity_date": "15/01/2039",
                "sum_assured": 2500000.0,
                "premium_paying_term_years": 15,
                "premiums_paid_years": 1,
                "nominee_name": "Sunita Devi",
                "life_assured": "Harish Kumar",
                "exclusions": ["Suicide within 12 months"],
                "last_premium_paid_date": "15/01/2024",
                "policy_status": "ACTIVE"
            },
            "claim": {
                "date_of_death": "20/10/2024",
                "cause_of_death": "Chronic Kidney Disease (CKD) / Renal Failure",
                "place_of_death": "Sir Ganga Ram Hospital, Delhi",
                "date_of_intimation": "05/11/2024",
                "submitted_documents": ["Death_Certificate", "Cancelled_Cheque", "Medical_Records", "Nominee_Aadhaar"],
                "claimant": {
                    "name": "Sunita Devi",
                    "relationship": "Wife",
                    "aadhaar": "1234-5678-9012",
                    "phone": "9876543210",
                    "address": "A-12, Rajouri Garden, Delhi"
                },
                "claim_forms": {
                    "Form_A": True,
                    "Form_B": True,
                    "Form_C": True
                },
                "bank_details": {
                    "account_number": "1029384756",
                    "ifsc": "SBIN0001029",
                    "bank_name": "State Bank of India",
                    "name_on_cheque": "Sunita Devi"
                },
                "medical_details": {
                    "hospital_discharge_summary": "Dialysis started in Oct 2023. Deceased hospitalized for chronic kidney failure.",
                    "treating_doctor": "Dr. Ashok Seth",
                    "underlying_disease": "Chronic Kidney Disease (CKD)",
                    "icd_code": "N18.9",
                    "hospitalization_history": "Dialysis three times a week since October 2023."
                },
                "investigation": {
                    "investigation_status": "PENDING",
                    "police_final_report_status": "NOT_APPLICABLE",
                    "accident_details": ""
                },
                "legal_status": {
                    "nominee_verified": True,
                    "legal_heir_required": False,
                    "succession_certificate_status": "NOT_REQUIRED"
                }
            }
        },
        {
            "id": "CASE-002",
            "status": "QUERY_RAISED",
            "trackingId": "CLM-2026-1943-4210",
            "policy": {
                "policy_number": "783920194",
                "commencement_date": "10/05/2022",
                "maturity_date": "10/05/2037",
                "sum_assured": 5000000.0,
                "premium_paying_term_years": 15,
                "premiums_paid_years": 3,
                "nominee_name": "Rohan Patel",
                "life_assured": "Aarti Patel",
                "exclusions": ["Suicide within 12 months", "Hazardous sports without rider"],
                "last_premium_paid_date": "10/05/2024",
                "policy_status": "ACTIVE"
            },
            "claim": {
                "date_of_death": "12/08/2025",
                "cause_of_death": "Polytrauma due to Road Traffic Accident",
                "place_of_death": "National Highway 8, Gujarat",
                "date_of_intimation": "20/11/2025",
                "submitted_documents": ["Death_Certificate", "Cancelled_Cheque"],
                "claimant": {
                    "name": "Rohan Patel",
                    "relationship": "Son",
                    "aadhaar": "8877-6655-4433",
                    "phone": "9898989898",
                    "address": "Flat 302, Green Glen Layout, Bengaluru"
                },
                "claim_forms": {
                    "Form_A": True,
                    "Form_B": True,
                    "Form_C": False
                },
                "bank_details": {
                    "account_number": "9876543210",
                    "ifsc": "ICIC0000194",
                    "bank_name": "ICICI Bank",
                    "name_on_cheque": "Rohan Patel"
                },
                "medical_details": {
                    "hospital_discharge_summary": "Brought dead following head injury from vehicular crash.",
                    "treating_doctor": "Dr. Suresh Patel",
                    "underlying_disease": "Polytrauma / Road Crash",
                    "icd_code": "V89.2",
                    "hospitalization_history": "Declared dead on arrival."
                },
                "investigation": {
                    "investigation_status": "PENDING",
                    "police_final_report_status": "NOT_SUBMITTED",
                    "accident_details": "Vehicular crash on NH-8. Autopsy conducted."
                },
                "legal_status": {
                    "nominee_verified": True,
                    "legal_heir_required": False,
                    "succession_certificate_status": "NOT_REQUIRED"
                }
            }
        },
        {
            "id": "CASE-003",
            "status": "QUERY_RAISED",
            "trackingId": "CLM-2026-8475-1055",
            "policy": {
                "policy_number": "901238475",
                "commencement_date": "01/08/2018",
                "maturity_date": "01/08/2038",
                "sum_assured": 1500000.0,
                "premium_paying_term_years": 20,
                "premiums_paid_years": 7,
                "nominee_name": "Chitra Devi",
                "life_assured": "Manoj Pillai",
                "exclusions": [],
                "last_premium_paid_date": "01/08/2024",
                "policy_status": "ACTIVE"
            },
            "claim": {
                "date_of_death": "14/03/2025",
                "cause_of_death": "Cardiac Arrest",
                "place_of_death": "Resident, Kochi, Kerala",
                "date_of_intimation": "30/03/2025",
                "submitted_documents": ["Death_Certificate", "Cancelled_Cheque", "Nominee_Aadhaar"],
                "claimant": {
                    "name": "Chithra D. Pillai",
                    "relationship": "Wife",
                    "aadhaar": "4433-2211-9988",
                    "phone": "9447001122",
                    "address": "Pillai House, MG Road, Kochi"
                },
                "claim_forms": {
                    "Form_A": True,
                    "Form_B": True,
                    "Form_C": True
                },
                "bank_details": {
                    "account_number": "5544332211",
                    "ifsc": "SBIN0000847",
                    "bank_name": "State Bank of India",
                    "name_on_cheque": "Chithra D. Pillai"
                },
                "medical_details": {
                    "hospital_discharge_summary": "Patient suffered sudden cardiac arrest at residence.",
                    "treating_doctor": "Dr. K. Pillai",
                    "underlying_disease": "Cardiac Arrest",
                    "icd_code": "I46.9",
                    "hospitalization_history": "No major prior hospitalization history declared."
                },
                "investigation": {
                    "investigation_status": "NOT_APPLICABLE",
                    "police_final_report_status": "NOT_APPLICABLE",
                    "accident_details": ""
                },
                "legal_status": {
                    "nominee_verified": False,
                    "legal_heir_required": True,
                    "succession_certificate_status": "NOT_SUBMITTED"
                }
            }
        },
        {
            "id": "CASE-004",
            "status": "UNDER_REVIEW",
            "trackingId": "CLM-2026-8174-8842",
            "policy": {
                "policy_number": "603928174",
                "commencement_date": "01/10/2020",
                "maturity_date": "01/10/2035",
                "sum_assured": 3000000.0,
                "premium_paying_term_years": 15,
                "premiums_paid_years": 3,
                "nominee_name": "Geeta Sharma",
                "life_assured": "Ramesh Sharma",
                "exclusions": [],
                "last_premium_paid_date": "01/10/2023",
                "policy_status": "LAPSED"
            },
            "claim": {
                "date_of_death": "18/06/2025",
                "cause_of_death": "Multi-organ failure",
                "place_of_death": "Max Super Speciality Hospital, Delhi",
                "date_of_intimation": "10/07/2025",
                "submitted_documents": ["Death_Certificate", "Cancelled_Cheque", "Medical_Records"],
                "claimant": {
                    "name": "Geeta Sharma",
                    "relationship": "Wife",
                    "aadhaar": "9988-7766-5544",
                    "phone": "9811002233",
                    "address": "Sector 15, Rohini, Delhi"
                },
                "claim_forms": {
                    "Form_A": True,
                    "Form_B": True,
                    "Form_C": True
                },
                "bank_details": {
                    "account_number": "1122334455",
                    "ifsc": "HDFC0000603",
                    "bank_name": "HDFC Bank",
                    "name_on_cheque": "Geeta Sharma"
                },
                "medical_details": {
                    "hospital_discharge_summary": "Admitted with septic shock and liver dysfunction. Multi-organ failure ensued.",
                    "treating_doctor": "Dr. H. Sharma",
                    "underlying_disease": "Sepsis / Multi-organ failure",
                    "icd_code": "R68.8",
                    "hospitalization_history": "ICU stay for 10 days prior to death."
                },
                "investigation": {
                    "investigation_status": "NOT_APPLICABLE",
                    "police_final_report_status": "NOT_APPLICABLE",
                    "accident_details": ""
                },
                "legal_status": {
                    "nominee_verified": True,
                    "legal_heir_required": False,
                    "succession_certificate_status": "NOT_REQUIRED"
                }
            }
        },
        {
            "id": "CASE-005",
            "status": "REJECTED",
            "trackingId": "CLM-2026-3847-7312",
            "policy": {
                "policy_number": "410293847",
                "commencement_date": "15/02/2024",
                "maturity_date": "15/02/2044",
                "sum_assured": 4000000.0,
                "premium_paying_term_years": 20,
                "premiums_paid_years": 1,
                "nominee_name": "Lata Joshi",
                "life_assured": "Vinod Joshi",
                "exclusions": ["Suicide within 12 months of commencement / revival"],
                "last_premium_paid_date": "15/02/2024",
                "policy_status": "ACTIVE"
            },
            "claim": {
                "date_of_death": "10/11/2024",
                "cause_of_death": "Asphyxia due to Hanging (Suicide)",
                "place_of_death": "Residence, Pune, Maharashtra",
                "date_of_intimation": "20/11/2024",
                "submitted_documents": ["Death_Certificate", "Cancelled_Cheque", "FIR", "Post_Mortem_Report"],
                "claimant": {
                    "name": "Lata Joshi",
                    "relationship": "Mother",
                    "aadhaar": "7766-5544-3322",
                    "phone": "9822003344",
                    "address": "Kothrud, Pune"
                },
                "claim_forms": {
                    "Form_A": True,
                    "Form_B": True,
                    "Form_C": True
                },
                "bank_details": {
                    "account_number": "6677889900",
                    "ifsc": "BARB0PUNEXX",
                    "bank_name": "Bank of Baroda",
                    "name_on_cheque": "Lata Joshi"
                },
                "medical_details": {
                    "hospital_discharge_summary": "Autopsy report certified death as suicide by hanging.",
                    "treating_doctor": "Dr. R. Joshi",
                    "underlying_disease": "Asphyxia / Hanging",
                    "icd_code": "X70.0",
                    "hospitalization_history": "Declared dead at residence."
                },
                "investigation": {
                    "investigation_status": "COMPLETED",
                    "police_final_report_status": "SUBMITTED",
                    "accident_details": "Self-inflicted suicide by hanging. Certified by police report."
                },
                "legal_status": {
                    "nominee_verified": True,
                    "legal_heir_required": False,
                    "succession_certificate_status": "NOT_REQUIRED"
                }
            }
        }
    ]

    if MONGO_AVAILABLE:
        try:
            count = claims_col.count_documents({})
            if count == 0:
                claims_col.insert_many(mock_initial)
                return mock_initial
            return list(claims_col.find({}, {"_id": 0}))
        except Exception as e:
            print(f"[WARNING] MongoDB load failed: {e}. Falling back to JSON database.")

    if not os.path.exists(DB_PATH):
        # Initialize database with pre-loaded mock cases for testing
        save_db(mock_initial)
        return mock_initial
        
    with open(DB_PATH, "r") as f:
        return json.load(f)

def save_db(data: List[Dict[str, Any]]):
    if MONGO_AVAILABLE:
        try:
            claims_col.delete_many({})
            cleaned_data = []
            for doc in data:
                cleaned = doc.copy()
                cleaned.pop("_id", None)
                cleaned_data.append(cleaned)
            if cleaned_data:
                claims_col.insert_many(cleaned_data)
            return
        except Exception as e:
            print(f"[WARNING] MongoDB save failed: {e}. Falling back to JSON database.")

    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

# ================= API ENDPOINTS =================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    accounts = {
        "nominee@icats.in": {"role": "claimant", "name": "Sunita Devi", "subtitle": "Policy Nominee"},
        "agent@sbi.co.in": {"role": "intermediary", "name": "Ramesh Kumar", "subtitle": "SBI Branch Agent (Kochi)"},
        "assessor@lic.co.in": {"role": "insurer", "name": "A. K. Shastri", "subtitle": "LIC Claims Assessor"}
    }
    user = accounts.get(req.email)
    if not user or req.password != req.email.split("@")[0]:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user

@app.post("/api/claims/evaluate")
def evaluate(req: EvaluateRequest):
    policy_dict = req.policy.dict()
    claim_dict = req.claim.dict()
    result = evaluate_claim(policy_dict, claim_dict)
    return result

@app.post("/api/claims/submit")
def submit(req: SubmitClaimRequest):
    db = load_db()
    
    # Generate custom tracking ID
    tracking_id = f"CLM-2026-{req.policy.policy_number[-4:]}-{1000 + len(db)}"
    
    new_claim = {
        "id": req.id,
        "status": "SUBMITTED",
        "trackingId": tracking_id,
        "policy": req.policy.dict(),
        "claim": req.claim.dict()
    }
    
    # Replace existing or insert new
    db = [c for c in db if c["id"] != req.id]
    db.append(new_claim)
    save_db(db)
    
    return {"status": "SUBMITTED", "trackingId": tracking_id}

@app.get("/api/claims/branch")
def get_branch_claims(role: str = "intermediary"):
    db = load_db()
    return [mask_claim_details_for_role(c, role) for c in db]

@app.get("/api/claims/queue")
def get_queue_claims(role: str = "insurer"):
    db = load_db()
    return [mask_claim_details_for_role(c, role) for c in db]

@app.post("/api/claims/decision")
def post_decision(req: DecisionRequest):
    db = load_db()
    claim = next((c for c in db if c["id"] == req.case_id), None)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    next_status = req.status.upper()
    try:
        transition_claim_status(claim, next_status, "assessor")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Under mock triggers, if agent clears queries by uploading reports:
    if next_status == "APPROVED" and claim["id"] == "CASE-002":
        if "FIR" not in claim["claim"].get("submitted_documents", []):
            if "submitted_documents" not in claim["claim"]:
                claim["claim"]["submitted_documents"] = []
            claim["claim"]["submitted_documents"].append("FIR")
        if "Post_Mortem_Report" not in claim["claim"].get("submitted_documents", []):
            claim["claim"]["submitted_documents"].append("Post_Mortem_Report")
            
        claim["claim"]["claim_forms"]["Form_C"] = True
        claim["claim"]["investigation"]["police_final_report_status"] = "SUBMITTED"
        
    # Re-evaluate rules engine output
    eval_res = evaluate_claim(claim["policy"], claim["claim"])
    claim["rules"] = eval_res["rules"]
    claim["risk"] = eval_res["risk"]
    claim["fraud_flags"] = eval_res["fraud_flags"]
    claim["sla"] = eval_res["sla"]
    claim["explainability"] = eval_res["explainability"]
    claim["payout"] = eval_res["payout"]
    claim["claim"]["documents"] = eval_res["documents"]
            
    save_db(db)
    return {"status": next_status}

class AgentRunRequest(BaseModel):
    role: str
    case_id: Optional[str] = None

@app.post("/api/agents/run")
def run_agent(req: AgentRunRequest):
    db = load_db()
    logs = []
    
    if req.role == "claimant":
        logs.append("[Claimant Agent] Initializing automated claim intake procedure...")
        case_id = req.case_id or "CASE-001"
        claim_data = next((c for c in db if c["id"] == case_id), None)
        if not claim_data:
            claim_data = next((c for c in load_db() if c["id"] == "CASE-001"), None)
            
        logs.append(f"[Claimant Agent] Step 1: Querying Municipal Registry API for death cert of {claim_data['policy']['life_assured']}...")
        logs.append(f"[Claimant Agent] Step 2: Certified Death Certificate downloaded (Date of Death: {claim_data['claim']['date_of_death']})")
        logs.append(f"[Claimant Agent] Step 3: Verifying claimant KYC biometric match with Aadhaar registries...")
        logs.append(f"[Claimant Agent] Step 4: Connecting to beneficiary savings bank account registry (IFSC: {claim_data['claim']['bank_details']['ifsc']})...")
        logs.append("[Claimant Agent] Step 5: Executing mandatory claim statement checklists (Forms A, B, C)...")
        
        # Ensure documents are registered as uploaded
        for doc in ["Death_Certificate", "Cancelled_Cheque"]:
            if doc not in claim_data["claim"].get("submitted_documents", []):
                if "submitted_documents" not in claim_data["claim"]:
                    claim_data["claim"]["submitted_documents"] = []
                claim_data["claim"]["submitted_documents"].append(doc)
                
        # Ensure Form A, B, C checks are marked True
        claim_data["claim"]["claim_forms"]["Form_A"] = True
        claim_data["claim"]["claim_forms"]["Form_B"] = True
        claim_data["claim"]["claim_forms"]["Form_C"] = True
        
        logs.append("[Claimant Agent] Step 6: Invoking rules engine to audit checklists...")
        evaluation = evaluate_claim(claim_data["policy"], claim_data["claim"])
        
        logs.append(f"[Claimant Agent] Rules Audit Result: Status evaluates to {evaluation['status']} (Risk score: {evaluation['risk']['total_score']})")
        
        tracking_id = f"CLM-2026-{claim_data['policy']['policy_number'][-4:]}-{1000 + len(db)}"
        claim_data["status"] = "SUBMITTED"
        claim_data["trackingId"] = tracking_id
        
        # Initialize state history
        claim_data["state_history"] = [
            {"from": "INIT", "to": "SUBMITTED", "at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"), "by": "claimant"}
        ]
        
        # Save evaluation variables
        claim_data["rules"] = evaluation["rules"]
        claim_data["risk"] = evaluation["risk"]
        claim_data["fraud_flags"] = evaluation["fraud_flags"]
        claim_data["sla"] = evaluation["sla"]
        claim_data["explainability"] = evaluation["explainability"]
        claim_data["payout"] = evaluation["payout"]
        claim_data["claim"]["documents"] = evaluation["documents"]
        
        db = [c for c in db if c["id"] != claim_data["id"]]
        db.append(claim_data)
        save_db(db)
        
        logs.append(f"[Claimant Agent] Claim registered successfully! Generated Tracking ID: {tracking_id}")
        
    elif req.role == "intermediary":
        logs.append("[Bank Agent] Launching branch directory automated resolution task...")
        resolved_count = 0
        for claim in db:
            evaluation = evaluate_claim(claim["policy"], claim["claim"])
            
            # Transition from QUERY_RAISED to RESUBMITTED
            if claim["status"] == "QUERY_RAISED":
                logs.append(f"[Bank Agent] Auditing Case {claim['id']} (Deceased: {claim['policy']['life_assured']}). Detected Query: {claim['explainability']['summary']}.")
                
                is_accidental = "accident" in claim["claim"]["cause_of_death"].lower()
                if is_accidental:
                    logs.append("[Bank Agent] Querying State Highway Police Portal API for crash coordinates on NH-8...")
                    logs.append("[Bank Agent] Successfully downloaded certified copies of FIR (Section 174 CrPC) and Post-Mortem Report.")
                    
                    if "submitted_documents" not in claim["claim"]:
                        claim["claim"]["submitted_documents"] = []
                    for doc in ["FIR", "Post_Mortem_Report"]:
                        if doc not in claim["claim"]["submitted_documents"]:
                            claim["claim"]["submitted_documents"].append(doc)
                    
                    claim["claim"]["claim_forms"]["Form_C"] = True
                    claim["claim"]["investigation"]["police_final_report_status"] = "SUBMITTED"
                    
                else:
                    logs.append("[Bank Agent] Querying branch biometric database to verify depositor KYC match...")
                    logs.append("[Bank Agent] Biometric cross-match successful. Generated name mismatch correction certificate.")
                    if "submitted_documents" not in claim["claim"]:
                        claim["claim"]["submitted_documents"] = []
                    if "Nominee_Aadhaar" not in claim["claim"]["submitted_documents"]:
                        claim["claim"]["submitted_documents"].append("Nominee_Aadhaar")
                    
                    claim["claim"]["legal_status"]["nominee_verified"] = True
                    claim["claim"]["bank_details"]["name_match_status"] = "FUZZY_MATCH_WARNING"
                
                # Re-evaluate
                new_eval = evaluate_claim(claim["policy"], claim["claim"])
                claim["rules"] = new_eval["rules"]
                claim["risk"] = new_eval["risk"]
                claim["fraud_flags"] = new_eval["fraud_flags"]
                claim["sla"] = new_eval["sla"]
                claim["explainability"] = new_eval["explainability"]
                claim["payout"] = new_eval["payout"]
                claim["claim"]["documents"] = new_eval["documents"]
                
                # Enforce state machine transition
                try:
                    transition_claim_status(claim, "RESUBMITTED", "agent")
                    logs.append(f"[Bank Agent] Uploaded documents and resolved discrepancies. Case {claim['id']} status updated to RESUBMITTED.")
                    resolved_count += 1
                except ValueError as e:
                    logs.append(f"[Bank Agent] Transition error for Case {claim['id']}: {str(e)}")
                
        if resolved_count > 0:
            save_db(db)
            logs.append(f"[Bank Agent] Automation task complete. Resolved {resolved_count} branch queries.")
        else:
            logs.append("[Bank Agent] No outstanding branch queries found.")
            
    elif req.role == "insurer":
        logs.append("[Assessor Agent] Starting automated underwriting queue triage...")
        approved_count = 0
        referred_count = 0
        
        for claim in db:
            if claim["status"] in ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"]:
                logs.append(f"[Assessor Agent] Auditing Claim {claim['trackingId']} (Life Assured: {claim['policy']['life_assured']})...")
                
                # First transition from SUBMITTED or RESUBMITTED to UNDER_REVIEW
                if claim["status"] in ["SUBMITTED", "RESUBMITTED"]:
                    try:
                        transition_claim_status(claim, "UNDER_REVIEW", "assessor")
                        logs.append(f"[Assessor Agent] Claim status transitioned to UNDER_REVIEW for audit.")
                    except ValueError as e:
                        logs.append(f"[Assessor Agent] Transition error for Claim {claim['trackingId']}: {str(e)}")
                        continue
                
                evaluation = evaluate_claim(claim["policy"], claim["claim"])
                
                claim["rules"] = evaluation["rules"]
                claim["risk"] = evaluation["risk"]
                claim["fraud_flags"] = evaluation["fraud_flags"]
                claim["sla"] = evaluation["sla"]
                claim["explainability"] = evaluation["explainability"]
                claim["payout"] = evaluation["payout"]
                claim["claim"]["documents"] = evaluation["documents"]
                
                # Derive final transition from rules engine status
                eval_status = evaluation["status"]
                
                # Map engine status to database status
                if eval_status == "READY":
                    target_status = "APPROVED"
                elif eval_status == "LAPSED_PAID_UP":
                    target_status = "APPROVED"
                elif eval_status == "REJECTED" or eval_status == "EXCLUDED_CLAIM":
                    target_status = "REJECTED"
                elif eval_status == "QUERY_RAISED" or eval_status == "FLAGGED_DISCREPANCY" or eval_status == "MISSING_MANDATORY_DOCUMENTS":
                    target_status = "QUERY_RAISED"
                else:
                    target_status = "UNDER_REVIEW"
                    
                try:
                    transition_claim_status(claim, target_status, "assessor")
                    logs.append(f"[Assessor Agent] Audit complete. Action: {target_status}. Reason: {evaluation['explainability']['summary']}")
                    if target_status == "APPROVED":
                        approved_count += 1
                    else:
                        referred_count += 1
                except ValueError as e:
                    logs.append(f"[Assessor Agent] Transition error executing decision: {str(e)}")
                    
        if approved_count > 0 or referred_count > 0:
            save_db(db)
            logs.append(f"[Assessor Agent] Triage complete. Approved: {approved_count}, Queried/Rejected: {referred_count}.")
        else:
            logs.append("[Assessor Agent] No pending claims in queue.")
            
    return {"logs": logs}

# ================= SERVE STATIC FRONTEND FILES =================

# Serve static app assets
static_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def get_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/style.css")
def get_css():
    return FileResponse(os.path.join(static_dir, "style.css"))

@app.get("/app.js")
def get_js():
    return FileResponse(os.path.join(static_dir, "app.js"))

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
