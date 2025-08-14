# WF-BIZ-002: Legal & Policy Overview

## Document Metadata
- **Document ID**: WF-BIZ-002
- **Title**: Legal & Policy Overview
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Draft
- **Dependencies**: WF-BIZ-001, WF-TECH-004
- **Enables**: WF-BIZ-003

## Executive Summary
This specification outlines the privacy, licensing, and consent policies that govern WIRTHFORGE. All data remains local unless explicit consent permits export.

## Core Concepts
- **Data Residency**: User data never leaves the device without consent.
- **Consent Ledger**: Each export event is signed and stored.
- **License Compliance**: Models and plugins carry usage licenses tracked via energy credits.

## Implementation Details
The data policy map enumerates collected data types, their retention, and sharing rules. Consent flow ensures every external sync prompts the user and records the grant locally.

## Integration Points
- **WF-TECH-003 – Real-Time Protocol** for transmitting consent signals.
- **WF-TECH-004 – State Management** stores consent records.

## Validation & Metrics
- **Consent Response Time**: UI surfaces decision within 500 ms.
- **Retention Audits**: Automated check ensures expired data purged.
- **License Violations**: Zero tolerated unauthorized exports.

## 🎨 Required Deliverables
- [x] Core document (this file)
- [x] Summary – `docs/WF-BIZ-002/summary.md`
- [x] Data policy map schema – `schemas/WF-BIZ-002-data-map.json`
- [x] Consent flow figure – `assets/figures/WF-BIZ-002-consent-flow.svg`
- [x] Data map test – `tests/WF-BIZ-002/data-map.spec.js`
- [x] Version control changelog

## ✅ Quality Criteria
- Policies comply with local-first principles.
- Consent records are immutable and auditable.
- Assets and schemas use WF numbering conventions.
