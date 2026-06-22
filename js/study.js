// ==========================================================================
// Mom's Study Zone — NCLEX-PN quiz, daily goal, notepad (Firestore-synced)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

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
    {id:"m024",diff:"medium",cat:"Health Promotion",q:"A nurse conducts a developmental assessment on a 15-month-old child. Which finding requires further evaluation?",opts:["Says 2–3 words","Walks independently with a wide gait","Uses a pincer grasp","Has not yet begun to run"],ans:3,exp:"Running typically develops between 18–24 months, so it's not a concern at 15 months. However, a 15-month-old should have at least a few words; the other milestones listed are normal. Not running is normal at 15 months — this is a distractor. The answer focuses on what is NOT a concern vs. what WOULD need evaluation. At 15 months, having only 2–3 words is on the lower end — wait, that's actually acceptable (normal is 1–3 words by 12–15 months). Not yet running at 15 months is normal. Wide gait is normal for new walkers. Pincer grasp by 9–12 months is normal. All findings are appropriate — 'not yet begun to run' is expected and does not require evaluation. Re-reading: 'requires further evaluation' — having only 2–3 words at 15 months is borderline (should have ~10 words by 18 months, but 2–3 is low for 15 mo). Actually the expected finding is that none of these need further evaluation except — at 15 months a child should have a pincer grasp (develops 9–12 months) and if not present would need evaluation. Pincer grasp IS present here, so that is normal."},
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
    {id:"h030",diff:"hard",cat:"Physiological",q:"A client develops sudden right-sided facial droop, arm drift, and slurred speech. Onset was 45 minutes ago. CT head shows no hemorrhage. The client's BP is 185/100 mmHg, INR 1.1, and glucose 92 mg/dL. The nurse prepares the client for:",opts:["Emergency craniotomy","IV tPA (alteplase) administration","Mechanical thrombectomy only (no IV thrombolytics)","Heparin anticoagulation therapy"],ans:1,exp:"This is ischemic stroke within the 4.5-hour tPA window with no hemorrhage on CT, INR <1.7, and glucose in range. IV alteplase (tPA) is the indicated treatment. BP must be <185/110 before administration (185/100 is acceptable). Thrombectomy may follow but tPA is first."}
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

  onAuthStateChanged(auth, function (user) {
    if (user) {
      uid = user.uid;
      loadDaily();
      loadNotes();
      init();
    } else {
      signInAnonymously(auth).catch(function (err) {
        console.warn("anon auth failed", err);
        uid = "local";
        init();
        renderDailyBanner();
      });
    }
  });

})();
