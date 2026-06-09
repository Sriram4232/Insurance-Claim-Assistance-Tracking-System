// ================= GLOBAL APP STATE =================
let currentStep = 1;
let activeClaim = null;
let simulatedState = 'SUBMITTED';
let loggedInUser = null;
let serverClaimsStore = []; // fetched dynamically from FastAPI

// Sourced directly from our 5 real-world legal and ombudsman disputes
const MOCK_CASES = {
    "CASE-001": {
        id: "CASE-001",
        title: "Early Claim with Pre-Existing Medical History",
        source_citation: "Office of the Insurance Ombudsman, Delhi - Case Award DEL-L-012-2122-0051",
        policy: {
            policy_number: "502918273",
            commencement_date: "15/01/2024",
            maturity_date: "15/01/2039",
            sum_assured: 2500000.0,
            premium_paying_term_years: 15,
            premiums_paid_years: 1,
            nominee_name: "Sunita Devi",
            life_assured: "Harish Kumar",
            exclusions: ["Suicide within 12 months"],
            last_premium_paid_date: "15/01/2024",
            policy_status: "ACTIVE"
        },
        claim: {
            date_of_death: "20/10/2024",
            cause_of_death: "Chronic Kidney Disease (CKD) / Renal Failure",
            place_of_death: "Sir Ganga Ram Hospital, Delhi",
            date_of_intimation: "05/11/2024",
            submitted_documents: ["Death_Certificate", "Cancelled_Cheque", "Medical_Records", "Nominee_Aadhaar"],
            claimant: {
                name: "Sunita Devi",
                relationship: "Wife",
                aadhaar: "1234-5678-9012",
                phone: "9876543210",
                address: "A-12, Rajouri Garden, Delhi"
            },
            claim_forms: {
                Form_A: true,
                Form_B: true,
                Form_C: true
            },
            bank_details: {
                account_number: "1029384756",
                ifsc: "SBIN0001029",
                bank_name: "State Bank of India",
                name_on_cheque: "Sunita Devi"
            },
            medical_details: {
                hospital_discharge_summary: "Dialysis started in Oct 2023. Deceased hospitalized for chronic kidney failure.",
                treating_doctor: "Dr. Ashok Seth",
                underlying_disease: "Chronic Kidney Disease (CKD)",
                icd_code: "N18.9",
                hospitalization_history: "Dialysis three times a week since October 2023."
            },
            investigation: {
                investigation_status: "PENDING",
                police_final_report_status: "NOT_APPLICABLE",
                accident_details: ""
            },
            legal_status: {
                nominee_verified: true,
                legal_heir_required: false,
                succession_certificate_status: "NOT_REQUIRED"
            }
        }
    },
    "CASE-002": {
        id: "CASE-002",
        title: "Accidental Death with Delay in Police Reports",
        source_citation: "Consumer Disputes Redressal Commission (CDRC) - Judgement in FA/12/304",
        policy: {
            policy_number: "783920194",
            commencement_date: "10/05/2022",
            maturity_date: "10/05/2037",
            sum_assured: 5000000.0,
            premium_paying_term_years: 15,
            premiums_paid_years: 3,
            nominee_name: "Rohan Patel",
            life_assured: "Aarti Patel",
            exclusions: ["Suicide within 12 months", "Hazardous sports without rider"],
            last_premium_paid_date: "10/05/2024",
            policy_status: "ACTIVE"
        },
        claim: {
            date_of_death: "12/08/2025",
            cause_of_death: "Polytrauma due to Road Traffic Accident",
            place_of_death: "National Highway 8, Gujarat",
            date_of_intimation: "20/11/2025",
            submitted_documents: ["Death_Certificate", "Cancelled_Cheque"],
            claimant: {
                name: "Rohan Patel",
                relationship: "Son",
                aadhaar: "8877-6655-4433",
                phone: "9898989898",
                address: "Flat 302, Green Glen Layout, Bengaluru"
            },
            claim_forms: {
                Form_A: true,
                Form_B: true,
                Form_C: false
            },
            bank_details: {
                account_number: "9876543210",
                ifsc: "ICIC0000194",
                bank_name: "ICICI Bank",
                name_on_cheque: "Rohan Patel"
            },
            medical_details: {
                hospital_discharge_summary: "Brought dead following head injury from vehicular crash.",
                treating_doctor: "Dr. Suresh Patel",
                underlying_disease: "Polytrauma / Road Crash",
                icd_code: "V89.2",
                hospitalization_history: "Declared dead on arrival."
            },
            investigation: {
                investigation_status: "PENDING",
                police_final_report_status: "NOT_SUBMITTED",
                accident_details: "Vehicular crash on NH-8. Autopsy conducted."
            },
            legal_status: {
                nominee_verified: true,
                legal_heir_required: false,
                succession_certificate_status: "NOT_REQUIRED"
            }
        }
    },
    "CASE-003": {
        id: "CASE-003",
        title: "Nominee Name Spelling Mismatch on Bank Cheque",
        source_citation: "Grievance Cell Standard Resolution Procedures for Nominee Name Discrepancy",
        policy: {
            policy_number: "901238475",
            commencement_date: "01/08/2018",
            maturity_date: "01/08/2038",
            sum_assured: 1500000.0,
            premium_paying_term_years: 20,
            premiums_paid_years: 7,
            nominee_name: "Chitra Devi",
            life_assured: "Manoj Pillai",
            exclusions: [],
            last_premium_paid_date: "01/08/2024",
            policy_status: "ACTIVE"
        },
        claim: {
            date_of_death: "14/03/2025",
            cause_of_death: "Cardiac Arrest",
            place_of_death: "Resident, Kochi, Kerala",
            date_of_intimation: "30/03/2025",
            submitted_documents: ["Death_Certificate", "Cancelled_Cheque", "Nominee_Aadhaar"],
            claimant: {
                name: "Chithra D. Pillai",
                relationship: "Wife",
                aadhaar: "4433-2211-9988",
                phone: "9447001122",
                address: "Pillai House, MG Road, Kochi"
            },
            claim_forms: {
                Form_A: true,
                Form_B: true,
                Form_C: true
            },
            bank_details: {
                account_number: "5544332211",
                ifsc: "SBIN0000847",
                bank_name: "State Bank of India",
                name_on_cheque: "Chithra D. Pillai"
            },
            medical_details: {
                hospital_discharge_summary: "Patient suffered sudden cardiac arrest at residence.",
                treating_doctor: "Dr. K. Pillai",
                underlying_disease: "Cardiac Arrest",
                icd_code: "I46.9",
                hospitalization_history: "No major prior hospitalization history declared."
            },
            investigation: {
                investigation_status: "NOT_APPLICABLE",
                police_final_report_status: "NOT_APPLICABLE",
                accident_details: ""
            },
            legal_status: {
                nominee_verified: false,
                legal_heir_required: true,
                succession_certificate_status: "NOT_SUBMITTED"
            }
        }
    },
    "CASE-004": {
        id: "CASE-004",
        title: "Claim on Lapsed Policy under Reduced Paid-Up Rules",
        source_citation: "Insurance Act, 1938 Section 113 & IRDAI Non-Forfeiture Regulations",
        policy: {
            policy_number: "603928174",
            commencement_date: "01/10/2020",
            maturity_date: "01/10/2035",
            sum_assured: 3000000.0,
            premium_paying_term_years: 15,
            premiums_paid_years: 3,
            nominee_name: "Geeta Sharma",
            life_assured: "Ramesh Sharma",
            exclusions: [],
            last_premium_paid_date: "01/10/2023",
            policy_status: "LAPSED"
        },
        claim: {
            date_of_death: "18/06/2025",
            cause_of_death: "Multi-organ failure",
            place_of_death: "Max Super Speciality Hospital, Delhi",
            date_of_intimation: "10/07/2025",
            submitted_documents: ["Death_Certificate", "Cancelled_Cheque", "Medical_Records"],
            claimant: {
                name: "Geeta Sharma",
                relationship: "Wife",
                aadhaar: "9988-7766-5544",
                phone: "9811002233",
                address: "Sector 15, Rohini, Delhi"
            },
            claim_forms: {
                Form_A: true,
                Form_B: true,
                Form_C: true
            },
            bank_details: {
                account_number: "1122334455",
                ifsc: "HDFC0000603",
                bank_name: "HDFC Bank",
                name_on_cheque: "Geeta Sharma"
            },
            medical_details: {
                hospital_discharge_summary: "Admitted with septic shock and liver dysfunction. Multi-organ failure ensued.",
                treating_doctor: "Dr. H. Sharma",
                underlying_disease: "Sepsis / Multi-organ failure",
                icd_code: "R68.8",
                hospitalization_history: "ICU stay for 10 days prior to death."
            },
            investigation: {
                investigation_status: "NOT_APPLICABLE",
                police_final_report_status: "NOT_APPLICABLE",
                accident_details: ""
            },
            legal_status: {
                nominee_verified: true,
                legal_heir_required: false,
                succession_certificate_status: "NOT_REQUIRED"
            }
        }
    },
    "CASE-005": {
        id: "CASE-005",
        title: "Early Claim Excluded by Suicide Clause (Within 1 Year)",
        source_citation: "Standard Life Insurance Policy Exclusions - Suicide Clause (IRDAI Approved Guidelines)",
        policy: {
            policy_number: "410293847",
            commencement_date: "15/02/2024",
            maturity_date: "15/02/2044",
            sum_assured: 4000000.0,
            premium_paying_term_years: 20,
            premiums_paid_years: 1,
            nominee_name: "Lata Joshi",
            life_assured: "Vinod Joshi",
            exclusions: ["Suicide within 12 months of commencement / revival"],
            last_premium_paid_date: "15/02/2024",
            policy_status: "ACTIVE"
        },
        claim: {
            date_of_death: "10/11/2024",
            cause_of_death: "Asphyxia due to Hanging (Suicide)",
            place_of_death: "Residence, Pune, Maharashtra",
            date_of_intimation: "20/11/2024",
            submitted_documents: ["Death_Certificate", "Cancelled_Cheque", "FIR", "Post_Mortem_Report"],
            claimant: {
                name: "Lata Joshi",
                relationship: "Mother",
                aadhaar: "7766-5544-3322",
                phone: "9822003344",
                address: "Kothrud, Pune"
            },
            claim_forms: {
                Form_A: true,
                Form_B: true,
                Form_C: true
            },
            bank_details: {
                account_number: "6677889900",
                ifsc: "BARB0PUNEXX",
                bank_name: "Bank of Baroda",
                name_on_cheque: "Lata Joshi"
            },
            medical_details: {
                hospital_discharge_summary: "Autopsy report certified death as suicide by hanging.",
                treating_doctor: "Dr. R. Joshi",
                underlying_disease: "Asphyxia / Hanging",
                icd_code: "X70.0",
                hospitalization_history: "Declared dead at residence."
            },
            investigation: {
                investigation_status: "COMPLETED",
                police_final_report_status: "SUBMITTED",
                accident_details: "Self-inflicted suicide by hanging. Certified by police report."
            },
            legal_status: {
                nominee_verified: true,
                legal_heir_required: false,
                succession_certificate_status: "NOT_REQUIRED"
            }
        }
    }
};

// ================= APP INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupDropzones();
    
    // Default loader credentials setting for ease of login
    fillCreds("nominee@icats.in", "nominee");
});

// Sidebar navigation toggle
function setupNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    const sections = document.querySelectorAll(".workspace-section");
    
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = item.getAttribute("data-target");
            
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            sections.forEach(sec => sec.classList.remove("active"));
            const targetSec = document.getElementById(targetId);
            if (targetSec) targetSec.classList.add("active");
            
            // Customize top bar titles
            const mainTitle = document.getElementById("section-title");
            const mainSubtitle = document.getElementById("section-subtitle");
            
            if (targetId === "wizard-section") {
                mainTitle.innerText = "New Claim Assistance";
                mainSubtitle.innerText = "Follow the steps to validate policy details and submit death claims";
            } else if (targetId === "tracker-section") {
                mainTitle.innerText = "Claim Status Tracker";
                mainSubtitle.innerText = "Track your submitted claim file in real-time";
            } else if (targetId === "affidavit-section") {
                mainTitle.innerText = "One and the Same Person Certificate";
                mainSubtitle.innerText = "Execute an identity declaration on non-judicial stamp paper";
            } else if (targetId === "branch-section") {
                mainTitle.innerText = "Branch Claims Directory";
                mainSubtitle.innerText = "Manage life claims registered by depositors at this branch";
                renderIntermediaryBranchList(); // Refresh lists
            } else if (targetId === "inbox-section") {
                mainTitle.innerText = "Assessment Inbox";
                mainSubtitle.innerText = "Review submitted claim dossiers and trigger decision actions";
                renderInsurerInboxList(); // Refresh lists
            } else if (targetId === "certificate-section") {
                mainTitle.innerText = "Disbursal Certificates";
                mainSubtitle.innerText = "Clearance certificates generated for the beneficiary bank";
            }
        });
    });
}

function setupDropzones() {
    const dropzones = ["policy-file-dropzone", "death-file-dropzone"];
    dropzones.forEach(id => {
        const zone = document.getElementById(id);
        if (!zone) return;
        
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            zone.style.borderColor = "var(--color-primary)";
        });
        
        zone.addEventListener("dragleave", () => {
            zone.style.borderColor = "var(--border-glass)";
        });
        
        zone.addEventListener("drop", (e) => {
            e.preventDefault();
            zone.style.borderColor = "var(--border-glass)";
            alert("File parsed successfully! System extracted metadata variables.");
            if (id === "policy-file-dropzone") {
                document.getElementById("policy-file-info").style.display = "flex";
            } else {
                document.getElementById("death-file-info").style.display = "flex";
            }
            runEvaluation();
        });
        
        zone.addEventListener("click", () => {
            if (id === "policy-file-dropzone") {
                document.getElementById("policy-file-info").style.display = "flex";
            } else {
                document.getElementById("death-file-info").style.display = "flex";
            }
            runEvaluation();
        });
    });
}

// ================= AUTHENTICATION CONTROLLER (SERVER API) =================
function fillCreds(email, password) {
    document.getElementById("login-email").value = email;
    document.getElementById("login-password").value = password;
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    
    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        if (!res.ok) {
            alert("Authentication failed! Please check credentials.");
            return;
        }
        
        const account = await res.json();
        loggedInUser = account;
        
        // Set UI Class configuration on body tag
        document.body.className = `role-${account.role}`;
        
        // Fill top bar profile details
        document.getElementById("user-display-name").innerText = account.name;
        document.getElementById("user-display-role").innerText = account.subtitle;
        document.getElementById("role-subtitle").innerText = account.subtitle;
        
        // Remove login cover overlay
        document.getElementById("login-overlay").style.display = "none";
        
        // Render role-specific directories & dashboards
        if (account.role === "claimant") {
            document.getElementById("menu-wizard").click();
            loadCase("CASE-001");
        } else if (account.role === "intermediary") {
            document.getElementById("menu-branch").click();
        } else if (account.role === "insurer") {
            document.getElementById("menu-inbox").click();
        }
        
    } catch (err) {
        console.error("Login Error:", err);
        alert("Error connecting to server!");
    }
}

function handleLogout() {
    loggedInUser = null;
    document.body.className = "role-none";
    document.getElementById("login-overlay").style.display = "flex";
    fillCreds("nominee@icats.in", "nominee");
    
    // Clear and reset the automated agent console states
    const consoleLogs = document.getElementById("agent-console-logs");
    if (consoleLogs) consoleLogs.innerHTML = "";
    
    const consolePane = document.getElementById("agent-console-pane");
    if (consolePane) consolePane.style.display = "none";
    
    const chk = document.getElementById("agent-mode-checkbox");
    if (chk) chk.checked = false;
    
    toggleAgentMode();
}

// ================= LOAD MOCK CASES =================
function loadCase(caseId) {
    const data = MOCK_CASES[caseId];
    if (!data) return;
    
    // Highlight case button
    document.querySelectorAll(".btn-case").forEach(btn => btn.classList.remove("active"));
    const selectedBtn = Array.from(document.querySelectorAll(".btn-case")).find(b => b.textContent.includes(caseId.replace("CASE-00", "")));
    if (selectedBtn) selectedBtn.classList.add("active");
    
    activeClaim = JSON.parse(JSON.stringify(data)); // deep copy
    
    // Fill Policy Inputs
    document.getElementById("policy-no").value = data.policy.policy_number;
    document.getElementById("life-assured").value = data.policy.life_assured;
    document.getElementById("nominee-name").value = data.policy.nominee_name;
    document.getElementById("sum-assured").value = data.policy.sum_assured;
    document.getElementById("commencement-date").value = data.policy.commencement_date;
    document.getElementById("premium-paying-term").value = data.policy.premium_paying_term_years;
    document.getElementById("premiums-paid").value = data.policy.premiums_paid_years;
    document.getElementById("policy-status").value = data.policy.policy_status || "ACTIVE";
    document.getElementById("policy-last-premium-date").value = data.policy.last_premium_paid_date || "";
    
    // Fill Claim Inputs
    document.getElementById("cause-of-death").value = data.claim.cause_of_death;
    document.getElementById("date-of-death").value = data.claim.date_of_death;
    
    // Fill Claimant profile inputs
    const claimant = data.claim.claimant || {};
    document.getElementById("claimant-name").value = claimant.name || "";
    document.getElementById("claimant-relationship").value = claimant.relationship || "Wife";
    document.getElementById("claimant-aadhaar").value = claimant.aadhaar || "";
    document.getElementById("claimant-phone").value = claimant.phone || "";
    document.getElementById("claimant-address").value = claimant.address || "";
    
    // Fill Bank details inputs
    const bank = data.claim.bank_details || {};
    document.getElementById("bank-acc-num").value = bank.account_number || "";
    document.getElementById("bank-ifsc").value = bank.ifsc || "";
    document.getElementById("bank-name").value = bank.bank_name || "";
    document.getElementById("bank-cheque-name").value = bank.name_on_cheque || "";
    
    // Fill Clinical profile inputs
    const med = data.claim.medical_details || {};
    document.getElementById("med-treating-doctor").value = med.treating_doctor || "";
    document.getElementById("med-chronic-disease").value = med.underlying_disease || "";
    document.getElementById("med-icd-code").value = med.icd_code || "";
    document.getElementById("med-hospital-summary").value = med.hospitalization_history || "";
    
    // Fill Checklist Checkboxes
    const forms = data.claim.claim_forms || {};
    document.getElementById("form-check-a").checked = !!forms.Form_A;
    document.getElementById("form-check-b").checked = !!forms.Form_B;
    document.getElementById("form-check-c").checked = !!forms.Form_C;
    
    // Set mock upload states visual checkmarks
    document.getElementById("policy-file-info").style.display = "flex";
    document.getElementById("death-file-info").style.display = "flex";
    
    // Move to step 1
    goToStep(1);
    
    // Run evaluation engine to populate step data
    runEvaluation();
}

// ================= STEP NAVIGATION CONTROLLER =================
function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 5) return;
    currentStep = stepNum;
    
    // Update Stepper Visual Nodes
    document.querySelectorAll(".step").forEach(step => {
        const sVal = parseInt(step.getAttribute("data-step"));
        step.classList.remove("active", "completed");
        if (sVal === stepNum) {
            step.classList.add("active");
        } else if (sVal < stepNum) {
            step.classList.add("completed");
        }
    });
    
    // Update Wizard Panes
    document.querySelectorAll(".wizard-pane").forEach(pane => pane.classList.remove("active"));
    document.getElementById(`pane-step${stepNum}`).classList.add("active");
    
    if (stepNum === 2) {
        renderChecklist();
    } else if (stepNum === 3) {
        renderKYC();
    } else if (stepNum === 4) {
        renderEvaluationResults();
    }
}

// ================= CORE PYTHON SERVER CLAIMS RULES ENGINE BINDINGS =================
async function runEvaluation() {
    if (!activeClaim) return;
    
    // Sync UI changes back to active claim model
    activeClaim.policy.policy_number = document.getElementById("policy-no").value;
    activeClaim.policy.life_assured = document.getElementById("life-assured").value;
    activeClaim.policy.nominee_name = document.getElementById("nominee-name").value;
    activeClaim.policy.sum_assured = parseFloat(document.getElementById("sum-assured").value) || 0;
    activeClaim.policy.commencement_date = document.getElementById("commencement-date").value;
    activeClaim.policy.premium_paying_term_years = parseInt(document.getElementById("premium-paying-term").value) || 10;
    activeClaim.policy.premiums_paid_years = parseInt(document.getElementById("premiums-paid").value) || 0;
    activeClaim.policy.policy_status = document.getElementById("policy-status").value;
    activeClaim.policy.last_premium_paid_date = document.getElementById("policy-last-premium-date").value;
    
    activeClaim.claim.cause_of_death = document.getElementById("cause-of-death").value;
    activeClaim.claim.date_of_death = document.getElementById("date-of-death").value;
    
    // Initialize sub-objects if not present
    if (!activeClaim.claim.claimant) activeClaim.claim.claimant = {};
    if (!activeClaim.claim.bank_details) activeClaim.claim.bank_details = {};
    if (!activeClaim.claim.medical_details) activeClaim.claim.medical_details = {};
    if (!activeClaim.claim.claim_forms) activeClaim.claim.claim_forms = {};
    if (!activeClaim.claim.investigation) activeClaim.claim.investigation = {};
    if (!activeClaim.claim.legal_status) activeClaim.claim.legal_status = {};
    
    activeClaim.claim.claimant.name = document.getElementById("claimant-name").value;
    activeClaim.claim.claimant.relationship = document.getElementById("claimant-relationship").value;
    activeClaim.claim.claimant.aadhaar = document.getElementById("claimant-aadhaar").value;
    activeClaim.claim.claimant.phone = document.getElementById("claimant-phone").value;
    activeClaim.claim.claimant.address = document.getElementById("claimant-address").value;
    
    activeClaim.claim.bank_details.account_number = document.getElementById("bank-acc-num").value;
    activeClaim.claim.bank_details.ifsc = document.getElementById("bank-ifsc").value;
    activeClaim.claim.bank_details.bank_name = document.getElementById("bank-name").value;
    activeClaim.claim.bank_details.name_on_cheque = document.getElementById("bank-cheque-name").value;
    
    activeClaim.claim.medical_details.treating_doctor = document.getElementById("med-treating-doctor").value;
    activeClaim.claim.medical_details.underlying_disease = document.getElementById("med-chronic-disease").value;
    activeClaim.claim.medical_details.icd_code = document.getElementById("med-icd-code").value;
    activeClaim.claim.medical_details.hospitalization_history = document.getElementById("med-hospital-summary").value;
    
    activeClaim.claim.claim_forms.Form_A = document.getElementById("form-check-a").checked;
    activeClaim.claim.claim_forms.Form_B = document.getElementById("form-check-b").checked;
    activeClaim.claim.claim_forms.Form_C = document.getElementById("form-check-c").checked;
    
    let chequeName = activeClaim.claim.bank_details.name_on_cheque || activeClaim.policy.nominee_name;
    
    try {
        const res = await fetch("/api/claims/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                policy: activeClaim.policy,
                claim: activeClaim.claim
            })
        });
        
        if (!res.ok) {
            console.error("Evaluation server failed");
            return;
        }
        
        const evaluation = await res.json();
        
        // Save evaluation calculations inside our state object
        activeClaim.evaluation = {
            status: evaluation.status,
            flags: evaluation.flags,
            missing_documents: evaluation.missing_documents,
            calculated_payout: evaluation.calculated_payout,
            recommended_actions: evaluation.recommended_actions,
            cheque_name: chequeName,
            decision: evaluation.decision,
            rules: evaluation.rules,
            risk: evaluation.risk,
            fraud_flags: evaluation.fraud_flags,
            sla: evaluation.sla,
            explainability: evaluation.explainability,
            payout: evaluation.payout,
            documents: evaluation.documents
        };
        
        // Pre-fill the Affidavit print parameters
        updateAffidavitTemplate(chequeName);
        
    } catch (err) {
        console.error("Evaluation connection error:", err);
    }
}

function verifyNameMatch(n1, n2) {
    const clean = (name) => {
        return name.toLowerCase()
            .replace(/\b(mr|mrs|ms|dr|devi|kumar|sharma|patel|joshi|pillai)\b/g, "")
            .replace(/[^a-z]/g, "")
            .trim();
    };
    
    const c1 = clean(n1);
    const c2 = clean(n2);
    
    if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) {
        return true;
    }
    
    const s1 = new Set(c1.split(""));
    const s2 = new Set(c2.split(""));
    const intersect = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    const sim = intersect.size / union.size;
    return sim > 0.88;
}

// ================= DYNAMIC SCREEN RENDERING =================

function renderChecklist() {
    const container = document.getElementById("dynamic-checklist");
    if (!container) return;
    container.innerHTML = "";
    
    const causeLower = activeClaim.claim.cause_of_death.toLowerCase();
    const isAccidental = causeLower.includes("accident") || causeLower.includes("polytrauma") || causeLower.includes("crash") || causeLower.includes("drowning");
    
    const items = [
        { key: "Death_Certificate", name: "Original Death Certificate", mandatory: true, format: "PDF / Verified OCR" },
        { key: "Cancelled_Cheque", name: "Cancelled Bank Cheque / Passbook Copy", mandatory: true, format: "Image / MICR Validated" },
        { key: "Nominee_Aadhaar", name: "Nominee Aadhaar & Identity KYC", mandatory: true, format: "PDF / Verified OCR" }
    ];
    
    if (isAccidental) {
        items.push({ key: "FIR", name: "First Information Report (FIR) from Police", mandatory: true, format: "PDF / Attested Copy" });
        items.push({ key: "Post_Mortem_Report", name: "Post-Mortem Report (PMR)", mandatory: true, format: "PDF / Certified Copy" });
    } else {
        items.push({ key: "Medical_Records", name: "Hospital Discharge Summary & Case Records", mandatory: false, format: "PDF / Optional" });
    }
    
    items.forEach(item => {
        const hasDoc = activeClaim.claim.submitted_documents.includes(item.key);
        const div = document.createElement("div");
        div.className = "checklist-item";
        div.innerHTML = `
            <div class="checklist-info">
                <span class="checklist-title">${item.name}</span>
                <span class="checklist-badge ${item.mandatory ? 'badge-mandatory' : 'badge-optional'}">
                    ${item.mandatory ? 'Mandatory' : 'Supporting Doc'}
                </span>
            </div>
            <div class="checklist-actions">
                ${hasDoc 
                    ? `<span class="text-success"><i class="fa-solid fa-circle-check"></i> Uploaded & Verified</span>`
                    : `<button class="btn btn-secondary btn-sm" onclick="mockDocumentUpload('${item.key}')"><i class="fa-solid fa-file-upload"></i> Upload</button>`
                }
            </div>
        `;
        container.appendChild(div);
    });
}

function mockDocumentUpload(key) {
    if (!activeClaim.claim.submitted_documents.includes(key)) {
        activeClaim.claim.submitted_documents.push(key);
    }
    runEvaluation();
    renderChecklist();
}

function renderKYC() {
    const pName = document.getElementById("kyc-policy-name");
    const cName = document.getElementById("kyc-cheque-name");
    const auditRes = document.getElementById("kyc-audit-result");
    const mPane = document.getElementById("mismatch-guidance-pane");
    if (!pName) return;
    
    pName.innerText = activeClaim.policy.nominee_name;
    cName.innerText = activeClaim.evaluation.cheque_name;
    
    const isMatch = verifyNameMatch(activeClaim.policy.nominee_name, activeClaim.evaluation.cheque_name);
    
    if (isMatch) {
        auditRes.className = "audit-status-badge badge-match-success";
        auditRes.innerHTML = `<i class="fa-solid fa-circle-check"></i> Identity Cross-Audit Successful (Fuzzy Match Passed)`;
        mPane.style.display = "none";
    } else {
        auditRes.className = "audit-status-badge badge-match-fail";
        auditRes.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Identity Mismatch Detected (Fuzzy Match Failed)`;
        mPane.style.display = "block";
        mPane.innerHTML = `
            <div class="alert-header-row"><i class="fa-solid fa-circle-info"></i> Nominee Name Discrepancy Resolved Guidelines:</div>
            <p class="alert-desc-text">
                The name recorded in the insurance contract (<strong>${activeClaim.policy.nominee_name}</strong>) differs from the banking transaction account details (<strong>${activeClaim.evaluation.cheque_name}</strong>). To prevent automatic bank transfer rejection:
                <br><br>
                1. Go to the <strong>Affidavit Generator</strong> section in the sidebar to download your pre-filled name correction affidavit.
                <br>
                2. Have this affidavit notarized by a local Gazetted officer or Notary Public and upload it as a custom file correction.
            </p>
        `;
    }
}

function renderEvaluationResults() {
    const payoutText = document.getElementById("evaluation-payout");
    const riskList = document.getElementById("evaluation-risk-list");
    const recList = document.getElementById("evaluation-rec-list");
    if (!payoutText) return;
    
    const evalData = activeClaim.evaluation;
    
    payoutText.innerText = `INR ${evalData.calculated_payout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    
    riskList.innerHTML = "";
    if (evalData.flags.length === 0) {
        riskList.innerHTML = `<div class="risk-item risk-none"><i class="fa-solid fa-circle-check text-success"></i> No claim validation alerts found. Safe to submit.</div>`;
    } else {
        evalData.flags.forEach(flag => {
            riskList.innerHTML += `<div class="risk-item"><i class="fa-solid fa-triangle-exclamation text-danger"></i> ${flag}</div>`;
        });
    }
    
    recList.innerHTML = "";
    evalData.recommended_actions.forEach(act => {
        recList.innerHTML += `<li class="rec-item">${act}</li>`;
    });
}

// ================= INTERMEDIARY: BRANCH WORKSPACE =================
async function renderIntermediaryBranchList() {
    const tbody = document.getElementById("branch-claims-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    try {
        const res = await fetch("/api/claims/branch");
        if (!res.ok) return;
        
        serverClaimsStore = await res.json();
        
        serverClaimsStore.forEach(item => {
            let alertBadge = `<span class="text-success"><i class="fa-solid fa-circle-check"></i> Clean</span>`;
            let actions = ``;
            
            // Compute visual warnings
            const causeLower = item.claim.cause_of_death.toLowerCase();
            const isAccidental = causeLower.includes("accident") || causeLower.includes("polytrauma") || causeLower.includes("crash") || causeLower.includes("drowning");
            
            if (isAccidental && item.status === "QUERY_RAISED") {
                alertBadge = `<span class="text-warning"><i class="fa-solid fa-circle-question"></i> Missing Police Docs</span>`;
                actions = `<button class="btn btn-primary btn-case" onclick="resolveBranchQuery('${item.id}')"><i class="fa-solid fa-file-upload"></i> Upload PMR/FIR</button>`;
            } else if (item.id === "CASE-003") {
                alertBadge = `<span class="text-warning"><i class="fa-solid fa-circle-exclamation"></i> Nominee Name Mismatch</span>`;
                actions = `<button class="btn btn-secondary btn-case" onclick="goToAffidavitFromIntermediary('${item.id}')"><i class="fa-solid fa-file-contract"></i> Draft Affidavit</button>`;
            } else if (item.id === "CASE-001") {
                alertBadge = `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Early Audit Risk</span>`;
                actions = `<button class="btn btn-outline btn-case" onclick="viewCaseInWizard('${item.id}')">Audit Details</button>`;
            } else {
                actions = `<button class="btn btn-outline btn-case" onclick="viewCaseInWizard('${item.id}')">View Files</button>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.policy.life_assured}</strong><br><span style="font-size:11px; color:var(--text-muted);">Policy #${item.policy.policy_number}</span></td>
                    <td>${item.policy.nominee_name}</td>
                    <td>INR ${item.policy.sum_assured.toLocaleString('en-IN')}</td>
                    <td><span class="status-badge ${getStatusClass(item.status)}">${item.status.replace("_", " ")}</span></td>
                    <td>${alertBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Branch Loader Error:", err);
    }
}

async function resolveBranchQuery(caseId) {
    try {
        const res = await fetch("/api/claims/decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ case_id: caseId, status: "APPROVED" })
        });
        
        if (res.ok) {
            alert("Police reports uploaded successfully! Claim status updated to APPROVED.");
            renderIntermediaryBranchList();
        }
    } catch (err) {
        console.error("Resolve error:", err);
    }
}

function goToAffidavitFromIntermediary(caseId) {
    loadCase(caseId);
    document.getElementById("menu-affidavit").click();
}

function viewCaseInWizard(caseId) {
    loadCase(caseId);
    document.getElementById("menu-wizard").click();
}

// ================= INSURER: ASSESSMENT QUEUE =================
async function renderInsurerInboxList() {
    const container = document.getElementById("insurer-inbox-cards");
    if (!container) return;
    container.innerHTML = "";
    
    try {
        const res = await fetch("/api/claims/queue");
        if (!res.ok) return;
        
        serverClaimsStore = await res.json();
        
        serverClaimsStore.forEach(item => {
            const isActive = activeClaim && activeClaim.id === item.id;
            container.innerHTML += `
                <div class="dossier-card ${isActive ? 'active' : ''}" onclick="selectAssessorClaim('${item.id}')">
                    <h4>Claim for ${item.policy.life_assured}</h4>
                    <div class="dossier-meta-row">
                        <span>Policy: #${item.policy.policy_number}</span>
                        <span class="status-badge ${getStatusClass(item.status)}">${item.status.replace("_", " ")}</span>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Queue Loader Error:", err);
    }
}

async function selectAssessorClaim(caseId) {
    // Re-fetch queue to make sure we have the latest status & state history
    try {
        const res = await fetch("/api/claims/queue");
        if (res.ok) {
            serverClaimsStore = await res.json();
        }
    } catch (err) {
        console.error("Error fetching queue in selectAssessorClaim:", err);
    }

    // Select internally
    const selected = serverClaimsStore.find(c => c.id === caseId);
    if (!selected) return;
    
    activeClaim = selected;
    
    // Evaluate via backend server rules
    await runEvaluation();
    
    // Highlight list card
    await renderInsurerInboxList();
    
    // Display workspace
    document.getElementById("assessor-workspace-placeholder").style.display = "none";
    const work = document.getElementById("assessor-active-workspace");
    work.style.display = "block";
    
    // Set text elements
    document.getElementById("assess-policy-title").innerText = `Claim Dossier for Policy #${activeClaim.policy.policy_number}`;
    document.getElementById("assess-insured-name").innerText = activeClaim.policy.life_assured;
    document.getElementById("assess-sum-assured").innerText = `INR ${activeClaim.policy.sum_assured.toLocaleString('en-IN')}`;
    document.getElementById("assess-cause-death").innerText = activeClaim.claim.cause_of_death;
    
    // Calculate policy duration
    const commencement = parseDate(activeClaim.policy.commencement_date);
    const death = parseDate(activeClaim.claim.date_of_death);
    const daysSinceInception = Math.floor((death - commencement) / (1000 * 60 * 60 * 24)) || 0;
    const policyAgeYears = (daysSinceInception / 365.25).toFixed(2);
    document.getElementById("assess-policy-age").innerText = `${policyAgeYears} Years (${daysSinceInception} days)`;
    
    const isLapsed = activeClaim.policy.premiums_paid_years < Math.floor(daysSinceInception / 365.25);
    document.getElementById("assess-lapsed-status").innerText = isLapsed ? "Lapsed (Paid-Up Sum Assured)" : "Active / Fully Paid";
    
    // Set Claimant Details
    const claimant = activeClaim.claim.claimant || {};
    document.getElementById("assess-claimant-name").innerText = claimant.name || "-";
    document.getElementById("assess-claimant-relation").innerText = claimant.relationship || "-";
    document.getElementById("assess-claimant-aadhaar").innerText = claimant.aadhaar || "-";
    
    // Set Bank Validation Details
    const bank = activeClaim.claim.bank_details || {};
    document.getElementById("assess-bank-acc").innerText = `${bank.bank_name || "-"} (${bank.account_number || "-"} / ${bank.ifsc || "-"})`;
    document.getElementById("assess-bank-holder").innerText = bank.name_on_cheque || "-";
    
    const matchStatus = bank.name_match_status || "FUZZY_MATCH_WARNING";
    const matchEl = document.getElementById("assess-bank-match-status");
    matchEl.innerText = matchStatus.replace(/_/g, " ");
    matchEl.className = `status-badge ${matchStatus === 'EXACT_MATCH' ? 'status-approved' : matchStatus === 'FUZZY_MATCH_WARNING' ? 'status-audit' : 'status-rejected'}`;
    
    // Set Timeline & SLA Details
    const dateSubmitted = activeClaim.claim.date_of_intimation || activeClaim.claim.date_of_death;
    document.getElementById("assess-timeline-submitted").innerText = dateSubmitted || "-";
    
    const intimationDate = parseDate(dateSubmitted);
    const today = new Date();
    const slaDays = Math.floor((today - intimationDate) / (1000 * 60 * 60 * 24)) || 0;
    document.getElementById("assess-timeline-elapsed").innerText = `${slaDays} Days`;
    
    const slaEl = document.getElementById("assess-sla-status");
    if (slaDays <= 30) {
        slaEl.innerText = "Within SLA";
        slaEl.className = "status-badge status-approved";
    } else {
        slaEl.innerText = "SLA Breached";
        slaEl.className = "status-badge status-rejected";
    }
    
    // Set Clinical Profile Details
    const med = activeClaim.claim.medical_details || {};
    document.getElementById("assess-med-disease").innerText = med.underlying_disease || "-";
    document.getElementById("assess-med-icd").innerText = med.icd_code || "-";
    document.getElementById("assess-med-history").innerText = med.hospitalization_history || "-";
    
    // Set Police & Accident Details
    const inv = activeClaim.claim.investigation || {};
    const causeLower = activeClaim.claim.cause_of_death.toLowerCase();
    const isAccidental = causeLower.includes("accident") || causeLower.includes("polytrauma") || causeLower.includes("crash") || causeLower.includes("drowning");
    document.getElementById("assess-police-accident").innerText = isAccidental ? "Yes (Accidental)" : "No (Natural)";
    
    const reportStatus = inv.police_final_report_status || "NOT_APPLICABLE";
    const reportEl = document.getElementById("assess-police-report");
    reportEl.innerText = reportStatus.replace(/_/g, " ");
    reportEl.className = `status-badge ${reportStatus === 'SUBMITTED' ? 'status-approved' : reportStatus === 'NOT_APPLICABLE' ? 'status-audit' : 'status-rejected'}`;
    
    // Set Risk Score Gauge
    const evaluation = activeClaim.evaluation || {};
    const decision = evaluation.decision || {};
    const riskScore = decision.risk_score !== undefined ? decision.risk_score : 0.0;
    const riskLevel = decision.risk_level || "LOW";
    
    document.getElementById("assess-risk-score-value").innerText = riskScore.toFixed(2);
    
    const levelEl = document.getElementById("assess-risk-score-level");
    levelEl.innerText = riskLevel;
    levelEl.className = `status-badge ${riskLevel === 'LOW' ? 'status-approved' : riskLevel === 'MEDIUM' ? 'status-audit' : 'status-rejected'}`;
    
    const badge = document.getElementById("assess-status-badge");
    badge.innerText = activeClaim.status.replace("_", " ");
    badge.className = `status-badge ${getStatusClass(activeClaim.status)}`;
    
    // Bind Decision Intelligence Elements
    const finalDecisionEl = document.getElementById("assess-final-decision");
    if (finalDecisionEl) {
        finalDecisionEl.innerText = (decision.status || "-").replace("_", " ");
        finalDecisionEl.className = `status-badge ${getStatusClass(decision.status)}`;
    }
    
    const reasonEl = document.getElementById("assess-decision-reason");
    if (reasonEl) {
        reasonEl.innerText = decision.reason || "-";
    }
    
    const payoutTypeEl = document.getElementById("assess-payout-type");
    if (payoutTypeEl) {
        payoutTypeEl.innerText = (evaluation.payout?.type || "-").replace(/_/g, " ");
    }
    
    const payoutValEl = document.getElementById("assess-payout-value");
    if (payoutValEl) {
        const payoutVal = evaluation.payout?.amount !== undefined ? evaluation.payout.amount : (evaluation.calculated_payout || 0);
        payoutValEl.innerText = `INR ${payoutVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    
    const payoutFormulaEl = document.getElementById("assess-payout-formula");
    if (payoutFormulaEl) {
        payoutFormulaEl.innerText = evaluation.payout?.formula_used || "-";
    }
    
    const riskScoreTotalEl = document.getElementById("assess-risk-score-total");
    if (riskScoreTotalEl) {
        const riskScoreTotal = evaluation.risk?.total_score !== undefined ? evaluation.risk.total_score : Math.round(riskScore * 100);
        riskScoreTotalEl.innerText = `${riskScoreTotal} / 100`;
    }
    
    const riskScoreTotalLevelEl = document.getElementById("assess-risk-score-total-level");
    if (riskScoreTotalLevelEl) {
        riskScoreTotalLevelEl.innerText = riskLevel;
        riskScoreTotalLevelEl.className = `status-badge ${riskLevel === 'LOW' ? 'status-approved' : riskLevel === 'MEDIUM' ? 'status-audit' : 'status-rejected'}`;
    }
    
    const confidenceEl = document.getElementById("assess-decision-confidence");
    if (confidenceEl) {
        const confidence = evaluation.explainability?.confidence !== undefined ? evaluation.explainability.confidence : 0.0;
        confidenceEl.innerText = `${(confidence * 100).toFixed(0)}%`;
    }
    
    const fraudContainer = document.getElementById("assess-fraud-flags-container");
    if (fraudContainer) {
        fraudContainer.innerHTML = "";
        if (evaluation.fraud_flags && evaluation.fraud_flags.length > 0) {
            evaluation.fraud_flags.forEach(flag => {
                const flagSpan = document.createElement("span");
                flagSpan.className = "status-badge status-rejected";
                flagSpan.innerText = flag.replace(/_/g, " ");
                fraudContainer.appendChild(flagSpan);
            });
        } else {
            fraudContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">No active fraud indicators</span>`;
        }
    }
    
    const timelineEl = document.getElementById("assess-state-history-timeline");
    if (timelineEl) {
        timelineEl.innerHTML = "";
        if (activeClaim.state_history && activeClaim.state_history.length > 0) {
            activeClaim.state_history.forEach(hist => {
                const div = document.createElement("div");
                div.className = "timeline-item";
                div.style.marginBottom = "8px";
                div.innerHTML = `<span style="font-weight: 600; color: var(--color-primary);">${hist.from} &rarr; ${hist.to}</span> <span style="color: var(--text-muted);">(${hist.at} by ${hist.by})</span>`;
                timelineEl.appendChild(div);
            });
        } else {
            timelineEl.innerHTML = `<div style="color: var(--text-muted);">No transition history logged</div>`;
        }
    }
    
    const traceConsole = document.getElementById("assess-rules-trace-console");
    if (traceConsole) {
        traceConsole.innerHTML = "";
        if (evaluation.explainability && evaluation.explainability.decision_path) {
            evaluation.explainability.decision_path.forEach(path => {
                const div = document.createElement("div");
                div.innerText = path;
                traceConsole.appendChild(div);
            });
        } else {
            traceConsole.innerHTML = "<div>No rules execution trace available</div>";
        }
    }
    
    // Render validation alerts box
    const alertsBox = document.getElementById("assess-alerts-container");
    alertsBox.innerHTML = "";
    
    if (activeClaim.evaluation.flags.length === 0) {
        alertsBox.innerHTML = `<div class="risk-item risk-none"><i class="fa-solid fa-circle-check text-success"></i> TDD Audits Passed. No risk discrepancies flagged.</div>`;
    } else {
        activeClaim.evaluation.flags.forEach(flag => {
            alertsBox.innerHTML += `<div class="risk-item"><i class="fa-solid fa-triangle-exclamation text-danger"></i> ${flag}</div>`;
        });
    }
    
    const certBox = document.getElementById("issue-cert-action-box");
    certBox.style.display = activeClaim.status === "APPROVED" ? "block" : "none";
}

async function triggerAssessorDecision(newState) {
    if (!activeClaim) return;
    
    try {
        const res = await fetch("/api/claims/decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ case_id: activeClaim.id, status: newState })
        });
        
        if (res.ok) {
            alert(`Claim status updated to ${newState}`);
            // Reload
            selectAssessorClaim(activeClaim.id);
        }
    } catch (err) {
        console.error("Decision update failed:", err);
    }
}

function generateDisbursalCertificate() {
    if (!activeClaim) return;
    
    document.querySelectorAll(".cert-policy-no").forEach(el => el.innerText = activeClaim.policy.policy_number);
    document.querySelectorAll(".cert-insured").forEach(el => el.innerText = activeClaim.policy.life_assured);
    document.querySelectorAll(".cert-nominee").forEach(el => el.innerText = activeClaim.evaluation.cheque_name);
    document.querySelectorAll(".cert-sum-assured").forEach(el => el.innerText = activeClaim.evaluation.calculated_payout.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    document.querySelectorAll(".cert-date").forEach(el => el.innerText = new Date().toLocaleDateString("en-IN"));
    
    document.getElementById("menu-cert-center").click();
}

// ================= CLAIMANT SUBMISSION =================
async function simulateSubmission() {
    try {
        const res = await fetch("/api/claims/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: activeClaim.id,
                policy: activeClaim.policy,
                claim: activeClaim.claim
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            document.getElementById("tracker-claim-id").innerText = data.trackingId;
            
            // Switch to tracker tab
            document.getElementById("menu-tracker").click();
            
            // Set tracker details
            advanceSimState('SUBMITTED');
        }
    } catch (err) {
        console.error("Submission failed:", err);
    }
}

function advanceSimState(state) {
    simulatedState = state;
    const label = document.getElementById("tracker-status-label");
    const events = document.getElementById("tracker-events-panel");
    if (!label || !events) return;
    
    document.querySelectorAll(".pipeline-step").forEach(step => step.classList.remove("active", "completed"));
    
    if (state === 'SUBMITTED') {
        label.innerText = "SUBMITTED";
        label.className = "status-badge status-submitted";
        document.getElementById("pipe-submitted").classList.add("active");
        events.innerHTML = `
            <div class="event-card">
                <h5><i class="fa-solid fa-info-circle text-primary"></i> Intake Dossier Logged</h5>
                <p class="card-desc">Dossier packages submitted to the underwriting system. Pending validation and document check.</p>
            </div>
        `;
    } else if (state === 'UNDER_REVIEW') {
        label.innerText = "UNDER REVIEW";
        label.className = "status-badge status-audit";
        document.getElementById("pipe-submitted").classList.add("completed");
        document.getElementById("pipe-under_review").classList.add("active");
        events.innerHTML = `
            <div class="event-card">
                <h5><i class="fa-solid fa-magnifying-glass-chart text-warning"></i> Under Active Underwriting Audit</h5>
                <p class="card-desc">Insurer Assessor is auditing details and evaluating exclusions, premium history, and KYC details.</p>
            </div>
        `;
    } else if (state === 'QUERY_RAISED') {
        label.innerText = "QUERY RAISED";
        label.className = "status-badge status-query";
        document.getElementById("pipe-submitted").classList.add("completed");
        document.getElementById("pipe-under_review").classList.add("completed");
        document.getElementById("pipe-queries").classList.add("active");
        events.innerHTML = `
            <div class="event-card">
                <h5><i class="fa-solid fa-circle-question text-danger"></i> Verification Query Dispatched to Branch</h5>
                <p class="card-desc">The underwriter has flagged a discrepancy or missing report. The processing bank agent must resolve this query to continue.</p>
            </div>
        `;
    } else if (state === 'APPROVED') {
        label.innerText = "APPROVED & SETTLED";
        label.className = "status-badge status-approved";
        document.getElementById("pipe-submitted").classList.add("completed");
        document.getElementById("pipe-under_review").classList.add("completed");
        document.getElementById("pipe-queries").classList.add("completed");
        document.getElementById("pipe-settled").classList.add("active");
        events.innerHTML = `
            <div class="event-card">
                <h5><i class="fa-solid fa-circle-check text-success"></i> Claim Approved & Funds Disbursed</h5>
                <p class="card-desc">Audits passed. Clearance certificate issued to SBI branch. Settled sum is released to nominee savings bank account.</p>
            </div>
        `;
    } else if (state === 'REJECTED') {
        label.innerText = "REJECTED";
        label.className = "status-badge status-rejected";
        events.innerHTML = `
            <div class="event-card">
                <h5><i class="fa-solid fa-circle-xmark text-danger"></i> Claim Application Rejected</h5>
                <p class="card-desc">The claim does not meet eligibility criteria or falls under policy exclusions. Review the audit risk report for details.</p>
            </div>
        `;
    }
}

function printAffidavit() {
    window.print();
}

/* ================= AUTOMATED AGENT MODE HANDLERS ================= */

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split("/");
    if (parts.length === 3) {
        // DD/MM/YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}

function toggleAgentMode() {
    const isChecked = document.getElementById("agent-mode-checkbox").checked;
    const agentElements = document.querySelectorAll(".agent-mode-only");
    agentElements.forEach(el => {
        if (el.tagName === "BUTTON") {
            el.style.setProperty("display", isChecked ? "inline-flex" : "none", "important");
        } else {
            el.style.setProperty("display", isChecked ? "block" : "none", "important");
        }
    });
    
    // Also show/hide the console pane
    const consolePane = document.getElementById("agent-console-pane");
    if (consolePane) {
        consolePane.style.display = isChecked ? "flex" : "none";
    }
}

function closeConsole() {
    const pane = document.getElementById("agent-console-pane");
    if (pane) pane.style.display = "none";
    const chk = document.getElementById("agent-mode-checkbox");
    if (chk) {
        chk.checked = false;
        toggleAgentMode();
    }
}

function writeConsoleLog(message) {
    const consoleLogs = document.getElementById("agent-console-logs");
    if (!consoleLogs) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const line = document.createElement("div");
    line.className = "console-line";
    line.innerHTML = `<span class="console-line-timestamp">[${timeStr}]</span> ${escapeHtml(message)}`;
    consoleLogs.appendChild(line);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function streamConsoleLogs(logs, onComplete) {
    const consolePane = document.getElementById("agent-console-pane");
    if (consolePane) consolePane.style.display = "flex";
    
    const consoleLogs = document.getElementById("agent-console-logs");
    if (consoleLogs) consoleLogs.innerHTML = "";
    
    writeConsoleLog("Connecting to automated agent engine...");
    
    let index = 0;
    function printNext() {
        if (index < logs.length) {
            writeConsoleLog(logs[index]);
            index++;
            setTimeout(printNext, 1000);
        } else {
            writeConsoleLog("Agent task completed successfully.");
            if (onComplete) onComplete();
        }
    }
    setTimeout(printNext, 800);
}

async function runClaimantAgent() {
    const consoleLogs = document.getElementById("agent-console-logs");
    if (consoleLogs) consoleLogs.innerHTML = "";
    writeConsoleLog("Initializing Claimant Agent Auto-Pilot...");
    const caseId = activeClaim ? activeClaim.id : "CASE-001";
    try {
        const res = await fetch("/api/agents/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "claimant", case_id: caseId })
        });
        if (!res.ok) {
            writeConsoleLog("Error: Claimant Agent engine failed to initialize.");
            return;
        }
        const data = await res.json();
        streamConsoleLogs(data.logs, async () => {
            // Fetch the branch claims to sync
            const branchRes = await fetch("/api/claims/branch");
            if (branchRes.ok) {
                const branchClaims = await branchRes.json();
                const updatedClaim = branchClaims.find(c => c.id === caseId);
                if (updatedClaim) {
                    activeClaim = updatedClaim;
                    // Set tracker details
                    document.getElementById("tracker-claim-id").innerText = activeClaim.trackingId;
                    // Switch to tracker tab
                    document.getElementById("menu-tracker").click();
                    advanceSimState(activeClaim.status);
                }
            }
        });
    } catch (err) {
        console.error(err);
        writeConsoleLog("Error connecting to Agent server.");
    }
}

async function runBankAgent() {
    const consoleLogs = document.getElementById("agent-console-logs");
    if (consoleLogs) consoleLogs.innerHTML = "";
    writeConsoleLog("Initializing Bank Intermediary Agent Auto-Pilot...");
    try {
        const res = await fetch("/api/agents/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "intermediary" })
        });
        if (!res.ok) {
            writeConsoleLog("Error: Bank Agent engine failed to initialize.");
            return;
        }
        const data = await res.json();
        streamConsoleLogs(data.logs, () => {
            renderIntermediaryBranchList();
        });
    } catch (err) {
        console.error(err);
        writeConsoleLog("Error connecting to Agent server.");
    }
}

async function runAssessorAgent() {
    const consoleLogs = document.getElementById("agent-console-logs");
    if (consoleLogs) consoleLogs.innerHTML = "";
    writeConsoleLog("Initializing Insurer Assessor Agent Auto-Pilot...");
    try {
        const res = await fetch("/api/agents/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "insurer" })
        });
        if (!res.ok) {
            writeConsoleLog("Error: Assessor Agent engine failed to initialize.");
            return;
        }
        const data = await res.json();
        streamConsoleLogs(data.logs, () => {
            renderInsurerInboxList();
            if (activeClaim) {
                selectAssessorClaim(activeClaim.id);
            }
        });
    } catch (err) {
        console.error(err);
        writeConsoleLog("Error connecting to Agent server.");
    }
}
// ================= UTILITIES =================

function getStatusClass(status) {
    if (status === "DRAFT") return "status-submitted";
    if (status === "SUBMITTED") return "status-submitted";
    if (status === "UNDER_REVIEW") return "status-audit";
    if (status === "QUERY_RAISED") return "status-query";
    if (status === "APPROVED") return "status-approved";
    if (status === "REJECTED") return "status-rejected";
    return "status-submitted";
}

function updateAffidavitTemplate(chequeName) {
    document.querySelectorAll(".field-nominee-full").forEach(el => el.innerText = chequeName);
    document.querySelectorAll(".field-life-assured").forEach(el => el.innerText = activeClaim.policy.life_assured);
    document.querySelectorAll(".field-policy-no").forEach(el => el.innerText = activeClaim.policy.policy_number);
    document.querySelectorAll(".field-date-of-death").forEach(el => el.innerText = activeClaim.claim.date_of_death);
    document.querySelectorAll(".field-nominee-policy").forEach(el => el.innerText = activeClaim.policy.nominee_name);
    document.querySelectorAll(".field-nominee-bank").forEach(el => el.innerText = chequeName);
    document.querySelectorAll(".field-bank-account").forEach(el => el.innerText = "XXXXXX3210");
}

function printAffidavit() {
    window.print();
}

/* ================= DOCUMENT HELP MODAL CONTROLLERS ================= */
function showHelpModal() {
    const modal = document.getElementById("help-modal");
    if (modal) modal.style.display = "flex";
}

function closeHelpModal() {
    const modal = document.getElementById("help-modal");
    if (modal) modal.style.display = "none";
}

// Close modal if clicked on the outer overlay
document.addEventListener("click", (e) => {
    const modal = document.getElementById("help-modal");
    if (modal && e.target === modal) {
        closeHelpModal();
    }
});
