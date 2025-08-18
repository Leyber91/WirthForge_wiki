WF-UX-005 — Onboarding & User Education

🧬 Document DNA

Unique ID: WF-UX-005
Category: UX
Priority: P1 (Critical for user adoption)
Dev Phase: 2 (User Experience Design)
Version: 1.0.0 (Draft)
Last Updated: 2025-08-18
Document Type: UX Specification (Onboarding flow and education design)

🔗 Dependency Matrix

Required Before: WF-UX-001 (UI Architecture & Design System), WF-UX-002 (Progressive Levels & Gamification), WF-FND-001 (Vision & Principles Manifesto), WF-TECH-001 (Core Platform Setup)
Enables After: Smooth user adoption for all subsequent WIRTHFORGE features; informs WF-OPS-001 (Deployment & Installation guides) with user guidance content.

🎯 Core Objective

Design and implement a comprehensive onboarding experience that introduces users to WIRTHFORGE’s core concepts, energy metaphors, and local AI capabilities in a gradual, engaging way. The onboarding must orient first-time users without overwhelming them. It should teach the platform’s unique “energy truth” visualization paradigm and 5-level progression system, while verifying the local AI setup is working correctly – all entirely offline on the user’s device. By the end of onboarding, users should feel confident using WIRTHFORGE, understand its key mechanics (like the real-time lightning visuals and multi-level gamification), and have their local system tuned (performance tier detected, models loaded, etc.) for a smooth start. Crucially, the onboarding and educational content should adhere to WIRTHFORGE’s web-engaged local-first philosophy: all interactivity happens in the web UI, but no cloud services are required for core training or tutorials. The user learns by doing, through interactive tutorials that reflect actual AI activity, reinforcing trust that every visual or metric they see corresponds to a real computation happening on their machine.

📚 Knowledge Integration Checklist

Local-First, Offline-Ready Onboarding: The entire initial experience runs without internet access. All tutorials, help content, and verification steps are bundled with the app so a user in offline or private environments can complete onboarding. This aligns with the principle that no cloud dependencies are required for core usage. (E.g., the FTUX will not ask the user to log in or download additional content to proceed.) If community resources are offered, they are optional or come from pre-loaded archives when offline.

Progressive Disclosure of Features: Onboarding uses progressive disclosure to introduce complexity gradually. Early steps focus on basic concepts (like sending a prompt and seeing a lightning visualization for the AI’s response). Only as the user masters fundamentals do more advanced features (multi-model orchestration, custom settings, etc.) get introduced. This prevents new users from being overwhelmed by all of WIRTHFORGE’s capabilities at once. The design ensures that advanced options remain hidden or disabled until the user is ready, unlocking step-by-step as part of the level progression (tie-in with the 5 Levels from WF-UX-002).

Interactive Energy Metaphor Education: Key WIRTHFORGE concepts—like the energy visualization metaphor (lightning, streams, interference, etc.)—are taught through interaction, not just text. For example, instead of reading about lightning bolts representing token generation, the user is prompted to trigger an AI response and observe a lightning bolt in real time. Guided tasks have the user perform actions that cause visible energy effects, immediately linking concept to experience. This hands-on approach leverages the “learning by doing” principle to make abstract ideas concrete and memorable.

Hardware Tier Customization: Upon first run, the system will detect or ask the user about their hardware performance tier (Low, Mid, High). The onboarding flow dynamically adapts based on this. On low-end machines, it might simplify visuals or skip ahead once basics are covered (to avoid straining the device), whereas high-end setups get a richer, more elaborate tutorial (e.g. enabling extra visual effects demonstrations). This ensures performance-appropriate onboarding so that each user has a smooth experience. The UI may display a brief feedback about detected tier and adjust content accordingly (e.g., “Basic mode enabled for your hardware” or “Advanced effects enabled”).

Local AI Function Verification: The onboarding process validates that the local AI backend is functioning properly. Early in FTUX, after the user installs and starts WIRTHFORGE, a system check runs (e.g., generating a sample prompt or running a quick model query in the background) to confirm the AI engine is loaded, the WebSocket connection (per WF-TECH-003) is live, and real-time data is flowing. If any issue is detected (model not found, GPU not available, etc.), the onboarding provides guidance to resolve it (such as instructions to download a model or switch to CPU mode) before proceeding. This guarantees that by the end of onboarding, the user’s setup is actually capable of using WIRTHFORGE features.

No-Friction First Experience: The FTUX (First-Time User Experience) is designed to minimize friction. Defaults are preselected intelligently (e.g., a default local model, a recommended graphics setting based on hardware) so the user can get started with minimal configuration. Only absolutely necessary questions are asked up front (like confirming a performance tier or model selection if multiple are available). Everything else is taught by usage. The user is not forced to read lengthy manuals or configure complex settings before seeing results – they will see an AI response and its visualization within the first minute of use, hooking them with a quick wow moment that demonstrates the platform’s value immediately.

📝 Content Architecture

Onboarding Flow Design – This section covers the first-run user journey. It details the FTUX sequence from launch to completion: welcoming the user, guiding them through an initial AI interaction, introducing WIRTHFORGE’s energy metaphors with interactive tutorials, and verifying local AI setup. The flow is adaptive to user’s system performance tier, presenting a basic path for low-tier hardware and an enhanced path for high-tier (including optional community features if online). We outline the structure of tutorial steps, how success criteria are defined (e.g. ensuring the user completes key actions), and how progress is tracked behind the scenes. Diagrams illustrate the branching flow for different tiers and the overall state machine of the onboarding process.

Educational Content Strategy – This section describes ongoing user education mechanisms beyond the initial tutorial. It defines in-app contextual help (tooltips and hints that appear at relevant moments), a library of FAQ and troubleshooting content accessible offline, and integration with external learning resources. We include plans for short tutorial videos (generated via an AI video service like Sora) embedded in the app to demonstrate features, and interactive learning modules that users can invoke on demand (for example, a practice mode or guided tour that can be re-run). This strategy ensures users have continuous support as they explore WIRTHFORGE’s features. We cover how these resources can update (e.g., via community contributions or updates in new releases) while respecting the local-first model.

User Testing & Iteration – This section focuses on how the onboarding experience will be evaluated and improved over time. It defines usability testing protocols (both internal tests with team members and external beta user feedback loops) to catch any confusing steps or pain points in the tutorials. We specify metrics for learning effectiveness – for instance, does the user correctly use a feature after the tutorial, or do they seek help? – and how to measure them (like embedding optional quizzes or tracking feature usage after onboarding). We also cover drop-off analysis, identifying if/where users quit the onboarding early, and using that data to optimize the flow (e.g., if many users drop at a certain step, we revisit or simplify it). Additionally, an A/B testing framework is outlined, where different onboarding variants can be tested (perhaps one version with a longer tutorial vs. one with a shorter tutorial plus reference material) to see which yields better engagement and retention. This section ensures the onboarding remains effective as the user base grows and diversifies.

🎯 Generated Assets Inventory

## Mermaid Diagrams (3)

**Onboarding Flow Diagram:** A flowchart of the first-time user journey, branching by performance tier and including community integration logic.
- 📁 File: `assets/diagrams/WF-UX-005/onboarding-flow.md`
- ✅ Status: Complete

**Learning Path Progression:** A visual diagram of progressive tutorial levels corresponding to WIRTHFORGE's five user levels, showing unlock sequence and relationships.
- 📁 File: `assets/diagrams/WF-UX-005/learning-paths.md`
- ✅ Status: Complete

**Success Metrics Sequence:** A sequence diagram illustrating how tutorial completion and drop-off metrics are captured and processed.
- 📁 File: `assets/diagrams/WF-UX-005/success-metrics.md`
- ✅ Status: Complete

## JSON Schemas (3)

**Tutorial Definition Schema:** JSON structure defining tutorial content (steps, actions, and completion criteria).
- 📁 File: `assets/schemas/WF-UX-005/tutorial-definitions.json`
- ✅ Status: Complete

**Progress Tracking Schema:** JSON format for storing a user's onboarding/tutorial progress and performance metrics.
- 📁 File: `assets/schemas/WF-UX-005/progress-tracking.json`
- ✅ Status: Complete

**Help Content Schema:** JSON structure for in-app help topics, tooltips, FAQs, including offline content and placeholders for video links or prompts.
- 📁 File: `assets/schemas/WF-UX-005/help-content.json`
- ✅ Status: Complete

## Code Components (4)

**Tutorial Step UI Component (React/TypeScript):** Interactive tutorial system with progressive disclosure, accessibility support, and hardware tier adaptation.
- 📁 File: `assets/code/WF-UX-005/tutorial-components.tsx`
- ✅ Status: Complete

**Progress Tracker Module:** Local-first progress tracking with offline storage, session management, and analytics event logging.
- 📁 File: `assets/code/WF-UX-005/progress-tracker.ts`
- ✅ Status: Complete

**Help System:** Contextual help with tooltips, smart hints, FAQ search, and video tutorial playback with offline fallback.
- 📁 File: `assets/code/WF-UX-005/help-system.ts`
- ✅ Status: Complete

**AI Video Integration:** Integration with AI video generation services (Sora, Runway) with local caching and prompt enhancement.
- 📁 File: `assets/code/WF-UX-005/ai-video-integration.ts`
- ✅ Status: Complete

## Test Suites (3)

**Onboarding Flow Tests:** Automated tests simulating a new user going through the FTUX, verifying each step completes and the final state is achieved.
- 📁 File: `assets/tests/WF-UX-005/onboarding-flow.test.js`
- ✅ Status: Complete

**Learning Validation Tests:** Tests to ensure that after completing tutorials, certain user capabilities or knowledge can be observed and tutorial progression behaves as expected.
- 📁 File: `assets/tests/WF-UX-005/learning-validation.test.js`
- ✅ Status: Complete

**Usability & Metrics Tests:** Suites focusing on telemetry, drop-off analysis, completion times, and A/B testing framework validation.
- 📁 File: `assets/tests/WF-UX-005/usability-metrics.test.js`
- ✅ Status: Complete

## 🎯 Implementation Status Summary

✅ **All 13 required assets have been generated and are ready for implementation.**

- **3 Mermaid diagrams** illustrating onboarding logic, user progression, and metrics collection
- **3 JSON schema examples** covering tutorials, progress tracking, and help content  
- **4 code components** demonstrating key functionality (UI, tracking, help, AI video)
- **3 test suite implementations** covering functionality, learning outcomes, and analytics

All assets align with WIRTHFORGE's principles (local-first operation, energy-truth in visuals, progressive enhancement, and accessibility). They serve as both design artifacts and starting points for implementation.

Onboarding Flow Design

The First-Time User Experience (FTUX) in WIRTHFORGE is carefully crafted as a step-by-step interactive tutorial. It welcomes users, guides them through a basic AI interaction, and gradually reveals core concepts. The flow begins the moment a user launches WIRTHFORGE after installation, and concludes when the user has successfully completed an initial tutorial mission and reached the main application interface with confidence. Key aspects of the onboarding flow include:

Welcome & System Setup: A welcome screen greets the user with a brief introduction to WIRTHFORGE’s vision (“Make AI visible, engaging, and locally owned”). Immediately after, the application either auto-detects the user’s hardware capabilities or prompts the user to choose a performance profile (e.g. Basic, Standard, Advanced). This step ensures the rest of the onboarding is tailored to the device’s capabilities. For example, on low-end hardware, the tutorial might use simpler visuals to maintain performance, whereas on high-end systems it can enable all effects. No external sign-ups or internet connections are required – users proceed with local setup only.

Initial AI Interaction (Level 1 Demo): The user is then guided to perform a simple action: enter a sample prompt into the system (for instance, a default prompt like “Hello, Wirthforge!” might be suggested). Upon submission, the local AI model generates a response, and the signature Level 1 lightning visualization is shown in real-time. This is a crucial “wow moment” designed to hook the user – it demonstrates the core premise (local AI + visual feedback) within the first minute. The tutorial overlay might highlight the lightning bolt and explain, “This lightning represents your AI thinking – its speed and pattern reflect the actual response time!”. By actively involving the user (they input a prompt and witness a result), we ensure they immediately grasp the interactive nature of the platform.

Guided Concept Introduction: After the initial demo, the tutorial introduces WIRTHFORGE’s key concepts one by one, each with an interactive step. For example, it may introduce the concept of Energy Units or “energy truth” by showing an energy meter filling up as the AI processes the prompt. It could next introduce the idea of the five Progressive Levels: Lightning, Streams, Structures, Fields, Resonance (from WF-UX-002), likely by name and icon only at first. The user isn’t expected to understand them deeply yet; it’s more of an orientation that “you are currently in Level 1 (Lightning) and there’s more to come as you progress.” The tutorial might say, “You’ve just witnessed Lightning (Level 1) – the first of five levels of interaction. As you advance, you’ll unlock new abilities (like running multiple AI models at once!).” This primes users for the gamified progression without delving into details prematurely.

Interactive Tutorials per Level: Rather than a single monolithic tutorial, the onboarding is structured as a series of mini-tutorials that correspond to the first few user levels. Right after the FTUX, the user’s Level 1 tutorial continues with a couple more tasks: e.g., “Try asking the AI a follow-up question” to see another lightning strike, or “Adjust this slider to change how the AI thinks” (introducing a simple control like temperature, tied to a visual change in the lightning brightness perhaps). Once the user completes these tasks, they achieve Level 1 completion – possibly earning a badge or achievement to make it satisfying. The system then unlocks Level 2 and immediately offers the next tutorial (which the user can start or skip and do later). Level 2’s onboarding (once initiated) will introduce multi-model concepts with a simple demonstration (like running two small models together to show an interference pattern, if the hardware allows). This way, onboarding is not a one-time event but seamlessly continues as the user progresses, integrated with the gamification system. However, these subsequent level tutorials are triggered at appropriate times (not all in the first session unless the user chooses). The FTUX ensures they know these tutorials exist and how to access them (e.g., “Level 2 unlocked! Click here to learn about Streams.”).

Local AI Setup & Verification: Integral to the onboarding flow is making sure the local AI backend is running smoothly. During the tutorial, after the first prompt is submitted, the system can confirm things like: the model responded within expected time, the WebSocket delivered data to the UI, and the visualization rendered at 60Hz. If any of these checks fail (say the AI took too long or no data arrived), the user is alerted in a friendly way and given troubleshooting steps. For example, if the model isn’t loaded, the UI might prompt “It looks like no AI model is configured. Let’s set that up now.” and walk the user through selecting or downloading a model (leveraging the WF-TECH-001 core platform capabilities). Similarly, if the rendering is laggy (perhaps on very low tier hardware), the tutorial could automatically simplify or offer “reduced effects mode” toggle as a tip. This ensures that by the end of onboarding, the user’s environment is validated – they have a working model and an understanding of how to tweak settings if needed.

Completion Criteria & Rewards: Each tutorial segment has clear success criteria so the user (and system) knows it’s completed. This could be as simple as “User saw the AI respond with a lightning bolt at least once” for the very first step, and “User successfully asks a second question unassisted” for a later step. The system tracks these behind the scenes (see Progress Tracking below). When the FTUX is fully completed, the user is congratulated – e.g., a modal might proclaim “Onboarding Complete – You’re ready to forge ahead!” accompanied by a celebratory visual (perhaps a special energy burst animation or a badge). There may also be a summary of what they’ve learned (“You learned how to send prompts, view energy visuals, and adjust basic settings. Check out the Help section for more tips.”). Importantly, completion unlocks normal use of the app without tutorial overlays. The user’s status (maybe an internal flag or a profile entry) is updated so that the FTUX doesn’t show again, but the user can always revisit tutorials via the help menu if desired. Additionally, completion might grant a small reward in gamification terms – e.g., some points, or an achievement like “Novice Forge Smith – Completed Onboarding” to encourage a sense of accomplishment.

Below is a Mermaid flowchart outlining the high-level FTUX onboarding flow, including branching for different performance tiers and the optional community integration step for high-tier users:

graph TB
    start([First Launch of WIRTHFORGE])
    tiercheck{{"Detect Performance Tier"}}
    welcome[[Welcome Screen & Intro]]
    start --> welcome --> tiercheck

    tiercheck -->|Low Tier| lowPath[Basic Onboarding Path\n(Limited effects)]
    tiercheck -->|Mid Tier| midPath[Standard Onboarding Path]
    tiercheck -->|High Tier| highPath[Extended Onboarding Path\n(+ advanced demo)]

    %% Low and Mid Tier Paths (simplified for diagram, they converge)
    lowPath --> tutorial1[[Level 1 Tutorial Steps]]
    midPath --> tutorial1
    tutorial1 --> verifyAI{{"Local AI OK?"}}
    verifyAI -->|Yes| complete[(Complete Onboarding)]
    verifyAI -->|Issue| assist[Troubleshooting Prompt\n(Model download/Settings)]
    assist --> verifyAI  %% loop back after fix, then complete

    %% High Tier Path includes community integration option
    highPath --> tutorial1_high[[Level 1 Tutorial + Extra Demos]]
    tutorial1_high --> commStep{{"Community Content Available?"}}
    commStep -->|User Online| community[[Show Online Community Tips]]
    commStep -->|Offline or Skip| skipComm[Skip Community Section]
    community --> verifyAI_high{{"Local AI OK?"}}
    skipComm --> verifyAI_high
    verifyAI_high -->|Yes| complete_high[(Complete Onboarding)]
    verifyAI_high -->|Issue| assist_high[Advanced Troubleshooting]
    assist_high --> verifyAI_high


Figure: Onboarding Flow Diagram. This flowchart illustrates the FTUX progression. All users go through a welcome and tier detection. Low/Mid tier users follow a straightforward tutorial path (tutorial1) then a system verification. High tier users get an extended tutorial (tutorial1_high) with additional demonstrations and an optional community integration step (if they are online, the app may fetch community tips or resources as part of onboarding). The community step is skipped if the user is offline or chooses not to engage, keeping core onboarding local-only. After tutorials, a verification of local AI functionality occurs; if any check fails, the user is guided through troubleshooting (like downloading missing models or adjusting settings) and re-verified. Upon success, onboarding completes.

Tutorial Definition & Progress Tracking

To manage the onboarding flow, WIRTHFORGE uses structured definitions for tutorials and a robust progress-tracking system. Each tutorial (FTUX and subsequent level tutorials) is defined in data so that it can be easily updated or localized without changing code. We propose a Tutorial Definition Schema to outline tutorial content and steps, and a Progress Tracking Schema to record what the user has done:

{
  "tutorialId": "level1_intro",
  "title": "Level 1: Lightning Basics",
  "description": "Learn how to send a prompt and see the lightning visualization.",
  "steps": [
    {
      "stepId": "send_first_prompt",
      "content": "Type your first question to the AI and press Send.",
      "hint": "Try asking: 'What is Wirthforge?'",
      "action": "user_input", 
      "expectedEvent": "first_response_received"
    },
    {
      "stepId": "observe_lightning",
      "content": "Observe the lightning bolt visual - it shows the AI responding in real time!",
      "hint": "Notice how the bolt flickers with the AI's thinking speed.",
      "action": "system_feedback",
      "expectedEvent": "lightning_visual_shown"
    },
    {
      "stepId": "adjust_setting",
      "content": "Try adjusting the energy slider to see how it affects the output.",
      "hint": "The slider changes AI 'creativity'.",
      "action": "user_adjust",
      "expectedEvent": "setting_changed"
    }
  ],
  "completionCriteria": "all_steps_completed",
  "reward": { "achievement": "Novice Forge Smith", "levelUnlocked": 2 }
}


Example: Tutorial Definition JSON. This schema defines a tutorial level1_intro with a title and description shown to the user. It consists of an ordered list of steps. Each step has: an stepId (unique within the tutorial), instructional content to display, perhaps a hint or tip, an action type (what the user or system does in that step), and an expectedEvent that indicates success. For instance, in the first step the action is user_input and the expected event is first_response_received (meaning the backend emitted an event that the first AI response arrived). This binds the tutorial logic to real system events: the tutorial step auto-completes when the event is detected, reinforcing that the user’s action had an effect. The final part defines completionCriteria (here simply that all steps are done) and any reward for finishing (in this case, awarding an achievement and unlocking Level 2).

Progress through tutorials is tracked locally in the user’s profile (likely in a simple JSON or database entry) so that the app knows what onboarding content a user has completed or skipped. Below is a conceptual Progress Tracking JSON structure for a user’s onboarding state:

{
  "userId": "local_user",
  "completedTutorials": [
    "level1_intro"
  ],
  "currentLevel": 2,
  "tutorialProgress": {
    "level1_intro": {
      "completed": true,
      "completedAt": "2025-08-18T13:45:30Z",
      "stepsCompleted": ["send_first_prompt", "observe_lightning", "adjust_setting"],
      "timeSpentSeconds": 120
    },
    "level2_intro": {
      "completed": false,
      "stepsCompleted": ["multi_model_start"],
      "timeSpentSeconds": 45
    }
  },
  "metrics": {
    "dropOffPoint": null,
    "totalTutorialTimeSeconds": 165
  }
}


Example: Progress Tracking JSON. In this example, the user has completed the level1_intro tutorial and is partway through level2_intro. The structure keeps a list of completedTutorials and also a detailed map tutorialProgress for each tutorial attempted. For each tutorial, we record whether it’s completed, the timestamp completedAt, which steps are done, and how much time the user spent. We also maintain some aggregate metrics like if a drop-off occurred (e.g., user quit at a certain step – here dropOffPoint is null meaning they haven’t abandoned any tutorial) and total time across tutorials. This data is saved locally (e.g., in a JSON file or local database) but could be exported or analyzed to improve onboarding. It’s crucial for features like resuming a half-finished tutorial, or for the app to decide whether to prompt the user to try a missed tutorial later. For example, if level2_intro remains incomplete in a session, the app might later show a subtle reminder like “Continue your Level 2 tutorial” when the user has downtime.

During the onboarding flow, as steps complete or if the user skips something, the Progress Tracker module updates these records. The design ensures that no progress is lost even if the app is closed mid-tutorial – upon reopening, the user can pick up where they left off, thanks to these saved states.

Here is a simplified code snippet for a hypothetical ProgressTracker class that manages these updates:

// Pseudocode for progress tracking logic
class ProgressTracker {
  private store: any;
  
  constructor(store: any) {
    this.store = store; // could be a file or database interface
  }

  markStepComplete(tutorialId: string, stepId: string): void {
    const tProg = this.store.get('tutorialProgress')[tutorialId] || { stepsCompleted: [] };
    if (!tProg.stepsCompleted.includes(stepId)) {
      tProg.stepsCompleted.push(stepId);
      tProg.timeSpentSeconds = (tProg.timeSpentSeconds || 0);
      // (Time tracking would be updated elsewhere continuously)
      this.store.update(`tutorialProgress.${tutorialId}`, tProg);
    }
  }

  markTutorialComplete(tutorialId: string): void {
    const now = new Date().toISOString();
    this.store.update(`tutorialProgress.${tutorialId}.completed`, true);
    this.store.update(`tutorialProgress.${tutorialId}.completedAt`, now);
    const completed = this.store.get('completedTutorials') || [];
    completed.push(tutorialId);
    this.store.set('completedTutorials', completed);
    // If this tutorial unlocks a new level or achievement, handle that:
    if(tutorialId === 'level1_intro') {
      this.store.set('currentLevel', 2);
      // possibly award achievement...
    }
  }

  recordDropOff(tutorialId: string, stepId: string): void {
    // If user quits at a certain step, log it
    this.store.set('metrics.dropOffPoint', { tutorial: tutorialId, step: stepId });
  }
}


Code: Progress Tracker Module. This pseudocode (in a TypeScript-like style) represents how the application might record tutorial progress. The ProgressTracker class interfaces with a store (which could be a simple in-memory object mapped to a JSON file or a wrapper to something like IndexedDB or localStorage). It has methods to mark steps and tutorials as complete. For example, when a step is finished, markStepComplete adds the step to the stepsCompleted list for that tutorial and updates time spent. When a tutorial is fully done, markTutorialComplete records the completion time and adds the tutorial to the global completedTutorials list. It also handles side effects like leveling up the user or granting achievements (in this case, completing level1_intro sets currentLevel to 2). Additionally, recordDropOff could be called if the user exits the tutorial early (perhaps by closing the app or skipping)—this logs where the user gave up, which is useful for analyzing problematic steps.

The combination of structured tutorial definitions and progress tracking ensures the onboarding flow is maintainable and data-driven. Designers can tweak the tutorial steps or content easily (via JSON) and see how users progress via the metrics. It also enables features like dynamic tips (if a user struggles at a step for too long, the app knows and can offer a hint) and re-engagement (the app knows if you skipped the Level 2 tutorial and can remind you later).

Educational Content Strategy

Onboarding in WIRTHFORGE doesn’t end after the initial tutorial; a robust educational content strategy keeps guiding users as they explore new features or encounter challenges. This strategy has multiple components to support continuous learning:

Contextual In-App Help & Tooltips: Throughout the WIRTHFORGE UI, contextual help is available in the form of tooltips, modals, or sidepanel tips that appear when the user seems to need guidance. For example, if the user hovers over the “Energy Meter” or appears idle after opening a feature panel, a tooltip might gently nudge: “This meter shows the current energy throughput of your AI. Higher means faster generation.” These tooltips are short and to the point, following the idea that brief, well-timed tips can educate without overwhelming. The design ensures these tips are non-intrusive (they either appear on hover, or as a small “?” icon the user can click for info). Once a user has seen a tip (or dismissed it), the system can mark it as seen so it doesn’t keep popping up. This contextual help is crucial for complex features that might not have been fully covered in the initial onboarding. It’s implemented via a library of help topics keyed to UI elements or events. We define a Help Content Schema to manage this:

{
  "helpTopics": [
    { 
      "id": "energy_meter",
      "trigger": "hover_energyMeterIcon",
      "content": "The Energy Meter shows tokens per second. It fills when the AI is generating output.",
      "context": "dashboard"
    },
    {
      "id": "no_response",
      "trigger": "model_no_response_5s",
      "content": "Waiting longer than expected? Ensure your AI model is running. You can try reducing the prompt length or check the model status.",
      "context": "chat"
    },
    {
      "id": "community_hint",
      "trigger": "user_completed_all_levels",
      "content": "Congratulations on mastering WIRTHFORGE! Join the community forum to share your creations and learn advanced tips.",
      "context": "modal"
    }
  ]
}


Example: Help Content JSON. In this structure, each help topic has an id, a trigger (which could be a user action or a system state that prompts the tip), the help content text, and a context indicating where or how to show it (e.g., in the dashboard UI as a tooltip, or in the chat interface, or as a modal dialog). For instance, energy_meter tip triggers when the user hovers over the energy meter icon; no_response triggers if no model response after 5 seconds, suggesting what to do; community_hint triggers once the user has completed all levels, encouraging them to engage further. These help topics are loaded locally (so they work offline) and can be expanded over time. The system also respects an “assist mode” toggle – if a user turns off tips, these won’t show automatically, but they remain accessible via a Help menu.

The application’s front-end listens for the specified triggers and displays the corresponding content. We can imagine a simple implementation of showing a tooltip:

// Simplified example of showing a tooltip based on trigger
const helpContent = loadHelpContent();  // loads the JSON above

function onUserEvent(eventName: string) {
  const topic = helpContent.helpTopics.find(h => h.trigger === eventName);
  if (topic) {
    displayTooltip(topic.content, topic.context);
  }
}

// E.g., user hovers energyMeterIcon -> onUserEvent("hover_energyMeterIcon") -> displays tooltip


In practice, displayTooltip would position a small UI element near the relevant control or open a small modal. Each tooltip is written in clear, concise language and often tied to visuals (some may even include a tiny static image or icon if needed for clarity). All such content is stored locally (possibly as JSON or Markdown) so that it’s accessible offline and fast to retrieve.

Integrated Video Tutorials: Some users learn better visually or might skip reading text. To accommodate different learning styles, WIRTHFORGE includes short video tutorials for key features. These videos (10-60 seconds each) demonstrate tasks like “How to connect a second AI model (Level 2)” or “How to interpret the interference pattern.” Importantly, given our local-first constraint, these videos need to be available offline. We plan to leverage an AI video generation service (OpenAI’s Sora or similar) to create these tutorials efficiently. For example, using Sora, we can generate an explainer video by providing a script or prompt. The produced video file can then be bundled with the app or made downloadable on demand. In-app, a user might see a “Play Tutorial Video” button in the help panel for a topic. Clicking it either plays the bundled video or, if not present and the user is online, fetches it from a secure source or generates it.

Prompt-based Video Generation: We can automate video content updates by storing prompts for Sora rather than the video itself. For instance, consider a prompt template: “Create a 30-second tutorial video explaining {feature} in WIRTHFORGE. Use simple visuals and step-by-step instructions.” When we need a new or updated video (say after UI changes), we feed an updated prompt to Sora and get a new video without a full filming process. Below is an example of how the app might request a video from Sora’s API (pseudo-code):

const soraPrompt = "Create a 20-second video tutorial demonstrating how to enable and visualize Level 2 Streams in WIRTHFORGE.";
SoraAPI.generateVideo({ prompt: soraPrompt, resolution: "720p" })
  .then(videoFile => {
     saveLocal("tutorial_level2.mp4", videoFile);
     showVideoPlayer(videoFile);
  })
  .catch(err => console.error("Video generation failed", err));


Code: Sora AI Video Generation Integration. This snippet illustrates using a fictional SoraAPI.generateVideo call. We provide a text prompt describing the desired content (here a Level 2 Streams tutorial). The promise returns a video file (perhaps in Blob or base64 form), which we then save locally and play in the app’s video player component. In practice, such generation might happen ahead of time (during app build or update) rather than on the fly for each user, to ensure the video is ready when needed. However, the integration is in place for future content creation or user-generated tutorial content (e.g., community requests a tutorial on a new trick—developers can quickly generate it via AI and include in the next update). All videos include captions or text overlays for accessibility, and transcripts can be provided in the help documentation.

The video tutorials serve as a visual supplement. For example, after the user completes Level 1, a prompt might say “Watch how Level 2 works” with a play button. The video then shows multiple AI responses and how the interface displays them, reinforcing what the upcoming interactive tutorial will cover. This prepares and excites the user for the next steps. Since not everyone will click videos, all essential info from them is also available in text form (to remain WCAG compliant and usable offline always). But videos add a rich, engaging layer to our user education, especially for complex interactions that are easier to show than describe.

Interactive Learning Modules: Beyond passive content (text or videos), WIRTHFORGE could include interactive sandboxes or “labs” for users to try things out safely. For instance, an Energy Tuner Module might let the user play with parameters (like adjusting a slider controlling token frequency) and see in real-time how it affects a dummy model’s output, all explained with on-screen guidance. These modules differ from the core app functionality in that they are explicitly for learning and may use simulated data or guided inputs to teach a concept. They can be accessed from a “Learning Center” in the UI. One example could be a “Visualize Interference” module: it spawns two AI processes with a predefined simple task so the user can manipulate their inputs and directly see interference patterns, with explanatory notes appearing as certain thresholds are crossed (“See how the lines brighten? That’s the disagreement increasing!”). The design of these modules will take cues from educational software – providing a goal, letting the user experiment freely, but offering guidance and resetting easily if the user goes off-track. The modules are all local and do not require internet (though they reuse the same local AI engines and visualization code in a controlled manner). They complement the main experience by allowing practice and deeper exploration without affecting the user’s main data or sessions.

FAQ and Troubleshooting Guides: The application includes a comprehensive FAQ section accessible at any time (likely under a Help menu). This is essentially a mini-knowledgebase covering common questions and problems. For example: “Q: The lightning bolt stopped moving, what do I do? A: Check if your AI model might have paused or if the system is under heavy load…”, or “Q: Can I use my own AI model? A: Yes – see the Setup Models section under Settings…”. These FAQs are written in advance and stored locally (in markdown or JSON). They can be searched via a search bar in the help panel, making it quick for users to find answers. The troubleshooting guides provide step-by-step solutions for technical issues (like connection issues between front-end and back-end, performance tweaks if the UI is laggy, etc.), often linking back to relevant settings or diagnostics within the app. For example, a troubleshooting entry for “No AI response” might include a button to open the local backend logs or a quick re-run of the model loading procedure. By integrating these into the app, we reduce reliance on external documentation or support – the user can self-serve most answers even while offline.

Community Learning Resources: While WIRTHFORGE is a local-first platform, the community of users is a powerful resource for learning advanced usage and sharing creative ideas. The app will encourage community engagement in a way that augments the local experience without making it cloud-dependent. For instance, the help section might have a page “Community Highlights” that, if the user is online (opt-in), fetches the latest tips or tutorials submitted by other users or moderators. This could be as simple as an RSS feed or a JSON from the official WIRTHFORGE site that’s periodically updated with new “Did you know?” tips or links to community forum threads (perhaps pre-filtered to avoid any need for user data sharing). On the flip side, if the user is offline or declines external connections, the app can still show a static set of community Q&A that were packaged with the app release (curated from the forum up to that point). For example, a static list of “Top 10 questions from the community” can be included so users don’t miss out on that collective wisdom. Another feature is a community tutorial gallery – users sometimes create their own tutorials or example configurations. WIRTHFORGE’s learning center could have a section listing such community-contributed tutorials (with credit). Clicking one might open a local markdown if bundled, or if online, prompt to visit the community site or download the tutorial package. To keep everything secure and optional, these community features are clearly marked and require user action to fetch (no silent external calls). This satisfies the “web-engaged” aspect – when the user chooses, they engage with the web community through the interface, but their core usage isn’t dependent on it. Over time, as the user base grows, this could evolve into an in-app plugin or content system where advanced users share “lesson packs” that others can import, all mediated through the local app with user consent.

To summarize, the educational content strategy ensures that users have a supportive learning environment at all times. Whether it’s a quick tooltip while they’re trying a feature, an illustrative video when they’re curious, a safe sandbox to tinker in, or the wisdom of the community at their fingertips – WIRTHFORGE provides multiple avenues for users to deepen their understanding of the platform. This is key for user retention: as users progress to higher levels and the features become more powerful, these educational aids will help them master the complexity rather than be scared off by it.

The following Mermaid diagram provides a conceptual overview of progressive educational paths tied to user levels, showing how onboarding, in-app help, and community learning interconnect:

graph TB
    subgraph "Progressive Learning Path"
        L1[Level 1 Intro Tutorial\n(Basic features)] --> L2[Level 2 Tutorial\n(Multi-model Streams)]
        L2 --> L3[Level 3 Tutorial\n(Structures & Pipeline)]
        L3 --> L4[Level 4 Guide\n(Adaptive Fields)]
        L4 --> L5[Level 5 Guide\n(Resonance Orchestration)]
    end
    L1 --> faq1{{"Need help?"}}:::help
    L2 --> faq2{{"Need help?"}}:::help
    L3 --> faq3{{"Need help?"}}:::help
    L4 --> faq4{{"Need help?"}}:::help
    L5 --> faq5{{"Community Tips"}}:::community

    classDef help fill:#eef,stroke:#888,stroke-width:1px;
    classDef community fill:#ffe,stroke:#888,stroke-width:1px;

    faq1 --> A1[[FAQ: Understanding Lightning Level]]
    faq2 --> A2[[Tooltip: Interference Pattern Hint]]
    faq3 --> A3[[Video: Building Structures Tutorial]]
    faq4 --> A4[[Interactive Lab: Field Tuning]]
    faq5 --> C1[[Online: Resonance Forum Thread]]


Figure: Learning Path Progression. This diagram shows the chain of tutorials from Level 1 through Level 5 (center boxes). At each level, if the user needs assistance or more info, there are context-specific help options (represented by the question mark diamonds). For example, at Level 1 (Lightning) there might be an FAQ entry or basic help article; at Level 2, a tooltip might be available to explain interference if the user seems confused; at Level 3, a video tutorial can demonstrate building a structure; at Level 4, an interactive lab might let the user practice field adjustments; and by Level 5, users are pointed to community resources for advanced orchestration tips (since at the highest level, the community can provide creative use cases beyond official docs). The colored nodes indicate different forms of help (blue for built-in help, yellow for community/online). This illustrates a blended learning approach: core guided content first, then self-service help, then community knowledge.

User Testing & Iteration

Designing the onboarding and education system is only half the battle – we must ensure it truly works for users. That means continually testing it, measuring its effectiveness, and refining it. This section describes how we will validate the onboarding experience and evolve it over time:

Usability Testing Protocols: Before releasing onboarding to real users, we conduct thorough usability tests. This involves recruiting a range of participants (ideally both tech-savvy and non-technical users, to cover our target audience spectrum) and having them go through the FTUX and subsequent tutorials. We observe their interactions: Do they understand what to do at each step? Do they get stuck or confused anywhere? Are there steps where they appear bored or impatient? We’ll use think-aloud protocol where possible (users verbalize their thoughts) to catch confusing instructions or terminology. Additionally, internal testers will deliberately perform “wrong” actions to see how forgiving and guiding the system is (e.g., typing gibberish instead of the suggested prompt – does the tutorial handle that gracefully?). Any friction points discovered will be logged as issues to fix (like adding an extra hint, or simplifying a step). Usability testing will also cover the help system: can users find the FAQ when they need it? Is the tooltip timing right or does it annoy them? Because WIRTHFORGE’s value proposition can be novel (energy metaphors, etc.), we especially watch if first-time users “get it” – do their eyes light up at the lightning bolt? If not, perhaps the tutorial messaging needs more punch. These tests will be iterative: test with a small group, improve onboarding, then test again with new users, and so on until we’re confident in the flow.

Learning Effectiveness Measurement: We define certain learning outcomes that the onboarding should achieve, and measure whether users are meeting them. For example, one outcome is “User understands how to trigger an AI response and interpret the lightning visualization.” We can measure this by seeing if, after the tutorial, the user can on their own initiate a new prompt without guidance and correctly note that faster lightning flicker = faster response (perhaps by asking them a question in a post-tutorial survey or having a step where they predict something about the next output). Another outcome: “User knows where to find help if they get stuck.” To check this, the app might intentionally simulate a small hiccup later (like an AI delay) and see if the user clicks the help icon. These are subtle tests baked into the first hours of usage. We will also use telemetry (with user consent) to track certain events that infer learning: for instance, if a user after onboarding never touches a certain feature that was introduced, maybe they didn’t grasp it – or maybe they don’t need it yet. Conversely, if we see users effectively using advanced features without additional prompts, that’s a sign the education worked. We might even include a brief quiz at the end of onboarding (optional, fun, possibly framed as a “Certification”) that asks a few questions like “What does the lightning bolt represent?” or “How would you add a second model?” and give a score or badge for correct answers. This not only reinforces learning but gives us aggregate data on what concepts might need better explanation if many get answers wrong. All these measurements feed back into improving content.

Drop-off Analysis: One of the critical metrics for onboarding is completion rate – what percentage of users finish the tutorial? And for those who don’t, where do they drop off? Using the progress tracking system described earlier, we can analyze the points at which users tend to abandon onboarding. For example, if we see a significant number of users quit during the “adjust setting” step in Level 1, that’s a red flag – maybe that step is too early, not clearly explained, or their device struggled at that moment. We will instrument the app to log an event whenever a user exits the onboarding early or skips a tutorial, including the last step they saw. These logs (with user permission) can be compiled anonymously. Drop-off analysis might reveal patterns like: “20% of users on low-end machines quit during the visualization demo (perhaps their performance was lagging)”, which would prompt us to adjust the content for that segment (maybe skip the heavy visualization on low tier and show a static image instead, or reassure the user to wait). Another key drop-off point might be the transition to Level 2 tutorial – perhaps some users don’t engage with the second tutorial at all after finishing level 1. In that case, maybe we need to improve how we prompt them or highlight the benefits of continuing the guided journey. We’ll treat drop-off data as a continuous improvement loop: each update of the software will aim to reduce drop-off rates by addressing the points of friction. Ideally, we’d like a vast majority of users to complete at least the core FTUX (Level 1 tutorial) because that correlates strongly with activation and retention.

A/B Testing for Onboarding Variants: As we refine onboarding, there may be multiple valid approaches for certain elements – and we might not be sure which is best without experimentation. For instance, should the tutorial be fully interactive from the start, or should it show a quick video first and then let the user try? Should the initial welcome be a wall of text explaining concepts, or just a friendly “Let’s get started!” with almost no preamble? To answer such questions, we’ll use A/B testing (in a privacy-respecting way). We can have two (or more) variants of the onboarding flow and randomly assign new users to one. For example, Variant A might have a detailed explanation before the first prompt, while Variant B throws users directly into action with minimal text. We then compare metrics: completion rates, time taken, number of help requests, and even longer-term retention or usage patterns (do users who got variant A stick around longer or use features more than variant B?). Since WIRTHFORGE is offline-first, implementing A/B tests is tricky – we can’t rely on a server to assign variants dynamically. Instead, variants might be packaged into different app releases or toggled based on a hash of a user’s ID for pseudo-randomness. Alternatively, we introduce a subtle variation logic in the app that doesn’t need external input. For example, if the user’s installation timestamp is even, use one message, if odd use another (this approximates random assignment). We will also keep the A/B test logic entirely client-side. Outcome data for A/B could be collected when the user eventually connects online (if they choose to) or through voluntary feedback surveys. Over time, these tests will guide us to the most effective onboarding design. Once a clear winner is found (say variant B yields much better engagement), we’ll converge on that approach for all users.

Continuous Feedback and Updates: Beyond structured tests, we’ll gather qualitative feedback from early adopters. Perhaps an in-app prompt after a week of use asks “How was your onboarding experience? Anything confusing or frustrating?” and gives users a chance to respond (with their data never leaving the device unless they choose to submit it via email or a form). If common suggestions or pain points surface (“The tutorial was too long”, “I didn’t understand the energy metaphor until later”), we’ll incorporate that. Because WIRTHFORGE is a living project, we expect to iterate on onboarding frequently, especially as new features are added. Each new feature will come with its own mini-onboarding or help, and those need testing too. We will schedule periodic reviews (perhaps every minor release) of the onboarding flow in light of new content: ensuring the flow is up-to-date and still cohesive. For example, if we introduce a new Level 3 capability, we might need to tweak the Level 2 tutorial to better lead into it, or add a bridging explanation.

All of these efforts are aimed at maintaining a high Activation Rate (the percentage of users who go from install to being active, satisfied users). Onboarding is the funnel that leads into active usage, so we treat any leaks in that funnel with high priority. By measuring and iterating, we make the funnel as smooth as possible.

Finally, below is a Mermaid sequence diagram illustrating how the system might capture telemetry during onboarding for analysis (while keeping user privacy in mind):

sequenceDiagram
    participant U as User
    participant UI as Onboarding UI
    participant PT as ProgressTracker
    participant AN as Analytics (local)
    participant DB as Local DB

    U ->> UI: Follows Tutorial Steps
    UI ->> PT: stepCompleted(stepId)
    PT ->> DB: Save progress (stepId, timestamp)
    PT ->> UI: Update UI (next hint or complete)
    UI ->> AN: logEvent("step_completed", stepId)
    %% If user drops off at some point
    U ->> UI: Closes or Skips Tutorial
    UI ->> PT: recordDropOff(currentStep)
    PT ->> DB: Save dropOff (tutorialId, stepId)
    UI ->> AN: logEvent("tutorial_abandoned", tutorialId, stepId)
    %% Later or periodically
    AN ->> DB: Read aggregated metrics
    AN ->> UI: Flag potential issue (e.g., many dropOff at stepX)
    UI ->> U: (Dev Mode) Display A/B variant or debugging info [Optional]


Figure: Onboarding Telemetry Sequence. In this diagram, as the user (U) goes through the UI tutorial, the ProgressTracker (PT) saves each completed step to the local database (DB) and also informs a local Analytics module (AN) which logs events like "step_completed". If the user quits or skips, the PT records a drop-off point, and an event "tutorial_abandoned" is logged with the context. The analytics data can be examined later to find patterns (this might be done when the user opts to share feedback or when they connect and consent to upload anonymous metrics). In development or A/B testing mode, the UI might flag which variant is active or other debug info, but normal users wouldn’t see that. All of this happens locally unless the user agrees to share, maintaining privacy by default. These instruments help the team identify where to improve the onboarding flow.

Test Plans and Automation

To ensure the onboarding and education system works as intended and continues to work with future changes, we will create automated test suites. Here we outline the main areas these tests will cover:

1. Onboarding Flow Completion Tests: Simulate a fresh user experience and verify the flow proceeds correctly from start to finish under various conditions (low-tier vs high-tier, etc.). For example:

// OnboardingFlow.spec.ts
describe('First-Time User Onboarding Flow', () => {
  it('should show welcome and complete Level 1 tutorial successfully', async () => {
    const app = launchAppFresh({ tier: "mid" });  // simulate mid-tier device
    expect(app.screen).toContain("Welcome to WIRTHFORGE");
    app.click("StartButton");
    // Simulate entering a prompt and receiving AI response
    app.enterText("promptInput", "Hello");
    await app.waitForEvent("first_response_received", 5000);
    // Now the lightning visualization should be shown
    expect(app.ui.hasVisual("lightning_bolt")).toBe(true);
    // Complete subsequent steps
    app.click("NextTipButton");  // e.g., proceed after observing lightning
    app.adjust("energySlider", 0.8);
    await app.waitForEvent("setting_changed", 1000);
    // At this point tutorial should complete
    expect(app.screen).toContain("Onboarding Complete");
    // Verify state
    const progress = app.progressTracker.getTutorialProgress("level1_intro");
    expect(progress.completed).toBe(true);
    expect(app.userData.currentLevel).toBe(2);
  });

  it('should adapt flow for low-tier (skip heavy visuals) and still complete', async () => {
    const app = launchAppFresh({ tier: "low" });
    app.click("StartButton");
    app.enterText("promptInput", "Test");
    await app.waitForEvent("first_response_received", 7000);
    // On low tier, expect perhaps a simplified visualization or a message
    expect(app.ui.hasVisual("lightning_bolt")).toBe(true); 
    // (the bolt might be simplified but still present)
    // ... complete steps similarly ...
    expect(app.screen).toContain("Onboarding Complete");
    // Also check that performance mode is noted
    expect(app.userSettings.graphicsMode).toBe("basic");
  });

  it('should handle tutorial drop-off and allow resumption', async () => {
    const app = launchAppFresh();
    app.click("StartButton");
    app.enterText("promptInput", "Hi");
    await app.waitForEvent("first_response_received", 5000);
    // Simulate user closing the app mid-tutorial
    app.terminate();
    // Relaunch app
    const app2 = relaunchApp();
    // It should detect incomplete tutorial and prompt resume
    expect(app2.screen).toContain("Resume where you left off");
    app2.click("ResumeButton");
    // Continue and complete
    // ...
    expect(app2.progressTracker.get('metrics.dropOffPoint')).toBeNull();
  });
});


Test Suite: Onboarding Flow. These test cases (written in a Jest/Cypress-like syntax) automate a user going through the onboarding. The first test verifies the normal path on a mid-tier device: the welcome appears, the user can go through all steps, and at the end “Onboarding Complete” is shown and the user’s level is set to 2. The second test simulates a low-tier scenario where we expect the flow to adjust (maybe waiting a bit longer for responses and using simpler graphics). The third test simulates an interruption: the user quits after the first step, and upon relaunch the app offers to resume; after resumption, the test ensures the tutorial can complete and that the drop-off metric was cleared. These automated tests help catch regressions (e.g., a future code change accidentally not saving progress, or the resume feature breaking).

2. Learning Outcomes & Content Tests: After onboarding, does the user have the intended access and knowledge? We can’t directly test a human’s knowledge via code, but we test proxies, like feature unlocks and availability of help content:

// TutorialProgress.spec.ts
describe('Post-Onboarding State & Content Availability', () => {
  it('should unlock features and tutorials according to level progression', () => {
    const app = simulateCompletedTutorials(["level1_intro"]);
    // User is now level 2
    expect(app.userData.currentLevel).toBe(2);
    // Level 2 features (like multi-model UI) should now be enabled
    expect(app.ui.element("addSecondModelButton").enabled).toBe(true);
    // Level 2 tutorial prompt should be available
    expect(app.ui.modal("Level 2 Tutorial")).toBeDefined();
  });

  it('should have all help topics accessible offline', () => {
    const topics = app.helpSystem.getAllTopics();
    topics.forEach(topic => {
      expect(topic.content.length).toBeGreaterThan(0);
    });
    // Simulate offline mode
    app.network.setOffline(true);
    // Ensure help still works
    expect(app.helpSystem.search("model")).toContain("How to add a model");
    // Ensure no help topic triggers an online fetch
    const onlineTopics = topics.filter(t => t.requiresOnline);
    expect(onlineTopics.length).toBe(0);
  });

  it('video tutorial fallback if offline should show message', () => {
    app.network.setOffline(true);
    app.ui.click("PlayTutorialVideo_Level3");
    expect(app.ui.alertMessage).toBe("Video unavailable offline. Showing text guide instead.");
    // The app should then open the text guide as fallback
    expect(app.ui.screen).toContain("Level 3 Tutorial (Text)");
  });
});


Test Suite: Learning Content. These tests ensure that after completing onboarding, the right things happen: new features unlock (level gating is working), and the help content is in place. One test checks that all help topics have content and that none are marked as requiring internet (so offline is fine). Another simulates clicking a video tutorial while offline and expects the app to handle it gracefully (perhaps warning and showing a text guide instead). Essentially, we are verifying the robustness of the educational content system in various scenarios.

3. Usability Metrics & A/B Test Logging: We also write tests to verify that our instrumentation for analytics is working (without actually sending data externally unless allowed):

// UsabilityMetrics.spec.ts
describe('Onboarding Analytics and Variants', () => {
  it('should log events for each tutorial step and completion', () => {
    const tracker = app.analytics.getEventLog();
    app.simulateFullTutorialCompletion();
    // After simulation, check log
    const events = tracker.getEvents();
    expect(events).toContainEqual(expect.objectContaining({ name: "step_completed", detail: "send_first_prompt" }));
    expect(events).toContainEqual(expect.objectContaining({ name: "tutorial_completed", tutorial: "level1_intro" }));
    // Ensure no personally identifiable info is in log
    events.forEach(e => {
      expect(e).not.toHaveProperty("userId");
      expect(e).not.toHaveProperty("promptText");
    });
  });

  it('should assign an onboarding variant deterministically and log it', () => {
    // Simulate two different users
    const appA = launchAppFresh({ userId: "userA" });
    const appB = launchAppFresh({ userId: "userB" });
    const variantA = appA.onboarding.variantId;
    const variantB = appB.onboarding.variantId;
    expect(variantA).toBeDefined();
    expect(variantB).toBeDefined();
    // Possibly they might be the same or different depending on assignment scheme,
    // but both should be valid values (e.g., "A" or "B")
    expect(["A","B"]).toContain(variantA);
    expect(["A","B"]).toContain(variantB);
    // Each app should log which variant it used
    const logA = appA.analytics.getEventLog().getEvents();
    expect(logA).toContainEqual(expect.objectContaining({ name: "onboarding_variant", value: variantA }));
  });

  it('should safely store drop-off analytics for later analysis', () => {
    const app = launchAppFresh();
    // Simulate drop-off at second step
    app.click("StartButton");
    app.enterText("promptInput", "Test");
    app.closeApp(); // user quits early
    // Now check stored data
    const stats = app.progressTracker.get('metrics.dropOffPoint');
    expect(stats.tutorial).toBe("level1_intro");
    expect(stats.step).toBe("observe_lightning");
    // Also ensure it increments a local counter
    expect(app.analytics.getMetric("abandonCount.level1_intro")).toBe(1);
  });
});


Test Suite: Analytics & A/B. Here we verify that events are logged for step completion and tutorial completion, and that these logs do not include sensitive info (complying with privacy). We also test that the A/B variant selection works and is recorded. Finally, we ensure that drop-off data (like where the user quit) is stored locally for later analysis and that some counters (like an abandon count) update properly. These tests ensure our instrumentation doesn’t break and continues to collect the data we need for iteration.

Through these automated tests and ongoing analytics, the onboarding and user education experience will remain reliable, effective, and continuously improving. Each WIRTHFORGE release will refine this crucial first-touch experience, paving the way for users to fully embrace the platform’s power. By combining careful design with rigorous testing and iteration, we aim for an onboarding that feels almost invisible – it naturally ushers the user into proficiency without frustration, setting the stage for long-term engagement and success with WIRTHFORGE.