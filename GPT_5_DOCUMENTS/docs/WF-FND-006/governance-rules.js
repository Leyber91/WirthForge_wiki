/**
 * WF-FND-006 Governance Rules Engine
 * Validates proposals and checks compliance with invariants and process states.
 */

const Ajv = require('ajv');
const proposalSchema = require('./governance-proposal.json');
const ajv = new Ajv({ allErrors: true });

class GovernanceRules {
  constructor() {
    this.proposalValidator = ajv.compile(proposalSchema);
    this.invariants = [
      'local_core',
      'no_docker_by_default',
      'target_frame_rate_60',
      'energy_truth',
      'ui_presence',
      'consciousness_emergent'
    ];
  }

  /**
   * Validate proposal structure against schema.
   */
  validateProposal(proposal) {
    const valid = this.proposalValidator(proposal);
    return {
      valid,
      errors: this.proposalValidator.errors || []
    };
  }

  /**
   * Check if proposal violates any invariants.
   * proposal.solution should mention potential changes to invariants explicitly.
   */
  checkInvariants(proposal) {
    const text = (proposal.solution || '').toLowerCase();
    const violations = this.invariants.filter(inv => text.includes(inv.replace(/_/g, ' ')));
    return violations;
  }

  /**
   * Ensure proposal has the required metrics defined.
   */
  checkMetrics(proposal) {
    const requiredMetrics = ['latency', 'energy_accuracy', 'fairness', 'security', 'user_satisfaction'];
    const missing = requiredMetrics.filter(m => !proposal.metrics || !(m in proposal.metrics));
    return missing;
  }

  /**
   * Check process state transitions.
   */
  canTransition(current, next) {
    const allowed = {
      Draft: ['Comment', 'Submitted'],
      Comment: ['Submitted'],
      Submitted: ['Review', 'Comment'],
      Review: ['Trial', 'Comment'],
      Trial: ['Audit'],
      Audit: ['Voting', 'Comment'],
      Voting: ['Accepted', 'Rejected', 'Deferred'],
      Accepted: [],
      Rejected: [],
      Deferred: []
    };
    return allowed[current] && allowed[current].includes(next);
  }
}

module.exports = GovernanceRules;
