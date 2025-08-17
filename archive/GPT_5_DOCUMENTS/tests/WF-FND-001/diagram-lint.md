# WF-FND-001 Diagram Lint Checklist

## Mermaid Diagram Quality Assurance

### Syntax Validation
- [ ] **Valid Mermaid syntax**: All diagrams parse without errors
- [ ] **Proper graph type**: Correct graph declaration (graph TD, graph LR, etc.)
- [ ] **Node definitions**: All nodes properly defined before use
- [ ] **Edge syntax**: Correct arrow and connection syntax
- [ ] **Class definitions**: Valid classDef statements with proper CSS properties
- [ ] **Class applications**: All class applications reference defined classes

### Visual Consistency
- [ ] **Color palette adherence**: Uses only approved WIRTHFORGE colors
  - Forge: `#dc2626` (red-600)
  - Scholar: `#2563eb` (blue-600) 
  - Sage: `#7c3aed` (purple-600)
  - Energy: `#f59e0b` (amber-500)
  - Success: `#10b981` (emerald-500)
  - Neutral: `#6b7280` (gray-500)
- [ ] **Stroke consistency**: 2px for primary nodes, 1px for secondary
- [ ] **Text contrast**: All text meets WCAG 2.2 AA contrast requirements
- [ ] **Node sizing**: Consistent node sizes within diagram categories
- [ ] **Font consistency**: Uses system fonts compatible across platforms

### Content Standards
- [ ] **Text length**: Node text under 3 lines, max 20 characters per line
- [ ] **Abbreviations**: No unexplained abbreviations or acronyms
- [ ] **Language clarity**: Clear, concise language appropriate for target audience
- [ ] **Terminology consistency**: Uses approved WIRTHFORGE glossary terms
- [ ] **Icon usage**: Consistent emoji/icon usage (🔥💎🌟) for Three Doors

### Structural Requirements
- [ ] **Maximum complexity**: No more than 25 nodes per diagram
- [ ] **Depth limit**: Maximum 5 levels deep
- [ ] **Branching factor**: No more than 4 branches from single node
- [ ] **Flow direction**: Logical left-to-right or top-to-bottom flow
- [ ] **Connection clarity**: All relationships clear and unambiguous

### Accessibility Compliance
- [ ] **Color independence**: Information conveyed through shape/position, not just color
- [ ] **High contrast**: Minimum 4.5:1 contrast ratio for normal text
- [ ] **Large text contrast**: Minimum 3:1 contrast ratio for large text (18pt+)
- [ ] **Alternative formats**: Consideration for screen reader compatibility
- [ ] **Zoom compatibility**: Readable at 200% zoom level

### Performance Validation
- [ ] **File size**: .mmd files under 5KB for optimal loading
- [ ] **Rendering speed**: Diagrams render within 2 seconds
- [ ] **Browser compatibility**: Tested in Chrome, Firefox, Safari, Edge
- [ ] **Mobile responsive**: Scales properly on mobile devices
- [ ] **Memory usage**: Reasonable memory consumption during rendering

### Technical Specifications
- [ ] **Encoding**: UTF-8 encoding for all text content
- [ ] **Line endings**: Consistent line ending format (LF preferred)
- [ ] **Indentation**: Consistent 2-space indentation
- [ ] **Comments**: Meaningful comments for complex diagram sections
- [ ] **Version control**: Proper git tracking and commit messages

### Content Accuracy
- [ ] **Factual correctness**: All information technically accurate
- [ ] **WIRTHFORGE alignment**: Adheres to platform principles and vision
- [ ] **Cross-references**: Links to other documents are valid
- [ ] **Dependency accuracy**: Correctly represents system dependencies
- [ ] **Timeline accuracy**: Reflects current project status and roadmap

### Documentation Requirements
- [ ] **Alt text provided**: Comprehensive alternative text for accessibility
- [ ] **Context explanation**: Surrounding text explains diagram purpose
- [ ] **Legend included**: Color/symbol meanings clearly defined
- [ ] **Source attribution**: Credits for any adapted or referenced content
- [ ] **Update tracking**: Version history and change documentation

## Automated Testing Commands

### Mermaid CLI Validation
```bash
# Install Mermaid CLI if not present
npm install -g @mermaid-js/mermaid-cli

# Validate syntax for all WF-FND-001 diagrams
mmdc -i assets/diagrams/WF-FND-001-principles-flow.mmd -o /dev/null --quiet
mmdc -i assets/diagrams/WF-FND-001-energy-lifecycle.mmd -o /dev/null --quiet
mmdc -i assets/diagrams/WF-FND-001-three-doors.mmd -o /dev/null --quiet
```

### Color Contrast Validation
```bash
# Using contrast-ratio npm package
npm install -g contrast-ratio

# Test key color combinations
contrast-ratio "#ffffff" "#dc2626"  # White text on Forge red
contrast-ratio "#ffffff" "#2563eb"  # White text on Scholar blue
contrast-ratio "#ffffff" "#7c3aed"  # White text on Sage purple
contrast-ratio "#000000" "#f59e0b"  # Black text on Energy amber
```

### File Size Validation
```bash
# Check file sizes (should be under 5KB)
find assets/diagrams -name "WF-FND-001-*.mmd" -exec ls -lh {} \;
```

## Manual Review Process

### Reviewer Checklist
1. **Technical Review**: Developer validates syntax and performance
2. **Design Review**: Designer validates visual consistency and accessibility
3. **Content Review**: Technical writer validates clarity and accuracy
4. **Accessibility Review**: Accessibility expert validates compliance
5. **Stakeholder Review**: Project lead validates alignment with vision

### Review Criteria
- **Pass**: All checklist items completed successfully
- **Conditional Pass**: Minor issues that can be addressed quickly
- **Fail**: Major issues requiring significant revision

### Issue Tracking
- **Critical**: Syntax errors, accessibility violations, factual errors
- **Major**: Visual inconsistencies, performance issues, unclear content
- **Minor**: Formatting issues, minor text improvements, optimization opportunities

## Quality Metrics

### Success Targets
- **Syntax validation**: 100% pass rate
- **Accessibility compliance**: 100% WCAG 2.2 AA compliance
- **Performance**: All diagrams render within 2 seconds
- **File size**: All .mmd files under 5KB
- **Review approval**: 100% stakeholder approval before publication

### Monitoring
- **Pre-commit hooks**: Automated syntax validation
- **CI/CD pipeline**: Continuous testing of diagram rendering
- **Accessibility audits**: Monthly compliance verification
- **Performance monitoring**: Regular rendering speed tests
- **User feedback**: Community-reported issues tracking

*This checklist ensures all WF-FND-001 diagrams meet WIRTHFORGE quality standards for technical accuracy, visual consistency, accessibility compliance, and performance optimization.*
