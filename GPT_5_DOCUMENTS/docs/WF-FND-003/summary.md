# WF-FND-003 Summary

WF-FND-003 establishes the core five-layer stack for WIRTHFORGE. Inputs pass through identity checks, invoke local or optional remote models, and are orchestrated into energy-aware events that drive the UI. The design enforces strict layer boundaries and a 60 Hz event cadence so every visual aligns with measurable computation.

The architecture defaults to local-first execution but can extend to satellite compute when explicitly enabled. All communication flows through structured contracts, enabling audit modes and reproducible sessions.
