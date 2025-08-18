WF-TECH-007 — Testing & QA

WF‑TECH‑007 — Testing & QA Strategy

🧬 Document DNA
Unique ID: WF-TECH-007
Category: TECH
Priority: P1
Development Phase: 1
Document Type: Testing Strategy & QA Plan

 

🔗 Dependency Matrix
Required Before: WF-FND-002, WF-FND-004, WF-FND-005, WF-FND-006 (foundation requirements for energy, events, progression, and governance); WF-TECH-001 (system architecture baseline)
Enables After: Launch readiness (final release QA certification); WF-TECH-009 (Performance Optimization & Tuning improvements)

 

🎯 Core Objective
Define a comprehensive testing strategy for the web-engaged local-core system that ensures 60 Hz performance fidelity and strict “energy-truth” validation
GitHub
GitHub
. This QA plan outlines a multi-layer approach covering the local core engine, the web UI, and their integration, guaranteeing that the platform runs smoothly in real time without regressions. All core WIRTHFORGE principles (local-first execution, deterministic energy mapping, robust 60 Hz performance under load) are upheld by exhaustive tests – from low-level unit checks to full end-to-end simulations. The ultimate goal is launch readiness: every new build must demonstrably meet performance targets and preserve the authenticity of the energy-based experience, or be automatically blocked and rolled back to protect users.

 

📚 Knowledge Integration Checklist (Quality Gates from Foundations)

Frame Rate Enforcement: Incorporate the 60 Hz frame budget constraint from WF-FND-002 and WF-FND-006 into performance tests
GitHub
. The test suite logs frame processing times and fails if any exceed 16.67 ms per frame
GitHub
, ensuring real-time responsiveness is never compromised.

Energy Truth Verification: Use the energy formula definitions from WF-FND-002 in test oracles (unit tests compute expected E(t) for known token sequences)
GitHub
. This validates that every visualized “Energy” value stems from actual measured signals – what you compute is what you see
GitHub
. Any deviation beyond acceptable tolerance (e.g. ±5% energy error
GitHub
) causes test failures.

Schema & State Compliance: Leverage WF-FND-004’s event schema and state machine specs to drive regression tests. For every JSON event type (e.g. startup_complete, energy.update, council.interference), tests validate the structure against the official schema
GitHub
. Recorded session logs (golden files of prior correct behavior) are replayed on new versions
GitHub
 to ensure no state transition or field deviates from the defined contract.

Feature Gating & Progression: Apply WF-FND-005’s progression policies to QA scenarios. Tests confirm that features meant for higher experience levels (e.g. multi-model “Council” interference visuals) remain inaccessible at Level 1, and unlock only per the defined progression rules
GitHub
. Simulated user progression and multi-model inputs verify that advanced features trigger only when permitted, ensuring no premature access and no regression in gating logic.

Core Invariant Verification: Following WF-FND-006’s governance checklist, the pipeline includes automated audits for core principle adherence. Each test run verifies the system remains local-first (no external cloud calls, no Docker use)
GitHub
, that performance invariants (60 FPS, memory within bounds) hold, and that logs contain expected entries confirming these safeguards
GitHub
. Any deviation (e.g. a test detecting a cloud URL or an average frame time >16 ms) results in an immediate failure – preventing releases that compromise fundamental guarantees
GitHub
.

Multi-Layer Test Strategy

To ensure quality across all components, testing is organized into multiple layers covering each subsystem and their interactions. The strategy spans from isolated unit tests of algorithms up to end-to-end tests exercising the entire user journey. Key test categories and frameworks include:

Unit & Integration Testing (Local Core)

Every core component of the local engine (the “Decipher” real-time loop, energy mapper, state machine, etc.) is covered by unit tests in an automated framework (using pytest for Python). These tests validate individual functions and classes against known inputs and outputs, ensuring the foundational logic is correct in isolation. For example, the energy calculation module is tested with predetermined token sequences and entropy values to verify the computed energy matches the theoretical formula from WF-FND-002
GitHub
. The state machine transitions (IDLE → CHARGING → FLOWING, etc.) are likewise unit-tested by simulating trigger conditions to confirm proper state progression and timing. Integration tests then combine these pieces: e.g. instantiating the full DecipherLoop and feeding it a stream of dummy TokenData to ensure that events emitted carry the correct aggregated data (total energy, rates, states) and adhere to schema. A simplified example of a Python integration test using pytest might be:

# Pseudocode: test that DecipherLoop processes tokens and emits correct energy events
import asyncio, json
from decipher_loop import DecipherLoop, TokenData
from jsonschema import validate, Draft7Validator

# Load the expected schema for an energy update event
schema = json.load(open("schemas/WF-TECH-005-energy-frame.schema.json"))
validator = Draft7Validator(schema)

async def run_decipher_sequence(loop, tokens):
    events = []
    loop.add_event_callback(lambda evt: events.append(evt))   # capture emitted events
    await loop.start_session()                                # initialize session
    for token in tokens:
        await loop.ingest_token(TokenData(**token))
        await asyncio.sleep(loop.frame_interval)              # wait one frame cycle
    return events

def test_energy_computation_and_schema():
    loop = DecipherLoop()  # using default config (60Hz)
    # Define a sequence of tokens with known characteristics for a deterministic energy outcome
    token_sequence = [
        {"content": "Hello", "timestamp": 0.0, "model_id": "gpt-4", "confidence": 0.9},
        {"content": "world", "timestamp": 0.1, "model_id": "gpt-4", "confidence": 0.9, "is_final": True}
    ]
    events = asyncio.run(run_decipher_sequence(loop, token_sequence))
    # There should be at least one energy.update event emitted
    energy_events = [e for e in events if e["type"] == "energy.update"]
    assert energy_events, "No energy update events emitted"
    for evt in energy_events:
        # Validate event schema compliance
        validator.validate(evt)
    # Assert the final total_energy matches expected value (computed via oracle formula)
    final_energy = energy_events[-1]["payload"]["total_energy"]
    expected_energy = 0.0  # (Compute expected based on known formula for test tokens)
    assert abs(final_energy - expected_energy) < 0.05, "Energy deviation >5% from expected"


In the above pseudocode, we attach a callback to capture events and use the JSON Schema validator to enforce correct structure. This approach ensures that as the core logic evolves, any divergence from expected output or schema (for example, missing a field or computing wrong energy due to a regression) will be caught immediately in CI. Integration tests also simulate error conditions: e.g. forcing an invalid token or an exception in the loop to verify that the system emits an appropriate error_event and continues running resiliently (no crashes or hangs). By building a rich suite of unit and integration tests, we create a safety net under the local core: any low-level bug or deviation from design principles (like energy formula or state handling) is detected early in development.

Golden-Run Replay Harness (Deterministic Regression Testing)

To guard against regressions over time, a golden-run harness replays recorded sessions and verifies the outcomes remain consistent. Using real data captured from known-good runs (or meticulously crafted test vectors), this harness feeds the exact sequence of inputs (tokens, timing, user actions) into the system and compares the new output to the expected output saved from the golden run. Deterministic components like the energy calculation and event sequence are asserted to match bit-for-bit (within tolerances) to earlier versions. For example, a golden file might contain a log of all energy.update events from a one-minute generation session at Level 1. After any code changes, the harness can inject the same token timing stream and use assertions that the resulting event stream is identical to the golden log (or differences are understood and intentional). This is particularly useful for schema regression: if a JSON schema changes, the golden-run test will flag mismatches, prompting either updating the expected output or recognizing an unintended break. According to the governance framework, every schema evolution should pass a full replay test to ensure backward compatibility or at least graceful handling of old data
GitHub
. The golden-run harness is implemented as a standalone test driver (e.g., a pytest test or script) that can load JSON files of recorded events. It provides deterministic results by using fixed random seeds and simulated time progression. Such replay tests also double as performance baselines – we measure if the execution time for the golden run stays within limits (no new slowness introduced). In practice, maintaining a library of golden logs for different scenarios (normal single-model session, multi-model “Council” session, extreme burst of tokens, etc.) greatly strengthens confidence that changes do not cause regressions across the diverse behaviors of the system.

Frame-Budget Performance Testing (60 Hz under Load)

Performance tests focus on the real-time loop’s ability to meet the 16.67 ms per frame budget under various load conditions
GitHub
. We create automated scenarios to stress the system: e.g. simulate a burst of 10 tokens arriving in a single 50 ms window to model a rapid output scenario
GitHub
. Instrumentation in the Decipher loop measures the processing time of each frame (from start to event emission). The performance test suite asserts that frame times do not exceed the budget (or only do so within an acceptable overrun rate)
GitHub
. If any frame exceeds the limit, it’s recorded as a test failure, since it indicates a dropped frame or lag that could be perceptible to the user. We also test adaptive degradation: under extreme loads, the system is expected to sacrifice non-essential work (like particle effects or detailed logging) to stay within budget
GitHub
. The tests verify this behavior by checking internal flags or counters – for example, if 60 Hz begins to slip, does the loop set a “degraded_mode” flag or drop tokens as expected? One methodology is to run a high-load scenario and confirm that the frame_overruns counter in the DecipherLoop remains below a threshold (meaning the system successfully avoided most overruns). Additionally, performance tests include throughput and latency metrics: measuring end-to-end latency from a token generation to the corresponding energy event sent out. These can be logged and asserted to remain under target (e.g. median <5 ms, p99 <10 ms as per requirements
GitHub
). The testing harness might generate a simple timing report or graph; for instance, logging every frame’s duration and then using a script to plot these values
GitHub
. This helps developers visually identify if frame times are creeping towards the limit or if there are periodic spikes. Over multiple runs and possibly on multiple hardware profiles, we ensure the loop reliably meets the 60 FPS goal on supported systems. The outcome of this suite is a performance benchmark report (often automated) that becomes a release gate – if a code change causes a significant performance regression (e.g. average frame time increases by more than, say, 10%), the issue is flagged and must be resolved before release.

Schema Compliance & Data Contract Tests

All data contracts (JSON schemas for events, API payloads, etc.) have corresponding tests to ensure compliance and stability. We maintain JSON Schema files (such as WF-TECH-005-energy-frame.schema.json and WF-TECH-005-events.schema.json) for the structured events emitted by the system. The testing framework uses these schemas as follows: whenever an event is produced in a test (unit or integration), we run a validation step using a JSON Schema validator library to confirm the event’s format matches the contract
GitHub
. This quickly catches any missing fields, type mismatches, or violations of allowed values. In addition, we have schema regression tests that are triggered when schemas change. Using the golden-run logs or synthetic test vectors, we feed events from the old schema version into the new code to ensure they are either accepted or transformed properly. If a schema change is intended to be backward-compatible, these tests confirm that older event files can still be parsed or imported without error. If a schema change is breaking (which should be rare and flagged as a major version bump), the regression test suite will clearly indicate what breaks, so developers can provide migration or announce the change. This aligns with the governance rule that any breaking change requires full awareness and justification
GitHub
GitHub
. By automating schema checks, we enforce a strict contract: front-end and back-end remain in sync. The tests also extend to API schemas (if the local core exposes any HTTP API as part of TECH-001/006) – any contract with external modules or plugins is tested with both expected valid data (which must pass) and invalid data (which the system should reject gracefully). These tests essentially function as an early warning system for integration issues, preventing a situation where the UI and core drift apart in terms of expected data formats.

Visual-Truth Validation Suite (Energy Display Accuracy)

Ensuring visual accuracy – that the UI’s energy visualization truly reflects the core’s data – is a unique challenge. Rather than rely solely on pixel-by-pixel screenshot comparisons (which can be flaky and sensitive to rendering differences), we prioritize statistical and state-based validation of the visuals. The core idea is to verify that for any given core output (energy value, state), the UI has received it and updated its state accordingly. Tests in this suite launch the WIRTHFORGE UI in a controlled environment and simulate backend events to inspect UI state changes. For example, using a headless browser, a test can inject a known sequence of energy.update events (either by running the real core in test mode or by stubbing the WebSocket messages) and then query the DOM to ensure the energy bar or visualization reflects the expected value. If the energy total reaches a certain known threshold in the events, the UI might change color or trigger an animation; the test can check for the presence of the corresponding CSS class or element attribute. Another aspect is consistency over time: as energy decays or increases, the UI should do so smoothly. We capture a series of UI states after each frame and verify the numeric progression matches the input sequence. This approach validates the “energy-truth” principle end-to-end: the numbers coming from the core (which we trust via unit tests) are faithfully represented in the UI. Where possible, we integrate existing accessibility/visual regression tools (like axe for accessibility or image snapshot libraries) to catch glaring visual issues – e.g. an element that should appear when energy is high is not visible. However, due to the dynamic nature of the visuals (60 FPS changes), a more statistical validation is effective: e.g. ensure the average energy value displayed over a test run equals the average from the core’s data (within a tolerance). For initial development, focusing on these state-based validations ensures the visual logic is correct. Finally, as a sanity check, the suite includes a few manual review hooks – for instance, after a major UI change, the test can save a short recording or sequence of screenshots of the energy visualization responding to a known token input. A human reviewer can verify this “reference visualization” looks correct (matching design specs from WF-FND-002’s visual guidelines). Over time, such references can also be automated by comparing them to stored good snapshots if the visuals are simple enough. In summary, the visual-truth suite guarantees that for every joule of energy computed, an equivalent flicker of light or motion is seen on screen – preserving the fidelity of the experience.

Web UI Automated Testing (Playwright/Cypress)

The web-based user interface undergoes end-to-end automation using modern web testing frameworks (such as Playwright or Cypress). These tests simulate user behavior in the browser and assert that the application responds correctly. Key user journeys are encoded as test cases: for example, starting a new AI generation (prompt submission) should cause the UI to enter a “charging” state, then progressively show energy flowing at 60 Hz, and finally reach a “drained” or completion state when the generation ends. Using Playwright in a headless browser, we can automate this scenario:

// Using Playwright to test that energy visualization appears upon generation
const { test, expect } = require('@playwright/test');

test('Energy visualization responds to AI generation', async ({ page }) => {
  await page.goto('http://localhost:3000');  // Launch local WirthForge UI
  await page.click('button#start-prompt');   // Simulate user clicking "Start"
  await page.fill('textarea#prompt-input', 'Hello world');  // Enter a prompt
  await page.click('button#submit-prompt');  // Submit the prompt to start generation

  // Wait for energy visualization element to appear
  await page.waitForSelector('.energy-visual', { state: 'visible', timeout: 5000 });
  // After some frames, energy should rise above 0
  const energyValue = await page.$eval('.energy-value', el => parseFloat(el.textContent));
  expect(energyValue).toBeGreaterThan(0);

  // Ensure the UI shows flowing state (e.g., a CSS class .state-FLOWING is applied)
  const stateClass = await page.getAttribute('#energy-container', 'data-state');
  expect(stateClass).toBe('FLOWING');

  // If the test framework supports waiting for events, we could also listen for a specific event.
});


In this pseudocode, the test automates a user starting a prompt and then checks that the energy visualization became visible and the energy value is non-zero (indicating that the backend’s events are being reflected). It also checks for a state indicator (like a data attribute or class corresponding to the FLOWING state). We would include additional assertions, such as making sure that after the generation completes (perhaps waiting for an idle state or a final message), the UI transitions to a “drained” or reset state. We also automate tests for UI controls and settings – e.g. toggling a setting that limits frame rate to 30 (if such exists) and verifying the app adjusts accordingly, or enabling a “performance mode” toggle and seeing fewer visual effects (which can be inferred from DOM changes or lower CPU usage measurement if accessible). Cypress can similarly drive the UI and even intercept network/websocket messages; for instance, we could stub the WebSocket to feed predefined events to the UI for testing edge cases (like an interference event from a Council scenario) without needing the full backend running. These browser-based tests ensure that from the user’s perspective, everything functions and looks as expected: buttons respond, the correct visual elements appear in reaction to events, and no client-side errors occur during the process (the tests can fail on any console error, indicating a JavaScript exception that needs fixing). In addition, we incorporate accessibility testing in this phase: using tools like Axe or Playwright’s accessibility snapshot to verify that the UI meets basic accessibility criteria (proper ARIA labels, contrast ratios, etc., per WF-FND-002 guidelines). This holistic UI automation not only validates functionality but guards the user experience – if a change inadvertently breaks the UI flow or visuals, the automated tests will catch it before any user does.

Local Core–UI Integration Tests (End-to-End)

Beyond testing the core and UI in isolation, we perform integration tests that cover the end-to-end flow between the local core (Decipher engine) and the web UI. This typically involves running a headless instance of the local core (or a simulated stub of it) and the web application together in a test environment, then driving a scenario from start to finish. For example, an integration test might spin up the WebSocket server (as implemented in WF-TECH-003) and attach the Decipher loop to it, then launch a headless browser for the UI. The test script would then cause a prompt to be submitted through the UI, which triggers the core to start processing tokens (here we can either use a real local model if lightweight or stub the model to emit a predetermined token stream). We then observe the browser for the expected results: energy values updating in real-time, correct sequence of events displayed (perhaps the UI logs events or we expose a test-only hook to get the last received event). This validates the contract and timing between the back end and front end in a realistic manner. For instance, an integration test will catch if the UI is expecting an event field that the core hasn’t sent (schema mismatch) or if network latency causes any buffering issues. It can also test behavior on network disruption: we simulate the WebSocket disconnecting mid-stream (close the socket from the test side) and confirm the core either pauses or continues gracefully and the UI shows a “disconnected” status without crashing
GitHub
. Then we reconnect the socket to see if the session can resume or if a new session starts cleanly. Such tests ensure robustness in real-world conditions like intermittent connectivity (even though everything is localhost, the handling of disconnects is crucial). Another integration scenario is multi-model testing: if the system supports launching multiple AI models (the “Council”), we can instantiate two dummy model feeds that both send tokens to the core. The integration test verifies the core aggregates these (perhaps producing council.interference events) and the UI correctly visualizes combined energy or interference patterns. This level of testing is where we validate that all pieces work together: the orchestrator triggers, Decipher loop, WebSocket transport, and UI rendering are in sync. We also monitor performance in these tests – for example, ensure that running the full stack for 30 seconds doesn’t lead to any frame dropping in the UI (Playwright can measure animation frame rates or we can embed a small JS timing snippet in the app during test). Memory leaks or lingering processes are checked as well (after the test, the core process should terminate cleanly, etc.). These end-to-end tests, while heavier, usually run in CI on every merge or at least nightly, and are invaluable for catching integration issues that unit tests can’t.

Test Coverage & Requirements Matrix

To summarize the coverage, the following matrix maps key quality requirements to the tests that verify them, along with the reference standards:

Quality Requirement	Validation Method	Reference Source
60 Hz Frame Rate (16.7 ms budget)	Performance test replays bursty token streams; asserts no frame exceeds 16.67 ms (or minimal overruns)
GitHub
. Logs frame durations and triggers failure if sustained lag occurs.	WF-FND-002 real-time constraint
GitHub
; 60 Hz budget spec
GitHub

Energy Output Fidelity (±5%)	Golden-run oracle tests on energy calculations; feed known token sequences and compare computed total_energy against formula-derived expected (fail if error >5%)
GitHub
.	WF-TECH-005 performance criteria
GitHub
; Energy formula definition
GitHub

Schema Compliance (All Events)	Schema validation on every emitted event in tests; schema regression suite replays old event logs on new schema versions to catch breaking changes
GitHub
.	WF-FND-004 event schema contract
GitHub
; Governance req (no breaking change without version bump)
GitHub

UI Energy-Truth Consistency	End-to-end tests inject core events and read UI state (DOM) to ensure displayed values match backend data for energy, state, etc. Statistical validation of visual output vs. core output over time.	Energy metaphor 1:1 mapping
GitHub
; WF-FND-006 invariant (visuals reflect compute)
GitHub

Feature Gating & Progression	Progression tests simulate user leveling; verify advanced event types (e.g. council.resonance) not emitted or acted on until appropriate level achieved. Also UI elements for locked features remain hidden.	Level gating policies
GitHub
 (no unlocking without criteria); multi-model interference spec
GitHub
 (Council features)
Local-First & Security	Automated audit test scans for any external calls (e.g. no HTTP requests during core tests), checks config flags (no Docker), and confirms startup logs report “local mode”
GitHub
. Also sandbox tests ensure experimental modules can’t alter main data.	WF-FND-006 core invariants
GitHub
 (local_core true, allow_docker false); Audit checklist
GitHub
 for startup logs
Fault Tolerance (No Crash on Error)	Error injection tests: feed malformed token or kill model mid-run, assert system emits an error_event and continues or resets gracefully (no unhandled exceptions). UI integration tests confirm an error banner or message is shown for the user.	Decipher resiliency design
GitHub
 (catch exceptions, continue loop); WF-FND-006 guideline (no feature should break core loop)
Performance Scaling (Tier Profiles)	Run performance tests on varied resource profiles (emulated low-tier vs high-tier): assert that frame rate is maintained or degrades gracefully on lower specs (e.g. degraded_mode activates). Ensure high-tier can utilize extra capacity (e.g., more models, still 60 Hz).	WF-FND-002 degraded mode triggers
GitHub
; Tier-based policies (e.g., limit concurrency on low-tier)
GitHub

Logging & Audit Trail	Log inspection tests: after running a full session, parse log output to ensure critical events were logged (prompt start, session end, any errors, feature toggles). Verify log format matches spec and includes timestamps/IDs.	WF-FND-006 audit readiness
GitHub
 (principle compliance logged, data integrity checks); WF-TECH-013 (Logging spec – cross-ref for format)**

(References in the matrix point to the source of the requirement. Each test method is implemented in the suite as described above, ensuring that for every key requirement there is at least one dedicated test.)

QA Pipeline Automation

All the above tests are automated and integrated into a continuous integration (CI) pipeline, ensuring that quality gates are enforced on every code change. The QA pipeline is structured as follows:

Pre-merge Checks: When a developer opens a pull request, the CI system automatically runs the fast test suites – unit tests and schema compliance tests – which usually complete quickly. These must all pass (green) before the PR can be merged. This catches low-level regressions early (e.g., a change in energy calculation breaking a unit test or an event missing a field). Code coverage is measured at this stage, and if it falls below an agreed threshold (for example, below 90%), the pipeline can flag this for review, encouraging the team to add tests alongside new code.

Integration & E2E Testing: On each merge to the main branch (or in nightly builds), the pipeline triggers the heavier integration tests: spinning up the core and UI and running the Playwright/Cypress suites, golden-run replays, performance benchmarks, etc. These tests may run in parallel on multiple virtual environments to simulate different scenarios (one environment might run a full end-to-end test with a simulated slow machine configuration). The results are collected and published – if any end-to-end test fails, the build is marked unstable. Critical failures here (like a reproducible desync between core and UI) result in an immediate rollback or hotfix before any release.

Pipeline Diagnostics & Artifacts: The QA pipeline is set to collect artifacts for debugging. For instance, if a visual validation test fails (perhaps the UI didn’t update correctly), the pipeline captures a screenshot or a short video of the UI at the moment of failure and attaches it to the test report. Similarly, if a performance test fails, the pipeline can save the frame timing log or the profile data. This helps developers quickly pinpoint the issue without needing to recreate it locally. The pipeline also stores the golden-run outputs and new outputs for comparison if a regression is detected, highlighting the diff (for example, showing the JSON event that mismatched).

Continuous Monitoring: Even after tests pass, the pipeline includes a monitoring step where a nightly job might run a long-duration test (e.g., simulate a 1-hour continuous session) to catch issues like memory leaks or performance degradation that don’t show up in short runs. Metrics from these runs (memory usage, CPU usage over time, frame stability) are plotted and compared to previous runs. Over the course of development, this creates a trendline so the team can see if the system is getting more efficient or if a certain change caused a slow creep in resource usage.

Automated Quality Gates: The CI is configured such that certain tests are blocking gates. For example, the schema compliance and unit tests must pass for code to merge. The full integration tests must pass for a build to be considered release-candidate. We also implement custom gates from the foundation invariants – e.g., an automated scan that ensures no disallowed dependencies are introduced (if someone accidentally imports a cloud SDK or Docker library, the build fails). Another gate might parse the log output from a test run and ensure that key lines (like “Local-core mode: ON” on startup) are present, as required by the audit checklist
GitHub
. Only when all gates are green can a release be cut.

This automated pipeline not only runs tests but also enforces the quality gates derived from the foundation docs. It provides rapid feedback to developers and a safety net for catching issues. The use of containerized test environments (or dedicated test machines for different tiers) means tests are run in consistent conditions. We also incorporate parallelization: e.g. run UI tests in parallel with performance tests to keep pipeline duration reasonable. A typical test pipeline might complete in a few minutes for PR checks (units) and perhaps 15-30 minutes for a full nightly integration run including performance analysis.

 

To illustrate, a simplified pipeline flow is:

Developer Commit → Unit/Schema Tests ✔ → Build Package → Integration & E2E Tests ✔ → Performance Benchmarks ✔ → [If all pass] Release Artifact + Deploy
                                                            ↓
                                               [If any fail] ❌ → Block release / auto-rollback


In practice, the “auto-rollback” here means the problematic change is not deployed and is flagged for fixing. We also tag each successful pipeline run with a version number and archive the results. This way, we maintain an audit trail of test results for each version – aligning with WF-FND-006’s emphasis on traceability and accountability.

Acceptance Criteria & Rollback Procedures

Before any version is deemed release-ready, it must meet explicit acceptance criteria confirmed by the QA tests and checks:

All Tests Green: Every test suite mentioned (unit, integration, UI, performance, regression) passes 100%. There should be 0 high-severity bugs open; any minor issues are documented with workarounds. Code coverage is at or above the acceptable threshold, indicating no significant untested code paths.

Performance Targets Met: The system sustains 60 FPS under typical usage on target hardware, without accumulating lag
GitHub
. Frame overruns, if any, are within the allowed rate (e.g. <5% of frames under normal load
GitHub
). Memory and CPU use are within expected bounds (no runaway usage over time). These are verified by the performance test reports and must meet or exceed the benchmarks established in earlier releases.

Energy Accuracy & Consistency: All energy computations and visualizations adhere to the “energy-truth” standard – tests show energy values are within tolerance (no anomalies like negative energy or spikes that don’t correspond to token activity). The end-to-end tests confirm the UI feedback is consistent with core data for complete user flows.

No Regressions in Core Behavior: Golden-run replays produce matching outputs. If any differences are found, they are understood (e.g., due to intentional improvements) and explicitly approved. Importantly, no core principles are broken: for instance, tests confirm that even after changes, the system still operates fully offline (no surprise network calls), and the deterministic loop timing is intact.

Audit Trail & Logging: The system generates the required audit logs (at least in debug mode during testing) for key events. For example, on startup, a log line confirming local mode and frame rate constraint is present
GitHub
, and on errors, proper error logs are emitted. The acceptance review includes checking a sample log to ensure it can support traceability. This ties into acceptance that the system is not only working but is observable and debuggable.

Once these criteria are satisfied, the release can be delivered. However, as a final safeguard, we define rollback procedures to quickly revert if an issue slips through or if a deployment goes awry:

Automated Rollback on Failure: If a critical issue is detected post-release (for example, telemetry or user reports indicate a crash or a severe performance regression that somehow passed tests), the system is designed to allow rolling back to the previous stable version. Since WIRTHFORGE runs locally, this is handled by the installer/updater: the last known good build is kept cached. An automated script (or the updater’s logic) can uninstall or override the current version with the prior one. The QA pipeline can facilitate this by always retaining the last artifact and having a signed package ready to deploy as a “hotfix revert.”

Feature Flag Kill-Switches: For new features that are risky, we include feature flags that can be toggled off remotely or by the user. In a rollback scenario where the core issue is isolated to a specific feature (say the new Council visualization), the team can advise users or push a config update to disable that feature while a fix is prepared. This is a softer rollback that doesn’t require downgrading the whole system but achieves immediate risk mitigation.

Emergency Patch Pipeline: We maintain an expedited pipeline path for emergency fixes or reverts. If a rollback is needed, a special pipeline job can take the last stable commit, bump a tiny version (or use the same version number with a build metadata increment), and publish it as an update. This process is automated to trigger within minutes of the decision to rollback. The governance framework dictates that if any core invariant is compromised by a release, an immediate fix or rollback is executed
GitHub
 – our tooling supports this by making it one command (or button click) to deploy the previous version.

Database/State Rollback: Though most state is ephemeral or user-driven, if we introduced a migration in a new release (for example, changed the format of a stored file or user profile data), the rollback procedure includes handling that. Ideally, migrations are backward-compatible or we write a downgrade script. The QA plan includes testing of rollback scenarios: we simulate an upgrade and then a rollback to see if the application still functions (no corrupted user data, etc.). For instance, if a new version adds a field to the local database, rolling back might ignore that field but should not crash. These scenarios are tested in a staging environment.

User Communication: Part of QA’s responsibility in rollback is ensuring clear messaging. The application could have a mechanism to notify the user if a rollback occurred (“Reverted to previous version due to an issue with the latest update”). While not purely a technical test, verifying this message and procedure (even if via manual QA) is on our checklist so that a rollback event doesn’t confuse or alarm users unnecessarily.

By planning and automating these rollback procedures, we make sure that even in the worst case – a bug slipping through – we can preserve the user experience by quickly restoring a stable state. This final layer of safety, combined with rigorous testing up front, completes the Testing & QA strategy. With these measures in place, WIRTHFORGE can evolve rapidly and confidently, knowing that any deviation from its core promises will be caught by tests or swiftly corrected, thereby maintaining the trust and “magic 60 Hz experience” for all users.