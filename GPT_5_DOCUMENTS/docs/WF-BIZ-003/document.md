# WF-BIZ-003: Community Guidelines

## Document Metadata
- **Document ID**: WF-BIZ-003
- **Title**: Community Guidelines
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Draft
- **Dependencies**: WF-BIZ-001, WF-BIZ-002
- **Enables**: —

## Executive Summary
WIRTHFORGE fosters a respectful community by defining clear behavioral standards and moderation workflows that honor local-first principles.

## Core Concepts
- **Three-Strike Policy**: Gradual enforcement for repeated offenses.
- **Transparent Appeals**: Users can contest decisions with logged evidence.
- **Energy-Aligned Conduct**: Contributions should enhance collective insight.

## Implementation Details
Moderation flow moves reports from client submission to council review. The report schema standardizes information captured for each incident. Automated filters flag high-risk content for immediate review.

## Integration Points
- **WF-UX-009 – Gamification** to reward positive engagement.
- **WF-TECH-003 – Real-Time Protocol** for submitting reports.

## Validation & Metrics
- **Response Time**: Moderation action within 24 hours.
- **Repeat Offenders**: <5% of users accrue more than one strike.
- **Appeal Resolution**: <7 days average turnaround.

## 🎨 Required Deliverables
- [x] Core document (this file)
- [x] Summary – `docs/WF-BIZ-003/summary.md`
- [x] Moderation flow figure – `assets/figures/WF-BIZ-003-moderation-flow.svg`
- [x] Report schema – `schemas/WF-BIZ-003-report.json`
- [x] Report schema test – `tests/WF-BIZ-003/report-schema.spec.js`
- [x] Version control changelog

## ✅ Quality Criteria
- Guidelines promote constructive collaboration.
- Reporting is anonymous yet auditable.
- Assets comply with numbering and naming policy.
