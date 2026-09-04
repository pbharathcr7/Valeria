# Valeria — AI Reflection & Cognitive Journal
> *Your second brain for thinking, not just writing.*

Built for the **Google AI Studio Developer Challenge 2026**.

Valeria is an AI-powered cognitive journal that transforms journaling into an ongoing structured conversation with Gemini Model. User reflections and session interactions are stored securely in Google Cloud Firestore and strictly isolated to each authenticated Firebase user.

---

### What I Built Beyond the Starter Journal

Valeria extends the Google AI Studio Personal Gemini Journal into a production-inspired cognitive journaling experience.

**Major additions include:**

* Live Voice Reflection with Gemini Live over WebSockets.
* Long-Term Cognitive Memory that synthesizes recurring goals, strengths, and growth trends.
* Weekly AI Insights with Gmail sharing.
* Google Calendar integration from reflection conversations.
* Document Intelligence (RAG) with PDF upload and page-grounded answers.
* Collaborative Life Archives with role-based access control and AI Memory Mosaic.
* Firebase Authentication and Firestore user isolation for secure multi-user support.

### Demo Preview
![image alt](https://github.com/pbharathcr7/Valeria/blob/1b3aa25c0d68d3a2ad21332a1b14ce8cbc62ca6b/dashboard.png)
![image alt](https://github.com/pbharathcr7/Valeria/blob/1b3aa25c0d68d3a2ad21332a1b14ce8cbc62ca6b/voice.png)
![image alt](https://github.com/pbharathcr7/Valeria/blob/1b3aa25c0d68d3a2ad21332a1b14ce8cbc62ca6b/knowledge-base.png)
![image alt](https://github.com/pbharathcr7/Valeria/blob/1b3aa25c0d68d3a2ad21332a1b14ce8cbc62ca6b/life-archive.png)

### System Architecture
![image alt](https://github.com/pbharathcr7/Valeria/blob/ceb659befdbe05dbecbb8e5075592a94e73fc714/architecture%20diagram.svg)

## 🔒 Threat Model & Security Posture

### The 5 Threat Zones Analysis

| Threat Zone | Identified Vector | Implemented Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious prompt injection, oversized PDF payloads, or corrupted JSON bodies | Strict schema validation, body parser limits (30mb for PDFs, guarded null-safe defaults), and explicit parameterization. |
| **2. Planning & Reasoning** | Prompt injection attempting to hijack Socratic persona or leak system rules | System instructions strictly separate meta-guidelines from user memory; Resilient fallback ladder (`gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `gemini-3.7-flash`) safely recovers from API errors without raw error leaks. |
| **3. Tool & AI Execution** | Gemini API key exposure, unauthorized AI invocation, or SSRF | Gemini API key (`GEMINI_API_KEY`) is strictly server-side (`server.ts`). All AI endpoints (`/api/reflect/*`, `/api/documents/*`, `/api/capsules/*`, `/ws/live`) require valid Firebase ID tokens verified via Firebase Admin SDK (`verifyFirebaseToken`). |
| **4. Memory & State** | Cross-user reflection leaks, unauthorized document reads, or session tampering | Firestore Security Rules enforce owner-bound path isolation (`request.auth.uid == userId`) for personal documents, chunks, patterns, and digests. Capsules restrict list operations to owners/collaborators. |
| **5. Inter-System Communication** | Token theft, OAuth credential exposure, or insecure transit | Standard Google OAuth popup flow via Firebase Authentication; Google Workspace APIs (Calendar, Gmail) use short-lived client-side bearer tokens with least-privilege scopes. No passwords or service account private keys are ever stored in custom code. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend API & Middleware**: Node.js & Express (`server.ts`) with Firebase Admin authentication middleware (`verifyFirebaseToken`) proxying Gemini 3.6 Flash.
- **AI Processing**: Google GenAI SDK (`@google/genai`) using Gemini 3.6 Flash and `gemini-embedding-2` for vector similarity search.
- **Real-Time Voice**: WebSockets (`ws`) interfacing with `gemini-3.1-flash-live-preview` for bidirectional low-latency audio dialogue with token authentication.
- **Authentication**: Firebase Authentication with Google Sign-In (federated passwordless identity).
- **Database**: Google Cloud Firestore with owner-bound isolation security rules.
- **Document Intelligence**: PDF parsing (`pdf-parse`), semantic chunking, and in-memory cosine similarity retrieval.
- **Secrets Management**: Environment variable injection & Google Cloud Secret Manager.

---

## 🚀 Step-by-Step Deployment to Google Cloud Run

### 1. Environment & Prerequisites
Install the Google Cloud SDK and enable the required GCP APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Secret Management Setup
Store the Gemini API Key securely in Secret Manager and grant access to the Cloud Run runtime service account:
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Database Security Configuration (Firestore Security Rules)
Deploy the exact owner-bound security rules to isolate user data:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Cloud Run Deployment Flow
Build and deploy the application container to Google Cloud Run:
```bash
gcloud run deploy Valeria \
  --source . \
  --platform managed \
  --region <YOUR_REGION> \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### 5. Required Campaign Labeling (Verification Binding)
Apply the mandatory resource label to register the service for automated challenge verification:
```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```

---
