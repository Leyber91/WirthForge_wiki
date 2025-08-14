# WF-UX-010: Accessibility & Error/Empty States

## Document Metadata
- **Document ID**: WF-UX-010
- **Title**: Accessibility & Error/Empty States
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Draft
- **Dependencies**: WF-UX-007, WF-UX-009
- **Enables**: WF-BIZ-002

## Executive Summary
This spec ensures every component and flow offers accessible alternatives and graceful handling of error or empty states, keeping energy truth visible even when data is missing.

## Core Concepts
- **A11y Presets**: JSON-configurable modes for high contrast, reduced motion, and screen-reader labels.
- **Empty State Guidelines**: Visual cues and guidance when no data is present.
- **Error Surfaces**: Inline messages with retry hooks and log IDs.

## Implementation Details
Accessibility presets:
```json
{
  "high_contrast": true,
  "reduced_motion": true
}
```
Error/empty state figure illustrates default, loading, and error panels with energy placeholders.

## Integration Points
- **WF-UX-007 – Component Library** to consume presets.
- **WF-TECH-003 – Protocol** for retrieving log IDs.
- **WF-BIZ-002 – Legal & Policy** for messaging requirements.

## Validation & Metrics
- **Toggle Coverage**: All major components react to presets.
- **Error Logging**: Every error displays unique ID.
- **Empty State Clarity**: 80% of users find next action in testing.

## 🎨 Required Deliverables
- [x] Core document (this file)
- [x] Summary – `docs/WF-UX-010/summary.md`
- [x] A11y presets JSON – `ui/WF-UX-010-a11y-presets.json`
- [x] Error/empty state figure – `assets/figures/WF-UX-010-error-states.svg`
- [x] Accessibility toggle test – `tests/WF-UX-010/a11y-toggle.spec.js`
- [x] Version control changelog

## ✅ Quality Criteria
- Presets load before first frame renders.
- Error messages localised and link to glossary terms.
- SVG figure passes contrast check.
- Names comply with WF-META-001.
