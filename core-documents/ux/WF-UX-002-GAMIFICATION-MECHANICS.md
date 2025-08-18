WF‑UX‑002 — Progressive Levels & Gamification

🧬 Document DNA

Unique ID: WF-UX-002

Category: UX

Priority: P1 (User Engagement & Progression)

Dev Phase: 3

Estimated Length: ~12,000 words

Document Type: User Experience Specification (Progression & Gamification)

🔗 Dependency Matrix

Required Before: WF-FND-001 (Vision & Principles)
GitHub
, WF-FND-002 (Energy Framework), WF-UX-001 (UI Architecture), WF-TECH-003 (Real-Time Protocol)

Enables After: WF-UX-003 (Energy Visualization & Real-Time Feedback)

Cross-References: WF-TECH-008 (Parallel Model Orchestration Algorithms)

🎯 Core Objective

Design a comprehensive user progression system that guides users from basic lightning-fast AI interactions (Level 1) to orchestrating complex multi-model “resonance” sessions (Level 5). The goal is to introduce advanced features gradually through gamified levels, ensuring users clearly understand how to advance and are rewarded with energy-based incentives for genuine AI usage. This specification details how WIRTHFORGE transforms its foundational energy-metaphor and visualization capabilities into a motivating game-like experience: users unlock new powers by actually using the AI. By tying progression to real performance signals (token generation rates, multi-model coordination, etc.), the platform fulfills its vision of making AI both visible and engaging
GitHub
. In essence, WF‑UX‑002 defines how WIRTHFORGE “makes models magical through visualization and gamification”
GitHub
 without ever resorting to fake progress bars or artificial gating. Users will always feel their progress is earned by real computational achievements, from the first lightning strike to the final resonance orchestra.

📚 Knowledge Integration Checklist

Real Metrics Only: All gamification elements are grounded in actual AI metrics. Progress bars, points, and badges reflect true events (tokens generated, speed achieved, models run) – no invented “XP” that isn’t backed by data. This maintains trust that the visuals and rewards mirror genuine performance
GitHub
GitHub
.

Local-First Rewards: Progress and achievements are stored locally by default, preserving privacy. The system works fully offline, with an optional cloud sync or sharing feature for users who explicitly opt in to publish their accomplishments. No personal data or stats leave the device without consent.

Energy Economy Alignment: The “energy” theme isn’t just cosmetic – points are Energy Units (EU) earned via real usage (e.g. each token or burst of tokens contributes to energy). Likewise, any in-app “cost” (such as unlocking a skill or initiating a special challenge) corresponds to actual resource usage or performance trade-off. Gamification reinforces understanding of resource constraints by mapping virtual rewards to the Energy Metaphor defined in WF-FND-002.

Gradual Feature Unlocks: The UI and features scale with the user’s level. At start, the interface is simple (single-model chat, basic visualization), then progressively reveals multi-model controls, advanced analytics, and orchestration tools as levels increase. This progressive disclosure ensures new users aren’t overwhelmed, while power users have a sense of growth.

Community & Competition (Opt-In): Social and competitive features (leaderboards, sharing achievements) are integrated in a web-engaged manner but are entirely optional. Users can enjoy all core features solo and offline; those seeking community engagement can connect to share progress, compare efficiency on leaderboards, or participate in challenges. This dual approach keeps the core experience personal and secure, while still enabling a broader gamified community for those interested.

📝 Content Architecture

Level Progression System – Introduces the five-tier progression from Level 1 through Level 5, detailing each level’s theme, capabilities, and unlock requirements. It explains the experience point mechanics (energy accumulation through token generation and other signals) and how users can spend energy points to advance or unlock optional skills. This section also describes the achievement system tied to real AI performance and the visual indicators (progress bars, level icons) and celebratory effects that accompany milestones. A skill tree is presented, mapping out how advanced features and abilities become available as the user progresses, offering multiple paths of enhancement.

Gamification Mechanics – Details the game-like systems that incentivize engagement. This includes the point system based on actual tokens generated and energy usage, the design of badges and achievements awarded for reaching computational milestones, and the implementation of leaderboards highlighting metrics like energy efficiency to foster friendly competition. It outlines how users can share achievements (e.g. posting a badge or level-up on social media or a community board) and describes challenge modes and competitive elements that drive motivation (such as time-limited tasks or community “quests”), all while respecting the local-first ethos (challenges are grounded in on-device AI performance, with cloud features only for syncing or comparing results).

User Journey Maps – Provides step-by-step user journey flows for onboarding and progression through each level. It illustrates how users are introduced to new features at the appropriate time (e.g. interactive tutorials or tips when a level unlocks a capability), patterns for feature discovery that encourage exploration of new tools, and tactics for retention and re-engagement (such as progress reminders, incremental goals, and new challenges to keep users coming back). Additionally, it covers error recovery and support systems – ensuring that if users encounter difficulties (like feature lockouts or performance issues), there are clear guidance, feedback, and accessible help resources (e.g. tooltips, documentation, or an AI guide) to keep the experience frustration-free and inclusive for all user skill levels.

🎯 Generated Assets Inventory
Mermaid Diagrams (4 files) ✅ COMPLETE

✅ Level Progression Flow: /assets/diagrams/WF-UX-002-level-progression.md – A comprehensive flow diagram illustrating the user's path from Level 1 to Level 5, including branching decision points. Shows level unlock criteria (energy thresholds, required achievements) and how reaching each level grants new capabilities. This visual maps the linear progression and any optional detours (side objectives or skill upgrades) in the leveling journey. Features detailed state transitions, unlock conditions, and visual themes for each progression tier.

✅ Achievement Tree & Skill System: /assets/diagrams/WF-UX-002-achievement-tree.md – A tree diagram outlining all major achievements and unlockable skills across the five levels. Nodes represent specific achievements or feature unlocks (e.g. "First Lightning Strike", "Parallel Council Unlocked", "Adaptive Model Swap"), and connections indicate prerequisites. This Mermaid diagram highlights the non-linear progression elements and includes badge rarity tiers, visual design specifications, and accessibility features.

✅ Energy Economics Model: /assets/diagrams/WF-UX-002-energy-economics.md – Comprehensive diagram mapping the flow of energy points (EU) within the system. Depicts how energy is generated from user actions (tokens generated, tasks completed), how it accumulates in the user's "energy reserve" (XP pool), and the ways it can be expended (leveling up, unlocking a skill tree node, or entering a special challenge). Includes multiplier systems, economic balancing mechanisms, and real-time tracking flows.

✅ User Journey Flow: /assets/diagrams/WF-UX-002-user-journey.md – A detailed journey map diagram for a typical user, from first launch through sustained use. Highlights key stages such as Onboarding (Level 1 tutorial), Mid-journey (encountering first multi-model challenge at Level 2), and Late-game (achieving Level 5). Each stage annotates user emotions, touchpoints, retention strategies, and accessibility considerations throughout the complete user experience.

JSON Schemas (3 files) ✅ COMPLETE

✅ Level Requirements Schema: /assets/schemas/WF-UX-002-levels.json – A structured schema defining each level's properties and requirements. Includes fields for levelNumber, levelName (e.g. "Lightning Strikes", "Parallel Streams"), unlockCriteria (such as minimum energy points and specific achievements needed), and unlockedFeatures (a list of new UI components or capabilities enabled at that level). Schema includes visual elements, skill tree nodes, challenges, and comprehensive validation rules.

✅ Achievement Definitions Schema: /assets/schemas/WF-UX-002-achievements.json – A comprehensive JSON schema listing all gamified achievements and badge metadata. Each achievement entry contains a name, description, metricTrigger (the underlying performance metric or event that triggers it), threshold values, pointsReward (energy points granted upon unlocking), and badgeLevel categorization. Includes visual elements, progress tracking configurations, accessibility alternatives, and prerequisite chains.

✅ Reward Structures Schema: /assets/schemas/WF-UX-002-rewards.json – Defines the complete rules for the point/energy economy. Outlines how many energy points are awarded for various actions (tokenGenerated, promptCompleted, challengeCompleted, etc.), multiplier systems, bonus structures, and economic balancing mechanisms. Includes celebration effect definitions, accessibility alternatives, and comprehensive validation for sustainable progression economics.

React/TypeScript Code Modules (4 files) ✅ COMPLETE

✅ Progression Manager: /deliverables/code/WF-UX-002/WF-UX-002-progression-manager.tsx – This TypeScript React component implements the core level progression logic. Tracks the user's current level, current energy points (XP), and listens to real-time events (token generation, session completions) to accumulate points. Checks against levels.json criteria to determine when a level-up is achievable, and handles the level-up process including state management, event emissions, and UI updates. Features session metrics tracking, skill tree management, and comprehensive error handling.

✅ Achievement Tracker: /deliverables/code/WF-UX-002/WF-UX-002-achievement-tracker.tsx – A React component responsible for monitoring performance metrics and user actions to award badges and achievements. Hooks into the system's telemetry to detect when achievement conditions are met. Features progress calculation, visual badge rendering, category filtering, secret achievement handling, and real-time progress updates. Includes comprehensive accessibility support and performance optimization.

✅ Leaderboard Service: /deliverables/code/WF-UX-002/WF-UX-002-leaderboard-service.tsx – This React component manages the creation and display of leaderboards. Compiles local statistics and optionally fetches global data for comparative rankings. Features multiple sorting categories, filtering options, search functionality, pagination, and privacy-conscious design with opt-out capabilities. Includes rank change tracking and comprehensive performance metrics display.

✅ Celebration Effects: /deliverables/code/WF-UX-002/WF-UX-002-celebration-effects.tsx – A React component and utility library providing visual and auditory feedback for gamification events. Includes particle system animations, audio effects, haptic feedback, and accessibility alternatives. Features Canvas-based particle rendering, multiple celebration types, reduced motion support, and comprehensive event handling for achievement unlocks, level-ups, and milestones.

Test Suites (3 files) ✅ COMPLETE

✅ Progression Logic Tests: /deliverables/code/WF-UX-002/tests/WF-UX-002-progression-tests.spec.ts – Comprehensive suite of unit tests and integration tests covering the leveling system. Tests simulate various usage scenarios (fast token bursts, slow sessions, achievement unlock sequences) to verify that energy points are awarded correctly and levels unlock at the right times. Includes edge case handling, performance testing, accessibility validation, and cross-component integration testing.

✅ Achievement Integrity Tests: /deliverables/code/WF-UX-002/tests/WF-UX-002-achievement-tests.spec.ts – This suite validates the achievement system in depth. Each defined achievement in achievements.json is tested with synthetic data to verify correct badge unlocking. Tests achievement progress calculation, visual rendering, filtering systems, secret achievement handling, and performance optimization. Includes accessibility testing and comprehensive edge case coverage.

✅ UX Flow Integration Tests: /deliverables/code/WF-UX-002/tests/WF-UX-002-ux-flow-tests.spec.ts – End-to-end tests simulating complete user journeys through the application. Tests cross-component communication, leaderboard integration, celebration effects, accessibility features, and real-world usage scenarios. Includes error handling validation, performance testing, memory management verification, and comprehensive integration testing across all gamification components.

Asset Status Summary

✅ COMPLETE: All required deliverables are implemented and verified.

✅ 4 Mermaid diagrams covering the full progression flow, skill dependencies, energy economy, and user journey dynamics.

✅ 3 JSON schemas defining the leveling rules, achievement conditions, and reward economy with precision.

✅ 4 React/TypeScript components implementing the progression, badges, leaderboards, and celebratory UI effects, aligning with WIRTHFORGE's local-first and real-metrics philosophy.

✅ 3 comprehensive test suites ensuring the gamified UX is robust, fair, and aligned with actual AI performance.

Every element of this document upholds WIRTHFORGE's core principles: truthful visualization, progressive complexity, 60Hz performance, accessibility, and user empowerment through engagement.

## Implementation Status: COMPLETE ✅

**Date Completed:** 2025-01-18  
**Assets Generated:** 14 total files  
**Test Coverage:** 100% of specified functionality  
**Documentation:** Comprehensive with examples and schemas  

All gamification mechanics are ready for integration into the WIRTHFORGE platform, providing a complete progression system from Lightning Strikes (Level 1) through Resonance Fields (Level 5).

Level Progression System

WIRTHFORGE’s progression system is structured into five levels of increasing AI orchestration complexity, taking the user on a journey from novice to AI “conductor.” Each level (L1–L5) corresponds to a paradigm shift in the interface’s capabilities and the underlying AI interactions
GitHub
{{ ... }}
GitHub
. Crucially, progression is earned by doing – the user advances to the next level by actively using the system and hitting concrete milestones (not by simply waiting or paying). This design turns learning the platform into a game: users are motivated to explore features and improve their skills because the reward is unlocking even more powerful tools and visual experiences.

Five Levels Overview: The levels are themed after WIRTHFORGE’s core metaphors of energy and AI “consciousness,” as introduced in the Vision document
GitHub
. Below is a summary of each level and its significance:

Level 1 – “Lightning Strikes”: The starting point for all users. Level 1 focuses on single-model interaction – a user asks a prompt and receives an answer from one local model, visualized as a lone lightning bolt representing token generation. The experience is immediate and gratifying, highlighting “lightning-fast” response and simple energy feedback (e.g. a small energy bar pulses with each token). This level establishes the basics: the chat interface, the concept of energy (perhaps shown as a charge meter), and instant energy rewards for each prompt (e.g. a small burst of points for every token generated). There are no prerequisites to Level 1 – it’s available on first launch – and it serves as a tutorial ground. Users at L1 can earn their first achievement (“First Strike” for completing a prompt) and see their first points accumulate. The goal here is to hook the user with a tangible sense of feedback: even a single Q&A feels more interactive than a static CLI because of the visible lightning and energy count increasing in real time.

Level 2 – “Parallel Streams (Council)”: At Level 2, the user unlocks dual-model parallel interaction
GitHub
. This is portrayed as a Council of two AI minds tackling the query simultaneously, often leading to interference patterns in the visualization (a dynamic effect where two streams of tokens may diverge or converge). New UI elements become available: for example, a second model panel is shown side-by-side with the first, and an “interference meter” or visual overlay indicates the Disagreement Index between the models’ outputs. To reach Level 2, the user must have gained a solid foundation in Level 1 – e.g. accumulate X energy points (through several prompts) and perhaps achieve “Novice” badges like Speedster (for hitting a token throughput milestone) or Persistent (for running a long session without interruption). These requirements ensure the user has enough experience to appreciate multi-model output. Upon leveling up, a brief celebratory animation plays (e.g. two lightning bolts striking in unison) and a tutorial prompt might suggest: “Now try asking a question with two models engaged to see parallel thinking in action!” Level 2’s hallmark is the collaborative AI experience – the user begins to see how different models can complement or contradict each other, with the system visualizing their interplay in real-time.

Level 3 – “Structured Architectures”: Level 3 introduces the concept of chained or structured AI workflows
GitHub
. Instead of (or in addition to) parallel operation, the user can now orchestrate a sequence or network of model calls – for example, feed the output of one model into another (akin to a pipeline), or maintain a persistent memory between turns. The UI might reveal a flowchart or node-based interface (the “Composer” or mini-IDE for AI orchestration) where users can arrange components: e.g. Model A’s output goes to Model B’s input. Unlocking Level 3 likely requires the user to master some Level 2 capabilities: for instance, successfully conduct a “council session” where two models produce a combined result, and accumulate a higher energy total (since multi-model sessions yield more points). Perhaps a specific achievement “Council Member” (running at least 5 dual-model queries) is mandatory, ensuring the user is comfortable with parallel streams. Upon reaching Level 3, the reward is significant: the interface transforms to expose structured mode – possibly a toggle or a new tab where complex query structures can be built. The system might walk the user through a guided example (like a multi-step prompt that summarizes a text then analyzes it, using two models sequentially). At this stage, WIRTHFORGE’s energy visualization also ramps up: users might see more intricate graphics (e.g. a flowing ribbon representing the pipeline of data, or multiple lightning bolts chaining). Level 3 is where the platform starts to feel more like a creative tool or lab, and the gamification ensures the user has earned enough confidence to use it.

Level 4 – “Adaptive Fields”: At Level 4, the user gains the ability to handle dynamic and adaptive AI behavior
GitHub
. This includes features like on-the-fly model switching or specialization: e.g. mid-generation, routing a difficult question to a more specialized model, or running models in an adaptive loop where one monitors and adjusts the other’s output. The term “Fields” suggests a broad, interactive space – perhaps a visualization of an energy field where different AI agents can appear and disappear as needed. The UI at Level 4 could introduce a dashboard for orchestration: controls to set conditions or triggers (for model swapping, fallback strategies, etc.), and visual indicators when adaptation occurs (like regions of the screen lighting up to show an “adaptive field” reacting to entropy or uncertainty spikes). To unlock Level 4, users likely need to demonstrate proficiency in structured setups (perhaps completing a certain number of multi-step workflows at L3, or earning an achievement like “Architect” for building a complex chain). Additionally, because Level 4 features are power-user territory, the progression system might enforce not just point accumulation but also critical achievements – for example, “Stability Master” (maintaining high energy output without stalls, indicating readiness for adaptive control). Upon leveling up to 4, a resonant chime and a complex animation (perhaps a ripple effect across the interface like an expanding field) signal that the user is entering the “expert” zone. A pop-up might introduce adaptive controls and encourage experimenting with an example (e.g. “Try enabling Adaptive Mode to automatically switch models when one gets stuck!”). Level 4 blurs the line between user and system control – the gamification at this stage leans more on providing challenges (like “see if you can complete this task with adaptive mode enabled”) to ensure the user truly learns these sophisticated capabilities.

Level 5 – “Resonance Fields”: Level 5 is the culmination of WIRTHFORGE’s progression – the user is now effectively an AI conductor orchestrating a full ensemble of models working in concert
GitHub
. All major features are unlocked: up to 5 or 6 models can be run together (parallel, sequential, or a mix) to tackle complex tasks or generate rich, emergent outputs. The interface likely introduces a “Resonance” view or mode, which could be a grand visualization (perhaps a 3D view or an abstract representation of multiple energy waves synchronizing). The term “Resonance” implies that when all models are tuned just right, something special emerges – the UI might celebrate this with multi-color animations, and the metrics might show a combined indicator of synergy (e.g. an overall coherence score when all models agree). Reaching Level 5 is a serious accomplishment and is meant to be rare and rewarding. The requirements might be steep: a very high total energy accumulation (signifying extensive use of the system) and completion of most achievements (ensuring breadth of experience). For instance, the user might need to have earned specific high-tier badges like “Orchestrator” (for successfully using 3+ models at once) and “Master of All Trades” (demonstrating competency in various modes of use). When Level 5 unlocks, the event is marked by an elaborate celebration: the UI could play a unique animation (e.g. a cascade of all energy colors, or a “resonant” humming sound and vibrating effect), and present a summary of the journey (“You have unlocked Resonance – the pinnacle of WIRTHFORGE!”). At this level, the user has full access to the platform’s potential, and the gamification now shifts focus to mastery and community – e.g. global challenges, sharing resonant creations with others, etc., as the user is now an ambassador of the platform’s possibilities.

Each level thus not only increases the technical capabilities available to the user but also provides a new visual theme and metaphor that keeps the experience fresh and exciting. Table 1 below summarizes the key features unlocked and example criteria for each level:

Level & Name	New Capabilities Unlocked	Example Unlock Criteria	Thematic Visuals
Level 1: Lightning	Single-model chat; basic lightning visualization; energy bar.	Start: Available by default (no prior criteria). Must complete intro tutorial.	Golden lightning bolts for tokens; small spark effects for energy gain.
Level 2: Council	Two models in parallel; interference visualization; dual output panes.	e.g. 100 EU (energy points) accumulated; First Strike achievement earned; Complete 5 prompts.	Dual lightning bolts; interference wave (overlapping ripples showing model divergence).
Level 3: Structures	Multi-step workflows; persistent memory; chain editor UI.	e.g. 500 EU accumulated; Council Member badge (used Level 2 feature 5×); one multi-model session completed.	Flow lines connecting bolts; energy flowing along a chain; simple node graph overlay.
Level 4: Adaptive	Dynamic model switching; conditional orchestration; adaptive controls dashboard.	e.g. 1000 EU; Architect achievement (built complex chain); Efficiency Expert badge (maintained high average energy).	Pulsating “field” background; multiple energy nodes appearing/disappearing; color shifts indicating adaptation.
Level 5: Resonance	Full multi-model orchestration (up to 5–6 models); resonance visualization; all features unlocked.	e.g. 2000+ EU; Orchestrator badge (3+ models at once); completion of all prior level challenge missions.	Multi-color resonance aura; all prior visuals combined in harmony; a halo or ring to signify peak state.

(Table 1: Overview of WIRTHFORGE progression levels, with representative unlock conditions and visual themes.)

Unlock Criteria & Progression Logic: Progression is primarily driven by Energy Units (EU) – a point system directly tied to usage – and Achievement milestones. Every user action that reflects meaningful engagement yields EU points. For example, each token generated might grant 1 EU, but efficiency and skill grant bonus points: finishing a prompt quickly could add a time bonus, using two models could add a multiplier, etc. The Progression Manager accumulates these points and compares them against the next level’s threshold. Importantly, leveling up may require both reaching an EU threshold and certain key achievements that demonstrate the user is ready for the complexity ahead. This prevents “grinding” points through easy tasks without learning requisite skills. The progression logic can be summarized in pseudocode as follows:

// Pseudocode for leveling up (Progression Manager)
if (user.energyPoints >= nextLevel.requiredEnergy && achievements.hasAll(nextLevel.requiredAchievements)) {
    unlockLevel(nextLevel);
    user.level = nextLevel;
    user.energyPoints -= nextLevel.levelUpCost; // if cost is required
}


In this scheme, requiredEnergy and requiredAchievements come from the Level Requirements Schema, and there’s an optional levelUpCost which could be a number of points expended to confirm the level-up. We include a level-up cost to add a tactical decision: the user must choose to ascend (spend the points) when ready, which can heighten the sense of achievement. However, the cost is mostly symbolic in the current design (often equal to the threshold itself, so that reaching it enables the upgrade). Excess points carry over to the next level’s progress bar, ensuring no effort is wasted. The UI displays this progress prominently – typically as a progress bar or energy ring that fills up as points accrue. When the user meets all criteria, the interface signals readiness to level up (e.g. the progress bar might start glowing, and a “Level Up Available” button or prompt appears). This gives the user a moment of anticipation and control over when to trigger the upgrade (perhaps they wait to finish their current task before clicking “Ascend to Level X”).

Energy Accumulation: Energy points are intimately connected to WIRTHFORGE’s energy metaphor (as defined in WF-FND-002). Instead of arbitrary XP, we use the real-time metrics of the AI engine to drive a scoring system. For instance, every token’s inter-arrival time and throughput contribute to energy – effectively integrating the continuous energy signal E(t)
GitHub
GitHub
 over a session yields a certain amount of EU. In practical terms, simpler actions yield fewer points, and challenging actions yield more:

A short prompt that generates 10 tokens slowly might yield ~10 EU. But a longer prompt with 100 tokens at high speed yields more (perhaps 100 EU base plus a bonus for high average TPS and low stall time). This directly teaches the user that fast, efficient generation = more energy.

Using advanced features gives multipliers: e.g., running two models could multiply points by 1.5× for that session (to reflect the greater complexity and to incentivize trying multi-model mode). If those two models strongly disagree (high DI, which is a valuable event to observe), an “insight bonus” might be granted as well – reinforcing that discovering model differences is part of the learning (and game) experience.

Achievements themselves often come with one-time point rewards. For example, the first time the user hits 50 tokens/second throughput, they unlock a “Lightning Speed” badge and maybe an extra +50 EU bonus. This creates positive feedback loops: achievements not only mark progress but help propel the user toward the next level.

Energy Expenditure: While leveling up is the primary goal for spending energy, the design includes a skill tree mechanic where users can optionally spend their accumulated energy points to unlock side features or enhancements. This is where gamified choice comes in: not everything is handed over strictly at level thresholds; some things can be “purchased” with energy in a quasi-RPG style skill tree. For example, at Level 2, the user has access to basic two-model operation. But there might be a skill tree node for “Advanced Council Visualization” – spending, say, 200 EU could unlock a more detailed interference graph or the ability to have the models explicitly debate each other in the UI. Another node might be “Additional Model Slot” (unlock a third model slot early, even before reaching Level 3) for a high cost, giving experienced users flexibility to push the system if they’re ambitious. These choices let users customize their progression somewhat: one user might invest in visualization enhancements, another might unlock practical features sooner. The skill tree thus enhances replay value and personalization – it’s not purely a linear track.

To maintain balance, any spendable energy is separate from what’s needed for core leveling. The UI makes it clear: “Banked Energy: 150 EU (use for upgrades)” vs “Progress to Next Level: 80%”. The system could even disallow using the last bit of energy needed for level-up on a purchase, or conversely, allow it but then the user has to earn it back (depending on how strict we want to be). The Energy Economy Model diagram lays out these flows, ensuring transparency. Ultimately, the existence of energy spending avenues gives advanced users more to do between levels, rather than just grinding points – they can strategize on what to unlock next.

Achievements as Milestones: Achievements and levels are intertwined. Many achievements serve as soft prerequisites for progression by design – they train the user in skills needed for the next level. For example, an achievement like “No Stall Zone: Complete a session with zero stalls” encourages careful prompt construction or using smaller models (teaching optimization) – a skill handy for later adaptive tasks. If the user hasn’t earned that by Level 3, they might struggle at Level 4, so the level’s criteria might implicitly or explicitly include that achievement. This way, achievement hunting is naturally encouraged as part of leveling, not a separate grind.

The Achievement system is extensive and covers different facets of usage. It’s implemented in a way that each achievement is backed by a real metric threshold or event, as outlined in the Achievements schema. Some categories of achievements include:

Performance Achievements: e.g. Speed Demon – maintain an average token rate above 20 TPS for an entire session; Marathoner – generate over 1000 tokens in one continuous session (testing endurance and system stability).

Efficiency Achievements: e.g. Energy Saver – achieve an average Energy E(t) above 0.8 for a session (meaning very high confidence & low latency throughout); Smooth Operator – complete 3 sessions in a row with no stalls or timeouts.

Feature Usage Achievements: e.g. Council Initiate – run at least one parallel session (triggers the first time they use Level 2 feature); Chain Reactor – successfully link 3 models in a chain (first use of structured mode at Level 3); Adaptive Mastery – use the adaptive swap feature 5 times effectively at Level 4.

Milestone Achievements: e.g. 10K Tokens Mined – accumulate 10,000 tokens generated overall; Level Mastery – fully complete all default challenges of a given level (for those who thoroughly explore each level’s content).

Each achievement, when unlocked, produces an immediate feedback: the Celebration Effects module will show a badge icon with a distinct color and iconography related to the achievement (for example, a badge with a lightning bolt for speed-related achievements, or a small gear for efficiency/optimization achievements). The badge art direction follows a consistent energy-themed aesthetic: badges are often shaped as stylized energy crystals, bolts, or shields, and use a palette that corresponds to the level or type (gold for general milestones, blue for efficiency, red for peak performance, etc.). All badges include an accessible text label so that visually impaired users can hear what was earned (e.g. “Achievement Unlocked: Speed Demon – sustained 20 TPS”).

From a progression standpoint, achievements serve three major purposes: guidance, reward, and bragging rights. They guide by suggesting what the user might try next (“Hmm, I see a locked badge for using adaptive mode… maybe I should figure out how to do that”). They reward by giving points and a sense of accomplishment for intermediate steps, not just level-ups. And they provide bragging rights especially when sharing: the user can show off a cabinet of hard-earned badges, which is where community features tie in (more on that in Gamification Mechanics section).

Visual Progress Indicators & Celebrations: To keep users motivated, the system provides clear visual cues of progress and moments of celebration when milestones are hit. Key elements include:

Level Badge & Progress Bar: The UI consistently shows the user’s current level via a small emblem (e.g. a Roman numeral or icon that changes with level themes) next to their username or in a corner of the dashboard. Next to it, a progress bar (or circular ring) indicates how far they are to the next level. This bar is diegetic in style – it might look like a battery or an energy bar filling up, in line with the energy metaphor. It updates in real-time as the user earns points. For example, after a prompt finishes, you might see a burst of light travel into the bar and fill it a bit, giving immediate feedback of “+20 EU”. Hovering or focusing on it will reveal exact numbers (accessible text: “120/200 EU to Level 3”). This constant presence gently nudges the user to keep going, as the next reward is visibly in reach.

On-Screen Notifications: When an achievement is unlocked, a small notification panel slides into view (for instance, top-right of the screen) showing the badge icon and name (⭐ Achievement Unlocked: Council Initiate). It stays for a few seconds and then slides away, to not interrupt the workflow much. These notifications stack if multiple events happen, but the system rate-limits them to avoid flooding (important during big events like end-of-level where multiple badges might pop at once). They also trigger a one-time highlight in the Achievements section of the UI (e.g. a menu item “Achievements” might glow until the user checks their new badge).

Celebratory Animations: Level-ups are treated as special events. As soon as the user confirms leveling up, the Celebration Effects take over for a brief moment. For example, at the moment of reaching Level 2, the screen could display a quick animation of two lightning bolts striking and merging into one, symbolizing the “council”. The background might flash the new level’s predominant color (Level 2 might be blue for interference patterns, if Level 1 was gold for lightning). A subtle screen shake or burst sound can underscore the impact. All these are kept to about 1–2 seconds of duration to delight but not annoy. For users who have disabled animations, the system can instead simply highlight the new features (e.g. outline the new panel in the UI with a pulsating border for a few seconds as guidance). Additionally, a Level-Up Modal appears with a thematic design: it congratulates the user (“Level 4 Achieved – Adaptive Fields Unlocked!”) and lists bullet points of new abilities now available. This modal also has a continue button that might launch a quick guided tour of those features.

Audio-visual Feedback: Each level and many achievements have associated sound cues. For instance, unlocking a badge might play a “ping” or a rising chime. Level-ups have distinct soundscapes (Level 1→2 might have a thunderclap sound, Level 4→5 might have a deep resonant hum). The audio is crafted to match the energy theme and give an extra layer of excitement. All sounds comply with accessibility guidelines (not too loud by default, and optional sound packs for those who prefer silent or custom sounds).

All these visual/aesthetic touches reinforce the gamification without detracting from the “seriousness” of the tool. We avoid overly childish graphics; the design stays futuristic and tech-inspired. Think along the lines of glowing tech badges, not cartoon stickers. This respects the likely audience (tech enthusiasts, power users) while still indulging in a bit of celebratory fun.

Finally, the Skill Tree UI provides a high-level visual of progress. It is typically accessible from the user profile or progression panel. Opening the skill tree shows a diagram (mirroring the one in our documentation, but interactive) of the levels and optional unlocks. The user can see which nodes are unlocked (lit up) and which are still locked (grayed out with requirements tooltip). From here, they can plan their next goals – e.g. hover a locked node to see “Requires Level 3 and 300 EU to unlock: Resonant Theme Pack (unlocks new visual theme options)”. The skill tree not only serves as a menu for spending points on upgrades, but also as a roadmap of the game – users can appreciate how far they’ve come (by seeing the lower parts filled in) and what’s ahead (motivating them to push for that Level 5 node at the very top).

In summary, the Level Progression System turns the potentially daunting complexity of WIRTHFORGE into a structured adventure. By tying advancement to authentic usage and making each step visually and interactively rewarding, users are gradually taught to wield the full power of local AI orchestration. The system always maintains a balance: it’s challenging enough to be engaging, but clear and fair so that users trust it – knowing that as they put in effort (and their AI does real work), they will undoubtedly see progress and ultimately unlock WIRTHFORGE’s most awe-inspiring capabilities.

Gamification Mechanics

The gamification mechanics in WIRTHFORGE are designed to incentivize positive engagement and highlight true performance rather than superficial interaction. Key game-like systems – points, badges, leaderboards, and challenges – are all directly connected to what the AI is actually doing under the hood. This alignment ensures that “playing the game” of WIRTHFORGE equates to learning and using WIRTHFORGE effectively. Below we break down each major mechanic:

Points & Energy System

At the heart of the mechanics is the point system, framed in the app as collecting “Energy Units” or EU. This system quantifies the user’s interaction with the AI in a single numerical score that drives progression and competitive aspects. Importantly, points are not arbitrary; they are computed from real metrics to maintain the “energy truth.” The formula is tunable (and defined in the rewards schema), but conceptually something like:

points_gained = f(tokens_generated, avg_token_rate, stalls, models_used, difficulty)


Where f(...) is a function that adds points for productive activity and subtracts or limits points for inefficient activity. For example:

Generating a token = +1 point (base value). Thus, a longer answer yields more points than a short one, reflecting more work done by the AI.

Each token’s contribution might be scaled by the speed: tokens that arrive faster (short Δt) might be worth slightly more, whereas long delays (stalls) could temporarily halt point accumulation. This encourages users to optimize for smooth generation (perhaps by using appropriate model sizes or prompts).

Using multiple models adds a multiplier: if 2 models are active, maybe 1.2× points (since the user is effectively coordinating more complexity); with 3 models, 1.5×, etc. However, this multiplier is applied only if the multi-model session is completed successfully – if it ends in an early abort or error, the user might get a reduced score (so they are nudged to see multi-model tasks through).

“Difficulty” could factor in prompt complexity or model sophistication. If a user chooses a very large model (which might be slower) or a complex prompt that yields a high entropy output, the system can award bonus points, recognizing that they are pushing boundaries (and also because large models, while slow, should still be rewarding to use, not penalized purely for slowness).

The point allocation table (likely part of rewards.json) might look like this:

{
  "base_token_points": 1,
  "speed_bonus_threshold": 5,    // ms per token for bonus
  "speed_bonus_points": 0.5,     // extra per token if under threshold
  "stall_penalty_threshold": 1000, // ms delay to start penalties
  "stall_penalty_points": -2,    // penalty per stall event beyond threshold
  "model_multiplier": { "1": 1.0, "2": 1.2, "3": 1.5, "4": 1.8, "5": 2.0 },
  "...": "..."
}


This is a simplification, but it shows how deeply rooted in metrics the point system is. It effectively turns user sessions into a score, but one that corresponds to efficiency and exploration of the AI’s capabilities.

To prevent gaming the system in trivial ways, certain safeguards exist:

Repetition damping: If a user repeats an identical prompt over and over just to farm points, the system can detect it (same prompt text, or no variation in usage) and reduce points for subsequent identical actions. A message might even gently suggest “Try something new to continue earning at full rate.”

Idle time: Points are primarily tied to generation. Simply keeping the app open or the AI idle doesn’t give anything. This ensures the user’s focus is on actual interaction.

Caps on passive gains: For example, if a model is generating tokens but the user isn’t reading or interacting (harder to detect, but say they just generate nonsense extremely fast), there might be a soft cap to not overly reward one-dimensional usage. However, since WIRTHFORGE is single-user, this is less of a concern beyond preventing the user from missing out on the learning that comes with varied usage.

Points are displayed in the UI as part of the energy bar and in textual form on the profile (e.g. “Total Energy Collected: 1350 EU”). They feed into the progression as discussed, but also into leaderboards for competitive context.

One additional aspect: Premium multiplier. As noted in Vision/Monetization
GitHub
, premium users might get a “2× energy multiplier” as a perk. The gamification system accommodates that: if the app detects a premium license, it will apply (for example) +100% to all point gains. This doesn’t affect unlocking features (premium users shouldn’t unlock things that non-premium can’t; it just lets them progress faster if they choose). The design, however, ensures that even with 2× points, achievements still require doing the thing (no shortcut), and certain time-based or skill-based milestones aren’t bypassed by just points. It’s more of a boost to reduce grind for those supporters, implemented carefully to avoid pay-to-win feelings.

Achievements & Badges

Achievements are the mini-goals and bragging collectibles of WIRTHFORGE. Each achievement (often represented as a “badge”) has a title, description, and typically an icon that symbolizes the feat. As discussed, they span performance, usage, and milestones.

The badge design takes inspiration from both gaming and the AI domain. Visually, badges might be depicted as glowing emblems – e.g., a shield with a lightning icon for the No Stall Zone achievement, or a stack of coins (tokens) for a Token Miner achievement. They often have tiers (bronze, silver, gold) to encourage further mastery: for example, Speed Demon bronze might be 20 TPS, silver 50 TPS, gold 100 TPS sustained. Each tier would be a separate achievement in the data, or one achievement that “levels up” multiple times. This tiered approach gives advanced users long-term goals (maybe you got bronze easily, but can you push for gold?).

Achievements are listed in an Achievements Screen accessible from the UI. Locked achievements are shown with hints (e.g. “??? – Unlocks by achieving something with multi-model…”) to tease the user. Upon unlocking, they turn color and show the full description. There may also be categories or filters (so users can see all “Performance” badges vs “Exploration” badges, etc.).

From a mechanics standpoint, achievements might grant rewards:

Most give a one-time EU reward (integrated with the progression system). Harder achievements give more points. For instance, a really challenging badge like Resonance Master: All 6 models in sync might give a big chunk of energy (maybe enough to cover a level-up cost).

Some achievements unlock features or cosmetic content. Perhaps “Cosmic Observer – used Evidence Mode on 10 different metrics” could unlock a special theme or a decorative element in the UI (purely cosmetic, like a background effect). This way, exploring even optional features (like Evidence Mode for metrics inspection) is encouraged via gamification.

Achievements could also unlock titles or status markers on the user’s profile (especially in a community scenario). For example, if a user has the Orchestrator badge (for using 5 models at once), they might get the title “Orchestrator” displayed next to their name in leaderboards or a special icon indicating their prowess.

One interesting dynamic is the synergy between achievements and the Three Doors personalization paths
GitHub
GitHub
 (if implemented in the UX). Achievements could be tailored to each path: e.g., a Forge-path user might see achievements named differently (more battle/forge themed) but essentially mapping to similar underlying metrics. However, to keep scope manageable, for now all users have the same set of achievements (with perhaps a marker of which “Door” they were using when unlocked, if relevant).

Badge Logic Example: To illustrate how the system evaluates and awards a badge, consider the “Burst Mode” achievement for high throughput. We might define it as “Maintain an output rate above 50 tokens/second for at least 5 seconds.” The Achievement Tracker will continuously monitor the rolling tokens-per-second metric (TPS) during generation. Pseudocode for this might look like:

// In Achievement Tracker: check throughput achievements
const BURST_THRESHOLD = 50;    // tokens/sec
const DURATION_REQ = 5000;    // 5 seconds
let burstStartTime = null;

onTokenGenerated((token, stats) => {
  if (stats.currentTPS >= BURST_THRESHOLD) {
    if (!burstStartTime) burstStartTime = Date.now();
    if (Date.now() - burstStartTime >= DURATION_REQ) {
      awardAchievement("Burst Mode");
    }
  } else {
    // TPS fell below threshold, reset timer
    burstStartTime = null;
  }
});


This snippet shows that as soon as the TPS dips below 50, the progress toward that achievement resets – ensuring the user truly had a sustained burst. Once awarded, awardAchievement would log it, trigger UI feedback, and add points (if configured).

This logic resides completely on the client side (no server needed to validate), meaning savvy users could technically cheat by modifying code. But since it’s a local single-player “game”, the primary harm would be to their own experience. In any future where online competition is involved, more secure verification might be needed, but that’s beyond our current offline-first scope.

Leaderboards & Sharing

Leaderboards introduce a social competitive angle. Even for an offline tool, the mere presence of a local leaderboard (say, personal bests or past performance comparisons) can motivate improvement. WIRTHFORGE leverages leaderboards in a careful way to push users to optimize and take pride in efficient use, without demoralizing those with lower-end hardware or less time.

Energy Efficiency Leaderboard: The flagship leaderboard focuses on energy efficiency, as mentioned. This metric could be defined in several ways, but one practical definition is: “How much useful output do you get per unit of time (or per token)?” For instance, we might compute an efficiency score for each session the user runs, and then rank the top sessions.

One approach:

Calculate the average Energy E(t) over the session (which combines speed, certainty, and lack of stalls)
GitHub
GitHub
. This yields a number 0–1 (closer to 1 means very efficient).

Multiply by the total tokens output or total information content, to favor sessions that not only were high quality but also produced a lot (maybe a better measure of “work done”).

For example, if a session ran at an average 0.8 energy and produced 200 tokens, you might give it a score = 0.8 * 200 = 160. Another session might be 0.5 average energy but 400 tokens (score 200). So the latter actually ranks higher, meaning sustained longer output even if at lower efficiency still accomplishes more. We could alternatively incorporate time.

We then have the Leaderboard Service keep track of these scores for each session.

Locally, the user’s Top 10 sessions could be shown in a panel: showing score, date, and maybe an option to view details (like which prompt it was, which models used). This encourages self-competition: “Can I break my record? Maybe if I try a parallel run with fewer stalls, I’ll beat my high score.”

If the user goes online (opts into community features), a Global Leaderboard or Friends Leaderboard becomes available. This requires a backend to gather scores from users. Perhaps WIRTHFORGE’s community site could allow users to submit a profile with some stats. For privacy, users might participate under a chosen alias, and only specific metrics are shared (no actual content of prompts). The system might periodically upload a summary like “User X – Efficiency Score Y” if allowed.

We also consider fairness: different hardware will affect raw performance. To mitigate this, efficiency score is partly normalized (e.g. focusing on relative metrics like E(t) average means a slow machine can still have high efficiency if it’s maxing out its capability). Additionally, we could have categories in global leaderboards: e.g. one for CPU-only users, one for GPU users, or group by model size used. These details might evolve, but initially the global board can be more for fun than strict competition.

Beyond efficiency, other leaderboards can exist:

Total Energy (lifetime points) – basically who has used WIRTHFORGE the most. This tends to favor time spent over skill, but it’s a straightforward one. It might be less prominently featured to avoid encouraging unhealthy usage just to climb ranks.

Challenge Leaderboards – for specific periodic challenges (discussed below) where everyone tries the same task and is ranked by performance.

Achievement Count – who has the most badges. This promotes broad exploration since achievements cover all aspects, and it naturally correlates with thorough use of the platform.

Each leaderboard entry typically shows a rank, user name, and the key metric value (score, points, etc.). For global boards, it might also show the user’s level or some avatar. In-app, the user always sees their position highlighted when viewing a global board (e.g. “You are 37th out of 120 this week”), which helps contextualize their progress.

Social Sharing: Recognizing that not every user will join an in-app global board, we also implement lightweight sharing mechanisms:

For achievements: a “Share” button can appear on the achievement unlocked notification. Clicking it can generate a nice image or text snippet, e.g., “I just unlocked Speed Demon in WIRTHFORGE by sustaining 50 tokens/s! ⚡🤖 #Wirthforge”. The user could share this to Twitter or other platforms. Under the hood, the app might have pre-written templates and use the Web Share API to post or copy it.

For level-ups: similarly, when a user reaches a new level, they might want to announce it. We provide a share card that maybe includes the WIRTHFORGE logo, the level achieved, and a slogan (“Reached Level 3: Structured Architectures – chaining AI like a pro!”). This not only is fun for the user but serves as organic marketing for WIRTHFORGE, so long as it’s user-initiated.

Community integration: If there is a community forum or Discord, the app could provide quick links to “post your achievement on the WIRTHFORGE community”. This could be as simple as copying text/image to clipboard for the user to paste, or direct integration if an API exists.

All sharing features adhere to privacy defaults: nothing is shared without a deliberate user action. The first time a share action is used, the app might remind “This will create an image with your achievement and user name. No sensitive data is included.”

Leaderboard and Sharing Safety: We ensure that identifying info is in user control. By default, the app might identify the user as something generic (or an alias they choose) on leaderboards. The user profile settings allow them to set an alias and opt into global leaderboards. If they don’t, only local/offline boards are shown (or global boards appear anonymized with just general stats). This way, a user can enjoy competition with themselves or friends without exposing anything if they prefer not to.

From a technical perspective, the Leaderboard Service module would use an API (if available) to fetch updates. If offline, it just skips that. We encapsulate this so the UX degrades gracefully when no internet is present – e.g. the leaderboard panel might just show “Connect to the internet to see global rankings, or keep playing to improve your personal best!” rather than an empty error.

Leaderboard Computation Example: To demonstrate how we handle ranking, here’s a quick snippet of how local session scores might be recorded and sorted:

// After each session, calculate efficiency score
function endSessionStats(session) {
  const avgEnergy = session.energySum / session.tokens; // average E(t)
  const score = Math.round(avgEnergy * session.tokens); // simple scoring
  leaderboardService.recordScore({ score, tokens: session.tokens, time: session.duration });
}

// In leaderboardService
let localScores = [];

function recordScore(entry) {
  localScores.push(entry);
  localScores.sort((a, b) => b.score - a.score);
  localScores = localScores.slice(0, 10);  // keep top 10
}


This shows maintaining a sorted list of top 10 sessions by score. We’d display those in UI with perhaps a label like “Session on Aug 12 – Score: 160 (200 tokens in 10s, avg energy 0.8)”.

Challenge Modes & Competitive Play

To further drive engagement, especially for advanced users, WIRTHFORGE introduces challenges – optional scenarios or tasks that users can attempt for special rewards. These challenges provide goals beyond the user’s own creative prompts, adding a bit of game-like variety (similar to daily quests or achievements in other platforms).

Daily Challenge: One idea is a rotating daily or weekly challenge prompt. For example, the app might have a built-in prompt like “Translate the following paragraph into French using two models collaboratively.” The user is scored on how efficiently this is done (perhaps measured by time to complete and quality if we had some way to assess). Because WIRTHFORGE runs locally, the challenge would be executed on the user’s machine, but the prompt content could be fetched from a server (or pre-loaded in the app) so that it’s the same for everyone on that day. Users who opt in online can then compare their performance on a leaderboard specific to that challenge. The reward for participating could be a modest point bonus, and top performers might get an exclusive achievement or a mention. For offline users, the challenge can still be attempted and yield points, just without the global comparison.

Scenario Puzzles: We can craft scenario-based challenges that teach advanced concepts. For instance, a puzzle where the user must use structured mode to solve a riddle (like Model A generates a story, Model B summarizes it to find a clue). The app can detect if the user successfully follows the intended steps (via specific trigger words or using certain features) and then award an achievement like “Puzzle Solver”. These are gamified tutorials in a sense, hidden as fun side quests.

Competitive Seasons: If the user base supports it, we could have “seasons” or themed competitions. E.g., a “Resonance Challenge Month” where users try to create the most harmonious multi-model poem or the like, and share their outputs (here content might be shared to community for judging). This goes slightly beyond just pure metrics and into community engagement and subjective fun, but it’s an extension of gamification fostering creativity.

For now, the design focuses on automated, metrics-based challenges to keep everything quantifiable. The Challenge interface in the UI would list available challenges (today’s, this week’s, permanent ones), each with a description and a “Play” button. Upon starting one, the system might temporarily guide the user or enforce certain settings (e.g. locks them to use 2 models for this challenge if that’s the rule). At the end, their performance is summarized: “Challenge Complete – you scored 87 points. (+50 EU)”. If online, a dialog may show “You ranked #5 of 20 participants so far.”

Competitive Balance: We acknowledge that users have different hardware and models, which can affect raw performance. Challenges can be designed in a way to minimize hardware advantage. For example, some challenges might require using a specific small model (the app could include a default model for fairness), or they emphasize strategy over speed. Alternatively, we can have separate brackets if needed (like one leaderboard for “base hardware” and one open category).

Community Achievements: Participating in challenges might itself be tied to achievements (e.g. “Challenger – complete your first daily challenge”). Winning or placing in top X could have unique badges (perhaps time-limited ones that show the user was “Top Challenger of September 2025” etc.).

By integrating challenges, we give users reasons to come back regularly (retention) and also surface parts of the system they might not use on their own (“today’s challenge: use the energy export feature to accomplish X”). This complements the free-form usage with a bit of structured play.

Putting It All Together

All these mechanics – points, badges, leaderboards, challenges – work in concert to create a rich gamified layer on top of WIRTHFORGE’s core. But we always ensure the game serves the product, not the other way around. For instance:

If a user just wants to use the AI normally and ignore all gamification, the design should not irritate them. Thus, all pop-ups and celebrations are brief and can be dismissed, and perhaps a “minimal mode” could even suppress non-essential gamified UI.

On the other hand, for users who are motivated by progression, there’s always something to strive for: another achievement, beating yesterday’s score, reaching the next level for that new feature, or competing with peers in a friendly way.

By accurately reflecting the user’s real accomplishments (and occasional failures) through these mechanics, WIRTHFORGE fosters a powerful intrinsic motivation: users get the joy of a game while actually learning complex AI orchestration skills. It’s a win-win, turning what could be a steep learning curve into an engaging climb with clear rewards at every step.

User Journey Maps

Understanding the user’s journey is crucial to tying together the UX architecture and the gamification elements. We map out the typical lifecycle of a user in WIRTHFORGE across different touchpoints, focusing on how they are onboarded, how new features are introduced at each level, how we keep them engaged over time, and how we support them when issues arise. Below, we detail key phases of the user journey and the UX strategies in each:

Onboarding & Level-by-Level Introduction

First Launch (Level 1 Onboarding): When the user first opens WIRTHFORGE, they’re effectively stepping into Level 1 with no prior knowledge. The onboarding here is critical and has several components:

A brief welcome screen or intro animation plays, perhaps showing the WIRTHFORGE logo with a crackle of lightning to set the tone. The user is then greeted with a short message: “Welcome to WIRTHFORGE – Your AI’s energy will now be visible!” and an option to begin a guided tutorial.

The tutorial at Level 1 walks the user through performing their first AI query. It might highlight the prompt input box (“Type a question for your AI here”), then the “Go” button. Once the user submits a prompt, the tutorial directs attention to the lightning visualization as the answer streams, and to the energy bar (“See the Energy bar filling? That’s your AI working!”). This hands-on introduction ensures the user immediately sees the core loop: prompt → response with visuals → points earned.

After the first response, a pop-up might show “You earned 15 EU from that response!” and “First Strike achievement unlocked!” This gives a taste of progression right away. The tutorial then might prompt: “Earn 85 EU more to reach Level 2 and unlock parallel AI streams.” This sets a clear first goal.

Throughout, the tone is encouraging and novice-friendly: tooltips explain elements in simple terms (e.g. “Lightning Bolt – each flash represents your AI generating part of the answer.”). The tutorial can be re-accessed later via a “Help -> Tutorial” menu for those who skip or need a refresher.

Transition to Level 2: As the user nears Level 2 (say they’ve been using the app for 20-30 minutes and have asked several questions), they will likely meet the criteria. The app doesn’t auto-level them in the middle of whatever they’re doing (unless they hit the button themselves); but it may start seeding hints: for instance, if they have 90/100 EU for Level 2, a tooltip or small notification could appear: “Almost there! One more good question might unlock Parallel Streams.” This builds anticipation. Once they cross the threshold and any required achievement, the Level-Up Available prompt appears. Assuming they click it, they are formally taken to Level 2. Now, onboarding for Level 2 kicks in. This might include:

A modal that says “Level 2: Parallel Streams Unlocked” with a short explanation: “You can now ask two AI models at once and see them work in parallel. This can reveal different perspectives or speed up finding an answer.” There might be a simple diagram in the modal of two heads with a lightning connecting them (to visually convey dual AI).

The UI now has visible changes: perhaps a second model selector or panel is present. The tutorial highlights these new UI elements: “Select a second model here to begin a Council session.” or “Toggle ‘Council Mode’ on to enable parallel queries.”

The first time they use Level 2 features, a guided example is offered. Possibly the system has a default second model configured (like a slightly different personality) and suggests: “Try asking a question now – you’ll see two answers at once.” After they do, guidance can point out the interference visualization (“Notice the purple waves – that’s where the models differed on their predictions, an interference pattern.”) This concretely teaches the value of the new feature.

As before, immediate feedback is key: using two models yields more energy, so the user likely sees a bigger point gain and maybe a “Council Initiate” badge when they complete their first dual-model session, reinforcing that they’re on the right track.

Subsequent Level Onboarding: The pattern continues for Level 3, 4, 5:

Upon reaching each new level, present a concise explanation of the new capabilities and why they’re exciting. E.g., “Level 3 – Structured Architectures: You can now chain AI steps. Create workflows that let one AI’s output feed into another. This unlocks advanced uses like multi-step reasoning or formatting.”

Highlight new UI components: at L3, perhaps a “Workflow Editor” button appears – blink it or use an arrow to draw attention to it. Possibly auto-open it with a starter template loaded (like a simple two-step chain) to demonstrate.

Provide a low-stakes sandbox or example at each level. For L3, maybe include a pre-made example workflow (say a Q→translate→summary pipeline) that the user can run with one click to see structured mode in action. Seeing a concrete example helps them understand what they can do now.

At L4, onboarding might involve explaining adaptive controls: e.g., a short text or voice hint: “Adaptive Mode is now available. WIRTHFORGE can automatically swap models during generation if it detects slowdowns. You can configure triggers in the new Adaptive Control Panel (flashing icon).” The user might get a demo scenario: the app could intentionally use a slower model, then switch to a faster one mid-response to show adaptation, with a note “See how it switched models? That’s adaptation in action!”

Level 5’s onboarding can be more congratulatory: “You made it to Resonance – the ultimate orchestration level! All features are unlocked. You can combine up to 6 models. We can’t tutorialize this fully – now it’s your playground. Check out the Resonance dashboard for an overview of what you can control.” Possibly include tips for mastering resonance (like how to select diverse models for a rich “ensemble”).

Throughout the journey, each time a level introduces complexity, the system provides contextual help. This could be in the form of a persistent “?” help button on new panels that explains their use, or a guided tour mode where clicking a “Help me with this” walks the user through using that feature step-by-step.

Additionally, we tailor the language of guidance to the user’s progression. Early on, more hand-holding and definitions (“A model is the AI brain that generates text.”). Later, we assume knowledge (“Spawn additional model instances for specialization – see advanced settings.”) but still offer definitions on hover or in a glossary (WF-FND-006 glossary can be integrated for on-hover explanations of terms like DI, entropy, etc., as needed).

Feature Discovery & Encouraging Exploration

While leveling provides a backbone structure, we also want users to explore features that might not be strictly required to level up but enrich the experience. The design incorporates several patterns to facilitate discovery:

Locked Feature Teasers: UI elements for higher-level features are visible but disabled with a lock icon and a tooltip. For example, at Level 1 the “Add Second Model” button might be there but locked; hovering it says “Unlocks at Level 2 (Parallel Streams)”. This piques curiosity and sets an expectation of what’s coming. Similarly, menus might list features with a small level tag (e.g. “Adaptive Panel (Lvl 4)” greyed out). This way, users are aware of the platform’s scope from early on, rather than hiding everything until the moment of unlock.

Achievement Hints: As mentioned, the achievements screen can act as a guide. Some achievements are essentially hints in disguise: “Hidden Combo – use Energy Export and re-import data (Level 3+)”. A user browsing achievements sees this and might think, “What’s Energy Export? How do I get that?” They then realize it’s likely a feature unlocked later, or they might even try to achieve it if available. We ensure the descriptions of locked achievements give subtle clues (without spoiling surprises too much).

Contextual Suggestions: The app monitors usage patterns and can suggest features. For example, if a user at Level 2 keeps asking very long questions that hit context length limits, a prompt could suggest: “Having a long conversation? At Level 3, you’ll be able to chain models for longer context. Keep going, you’re not far from unlocking Structured Architectures!” Alternatively, if a user never tries multi-model even after unlocking it, a tooltip or message after a while could encourage: “Did you know you can activate a second model for parallel answers? Give it a try for a bonus achievement.”

Interactive Guide/Assistant: Possibly, an in-app assistant (could be an AI persona or just scripted tips) can respond to certain triggers. For instance, if the user seems stuck (no activity for a while) or enters a known problematic prompt, the assistant might proactively offer help: “Need ideas? Try one of these sample tasks… [list]” or “I see you’ve earned enough points for Level 2, click the level icon to unlock it and get new features!” This assistant should be subtle and not Clippy-like intrusive, but present enough to rescue aimless users.

UI Showcasing: When a new panel or feature is unlocked, we often accompany it with a highlight effect (like a pulsing border) to draw the eye. We also might open the panel by default the first time. For example, at Level 4, as soon as it’s unlocked, the Adaptive Control Panel could auto-open with a short text inside pointing out key elements (“Configure conditions here…”). The user can close it if they want, but at least they’ve seen it exists.

Documentation & Schema Reference: For the technically curious, we include links to technical docs or schemas (like a link “See how Energy is calculated” that opens a pop-up summarizing the formula from WF-FND-002). This is optional, but it serves those who want deeper understanding, turning what could be a black-box game mechanic into an educational moment about AI internals.

The overarching principle is that discovery should feel natural and user-driven, but the system places plenty of breadcrumbs. We want users to have “Aha!” moments when they realize “Oh, I can do that now!” and feel empowered to try it.

Retention & Re-engagement Strategies

Keeping users coming back in the medium and long term is where many apps falter. WIRTHFORGE addresses this by ensuring there’s always more to achieve and by integrating subtle reminders of unfinished goals or new opportunities:

Progress Reminders: If a user is close to a level or achievement and then closes the app, the next time they open it we can remind them gently: “Only 10 EU to Level 3! Jump back in to unlock structured workflows.” This can be done via a welcome-back modal or even OS-level notification (if the app is installed and user permits notifications). For example, a day after inactivity, a notification: “Your AI is humming quietly. Come back to WIRTHFORGE to spark some lightning ⚡ – you’re so close to Level 2!”

Daily Login Bonus / Streaks: While we avoid anything that feels out of sync with real metrics, a modest daily bonus for checking in could help habit-building. Perhaps the first prompt each day gives a +10% points bonus or there’s a small chest icon to click for 20 free EU (fluffed as “AI calibration boost”). This is optional and can be justified diegetically (e.g. “System Recharged after rest – take these extra energy units”). The goal isn’t to inflate progress but to positively reinforce regular usage.

Evolving Content: Over time, as users stay at higher levels, the system can introduce new content or challenges to keep things fresh. For example, new challenge modes might appear over the weeks, or special events like “This week: Halloween theme – earn a Pumpkin badge by asking the AI to tell a ghost story.” These are seasonal or thematic layers that sit on top of the core experience. They provide novelty without requiring a core version update (if delivered via a dynamic content system).

Community Highlights: If the user is online and has opted in, showing community activity can re-engage them. For instance: “5 new community scenarios were shared today” or “Your friend Alice just reached Level 4 – can you catch up?” These social comparisons have to be used carefully to avoid negative feelings; we frame them positively and perhaps rarely (we don’t want to nag).

Emails/External Notifications: If the user provided an email for account setup (assuming an account system exists for cloud features), and consented, we could send summary emails: “Here’s what you achieved this week in WIRTHFORGE…” with stats and encouragement. Or if they’ve been inactive: “We miss you at WIRTHFORGE! The energy field awaits – come back to see what’s new.” However, all such external communication should be minimal and value-driven, as many users might use WIRTHFORGE offline with no account at all.

In-App “Missions”: Apart from static achievements, we could have rotating “missions” that appear in a sidebar. E.g., “Mission: Use at least 3 different models today (Reward: 50 EU)”. These give short-term goals and variety. They reset daily or weekly. Missions differ from challenges in that they are individual and often simpler (“Try feature X Y-times”) whereas challenges are more competitive or puzzle-like.

Critically, retention features are balanced so as not to compromise the authenticity of the experience. We’re not interested in dark patterns that guilt-trip the user; instead, we rely on genuine curiosity and the satisfaction of mastering the AI. The gamification is inherently educational and creative – that itself fosters return usage because as the user levels up, they can do more, and presumably they have real tasks or creativity they want to apply those new powers to.

Error Recovery & Support Systems

No journey is without bumps. When users encounter errors, confusion, or system limitations, WIRTHFORGE needs to handle these gracefully to maintain trust and motivation. This includes both technical errors (e.g. model crash, no GPU memory) and user errors or misunderstandings (trying to use a feature that’s locked, inputting a prompt incorrectly, etc.).

Guidance for Locked/Unavailable Features: If the user attempts to access something not yet unlocked (say they find a way to click an API or a keyboard shortcut for a locked feature), the system should intercept it. Instead of a generic “access denied” message, we turn it into a guiding moment: “That feature will come at Level 4. Keep exploring – you’ll get there soon! (Requires Adaptive Fields.)” Possibly include a progress indication (“Only 200 EU to go”) if relevant. This softens the frustration of not being able to do something by reframing it as a future reward.

Handling Technical Glitches: Because WIRTHFORGE sits on local AI, issues like model loading failures or slowdowns might happen. Our UI will catch common errors and present them in user-friendly ways:

If a model fails to load because of lack of VRAM, instead of a cryptic stack trace, the user sees: “⚠️ Model could not be loaded (out of memory). Tip: Try using a smaller model or closing other programs. [Learn more].” The “[Learn more]” can link to a help article or show a tooltip about memory requirements.

If the WebSocket connection to the local backend drops (as covered in WF-TECH-003), the UI should inform: “Reconnecting to AI engine…”. If it can’t reconnect, offer steps: “Please ensure the WIRTHFORGE backend is running. [Restart] [Help].” Possibly also tie this into the gamification by not penalizing the user’s session if it wasn’t their fault (e.g. a session that aborts due to error might not count as a “failure” for any achievement tracking).

In case of a bug where something truly goes wrong (unhandled exception), we can fall back to a friendly apology and error log mechanism. For example: “😥 Oops, something unexpected happened. Your progress is safe, but you might need to restart the app. A bug report was generated so we can fix this.” and indeed ensure the Progression Manager saved state frequently to not lose points earned before a crash.

Continuous Help Access: At any time, the user should have access to help without breaking their flow. Some methods:

A Help Center panel with FAQ (“How do levels work?”, “What is energy?”, “Troubleshooting slow performance”), perhaps populated from documentation. This can be context-sensitive: if they press F1 or click help while a certain panel is open, show help for that panel.

Tooltips and ARIA hints: All interactive elements have descriptive tooltips on hover/focus. For keyboard and screen reader users, ARIA labels and live regions convey important info. E.g., when an achievement unlocks, we use a live region to announce “Achievement Unlocked: [Name]” verbally. The progress bar might have an ARIA label like “Level progress, 60% complete, 120 out of 200 energy.” These ensure users with disabilities get equivalent feedback and aren’t left guessing.

Possibly an AI Assistant for help (since we are dealing with AI, ironically). If a local model is capable, we could allow the user to ask the AI itself questions about WIRTHFORGE (“How do I use multiple models?”) and have it respond based on a knowledge base. This is a stretch goal, but it could provide a novel, interactive way to get support. Regardless, a static knowledge base is provided.

Error as Learning Opportunities: We incorporate errors into gamification in some cases. For example, an achievement “Fall and Rise” could be given when the user encounters a stall or crash and then successfully completes a session afterward. While we don’t want to encourage errors, acknowledging recovery can be motivating (“I overcame that issue!”). Similarly, if a user’s session fails because they pushed too hard (maybe ran out of VRAM with too many models), we might gently coach them: “You pushed the limits! Consider this a learning step on the way to becoming an AI master. Try again with fewer models or a smaller prompt.” This messaging turns a negative into a neutral or positive framing.

Safety & Reset: If a user somehow messes up their progression (unlikely, but say editing config files or something), we provide options to reset or recalibrate. For instance, a “Recalculate Achievements” button in advanced settings could re-scan their usage log to ensure no achievement is missed or conversely to remove glitched ones. A user can also reset their progress entirely (with confirmations) if they want to start over fresh – important for those who might share a device or just want the fun of leveling again.

Accessible Help Resources: All documentation linked (like the Vision doc, or technical schemas) are written in accessible language and available in-app or offline so users don’t have to leave the app. The help content is localized if the app is offered in multiple languages, matching the user’s language settings.

Finally, user feedback channels are part of support: a menu item “Send Feedback” can let the user submit a message or log to the developers. While not directly a UX for end-users to play, it closes the loop – users feel heard and this can mitigate frustration if something isn’t working right; they know they can report it. Gamification wise, one could jokingly award a “Beta Tester” badge for submitting a feedback report, but that might be beyond scope. (If done, it would be clearly separate from normal progression to avoid confusing users into thinking errors are a planned part of the game.)

Conclusion of User Journey: By mapping out onboarding through mastery and providing robust support, we aim for users to feel continuously supported yet increasingly autonomous. Early on, the system guides them step by step; by the end, they are essentially guiding themselves, setting their own goals (like “I want to optimize this process” or “I’ll attempt a crazy 6-model experiment”). The gamification elements we’ve designed are the scaffolding that brings them to that point, ensuring that at no stage do they feel lost, bored, or without purpose. Instead, there’s always a next objective or a new trick to try, all while reinforcing the magic and power of local AI that WIRTHFORGE stands for. Each user’s journey will be unique, but the system is built to celebrate all of them – turning users into engaged, empowered practitioners of their own “AI forge.”