# WF-UX-008 Privacy Flow Diagram

## Privacy-Preserving Social Interaction Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as WIRTHFORGE UI
    participant PrivacyCtrl as Privacy Controller
    participant ConsentMgr as Consent Manager
    participant DataSanitizer as Data Sanitizer
    participant ShareMgr as Share Manager
    participant LocalStore as Local Storage
    participant CommServer as Community Server
    participant ExtPlatform as External Platform

    Note over User,ExtPlatform: Privacy-First Social Sharing Flow

    %% Achievement Unlock
    User->>UI: Unlocks Achievement
    UI->>LocalStore: Store Achievement Locally
    UI->>User: Show Achievement + Optional Share Button
    
    %% User Initiates Share
    User->>UI: Clicks "Share Achievement"
    UI->>PrivacyCtrl: Request Share Permission
    
    %% Privacy Assessment
    PrivacyCtrl->>ConsentMgr: Check User Consent Settings
    ConsentMgr->>ConsentMgr: Evaluate Global Privacy Settings
    
    alt User Has Sharing Disabled
        ConsentMgr->>UI: Sharing Disabled
        UI->>User: "Sharing is disabled in privacy settings"
    else User Has Sharing Enabled
        ConsentMgr->>UI: Show Consent Dialog
        UI->>User: "Share: Achievement Name + Energy Stats?"
        
        alt User Declines
            User->>UI: "No, Keep Private"
            UI->>LocalStore: Log: Share Declined
            UI->>User: Achievement Remains Local
        else User Consents
            User->>UI: "Yes, Share"
            UI->>DataSanitizer: Sanitize Share Data
            
            %% Data Sanitization Process
            DataSanitizer->>DataSanitizer: Remove Personal Identifiers
            DataSanitizer->>DataSanitizer: Strip Sensitive Content
            DataSanitizer->>DataSanitizer: Apply Anonymization Rules
            DataSanitizer->>DataSanitizer: Generate Share Token
            
            %% Prepare Anonymized Package
            DataSanitizer->>ShareMgr: Anonymized Share Package
            ShareMgr->>LocalStore: Log: Share Approved + Data Hash
            
            %% Network Sharing (Optional)
            alt Community Server Available
                ShareMgr->>CommServer: POST /achievements (Encrypted)
                CommServer->>CommServer: Store Anonymized Achievement
                CommServer->>ShareMgr: Success + Share ID
                ShareMgr->>UI: "Shared to Community"
            end
            
            alt External Platform Linked
                ShareMgr->>ExtPlatform: POST via API (Anonymized)
                ExtPlatform->>ShareMgr: Success
                ShareMgr->>UI: "Shared to [Platform]"
            end
            
            %% Local Record Keeping
            ShareMgr->>LocalStore: Update Share History
            UI->>User: "Achievement Shared Successfully"
        end
    end

    Note over User,ExtPlatform: Privacy Controls & Data Management

    %% Privacy Dashboard Access
    User->>UI: Opens Privacy Dashboard
    UI->>PrivacyCtrl: Get Privacy Status
    PrivacyCtrl->>LocalStore: Retrieve Privacy Settings
    PrivacyCtrl->>LocalStore: Retrieve Share History
    PrivacyCtrl->>UI: Display Privacy Overview
    
    %% User Reviews Shared Data
    UI->>User: Show: Shared Items, Settings, Controls
    User->>UI: "Revoke Share" for Item X
    UI->>ShareMgr: Revoke Share Request
    
    alt Community Server Share
        ShareMgr->>CommServer: DELETE /achievements/[ID]
        CommServer->>ShareMgr: Deleted
    end
    
    alt External Platform Share
        ShareMgr->>ExtPlatform: DELETE via API
        ExtPlatform->>ShareMgr: Deleted (if supported)
    end
    
    ShareMgr->>LocalStore: Mark Share as Revoked
    ShareMgr->>UI: "Share Revoked Successfully"
    UI->>User: Updated Privacy Dashboard

    Note over User,ExtPlatform: Anonymous Participation Flow

    %% Anonymous Challenge Participation
    User->>UI: Joins Challenge Anonymously
    UI->>PrivacyCtrl: Request Anonymous Mode
    PrivacyCtrl->>DataSanitizer: Generate Anonymous ID
    DataSanitizer->>DataSanitizer: Create Temporary Pseudonym
    DataSanitizer->>ShareMgr: Anonymous Challenge Entry
    ShareMgr->>CommServer: Submit Score (Anonymous)
    CommServer->>ShareMgr: Leaderboard Position
    ShareMgr->>UI: Show Anonymous Ranking
    UI->>User: "Ranked #5 as 'Explorer#7834'"

    Note over User,ExtPlatform: Data Export & Control

    %% User Requests Data Export
    User->>UI: "Export My Social Data"
    UI->>PrivacyCtrl: Generate Data Export
    PrivacyCtrl->>LocalStore: Collect All Social Data
    PrivacyCtrl->>PrivacyCtrl: Format Export Package
    PrivacyCtrl->>UI: Download Link
    UI->>User: "social-data-export.json"

    %% User Requests Data Deletion
    User->>UI: "Delete All Social Data"
    UI->>ConsentMgr: Confirm Deletion Intent
    ConsentMgr->>User: "Delete ALL social data? This cannot be undone."
    User->>ConsentMgr: "Yes, Delete Everything"
    ConsentMgr->>ShareMgr: Revoke All Shares
    ShareMgr->>CommServer: DELETE /user/all-data
    ShareMgr->>LocalStore: Purge All Social Data
    ShareMgr->>UI: "All social data deleted"
    UI->>User: "Social features reset to default"
```

## Privacy Flow Overview

This sequence diagram illustrates the comprehensive privacy-preserving mechanisms in WF-UX-008's social features:

### **Core Privacy Principles**

1. **Explicit Consent**: Every data sharing action requires user confirmation
2. **Local-First Storage**: All data is stored locally before any network transmission
3. **Data Sanitization**: Personal identifiers are stripped before sharing
4. **User Control**: Users can review, revoke, and delete shared data at any time
5. **Anonymous Options**: Users can participate without revealing identity

### **Privacy Protection Layers**

#### **Layer 1: Consent Management**
- Global privacy settings control default behavior
- Contextual consent dialogs for each sharing action
- Clear description of what data will be shared
- Easy opt-out at any point

#### **Layer 2: Data Sanitization**
- Automatic removal of personal identifiers
- Content filtering for sensitive information
- Anonymization of user data before transmission
- Generation of temporary sharing tokens

#### **Layer 3: User Control**
- Complete visibility into shared data
- Ability to revoke shares at any time
- Data export functionality for transparency
- Complete data deletion option

### **Key Privacy Features**

#### **Achievement Sharing**
- User explicitly chooses what to share
- Only achievement metadata shared, not personal data
- Anonymous sharing options available
- Local logging of all sharing decisions

#### **Challenge Participation**
- Anonymous participation with pseudonyms
- Only performance metrics shared, not personal info
- User controls visibility of participation
- Local validation of submitted data

#### **Data Management**
- Complete audit trail of shared data
- Export functionality for user transparency
- Granular deletion controls
- Local-first data storage with optional cloud sync

### **Privacy Safeguards**

1. **No Silent Sharing**: All data sharing requires explicit user action
2. **Minimal Data**: Only necessary data is shared for functionality
3. **Encryption**: All network communications are encrypted
4. **Anonymization**: Personal identifiers removed before transmission
5. **User Ownership**: Users maintain complete control over their data
6. **Transparency**: Clear visibility into what data is shared and where

This privacy flow ensures that WIRTHFORGE's social features enhance user engagement while maintaining the highest standards of privacy protection and user control.
