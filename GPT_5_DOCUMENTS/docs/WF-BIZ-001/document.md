# WF-BIZ-001: Business Model & Requirements

## Document Metadata
- **Document ID**: WF-BIZ-001
- **Title**: Business Model & Requirements
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Draft
- **Dependencies**: WF-FND-001, WF-TECH-001
- **Enables**: WF-BIZ-002, WF-BIZ-003

## Executive Summary
WIRTHFORGE sustains itself through a local-first marketplace and premium features that convert energy insights into revenue while preserving user ownership. This document outlines the core business canvas and requirements for launch.

## Core Concepts
- **Local Marketplace**: Users acquire models and plugins with energy credits.
- **Premium Insights**: Advanced visual analytics sold as optional upgrades.
- **Community Contributions**: Revenue share for plugin creators.

## Implementation Details
The business model canvas captures key partners, activities, value propositions, and cost structures. Energy credits map to local currency via an offline ledger. Subscription checks occur locally and sync when online.

## Integration Points
- **WF-TECH-004 – State Management** for tracking credit balances.
- **WF-UX-008 – Onboarding** introduces paid tiers.

## Validation & Metrics
- **Monthly Active Credits**: number of energy credits spent.
- **Creator Payout Time**: <7 days from sale to payout.
- **Upgrade Conversion**: percentage of users purchasing premium insights.

## 🎨 Required Deliverables
- [x] Core document (this file)
- [x] Summary – `docs/WF-BIZ-001/summary.md`
- [x] Business model canvas figure – `assets/figures/WF-BIZ-001-model-canvas.svg`
- [x] Model canvas test – `tests/WF-BIZ-001/model-canvas.spec.js`
- [x] Version control changelog

## ✅ Quality Criteria
- All revenue features operate offline-first.
- Canvas aligns with WIRTHFORGE principles.
- Tests and assets follow naming policy.
