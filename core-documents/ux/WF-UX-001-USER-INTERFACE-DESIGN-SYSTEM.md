WF-UX-001 — User Interface Architecture & Design System

🧬 Document DNA

Unique ID: WF-UX-001

Category: UX

Priority: P0 (Foundation of UX tier)

Dev Phase: 2

Estimated Length: ~10,000 words

Document Type: UI/UX Architectural Specification

🔗 Dependency Matrix

Required Before: WF-FND-001 (Vision & Manifesto)
GitHub
GitHub
, WF-FND-002 (Energy Metaphor Definition)
GitHub
GitHub
, WF-FND-003 (Core Architecture Layers)
GitHub
GitHub
, WF-TECH-001 (Local UI Boot & Runtime), WF-TECH-002 (Local AI Integration)

Enables After: WF-UX-002 through WF-UX-010 (all subsequent UX specifications; see Post-Generation Cascade)

Cross-References: WF-TECH-003 (Real-Time Events & WebSockets)
GitHub
GitHub
, WF-TECH-009 (Metrics & Monitoring Systems), WF-TECH-010 (Performance Tuning & Optimization)
GitHub

🎯 Core Objective
Define a comprehensive UI architecture and design system that enables energy-truth visualization through web technologies while upholding WIRTHFORGE’s local-first principles. This document serves as the foundation for the entire UX tier, marrying a rich web-engaged interface with on-device AI processing
GitHub
. It specifies the component library, design tokens, and interaction patterns needed to turn raw model outputs into intuitive visuals. Critical goals include real-time responsiveness at 60 Hz (16.67 ms frame budget)
GitHub
, strict WCAG 2.2 AA accessibility compliance
GitHub
, and modular scalability to support WIRTHFORGE’s five-level progression. By basing all design decisions on validated foundation documents and schemas, we ensure the UI reflects true underlying metrics (no smoke-and-mirrors)
GitHub
, providing users with an honest, engaging window into their local AI’s “thinking” process.

📚 Knowledge Integration Checklist

Local-First Web UI: The interface runs in the browser, but all AI computation and data stay on the user’s device – no cloud services in core usage
GitHub
. The design assumes a localhost backend and must support offline operation out of the box (e.g. first-run experiences, no mandatory internet calls).

Real-Time 60 Hz Rendering: Incorporate a ~60 FPS update loop (16.67 ms per frame) as a guiding constraint
GitHub
. All animations and data refreshes should align to this cadence. Backpressure or buffering strategies are employed to handle bursts of events without dropping frames
GitHub
.

Energy-Truth Visuals: Ensure every visual element corresponds to a real metric or event from the AI engine
GitHub
. There are no arbitrary animations – e.g. lightning bolt thickness reflects token cadence, interference patterns reflect model disagreement. This maintains user trust that visuals are grounded in actual computation, following the Wirthforge Visual Metrics Protocol (WVMP) ethos
GitHub
.

Component Modularity: Build the UI as a library of reusable, encapsulated components. Complex features (chat display, energy graphs, control panels) should be composed of smaller presentational components to facilitate testing and future development. The architecture should support plugging in new components (for higher-level features in WF-UX-002+ series) without refactoring core systems.

Theming & Design Tokens: Use centralized design tokens (colors, typography, spacing, motion durations) for styling to ensure consistency. Support theme variations (dark mode, high-contrast mode) by swapping token values. Visual theming must align with semantic meaning – e.g. specific color palettes map to specific energy states
GitHub
.

State Management & Sync: Maintain a single source of truth for application state. Leverage a predictable state container (e.g. Redux or Context API) so that UI components render based on state, and state is updated only via events from the orchestrator (or user actions). This guarantees the UI reflects backend state changes in real-time, and prevents out-of-sync scenarios. Use 60 Hz state sync loops or double buffering if needed to align with render frames.

WebSocket Data Pipeline: Interface with the local backend via a robust WebSocket protocol (as defined in WF-TECH-003) for streaming events
GitHub
. The UI should handle message types like TOKEN_STREAM, ENERGY_UPDATE, etc., according to the specified schemas
GitHub
. Include error-handling and reconnection logic so the UI can recover smoothly from transient disconnects.

Progressive Enhancement (Levels 1–5): Design the UI to gracefully scale from basic to advanced features. Initial users (Level 1) see a simple chat and lightning visualization, while power users (Level 5) unlock multi-model orchestration UIs. The architecture must allow these features to toggle on/off based on user level or capability detection, without affecting baseline performance.

Performance Budgets & Metrics: Adhere to performance budgets (e.g. <10% CPU usage for UI thread, <100 MB memory) as detailed in WF-TECH-010. Integrate lightweight telemetry to measure UI performance (FPS, event loop lag) and possibly display in a dev HUD for internal testing
GitHub
. No single user action (or render cycle) should block the main thread longer than a few milliseconds – long tasks should be chunked or offloaded.

Accessibility & Inclusivity: Align with the WF-FND-001 Accessibility spec for WCAG 2.2 AA
GitHub
. This includes ensuring color contrast ratios (e.g. text vs background ≥ 4.5:1)
GitHub
, keyboard navigability (logical tab order, focus management), screen reader compatibility (ARIA roles, live regions for dynamic content), and reduced-motion alternatives for users who disable animations
GitHub
. Accessibility must be considered for every component (e.g., provide alt text or aria-labels for canvas visualizations).

📝 Content Architecture

Design System Foundations – UI Components, Styles, and Tokens. This section details the visual design language of the WIRTHFORGE UI, including the component library structure, design tokens (color palettes, typography scales, spacing units, etc.), and animation guidelines. It explains how computational states map to visual styles (e.g. which colors and effects signify high energy vs. low energy) and how consistency is maintained via theming. Accessibility considerations in design (contrast, motion sensitivity) are also covered here.

UI Architecture & State Flow – Component Hierarchy, Data Binding, Real-Time Updates. This section describes the overall architecture of the front-end application. It introduces the hierarchy of React components that make up the interface and how they containerize functionality. It then explains how the UI state is managed and synchronized with the local backend at run-time, detailing the flow of data through WebSocket events and state management. Diagrams illustrate the structure of the component tree, the 60 Hz state synchronization loop, and the routing of energy events from the orchestrator to the UI.

Implementation Patterns – React, Three.js Integration, and Performance. This section provides practical guidance and examples of how to implement the design and architecture. It covers best practices in React (functional components with hooks, context usage for global state), integration of Three.js for 3D energy visualizations within React, and techniques to meet performance budgets (like using requestAnimationFrame, avoiding unnecessary re-renders, leveraging web workers for heavy computations). Code samples demonstrate key concepts like a React component for an energy visualization and a modular UI component using design tokens.

Accessibility & Compliance – Ensuring Inclusive Design. This section focuses on how accessibility is woven into the UI. It outlines how the design meets WCAG criteria (with references to specific checklist items from the JSON schema), how the application supports users with disabilities (screen reader support, keyboard shortcuts, alternative text, high-contrast themes, reduced-motion modes), and how compliance is tested. It also mentions any remaining open accessibility questions and plans for user testing/feedback to continuously improve accessibility.

## 🎯 Generated Assets Inventory

### Mermaid Diagrams (3 files)
- **Component Hierarchy Architecture**: `/assets/diagrams/WF-UX-001-component-hierarchy.md` - Complete React component structure with layout, visualization, control, interactive, display, and utility components
- **State Flow & Data Management**: `/assets/diagrams/WF-UX-001-state-flow.md` - Application state lifecycle, real-time synchronization, and component lifecycle management
- **Energy Mapping & Visualization Pipeline**: `/assets/diagrams/WF-UX-001-energy-mapping.md` - Energy data flow from sources through processing to visual output with progressive complexity levels

### JSON Schemas (3 files)
- **Design Tokens Schema**: `/assets/schemas/WF-UX-001-design-tokens.json` - Complete color palettes, typography, spacing, animations, accessibility guidelines, and performance budgets
- **Component Props Schema**: `/assets/schemas/WF-UX-001-component-props.json` - TypeScript prop definitions for all core UI components with accessibility and energy visualization properties
- **Accessibility Compliance Schema**: `/assets/schemas/WF-UX-001-accessibility.json` - WCAG 2.2 AA requirements, ARIA specifications, motion sensitivity, and testing requirements

### React/TypeScript Code Files (5 files)
- **Lightning Bolt Visual Component**: `/deliverables/code/WF-UX-001/WF-UX-001-lightning-bolt-visual.tsx` - Three.js-based lightning visualization reflecting token generation speed with accessibility support
- **Energy Stream Visual Component**: `/deliverables/code/WF-UX-001/WF-UX-001-energy-stream-visual.tsx` - Particle system for continuous energy flow visualization with directional support
- **Interference Overlay Component**: `/deliverables/code/WF-UX-001/WF-UX-001-interference-overlay.tsx` - Model interference pattern visualization with constructive/destructive zones
- **Metrics Panel Component**: `/deliverables/code/WF-UX-001/WF-UX-001-metrics-panel.tsx` - System metrics dashboard with status indicators and trend visualization
- **Design Tokens CSS**: `/deliverables/code/WF-UX-001/WF-UX-001-design-tokens.css` - CSS custom properties for consistent theming and reduced motion support
- **Animation Utilities**: `/deliverables/code/WF-UX-001/WF-UX-001-animation-utilities.ts` - Performance-aware animation framework with energy-based controllers and particle systems

### Test Suites (3 files)
- **Component Tests**: `/deliverables/code/WF-UX-001/tests/WF-UX-001-component-tests.spec.ts` - Comprehensive React component testing with Three.js mocking and integration tests
- **Accessibility Tests**: `/deliverables/code/WF-UX-001/tests/WF-UX-001-accessibility-tests.spec.ts` - WCAG 2.2 AA compliance testing with axe integration and screen reader support validation
- **Performance Tests**: `/deliverables/code/WF-UX-001/tests/WF-UX-001-performance-tests.spec.ts` - 60fps frame budget enforcement, memory leak detection, and GPU acceleration testing

### Asset Status Summary
✅ **Complete**: All 14 required assets generated and validated
- 3 Mermaid diagrams with component architecture and energy flow visualization
- 3 JSON schemas covering design tokens, component props, and accessibility compliance
- 6 React/TypeScript implementation files with Three.js integration and animation utilities
- 3 comprehensive test suites covering functionality, accessibility, and performance
- All assets follow WIRTHFORGE principles: local-first, energy truth visualization, 60Hz rendering, WCAG 2.2 AA compliance

Design System Foundations

WIRTHFORGE’s design system provides a unified visual language that turns AI signals into intuitive visuals. It consists of a component library (reusable UI components for everything from buttons to complex visualization widgets) and a style guide codified in design tokens. By separating design tokens (raw style values) from implementation, we ensure consistency and easy theming across the app.

Color Palettes & Themes: The platform uses distinct color palettes to represent different kinds of “energy” and states. For example, the “lightning” palette is a spectrum of golden yellows used for token generation effects
GitHub
, conveying speed and illumination. In contrast, the “energyStream” palette uses cool blues for continuous flow visuals
GitHub
, indicating ongoing, stable processes. There are also palettes for interference (purples/reds for constructive vs. destructive interference) and resonance (multi-color for celebratory effects). Each palette is defined in the design tokens JSON with primary, secondary, tertiary colors, plus any special variants (e.g. glow or highlight colors) and a description of its usage. The UI applies these consistently: for instance, lightning bolts will always use the lightning palette shades, ensuring users learn the association between color and meaning.

Typography & Iconography: We employ a mix of legible, UI-friendly fonts. Monospace font is used for any text that represents code or model output (to reinforce a technical aesthetic), while a clean sans-serif is used for UI labels and content
GitHub
. Font sizes are scaled according to a type scale (e.g. base = 1rem for normal text, larger headings at 1.25rem, etc.) to maintain hierarchy and readability across different screen sizes. Iconography in WIRTHFORGE favors simple geometric shapes infused with the energy theme (for example, a small lightning icon to denote AI activity, or circular ripple icons for multi-model interference). All icons are provided as SVGs and included in the design tokens (or component assets) so they can inherit the current theme colors. Crucially, every icon has an accessible equivalent: either a label (visible text) or an aria-label so that its meaning is conveyed to assistive technologies.

Spacing & Layout: Consistent spacing is key to a clean UI. The design tokens define spacing units (e.g. xs = 0.25rem, sm = 0.5rem, md = 1rem, etc.)
GitHub
 used for margins, padding, and gaps between elements. All components use these standardized sizes, avoiding arbitrary pixel values. Layout-wise, the interface is composed of responsive grids/flex layouts that can adapt from smaller laptop screens to larger desktops. We avoid horizontal scroll except in specific panoramas (like a timeline view if applicable). Components are designed to reflow or collapse elegantly on narrower viewports. For example, the sidebar might become a collapsible drawer on a very small screen. The spacing tokens ensure that even in responsive scenarios, the visual padding and whitespace remain proportional.

Motion & Animation Guidelines: Animation in WIRTHFORGE’s design system is always purposeful: it reinforces the realtime feedback from the AI. We define a standard set of animation durations (fast = 150ms, normal = 300ms, slow = 500ms) and easing curves (ease-out, ease-in-out, linear) in the tokens
GitHub
. These are used across components; for instance, a token “pulse” effect might use the fast duration and ease-out curve to quickly flash when a new token arrives. Continuous animations (like a flowing energy ribbon) are optimized to run at 60 FPS and synchronize with incoming data frames (e.g., the ribbon might update its shape every 16ms with new token info). The design system also accounts for reduced motion preferences: if a user opts out of animations, the UI either shortens them to near-instant or switches them off entirely
GitHub
. For example, instead of animating a lightning bolt drawing on the screen, the UI could simply display it instantly and maybe use a subtle highlight. All animations are designed to be interruptible and non-blocking; UI state changes do not rely on animations to complete.

Component Library Overview: The UI is built from a library of React components, each corresponding to either a control element or a visualization element in the interface. We categorize them broadly:

Controls & Inputs: Buttons, toggles, sliders (e.g., to adjust settings like model temperature or to pause/resume generation), and menu components. These are styled according to the design system (e.g., buttons might use the system palette with a particular hover effect).

Display & Visualization: Components that display data or visuals. For example, TokenDisplay (shows the text output from the AI, with possibly highlights or streaming effect), EnergyMeter (perhaps a visual bar or gauge of current energy level), LightningBoltVisual (a canvas or SVG-based component drawing the lightning effect), InterferenceGraph (showing interference patterns when multiple models run), etc. These often combine canvas/WebGL rendering with overlay UI (like labels or values).

Containers & Layouts: Higher-level components that arrange other components, such as Sidebar, HeaderBar, ChatPanel, DashboardGrid. These define structure but little logic, simply grouping child components and handling basic layout concerns.

Each component in the library is documented with its intended purpose, props (inputs), and any events it emits. We also specify the interplay between components. For example, the ChatPanel contains a TokenDisplay and also renders a MetricsPanel below it to show generation stats; when a new token arrives, the state update triggers both the TokenDisplay (to show text) and the MetricsPanel (to update counts). This division ensures modularity—each part of the UI can be developed and tested in isolation.

To maintain consistency, components strictly use the design tokens for styling. This means no hardcoded hex colors or magic numbers in components; instead they reference, for instance, tokens.colorPalettes.system.text for a text color, or tokens.spacing.md for padding. Below is a brief excerpt of the design tokens JSON to illustrate how the style values are structured:

{
  "colorPalettes": {
    "lightning": {
      "primary": "#fbbf24",
      "secondary": "#f59e0b",
      "tertiary": "#d97706",
      "glow": "#fef3c7",
      "description": "Golden yellow spectrum for token generation visualization"
    },
    "energyStream": {
      "primary": "#60a5fa",
      "secondary": "#3b82f6",
      "tertiary": "#1d4ed8",
      "deep": "#1e40af",
      "description": "Blue spectrum for continuous token flow visualization"
    },
    // ... other palettes (interference, resonance, etc.)
  },
  "typography": {
    "families": {
      "monospace": "ui-monospace, SFMono-Regular, ...",
      "sans": "ui-sans-serif, system-ui, ...",
    },
    "sizes": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      // ...
    },
    "weights": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    }
  },
  // ... spacing, animations, effects ...
  "accessibility": {
    "focusRings": {
      "color": "#fbbf24",
      "width": "2px",
      "style": "solid",
      "offset": "2px"
    },
    "contrastRatios": {
      "minimum": "4.5:1",
      "enhanced": "7:1",
      "textOnBackground": "12.6:1",
      "textOnSurface": "8.9:1"
    },
    "motionReduced": {
      "animationDuration": "0.01ms",
      "transitionDuration": "0.01ms",
      "staticAlternatives": true
    },
    // ...
  },
  "performance": {
    "frameRate": "60fps",
    "frameBudget": "16.67ms",
    "maxAnimations": 10,
    "gpuAcceleration": true,
    "memoryLimit": "100MB",
    "cpuThreshold": "5%"
  }
}


Source: Excerpts from WF-FND-002 Design Tokens
GitHub
GitHub
. This JSON defines default values for the design system (only partial content shown here). The UI uses these values by importing them or by generating CSS custom properties from them. For example, if frameRate is 60fps, the UI knows to target ~16ms per frame in its loops, and maxAnimations: 10 gives a guideline to avoid too many concurrent animations.

Accessibility in Design: Accessibility considerations are built into these foundations. The design tokens include an accessibility section for things like focus ring style (so all focusable elements get a consistent, high-contrast focus outline)
GitHub
. Color palettes are chosen not only for aesthetics but tested for color blindness safety; e.g., the interference palette defines distinct colors for constructive vs destructive interference and also accounts for color-blind safe patterns or textures if needed
GitHub
. Every component in the library has an accessibility attribute checklist: if a component displays non-text content (like the lightning visualization), it has an associated aria-label or descriptive text for screen readers
GitHub
. Components that are purely decorative will be marked with aria-hidden. We also plan for an “accessibility mode” toggle that could adjust some UI elements (for instance, switch to a simpler visual theme with higher contrast and no motion, for users who require it).

In summary, the design system provides the aesthetic and interaction baseline for WIRTHFORGE’s UI. It ensures consistency (through tokens), clarity (through thoughtful color and typography choices), and honesty (visuals tied to real data). With these foundations, we now move to how these components and styles come together in the application architecture.

UI Architecture & State Flow

This section describes how the UI is structured and how it interfaces with WIRTHFORGE’s local AI backend in real-time. The architecture follows the layered approach defined in the core system specs
GitHub
: the UI corresponds to Layer 5 (Visualization & UX) which communicates with Layer 4 (Contracts & Transport, i.e., the WebSocket API) and indirectly with the lower layers (Layer 3 Orchestration, Layer 2 Model, etc.) via that interface.

At a high level, the UI is a single-page React application that opens a WebSocket connection to the local backend when the app loads. From that point, the UI remains active, listening for events and sending user actions. The entire experience is local-first: the web UI is served either from a local server or as a static file, and it connects to ws://localhost:<port> for runtime data. No external cloud services are involved by default, which means even network latency is virtually eliminated; typical event round-trip is on the order of 1–5 ms on localhost
GitHub
.

Component Hierarchy: The UI is composed of React components organized in a hierarchy that reflects the UI layout. At the root is the <App> component, which sets up global contexts (for theme, state store, etc.) and routes (if any). Within <App>, one can imagine major sections like a <Header> (for branding or global menus), a <MainCanvas> (the central area where energy visualizations and AI outputs appear), and a <Sidebar> (containing controls, settings, and metrics summary). Each of these might contain further subcomponents. For example, <MainCanvas> could contain:

<LightningBoltVisual> – responsible for drawing lightning effects for token generation.

<EnergyStreamVisual> – draws the flowing ribbon for token streams (especially in multi-model scenarios).

<InterferenceOverlay> – an overlay that appears in multi-model mode to visualize interference patterns (blending with the energy stream visuals).

Similarly, <Sidebar> might contain a <MetricsPanel> (showing numeric stats like total tokens, energy, etc.) and a <ControlsPanel> (buttons like “Pause” or “Switch Model”). This breakdown ensures separation of concerns: each component knows how to render its piece of the UI and can be developed/tested independently.

Figure: UI Component Hierarchy in WIRTHFORGE. The diagram illustrates the structure of main UI components and their sub-components. It depicts how the application is composed of nested components (e.g., a main canvas containing visual elements and a sidebar with control panels).

All components communicate via props/state rather than directly accessing global variables, making the data flow explicit. For instance, the <MetricsPanel> might receive totalEnergy and tokenRate as props from its parent (which in turn got those from the global state store). When the user interacts with controls, the components emit events upward: e.g., clicking a Pause button in <ControlsPanel> triggers a callback provided by the App level, which sends a pause command to the backend via the WebSocket.

This clear hierarchy and data flow aligns with React best practices and also with WIRTHFORGE’s layered architecture: the UI components never directly call into the backend; they only produce events which go through the WebSocket (Layer 4), and they react to state changes that come from backend events.

Application State Management: To manage complexity, the UI maintains a centralized state (using a predictable state container pattern). We use something akin to a Redux store or React’s built-in Context + useReducer to hold the application state. The state includes:

Session data: Is a generation session active, what is the current prompt, what models are running, etc.

Live metrics: Current energy level, token per second rate, number of tokens generated, etc., which update continuously during a session.

UI state: Which UI panel is open, user preferences (like dark mode or reduced motion flags), and ephemeral UI stuff (like a notification “snackbar” visibility).

The key aspect is synchronization with the backend. The orchestrator (Layer 3) is the source of truth for AI-related data, and it emits events for any changes. The UI’s state store is updated by a WebSocket event handler: for example, on an ENERGY_UPDATE message, a reducer in the UI state will update the totalEnergy and tokenRate fields of the state
GitHub
. Because these updates might come up to 60 times a second, careful consideration is given to performance: state updates are batched where possible, and components that consume this state use React.memo or selective subscriptions to avoid re-rendering everything each time.

We also double-buffer or throttle certain updates. For instance, the token stream text output might update on every token event (which could be very rapid), but the energy meter might only update 10 times a second for efficiency, or use a moving average that doesn’t need every single token event. The design target is that the UI should not drop below 60 FPS under normal conditions; if there is ever a flood of events beyond what can be drawn, the system should degrade gracefully (e.g., skip drawing some frames or consolidate multiple incoming events into one update).

Real-Time Data Flow: The data flow between backend and UI is fundamentally an event stream. As soon as the user submits a prompt (via the UI), the backend starts processing and streaming events:

The UI sends a USER_PROMPT message over WebSocket with the prompt text and any parameters (this corresponds to a schema like userInput in WF-FND-003)
GitHub
GitHub
.

The backend acknowledges and begins generation. The UI might receive a start event (if defined) or simply starts getting TOKEN_STREAM events as tokens are generated
GitHub
.

Each TOKEN_STREAM event contains the new token and associated data like token index, timestamp, and possibly an energy contribution or probability
GitHub
. The UI appends the token to the chat display, and could use the timing info to animate it (e.g., slight delay or highlighting).

Concurrently, ENERGY_UPDATE events arrive at some interval (say every 100 ms or whenever significant changes occur) containing aggregated metrics like totalEnergy, current token rate, etc.
GitHub
. The UI updates the energy meter component and any related displays (like level progress, if gamification is integrated).

If multiple models are running (Level 2+), the UI might also receive INTERFERENCE events or similar, indicating patterns between model outputs
GitHub
. Those would trigger the interference visualization component to update (for example, rendering a ripple or interference pattern on the canvas).

When generation ends, an end/stream_end event is sent, and the UI transitions out of “streaming” mode (enabling certain UI controls again, etc.).

All these events are handled by centralized event listeners that dispatch actions to the state store. The React components subscribe to the slices of state they need. For example, the <LightningBoltVisual> component might subscribe only to state related to token timings or cadences, while the <TokenDisplay> subscribes to the array of tokens.

User Actions and Controls: On the flip side, user actions in the UI generate events that go to the backend:

Clicking “Pause” sends a CONTROL message, subtype PAUSE_GENERATION
GitHub
, which the backend (Layer 3) interprets to pause token output.

Selecting a different model from a dropdown might send a CHANGE_MODEL command with the chosen model name
GitHub
.

Adjusting a parameter (like temperature slider) could send a CONTROL message to adjust generation settings on the fly.

These messages follow the schemas defined (so the backend can validate them). The UI ensures to send them in the proper format, including a session or request ID if needed to correlate responses
GitHub
.

Because the UI and backend operate asynchronously, the UI remains responsive even while a lot is happening. The WebSocket events are handled non-blockingly, and React’s reconciliation ensures the DOM updates efficiently. The local nature of the setup (no network latency beyond loopback) means the UI gets near-instant feedback: for instance, if the user hits “Stop”, the backend likely stops within a few milliseconds and the UI will receive a stop confirmation or simply the cessation of token events almost immediately.

To maintain a smooth user experience, we also implement a small heartbeat/keep-alive on the WebSocket (as mentioned in WF-TECH-003). This is an occasional ping/pong to detect if the connection is still alive and to measure latency. The UI might display a small status indicator (green dot for connected, yellow for reconnecting, red for disconnected). If the backend restarts or the connection drops, the UI will attempt to reconnect automatically and inform the user (“Reconnecting…” status). This ensures robustness in the local-first environment, especially when the backend is essentially a server running on the user’s machine that might restart when models are changed or updated.

State Synchronization at 60 Hz: A core requirement is that the UI updates in lockstep with the backend’s frame rate. The orchestrator’s update loop runs at up to 60 Hz (or ties to token events, whichever is finer). We ensure that:

The WebSocket can handle 60 messages per second without queuing delays (it can on localhost easily)
GitHub
.

The UI’s state updates and renders can keep up with 60 FPS. We leverage the browser’s rendering engine – using requestAnimationFrame for any visual updates ensures we’re not updating faster than the display can draw. We often coordinate state updates with requestAnimationFrame as well: e.g., an incoming batch of events might be processed just before a frame paint. This technique avoids uneven timing and can prevent multiple re-renders within one frame.

By profiling, we might find that not every component needs a 60 Hz update. Many can update at a lower frequency without perceptible difference (for example, textual counters might only need 10 Hz). So part of the implementation strategy is to decouple critical real-time visuals from less critical UI updates. Critical visuals (like the energy canvas animations) are tied to the 60 Hz loop and use lightweight updates (no full React diff each frame, rather direct canvas drawing). Less critical UI (like updating numbers or progress bars) goes through React state which might not hit every frame if not necessary.

Illustrative Diagrams: To better understand the architecture, below are two diagrams: one for the state machine of an AI session (to which the UI responds), and one for the event routing pipeline.

Figure: Session Energy State Machine (token generation flow). The UI adapts its feedback depending on the system’s state (charging, flowing, stalling, saturated, drained, or idle). For example, a Stalling state might trigger a warning indicator, whereas reaching Saturated could highlight a peak performance visual effect. This state diagram guides the UI’s conditional behaviors and ensures consistency with backend processing stages.

Figure: Energy Event Routing between Orchestrator and UI (via WebSocket). Outgoing events from the backend carry telemetry (token streams, energy metrics) to the UI, while incoming messages from the UI carry user commands back to the orchestrator. This two-way message flow ensures the interface and engine remain tightly synchronized. All communication occurs on localhost, keeping data within the user’s device.

To summarize, the UI architecture is event-driven and state-synchronized. The component hierarchy provides a clear structure for rendering, while the centralized state and WebSocket event loop provide a robust mechanism for real-time updates. Thanks to the local-first approach, latency is minimal and the UI can truly function as an “oscilloscope for AI thought” – immediately reflecting every pulse and pause of the underlying model in a visual and interactive way.

Implementation Patterns (React & Three.js Integration)

Having described what the UI does and how it’s structured, we now delve into how to implement these features. This section gives concrete examples and best practices for building WIRTHFORGE’s UI, focusing on React for UI structure and Three.js for the custom visualizations, all while keeping performance and accessibility in mind.

Reactive UI with Functional Components: We use React (with JSX and ES6+) as the framework for building the UI. All components are implemented as functional components with hooks (e.g., useState, useEffect, useContext) for state and side-effects. This approach fits our needs because it makes it easier to reason about state changes and side effects like subscribing to WebSocket events.

For global state management, we integrate a Context or Redux store. For instance, we might have a StoreProvider that holds the application state and provides dispatch methods. Components can either connect via context or use a useSelector hook to pick the parts of state they need. We ensure that updates to state are as granular as possible – if only the energy metric changed, we update just that, and only components depending on it will re-render.

Example: A MetricsContext could provide { state: { totalEnergy, tokenRate, ...}, dispatch }. The <MetricsPanel> component uses useContext(MetricsContext) and reads state.totalEnergy and state.tokenRate. It will re-render when those values change, but not on other state changes (like UI theme changes, which would be in a different slice). This way, we minimize unnecessary renders.

Asynchronous Data Handling: We treat WebSocket messages not as UI events directly, but as data updates. A common pattern used is to have a single event handler that dispatches actions. For instance, something like:

// Pseudo-code for WebSocket event handling
socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  switch(data.type) {
    case 'TOKEN_STREAM':
      dispatch({ type: 'ADD_TOKEN', payload: data.payload.token });
      break;
    case 'ENERGY_UPDATE':
      dispatch({ type: 'UPDATE_ENERGY', payload: data.payload });
      break;
    // ... handle other types
  }
};


This way, all state changes flow through our dispatch, making them trackable and easier to debug (we could integrate Redux DevTools or our custom logger to record all such actions). It also means that if multiple events arrive in the same tick, React will batch the state updates automatically (in modern React, setState calls or dispatch calls in an event loop tick are batched).

Integrating Three.js for Visualizations: Many of the “energy” visual effects are best rendered with WebGL for performance (e.g. thousands of particles, glowing lightning, etc.). We use Three.js as a high-level library to manage WebGL context and objects. Integrating Three.js into React can be done in two ways:

Using React Three Fiber (a React renderer for Three.js) – which allows writing Three.js scene as part of JSX. This can be elegant and keep everything in React’s declarative paradigm, but introduces an additional abstraction.

Using imperative integration – where a React component manually creates a Three.js scene and updates it.

We choose the latter for critical visuals to maintain fine-grained control over performance. The pattern is: a component renders a <canvas> element in JSX and, after it mounts, we instantiate a Three.js WebGLRenderer on that canvas and run an animation loop.

For example, a simplified LightningBolt visualization component might look like:

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

function LightningBoltVisual({ tokenSpeed }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const boltRef = useRef(null);

  useEffect(() => {
    // Initialize Three.js scene and camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(/* ... appropriate params ... */);
    camera.position.z = 10;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(300, 150);

    // Create a geometry for the lightning bolt (simplified as a line)
    const material = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
    const points = [ new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0) ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const boltLine = new THREE.Line(geometry, material);
    boltRef.current = boltLine;
    scene.add(boltLine);

    // Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      // Example animation: vary the line thickness or position based on tokenSpeed
      const speed = tokenSpeed || 0;
      boltLine.material.color.set(speed > 5 ? 0xff8800 : 0xfbbf24);  // change color if speed high
      // (In practice, we'd update more geometry to make bolt jagged, animate flicker, etc.)
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, [tokenSpeed]);

  return <canvas ref={canvasRef} width={300} height={150}></canvas>;
}


In this snippet, we manually handle rendering. The tokenSpeed prop (tokens per second) might come from the state and cause the effect to change color based on speed. A more advanced implementation could dynamically adjust the geometry to create a jagged bolt shape and update it every few frames to simulate flicker.

The key is that this approach does not rely on React’s render cycle for each frame of the animation. We are manually using requestAnimationFrame. The React component only re-renders if tokenSpeed prop changes structurally (e.g., goes from null to number or we explicitly make it a state that triggers re-render). Typically, we’d keep such props stable and feed in values via a Ref or external state to avoid extra renders. In practice, if the token speed is updating extremely frequently, we might incorporate that into the Three.js loop via a ref rather than as a React prop.

CSS-in-JS and Theming: For the regular DOM elements (non-canvas parts of the UI), we utilize CSS-in-JS (like styled-components or Emotion) to apply the design system styles. This allows dynamic styling (e.g., theme switching) at runtime easily. We generate a theme object from design tokens, and use a ThemeProvider so styled components can refer to theme.colors.primary, etc. This way, if we ever support user-customizable themes or switch to a high-contrast mode, we can swap out the theme object.

For performance, most styles are static or theme-driven, so we avoid per-frame style recalculations. We also use utility classes or inline styles for very simple repetitive styling to reduce the overhead of styled-components where appropriate (e.g., a dozen small elements might just use a CSS class defined once in a stylesheet for a slight performance gain).

Ensuring 60 FPS in React: Outside of the Three.js visuals, the React components themselves should avoid doing too much work on updates. We follow these patterns:

Memoization: Use React.memo for components that often receive the same props so they skip re-rendering. For example, if we have a list of token elements, and we append one token at the end, we can memoize each token item so that only the new token component renders and others don’t diff.

Avoid expensive computations in render: If something like calculating a layout or heavy algorithm is needed, we do it outside of React (either precompute in the backend and send results, or compute once and reuse). An example: computing a token probability distribution visualization could be heavy; better to compute those values in the backend (WF-TECH-003 or WF-FND-002 define how DI and entropy are computed) and send the ready-to-use numbers to the UI
GitHub
GitHub
.

Batch DOM updates: When multiple pieces of state change in the same frame, React will batch them (especially under Concurrent Mode in the future). We ensure our event handlers don’t force sync updates one by one. Also, if we know a sequence of events is coming (like a burst of token events), we could temporarily batch updates or use a single requestAnimationFrame to process them together, as mentioned.

Example – MetricsPanel Implementation: Earlier we described a MetricsPanel in concept. Here’s how it could be implemented using styled-components with our tokens:

import React from 'react';
import styled from 'styled-components';

const PanelContainer = styled.div`
  background: ${props => props.theme.colorPalettes.system.surface};
  color: ${props => props.theme.colorPalettes.system.text};
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colorPalettes.system.border};
  border-radius: 8px;
  width: 200px;
`;

const MetricValue = styled.div`
  font-size: ${props => props.theme.typography.sizes.xl};
  font-weight: ${props => props.theme.typography.weights.semibold};
`;

const MetricLabel = styled.div`
  font-size: ${props => props.theme.typography.sizes.sm};
  color: ${props => props.theme.colorPalettes.system.textSecondary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

function MetricsPanel({ totalEnergy, tokenRate }) {
  return (
    <PanelContainer>
      <MetricValue>{totalEnergy.toFixed(1)} EU</MetricValue>
      <MetricLabel>Total Energy</MetricLabel>
      <MetricValue>{tokenRate.toFixed(2)} TPS</MetricValue>
      <MetricLabel>Tokens/sec</MetricLabel>
    </PanelContainer>
  );
}

export default MetricsPanel;


This component uses the theme (which is derived from our design tokens) to apply styles. It displays two metrics: total energy and tokens per second. On each render it formats the numbers. If these values update 60 times a second, the component will re-render at that rate, but it’s a very minimal render (just updating text content). The .toFixed calls are trivial and will not bog down the UI. We would ensure this component only re-renders when the relevant props actually change (React by default will do that if the parent passes the same values it won’t re-render; if using a context, we might use React.memo around it).

Testing and Debugging: During implementation, we would use React’s Developer Tools and performance profiling to ensure that updates are happening as expected. If we see dropped frames, we can identify which components are causing it. For example, if rendering the entire token list every time is slow, we implement windowing (only render last N tokens or use a virtualization library). The design already tries to mitigate that by focusing on streaming visuals rather than long chat history (the user could scroll, and we reuse DOM elements or render a summary for off-screen tokens).

JSON Schemas and TypeScript: The implementation is aided by the schemas from the foundation. We likely use TypeScript in the UI project to define types for the events and state. For instance, we’d have TypeScript interfaces corresponding to the JSON schemas from WF-FND-003 (API schemas)
GitHub
GitHub
. This catches errors like trying to access a field that might not exist, and makes it clear what data we can expect. We also validate data at runtime in development mode: e.g., run incoming messages through a JSON schema validator (perhaps only in dev builds) to catch any deviations from the spec.

To illustrate, the accessibility requirements are also captured in a schema. We incorporate those into development as a checklist. Here is an excerpt of the accessibility schema focusing on main sections, which we use to verify completeness:

{
  "required": ["wcagCompliance", "colorContrast", "textAlternatives", "keyboardNavigation", "screenReader"],
  "properties": {
    "wcagCompliance": { /* ... ensures level "AA" and lists guidelines ... */ },
    "colorContrast": { /* ... defines min contrast ratios ... */ },
    "textAlternatives": { /* ... requires alt text for images/diagrams/icons ... */ },
    "keyboardNavigation": { /* ... requires focus order, shortcuts, trapFocus ... */ },
    "screenReader": { /* ... requires landmarks, heading structure, announcements ... */ }
  }
}


Source: WF-FND-001 Accessibility Spec Schema
GitHub
GitHub
. This outlines the areas the UI must cover. During implementation, we use this as a guide—for example, under “textAlternatives” it mandates that all images, diagrams, icons have textual alternatives, which we then double-check in our components (every <img> has an alt, every <canvas> that conveys info gets an ARIA role or is described elsewhere, etc.). The schema’s “keyboardNavigation” section reminds us to implement logical tab order and focus traps for modals. We can even write unit tests that simulate keyboard navigation and assert the focus order matches an expected sequence of element IDs.

Example – Accessibility in Implementation: Suppose we implement a custom component like <ChatInput> (a text box for the user prompt with a fancy send button). We ensure:

It uses a native <input type="text"> for full screen reader and keyboard support.

The label “Enter prompt” is either a <label> linked to it or an aria-label if a visual label is not present.

Keyboard shortcuts: maybe “Ctrl+Enter” to submit—if so, we add an appropriate hint in the UI and documentation.

Focus management: when the user hits Enter and the prompt is sent, focus might remain in the input for convenience (or we move it depending on UX decisions).

High contrast: we check that the text color and background of this input meet contrast standards (they would, since we use token colors which are chosen to meet them).

Motion: not much motion for an input, but if we had an animated send button, ensure it’s not overly distracting, etc.

We would perform similar audits for each component. For the dynamic visualization components, we give thought to how (or if) a screen reader user can get equivalent information. Possibly we provide a textual log of events (e.g., “Token 1 generated… Token 2 generated…”) in a visually hidden region, or we simply rely on the numeric metrics which are exposed as text. This is something we might refine in WF-UX-004 (Accessibility doc), but we lay the groundwork here by including those attributes.

Summarizing Implementation Best Practices: To conclude this section, here are some key patterns we enforce in code:

Use functional, declarative code for UI wherever possible; drop down to imperative (e.g., manipulating canvas or DOM directly) only for performance-critical drawing.

Keep computation out of the render path. Pre-calculate or memoize expensive values.

Maintain a single source of truth (the state store) and derive all UI from it. Avoid duplicating state in multiple places (which could get out of sync).

Use web workers in the future for any heavy tasks that might come (for example, if we had to compute a big graph layout on the client, we'd offload it).

Test on realistic hardware (including low-end devices if possible) to ensure the 60 Hz goal is met, adjusting implementation if not (e.g., simplifying visuals or reducing frequency of updates under heavy load).

Follow the accessibility checklist rigorously: no component is done until it’s accessible.

By adhering to these patterns, we ensure that the WIRTHFORGE UI not only works correctly and efficiently but is also maintainable and scalable for future features.

Accessibility & Compliance

Accessibility is a first-class concern in WIRTHFORGE’s UI. We design and implement features to be usable by people of varying abilities and to meet or exceed WCAG 2.2 AA standards. Below we detail how the UI ensures inclusivity:

Perceivable UI (Visual Contrast & Alternatives): All text and essential UI elements use colors that meet contrast requirements against their backgrounds (generally aiming for at least 4.5:1 contrast ratio, often higher)
GitHub
. Our dark theme uses light text on dark backgrounds with ratios often above 7:1 for body text, and our iconography avoids color-alone signaling (icons use shape + color so that even color-blind users can distinguish, e.g., the “constructive vs destructive interference” is indicated by shape pattern in addition to purple vs red hue
GitHub
). For any information conveyed with color or animation, we provide a redundant cue: e.g., a stall is indicated by a color change and an icon or text label “Stall”. All images and diagrams have descriptive alt text or an accompanying description. If a visualization is too complex to describe fully in alt text (like the interference pattern), we offer an alternative view or summary in text form (for instance, “Models out of sync: interference detected” could be a live text update).

Operable UI (Keyboard Navigation & Input): Every interactive element is reachable and operable via keyboard alone. We ensure a logical tab order that flows with the visual layout. We have defined focus states using the tokens (a gold focus ring to match the theme and be clearly visible)
GitHub
. Complex components like sliders or canvas-based controls have keyboard equivalents (e.g., arrow keys to increase/decrease a slider, or additional controls to trigger canvas actions). We also implement keyboard shortcuts for efficiency: for instance, pressing P might toggle pause/resume (with an obvious indicator in the UI of that shortcut), and pressing ? could open a help dialog listing all shortcuts. Focus is managed: when dialogs open, initial focus goes to the first focusable element in the dialog, and focus is trapped inside the dialog until it’s closed (satisfying the focus management guidelines). We test this behavior to make sure no elements are accidentally focusable in the background.

Understandable (UI Feedback & Labels): The UI uses clear labeling and feedback so users understand what is happening. Every control has a clear label (either visible or via tooltip/aria-label). Dynamic content updates (like “Level Up!” or error messages) are presented in a predictable area and, if critical, also announced via ARIA live regions. We stick to conventional UI patterns where applicable (e.g., links look like links, buttons like buttons) to meet users’ expectations. Instructions and messages are written in simple language. Where the app uses unique terminology (like “Energy Units (EU)” or “Resonance”), these are explained in-context (perhaps with an info icon or in a glossary section of the app).

Robust (Compatibility & Testing): We ensure the app works across major browsers and with assistive technologies. We specifically test with screen readers (NVDA on Windows, VoiceOver on Mac) and have at least three screen reader compatibility in our criteria
GitHub
. For screen readers, we provide helpful ARIA attributes: landmark roles (banner, main, contentinfo) to delineate regions
GitHub
, headings to allow quick navigation (each main section has an <h2> or similar), and ARIA-live for dynamic updates (e.g., an aria-live="polite" region for non-urgent updates like “Energy 50%” and aria-live="assertive" for urgent ones like “Connection lost!”). We use ARIA roles judiciously to enhance semantics (for instance, the token output area might be a <div role="log" aria-live="polite"> so screen readers know to read new entries).

Reduced Motion & Customization: Users who indicate a preference for reduced motion (via OS settings or an in-app toggle) get a static (or simplified) experience. We implement CSS prefers-reduced-motion media queries to turn off certain animations by default. Additionally, our settings allow toggling individual effects. For example, a user could turn off the background particle field but keep the lightning animation if they’re okay with small motion but not lots of moving bits. We ensure no essential information is lost if animations are off: animations are purely decorative or complementary. If the lightning bolt wasn’t animated, the user still sees a bolt icon and maybe a numeric indicator of speed, so they get the information in another form.

Continuous Accessibility Testing: Every new UI feature goes through an accessibility review. We maintain automated tests using tools like axe-core to catch issues (like insufficient contrast or missing ARIA labels) in development. We also plan targeted testing with users (or at least with developers simulating scenarios using screen readers and keyboard-only operation). Any issues found are tracked and addressed as first-tier issues, not postponed, to avoid accumulating “accessibility debt.”

Compliance Documentation: We document how each WCAG success criterion is met. For example, for 2.1.1 Keyboard (no trap): we note that all functions are accessible via keyboard and we tested trapping behavior in modals. For 1.4.3 Contrast: we list our color pairs and their contrast ratios, showing compliance (many from our tokens exceed the 4.5:1 requirement). This documentation not only helps internal development but would also be important if we ever seek external certification or need to prove compliance.

Finally, accessibility is not just about meeting checklists but about providing a good user experience for everyone. WIRTHFORGE’s aim of making AI visible and understandable extends to users with disabilities: for instance, a blind user should be able to hear the description of the AI’s “light show” and get value from it, and a user who cannot use a mouse should still be able to orchestrate multi-model experiments through keyboard commands. By integrating these considerations from the start (as we have in this WF-UX-001 spec), we set a strong precedent that carries through the rest of the UX series.

Post-Generation Protocol

Documentation Validation: Verify that all information in this document is consistent with the source assets in the repo. This includes checking that the JSON schema excerpts (design tokens, specs, accessibility) match the latest in assets/schemas, and diagrams reflect the current architecture. Update cross-references in the repository’s master index (doc-index) to include WF-UX-001.

Glossary Updates: Add any new terms introduced by this document (e.g. “Energy Orb”, “InterferenceOverlay”, “MetricsPanel”) to WF-FND-009 Glossary to maintain terminology consistency across documents. Ensure terms like “Energy Units (EU)” or “Council (multi-model ensemble)” are clearly defined.

Prototype & Demo Implementation: Following this spec, implement a prototype of the core UI (Level 1 features) to validate the architecture and design system. This should include a simple local backend stub generating token events, so we can test the 60 Hz rendering loop, component communication, and performance on a range of machines. Gather feedback from this prototype to inform any tweaks in the design before moving on.

Performance Audit: As part of WF-TECH-010 (Performance), conduct a performance review of the prototype UI. Use real device testing to measure frame rates, memory usage, and CPU usage. Ensure that the UI meets the 16.67 ms frame budget guideline under expected load (e.g., one model streaming, or two models if Level 2 is enabled). Identify any bottlenecks (if the rendering of a certain component is too slow, etc.) and address them (e.g., optimize canvas drawings, reduce DOM nodes) prior to full implementation.

Accessibility Audit: Before finalizing, run an accessibility audit aligning with the WF-FND-001 spec. This includes using accessibility testing tools and manual testing (with screen readers and keyboard navigation) on the UI to ensure that all interactive elements are reachable and labeled, color contrasts are sufficient, and dynamic content is announced properly. Any issues discovered should be logged and fixed or noted for follow-up in WF-UX-004.

Cascade Plan – Upcoming WF-UX Documents: With the foundation established in WF-UX-001, subsequent UX documents will build on this groundwork:

WF-UX-002: Progressive Levels & Gamification – Will design the user progression through the five levels of WIRTHFORGE (from basic lightning at Level 1 to orchestrating multi-model “councils” at Level 5). It will specify how the UI adapts at each level, gamification elements like points or achievements tied to energy usage, and the mechanisms for unlocking features
GitHub
GitHub
.

WF-UX-003: Energy Visualization & Real-Time Feedback – Will dive deeper into the visualization aspect, detailing the rendering techniques and visual elements introduced briefly here. It will ensure the visuals are scientifically grounded (no misleading animations) and cover additional effects like resonance celebrations and error state visuals
GitHub
GitHub
.

WF-UX-004: Accessibility & Inclusive Design – Will provide a comprehensive accessibility strategy and guidelines, expanding on what’s outlined in WF-UX-001. This will include detailed checklists, user testing plans for accessibility, and perhaps alternative interfaces for different needs (e.g., a simplified UI mode)
GitHub
.

WF-UX-005: Onboarding & User Education – Will focus on the initial user experience: tutorials, tooltips, and educational content to teach users how to interpret the energy visuals and use the system. Given WIRTHFORGE introduces novel concepts, this doc ensures users aren’t overwhelmed and learn by doing in a guided manner
GitHub
.

WF-UX-006: Performance Optimization & Responsiveness – Will outline strategies to keep the UI performant on various hardware (down to lower-end devices) and responsive to different screen sizes or multitasking scenarios
GitHub
. It may include adaptive degradation (e.g., fewer particles on slow GPUs) and touch on integration with WF-TECH-010 for monitoring performance in the field.

WF-UX-007: Error Handling & Recovery – Will detail the UX for error states and edge cases – e.g., what the UI shows if the model fails or if the local backend isn’t running – and how the user can recover
GitHub
. This ensures user trust by making even failure states transparent and navigable.

WF-UX-008: Social Features & Community Integration – Will consider features that allow sharing or community interaction (within the constraints of local-first). This might include exporting a session’s visualization as a video/image, or optional cloud sync for settings/achievements, done in a privacy-respecting way
GitHub
.

WF-UX-009: Advanced User Workflows – Will cover features for power users, such as advanced configuration panels, scripting or plugin interfaces in the UI, and workflow tools for managing multiple sessions or datasets
GitHub
. It ensures the UI can cater to expert needs without confusing casual users.

WF-UX-010: User Research & Continuous Improvement – Will establish how we gather feedback and data (telemetry, user studies) to continuously improve the UX
GitHub
. It will connect back to analytics (all local or opt-in) and methods to iterate on the UI post-launch as real users engage with WIRTHFORGE.

Security Review: Conduct a UI security review (in conjunction with WF-TECH-006 Security). Even though all is local, we review things like: the WebSocket interface should reject malformed messages (to prevent any possibility of code injection via the UI), the UI should sanitize any data it displays (even local data could be corrupted, e.g., if a model returns weird output, we display it safely), and any third-party libraries (React, Three.js, etc.) are up to date to avoid known vulnerabilities.

Changelog & Versioning: After finalizing this document and implementing its features, update CHANGELOG-WF-UX-001 with key additions/changes and increment the WIRTHFORGE UX documentation version. This helps track the evolution of the design system over time. All related assets (diagrams, schema files, code snippets) should be version-tagged or archived as needed for traceability.