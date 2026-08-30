# Valeria — AI Reflection & Cognitive Journal
> *Your second brain for thinking, not just writing.*

Built for the **Google AI Studio Developer Challenge 2026**.

Valeria is an AI-powered cognitive journal that transforms journaling into an ongoing structured conversation with Gemini 3.6 Flash. User reflections and session interactions are stored securely in Google Cloud Firestore and strictly isolated to each authenticated Firebase user.

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
gcloud run deploy Valeria \
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
gcloud run services update Valeria \
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
5. Verify that Valeria responds with empathetic, thoughtful Socratic questions and structured analysis powered by Gemini 3.6 Flash.
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
5. Click the trash icon on an entry to trigger the in-app confirmation modal.
6. Click **"Delete Reflection"** in the modal and verify that the entry is permanently removed from Firestore and the dashboard list updates immediately.
7. Click **Sign Out** to ensure clean session termination and return to the landing page.

### Test Case 5: Direct Google Calendar API Integration & Maps Detection
1. In a reflection session, enter a message mentioning commitments and/or locations (e.g., *"I have an interview next Friday at 3 PM and I also need to visit Apollo Hospital, Velachery."*).
2. Send the message to Gemini.
3. Verify that below Gemini's reflection response, the **Actionable Suggestions** section renders:
   - **Suggested Calendar Event Card**: Displays the extracted event title (*Interview*), computed date/time, and a **"Create Event in Google Calendar"** button.
   - **Detected Location Card**: Displays the detected place name (*Apollo Hospital, Velachery*) and an **"Open in Google Maps"** button.
4. Click **"Create Event in Google Calendar"**:
   - The first time this is invoked, Google Sign-In prompts for Calendar permissions (`https://www.googleapis.com/auth/calendar.events`).
   - The event is created directly in your Google Calendar via the REST API in the background without leaving Valeria.
   - A success banner/toast appears ("Event added to Google Calendar").
   - The card updates with **"Added"** badge, a **"View Event"** link button, and an **"Undo"** button.
5. Click **"View Event"** to verify it opens the created event directly in Google Calendar in a new tab.
6. Click **"Undo"** to test background deletion: verify the event is deleted from your Google Calendar via API and the card reverts back to its initial actionable state.
7. Re-create the event and navigate back to the Dashboard; reopen the reflection to confirm the created status and event links are persisted in Cloud Firestore.
8. Click **"Open in Google Maps"** on the detected location card to verify that it opens the exact location query on Google Maps.

### Test Case 6: Decoupled Loading States & Immediate Typing Indicator Teardown
1. In an active reflection session, send a reflection prompt to Gemini.
2. Verify that **"Valeria is contemplating..."** (governed strictly by `isGenerating`) is visible only while Gemini is actively streaming/generating the response.
3. Verify that the typing indicator vanishes **immediately** once the Gemini response message is rendered in the dialogue stream, without lingering during background Firestore persistence (`isSaving`).
4. On an actionable response with a suggested Google Calendar event, click **"Create Event in Google Calendar"**.
5. Observe that the calendar button displays its own localized loading spinner (`isCreatingCalendarEvent`) without triggering or reviving the chat contemplation indicator.
6. Click **"Open in Google Maps"** on a location card and verify that the maps button shows its own localized state (`isOpeningMaps`) independently of the reflection chat stream.

### Test Case 7: Structured Long-Term Cognitive Memory & Growth Matrix
1. Ensure you have at least 2 saved reflection sessions in Valeria.
2. On the Dashboard, navigate to the **"Long-Term Cognitive Memory & Growth"** banner.
3. Click **"Analyze My Cognitive Patterns"** (button ID: `generate-patterns-btn`).
4. Verify that the button switches to its active loading state (**"Analyzing Memory..."** with spinning sparkles icon) while Gemini analyzes your cognitive history.
5. Once complete, verify that the single text block is replaced with 5 modular, high-contrast cards conforming to Valeria's beige/black aesthetic:
   - **Recurring Goals Card**: Displays key recurring ambitions and intentions.
   - **Recurring Challenges Card**: Displays cognitive biases, friction points, and recurring hurdles.
   - **Strengths Gemini Observed Card**: Displays metacognition, resilience, and emotional clarity traits with Check icons.
   - **Growth Trend Card**: Spans a prominent wide layout detailing your longitudinal mindset evolution and trajectory.
   - **Recommended Focus Card**: Displays targeted prompt questions and focus exercises for subsequent sessions.
6. Confirm the overview metadata bar displays the last analyzed timestamp and the reflection count processed.
7. Refresh the browser and verify that the structured cognitive pattern cards persist from Cloud Firestore (`/users/{userId}/patterns/latest`) without requiring a re-analysis.
8. Click **"Gemini's Full Cognitive Analysis"** (`#toggle-full-analysis-btn`) to verify the collapsible detailed narrative expands and collapses cleanly with structured Markdown sections (never raw JSON syntax).

### Test Case 8: Weekly Reflection Digest & Direct Gmail Integration
1. On the Dashboard or Weekly Insights page, locate the **"Weekly Reflection Digest"** section.
2. Click **"Generate This Week's Digest"** (`#generate-weekly-digest-btn` or `#generate-weekly-digest-main-btn`).
3. Verify that the button switches to its active state (**"Synthesizing Digest..."** with animated icon) while Gemini analyzes reflections from the current week alongside long-term cognitive patterns.
4. Verify that the Weekly Reflection Digest displays:
   - **Week Header & Reflection Count**: Displays the current week date range (e.g., `2026-08-24 – 2026-08-30`) and number of reflection sessions analyzed.
   - **Weekly Overview Card**: 2-3 sentence executive synthesis of mindset and emotional momentum.
   - **Biggest Win Card**: Grounded breakthrough or positive outcome achieved during the week.
   - **Biggest Challenge Card**: Key friction point or cognitive hurdle navigated.
   - **Growth Insight Card**: Metacognitive insight on emotional resilience and mindset evolution.
   - **Next Week Focus Card**: Bulleted list of strategic focus areas and intentional practices.
5. Click **"Open Modal View"** to inspect the pop-up modal view and test regeneration.
6. Click **"Send to Gmail"** (`#send-to-gmail-btn` or `#weekly-send-gmail-btn`):
   - The first time this is invoked, Google Sign-In prompts for Gmail send permissions (`https://www.googleapis.com/auth/gmail.send`).
   - The digest is formatted into a styled HTML email and dispatched to your authenticated Google account via the Gmail REST API in the background.
   - Verify a green success toast appears confirming dispatch to your email address.
   - The digest card updates with a confirmed **"Sent to Gmail"** indicator.
7. Refresh the browser and verify that the Weekly Digest persists from Cloud Firestore (`/users/{userId}/weeklyDigests/{weekId}`) without data loss.

### Test Case 9: Multi-Page Routing & Navigation Architecture
1. Verify the persistent fixed sidebar on the left on desktop screens (and drawer on mobile screens via the hamburger button).
2. Click **"Dashboard"** (`/dashboard`):
   - Verify it displays the lightweight overview with stats, quick reflection modes, recent 3 reflections, Cognitive Memory preview card, and Weekly Insights preview card.
3. Click **"Reflections"** (`/reflections`):
   - Verify it loads the dedicated reflections archive with the search bar, category filters, and full list of past reflections.
   - Click a reflection card to open the reflection canvas; close it and confirm you return to `/reflections`.
4. Click **"Cognitive Memory"** (`/memory`):
   - Verify it loads the dedicated cognitive growth analysis page with the 5 modular cards and the "Analyze My Cognitive Patterns" action.
5. Click **"Weekly Insights"** (`/weekly-insights`):
   - Verify it loads the dedicated executive digest page with week bounds, the "Generate This Week's Digest" trigger, and the "Send to Gmail" direct dispatch.
6. Click **"Calendar & Places"** (`/calendar`):
   - Verify it displays all Google Calendar commitments and detected Google Maps locations with filter tabs and external links.
7. Click **"Settings"** (`/settings`):
   - Verify it displays user identity information (UID, email), active Gemini AI model infrastructure ladder, and connected services status with Sign Out button.
8. Use browser Back and Forward buttons:
   - Verify the application route changes seamlessly without full page reloads, preserving client state.


