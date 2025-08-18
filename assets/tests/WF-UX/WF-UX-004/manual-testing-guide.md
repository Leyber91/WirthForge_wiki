# WF-UX-004 Manual Accessibility Testing Guide

## Overview
This guide provides comprehensive manual testing procedures for accessibility validation across WIRTHFORGE systems. Manual testing complements automated testing by evaluating real user experiences with assistive technologies.

## Testing Environment Setup

### Required Tools
- **Screen Readers**: NVDA (Windows), JAWS (Windows), VoiceOver (macOS), Orca (Linux)
- **Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Keyboard**: Standard keyboard for navigation testing
- **Color Vision Tools**: Colour Contrast Analyser, Sim Daltonism
- **Mobile Devices**: iOS/Android with screen readers enabled

### Test User Profiles
- **Keyboard-only users**: Motor impairments, preference
- **Screen reader users**: Blind, low vision
- **Low vision users**: Magnification, high contrast needs
- **Cognitive accessibility**: Memory, attention, processing differences
- **Color vision differences**: Protanopia, deuteranopia, tritanopia

## Core Testing Procedures

### 1. Keyboard Navigation Testing

#### 1.1 Tab Order Verification
**Objective**: Ensure logical, predictable tab order

**Steps**:
1. Load the WIRTHFORGE interface
2. Press Tab repeatedly to navigate through all interactive elements
3. Verify tab order follows visual layout (left-to-right, top-to-bottom)
4. Check that all interactive elements are reachable
5. Verify no keyboard traps exist (can always tab out)

**Expected Results**:
- Tab order matches visual layout
- All buttons, links, form controls are reachable
- Skip links appear first in tab order
- No elements are skipped or unreachable

**Pass/Fail Criteria**:
- ✅ Pass: Logical tab order, all elements reachable
- ❌ Fail: Illogical order, missing elements, keyboard traps

#### 1.2 Keyboard Shortcuts Testing
**Objective**: Verify custom keyboard shortcuts work correctly

**Test Shortcuts**:
- `Alt + 1`: Focus main content
- `Alt + 2`: Focus navigation
- `Alt + 3`: Focus energy visualization
- `Alt + 4`: Focus accessibility controls
- `Alt + H`: Show keyboard help
- `Escape`: Close dialogs/return to main content
- `F6`: Cycle through landmarks

**Steps**:
1. Test each shortcut from different starting positions
2. Verify focus moves to correct element
3. Check visual focus indicators appear
4. Test shortcuts don't conflict with browser/OS shortcuts

**Expected Results**:
- All shortcuts function as documented
- Clear visual focus indicators
- No conflicts with system shortcuts

#### 1.3 Focus Management Testing
**Objective**: Verify proper focus handling in dynamic content

**Steps**:
1. Open modal dialogs - focus should move to dialog
2. Close dialogs - focus should return to trigger element
3. Navigate energy visualization with arrow keys
4. Test roving tabindex in control groups
5. Verify focus visible indicators meet 3:1 contrast ratio

**Expected Results**:
- Focus moves predictably with dynamic content
- Focus returns to logical positions after interactions
- Focus indicators are clearly visible

### 2. Screen Reader Testing

#### 2.1 NVDA Testing (Windows)
**Objective**: Verify optimal NVDA screen reader experience

**Setup**:
1. Install latest NVDA version
2. Use default speech settings
3. Test in Chrome and Firefox

**Test Procedures**:

**Navigation Testing**:
1. Use `H` key to navigate by headings - verify proper hierarchy
2. Use `L` key to navigate by landmarks - verify all regions accessible
3. Use `B` key to navigate by buttons - verify all controls found
4. Use `F` key to navigate by form fields - verify proper labels

**Content Reading**:
1. Use arrow keys to read content linearly
2. Verify all text content is announced
3. Check image alt text is read appropriately
4. Verify table headers are announced with data cells

**Live Region Testing**:
1. Trigger energy state changes
2. Verify status updates are announced automatically
3. Test error message announcements
4. Check progress updates are communicated

**Expected Announcements**:
- "WIRTHFORGE Energy Visualization, main landmark"
- "Interactive energy visualization showing AI model states, image"
- "Accessibility Settings, heading level 2"
- "Motion Preferences, group"

#### 2.2 VoiceOver Testing (macOS)
**Objective**: Verify VoiceOver compatibility

**Setup**:
1. Enable VoiceOver in System Preferences
2. Test in Safari and Chrome
3. Use VoiceOver Utility for customization

**Test Procedures**:
1. Use `VO + Right Arrow` to navigate sequentially
2. Use `VO + Command + H` for heading navigation
3. Test `VO + Command + L` for landmark navigation
4. Verify rotor controls work with form elements

**Specific VoiceOver Tests**:
- Energy visualization canvas interaction
- Form control announcements
- Live region behavior
- Custom control descriptions

#### 2.3 Mobile Screen Reader Testing

**iOS VoiceOver**:
1. Enable VoiceOver in Settings > Accessibility
2. Test swipe navigation through interface
3. Verify double-tap activation works
4. Test rotor gesture for different element types

**Android TalkBack**:
1. Enable TalkBack in Settings > Accessibility
2. Test explore-by-touch navigation
3. Verify reading controls work correctly
4. Test global gestures for navigation

### 3. Visual Accessibility Testing

#### 3.1 Color Vision Testing
**Objective**: Verify interface works for all color vision types

**Tools**: Sim Daltonism, Color Oracle, browser extensions

**Test Procedures**:
1. Apply protanopia simulation - verify information still conveyed
2. Apply deuteranopia simulation - check energy state differentiation
3. Apply tritanopia simulation - verify all UI elements distinguishable
4. Test monochromacy mode - ensure no information lost

**Energy Visualization Specific**:
- Verify energy states use patterns/shapes, not just color
- Check legend includes text descriptions
- Test high contrast mode maintains functionality

#### 3.2 Low Vision Testing
**Objective**: Verify usability with vision impairments

**Test Scenarios**:
1. **200% Zoom**: All content remains accessible, no horizontal scrolling
2. **400% Zoom**: Core functionality remains usable
3. **High Contrast Mode**: All text remains readable
4. **Custom Colors**: User color preferences respected

**Steps**:
1. Set browser zoom to 200%
2. Navigate entire interface
3. Verify all interactive elements remain clickable
4. Check text doesn't overlap or become cut off
5. Test energy visualization at high zoom levels

#### 3.3 Motion Sensitivity Testing
**Objective**: Verify motion controls work properly

**Test Scenarios**:
1. **Reduced Motion**: Animations respect user preference
2. **No Motion**: All animations disabled, functionality preserved
3. **Custom Settings**: User overrides work correctly

**Steps**:
1. Set OS to prefer reduced motion
2. Verify energy visualization reduces animation
3. Test manual motion controls override OS settings
4. Check essential information still conveyed without motion

### 4. Cognitive Accessibility Testing

#### 4.1 Content Clarity Testing
**Objective**: Verify content is understandable

**Evaluation Criteria**:
- Instructions are clear and concise
- Error messages are helpful and specific
- Complex interactions have adequate explanation
- Consistent terminology throughout interface

**Test Procedures**:
1. Review all instructional text for clarity
2. Trigger error states and evaluate messages
3. Check help documentation accessibility
4. Verify consistent navigation patterns

#### 4.2 Task Completion Testing
**Objective**: Verify users can complete primary tasks

**Primary Tasks**:
1. Access energy visualization
2. Modify accessibility settings
3. Navigate between interface sections
4. Understand current system state

**Test Method**:
1. Time task completion
2. Count steps required
3. Identify confusion points
4. Verify success feedback is clear

### 5. Touch and Mobile Testing

#### 5.1 Touch Target Testing
**Objective**: Verify touch targets meet minimum size requirements

**Requirements**:
- Minimum 44px × 44px touch targets
- Adequate spacing between targets
- Clear visual feedback for touch

**Test Procedures**:
1. Measure all interactive elements
2. Test on various screen sizes
3. Verify touch feedback is immediate
4. Check gesture support where applicable

#### 5.2 Mobile Screen Reader Testing
**Objective**: Verify mobile accessibility

**Test Procedures**:
1. Enable device screen reader
2. Test swipe navigation patterns
3. Verify double-tap activation
4. Check gesture shortcuts work

## Specialized Testing Scenarios

### Energy Visualization Accessibility

#### Canvas Interaction Testing
**Objective**: Verify canvas accessibility implementation

**Test Procedures**:
1. Tab to energy visualization canvas
2. Verify role="img" and aria-label announced
3. Use arrow keys to explore visualization
4. Check alternative text updates with state changes
5. Verify keyboard shortcuts work within canvas

**Expected Behavior**:
- Canvas receives focus with clear indicator
- Screen reader announces current energy state
- Keyboard navigation provides spatial information
- State changes trigger appropriate announcements

#### Real-time Updates Testing
**Objective**: Verify live energy state communication

**Test Procedures**:
1. Monitor energy visualization during active AI processing
2. Verify state changes announced via live regions
3. Check announcement frequency is appropriate (not overwhelming)
4. Test manual refresh option for screen reader users

### Error Handling Testing

#### Form Validation Testing
**Objective**: Verify accessible error communication

**Test Procedures**:
1. Submit forms with invalid data
2. Verify errors announced immediately
3. Check errors associated with specific fields
4. Test error correction guidance is clear

**Expected Results**:
- Errors announced via assertive live region
- Field-specific errors linked with aria-describedby
- Clear instructions for correction provided
- Success confirmation when errors resolved

### Performance Testing with Assistive Technology

#### Screen Reader Performance
**Objective**: Verify responsive performance with screen readers

**Test Procedures**:
1. Navigate large content sections with screen reader
2. Time navigation between major sections
3. Check for delays in live region announcements
4. Verify smooth interaction with dynamic content

**Acceptance Criteria**:
- No delays > 2 seconds for navigation
- Live region announcements within 1 second
- Smooth scrolling with screen reader active

## Test Documentation

### Test Report Template

```markdown
## Accessibility Test Report

**Date**: [Test Date]
**Tester**: [Tester Name]
**Environment**: [OS, Browser, AT versions]
**Test Scope**: [Areas tested]

### Summary
- **Total Tests**: X
- **Passed**: X
- **Failed**: X
- **Critical Issues**: X

### Critical Issues
1. **Issue**: [Description]
   - **Impact**: [User impact]
   - **WCAG**: [Relevant guideline]
   - **Recommendation**: [Fix suggestion]

### Detailed Results
[Test-by-test results]

### Recommendations
[Priority-ordered recommendations]
```

### Issue Severity Levels

**Critical (P0)**:
- Blocks core functionality
- WCAG Level A violations
- Complete inaccessibility for user group

**High (P1)**:
- Significantly impacts usability
- WCAG Level AA violations
- Workarounds exist but difficult

**Medium (P2)**:
- Minor usability impact
- WCAG Level AAA violations
- Easy workarounds available

**Low (P3)**:
- Enhancement opportunities
- Best practice improvements
- No functional impact

## Testing Schedule

### Pre-Release Testing
- **Week -4**: Initial accessibility review
- **Week -3**: Screen reader testing
- **Week -2**: Keyboard navigation testing
- **Week -1**: Final validation testing

### Ongoing Testing
- **Monthly**: Full accessibility audit
- **Weekly**: Automated test review
- **Daily**: New feature accessibility check

### User Testing Sessions
- **Quarterly**: User testing with disabled users
- **Bi-annually**: Expert accessibility review
- **Annually**: Comprehensive WCAG audit

## Success Metrics

### Quantitative Metrics
- 0 critical accessibility issues
- < 5 high priority issues
- 100% keyboard navigable
- WCAG 2.2 AA compliance score > 95%

### Qualitative Metrics
- Positive user feedback from disabled users
- Task completion rates match non-disabled users
- Screen reader user satisfaction > 4/5
- Cognitive load assessment scores within acceptable range

## Resources and References

### Testing Tools
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)

### Guidelines
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Section 508 Standards](https://www.section508.gov/)

### Training Resources
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Deque University](https://dequeuniversity.com/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
