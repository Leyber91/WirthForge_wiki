# WIRTHFORGE Complete Directory Reorganization

## Current Chaos
The directory structure is completely disorganized with:
- Foundation documents scattered across root and GPT_5_DOCUMENTS
- Duplicate and conflicting versions of the same documents
- Mixed content types in single directories
- No clear navigation or hierarchy

## New Clean Structure

```
WirthForge_wiki/
├── README.md                          # Project overview and navigation
├── LICENSE
├── .gitignore
│
├── foundation/                        # Core foundational documents (WF-FND-*)
│   ├── WF-FND-001-MANIFEST-FINAL.md
│   ├── WF-FND-002-ENERGY-METAPHOR.md
│   ├── WF-FND-003-ABSTRACTION-LAYERS.md
│   ├── WF-FND-004-DECIPHER.md
│   ├── WF-FND-005-ORCHESTRATION-CONSCIOUSNESS.md
│   └── WF-FND-006-SYSTEM-GOVERNANCE-EVOLUTION.md
│
├── technical/                         # Technical implementation (WF-TECH-*)
│   ├── TECH-001/                     # Automated Startup & Orchestration
│   │   ├── WF-TECH-001-AUTOMATED-STARTUP.md
│   │   └── [all TECH-001 deliverables]
│   ├── TECH-002/                     # Local AI Integration & Turbo/Broker  
│   │   ├── WF-TECH-002-LOCAL-INTEGRATION.md
│   │   └── [all TECH-002 deliverables]
│   └── [future TECH-003, TECH-004, etc.]
│
├── meta/                             # Meta-documentation and prompts (WF-META-*)
│   ├── WF-META-001-MASTER-GUIDE.md
│   ├── WF-META-002-CATALOG.md
│   ├── WF-META-003-PROMPTING.md
│   ├── WF-META-004-TECH-PROMPTS.md
│   ├── WF-META-005-UX-PROMPTS.md
│   ├── WF-META-006-OPS-PROMPTS.md
│   ├── WF-META-007-BIZ-PROMPTS.md
│   └── WF-META-008-RD-PROMPTS.md
│
├── assets/                           # Visual and data assets
│   ├── diagrams/                     # Mermaid diagrams (.mmd files)
│   ├── visuals/                      # SVG visual assets
│   ├── schemas/                      # JSON/YAML schemas
│   └── templates/                    # Document templates
│
├── deliverables/                     # Generated outputs and artifacts
│   ├── code/                         # Implementation code
│   ├── configs/                      # Configuration files
│   ├── tests/                        # Test suites
│   └── docs/                         # Generated documentation
│
└── archive/                          # Deprecated/old versions
    └── GPT_5_DOCUMENTS/              # Original messy structure (archived)
```

## Migration Actions Required

1. **Move foundation documents** from root and GPT_5_DOCUMENTS to foundation/
2. **Consolidate TECH documents** into technical/ with proper subdirectories
3. **Extract meta documents** from GPT_5_DOCUMENTS to meta/
4. **Organize assets** from GPT_5_DOCUMENTS into proper asset categories
5. **Archive old structure** by moving GPT_5_DOCUMENTS to archive/
6. **Update all internal references** to use new paths
7. **Create comprehensive README** with proper navigation

## Benefits of New Structure

- **Clear separation of concerns**: Foundation, Technical, Meta, Assets
- **Logical hierarchy**: Easy to find related documents
- **Scalable**: Room for growth (TECH-003, TECH-004, etc.)
- **Clean navigation**: Obvious entry points for different audiences
- **Version control friendly**: Smaller, focused directories
- **Asset organization**: Proper separation of diagrams, code, configs
