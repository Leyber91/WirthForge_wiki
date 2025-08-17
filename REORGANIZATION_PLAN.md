# WIRTHFORGE Directory Reorganization Plan

## Current Problems
- Foundation documents scattered in root directory
- TECH documents partially organized but inconsistent
- GPT_5_DOCUMENTS contains mixed content types
- No clear hierarchy or logical grouping
- Duplicate and outdated files

## Proposed Structure

```
WirthForge_wiki/
├── foundation/                    # Core foundational documents
│   ├── WF-FND-001-MANIFEST-FINAL.md
│   ├── WF-FND-002-ENERGY.md
│   ├── WF-FND-003-ABSTRACTION-LAYERS.md
│   ├── WF-FND-004-DECIPHER.md
│   ├── WF-FND-005-ORCHESTRATION-CONSCIOUSNESS.md
│   └── WF-FND-006-SYSTEM-GOVERNANCE-EVOLUTION.md
│
├── technical/                     # Technical implementation docs
│   ├── TECH-001/                 # Automated Startup & Orchestration
│   │   ├── WF-TECH-001-AUTOMATED-STARTUP.md
│   │   ├── WF-TECH-001-PROCESS-GRAPH.md
│   │   ├── WF-TECH-001-C4-DIAGRAMS.md
│   │   ├── WF-TECH-001-PROCESS-MANIFEST.yaml
│   │   ├── WF-TECH-001-STARTUP-CHECKLIST.md
│   │   ├── WF-TECH-001-BOOT-TESTS.py
│   │   ├── WF-TECH-001-WEB-SERVER-CONFIG.py
│   │   ├── WF-TECH-001-HEALTH-MONITOR.py
│   │   └── WF-TECH-001-INTEGRATION-SEAMS.py
│   │
│   ├── TECH-002/                 # Local AI Integration & Turbo/Broker
│   │   ├── WF-TECH-002-LOCAL-INTEGRATION.md
│   │   ├── WF-TECH-002-OLLAMA-ADAPTER.md
│   │   ├── WF-TECH-002-TURBO-ENSEMBLE.md
│   │   ├── WF-TECH-002-HYBRID-BROKER.md
│   │   ├── WF-TECH-002-TIER-POLICY.yaml
│   │   ├── WF-TECH-002-API-SCHEMAS.json
│   │   ├── WF-TECH-002-ENERGY-MAPPING.py
│   │   ├── WF-TECH-002-FASTAPI-ENDPOINTS.py
│   │   ├── WF-TECH-002-INTEGRATION-TESTS.py
│   │   └── WF-TECH-002-BENCHMARKS.md
│   │
│   └── TECH-003/                 # Future technical documents
│
├── meta/                          # Meta-documentation and prompts
│   ├── WF-META-001.md            # Master Guide
│   ├── WF-META-002-CATALOG-NEW.md
│   ├── WF-META-003-PROMPTING.md
│   ├── WF-META-004-TECH-PROMPTS.md
│   ├── WF-META-005-UX-PROMPTS.md
│   ├── WF-META-006-OPS-PROMPTS.md
│   ├── WF-META-007-BIZ-PROMPTS.md
│   └── WF-META-008-RD-PROMPTS.md
│
├── assets/                        # Visual and data assets
│   ├── diagrams/
│   ├── schemas/
│   ├── templates/
│   └── visualizations/
│
├── deliverables/                  # Generated outputs and artifacts
│   ├── code/
│   ├── configs/
│   ├── tests/
│   └── docs/
│
├── archive/                       # Deprecated/old versions
│   └── GPT_5_DOCUMENTS/          # Move existing GPT_5_DOCUMENTS here
│
├── README.md                      # Project overview
├── LICENSE
└── .gitignore
```

## Migration Steps
1. Create new directory structure
2. Move foundation documents to foundation/
3. Consolidate TECH documents in technical/
4. Move meta documents to meta/
5. Organize assets properly
6. Archive old GPT_5_DOCUMENTS
7. Update all internal references
8. Create new README with proper navigation
