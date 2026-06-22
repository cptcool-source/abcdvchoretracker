// ==========================================================================
// Mom's Study Zone — NCLEX-PN quiz, daily goal, notepad (Firestore-synced)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX } from "./firebase-config.js";

(function () {
  "use strict";

  // ── Firebase init ────────────────────────────────────────────────────────
  var app = initializeApp(firebaseConfig);
  var auth = getAuth(app);
  var db = getFirestore(app);

  // ── YouTube playlist ─────────────────────────────────────────────────────
  var YT_IDS = [
    "mEpTKTCGFBk",
    "VFmVP8qFHoU",
    "xNM_PkJe_3Y",
    "INpqzFSVqm4",
    "gRUz9O23dKk",
    "CxVJgRfCFz4",
    "vV0DaAnGMJ0",
    "ZJn1XS8wbUM",
    "S5kVr4YGa6g",
    "1_KHdWPOiXA",
    "5P9a3_B0C24",
    "HXczGRpJPf0",
    "q4n5iR7a4yQ",
    "kjGGVJflmEU",
    "L56nyXqn6oI"
  ];

  // ── Question database ────────────────────────────────────────────────────
  // Categories (NCLEX-PN Client Needs):
  // SC = Safe & Effective Care Environment
  // HC = Health Promotion & Maintenance
  // PS = Psychosocial Integrity
  // PH = Physiological Integrity
  var QUESTIONS = [
    // =====================================================================
    // EASY
    // =====================================================================
    {id:"e001",diff:"easy",cat:"Safe Care",q:"A client is prescribed 500 mg of amoxicillin. The pharmacy provides 250 mg/5 mL suspension. How many mL should the nurse administer?",opts:["5 mL","10 mL","15 mL","20 mL"],ans:1,exp:"500 mg ÷ 250 mg × 5 mL = 10 mL."},
    {id:"e002",diff:"easy",cat:"Safe Care",q:"Which action is the priority when a nurse receives a verbal medication order from a physician?",opts:["Administer the medication immediately","Write down the order and read it back to the physician","Ask another nurse to witness the order","Record the order in the chart without verifying"],ans:1,exp:"Read-back verification is required for verbal/telephone orders to prevent errors."},
    {id:"e003",diff:"easy",cat:"Safe Care",q:"A nurse is preparing to administer an injection. Which site is used for a Z-track injection?",opts:["Deltoid","Vastus lateralis","Ventrogluteal","Dorsogluteal"],ans:2,exp:"The ventrogluteal (or dorsogluteal) site is used for Z-track injections to prevent medication tracking through tissue. Ventrogluteal is preferred for adults."},
    {id:"e004",diff:"easy",cat:"Health Promotion",q:"A client asks about the most common early sign of colorectal cancer. The nurse's best response is:",opts:["Bright red rectal bleeding","Change in bowel habits","Severe abdominal pain","Weight loss"],ans:1,exp:"A persistent change in bowel habits (constipation, diarrhea, or narrowing of stool) is the most common early sign."},
    {id:"e005",diff:"easy",cat:"Psychosocial",q:"A client states, 'I don't see the point in taking my medication anymore.' Which response by the nurse is most therapeutic?",opts:["You really should continue your medication.","What is making you feel that way?","I'll notify your doctor right away.","Have you spoken with your family about this?"],ans:1,exp:"Open-ended questions explore the client's feelings and promote therapeutic communication."},
    {id:"e006",diff:"easy",cat:"Physiological",q:"A client is receiving IV fluids at 125 mL/hr. The tubing drop factor is 15 gtt/mL. What is the drip rate in gtt/min?",opts:["15 gtt/min","25 gtt/min","31 gtt/min","45 gtt/min"],ans:2,exp:"(125 mL × 15 gtt) ÷ 60 min = 1875 ÷ 60 = 31.25 ≈ 31 gtt/min."},
    {id:"e007",diff:"easy",cat:"Safe Care",q:"When performing hand hygiene with soap and water, how long should the nurse scrub?",opts:["5–10 seconds","10–15 seconds","15–20 seconds","30–60 seconds"],ans:2,exp:"CDC recommends scrubbing for at least 20 seconds."},
    {id:"e008",diff:"easy",cat:"Health Promotion",q:"Which vaccine is recommended for all adults aged 65 and older annually?",opts:["Pneumococcal (PPSV23) only","Influenza","Hepatitis B","MMR"],ans:1,exp:"Annual influenza vaccination is recommended for all adults, especially those 65+."},
    {id:"e009",diff:"easy",cat:"Physiological",q:"A client's pulse oximetry reads 89%. What is the nurse's priority action?",opts:["Document the finding and reassess in 30 minutes","Administer supplemental oxygen","Call the rapid response team","Encourage the client to take deep breaths"],ans:1,exp:"SpO₂ below 90% requires immediate supplemental oxygen administration."},
    {id:"e010",diff:"easy",cat:"Safe Care",q:"Which of the following is an example of a primary source of data in nursing assessment?",opts:["The client's medical record","The client's spouse","The client","Previous nursing notes"],ans:2,exp:"The client is the primary source of data; all other sources are secondary."},
    {id:"e011",diff:"easy",cat:"Physiological",q:"A client with a nasogastric tube is receiving enteral feedings. Before administering the feeding, the nurse should first:",opts:["Warm the formula to body temperature","Verify tube placement","Flush the tube with 60 mL of water","Position the client supine"],ans:1,exp:"Verifying tube placement is essential before any enteral feeding to prevent aspiration."},
    {id:"e012",diff:"easy",cat:"Health Promotion",q:"At what age should women begin annual mammography screening, according to most guidelines?",opts:["30 years","40 years","45–50 years","60 years"],ans:2,exp:"Most major guidelines (ACR, ACS) recommend annual mammography beginning at age 40–45 depending on the organization."},
    {id:"e013",diff:"easy",cat:"Psychosocial",q:"A nurse is caring for a client who has just been diagnosed with terminal cancer. The client says, 'Why is God doing this to me?' This statement reflects which stage of Kübler-Ross grief?",opts:["Denial","Bargaining","Anger","Acceptance"],ans:2,exp:"Anger is characterized by questioning 'Why me?' and directing emotions at others, including God."},
    {id:"e014",diff:"easy",cat:"Safe Care",q:"Which is the correct order of donning (putting on) PPE?",opts:["Gown, mask, goggles, gloves","Gloves, gown, mask, goggles","Mask, gown, goggles, gloves","Gloves, mask, gown, goggles"],ans:0,exp:"CDC sequence: Gown → Mask/respirator → Goggles/face shield → Gloves."},
    {id:"e015",diff:"easy",cat:"Physiological",q:"Normal adult fasting blood glucose range is:",opts:["50–70 mg/dL","70–100 mg/dL","100–126 mg/dL","126–200 mg/dL"],ans:1,exp:"Normal fasting blood glucose is 70–100 mg/dL; 100–125 mg/dL indicates prediabetes."},
    {id:"e016",diff:"easy",cat:"Safe Care",q:"A client has a DNR order. The client stops breathing. What should the nurse do?",opts:["Begin CPR immediately","Provide comfort measures only","Call the rapid response team","Administer epinephrine"],ans:1,exp:"A DNR order means no resuscitative measures; comfort care continues."},
    {id:"e017",diff:"easy",cat:"Physiological",q:"Which position is recommended for a client following a lumbar puncture?",opts:["High Fowler's (90°)","Prone with a pillow under the abdomen","Flat (supine) for 1–4 hours","Left lateral (Sims') position"],ans:2,exp:"Lying flat prevents post-lumbar puncture headache by reducing CSF pressure differential."},
    {id:"e018",diff:"easy",cat:"Health Promotion",q:"A nurse teaches a client with hypertension about the DASH diet. Which food choice reflects understanding of the diet?",opts:["Canned soup","Processed deli meats","Fresh fruits and vegetables","Salted crackers"],ans:2,exp:"The DASH diet emphasizes fruits, vegetables, whole grains, and low-sodium foods."},
    {id:"e019",diff:"easy",cat:"Safe Care",q:"Which identifier is required when administering medications to a client?",opts:["Room number only","Name and room number","Two client identifiers (name and date of birth/MRN)","Name and physician's name"],ans:2,exp:"The Joint Commission requires at least two patient identifiers before medication administration."},
    {id:"e020",diff:"easy",cat:"Physiological",q:"Which sign is an early symptom of hypoglycemia?",opts:["Kussmaul respirations","Diaphoresis and tremors","Polyuria","Fruity breath odor"],ans:1,exp:"Diaphoresis, tremors, and anxiety are classic early signs of hypoglycemia from adrenergic stimulation."},
    {id:"e021",diff:"easy",cat:"Psychosocial",q:"A nurse uses silence during a therapeutic conversation. The primary purpose is to:",opts:["Show the nurse is thinking about their next question","Give the client time and space to gather thoughts","Avoid giving false reassurance","Document what the client is saying"],ans:1,exp:"Silence is a therapeutic technique that gives clients time to reflect and express themselves."},
    {id:"e022",diff:"easy",cat:"Safe Care",q:"A client is placed in contact precautions. Which PPE is required when entering the room?",opts:["Mask only","Gloves only","Gloves and gown","N95 respirator"],ans:2,exp:"Contact precautions require gloves and a gown for all contact with the client or environment."},
    {id:"e023",diff:"easy",cat:"Physiological",q:"What is the normal adult respiratory rate range?",opts:["8–10 breaths/min","12–20 breaths/min","20–28 breaths/min","28–36 breaths/min"],ans:1,exp:"Normal adult respiratory rate is 12–20 breaths per minute."},
    {id:"e024",diff:"easy",cat:"Health Promotion",q:"A nurse provides postpartum discharge teaching. Which statement by the client indicates she understands when to call her provider?",opts:["'I can expect some breast tenderness if I'm nursing.'","'I should call if I have a fever over 100.4°F.'","'Light spotting for 6 weeks is normal.'","'I can resume sexual activity after 2 weeks.'"],ans:1,exp:"A fever above 100.4°F (38°C) postpartum may indicate infection and requires immediate provider notification."},
    {id:"e025",diff:"easy",cat:"Physiological",q:"A client is ordered morphine 4 mg IV. The medication is available as 10 mg/mL. How many mL should the nurse administer?",opts:["0.2 mL","0.4 mL","0.8 mL","4 mL"],ans:1,exp:"4 mg ÷ 10 mg/mL = 0.4 mL."},
    {id:"e026",diff:"easy",cat:"Safe Care",q:"Which action best protects client confidentiality under HIPAA?",opts:["Discussing a client's condition in the hallway with a colleague","Logging off the EHR when leaving the workstation","Sharing login credentials with a trusted coworker","Leaving a printed report on the printer unattended"],ans:1,exp:"Logging off the EHR when unattended prevents unauthorized access to protected health information."},
    {id:"e027",diff:"easy",cat:"Physiological",q:"A client returning from surgery has a urinary catheter. Urine output for the past hour is 20 mL. The nurse's priority action is to:",opts:["Document and continue monitoring","Irrigate the catheter","Notify the provider","Increase IV fluid rate"],ans:2,exp:"Urine output below 30 mL/hr in an adult is considered oliguria and must be reported to the provider."},
    {id:"e028",diff:"easy",cat:"Psychosocial",q:"A client with schizophrenia says the television is sending personal messages to them. The nurse documents this as:",opts:["Illusion","Delusion of reference","Hallucination","Idea of grandeur"],ans:1,exp:"A delusion of reference is the false belief that objects, events, or people have a special personal significance."},
    {id:"e029",diff:"easy",cat:"Health Promotion",q:"The nurse teaches a client about testicular self-examination. The client should perform this:",opts:["Weekly after a cold shower","Monthly after a warm bath or shower","Daily in the morning","Every 3 months"],ans:1,exp:"Monthly TSE after a warm shower (when the scrotum is relaxed) is the recommended approach."},
    {id:"e030",diff:"easy",cat:"Physiological",q:"Which lab value indicates the client is at risk for bleeding?",opts:["Platelet count 250,000/mm³","INR 1.0","Platelets 48,000/mm³","Hemoglobin 12 g/dL"],ans:2,exp:"A platelet count below 50,000/mm³ places the client at significant risk for spontaneous bleeding."},

    // =====================================================================
    // MEDIUM
    // =====================================================================
    {id:"m001",diff:"medium",cat:"Safe Care",q:"A nurse in Florida is preparing to delegate tasks to a CNA. Which task is within a Florida CNA's scope of practice?",opts:["Inserting a urinary catheter","Obtaining a capillary blood glucose reading","Administering a Fleet enema","Performing wound irrigation"],ans:1,exp:"In Florida, CNAs may obtain capillary blood glucose readings after documented training. Catheter insertion and wound irrigation require licensed nursing skills."},
    {id:"m002",diff:"medium",cat:"Physiological",q:"A client with COPD is receiving oxygen therapy. The nurse notes the client's respiratory rate has dropped to 8 breaths/min. The most likely cause is:",opts:["Oxygen toxicity","Suppression of the hypoxic drive","Carbon dioxide narcosis","Oxygen-induced bronchospasm"],ans:1,exp:"Clients with COPD may rely on hypoxic drive to breathe; high-flow oxygen can suppress this drive and cause respiratory depression."},
    {id:"m003",diff:"medium",cat:"Physiological",q:"A client with a serum potassium of 6.2 mEq/L is likely to exhibit which ECG change?",opts:["U waves","Prolonged QT interval","Peaked T waves","Flattened P waves only"],ans:2,exp:"Peaked (tall, narrow) T waves are the earliest ECG sign of hyperkalemia."},
    {id:"m004",diff:"medium",cat:"Safe Care",q:"A nurse is caring for four clients. Which client should be seen first?",opts:["A client with COPD whose SpO₂ is 91% on 2 L O₂ nasal cannula (baseline)","A client post-appendectomy reporting pain of 5/10, requesting more pain medication","A client who had a TIA 12 hours ago reporting sudden difficulty speaking","A client with DM type 2 whose morning glucose is 185 mg/dL"],ans:2,exp:"Sudden aphasia in a client with recent TIA may indicate a new stroke — this is a life-threatening emergency requiring immediate assessment."},
    {id:"m005",diff:"medium",cat:"Psychosocial",q:"A client with alcohol use disorder has been NPO for 24 hours post-surgery. The nurse should monitor for which withdrawal symptom that indicates a medical emergency?",opts:["Irritability and insomnia","Mild tremors","Grand mal seizure","Mild diaphoresis"],ans:2,exp:"Seizures typically occur 24–48 hours after last drink and represent a severe withdrawal complication requiring immediate intervention."},
    {id:"m006",diff:"medium",cat:"Physiological",q:"A client is receiving a blood transfusion and develops chills, fever (103°F), and back pain 20 minutes into the transfusion. The priority nursing action is:",opts:["Slow the transfusion rate and notify the provider","Stop the transfusion and maintain IV access with normal saline","Administer diphenhydramine IV and continue transfusion","Obtain a urine specimen before stopping the transfusion"],ans:1,exp:"Signs of acute hemolytic transfusion reaction require immediate cessation. Maintain IV access with NS, not the transfusion tubing."},
    {id:"m007",diff:"medium",cat:"Health Promotion",q:"A nurse is teaching a 28-week pregnant client about pre-eclampsia warning signs. The client should report which symptom immediately?",opts:["Mild ankle swelling in the evening","Braxton-Hicks contractions","Sudden severe headache and visual changes","Light-headedness when standing quickly"],ans:2,exp:"Severe headache and visual disturbances (scotomas, blurry vision) are classic warning signs of pre-eclampsia with severe features."},
    {id:"m008",diff:"medium",cat:"Safe Care",q:"An LPN in Florida discovers that a colleague is documenting assessments for a client the colleague has not seen. The LPN's most appropriate action is to:",opts:["Confront the colleague directly and ask them to correct it","Document the observation in the client's chart","Report the concern to the nurse supervisor/charge nurse","Ignore it since it is not the LPN's responsibility"],ans:2,exp:"Falsified documentation is a patient safety issue. The LPN must report it through the chain of command (supervisor). Direct confrontation is secondary; ignoring is never appropriate."},
    {id:"m009",diff:"medium",cat:"Physiological",q:"A client with heart failure is prescribed furosemide 40 mg IV. Which assessment finding indicates the medication is effective?",opts:["Urine output of 30 mL/hr","Blood pressure increased to 150/90 mmHg","Urine output of 200 mL in 2 hours","Weight gain of 0.5 kg"],ans:2,exp:"Furosemide is a loop diuretic; significant urine output (diuresis) indicates effectiveness. Normal urine output alone (30 mL/hr) may not reflect therapeutic response in a fluid-overloaded patient."},
    {id:"m010",diff:"medium",cat:"Psychosocial",q:"A nurse is caring for a client who has just been told they have HIV. The client refuses to tell their sexual partner. The nurse's priority ethical action is to:",opts:["Respect the client's right to confidentiality and take no action","Contact the partner directly to inform them","Document the client's refusal and consult the healthcare team and ethics committee","Threaten to discharge the client if they don't notify their partner"],ans:2,exp:"This involves a conflict between confidentiality and duty to warn. The nurse must escalate through proper channels (team/ethics committee); direct partner notification violates HIPAA without proper legal authority."},
    {id:"m011",diff:"medium",cat:"Physiological",q:"A client with suspected pulmonary embolism is admitted. Which finding is the nurse most likely to assess?",opts:["Gradual onset of productive cough","Bradycardia and hypertension","Sudden onset of dyspnea and pleuritic chest pain","Bilateral crackles and dependent edema"],ans:2,exp:"PE classically presents with sudden dyspnea, pleuritic chest pain, and tachycardia. Bilateral crackles suggest heart failure."},
    {id:"m012",diff:"medium",cat:"Safe Care",q:"During medication reconciliation, the nurse notes a client is taking St. John's Wort. This is most concerning if the client also takes:",opts:["Metformin","Warfarin","Lisinopril","Calcium carbonate"],ans:1,exp:"St. John's Wort induces CYP enzymes and reduces warfarin levels, increasing clotting risk. It also has serotonin activity and interactions with SSRIs."},
    {id:"m013",diff:"medium",cat:"Physiological",q:"A client's ABG results show: pH 7.28, PaCO₂ 55 mmHg, HCO₃ 24 mEq/L. The nurse interprets this as:",opts:["Respiratory acidosis, uncompensated","Metabolic acidosis, uncompensated","Respiratory alkalosis","Metabolic alkalosis, partially compensated"],ans:0,exp:"Low pH = acidosis. Elevated PaCO₂ = respiratory cause. Normal HCO₃ = no compensation yet → respiratory acidosis, uncompensated."},
    {id:"m014",diff:"medium",cat:"Health Promotion",q:"A nurse is educating a client about insulin storage. Which instruction is correct?",opts:["Store all insulin vials in the freezer","Opened vials can be stored at room temperature for up to 28 days","Insulin should be shaken vigorously before use","Cloudy insulin is always spoiled and should be discarded"],ans:1,exp:"Most opened insulin vials can be stored at room temperature (<77°F) for 28 days. Freezing damages insulin; roll (don't shake) to mix cloudy types."},
    {id:"m015",diff:"medium",cat:"Psychosocial",q:"A client states, 'I'm going to kill myself tonight. I have a gun at home.' The nurse's priority action is:",opts:["Ask the client to promise not to harm themselves","Notify the provider and initiate a safety hold protocol","Contact the client's family immediately","Provide the client with the crisis hotline number and discharge"],ans:1,exp:"This is a specific, lethal plan — highest risk. The nurse must immediately notify the provider and initiate psychiatric hold/safety protocol."},
    {id:"m016",diff:"medium",cat:"Physiological",q:"A client is receiving IV heparin for DVT. The PTT result is 3 times the normal value. The nurse should:",opts:["Continue the infusion as prescribed","Increase the infusion rate by 10%","Hold the infusion and notify the provider","Administer protamine sulfate immediately without waiting for orders"],ans:2,exp:"PTT >2.5× normal with heparin indicates supratherapeutic levels and risk of bleeding. Hold infusion and notify the provider; protamine requires an order."},
    {id:"m017",diff:"medium",cat:"Safe Care",q:"An LPN is reviewing a new order that reads 'Tylenol PRN for pain.' The LPN should:",opts:["Administer the medication as written","Contact the provider for clarification on dose, route, and frequency","Ask the client how much they want","Assume 650 mg oral every 4–6 hours and document accordingly"],ans:1,exp:"Orders must be complete (drug, dose, route, frequency). An incomplete order requires clarification before administration."},
    {id:"m018",diff:"medium",cat:"Physiological",q:"A postoperative client reports pain at the surgical site, rated 7/10. The prescribed analgesic is due in 2 hours. The most appropriate initial nursing action is:",opts:["Administer the next dose early","Reposition the client and use non-pharmacological comfort measures","Ask the client to rate pain again in 30 minutes without intervention","Document the pain and wait for the scheduled dose"],ans:1,exp:"Non-pharmacological interventions (repositioning, heat/ice, distraction) can be initiated while the next dose becomes due."},
    {id:"m019",diff:"medium",cat:"Health Promotion",q:"A nurse is teaching a client with type 2 DM about foot care. Which instruction is most important?",opts:["Soak feet in hot water daily for 20 minutes","Wear open-toed sandals to prevent friction","Inspect feet daily for cuts, blisters, or redness","Apply lotion between the toes to prevent cracking"],ans:2,exp:"Daily foot inspection is the cornerstone of diabetic foot care to catch early injuries before neuropathy masks symptoms."},
    {id:"m020",diff:"medium",cat:"Physiological",q:"A client with chronic kidney disease has a serum phosphorus of 6.8 mg/dL. The nurse anticipates which medication will be ordered?",opts:["Calcium supplement","Vitamin D supplement","Phosphate binder (calcium carbonate)","Potassium supplement"],ans:2,exp:"Phosphate binders (taken with meals) reduce dietary phosphorus absorption in CKD patients with hyperphosphatemia."},
    {id:"m021",diff:"medium",cat:"Psychosocial",q:"A client with depression is started on fluoxetine. The nurse should teach the client that therapeutic effects are typically seen:",opts:["Within 24–48 hours","After 1 week","After 2–4 weeks","After 3 months"],ans:2,exp:"SSRIs typically take 2–4 weeks for full therapeutic effects to develop, though some clients notice early improvements."},
    {id:"m022",diff:"medium",cat:"Safe Care",q:"A nurse notes a client's IV site is swollen, pale, and cool to the touch. The nurse should first:",opts:["Apply warm compresses and reassess","Increase the IV rate to improve flow","Discontinue the IV and remove the catheter","Notify the provider before taking any action"],ans:2,exp:"These are signs of IV infiltration. The immediate action is to discontinue the IV catheter to prevent further tissue damage."},
    {id:"m023",diff:"medium",cat:"Physiological",q:"A client post-thyroidectomy reports tingling around the mouth and carpopedal spasm. The nurse should prepare to administer:",opts:["Potassium chloride IV","Calcium gluconate IV","Magnesium sulfate IV","Sodium bicarbonate IV"],ans:1,exp:"These are signs of hypocalcemia (tetany) from inadvertent parathyroid removal. Calcium gluconate is the treatment."},
    {id:"m024",diff:"medium",cat:"Health Promotion",q:"A nurse conducts a developmental assessment on a 15-month-old child. Which finding is ABNORMAL and requires further evaluation?",opts:["Walks with a wide-based, unsteady gait","Says only 2-3 single words","Does not yet use a pincer grasp","Has not yet begun to run"],ans:2,exp:"Pincer grasp (using thumb and forefinger to pick up small objects) should be present by 9-12 months. Absence at 15 months is a red flag for fine motor delay requiring further evaluation. A wide-base gait is expected in new walkers; 2-3 words is acceptable at 15 months (10 words is the 18-month milestone); running develops at 18-24 months."},
    {id:"m025",diff:"medium",cat:"Physiological",q:"A client with cirrhosis develops asterixis (flapping tremor). This finding indicates:",opts:["Alcohol withdrawal","Hepatic encephalopathy","Hepatorenal syndrome","Esophageal varices bleeding"],ans:1,exp:"Asterixis (liver flap) is a classic sign of hepatic encephalopathy caused by elevated ammonia levels."},
    {id:"m026",diff:"medium",cat:"Safe Care",q:"A nurse is caring for a client in restraints. How frequently must the nurse perform a restraint assessment (per CMS standards)?",opts:["Every 30 minutes","Every 1–2 hours","Every 4 hours","Every shift"],ans:1,exp:"CMS requires restraint monitoring and assessment at least every 2 hours (including circulation checks, repositioning, and offering toileting)."},
    {id:"m027",diff:"medium",cat:"Psychosocial",q:"A client with anorexia nervosa weighs 82 lb and is 5'4\". Which nursing priority is most important during initial hospitalization?",opts:["Addressing body image disturbance","Monitoring for refeeding syndrome","Teaching the client about caloric needs","Counseling the family about enabling behaviors"],ans:1,exp:"Refeeding syndrome (electrolyte imbalances, especially hypophosphatemia) is a life-threatening complication of nutritional rehabilitation and is the immediate physiological priority."},
    {id:"m028",diff:"medium",cat:"Physiological",q:"A client is ordered digoxin 0.125 mg PO daily. Before administering, the nurse assesses an apical pulse of 54 bpm. The nurse should:",opts:["Administer the digoxin as scheduled","Hold the digoxin and notify the provider","Administer half the dose","Recheck the pulse in 30 minutes and give if rate improves"],ans:1,exp:"Hold digoxin and notify the provider if apical pulse is below 60 bpm in adults (bradycardia is a sign of toxicity)."},
    {id:"m029",diff:"medium",cat:"Health Promotion",q:"A nurse is counseling a couple about genetic risk. Both parents are carriers of the autosomal recessive gene for cystic fibrosis. What is the probability their child will have cystic fibrosis?",opts:["0%","25%","50%","75%"],ans:1,exp:"Autosomal recessive: two carrier parents → 25% affected, 50% carrier, 25% unaffected."},
    {id:"m030",diff:"medium",cat:"Physiological",q:"A client with appendicitis is assessed by the nurse. Which finding indicates possible perforation?",opts:["Rebound tenderness only","Fever, sudden relief of pain followed by generalized abdominal pain","McBurney's point tenderness","Nausea and vomiting"],ans:1,exp:"A sudden relief of pain followed by diffuse rigidity and fever indicates rupture with peritonitis."},

    // =====================================================================
    // HARD
    // =====================================================================
    {id:"h001",diff:"hard",cat:"Safe Care",q:"A client with a serum sodium of 118 mEq/L is being treated with 3% hypertonic saline. After the first hour, the nurse reassesses. Which finding requires the infusion to be slowed or stopped immediately?",opts:["Serum sodium improved to 122 mEq/L","Client reports improved mentation","Urine output increased to 50 mL/hr","Serum sodium increased to 130 mEq/L within 2 hours"],ans:3,exp:"Sodium should not be corrected faster than 8–12 mEq/L per 24 hours. A jump of 12 mEq/L in 2 hours risks osmotic demyelination syndrome (central pontine myelinolysis)."},
    {id:"h002",diff:"hard",cat:"Physiological",q:"A client on mechanical ventilation has the following ABG: pH 7.50, PaCO₂ 29 mmHg, PaO₂ 85 mmHg, HCO₃ 24 mEq/L. The nurse should anticipate which ventilator adjustment?",opts:["Increase FiO₂","Decrease respiratory rate or tidal volume","Increase PEEP","Administer sodium bicarbonate"],ans:1,exp:"pH 7.50 + low PaCO₂ = respiratory alkalosis from over-ventilation. Reducing RR or TV allows CO₂ to rise toward normal."},
    {id:"h003",diff:"hard",cat:"Physiological",q:"A client presents with crushing chest pain, diaphoresis, and the 12-lead ECG shows ST elevation in leads II, III, and aVF. This pattern indicates:",opts:["Anterior wall MI","Lateral wall MI","Inferior wall MI","Posterior wall MI"],ans:2,exp:"Leads II, III, and aVF reflect the inferior wall of the left ventricle, perfused by the right coronary artery. STEMI in these leads = inferior MI."},
    {id:"h004",diff:"hard",cat:"Safe Care",q:"During morning rounds, an LPN discovers a co-worker has accessed a celebrity client's medical record without clinical reason. Under HIPAA and Florida law, the LPN should:",opts:["Warn the colleague informally","Document the breach in the client's chart","Report the incident to the privacy officer/supervisor immediately","Post about the breach on the hospital intranet to warn others"],ans:2,exp:"Unauthorized EHR access is a HIPAA breach. The LPN must report to the privacy officer/supervisor immediately. Informal warning or self-documenting in the chart are insufficient responses."},
    {id:"h005",diff:"hard",cat:"Physiological",q:"A client with septic shock has the following: MAP 58 mmHg, HR 130 bpm, lactate 6 mmol/L, urine output 18 mL/hr. The provider orders norepinephrine. The primary mechanism by which norepinephrine improves MAP in septic shock is:",opts:["Positive inotropic effect increasing cardiac output","Alpha-1-mediated vasoconstriction restoring vascular tone","Beta-2 bronchodilation improving oxygenation","Increasing circulating blood volume"],ans:1,exp:"Septic shock involves profound vasodilation. Norepinephrine's dominant alpha-1 effect constricts peripheral vessels, raising SVR and MAP. It has minimal volume effect."},
    {id:"h006",diff:"hard",cat:"Psychosocial",q:"A nurse is using motivational interviewing with a client who is ambivalent about quitting smoking. The client says, 'I know I should quit, but I just enjoy it too much.' The best MI response is:",opts:["'You really need to quit — it's killing you.'","'Most people who try to quit say it's the best decision they ever made.'","'It sounds like smoking gives you something valuable. What would quitting mean for you?'","'Tell me about the last time you tried to quit and what got in the way.'"],ans:2,exp:"Motivational interviewing uses reflective listening and exploring ambivalence. Reflecting the client's values ('gives you something valuable') and asking open questions about change honors autonomy without coercion."},
    {id:"h007",diff:"hard",cat:"Physiological",q:"A client develops stridor, hoarseness, and SpO₂ dropping to 88% within 30 minutes of receiving IV ampicillin. After stopping the drug, which medication should the nurse administer FIRST?",opts:["Diphenhydramine 50 mg IV","Methylprednisolone 125 mg IV","Epinephrine 0.3 mg IM (1:1000)","Albuterol nebulizer treatment"],ans:2,exp:"Anaphylaxis with laryngeal edema and hypoxia = life-threatening emergency. Epinephrine IM 1:1000 is always first-line. Antihistamines and steroids are adjuncts, not primary treatment."},
    {id:"h008",diff:"hard",cat:"Safe Care",q:"A nurse is preparing a client for a permanent pacemaker implantation. Which pre-procedure assessment finding requires the most immediate intervention before proceeding?",opts:["Client's INR is 1.5","Client's potassium is 2.9 mEq/L","Client has a latex allergy documented in the chart","Client has not received NPO education"],ans:1,exp:"Hypokalemia (K+ 2.9) increases risk of ventricular dysrhythmias and pacemaker-induced arrhythmias. This must be corrected before the procedure. INR 1.5 is mild and likely acceptable; latex allergy should be addressed but does not immediately cancel the procedure."},
    {id:"h009",diff:"hard",cat:"Physiological",q:"A nurse is caring for a post-op client following a Whipple procedure (pancreaticoduodenectomy). Which postoperative complication is the most immediately life-threatening if not recognized?",opts:["Delayed gastric emptying","Pancreatic fistula","Post-pancreatectomy hemorrhage","Wound dehiscence"],ans:2,exp:"Post-pancreatectomy hemorrhage (especially from pseudoaneurysm) carries a mortality rate of 20–50% and requires immediate surgical intervention. DGE and pancreatic fistula are serious but subacute."},
    {id:"h010",diff:"hard",cat:"Health Promotion",q:"A nurse in a Florida community clinic screens a 45-year-old client from Haiti for tuberculosis. The client reports BCG vaccination. The TST result is 12 mm induration. The nurse interprets this as:",opts:["Negative; BCG vaccination causes false positives and the test is invalid","Positive; the result exceeds the 10 mm threshold for persons from high-prevalence countries and BCG does not invalidate the interpretation","Borderline; repeat the TST in 8 weeks","Indeterminate; order an interferon-gamma release assay instead"],ans:1,exp:"CDC: In persons from high-TB-prevalence countries, a TST ≥10 mm is positive regardless of BCG history. BCG does not invalidate TST results in this population. IGRA is an option but the TST result here is definitive."},
    {id:"h011",diff:"hard",cat:"Physiological",q:"A client with SIADH has a serum sodium of 121 mEq/L and is symptomatic (confusion, nausea). In addition to fluid restriction, the nurse anticipates which treatment?",opts:["Isotonic (0.9%) saline infusion at 250 mL/hr","Furosemide IV with hypertonic (3%) saline","Desmopressin (DDAVP) administration","Sodium restriction to 1 g/day"],ans:1,exp:"Symptomatic severe hyponatremia from SIADH is treated with furosemide (to block ADH-mediated water retention) combined with hypertonic saline (to raise sodium). Plain isotonic saline can worsen SIADH."},
    {id:"h012",diff:"hard",cat:"Safe Care",q:"A nurse administers 10 units of regular insulin IV instead of subcutaneously as ordered. The client's glucose drops to 38 mg/dL. After correcting the hypoglycemia, what is the nurse's next required action?",opts:["Complete an incident/variance report","Inform the charge nurse and hide the error from the client to avoid distress","Reassess the client in 1 hour and document the glucose results","Nothing further; the error has been corrected and the client is stable"],ans:0,exp:"Medication errors require completion of a variance/incident report for quality improvement purposes, notification of the provider, and transparent disclosure to the client and family. Hiding the error violates ethical standards."},
    {id:"h013",diff:"hard",cat:"Psychosocial",q:"A nurse is caring for a client with borderline personality disorder who alternately praises some nurses as 'the only ones who care' and accuses others of being incompetent. The nurse recognizes this defense mechanism as:",opts:["Projection","Reaction formation","Splitting","Displacement"],ans:2,exp:"Splitting is a defense mechanism characteristic of BPD where people or situations are viewed as entirely good or entirely bad with no middle ground."},
    {id:"h014",diff:"hard",cat:"Physiological",q:"A client with rhabdomyolysis has a creatinine kinase of 85,000 U/L and is oliguric. Which intervention is the priority to prevent acute kidney injury?",opts:["Restrict fluid intake to prevent fluid overload","Administer aggressive IV fluid resuscitation (NS or LR)","Initiate hemodialysis","Administer furosemide to increase urine output"],ans:1,exp:"High-volume IV fluids (200–300 mL/hr to achieve UO 200–300 mL/hr) is the cornerstone of rhabdomyolysis management to flush myoglobin from the renal tubules. Furosemide may be added but IV fluids are first-line."},
    {id:"h015",diff:"hard",cat:"Health Promotion",q:"A nurse is screening a 38-year-old Black woman for cardiovascular risk. According to the most current guidelines, at what LDL-C threshold should statin therapy be initiated if the client has no other risk factors?",opts:["LDL ≥ 130 mg/dL","LDL ≥ 160 mg/dL","10-year ASCVD risk ≥ 7.5% regardless of LDL","LDL ≥ 190 mg/dL"],ans:2,exp:"AHA/ACC 2019 guidelines recommend initiating statin therapy when 10-year ASCVD risk is ≥7.5% in adults 40–75 years old, using the Pooled Cohort Equation — not LDL alone."},
    {id:"h016",diff:"hard",cat:"Physiological",q:"A client on TPN develops sudden onset of chest pain, hypotension, tachycardia, and decreased breath sounds on the left. The nurse suspects which complication?",opts:["Hyperglycemia","Catheter-related bloodstream infection","Pneumothorax from central line placement","Air embolism"],ans:3,exp:"Air embolism from central line: sudden cardiovascular collapse + respiratory symptoms. Turn client to LEFT lateral Trendelenburg position to trap air in the right ventricle. This is distinct from pneumothorax, which would not cause cardiovascular collapse this acutely in the same pattern."},
    {id:"h017",diff:"hard",cat:"Safe Care",q:"A pregnant nurse is assigned to care for a client receiving brachytherapy for cervical cancer. Which action by the charge nurse is most appropriate?",opts:["Reassign the client to a non-pregnant nurse","Allow the pregnant nurse to care for the client using a lead apron","Advise the pregnant nurse to limit exposure to 30 minutes per shift","Require the pregnant nurse to wear a dosimeter badge and proceed normally"],ans:0,exp:"ALARA (As Low As Reasonably Achievable) principles require that pregnant healthcare workers avoid or minimize radiation exposure. Reassignment protects the fetus, especially during organogenesis. A lead apron does not protect from all radiation types used in brachytherapy."},
    {id:"h018",diff:"hard",cat:"Physiological",q:"A client with liver failure is started on lactulose. The nurse explains that this medication's mechanism in hepatic encephalopathy is to:",opts:["Decrease ammonia production by eliminating gut bacteria","Acidify the colon to convert NH₃ to NH₄⁺ (ammonium), which is not absorbed, and promote bowel evacuation","Directly bind ammonia in the bloodstream","Improve liver function to better metabolize ammonia"],ans:1,exp:"Lactulose is fermented by colonic bacteria to acids (lactic, acetic, formic) that lower colonic pH, converting diffusible NH₃ to non-diffusible NH₄⁺, reducing ammonia absorption. It also has a cathartic effect."},
    {id:"h019",diff:"hard",cat:"Psychosocial",q:"A nurse is conducting a suicide risk assessment using the Columbia Suicide Severity Rating Scale (C-SSRS). The client has suicidal ideation with a plan, intent, and access to means. This level of risk corresponds to:",opts:["Low risk — increased monitoring only","Moderate risk — outpatient safety planning","High risk — psychiatric hospitalization required","Crisis level — immediately administer a benzodiazepine"],ans:2,exp:"On the C-SSRS, active ideation with a specific plan, intent, and means = high risk requiring immediate psychiatric evaluation and likely inpatient hospitalization."},
    {id:"h020",diff:"hard",cat:"Physiological",q:"A client is 2 hours post-CABG and the nurse notes the chest tube drainage has been 250 mL in the last 30 minutes. Blood pressure is 88/54 mmHg. The nurse's priority intervention is:",opts:["Milk or strip the chest tube to remove clots","Administer a 500 mL NS bolus","Immediately notify the surgeon","Increase oxygen flow rate to 10 L/min"],ans:2,exp:"Post-CABG drainage >200 mL/hr with hypotension indicates hemorrhage requiring immediate surgical evaluation. The surgeon must be notified STAT. Milking chest tubes is controversial and nurse-initiated fluid bolus may be insufficient — the priority is surgical notification."},
    {id:"h021",diff:"hard",cat:"Safe Care",q:"A nurse is preparing to administer a blood product to a client. The second nurse verifying the blood confirms a unit mismatch (different ABO type). The first nurse insists the charge nurse already approved it. The correct action is to:",opts:["Defer to the charge nurse's prior approval and administer","Refuse to administer and escalate the discrepancy to the blood bank and supervisor immediately","Administer the blood but document the discrepancy","Ask a third nurse to break the tie"],ans:1,exp:"ABO incompatibility can be fatal. No prior approval overrides a direct safety check at the bedside. The nurse must refuse, report to the blood bank, and escalate immediately."},
    {id:"h022",diff:"hard",cat:"Physiological",q:"A client with acute pancreatitis has a Ranson's criteria score of 5 at 48 hours. The nurse anticipates the client will likely require:",opts:["Oral clear liquid diet and discharge within 48 hours","Outpatient follow-up with enzyme replacement","ICU-level monitoring and possible surgical consultation","ERCP within 24 hours"],ans:2,exp:"Ranson's score ≥3 at 48 hours predicts severe pancreatitis with high morbidity/mortality. A score of 5 indicates critical illness requiring ICU care."},
    {id:"h023",diff:"hard",cat:"Health Promotion",q:"A Florida nurse is conducting community outreach about melanoma. Which person is at HIGHEST risk and should be referred for skin cancer screening?",opts:["A 25-year-old Hispanic woman with no family history who uses SPF 30 daily","A 45-year-old fair-skinned redhead who uses tanning beds monthly and has multiple atypical nevi","A 60-year-old Black man with no personal or family history of skin cancer","A 35-year-old who had a severe sunburn at age 10"],ans:1,exp:"Multiple risk factors: fair skin/red hair (Fitzpatrick I–II), tanning bed use (UV radiation), and atypical nevi (precursors to melanoma) = highest cumulative risk. Florida's high UV index amplifies risk."},
    {id:"h024",diff:"hard",cat:"Physiological",q:"A client receiving vancomycin develops flushing, erythema, and hypotension starting at the neck and spreading to the upper torso. Temperature is 37.1°C. This reaction is best described as:",opts:["Anaphylaxis requiring epinephrine","Red Man Syndrome from rapid infusion rate","Serum sickness from drug allergy","Type I IgE-mediated hypersensitivity"],ans:1,exp:"Red Man Syndrome is not true anaphylaxis (not IgE-mediated) — it's caused by non-immunologic histamine release from rapid vancomycin infusion. Treatment: slow or stop infusion, diphenhydramine. No epinephrine needed unless true anaphylaxis develops."},
    {id:"h025",diff:"hard",cat:"Psychosocial",q:"An LPN working in a Florida skilled nursing facility observes a nursing assistant pinch a resident who refused to take medication. The LPN's legally required action under Florida law is:",opts:["Counsel the nursing assistant privately","Document the observation in the resident's chart and continue monitoring","Report the incident to the charge nurse and the Florida Abuse Hotline (1-800-96-ABUSE) immediately","Report only to the facility administrator within 24 hours"],ans:2,exp:"Florida Statute 415.1034 mandates that healthcare workers report suspected abuse or neglect of vulnerable adults to the Florida Abuse Hotline (1-800-96-ABUSE/962-2873) immediately — the mandatory reporter law requires both internal reporting AND direct hotline notification."},
    {id:"h026",diff:"hard",cat:"Physiological",q:"A client with DKA has a pH of 7.18, glucose 520 mg/dL, and K⁺ of 3.1 mEq/L. The provider orders insulin infusion. The nurse's priority before starting insulin is to:",opts:["Administer sodium bicarbonate to correct acidosis first","Replace potassium to at least 3.5 mEq/L before beginning insulin","Start the insulin immediately as ordered — potassium can be corrected concurrently","Hold all fluids until glucose is below 300 mg/dL"],ans:1,exp:"Insulin drives K⁺ into cells. Starting insulin with K⁺ <3.5 mEq/L risks fatal hypokalemia. Potassium replacement to ≥3.5 mEq/L must occur before insulin infusion."},
    {id:"h027",diff:"hard",cat:"Safe Care",q:"A nurse suspects a client is experiencing therapeutic drug toxicity from lithium. Serum level is 2.3 mEq/L. Expected findings include all EXCEPT:",opts:["Coarse hand tremor","Confusion and ataxia","Polyuria and polydipsia","Slurred speech"],ans:2,exp:"Polyuria and polydipsia are seen at therapeutic levels (nephrogenic DI effect). Lithium toxicity (>1.5 mEq/L) presents with coarse tremor, ataxia, confusion, slurred speech, seizures, and dysrhythmias."},
    {id:"h028",diff:"hard",cat:"Physiological",q:"A client with advanced HF is receiving a continuous IV dobutamine infusion at home via PICC. The client calls the home health nurse and reports new-onset palpitations, a heart rate of 148 bpm, and feeling 'faint.' The nurse's priority action is:",opts:["Advise the client to lie down and reassess in 30 minutes","Instruct the client to stop the infusion and call 911","Reduce the dobutamine rate by 50% and notify the cardiologist","Administer a PRN dose of oral metoprolol if prescribed"],ans:1,exp:"Dobutamine at excessive rates can cause severe tachycardia and ventricular arrhythmias. HR 148 with presyncope in a dobutamine-infused patient = emergency. Stop infusion and call 911."},
    {id:"h029",diff:"hard",cat:"Health Promotion",q:"A nurse is educating a client about BRCA gene mutation testing. The client tests positive for BRCA1. The nurse correctly informs the client that this mutation confers approximately what lifetime risk of breast cancer?",opts:["15–25%","35–50%","55–72%","72–87%"],ans:2,exp:"BRCA1 mutation carriers have a lifetime breast cancer risk of approximately 55–72% (some studies cite up to 87%). This is substantially higher than the ~12% population risk."},
    {id:"h030",diff:"hard",cat:"Physiological",q:"A client develops sudden right-sided facial droop, arm drift, and slurred speech. Onset was 45 minutes ago. CT head shows no hemorrhage. The client's BP is 185/100 mmHg, INR 1.1, and glucose 92 mg/dL. The nurse prepares the client for:",opts:["Emergency craniotomy","IV tPA (alteplase) administration","Mechanical thrombectomy only (no IV thrombolytics)","Heparin anticoagulation therapy"],ans:1,exp:"This is ischemic stroke within the 4.5-hour tPA window with no hemorrhage on CT, INR <1.7, and glucose in range. IV alteplase (tPA) is the indicated treatment. BP must be <185/110 before administration (185/100 is acceptable). Thrombectomy may follow but tPA is first."},

    // =====================================================================
    // EASY e031–e060
    // =====================================================================
    {id:"e031",diff:"easy",cat:"Physiological",q:"A client has been vomiting for 12 hours. Which finding indicates early dehydration?",opts:["Hypotension and tachycardia","Sunken eyeballs","Intense thirst and dark concentrated urine","Decreased skin turgor"],ans:2,exp:"Thirst and concentrated (dark) urine are the earliest signs of dehydration as the body conserves water. Hypotension, tachycardia, and sunken eyes appear with moderate-to-severe dehydration."},
    {id:"e032",diff:"easy",cat:"Physiological",q:"A nurse is teaching a post-operative client how to use an incentive spirometer. Which instruction is correct?",opts:["Exhale forcefully into the mouthpiece to reach the target volume","Inhale slowly and deeply, hold for 3-5 seconds, then exhale","Use the device every 4 hours while awake","Lie flat on your back when using the spirometer for best results"],ans:1,exp:"Incentive spirometry requires a slow, deep inhalation held 3-5 seconds to fully expand alveoli and prevent atelectasis. The device should be used every 1-2 hours while awake; sitting upright is the correct position."},
    {id:"e033",diff:"easy",cat:"Physiological",q:"A nurse assesses a client with left-sided heart failure. Which finding is most expected?",opts:["Peripheral edema and jugular vein distension","Crackles in the lung bases and dyspnea","Ascites and hepatomegaly","Bradycardia and hypertension"],ans:1,exp:"Left-sided heart failure causes pulmonary congestion (crackles, dyspnea) from backup of blood into the pulmonary circulation. Peripheral edema, JVD, ascites, and hepatomegaly are signs of right-sided heart failure."},
    {id:"e034",diff:"easy",cat:"Physiological",q:"A nurse is assessing a client with a new ileostomy. Which characteristic of the stoma output is NORMAL?",opts:["Dark formed stool","Bright red blood in the effluent","Liquid green-brown effluent","No output for the first 48 hours"],ans:2,exp:"An ileostomy drains liquid to semi-liquid greenish-brown effluent since intestinal contents bypass the colon where water is absorbed. Formed stool, blood, or absence of output are abnormal findings."},
    {id:"e035",diff:"easy",cat:"Safe Care",q:"A nurse is teaching a client about cast care following a forearm fracture. Which instruction is most important?",opts:["Keep the cast dry at all times","Insert a blunt object under the cast to relieve itching","Report any numbness, tingling, or increasing pain immediately","Walk on the cast once it feels firm"],ans:2,exp:"Numbness, tingling, and increasing unrelieved pain are signs of neurovascular compromise or compartment syndrome requiring immediate assessment. Inserting objects under a cast risks infection and skin injury."},
    {id:"e036",diff:"easy",cat:"Safe Care",q:"A nurse is implementing seizure precautions for a hospitalized client. Which action is correct?",opts:["Restrain the client's limbs to prevent injury during a seizure","Place a bite block at the bedside for insertion during a seizure","Keep side rails padded and the bed in the lowest position","Restrict oral fluids to prevent seizures"],ans:2,exp:"Padded side rails and a low bed position protect against falls and injury during a seizure. Restraining limbs during a seizure can cause fractures; bite blocks are no longer recommended as they can cause dental or airway injury."},
    {id:"e037",diff:"easy",cat:"Physiological",q:"A nurse assesses a client with Cushing's syndrome. Which physical finding is characteristic?",opts:["Weight loss and hyperpigmentation","Moon face, buffalo hump, and truncal obesity","Exophthalmos and heat intolerance","Thin extremities and hypotension"],ans:1,exp:"Cushing's syndrome (excess cortisol) causes fat redistribution: moon face, buffalo hump (upper back), and truncal obesity. Hyperpigmentation and weight loss are Addison's disease features; exophthalmos is a hyperthyroidism feature."},
    {id:"e038",diff:"easy",cat:"Physiological",q:"During peritoneal dialysis, the nurse notes the effluent is clear and light yellow. The nurse interprets this as:",opts:["A sign of peritonitis requiring immediate reporting","A normal finding","Evidence that the dwell time was too short","A sign of blood contamination"],ans:1,exp:"Clear, straw-colored effluent is normal peritoneal dialysis drainage. Cloudy or turbid drainage indicates possible peritonitis and requires immediate reporting."},
    {id:"e039",diff:"easy",cat:"Health Promotion",q:"The MMR (measles, mumps, rubella) vaccine is first administered at which age?",opts:["2 months","6 months","12-15 months","4-6 years"],ans:2,exp:"The first MMR dose is given at 12-15 months; the second at 4-6 years. The 2-month schedule includes DTaP, IPV, Hib, hepatitis B, and PCV — not MMR."},
    {id:"e040",diff:"easy",cat:"Physiological",q:"A nurse is teaching a postpartum client about normal lochia changes. Which sequence is correct?",opts:["Serosa then Rubra then Alba","Rubra then Serosa then Alba","Alba then Rubra then Serosa","Rubra then Alba then Serosa"],ans:1,exp:"Normal lochia progresses from rubra (bright red, days 1-3) to serosa (pinkish-brown, days 4-10) to alba (white-yellow, day 11 onward) as healing occurs and bleeding diminishes."},
    {id:"e041",diff:"easy",cat:"Safe Care",q:"A client is on neutropenic precautions following chemotherapy. Which action is correct?",opts:["Allow fresh fruit and vegetables at meals","Assign the client to a private room with positive-pressure airflow","Restrict all visitors from entering the room","Change the PICC line dressing every 72 hours only"],ans:1,exp:"Neutropenic clients require a private room with positive-pressure (HEPA-filtered) airflow to protect against airborne organisms. Fresh uncooked produce harbors bacteria and should be avoided; visitors without active infections may visit with precautions."},
    {id:"e042",diff:"easy",cat:"Safe Care",q:"Which disease requires airborne precautions?",opts:["Influenza","Meningococcal meningitis","Active pulmonary tuberculosis","Clostridium difficile infection"],ans:2,exp:"Active pulmonary TB requires airborne precautions (negative-pressure room, N95 respirator) because M. tuberculosis is transmitted by small droplet nuclei that remain airborne. Influenza and meningococcal meningitis require droplet precautions; C. diff requires contact precautions."},
    {id:"e043",diff:"easy",cat:"Physiological",q:"A nurse is preparing to administer NPH insulin. Which time frame represents the peak action of NPH insulin?",opts:["30-60 minutes after injection","4-12 hours after injection","1-3 hours after injection","Greater than 24 hours after injection"],ans:1,exp:"NPH (intermediate-acting) insulin peaks at 4-12 hours after injection and lasts 16-24 hours. Regular insulin peaks at 1-3 hours; glargine (long-acting) has no pronounced peak."},
    {id:"e044",diff:"easy",cat:"Psychosocial",q:"A client is becoming increasingly agitated and raising their voice. The nurse's first de-escalation action is:",opts:["Call security immediately","Speak calmly using the client's name and acknowledge their feelings","Administer a PRN sedative medication","Place the client in seclusion"],ans:1,exp:"The first step in de-escalation is verbal intervention: speak in a calm voice, address the client by name, and validate their feelings. Medication, seclusion, and security are used only when verbal de-escalation fails."},
    {id:"e045",diff:"easy",cat:"Safe Care",q:"Which task is appropriate to delegate to a certified nursing assistant (CNA)?",opts:["Assessing breath sounds in a client with pneumonia","Teaching a diabetic client about foot care","Measuring and recording vital signs in a stable client","Administering an oral suppository"],ans:2,exp:"Measuring and recording vital signs in stable clients is within CNA scope of practice. Assessment, patient teaching, and medication administration require licensed nursing skills and cannot be delegated to a CNA."},
    {id:"e046",diff:"easy",cat:"Safe Care",q:"A client asks about an advance directive. The nurse correctly explains that an advance directive:",opts:["Allows family members to make financial decisions for the client","Is a legal document specifying wishes for care if the client cannot communicate","Must be completed in the hospital on admission","Only applies to clients who are terminally ill"],ans:1,exp:"An advance directive (living will or healthcare proxy) guides medical decisions if the client loses decision-making capacity. It does not govern financial decisions and can be prepared at any time, not only on admission or for terminal diagnoses."},
    {id:"e047",diff:"easy",cat:"Physiological",q:"A client with hypernatremia (serum sodium 158 mEq/L) is most likely to exhibit which finding?",opts:["Muscle cramps and hyperreflexia","Intense thirst, agitation, and dry sticky mucous membranes","Bradycardia and peaked T waves on ECG","Generalized edema and weight gain"],ans:1,exp:"Hypernatremia causes cellular dehydration: intense thirst, agitation from brain cell shrinkage, and dry sticky mucous membranes. Muscle cramps and peaked T waves are hyperkalemia signs; edema occurs with fluid overload."},
    {id:"e048",diff:"easy",cat:"Safe Care",q:"When performing tracheostomy suctioning, the nurse should limit each suction pass to no more than:",opts:["5 seconds","10 seconds","20 seconds","30 seconds"],ans:1,exp:"Each suction pass should last no longer than 10 seconds to prevent hypoxia. The nurse should pre-oxygenate with 100% O2 before suctioning and allow recovery time between passes."},
    {id:"e049",diff:"easy",cat:"Physiological",q:"The nurse is monitoring a client's central venous pressure (CVP). Which value falls within the normal range?",opts:["0-1 mmHg","2-8 mmHg","12-18 mmHg","20-25 mmHg"],ans:1,exp:"Normal CVP is 2-8 mmHg (or 5-10 cm H2O). Values below 2 mmHg suggest hypovolemia; values above 8 mmHg suggest fluid overload or right-sided heart failure."},
    {id:"e050",diff:"easy",cat:"Safe Care",q:"What is the most reliable method to verify nasogastric tube placement before administering a feeding?",opts:["Auscultating the epigastrum while injecting 20 mL of air","Checking that the client can speak normally","Confirming placement by X-ray","Testing aspirate pH alone"],ans:2,exp:"X-ray confirmation is the gold standard for verifying NG tube placement, especially for newly inserted tubes. Auscultation of air is unreliable because air in a misplaced (pulmonary) tube can mimic correct placement."},
    {id:"e051",diff:"easy",cat:"Physiological",q:"A client with a casted leg reports pain not relieved by opioids. The nurse also notes pallor and paresthesia in the toes. These are signs of:",opts:["Normal post-fracture discomfort","Deep vein thrombosis","Compartment syndrome","Osteomyelitis"],ans:2,exp:"The classic 5 P's of compartment syndrome are Pain (disproportionate, unrelieved by opioids), Pallor, Paresthesia, Pulselessness, and Paralysis. This is a surgical emergency."},
    {id:"e052",diff:"easy",cat:"Physiological",q:"The nurse is monitoring a client with a head injury. Which intracranial pressure (ICP) reading is within the normal range?",opts:["2 mmHg","10 mmHg","20 mmHg","30 mmHg"],ans:1,exp:"Normal ICP is 5-15 mmHg. Values consistently above 20 mmHg indicate intracranial hypertension and require immediate intervention to prevent herniation."},
    {id:"e053",diff:"easy",cat:"Physiological",q:"A client with Addison's disease is most likely to have which electrolyte pattern?",opts:["Hyponatremia and hyperkalemia","Hypernatremia and hypokalemia","Hypercalcemia and hyperphosphatemia","Hypernatremia and hyperkalemia"],ans:0,exp:"In Addison's disease, deficient aldosterone causes sodium wasting (hyponatremia) and potassium retention (hyperkalemia). This is opposite to Cushing's syndrome, which causes hypernatremia and hypokalemia."},
    {id:"e054",diff:"easy",cat:"Physiological",q:"A client is admitted with acute kidney injury (AKI). The nurse's priority assessments are:",opts:["Daily weight and skin turgor","Urine output and serum potassium level","Blood pressure and respiratory rate only","Serum albumin and protein intake"],ans:1,exp:"In AKI the priority assessments are urine output (monitoring oliguria/anuria) and serum potassium, because hyperkalemia from decreased renal excretion is the most immediately life-threatening electrolyte disturbance."},
    {id:"e055",diff:"easy",cat:"Physiological",q:"A parent calls to report their 18-month-old had a febrile seizure that lasted 2 minutes and stopped on its own. The nurse's most appropriate response is:",opts:["Tell the parent to call 911 immediately — this is an emergency","Tell the parent this is expected and no follow-up is needed","Advise the parent to bring the child in for evaluation and monitor for recurrence","Instruct the parent to give aspirin to lower the fever"],ans:2,exp:"Simple febrile seizures lasting <15 minutes that resolve spontaneously are common in children aged 6 months to 5 years. The child should be evaluated for the source of fever. Aspirin is contraindicated in children due to Reye syndrome risk."},
    {id:"e056",diff:"easy",cat:"Health Promotion",q:"An Rh-negative mother delivers an Rh-positive baby. When should RhoGAM be administered?",opts:["During the second trimester only","Within 72 hours after delivery","Only if the mother develops anti-D antibodies","At 36 weeks gestation only"],ans:1,exp:"RhoGAM is given to Rh-negative mothers within 72 hours after delivery of an Rh-positive baby to prevent maternal sensitization. It is also given prophylactically at 28 weeks gestation."},
    {id:"e057",diff:"easy",cat:"Physiological",q:"A client undergoing chemotherapy develops tumor lysis syndrome. Which laboratory finding is expected?",opts:["Hypercalcemia and hypokalemia","Hyperuricemia and hyperkalemia","Hyponatremia and hypophosphatemia","Hypernatremia and hypercalcemia"],ans:1,exp:"Tumor lysis syndrome occurs when cancer cells rapidly break down, releasing intracellular contents: uric acid (hyperuricemia), potassium (hyperkalemia), and phosphate (hyperphosphatemia) all rise. Calcium falls (hypocalcemia)."},
    {id:"e058",diff:"easy",cat:"Safe Care",q:"A client has Clostridium difficile (C. diff) infection. Which PPE is required when entering the room?",opts:["N95 respirator and goggles","Surgical mask and face shield","Gloves and gown","Gloves alone"],ans:2,exp:"C. diff requires contact precautions: gloves and gown for all contact with the client and environment. C. diff spores are not destroyed by alcohol-based hand sanitizer; soap and water handwashing is required after glove removal."},
    {id:"e059",diff:"easy",cat:"Safe Care",q:"A client on warfarin has an INR of 8.5 and is actively bleeding. The nurse anticipates which reversal agent?",opts:["Protamine sulfate","Vitamin K (phytonadione) and fresh frozen plasma","Idarucizumab (Praxbind)","Andexanet alfa"],ans:1,exp:"Warfarin is reversed with Vitamin K (sustained reversal) and fresh frozen plasma or 4-factor PCC (immediate reversal for active bleeding). Protamine reverses heparin; idarucizumab reverses dabigatran."},
    {id:"e060",diff:"easy",cat:"Psychosocial",q:"Client A has rapid-onset confusion that fluctuates through the day. Client B has gradually worsening memory loss over several years. The nurse correctly identifies:",opts:["Both clients have dementia","Client A has delirium; Client B has dementia","Client A has dementia; Client B has delirium","Both have psychiatric disorders requiring transfer"],ans:1,exp:"Delirium is characterized by acute onset and fluctuating course; dementia (including Alzheimer's) develops gradually over years. Identifying delirium is critical because it is often reversible when the underlying cause is treated."},

    // =====================================================================
    // MEDIUM m031–m060
    // =====================================================================
    {id:"m031",diff:"medium",cat:"Physiological",q:"A client is admitted with hypocalcemia (calcium 6.8 mg/dL). Which assessment finding requires the most immediate nursing intervention?",opts:["Muscle cramps and tingling in the fingers","Positive Chvostek's sign","Laryngospasm with audible stridor","Prolonged QT interval on ECG"],ans:2,exp:"Laryngospasm is the most life-threatening complication of severe hypocalcemia, causing airway obstruction. All listed findings occur in hypocalcemia, but airway compromise takes priority over cardiac and neuromuscular effects."},
    {id:"m032",diff:"medium",cat:"Physiological",q:"A nurse performs chest physiotherapy (CPT) to drain secretions from a client's right lower lobe. The correct position is:",opts:["Supine (flat on back)","Left lateral position with the foot of the bed elevated","Semi-Fowler's at 45 degrees","Prone with the head flat"],ans:1,exp:"To drain the right lower lobe, gravity-assisted postural drainage requires the client to lie on the LEFT side with the foot of the bed elevated 30-45 degrees. CPT should be done before meals to reduce aspiration risk."},
    {id:"m033",diff:"medium",cat:"Physiological",q:"A client with chronic HF is admitted in acute exacerbation with SpO2 82%, RR 32, and audible inspiratory crackles. The priority intervention is:",opts:["Obtain a 12-lead ECG","Administer furosemide 40 mg IV as prescribed","Apply supplemental oxygen and place the client in high-Fowler's position","Insert a Foley catheter to measure urine output"],ans:2,exp:"Airway and oxygenation take priority. SpO2 82% and RR 32 indicate critical respiratory distress. High-Fowler's reduces preload and improves lung expansion; oxygen corrects hypoxia. Furosemide and ECG follow after stabilizing oxygenation."},
    {id:"m034",diff:"medium",cat:"Physiological",q:"A client learning sigmoid colostomy irrigation states: 'I will irrigate my colostomy every 4 hours throughout the day.' The nurse's response indicates:",opts:["The client understands the procedure correctly","The client needs further teaching — irrigation is performed once daily","The frequency is correct only for descending colostomies","Irrigation every 4 hours is recommended for the first two weeks only"],ans:1,exp:"Sigmoid colostomy irrigation is performed once daily (not every 4 hours) to regulate bowel movements. Irrigation volume is typically 500-1000 mL of warm water and takes about 30-45 minutes."},
    {id:"m035",diff:"medium",cat:"Safe Care",q:"A client had a right total hip arthroplasty via the posterior approach. Which action by the client requires the nurse to intervene?",opts:["Sitting in a chair with hips at 90 degrees","Placing a pillow between the knees when lying on the side","Reaching down to put on shoes without an adaptive device","Using a raised toilet seat"],ans:2,exp:"After posterior total hip replacement, hip flexion must not exceed 90 degrees. Bending forward to reach shoes violates the flexion restriction and risks dislocation. Adaptive devices (long-handled shoe horns, sock aids) are required."},
    {id:"m036",diff:"medium",cat:"Safe Care",q:"A nurse is planning care for a client with Parkinson's disease. Which intervention is the highest priority for client safety?",opts:["Encouraging the client to write in a journal daily","Monitoring for aspiration during meals due to dysphagia","Teaching the client to increase dietary fiber intake","Scheduling occupational therapy for fine motor exercises"],ans:1,exp:"Aspiration is a leading cause of death in Parkinson's disease due to dysphagia and impaired swallowing coordination. Monitoring during meals and implementing safe swallowing strategies is the priority safety intervention."},
    {id:"m037",diff:"medium",cat:"Physiological",q:"A post-thyroidectomy client develops temperature 104 degrees F, HR 148 bpm, extreme agitation, and diaphoresis on post-op day 1. The nurse suspects thyroid storm. The immediate priority action is:",opts:["Apply cooling blankets and administer acetaminophen","Notify the provider immediately and prepare to implement emergency orders","Administer iodine solution as a standing PRN order","Increase IV fluids to manage the hyperthermia"],ans:1,exp:"Thyroid storm is a life-threatening emergency requiring immediate physician notification and rapid multi-drug intervention (beta-blockers, PTU, iodine, corticosteroids). The nurse must notify the provider immediately and cannot independently initiate treatment."},
    {id:"m038",diff:"medium",cat:"Safe Care",q:"A client has an arteriovenous (AV) fistula for hemodialysis. Which nursing action is most important?",opts:["Assess for a bruit and thrill over the fistula every shift","Use the fistula arm for all blood draws to protect other veins","Apply a BP cuff on the fistula arm for accurate readings","Keep the fistula arm in a dependent position to improve flow"],ans:0,exp:"Assessing for a bruit (heard with stethoscope) and thrill (felt by palpation) each shift confirms fistula patency. The fistula arm must never be used for blood draws, IV access, or BP measurement, as these can damage the fistula and cause thrombosis."},
    {id:"m039",diff:"medium",cat:"Physiological",q:"A 4-month-old with RSV bronchiolitis is admitted. Which assessment finding requires the most urgent intervention?",opts:["Low-grade fever of 100.8 degrees F","Nasal congestion with clear rhinorrhea","Nasal flaring, intercostal retractions, and SpO2 of 88%","Decreased appetite and mild irritability"],ans:2,exp:"Nasal flaring, intercostal retractions, and SpO2 88% indicate significant respiratory distress in an infant requiring immediate oxygen and possible suctioning. Fever, congestion, and mild irritability are expected with RSV bronchiolitis."},
    {id:"m040",diff:"medium",cat:"Physiological",q:"A postpartum nurse assesses a client and finds a boggy fundus displaced to the right and two saturated perineal pads in one hour. The priority nursing action is:",opts:["Notify the provider immediately","Massage the fundus and encourage the client to void","Administer oxytocin as prescribed","Apply ice to the perineum"],ans:1,exp:"A boggy, deviated fundus often results from bladder distension (a full bladder prevents uterine contraction and displaces the fundus). The first action is fundal massage and encouraging voiding. If the fundus remains boggy after voiding, notify the provider."},
    {id:"m041",diff:"medium",cat:"Safe Care",q:"A nurse administering IV vesicant chemotherapy notes the client reports pain and burning at the IV site with surrounding swelling. The priority action is:",opts:["Slow the infusion rate and apply a warm compress","Stop the infusion immediately, leave the cannula in place, and aspirate residual drug","Flush the line with 20 mL NS and reassess in 15 minutes","Notify the oncologist before taking any action"],ans:1,exp:"Extravasation of a vesicant causes severe tissue necrosis. The infusion must be stopped immediately while leaving the cannula in place to aspirate residual drug and allow antidote administration. Flushing would drive more drug into tissue."},
    {id:"m042",diff:"medium",cat:"Safe Care",q:"A nurse is preparing to enter the room of a client on contact and droplet precautions. What is the correct sequence for donning PPE?",opts:["Mask, gown, gloves, goggles","Gown, mask/respirator, goggles/face shield, gloves","Gloves, gown, mask, goggles","Mask, gloves, gown, goggles"],ans:1,exp:"The CDC donning sequence is: gown first, then mask/respirator, then goggles/face shield, then gloves last to avoid contaminating them. Doffing is the reverse: gloves first, then goggles, gown, then mask/respirator last."},
    {id:"m043",diff:"medium",cat:"Health Promotion",q:"A client is prescribed phenelzine (an MAOI antidepressant). The nurse should teach the client to avoid which food?",opts:["White rice and plain chicken","Aged cheese, red wine, and cured meats","Fresh bananas and apples","Milk and yogurt"],ans:1,exp:"MAOIs inhibit tyramine metabolism; consuming tyramine-rich foods (aged cheeses, red wine, cured or smoked meats, sauerkraut) can trigger a hypertensive crisis. Fresh fruits, plain meats, and unaged dairy are generally safe."},
    {id:"m044",diff:"medium",cat:"Psychosocial",q:"A 78-year-old client is confused overnight after hip surgery with no prior cognitive history. Which finding best differentiates delirium from dementia?",opts:["The confusion is worse at night (sundowning)","The confusion developed acutely in a client with no prior cognitive impairment","The client cannot state the current year","The client is agitated and pulling at IV tubing"],ans:1,exp:"Delirium is distinguished from dementia by its acute onset in a client without prior cognitive impairment. Sundowning, disorientation, and agitation occur in both conditions; the key differentiator is acute versus gradual onset."},
    {id:"m045",diff:"medium",cat:"Safe Care",q:"A nurse calls the provider about a client with worsening dyspnea using the SBAR format. Which statement belongs in the 'R' (Recommendation) component?",opts:["The client is a 67-year-old admitted for COPD exacerbation","SpO2 dropped from 94% to 86% in two hours despite oxygen","I believe the client needs a repeat chest X-ray and possible ABG analysis","The client has a history of COPD, hypertension, and prior PE"],ans:2,exp:"SBAR: S=Situation, B=Background, A=Assessment, R=Recommendation. Option C states what the nurse is requesting from the provider — the Recommendation component. Options A and D are Background; Option B is Assessment."},
    {id:"m046",diff:"medium",cat:"Safe Care",q:"After signing a surgical consent form, a client tells the nurse they did not fully understand the risks explained. The nurse's best response is:",opts:["The form is already signed so the consent is valid","Re-explain the procedure and risks to the client","Notify the surgeon that the client has questions before proceeding","Reassure the client that the surgeon is very experienced"],ans:2,exp:"Obtaining informed consent is the physician's responsibility. If a client expresses uncertainty about risks after signing, the nurse must notify the surgeon before proceeding. Re-explaining risks is outside the nurse's scope for consent purposes."},
    {id:"m047",diff:"medium",cat:"Physiological",q:"A laboring client on magnesium sulfate for pre-eclampsia has RR 10/min, absent deep tendon reflexes, and serum Mg 9.2 mEq/L. The priority nursing action is:",opts:["Increase the magnesium infusion to maintain therapeutic levels","Stop the magnesium infusion and prepare to administer calcium gluconate IV","Place the client in Trendelenburg position","Administer a 500 mL NS fluid bolus"],ans:1,exp:"Respiratory depression (RR <12/min) and loss of deep tendon reflexes at serum Mg >8 mEq/L indicate magnesium toxicity. The infusion must be stopped and calcium gluconate (the antidote) administered immediately."},
    {id:"m048",diff:"medium",cat:"Health Promotion",q:"A client with persistent asthma asks why they must use albuterol BEFORE the inhaled corticosteroid. The nurse's best response is:",opts:["Albuterol has fewer side effects so it is safer to use first","Albuterol opens the airways first so the corticosteroid can penetrate deeper into the lungs","The order does not matter as long as both medications are used","Steroids work better if taken 30 minutes after albuterol"],ans:1,exp:"Albuterol (bronchodilator) is used first to open constricted airways, enabling the inhaled corticosteroid (anti-inflammatory) to reach smaller airways and achieve maximum effect. Reversing the order reduces corticosteroid efficacy."},
    {id:"m049",diff:"medium",cat:"Safe Care",q:"A client's permanent pacemaker is set at 72 bpm. The ECG shows a rate of 52 bpm without pacemaker spikes. The nurse should:",opts:["Reassess in 30 minutes — the rate is within acceptable range","Administer atropine 0.5 mg IV as ordered","Notify the provider immediately — this may indicate pacemaker malfunction","Increase the pacemaker rate to 80 bpm independently"],ans:2,exp:"A heart rate of 52 bpm below the set pacemaker rate of 72 bpm without visible pacemaker spikes suggests pacemaker malfunction (failure to fire or capture). This requires immediate provider notification."},
    {id:"m050",diff:"medium",cat:"Physiological",q:"A client is admitted with suspected small bowel obstruction. Which assessment finding is most consistent with this diagnosis?",opts:["Absent bowel sounds throughout all quadrants","High-pitched tinkling bowel sounds and abdominal distension","Dull percussion over the right lower quadrant","Soft abdomen with mild diffuse tenderness"],ans:1,exp:"Early small bowel obstruction produces high-pitched, hyperactive tinkling bowel sounds from peristalsis pushing against the obstruction, along with distension. Late obstruction causes absent bowel sounds as peristalsis ceases — a more dangerous sign."},
    {id:"m051",diff:"medium",cat:"Safe Care",q:"A nurse is caring for a client in skeletal traction with pin sites. Which nursing action is correct?",opts:["Clean pin sites with povidone-iodine solution twice daily regardless of facility protocol","Observe pin sites daily for signs of infection: redness, warmth, or purulent drainage","Apply antibiotic ointment to pin sites after every meal","Cover pin sites with occlusive dressings to prevent air exposure"],ans:1,exp:"Daily inspection of pin sites for infection (redness, warmth, purulent drainage) is the priority nursing responsibility. Specific pin site care protocols (cleansing agents, dressings) vary by facility and require a provider order."},
    {id:"m052",diff:"medium",cat:"Safe Care",q:"A client recovering from a left-sided ischemic stroke has right-sided hemiplegia. Which positioning intervention is correct?",opts:["Keep the affected arm in a dependent position to improve circulation","Position the client in a chair with the arm supported and the foot flat on a footrest","Maintain strict bedrest for 48 hours to prevent increased ICP","Apply wrist restraints to the affected side to prevent falls"],ans:1,exp:"Proper positioning after stroke prevents contractures, shoulder subluxation, and skin breakdown. The affected arm should be supported (not dependent), and the foot placed flat to prevent footdrop. Early mobilization to chair is encouraged after stabilization."},
    {id:"m053",diff:"medium",cat:"Physiological",q:"A client is admitted with Cushing's syndrome. Which nursing diagnosis is the highest priority?",opts:["Disturbed body image related to physical changes","Risk for infection related to immunosuppression from excess cortisol","Imbalanced nutrition: more than body requirements","Deficient knowledge about medication management"],ans:1,exp:"Excess cortisol suppresses the immune system, making clients with Cushing's syndrome highly susceptible to life-threatening infections. This physiological safety risk takes priority over psychosocial, nutritional, and educational diagnoses."},
    {id:"m054",diff:"medium",cat:"Physiological",q:"During peritoneal dialysis the nurse notes cloudy effluent draining from the client. The most appropriate action is:",opts:["Continue dialysis — turbid effluent is normal after the first few exchanges","Stop the dialysis, send effluent for culture, and notify the provider immediately","Increase the dwell time to allow more fluid to drain","Warm the dialysate to increase clarity of the effluent"],ans:1,exp:"Cloudy (turbid) peritoneal dialysis effluent is the hallmark sign of peritonitis, a life-threatening complication. The nurse must stop dialysis, send a specimen for culture/cell count, and notify the provider immediately."},
    {id:"m055",diff:"medium",cat:"Health Promotion",q:"A parent brings a 24-month-old for a well-child visit. Which developmental finding requires immediate further evaluation?",opts:["The child uses two-word phrases like 'more milk'","The child walks steadily and begins to run","The child has no spoken words and does not point to objects","The child engages in parallel play rather than cooperative play"],ans:2,exp:"By 24 months a child should have at least 50 words and use two-word phrases. No spoken words and failure to point are red flags for autism spectrum disorder or language delay requiring immediate referral. Parallel play is developmentally normal at age 2."},
    {id:"m056",diff:"medium",cat:"Physiological",q:"A nurse suspects a pregnant client has HELLP syndrome. Which laboratory findings are consistent with this diagnosis?",opts:["Elevated hemoglobin, leukocytosis, and thrombocytosis","Hemolysis (elevated LDH), elevated liver enzymes (AST/ALT), and low platelets","Hyponatremia, elevated BUN, and metabolic alkalosis","Elevated BNP, decreased albumin, and prolonged PT"],ans:1,exp:"HELLP stands for Hemolysis, Elevated Liver enzymes, Low Platelets. Elevated LDH indicates RBC hemolysis; elevated AST/ALT indicate hepatocellular damage; thrombocytopenia (<100,000/mm3) increases hemorrhage risk."},
    {id:"m057",diff:"medium",cat:"Safe Care",q:"A chemotherapy client has a WBC of 2,400/mm3 with 30% neutrophils. The nurse calculates the absolute neutrophil count (ANC) as:",opts:["2,400","720","1,680","1,000"],ans:1,exp:"ANC = Total WBC x % neutrophils = 2,400 x 0.30 = 720/mm3. An ANC <1,000/mm3 requires neutropenic precautions; ANC <500/mm3 is severe neutropenia. This client's ANC of 720 requires protective precautions."},
    {id:"m058",diff:"medium",cat:"Safe Care",q:"A client's pain regimen is being transitioned from IV morphine to oral oxycodone. The nurse's correct action is:",opts:["Use the same dose — IV and oral are equivalent","Reduce the dose by exactly 50% when switching to oral oxycodone","Calculate the equianalgesic dose using a conversion table in consultation with pharmacy or the provider","Double the IV dose for the oral formulation"],ans:2,exp:"Opioid equianalgesic conversions must use standardized conversion tables in consultation with pharmacy or the provider. Conversion ratios vary by drug, route, and individual patient factors. The nurse does not independently determine opioid dose changes."},
    {id:"m059",diff:"medium",cat:"Psychosocial",q:"A client is scheduled for electroconvulsive therapy (ECT) for treatment-resistant depression. Which pre-procedure nursing action is the priority?",opts:["Provide a full breakfast to maintain blood sugar during the procedure","Ensure the client has signed informed consent and is NPO per protocol","Remove dentures only if requested by the anesthesiologist","Explain that the client will be conscious and feel the electrical stimulus"],ans:1,exp:"ECT requires written informed consent and the client must be NPO before the procedure to prevent aspiration during anesthesia. Clients receive general anesthesia during ECT and do not feel pain or the electrical stimulus."},
    {id:"m060",diff:"medium",cat:"Safe Care",q:"A nurse proceeds to insert a nasogastric tube in a competent adult who verbally refuses the procedure. The nurse's action constitutes:",opts:["Assault","Battery","Negligence","Malpractice"],ans:1,exp:"Battery is the intentional harmful or offensive touching of a person without their consent. Performing a procedure on a competent adult who has refused it is battery. Assault is the threat of contact; negligence and malpractice involve unintentional harm from failure to meet the standard of care."},

    // =====================================================================
    // HARD h031–h060
    // =====================================================================
    {id:"h031",diff:"hard",cat:"Physiological",q:"A home health nurse visits a 78-year-old client alone at home with three days of vomiting and diarrhea. Assessment: HR 122, BP 84/52, confusion, skin tenting, BUN 56, creatinine 2.1. The nurse's priority action is:",opts:["Encourage oral fluids and return in 24 hours","Call 911 for emergency transport to the hospital","Contact the provider for an oral rehydration solution order","Administer IV fluids from the nursing bag kit"],ans:1,exp:"This client has severe dehydration with hemodynamic instability (tachycardia, hypotension), altered mental status, and likely pre-renal AKI (elevated BUN/Cr ratio). The client cannot safely manage at home — 911 and emergency hospitalization are the priority."},
    {id:"h032",diff:"hard",cat:"Physiological",q:"An LPN is caring for a client when the tracheostomy tube is accidentally dislodged. The obturator is not immediately available. The nurse's first action is:",opts:["Call the provider and wait for orders","Cover the stoma with sterile gauze and apply oxygen at the stoma site while calling for help","Attempt to reinsert the outer cannula without the obturator","Apply bag-valve mask ventilation over the mouth and nose only"],ans:1,exp:"Accidental decannulation requires immediate airway management. Covering the stoma and delivering oxygen at the stoma site (not nose/mouth, as the client breathes through the trach) maintains oxygenation. Help should be called simultaneously; trach replacement by trained personnel and the obturator must follow."},
    {id:"h033",diff:"hard",cat:"Physiological",q:"Client A in shock has: BP 80/50, HR 130, warm flushed skin, fever 102F, and low SVR. Client B has: BP 78/54, HR 118, cool clammy skin, JVD, and bilateral crackles. The nurse correctly identifies:",opts:["Client A has cardiogenic shock; Client B has septic shock","Client A has septic shock (hyperdynamic phase); Client B has cardiogenic shock","Both clients have hypovolemic shock","Client A has neurogenic shock; Client B has anaphylactic shock"],ans:1,exp:"Septic shock (Client A, warm phase) causes vasodilation: warm skin, fever, low SVR, and tachycardia despite hypotension. Cardiogenic shock (Client B) causes pump failure: cool/clammy skin, JVD from venous backup, and pulmonary congestion (crackles). Distinguishing shock types drives different interventions."},
    {id:"h034",diff:"hard",cat:"Safe Care",q:"A nurse receives report on four clients. Which client requires assessment first?",opts:["A client with a peptic ulcer reporting black tarry stools for two days, stable VS","A client with cirrhosis who just vomited bright red blood, HR 118, BP 88/54","A client post-colonoscopy with mild rectal bleeding, stable VS","A client with Crohn's disease and 6 bloody stools today, stable VS"],ans:1,exp:"Active upper GI hemorrhage (hematemesis) with hemodynamic instability (tachycardia, hypotension) indicates life-threatening active bleeding requiring immediate intervention. The other clients are actively bleeding but hemodynamically stable — Client B's instability takes absolute priority."},
    {id:"h035",diff:"hard",cat:"Physiological",q:"A client with a tibial fracture in a long-leg cast reports burning pain rated 10/10 unrelieved by IV hydromorphone. The affected foot is pale with an absent dorsal pedal pulse. The nurse should:",opts:["Elevate the extremity above heart level to reduce swelling","Apply ice to reduce swelling and notify the provider","Notify the provider immediately and prepare to bivalve or remove the cast","Administer the next scheduled opioid dose and reassess in 30 minutes"],ans:2,exp:"Absent pulse with severe unrelieved burning pain indicates advanced compartment syndrome — a limb-threatening emergency. The cast must be split (bivalved) or removed immediately to decompress the compartment. Elevation is contraindicated as it further reduces arterial perfusion to the ischemic limb."},
    {id:"h036",diff:"hard",cat:"Physiological",q:"A client with traumatic brain injury develops BP 188/54 mmHg, HR 44 bpm, and irregular respirations. The nurse recognizes Cushing's triad and should:",opts:["Administer antihypertensives to lower the blood pressure","Place the client supine and increase IV fluid rate","Notify the provider immediately and prepare for ICP-reducing interventions","Administer atropine for the bradycardia"],ans:2,exp:"Cushing's triad (hypertension with widened pulse pressure, bradycardia, irregular respirations) is a late, ominous sign of critically elevated ICP and impending herniation. Immediate provider notification and preparation for osmotherapy (mannitol), HOB elevation to 30 degrees, and possible emergency craniotomy are the priorities."},
    {id:"h037",diff:"hard",cat:"Physiological",q:"A client with Addison's disease presents in adrenal crisis with BP 70/40, HR 138, temperature 102F, and sodium 118 mEq/L. The immediate priority treatment is:",opts:["Fludrocortisone 0.1 mg PO daily","IV hydrocortisone 100 mg bolus and aggressive IV 0.9% NS fluid resuscitation","Oral salt tablets and increased oral fluid intake","IV vasopressin for refractory hypotension"],ans:1,exp:"Adrenal crisis requires IV hydrocortisone (immediate glucocorticoid replacement) and aggressive IV normal saline (to correct hypovolemia and hyponatremia) as the first-line treatment. Fludrocortisone is oral and for chronic maintenance. Vasopressors are secondary if fluids and steroids fail."},
    {id:"h038",diff:"hard",cat:"Physiological",q:"A client with chronic kidney disease receives their first hemodialysis session. Near the end, the client develops headache, nausea, confusion, and a new-onset seizure. The nurse recognizes:",opts:["Hypoglycemia from glucose removal during dialysis","Dialysis disequilibrium syndrome","Air embolism from the dialysis circuit","Acute hemolytic reaction"],ans:1,exp:"Dialysis disequilibrium syndrome occurs during or after early dialysis sessions when rapid urea removal creates an osmotic gradient causing cerebral edema. Neurological symptoms (headache, confusion, seizures) during or immediately after dialysis in a new patient are the hallmark features."},
    {id:"h039",diff:"hard",cat:"Physiological",q:"A parent brings a 6-year-old who had influenza B last week and was given aspirin for fever. The child now has persistent vomiting, confusion, and elevated liver enzymes. The nurse suspects:",opts:["Bacterial meningitis superimposed on influenza","Reye syndrome","Intussusception","Acetaminophen toxicity"],ans:1,exp:"Reye syndrome is associated with aspirin use in children during viral illness (influenza or varicella), causing hepatic dysfunction and encephalopathy. This is why aspirin is contraindicated in children — acetaminophen or ibuprofen are the recommended alternatives."},
    {id:"h040",diff:"hard",cat:"Physiological",q:"A nurse feels a pulsating umbilical cord through the dilated cervix during a vaginal exam. The fetal heart rate drops to 90 bpm. The nurse's immediate priority action is:",opts:["Call for an emergency cesarean section","Place the client in knee-chest or Trendelenburg position and manually elevate the presenting part off the cord while calling for help","Apply oxygen via nonrebreather mask at 10-12 L/min","Apply an internal fetal scalp electrode for better monitoring"],ans:1,exp:"Umbilical cord prolapse is an obstetric emergency. The immediate priorities are relieving cord compression by manually elevating the fetal presenting part, placing the client in knee-chest or Trendelenburg position, and calling for emergency cesarean delivery. The nurse must maintain this position until delivery."},
    {id:"h041",diff:"hard",cat:"Physiological",q:"A client with large B-cell lymphoma starts chemotherapy. Labs show: uric acid 12.8, K+ 6.4 mEq/L, phosphorus 7.2, calcium 7.1. Which intervention is the priority?",opts:["Administer allopurinol and restrict protein intake","Initiate cardiac monitoring and treat hyperkalemia with IV calcium gluconate and sodium polystyrene sulfonate","Administer phosphate binders with meals","Restrict oral fluids to prevent fluid overload"],ans:1,exp:"In tumor lysis syndrome, K+ 6.4 mEq/L is the most immediately life-threatening abnormality due to risk of fatal cardiac arrhythmias. Cardiac monitoring and hyperkalemia treatment take priority. Hyperuricemia and hyperphosphatemia require concurrent management but are less acutely lethal."},
    {id:"h042",diff:"hard",cat:"Safe Care",q:"A nursing student caring for a client with MRSA-positive wound cultures states: 'I can reuse the same gown between visits to this client to conserve supplies.' The nurse recognizes this statement indicates:",opts:["Correct understanding of contact precaution conservation measures","A misunderstanding — gowns must be discarded after each room exit and not reused","Acceptable practice only if the gown has not contacted wound drainage","Correct practice for long-term care facilities but not acute care"],ans:1,exp:"Gowns must be removed and discarded upon each room exit, not reused between visits even to the same client, as the outer surface becomes contaminated. Reusing gowns between visits risks transmitting MRSA to other clients or surfaces outside the room."},
    {id:"h043",diff:"hard",cat:"Physiological",q:"A client presents with an acute proximal DVT confirmed by ultrasound. The provider orders only warfarin 5 mg PO daily without a heparin bridge. The nurse questions this order because:",opts:["Warfarin is not effective for DVT treatment","Warfarin without concurrent anticoagulation can cause initial paradoxical hypercoagulability through depletion of proteins C and S before depleting pro-coagulant factors","Warfarin is only indicated for atrial fibrillation, not DVT","The dose is too low to be therapeutic"],ans:1,exp:"Warfarin initially depletes proteins C and S (anticoagulant factors) before reducing pro-coagulant factors (II, VII, IX, X), creating a transient hypercoagulable state. A heparin bridge provides immediate anticoagulation while warfarin reaches therapeutic INR (2-3). Starting warfarin alone without bridging is unsafe for acute DVT."},
    {id:"h044",diff:"hard",cat:"Psychosocial",q:"A client on fluoxetine is started on tramadol for pain. Three days later the client has agitation, hyperthermia (104F), diaphoresis, clonus, and hyperreflexia. The nurse recognizes:",opts:["Neuroleptic malignant syndrome from an antipsychotic interaction","Serotonin syndrome from tramadol-SSRI interaction","Anticholinergic toxicity from drug interaction","Acute dystonic reaction requiring diphenhydramine"],ans:1,exp:"Tramadol inhibits serotonin reuptake; combined with an SSRI it can precipitate serotonin syndrome: agitation, hyperthermia, diaphoresis, clonus, and hyperreflexia. Treatment: discontinue both drugs, cyproheptadine, supportive care. NMS features lead-pipe rigidity and follows antipsychotic use — not an SSRI-opioid combination."},
    {id:"h045",diff:"hard",cat:"Safe Care",q:"An RN is delegating tasks to an LPN on a medical-surgical unit. Which task cannot be delegated to the LPN?",opts:["Administering oral medications to stable clients","Performing a complete initial nursing assessment on a newly admitted client","Providing wound care per the established care plan","Reinforcing discharge teaching previously initiated by the RN"],ans:1,exp:"Initial comprehensive nursing assessment of a newly admitted client is within RN scope of practice in most states including Florida and cannot be independently delegated to an LPN. LPNs can administer medications, perform wound care, and reinforce (not initiate) teaching under RN supervision."},
    {id:"h046",diff:"hard",cat:"Safe Care",q:"A critically ill client has both an advance directive stating 'no heroic measures' and a POLST form ordering 'DNR/DNI, comfort measures only.' Which statement about these documents is correct?",opts:["The advance directive supersedes the POLST in all clinical situations","The POLST is a physician order that is immediately actionable; the advance directive guides goals of care discussions but requires a physician order to be implemented","Both documents are equally enforceable and the physician may choose which to follow","The POLST only applies in the emergency department"],ans:1,exp:"A POLST (Physician Orders for Life-Sustaining Treatment) is a medical order immediately actionable by healthcare providers. An advance directive is a legal document expressing patient preferences that must be converted to orders by a physician. When both exist, the POLST guides immediate clinical decisions."},
    {id:"h047",diff:"hard",cat:"Physiological",q:"A client with type 2 DM is admitted with: glucose 1,140 mg/dL, osmolality 348 mOsm/kg, sodium 151 mEq/L, no urine ketones, pH 7.36. Management differs from DKA because:",opts:["HHS requires more aggressive insulin dosing than DKA","HHS involves profound dehydration without significant acidosis; fluid resuscitation is the first priority over insulin","HHS does not require IV fluids since insulin alone will resolve the hyperglycemia","HHS is less serious than DKA and can be managed with oral fluids"],ans:1,exp:"Hyperosmolar Hyperglycemic State (HHS) features extreme hyperglycemia and hyperosmolality without significant ketoacidosis. Profound dehydration (often 8-12 liters) is the dominant feature, making IV fluid resuscitation the first priority. Insulin is started cautiously after initial fluid replacement to avoid too-rapid osmolality correction and cerebral edema."},
    {id:"h048",diff:"hard",cat:"Physiological",q:"A client with blunt chest trauma develops sudden severe dyspnea, absent breath sounds on the left, tracheal deviation to the right, JVD, and BP 72/40. The priority intervention while awaiting the provider is:",opts:["Apply a three-sided occlusive dressing to the chest","Prepare for immediate chest tube thoracostomy","Administer 100% oxygen via nonrebreather mask and position supine","Prepare for immediate needle decompression at the 2nd intercostal space, midclavicular line"],ans:3,exp:"Tension pneumothorax with hemodynamic compromise (BP 72/40) is immediately life-threatening. Needle decompression (14G needle, 2nd ICS, MCL on the affected side) releases trapped air while awaiting chest tube. A three-sided dressing treats an open sucking chest wound — tension pneumothorax requires immediate needle decompression first."},
    {id:"h049",diff:"hard",cat:"Physiological",q:"A client with HF develops acute pulmonary edema: SpO2 78%, frothy pink-tinged sputum, BP 168/104, HR 114, RR 36. Available standing orders include oxygen, furosemide, morphine, and nitroglycerin. The nurse should implement which order first?",opts:["Furosemide 80 mg IV","Morphine 2 mg IV","Supplemental oxygen via nonrebreather mask at 15 L/min and upright positioning","Nitroglycerin 0.4 mg sublingual"],ans:2,exp:"Airway and oxygenation (ABC) always take priority. SpO2 78% and frothy sputum indicate critical hypoxia. Non-rebreather mask at 15 L/min and high-Fowler's positioning (reduces preload, improves diaphragm excursion) are the first interventions. Morphine, furosemide, and nitroglycerin follow."},
    {id:"h050",diff:"hard",cat:"Safe Care",q:"A client returns from a percutaneous liver biopsy. Which post-procedure finding requires immediate intervention?",opts:["Mild right shoulder pain","Blood pressure drop from 128/74 to 86/50 with HR increasing to 122 bpm","Client positioned on the right side with a rolled towel under the biopsy site","A quarter-sized blood spot on the biopsy dressing"],ans:1,exp:"Hypotension and tachycardia after liver biopsy indicate hemorrhage — the most serious, potentially fatal complication given the liver's vascularity. Mild right shoulder pain (referred from diaphragm irritation), right-side positioning (standard post-biopsy protocol), and small dressing spotting are expected findings."},
    {id:"h051",diff:"hard",cat:"Physiological",q:"A 22-year-old with bilateral femur fractures on day 2 develops sudden dyspnea, SpO2 88%, confusion, and petechiae over the chest and axillae. The nurse recognizes:",opts:["Pulmonary embolism from DVT","Fat embolism syndrome","ARDS from trauma","Acute anemia from hemorrhage"],ans:1,exp:"Fat embolism syndrome classically presents 24-72 hours after long-bone fractures with the classic triad: respiratory distress, neurological changes, and petechiae over the upper chest and axillae from fat droplets. Pulmonary embolism does not cause petechiae; the petechiae distinguish fat embolism from other causes."},
    {id:"h052",diff:"hard",cat:"Physiological",q:"A client with a T4 spinal cord injury suddenly develops BP 228/118, pounding headache, diaphoresis above the injury level, flushed face, and bradycardia. The nurse's priority action is:",opts:["Administer antihypertensive medication immediately","Sit the client upright and rapidly identify and remove the triggering stimulus (check for bladder distension or bowel impaction)","Place the client in Trendelenburg position and increase IV fluids","Administer atropine 0.5 mg IV for the bradycardia"],ans:1,exp:"Autonomic dysreflexia is a hypertensive emergency in SCI clients at or above T6. Sitting the client upright (orthostatic BP reduction) and removing the trigger (full bladder is the most common cause) are immediate priorities. Antihypertensives are used only if BP remains critically elevated after trigger removal."},
    {id:"h053",diff:"hard",cat:"Physiological",q:"Post-neurosurgery: Client A has Na+ 155, urine specific gravity 1.001, urine output 400 mL/hr. Client B has Na+ 118, urine specific gravity 1.028, urine output 20 mL/hr. The nurse correctly identifies:",opts:["Client A has SIADH; Client B has diabetes insipidus","Client A has diabetes insipidus; Client B has SIADH","Both clients have cerebral salt wasting","Client A has hyperaldosteronism; Client B has Addison's disease"],ans:1,exp:"Diabetes insipidus (Client A): dilute urine (low specific gravity), massive diuresis, and hypernatremia from water loss exceeding intake. SIADH (Client B): concentrated urine (high specific gravity), oliguria, and hyponatremia from water retention. Urine specific gravity and serum sodium together are the key differentiators."},
    {id:"h054",diff:"hard",cat:"Physiological",q:"A client with end-stage renal disease has K+ 6.8 mEq/L with peaked T waves on ECG. The provider orders IV calcium gluconate, sodium bicarbonate, regular insulin with D50W, and sodium polystyrene sulfonate. The nurse should administer these medications in which order?",opts:["Sodium polystyrene, then insulin/D50W, then bicarbonate, then calcium gluconate","Calcium gluconate first, then insulin/D50W and bicarbonate, then sodium polystyrene sulfonate last","Insulin/D50W first, then calcium gluconate, then sodium polystyrene, then bicarbonate","Sodium bicarbonate first, then calcium gluconate, then insulin/D50W, then sodium polystyrene"],ans:1,exp:"Calcium gluconate is given first to stabilize the cardiac membrane and prevent fatal arrhythmias (it does not lower K+). Insulin/D50W and bicarbonate shift K+ intracellularly for temporary reduction. Sodium polystyrene sulfonate actually removes K+ from the body but takes hours — it is given last. This sequence prioritizes cardiac safety."},
    {id:"h055",diff:"hard",cat:"Physiological",q:"A 7-month-old is brought to the ER with sudden severe crying every 15-20 minutes, vomiting, and currant jelly stool. The nurse palpates a sausage-shaped mass in the right upper quadrant. The nurse suspects:",opts:["Pyloric stenosis","Hirschsprung's disease","Intussusception","Necrotizing enterocolitis"],ans:2,exp:"Intussusception (telescoping bowel) classically presents in infants 6-12 months with intermittent colicky pain, vomiting, currant jelly stool (blood and mucus from ischemic bowel), and a palpable abdominal sausage-shaped mass. It requires urgent air/hydrostatic enema or surgery. Pyloric stenosis causes projectile non-bloody vomiting; Hirschsprung's presents from birth with obstipation."},
    {id:"h056",diff:"hard",cat:"Physiological",q:"A client with severe pre-eclampsia is receiving magnesium sulfate 2 g/hr. Which set of findings indicates toxicity requiring the nurse to stop the infusion immediately?",opts:["Flushing, nausea, and serum Mg 5 mEq/L","Respiratory rate 10/min, absent patellar reflexes, and serum Mg 9.5 mEq/L","Headache and visual blurring with serum Mg 7 mEq/L","Urine output 35 mL/hr and serum Mg 6 mEq/L"],ans:1,exp:"Magnesium toxicity: respiratory rate <12/min and absent deep tendon reflexes (patellar reflex disappears first at serum levels 7-10 mEq/L) are the most dangerous signs. Respiratory arrest occurs at >12 mEq/L. The infusion must be stopped and calcium gluconate (the antidote) prepared immediately. Option A describes common therapeutic-level side effects."},
    {id:"h057",diff:"hard",cat:"Physiological",q:"A client received CHOP chemotherapy 10 days ago. Labs show: WBC 1,800, ANC 360, platelets 42,000, Hgb 8.2. The nurse recognizes this as the nadir. The most life-threatening risk at this time is:",opts:["Severe anemia requiring blood transfusion","Platelet-related hemorrhage requiring platelet transfusion","Severe infection from neutropenia (ANC 360) that can rapidly become fatal sepsis","Drug resistance developing during the nadir period"],ans:2,exp:"While all abnormalities require management, severe neutropenia (ANC <500/mm3) is most immediately life-threatening because even minor infections can rapidly progress to fatal sepsis without neutrophil defense. Any fever in a neutropenic client (ANC <500) is a medical emergency requiring immediate evaluation and broad-spectrum antibiotics."},
    {id:"h058",diff:"hard",cat:"Physiological",q:"A client receiving digoxin 0.125 mg daily is also prescribed furosemide 40 mg daily. Current labs: K+ 3.0 mEq/L, digoxin level 1.8 ng/mL. The nurse should be most concerned about:",opts:["Furosemide blocking digoxin renal excretion causing toxic levels","Hypokalemia from furosemide increasing digoxin toxicity risk even at a therapeutic digoxin level","Hyperkalemia from furosemide potentiating digoxin's effects","The digoxin level of 1.8 ng/mL indicating a need to double the dose"],ans:1,exp:"Hypokalemia (from furosemide's potassium wasting) sensitizes cardiac cells to digoxin — potassium and digoxin compete for the same myocardial receptor. Low K+ means increased digoxin binding and toxicity risk even at therapeutic serum levels. K+ 3.0 must be reported and the digoxin dose held or questioned."},
    {id:"h059",diff:"hard",cat:"Psychosocial",q:"Client A is on haloperidol for two weeks and has gradual-onset hyperthermia 105F, lead-pipe muscle rigidity, diaphoresis, and obtundation. Client B started escitalopram plus linezolid yesterday and has acute agitation, tremor, clonus, diarrhea, and hyperreflexia. The nurse correctly identifies:",opts:["Client A has serotonin syndrome; Client B has NMS","Client A has NMS; Client B has serotonin syndrome","Both clients have malignant hyperthermia","Both have anticholinergic toxicity"],ans:1,exp:"NMS (Client A): caused by antipsychotics, gradual onset, lead-pipe rigidity, and extreme hyperthermia. Serotonin syndrome (Client B): caused by serotonergic excess (SSRI + linezolid, an MAOI antibiotic), rapid onset, clonus, hyperreflexia, and diarrhea. Rigidity versus clonus/hyperreflexia is the key motor distinction between NMS and serotonin syndrome."},
    {id:"h060",diff:"hard",cat:"Safe Care",q:"A competent 72-year-old client hospitalized for a medication adjustment says they want to leave against medical advice. The nurse threatens to 'call the police and have you arrested' if the client tries to leave. The nurse's action constitutes:",opts:["Battery, because the nurse violated the patient's autonomy through speech","Assault, because the threat creates reasonable fear of harmful contact","False imprisonment, because threatening consequences to prevent a competent client from leaving is unlawful restraint","Slander, because the police statement is a false and defamatory statement"],ans:2,exp:"False imprisonment is the unlawful restraint of a person against their will, which can occur through physical means or verbal threats preventing a competent person from exercising their right to leave. A competent adult has the right to leave AMA after signing the appropriate form. The nurse should facilitate safe discharge with AMA documentation, not threaten the client."}

  ];

  // ── State ────────────────────────────────────────────────────────────────
  var currentQuizIds = [];
  var bonusId = null;
  var currentVideoIdx = -1;
  var uid = null;
  var notepadOpen = true;
  var notesListOpen = true;
  var statsOpen = false;

  var stats = { total: 0, correct: 0, streak: 0 };

  // Daily goal state (Firestore-synced)
  var daily = { date: "", answered: 0, perfectSet: false, complete: false };

  // localStorage key for recently seen question IDs (soft dedup)
  var SEEN_KEY = "nclex_seen";
  var SEEN_MAX = 24;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function getSeenIds() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch (e) { return []; }
  }
  function addSeenIds(ids) {
    var seen = getSeenIds();
    ids.forEach(function (id) {
      seen = seen.filter(function (s) { return s !== id; });
      seen.push(id);
    });
    while (seen.length > SEEN_MAX) seen.shift();
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
  }

  function pickQuestions() {
    var seen = getSeenIds();
    var easy = QUESTIONS.filter(function (q) { return q.diff === "easy"; });
    var medium = QUESTIONS.filter(function (q) { return q.diff === "medium"; });
    var hard = QUESTIONS.filter(function (q) { return q.diff === "hard"; });

    function pickOne(pool) {
      var fresh = pool.filter(function (q) { return seen.indexOf(q.id) === -1; });
      var src = fresh.length > 0 ? fresh : pool;
      return src[Math.floor(Math.random() * src.length)];
    }

    var q1 = pickOne(easy);
    var q2 = pickOne(medium);
    var q3 = pickOne(hard);
    return [q1, q2, q3];
  }

  function pickBonusQuestion(excludeIds) {
    var seen = getSeenIds();
    var easy = QUESTIONS.filter(function (q) {
      return q.diff === "easy" && excludeIds.indexOf(q.id) === -1;
    });
    var fresh = easy.filter(function (q) { return seen.indexOf(q.id) === -1; });
    var src = fresh.length > 0 ? fresh : easy;
    return src[Math.floor(Math.random() * src.length)];
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickVideo(excludeIdx) {
    var indices = YT_IDS.map(function (_, i) { return i; }).filter(function (i) { return i !== excludeIdx; });
    return indices[Math.floor(Math.random() * indices.length)];
  }

  function fmtDate(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ── Daily goal (Firestore) ───────────────────────────────────────────────
  function dailyDocRef() {
    return doc(db, "study", "daily");
  }

  function loadDaily() {
    onSnapshot(dailyDocRef(), function (snap) {
      if (snap.exists()) {
        var d = snap.data();
        var today = todayStr();
        if (d.date === today) {
          daily = { date: today, answered: d.answered || 0, perfectSet: d.perfectSet || false, complete: d.complete || false };
        } else {
          daily = { date: today, answered: 0, perfectSet: false, complete: false };
          saveDaily();
        }
      } else {
        daily = { date: todayStr(), answered: 0, perfectSet: false, complete: false };
        saveDaily();
      }
      renderDailyBanner();
    });
  }

  function saveDaily() {
    if (!uid) return;
    setDoc(dailyDocRef(), daily).catch(function (e) { console.warn("daily save", e); });
  }

  function incrementDailyAnswered(perfectSet) {
    daily.answered += 3;
    if (perfectSet) daily.perfectSet = true;
    if (!daily.complete && (daily.perfectSet || daily.answered >= 9)) {
      daily.complete = true;
    }
    saveDaily();
    renderDailyBanner();
    if (daily.complete) {
      var cel = document.getElementById("goal-celebrate");
      if (cel) cel.removeAttribute("hidden");
    }
  }

  function renderDailyBanner() {
    var fill = document.getElementById("daily-fill");
    var count = document.getElementById("daily-count");
    var status = document.getElementById("daily-status");
    if (!fill || !count || !status) return;

    var pct = 0;
    var label = "Keep going!";

    if (daily.complete) {
      pct = 100;
      label = "Goal complete! 🎉";
    } else if (daily.perfectSet) {
      pct = 100;
      label = "Perfect set! Goal done! ✨";
      daily.complete = true;
      saveDaily();
    } else {
      pct = Math.min(100, Math.round((daily.answered / 9) * 100));
      if (daily.answered >= 6) label = "Almost there!";
      else if (daily.answered >= 3) label = "Halfway there!";
    }

    fill.style.width = pct + "%";
    count.textContent = Math.min(daily.answered, 9) + " / 9";
    status.textContent = label;
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  function loadStats() {
    try {
      var s = JSON.parse(localStorage.getItem("nclex_stats") || "{}");
      stats.total = s.total || 0;
      stats.correct = s.correct || 0;
      stats.streak = s.streak || 0;
    } catch (e) {}
  }

  function saveStats() {
    try { localStorage.setItem("nclex_stats", JSON.stringify(stats)); } catch (e) {}
  }

  function updateStats(numCorrect, numAnswered) {
    stats.total += numAnswered;
    stats.correct += numCorrect;
    if (numCorrect === numAnswered) {
      stats.streak++;
    } else {
      stats.streak = 0;
    }
    saveStats();
    renderStats();
  }

  function renderStats() {
    var pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) + "%" : "—";
    document.getElementById("stat-total").textContent = stats.total;
    document.getElementById("stat-correct").textContent = stats.correct;
    document.getElementById("stat-streak").textContent = stats.streak;
    document.getElementById("stat-pct").textContent = pct;
  }

  // ── Quiz rendering ───────────────────────────────────────────────────────
  function renderQuiz() {
    var questions = pickQuestions();
    currentQuizIds = questions.map(function (q) { return q.id; });
    addSeenIds(currentQuizIds);

    var container = document.getElementById("quiz-cards");
    container.innerHTML = "";

    questions.forEach(function (q, idx) {
      var card = document.createElement("div");
      card.className = "qcard";
      card.id = "qcard-" + idx;

      var diffClass = "diff-" + q.diff;

      var opts = q.opts.map(function (opt, oi) {
        var letter = String.fromCharCode(65 + oi);
        return '<button class="qcard-option" data-card="' + idx + '" data-opt="' + oi + '">' +
          '<span class="opt-letter">' + letter + '</span>' + escHtml(opt) + '</button>';
      }).join("");

      card.innerHTML =
        '<div class="qcard-meta">' +
          '<span class="diff-badge ' + diffClass + '">' + q.diff.toUpperCase() + '</span>' +
          '<span class="category-tag">' + escHtml(q.cat) + '</span>' +
        '</div>' +
        '<p class="qcard-question">' + escHtml(q.q) + '</p>' +
        '<div class="qcard-options">' + opts + '</div>' +
        '<div class="qcard-feedback" id="feedback-' + idx + '"></div>';

      container.appendChild(card);
    });

    document.getElementById("check-all-btn").disabled = true;
    var cel = document.getElementById("goal-celebrate");
    if (cel) cel.setAttribute("hidden", "");

    renderBonus(currentQuizIds);
  }

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderBonus(excludeIds) {
    var bonus = pickBonusQuestion(excludeIds);
    bonusId = bonus ? bonus.id : null;

    var qEl = document.getElementById("bonus-q");
    var aEl = document.getElementById("bonus-answer");
    if (!qEl || !aEl || !bonus) return;

    qEl.textContent = bonus.q;

    var correctOpt = bonus.opts[bonus.ans];
    aEl.innerHTML = '<strong>Answer: ' + String.fromCharCode(65 + bonus.ans) + '. ' + escHtml(correctOpt) + '</strong>' +
      '<br><br>' + escHtml(bonus.exp);
  }

  // ── Option selection & checking ──────────────────────────────────────────
  var selectedOpts = {};

  function handleOptionClick(e) {
    var btn = e.target.closest(".qcard-option");
    if (!btn || btn.disabled) return;

    var cardIdx = btn.dataset.card;
    var optIdx = parseInt(btn.dataset.opt, 10);

    // Deselect others in same card
    var siblings = document.querySelectorAll('.qcard-option[data-card="' + cardIdx + '"]');
    siblings.forEach(function (b) { b.classList.remove("selected"); });

    btn.classList.add("selected");
    selectedOpts[cardIdx] = optIdx;

    // Enable check button if all 3 answered
    var allSelected = Object.keys(selectedOpts).length >= 3;
    document.getElementById("check-all-btn").disabled = !allSelected;
  }

  function handleCheckAll() {
    var questions = currentQuizIds.map(function (id) {
      return QUESTIONS.find(function (q) { return q.id === id; });
    });

    var numCorrect = 0;
    questions.forEach(function (q, idx) {
      var chosen = selectedOpts[idx];
      if (chosen === undefined) return;

      var card = document.getElementById("qcard-" + idx);
      var fb = document.getElementById("feedback-" + idx);
      var opts = card.querySelectorAll(".qcard-option");

      opts.forEach(function (btn) { btn.disabled = true; });

      var isCorrect = chosen === q.ans;
      if (isCorrect) numCorrect++;

      opts[q.ans].classList.add("correct");
      if (!isCorrect) opts[chosen].classList.add("wrong");

      card.classList.add(isCorrect ? "answered-correct" : "answered-wrong");

      fb.innerHTML = (isCorrect
        ? '<span class="fb-label">✅ Correct!</span>'
        : '<span class="fb-label">❌ Incorrect.</span> Correct answer: <strong>' + String.fromCharCode(65 + q.ans) + '. ' + escHtml(q.opts[q.ans]) + '</strong><br>') +
        escHtml(q.exp);
      fb.className = "qcard-feedback show " + (isCorrect ? "correct-fb" : "wrong-fb");
    });

    document.getElementById("check-all-btn").disabled = true;
    selectedOpts = {};

    updateStats(numCorrect, 3);
    incrementDailyAnswered(numCorrect === 3);
  }

  // ── Video ────────────────────────────────────────────────────────────────
  function loadVideo(excludeIdx) {
    currentVideoIdx = pickVideo(excludeIdx !== undefined ? excludeIdx : currentVideoIdx);
    var frame = document.getElementById("yt-frame");
    if (frame) {
      frame.src = "https://www.youtube.com/embed/" + YT_IDS[currentVideoIdx] + "?rel=0";
    }
  }

  // ── Notepad ──────────────────────────────────────────────────────────────
  function notesColRef() {
    return collection(db, "study", "notes", "items");
  }

  function loadNotes() {
    onSnapshot(notesColRef(), function (snap) {
      var notes = [];
      snap.forEach(function (d) {
        notes.push(Object.assign({ id: d.id }, d.data()));
      });
      notes.sort(function (a, b) {
        var ta = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt) : 0;
        var tb = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt) : 0;
        return tb - ta;
      });
      renderNotesList(notes);
    });
  }

  function renderNotesList(notes) {
    var list = document.getElementById("notes-list");
    if (!list) return;
    if (notes.length === 0) {
      list.innerHTML = '<p style="font-size:13px;color:var(--text-faint);padding:8px 4px;">No notes yet.</p>';
      return;
    }
    list.innerHTML = notes.map(function (n) {
      return '<div class="note-item" data-note-id="' + escHtml(n.id) + '">' +
        '<div class="note-main">' +
          '<span class="note-name" title="Click to rename">' + escHtml(n.name || "Note") + '</span>' +
          '<div class="note-body">' + escHtml(n.body || "") + '</div>' +
        '</div>' +
        '<div class="note-meta">' +
          '<span class="note-date">' + (n.createdAt ? fmtDate(n.createdAt) : "") + '</span>' +
          '<button class="note-del" data-del-id="' + escHtml(n.id) + '" title="Delete note">🗑</button>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function saveNote() {
    var input = document.getElementById("notepad-input");
    var text = (input.value || "").trim();
    if (!text) return;

    var firstWord = text.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "") || "Note";
    var name = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);

    addDoc(notesColRef(), {
      name: name,
      body: text,
      createdAt: serverTimestamp()
    }).then(function () {
      input.value = "";
    }).catch(function (e) { console.warn("note save", e); });
  }

  function deleteNote(id) {
    deleteDoc(doc(db, "study", "notes", "items", id)).catch(function (e) { console.warn("note del", e); });
  }

  function startRenameNote(span, noteId) {
    var current = span.textContent;
    var input = document.createElement("input");
    input.className = "note-name-input";
    input.value = current;
    span.replaceWith(input);
    input.focus();
    input.select();

    function commitRename() {
      var newName = (input.value || "").trim() || current;
      updateDoc(doc(db, "study", "notes", "items", noteId), { name: newName }).catch(function (e) { console.warn("rename", e); });
      var newSpan = document.createElement("span");
      newSpan.className = "note-name";
      newSpan.title = "Click to rename";
      newSpan.textContent = newName;
      input.replaceWith(newSpan);
      newSpan.addEventListener("click", function () { startRenameNote(newSpan, noteId); });
    }

    input.addEventListener("blur", commitRename);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); commitRename(); }
    });
  }

  // ── Toggle helpers ───────────────────────────────────────────────────────
  function setNotepadOpen(open) {
    notepadOpen = open;
    var body = document.getElementById("notepad-body");
    var toggle = document.getElementById("notepad-toggle");
    var caret = document.getElementById("notepad-caret");
    if (!body) return;
    body.style.display = open ? "" : "none";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.style.borderRadius = open ? "18px 18px 0 0" : "18px";
    toggle.style.borderBottomColor = open ? "transparent" : "";
    caret.textContent = open ? "▲" : "▼";
  }

  function setNotesListOpen(open) {
    notesListOpen = open;
    var list = document.getElementById("notes-list");
    var caret = document.getElementById("notes-list-caret");
    if (!list) return;
    list.style.display = open ? "" : "none";
    caret.textContent = open ? "▲" : "▼";
  }

  function setStatsOpen(open) {
    statsOpen = open;
    var panel = document.getElementById("stats-panel");
    var btn = document.getElementById("stats-toggle-btn");
    if (!panel) return;
    if (open) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // ── Event delegation ─────────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById("quiz-cards").addEventListener("click", handleOptionClick);

    document.getElementById("check-all-btn").addEventListener("click", handleCheckAll);

    document.getElementById("refresh-btn").addEventListener("click", function () {
      selectedOpts = {};
      renderQuiz();
    });

    document.getElementById("video-refresh-btn").addEventListener("click", function () {
      loadVideo(currentVideoIdx);
    });

    document.getElementById("note-save-btn").addEventListener("click", saveNote);

    document.getElementById("notepad-input").addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key === "Enter") saveNote();
    });

    document.getElementById("notepad-toggle").addEventListener("click", function () {
      setNotepadOpen(!notepadOpen);
    });

    document.getElementById("notes-list-toggle").addEventListener("click", function () {
      setNotesListOpen(!notesListOpen);
    });

    document.getElementById("stats-toggle-btn").addEventListener("click", function () {
      setStatsOpen(!statsOpen);
    });

    document.getElementById("notes-list").addEventListener("click", function (e) {
      var delBtn = e.target.closest("[data-del-id]");
      if (delBtn) {
        deleteNote(delBtn.dataset.delId);
        return;
      }
      var nameSpan = e.target.closest(".note-name");
      if (nameSpan) {
        var noteItem = nameSpan.closest(".note-item");
        if (noteItem) startRenameNote(nameSpan, noteItem.dataset.noteId);
      }
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function init() {
    loadStats();
    renderStats();
    renderQuiz();
    loadVideo();
    bindEvents();
  }

  function showApp() {
    document.getElementById("auth-loading").setAttribute("hidden", "");
    document.getElementById("passcode-gate").setAttribute("hidden", "");
    document.getElementById("study-root").removeAttribute("hidden");
    document.getElementById("site-footer").removeAttribute("hidden");
  }

  function showGate() {
    document.getElementById("auth-loading").setAttribute("hidden", "");
    document.getElementById("passcode-gate").removeAttribute("hidden");
  }

  // ── Gate digit inputs ────────────────────────────────────────────────────
  function bindGate() {
    var digits = Array.from(document.querySelectorAll(".gate-digit"));

    digits.forEach(function (input, i) {
      input.addEventListener("input", function () {
        var val = input.value.replace(/\D/g, "");
        input.value = val.slice(-1);
        if (val && i < digits.length - 1) digits[i + 1].focus();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && i > 0) digits[i - 1].focus();
        if (e.key === "Enter") submitGate();
      });
    });

    document.getElementById("gate-submit").addEventListener("click", submitGate);

    document.getElementById("lock-btn").addEventListener("click", function () {
      signOut(auth).then(function () { location.reload(); });
    });
  }

  function submitGate() {
    var digits = Array.from(document.querySelectorAll(".gate-digit"));
    var code = digits.map(function (d) { return d.value; }).join("");
    if (code.length < 4) return;

    var errEl = document.getElementById("gate-error");
    errEl.setAttribute("hidden", "");

    signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code)
      .catch(function () {
        errEl.removeAttribute("hidden");
        digits.forEach(function (d) { d.value = ""; });
        digits[0].focus();
      });
  }

  bindGate();

  onAuthStateChanged(auth, function (user) {
    if (user) {
      uid = user.uid;
      loadDaily();
      loadNotes();
      showApp();
      init();
    } else {
      showGate();
    }
  });

})();
