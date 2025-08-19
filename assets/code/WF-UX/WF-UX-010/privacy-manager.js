/**
 * WF-UX-010 Privacy Manager
 * Manages user privacy controls, consent, and data protection
 * Implements privacy-by-design with GDPR compliance
 */

export class PrivacyManager {
    constructor(options = {}) {
        this.config = {
            consentExpiry: 365 * 24 * 60 * 60 * 1000, // 1 year
            anonymizationLevel: options.anonymizationLevel || 'high',
            dataRetention: options.dataRetention || 30, // days
            auditTrailEnabled: true,
            ...options
        };

        this.consentStore = new Map();
        this.privacySettings = new Map();
        this.auditTrail = [];
        this.anonymizationEngine = new AnonymizationEngine();
        
        this.initializePrivacyManager();
    }

    async initializePrivacyManager() {
        await this.loadStoredConsents();
        await this.loadPrivacySettings();
        this.setupEventListeners();
        this.startPrivacyAudit();
    }

    async loadStoredConsents() {
        try {
            const stored = localStorage.getItem('wirthforge_consent');
            if (stored) {
                const consents = JSON.parse(stored);
                Object.entries(consents).forEach(([key, value]) => {
                    if (this.isConsentValid(value)) {
                        this.consentStore.set(key, value);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load stored consents:', error);
        }
    }

    async loadPrivacySettings() {
        try {
            const stored = localStorage.getItem('wirthforge_privacy_settings');
            if (stored) {
                const settings = JSON.parse(stored);
                Object.entries(settings).forEach(([key, value]) => {
                    this.privacySettings.set(key, value);
                });
            } else {
                this.setDefaultPrivacySettings();
            }
        } catch (error) {
            console.error('Failed to load privacy settings:', error);
            this.setDefaultPrivacySettings();
        }
    }

    setDefaultPrivacySettings() {
        const defaults = {
            dataMinimization: true,
            anonymizeByDefault: true,
            shareAnalytics: false,
            retentionPeriod: 30,
            exportFormat: 'json',
            notificationPreferences: {
                consentReminders: true,
                privacyUpdates: true,
                dataProcessing: false
            }
        };

        Object.entries(defaults).forEach(([key, value]) => {
            this.privacySettings.set(key, value);
        });

        this.savePrivacySettings();
    }

    setupEventListeners() {
        document.addEventListener('wirthforge:consent-request', (event) => {
            this.handleConsentRequest(event.detail);
        });

        document.addEventListener('wirthforge:data-subject-request', (event) => {
            this.handleDataSubjectRequest(event.detail);
        });

        // Privacy settings UI events
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-privacy-action]')) {
                this.handlePrivacyAction(event.target.dataset.privacyAction, event.target);
            }
        });
    }

    async requestConsent(consentRequest) {
        const { 
            dataType, 
            purpose, 
            duration, 
            processing, 
            thirdParties,
            essential = false 
        } = consentRequest;

        // Check if consent already exists and is valid
        const existingConsent = this.consentStore.get(dataType);
        if (existingConsent && this.isConsentValid(existingConsent)) {
            return existingConsent.granted;
        }

        // For essential processing, grant automatically but log
        if (essential) {
            const consent = {
                dataType,
                granted: true,
                timestamp: Date.now(),
                essential: true,
                purpose,
                processing
            };
            
            this.consentStore.set(dataType, consent);
            this.logAuditEvent('consent_granted_essential', { dataType, purpose });
            return true;
        }

        // Show consent dialog for non-essential processing
        return await this.showConsentDialog(consentRequest);
    }

    async showConsentDialog(consentRequest) {
        return new Promise((resolve) => {
            const dialog = this.createConsentDialog(consentRequest);
            document.body.appendChild(dialog);

            const handleResponse = (granted) => {
                const consent = {
                    dataType: consentRequest.dataType,
                    granted,
                    timestamp: Date.now(),
                    purpose: consentRequest.purpose,
                    processing: consentRequest.processing,
                    duration: consentRequest.duration,
                    thirdParties: consentRequest.thirdParties
                };

                this.consentStore.set(consentRequest.dataType, consent);
                this.saveConsents();
                this.logAuditEvent('consent_response', { 
                    dataType: consentRequest.dataType, 
                    granted 
                });

                document.body.removeChild(dialog);
                resolve(granted);
            };

            dialog.querySelector('[data-consent="accept"]').onclick = () => handleResponse(true);
            dialog.querySelector('[data-consent="decline"]').onclick = () => handleResponse(false);
        });
    }

    createConsentDialog(request) {
        const dialog = document.createElement('div');
        dialog.className = 'privacy-consent-dialog';
        dialog.innerHTML = `
            <div class="consent-overlay">
                <div class="consent-modal">
                    <h3>Privacy Consent Request</h3>
                    <div class="consent-details">
                        <p><strong>Data Type:</strong> ${request.dataType}</p>
                        <p><strong>Purpose:</strong> ${request.purpose}</p>
                        <p><strong>Processing:</strong> ${request.processing}</p>
                        ${request.duration ? `<p><strong>Duration:</strong> ${request.duration}</p>` : ''}
                        ${request.thirdParties ? `<p><strong>Third Parties:</strong> ${request.thirdParties}</p>` : ''}
                    </div>
                    <div class="consent-actions">
                        <button data-consent="decline" class="btn-secondary">Decline</button>
                        <button data-consent="accept" class="btn-primary">Accept</button>
                    </div>
                    <p class="consent-note">You can withdraw consent at any time in privacy settings.</p>
                </div>
            </div>
        `;
        return dialog;
    }

    hasConsent(dataType) {
        const consent = this.consentStore.get(dataType);
        return consent && consent.granted && this.isConsentValid(consent);
    }

    isConsentValid(consent) {
        if (!consent.timestamp) return false;
        
        const age = Date.now() - consent.timestamp;
        return age < this.config.consentExpiry;
    }

    withdrawConsent(dataType) {
        const consent = this.consentStore.get(dataType);
        if (consent) {
            consent.granted = false;
            consent.withdrawnAt = Date.now();
            this.saveConsents();
            this.logAuditEvent('consent_withdrawn', { dataType });
            
            // Trigger data purge
            this.purgeDataForType(dataType);
            
            // Notify other components
            document.dispatchEvent(new CustomEvent('wirthforge:consent-withdrawn', {
                detail: { dataType }
            }));
        }
    }

    async purgeDataForType(dataType) {
        this.logAuditEvent('data_purge_initiated', { dataType });
        
        // Dispatch purge event for other components to handle
        document.dispatchEvent(new CustomEvent('wirthforge:purge-data', {
            detail: { dataType, timestamp: Date.now() }
        }));
    }

    // Data anonymization methods
    anonymizeData(data, level = null) {
        const anonymizationLevel = level || this.config.anonymizationLevel;
        return this.anonymizationEngine.anonymize(data, anonymizationLevel);
    }

    // Data subject rights (GDPR Article 15-22)
    async handleDataSubjectRequest(request) {
        const { type, dataType, requestId } = request;
        
        this.logAuditEvent('data_subject_request', { type, dataType, requestId });

        switch (type) {
            case 'access':
                return await this.handleAccessRequest(dataType);
            case 'rectification':
                return await this.handleRectificationRequest(request);
            case 'erasure':
                return await this.handleErasureRequest(dataType);
            case 'portability':
                return await this.handlePortabilityRequest(dataType);
            case 'restriction':
                return await this.handleRestrictionRequest(dataType);
            default:
                throw new Error(`Unknown data subject request type: ${type}`);
        }
    }

    async handleAccessRequest(dataType) {
        const consent = this.consentStore.get(dataType);
        const settings = this.getPrivacySettings();
        
        return {
            consent: consent || null,
            settings: settings,
            auditTrail: this.getAuditTrailForDataType(dataType),
            generatedAt: Date.now()
        };
    }

    async handleErasureRequest(dataType) {
        this.withdrawConsent(dataType);
        await this.purgeDataForType(dataType);
        
        return {
            status: 'completed',
            dataType,
            erasedAt: Date.now()
        };
    }

    async handlePortabilityRequest(dataType) {
        if (!this.hasConsent(dataType)) {
            throw new Error('No valid consent for data portability');
        }

        // Generate portable data export
        const exportData = {
            dataType,
            consent: this.consentStore.get(dataType),
            settings: this.getPrivacySettings(),
            format: 'JSON',
            exportedAt: Date.now()
        };

        return exportData;
    }

    // Privacy settings management
    updatePrivacySetting(key, value) {
        this.privacySettings.set(key, value);
        this.savePrivacySettings();
        this.logAuditEvent('privacy_setting_updated', { key, value });
        
        document.dispatchEvent(new CustomEvent('wirthforge:privacy-setting-changed', {
            detail: { key, value }
        }));
    }

    getPrivacySetting(key) {
        return this.privacySettings.get(key);
    }

    getPrivacySettings() {
        return Object.fromEntries(this.privacySettings);
    }

    savePrivacySettings() {
        try {
            localStorage.setItem('wirthforge_privacy_settings', 
                JSON.stringify(this.getPrivacySettings()));
        } catch (error) {
            console.error('Failed to save privacy settings:', error);
        }
    }

    saveConsents() {
        try {
            const consents = Object.fromEntries(this.consentStore);
            localStorage.setItem('wirthforge_consent', JSON.stringify(consents));
        } catch (error) {
            console.error('Failed to save consents:', error);
        }
    }

    // Audit trail management
    logAuditEvent(action, details = {}) {
        if (!this.config.auditTrailEnabled) return;

        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: Date.now(),
            action,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.auditTrail.push(auditEntry);
        
        // Keep audit trail size manageable
        if (this.auditTrail.length > 1000) {
            this.auditTrail = this.auditTrail.slice(-500);
        }

        this.saveAuditTrail();
    }

    getAuditTrailForDataType(dataType) {
        return this.auditTrail.filter(entry => 
            entry.details.dataType === dataType
        );
    }

    saveAuditTrail() {
        try {
            localStorage.setItem('wirthforge_audit_trail', 
                JSON.stringify(this.auditTrail));
        } catch (error) {
            console.error('Failed to save audit trail:', error);
        }
    }

    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Privacy monitoring and compliance
    startPrivacyAudit() {
        // Check for expired consents every hour
        setInterval(() => {
            this.checkExpiredConsents();
        }, 60 * 60 * 1000);

        // Check data retention policies daily
        setInterval(() => {
            this.enforceDataRetention();
        }, 24 * 60 * 60 * 1000);
    }

    checkExpiredConsents() {
        const expiredConsents = [];
        
        for (const [dataType, consent] of this.consentStore) {
            if (!this.isConsentValid(consent)) {
                expiredConsents.push(dataType);
            }
        }

        expiredConsents.forEach(dataType => {
            this.logAuditEvent('consent_expired', { dataType });
            this.purgeDataForType(dataType);
        });

        if (expiredConsents.length > 0) {
            document.dispatchEvent(new CustomEvent('wirthforge:consents-expired', {
                detail: { expiredConsents }
            }));
        }
    }

    enforceDataRetention() {
        const retentionPeriod = this.getPrivacySetting('retentionPeriod') || 30;
        const cutoffDate = Date.now() - (retentionPeriod * 24 * 60 * 60 * 1000);

        // Clean up old audit entries
        this.auditTrail = this.auditTrail.filter(entry => 
            entry.timestamp > cutoffDate
        );

        this.logAuditEvent('data_retention_enforced', { 
            retentionPeriod, 
            cutoffDate 
        });
    }

    // Privacy dashboard and reporting
    generatePrivacyReport() {
        const activeConsents = Array.from(this.consentStore.entries())
            .filter(([_, consent]) => consent.granted && this.isConsentValid(consent));

        const expiredConsents = Array.from(this.consentStore.entries())
            .filter(([_, consent]) => !this.isConsentValid(consent));

        return {
            summary: {
                totalConsents: this.consentStore.size,
                activeConsents: activeConsents.length,
                expiredConsents: expiredConsents.length,
                privacySettings: this.privacySettings.size
            },
            consents: activeConsents.map(([dataType, consent]) => ({
                dataType,
                grantedAt: consent.timestamp,
                purpose: consent.purpose,
                essential: consent.essential || false
            })),
            settings: this.getPrivacySettings(),
            auditSummary: {
                totalEvents: this.auditTrail.length,
                recentEvents: this.auditTrail.slice(-10)
            },
            generatedAt: Date.now()
        };
    }

    // Public API methods
    getConsentStatus() {
        const status = {};
        for (const [dataType, consent] of this.consentStore) {
            status[dataType] = {
                granted: consent.granted,
                valid: this.isConsentValid(consent),
                grantedAt: consent.timestamp,
                essential: consent.essential || false
            };
        }
        return status;
    }

    async exportPrivacyData() {
        const report = this.generatePrivacyReport();
        const exportData = {
            ...report,
            exportFormat: this.getPrivacySetting('exportFormat') || 'json',
            exportedBy: 'user_request'
        };

        this.logAuditEvent('privacy_data_exported', { 
            format: exportData.exportFormat 
        });

        return exportData;
    }

    handlePrivacyAction(action, element) {
        switch (action) {
            case 'withdraw-consent':
                const dataType = element.dataset.dataType;
                this.withdrawConsent(dataType);
                break;
            case 'update-setting':
                const setting = element.dataset.setting;
                const value = element.type === 'checkbox' ? element.checked : element.value;
                this.updatePrivacySetting(setting, value);
                break;
            case 'export-data':
                this.exportPrivacyData().then(data => {
                    this.downloadData(data, 'privacy-export.json');
                });
                break;
        }
    }

    downloadData(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Anonymization Engine
class AnonymizationEngine {
    constructor() {
        this.techniques = {
            suppression: this.suppress.bind(this),
            generalization: this.generalize.bind(this),
            perturbation: this.perturb.bind(this),
            pseudonymization: this.pseudonymize.bind(this)
        };
    }

    anonymize(data, level) {
        const techniques = this.getTechniquesForLevel(level);
        let anonymizedData = { ...data };

        techniques.forEach(technique => {
            anonymizedData = this.techniques[technique](anonymizedData);
        });

        return anonymizedData;
    }

    getTechniquesForLevel(level) {
        switch (level) {
            case 'low':
                return ['suppression'];
            case 'medium':
                return ['suppression', 'generalization'];
            case 'high':
                return ['suppression', 'generalization', 'perturbation'];
            case 'maximum':
                return ['suppression', 'generalization', 'perturbation', 'pseudonymization'];
            default:
                return ['suppression', 'generalization'];
        }
    }

    suppress(data) {
        const sensitiveFields = ['email', 'phone', 'ip', 'userId', 'sessionId'];
        const suppressed = { ...data };
        
        sensitiveFields.forEach(field => {
            if (suppressed[field]) {
                suppressed[field] = '[SUPPRESSED]';
            }
        });

        return suppressed;
    }

    generalize(data) {
        const generalized = { ...data };
        
        // Generalize timestamps to hour precision
        if (generalized.timestamp) {
            const date = new Date(generalized.timestamp);
            date.setMinutes(0, 0, 0);
            generalized.timestamp = date.getTime();
        }

        // Generalize coordinates to approximate regions
        if (generalized.coordinates) {
            generalized.coordinates = {
                x: Math.floor(generalized.coordinates.x / 100) * 100,
                y: Math.floor(generalized.coordinates.y / 100) * 100
            };
        }

        return generalized;
    }

    perturb(data) {
        const perturbed = { ...data };
        
        // Add noise to numerical values
        if (typeof perturbed.rating === 'number') {
            const noise = (Math.random() - 0.5) * 0.2; // ±0.1 noise
            perturbed.rating = Math.max(1, Math.min(5, perturbed.rating + noise));
        }

        return perturbed;
    }

    pseudonymize(data) {
        const pseudonymized = { ...data };
        
        // Replace identifiers with pseudonyms
        if (pseudonymized.userId) {
            pseudonymized.userId = this.generatePseudonym(pseudonymized.userId);
        }

        return pseudonymized;
    }

    generatePseudonym(identifier) {
        // Simple hash-based pseudonymization
        let hash = 0;
        for (let i = 0; i < identifier.length; i++) {
            const char = identifier.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `pseudo_${Math.abs(hash).toString(36)}`;
    }
}
