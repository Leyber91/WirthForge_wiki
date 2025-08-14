# WF-TECH-002 – Local AI Integration (Summary)

- Specifies native Ollama pipeline from install to teardown.
- Maps token timing to energy units via JSON schema `energy.token_timing`.
- Provides sequence diagram and Python stub `prompt_to_eu` for emission.
- Validates latency (<2 s) and EU budget accuracy (±5%).
- Enables UX-001 by supplying local, offline frames.
