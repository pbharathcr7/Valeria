# MindMirror — AI Reflection & Cognitive Journal
> *Your second brain for thinking, not just writing.*

Built for the **Google AI Studio Developer Challenge 2026**.

MindMirror is an AI-powered cognitive journal that transforms journaling into an ongoing structured conversation with Gemini 3.6 Flash. User reflections and session interactions are stored securely in Google Cloud Firestore and strictly isolated to each authenticated Firebase user.

---

## 🔒 Threat Model & Security Posture

### The 5 Threat Zones Analysis

| Threat Zone | Identified Vector | Implemented Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious injection or oversized payload in prompts | Strict schema validation, body parser limits (10mb), and defensive request null-safe checks. |
| **2. Planning & Reasoning** | Prompt injection attempting to alter system role | System instructions strictly separate role guidance from user conversation history; fallback ladder handles API anomalies. |
| **3. Tool & AI Execution** | Gemini API key exposure or dynamic execution | Gemini API calls are strictly handled server-side (`server.ts`). Client never sees `GEMINI_API_KEY`. |
| **4. Memory & State** | Cross-user reflection leaks or unauthorized reads | Firestore Security Rules strictly enforce `request.auth.uid == userId` for `/users/{userId}/interactions/{interactionId}`. |
| **5. Inter-System Communication** | Token leakage or insecure transport | Standard Google OAuth popup flow via Firebase Authentication; no password credentials stored in custom app code. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend API**: Node.js & Express (`server.ts`) proxying Gemini 3.6 Flash with fallback ladders.
- **AI Processing**: Google GenAI SDK (`@google/genai`) using Gemini 3.6 Flash (with automated failover to Gemini 3.1 Flash Lite and latest aliases).
- **Authentication**: Firebase Authentication with Google Sign-In (federated passwordless identity).
- **Database**: Google Cloud Firestore with owner-bound isolation rules.
- **Secrets Management**: Environment variable injection & Google Cloud Secret Manager.

---

## 🚀 Step-by-Step Deployment to Google Cloud Run

### 1. Prerequisites & GCP APIs
Enable required Google Cloud APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Secret Manager Configuration
Store the Gemini API Key securely in Secret Manager:
```bash
# Create and populate secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant default Cloud Run compute service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Firestore Security Rules
Ensure `firestore.rules` enforces user data isolation:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4. Deploy Application to Cloud Run
Build and deploy the application container:
```bash
gcloud run deploy mindmirror \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### 5. Challenge Verification Label
Attach the mandatory developer challenge campaign label:
```bash
gcloud run services update mindmirror \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 📋 Comprehensive Functional Stability & Verification Walkthrough

To ensure 100% interactive stability, walk through each of the following test scenarios:

### Test Case 1: Unauthenticated Landing & Google Sign-In
1. Load the web application root URL (`/`).
2. Verify that the landing page renders with the brand heading, feature highlights, and Google Sign-In CTA buttons.
3. Click **"Sign In with Google"**.
4. Complete the Google Auth popup.
5. Verify that upon successful authorization, the screen transitions to the private Dashboard displaying your name and profile avatar.

### Test Case 2: Multi-Turn Cognitive Reflection & Socratic AI (Mode Locking)
1. On the Dashboard, click **"Start Reflection"** or select one of the reflection mode cards (e.g., *Deep Reflection*, *Brainstorm*, *Cognitive Reframing*).
2. Note that before any messages are sent, the mode dropdown selector can be changed.
3. Enter a dilemma or reflection prompt (e.g., *"I am torn between launching a new project or optimizing my existing workflow."*) and click Send / hit Enter.
4. Verify that the mode selector becomes locked (disabled with lock badge) to preserve session integrity.
5. Verify that MindMirror responds with empathetic, thoughtful Socratic questions and structured analysis powered by Gemini 3.6 Flash.
6. Reply with a second turn (multi-turn conversation) and verify the conversation thread preserves context.

### Test Case 3: Continuous Auto-Save & Cognitive Synthesis
1. Observe the live status indicator in the top header: as messages are exchanged or the title is updated, the indicator dynamically transitions to **"Auto-saving..."** and settles on **"Auto-saved"**.
2. With at least 2 dialogue turns, click the **"Synthesize Insights"** button in the canvas header.
3. Verify that Gemini extracts key themes, takeaways, and structured action items in the side panel.
4. Verify that synthesis insights are automatically saved to Firestore without requiring manual save button clicks.
5. Click the back arrow to return to the Dashboard.

### Test Case 4: User Data Isolation, Firestore Persistence & Safe Deletion
1. Verify that your saved reflection appears in the **"Past Reflections"** list on the Dashboard with its locked mode badge.
2. Use the search bar to filter by keywords or use the intent dropdown to filter by category.
3. Refresh the browser page.
4. Verify that your saved entries reload from Cloud Firestore seamlessly under your user profile.
5. Click **"Analyze My Cognitive Patterns"** (if 2+ entries exist) and verify cross-entry cognitive trajectory analysis renders in Markdown.
6. Click the trash icon on an entry to trigger the in-app confirmation modal.
7. Click **"Delete Reflection"** in the modal and verify that the entry is permanently removed from Firestore and the dashboard list updates immediately.
8. Click **Sign Out** to ensure clean session termination and return to the landing page.

### Test Case 5: Direct Google Calendar API Integration & Maps Detection
1. In a reflection session, enter a message mentioning commitments and/or locations (e.g., *"I have an interview next Friday at 3 PM and I also need to visit Apollo Hospital, Velachery."*).
2. Send the message to Gemini.
3. Verify that below Gemini's reflection response, the **Actionable Suggestions** section renders:
   - **Suggested Calendar Event Card**: Displays the extracted event title (*Interview*), computed date/time, and a **"Create Event in Google Calendar"** button.
   - **Detected Location Card**: Displays the detected place name (*Apollo Hospital, Velachery*) and an **"Open in Google Maps"** button.
4. Click **"Create Event in Google Calendar"**:
   - The first time this is invoked, Google Sign-In prompts for Calendar permissions (`https://www.googleapis.com/auth/calendar.events`).
   - The event is created directly in your Google Calendar via the REST API in the background without leaving MindMirror.
   - A success banner/toast appears ("Event added to Google Calendar").
   - The card updates with **"Added"** badge, a **"View Event"** link button, and an **"Undo"** button.
5. Click **"View Event"** to verify it opens the created event directly in Google Calendar in a new tab.
6. Click **"Undo"** to test background deletion: verify the event is deleted from your Google Calendar via API and the card reverts back to its initial actionable state.
7. Re-create the event and navigate back to the Dashboard; reopen the reflection to confirm the created status and event links are persisted in Cloud Firestore.
8. Click **"Open in Google Maps"** on the detected location card to verify that it opens the exact location query on Google Maps.

### Test Case 6: Decoupled Loading States & Immediate Typing Indicator Teardown
1. In an active reflection session, send a reflection prompt to Gemini.
2. Verify that **"MindMirror is contemplating..."** (governed strictly by `isGenerating`) is visible only while Gemini is actively streaming/generating the response.
3. Verify that the typing indicator vanishes **immediately** once the Gemini response message is rendered in the dialogue stream, without lingering during background Firestore persistence (`isSaving`).
4. On an actionable response with a suggested Google Calendar event, click **"Create Event in Google Calendar"**.
5. Observe that the calendar button displays its own localized loading spinner (`isCreatingCalendarEvent`) without triggering or reviving the chat contemplation indicator.
6. Click **"Open in Google Maps"** on a location card and verify that the maps button shows its own localized state (`isOpeningMaps`) independently of the reflection chat stream.


