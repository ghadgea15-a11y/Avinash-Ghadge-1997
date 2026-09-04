# Workforce Capacity Planning & Predictive Forecasting Specification (100% Deterministic)

## १. उद्देश (Objective)
Workforce Capacity Planning प्रणालीमध्ये कोणत्याही स्वरूपाचा static, dummy किंवा `Math.random()` डेटा वापर न करता, संपूर्ण गणना १००% वास्तववादी (Authoritative Firestore Data) आणि कामगार नियमावलीनुसार करणे.

---

## २. तीन मुख्य सुधारणा व अंमलबजावणी (Core Architectural Implementations)

### मुद्दा १: Fallback काढून टाकणे (Zero Silent Defaults)
- **समस्या:** पूर्वी जर साईट/शिफ्टसाठी `site_shift_requirements` दस्तऐवज उपलब्ध नसेल, तर कोड छुप्या पद्धतीने `2 required / 1 min` गृहीत धरत होता.
- **सुधारणा:**
  - आता कोणत्याही छुपे डीफॉल्ट्स नसतील (`isRequirementConfigured: false`).
  - जर एखाद्या साईट/शिफ्टची क्षमता निश्चित केलेली नसेल, तर प्रणाली थेट **"UNCONFIGURED_REQUIREMENT"** स्थिती दाखवेल आणि अ‍ॅडमिनला कॉन्फिगरेशन करण्याचे निर्देश देईल.
  - चुकीच्या किंवा गृहीत धरलेल्या आकडेवारीवर आधारित अहवाल तयार होणार नाहीत.

### मुद्दा २: डायनॅमिक ओव्हरटाईम दर (Dynamic Rate-Card Linked OT Costing)
- **समस्या:** पूर्वी रिलीफ गार्डचा खर्च थेट `₹650` असा स्थिर गृहीत धरला गेला होता.
- **सुधारणा:**
  - आता खर्च थेट `client_billing_contracts` आणि `rate_cards` मधील अधिकृत दरांशी जोडला गेला आहे.
  - प्रत्येक साईट आणि डेझिग्नेशनसाठी ठरवून दिलेला `overtimeRatePerHour` (किंवा `ratePerShift`) वापरून अचूक देयता (Financial Liability) मोजली जाते.
  - जर रेट कार्ड अस्तित्वात नसेल, तर तो स्पष्टपणे `UNPRICED (No Rate Card)` म्हणून नोंदवला जातो.

### मुद्दा ३: ऐतिहासिक ट्रेंडवर आधारित हजेरी अंदाज (Historical Absenteeism Trend Analysis)
- **समस्या:** पूर्वी भविष्यातील अंदाज केवळ `Scheduled - Planned Leaves` एवढाच मर्यादित होता, ज्यात संभाव्य गैरहजेरीचा अंदाज नव्हता.
- **सुधारणा:**
  - मागील ३० ते ९० दिवसांच्या हजेरी मस्टर (`attendance` collection) वरून प्रत्येक वाराची (Day of Week - उदा. सोमवारी किंवा शनिवारी) प्रत्यक्ष हजेरी टक्केवारी काढली जाते:
    $$P(\text{Present} \mid \text{DayOfWeek}, \text{Site}) = \frac{\text{Total Actual Present on that Day}}{\text{Total Rostered Shifts on that Day}}$$
  - यावरून ऐतिहासिक गैरहजेरी दर (Absenteeism Probability) काढला जातो:
    $$\text{Historical Absenteeism Rate} = 1 - P(\text{Present})$$
  - संभाव्य विनापरवानगी गैरहजेरीचा अंदाज:
    $$E[\text{Expected No-Shows}] = \text{Scheduled} \times \text{Historical Absenteeism Rate}$$
  - वास्तववादी उपलब्ध मनुष्यबळ अंदाज:
    $$\text{Projected Available} = \max(0, \text{Scheduled} - \text{Approved Leaves} - E[\text{Expected No-Shows}] + \text{Planned OT})$$
  - वास्तववादी तूट (Forecasted Deficit):
    $$\text{Forecasted Deficit} = \max(0, \text{Required Headcount} - \text{Projected Available})$$

---

## ३. डेटा कलेक्शन ताळेबंद (Data Source Integrity)

| डेटा घटक | Firestore कलेक्शन | वापर |
| :--- | :--- | :--- |
| साईट स्टाफिंग फ्लोर | `site_shift_requirements` | किमान व आवश्यक संख्या |
| ड्युटी रोस्टर | `companies/{companyId}/rosters` | नियोजित कर्मचारी |
| लाईव्ह हजेरी | `companies/{companyId}/attendance` | प्रत्यक्ष पंच व No-Shows |
| मंजूर रजा | `companies/{companyId}/leaves` | अग्रिम रजा वजावट |
| क्लायंट दरपत्रक | `companies/{companyId}/contracts` / `rate_cards` | अचूक OT खर्च व लायबिलिटी |
| गैरहजेरी ट्रेंड्स | `companies/{companyId}/attendance` (Historic) | सांख्यिकीय गैरहजेरी अंदाज |

---

## ४. अनुपालन आणि सत्यापन (Verification Standard)
- कोणत्याही स्क्रीनवर `Math.random()` किंवा काल्पनिक संख्या निर्माण होणार नाहीत.
- सुपरवायझर व मॅनेजरला प्रत्येक आकड्याचे मूळ (Data Provenance) सिस्टिममध्ये पारदर्शकपणे दिसेल.
