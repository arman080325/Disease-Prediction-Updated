"""
Disease descriptions, common tests, and general suggestions.
Extracted verbatim from the original Streamlit app (src/app.py).
Keys match the Kaggle `prognosis` labels used by the trained model.
"""

DISEASE_INFO = {
    "Fungal infection": {
        "description": (
            "A skin or mucosal infection caused by fungi, often leading to itching, "
            "redness, and rashes in moist areas of the body."
        ),
        "tests": "Skin scraping & KOH exam, fungal culture, physical examination.",
        "suggestions": (
            "Keep the affected area clean and dry, avoid tight clothing, and consult "
            "a doctor or dermatologist for proper evaluation."
        ),
    },
    "Allergy": {
        "description": (
            "An overreaction of the immune system to substances such as dust, pollen, "
            "foods, or medicines, causing sneezing, rashes, or breathing difficulty."
        ),
        "tests": "Allergy skin prick test, blood IgE levels, detailed history.",
        "suggestions": (
            "Avoid suspected triggers, monitor symptoms, and seek medical advice if "
            "breathing difficulty or severe swelling occurs."
        ),
    },
    "GERD": {
        "description": (
            "Gastroesophageal Reflux Disease (GERD) occurs when stomach acid "
            "frequently flows back into the esophagus, causing heartburn and discomfort."
        ),
        "tests": "Upper GI endoscopy, pH monitoring, barium swallow X-ray.",
        "suggestions": (
            "Avoid heavy meals, spicy/oily foods, and lying down immediately after eating. "
            "Consult a doctor if symptoms are frequent or severe."
        ),
    },
    "Chronic cholestasis": {
        "description": (
            "A long-term reduction or stoppage of bile flow, leading to jaundice, itching, "
            "and digestion-related issues."
        ),
        "tests": "Liver function tests, abdominal ultrasound, MRCP, liver biopsy.",
        "suggestions": (
            "This condition needs specialist care. Consult a gastroenterologist or "
            "hepatologist for detailed evaluation."
        ),
    },
    "Drug Reaction": {
        "description": (
            "An unwanted or harmful response to a medication, which may present as rash, "
            "itching, swelling, or more severe symptoms."
        ),
        "tests": "Clinical evaluation, review of recent medications, allergy testing if needed.",
        "suggestions": (
            "Stop the suspected drug only after consulting a doctor. Seek urgent care if "
            "there is difficulty breathing, facial swelling, or widespread rash."
        ),
    },
    "Peptic ulcer diseae": {
        "description": (
            "Sores that develop on the inner lining of the stomach or upper intestine, "
            "often causing burning pain in the upper abdomen."
        ),
        "tests": "Endoscopy, H. pylori testing, stool antigen test.",
        "suggestions": (
            "Avoid painkillers on your own, reduce smoking/alcohol, and consult a doctor "
            "for proper management."
        ),
    },
    "AIDS": {
        "description": (
            "Acquired Immunodeficiency Syndrome, a late stage of HIV infection that "
            "weakens the immune system and increases risk of infections and cancers."
        ),
        "tests": "HIV antibody/antigen tests, CD4 count, viral load tests.",
        "suggestions": (
            "Requires lifelong specialist follow-up. Consult an infectious disease specialist "
            "or HIV clinic for counselling and treatment."
        ),
    },
    "Diabetes ": {
        "description": (
            "A condition where the body cannot properly regulate blood sugar, leading to "
            "high glucose levels over time."
        ),
        "tests": "Fasting blood sugar, HbA1c, oral glucose tolerance test.",
        "suggestions": (
            "Follow a healthy lifestyle, regular monitoring, and consult a doctor/endocrinologist "
            "for long-term management."
        ),
    },
    "Gastroenteritis": {
        "description": (
            "Inflammation of the stomach and intestines, commonly causing vomiting, diarrhea, "
            "and abdominal cramps."
        ),
        "tests": "Stool tests (if severe), dehydration assessment, basic blood tests.",
        "suggestions": (
            "Maintain hydration with fluids, avoid street food, and seek medical help if "
            "there is blood in stool, high fever, or severe weakness."
        ),
    },
    "Bronchial Asthma": {
        "description": (
            "A chronic condition where airways become inflamed and narrow, causing wheezing, "
            "shortness of breath, and chest tightness."
        ),
        "tests": "Spirometry (lung function test), peak flow measurement, chest exam.",
        "suggestions": (
            "Avoid triggers like smoke and dust. Regular follow-up with a doctor is important "
            "for inhaler use and long-term control."
        ),
    },
    "Hypertension ": {
        "description": (
            "Persistently high blood pressure, which increases the risk of heart disease, "
            "stroke, and kidney damage over time."
        ),
        "tests": "Blood pressure monitoring, kidney function tests, ECG, lipid profile.",
        "suggestions": (
            "Reduce salt intake, maintain a healthy weight, and consult a doctor for proper "
            "evaluation and monitoring."
        ),
    },
    "Migraine": {
        "description": (
            "A type of headache often associated with throbbing pain, sensitivity to light/sound, "
            "and sometimes nausea."
        ),
        "tests": "Mainly clinical diagnosis; sometimes CT/MRI to rule out other causes.",
        "suggestions": (
            "Identify and avoid triggers (like lack of sleep, certain foods). For frequent attacks, "
            "consult a doctor for preventive strategies."
        ),
    },
    "Cervical spondylosis": {
        "description": (
            "Age-related wear and tear affecting the joints and discs in the neck, possibly causing "
            "neck pain and stiffness."
        ),
        "tests": "X-ray of cervical spine, MRI if nerve involvement is suspected.",
        "suggestions": (
            "Posture correction, neck exercises, and medical review are important if pain persists."
        ),
    },
    "Paralysis (brain hemorrhage)": {
        "description": (
            "Loss of muscle function (often on one side of the body) due to bleeding in the brain, "
            "usually a medical emergency."
        ),
        "tests": "CT/MRI brain, neurological examination, blood pressure assessment.",
        "suggestions": (
            "This is an emergency condition. Immediate hospital care and specialist consultation are critical."
        ),
    },
    "Jaundice": {
        "description": (
            "Yellowing of skin and eyes due to high bilirubin levels, often related to liver or bile duct problems."
        ),
        "tests": "Liver function tests, ultrasound abdomen, viral hepatitis markers.",
        "suggestions": (
            "Avoid alcohol and self-medication. Timely evaluation by a doctor is important."
        ),
    },
    "Malaria": {
        "description": (
            "A mosquito-borne infection causing fever, chills, and flu-like symptoms, common in many tropical regions."
        ),
        "tests": "Peripheral blood smear, rapid malaria antigen tests.",
        "suggestions": (
            "Seek medical help early, especially with high fever and chills. Use mosquito precautions."
        ),
    },
    "Chicken pox": {
        "description": (
            "A viral infection causing itchy, blister-like rashes all over the body, often with fever."
        ),
        "tests": "Usually clinical; rarely blood tests for antibodies.",
        "suggestions": (
            "Avoid scratching lesions, maintain hygiene, and avoid contact with pregnant women or immunocompromised people."
        ),
    },
    "Dengue": {
        "description": (
            "A viral infection transmitted by mosquitoes, often causing high fever, body pain, and sometimes bleeding."
        ),
        "tests": "Dengue NS1 antigen test, IgM/IgG antibodies, platelet count.",
        "suggestions": (
            "Avoid self-medication with painkillers like NSAIDs, maintain hydration, and seek medical care for warning signs."
        ),
    },
    "Typhoid": {
        "description": (
            "A bacterial infection typically spread by contaminated food or water, causing persistent fever and abdominal symptoms."
        ),
        "tests": "Blood culture, Widal test, stool culture.",
        "suggestions": (
            "Ensure safe drinking water and proper hygiene. Medical treatment is needed for proper cure."
        ),
    },
    "hepatitis A": {
        "description": (
            "A viral infection affecting the liver, often spread via contaminated food or water."
        ),
        "tests": "Liver function tests, HAV IgM antibody test.",
        "suggestions": (
            "Rest, good hydration, and avoiding alcohol are important. Consult a doctor for evaluation."
        ),
    },
    "Hepatitis B": {
        "description": (
            "A viral liver infection that can become chronic and may lead to liver damage over time."
        ),
        "tests": "HBsAg, HBeAg, HBV DNA, liver function tests.",
        "suggestions": (
            "Requires specialist review. Follow medical advice for monitoring and treatment."
        ),
    },
    "Hepatitis C": {
        "description": (
            "A viral infection that primarily affects the liver and may lead to chronic liver disease."
        ),
        "tests": "Anti-HCV antibody test, HCV RNA, liver function tests.",
        "suggestions": (
            "Consult a liver specialist for further evaluation and long-term follow-up."
        ),
    },
    "Hepatitis D": {
        "description": (
            "A viral infection that occurs only in people infected with Hepatitis B, and can worsen liver disease."
        ),
        "tests": "Anti-HDV antibody, liver function tests.",
        "suggestions": (
            "Specialist evaluation is important for combined management of hepatitis B and D."
        ),
    },
    "Hepatitis E": {
        "description": (
            "A viral infection of the liver, typically spread through contaminated water."
        ),
        "tests": "HEV IgM antibody, liver function tests.",
        "suggestions": (
            "Usually self-limiting but requires rest and hydration. Important in pregnancy—medical advice is essential."
        ),
    },
    "Alcoholic hepatitis": {
        "description": "Liver inflammation caused by long-term heavy alcohol use.",
        "tests": "Liver function tests, ultrasound liver, history of alcohol intake.",
        "suggestions": (
            "Stopping alcohol and consulting a doctor or specialist is very important."
        ),
    },
    "Tuberculosis": {
        "description": (
            "A bacterial infection that most often affects the lungs, causing cough, fever, and weight loss."
        ),
        "tests": "Chest X-ray, sputum AFB, GeneXpert, tuberculin skin test.",
        "suggestions": (
            "Requires long-term supervised treatment. Consult a TB clinic or chest specialist."
        ),
    },
    "Common Cold": {
        "description": (
            "A mild viral infection of the nose and throat, causing sneezing, sore throat, and runny nose."
        ),
        "tests": "Usually clinical; tests rarely required.",
        "suggestions": (
            "Rest, fluids, and basic hygiene. Consult a doctor if symptoms persist or worsen."
        ),
    },
    "Pneumonia": {
        "description": (
            "Infection that inflames the air sacs in one or both lungs, causing cough, fever, and breathing difficulty."
        ),
        "tests": "Chest X-ray, blood tests, sputum culture.",
        "suggestions": (
            "Seek medical attention early, especially if breathing is difficult or fever is high."
        ),
    },
    "Dimorphic hemmorhoids(piles)": {
        "description": (
            "Swollen and inflamed veins in the rectum and anus that cause discomfort and bleeding."
        ),
        "tests": "Physical exam, proctoscopy.",
        "suggestions": (
            "High-fiber diet, adequate fluids; seek medical advice for persistent bleeding or pain."
        ),
    },
    "Heart attack": {
        "description": (
            "A medical emergency where blood flow to part of the heart is blocked, causing chest pain and potential damage."
        ),
        "tests": "ECG, cardiac enzymes, echocardiography, coronary angiography.",
        "suggestions": (
            "This is an emergency — immediate hospital care is essential if suspected."
        ),
    },
    "Varicose veins": {
        "description": (
            "Enlarged, twisted veins often seen in the legs due to faulty valves in the veins."
        ),
        "tests": "Doppler ultrasound of leg veins.",
        "suggestions": (
            "Avoid prolonged standing, consider leg elevation and medical review for severe cases."
        ),
    },
    "Hypothyroidism": {
        "description": (
            "Underactive thyroid gland leading to fatigue, weight gain, and cold intolerance."
        ),
        "tests": "TSH, Free T4 blood tests.",
        "suggestions": (
            "Regular thyroid function monitoring and medical guidance are important."
        ),
    },
    "Hyperthyroidism": {
        "description": (
            "Overactive thyroid gland causing weight loss, palpitations, anxiety, and heat intolerance."
        ),
        "tests": "TSH, Free T3, Free T4, thyroid scan.",
        "suggestions": (
            "Seek medical advice for evaluation and management of thyroid levels."
        ),
    },
    "Hypoglycemia": {
        "description": (
            "Low blood sugar levels, which can lead to dizziness, sweating, confusion, or fainting."
        ),
        "tests": "Blood glucose testing during symptoms.",
        "suggestions": (
            "Requires prompt carbohydrate intake and evaluation, especially in people on diabetes medicines."
        ),
    },
    "Osteoarthristis": {
        "description": (
            "Degenerative joint disease causing pain, stiffness, and reduced mobility, often in knees or hips."
        ),
        "tests": "X-rays of affected joints, physical examination.",
        "suggestions": (
            "Weight management, exercises, and medical advice can help manage symptoms."
        ),
    },
    "Arthritis": {
        "description": (
            "Inflammation of joints causing pain and stiffness; may have many types such as rheumatoid arthritis."
        ),
        "tests": "Joint exam, X-rays, ESR/CRP, rheumatoid factor (if suspected).",
        "suggestions": (
            "Early diagnosis and treatment can help prevent joint damage. Consult a doctor/rheumatologist."
        ),
    },
    "(vertigo) Paroymsal Positional Vertigo": {
        "description": (
            "Sudden episodes of dizziness or spinning sensation triggered by changes in head position."
        ),
        "tests": "Clinical positional tests (e.g., Dix–Hallpike), sometimes MRI to rule out other causes.",
        "suggestions": (
            "Avoid sudden head movements and consult a doctor if episodes are frequent."
        ),
    },
    "Acne": {
        "description": (
            "A common skin condition causing pimples, usually on face, chest, or back."
        ),
        "tests": "Mostly clinical; tests usually not required.",
        "suggestions": (
            "Maintain gentle skin care. For severe or scarring acne, consult a dermatologist."
        ),
    },
    "Urinary tract infection": {
        "description": (
            "Infection in any part of the urinary system, often causing burning urination and frequent urge."
        ),
        "tests": "Urine routine & culture.",
        "suggestions": (
            "Drink plenty of water and consult a doctor, especially if there is fever or back pain."
        ),
    },
    "Psoriasis": {
        "description": (
            "A chronic skin condition causing red, scaly patches, commonly on elbows, knees, or scalp."
        ),
        "tests": "Skin examination; sometimes skin biopsy.",
        "suggestions": (
            "Requires long-term skin care and sometimes specialist management."
        ),
    },
    "Impetigo": {
        "description": (
            "A contagious bacterial skin infection causing red sores, often around the nose and mouth in children."
        ),
        "tests": "Clinical exam; sometimes swab of lesions.",
        "suggestions": (
            "Maintain hygiene and avoid sharing towels. Medical treatment is usually required."
        ),
    },
}


def get_disease_info(name: str) -> dict:
    """Return disease description/tests/suggestions or a generic fallback."""
    info = DISEASE_INFO.get(name)
    if not info:
        return {
            "description": "Detailed information for this disease is not available in the app.",
            "tests": "Consult a doctor for appropriate diagnostic tests.",
            "suggestions": "Please seek professional medical advice for personalised recommendations.",
        }
    return info
