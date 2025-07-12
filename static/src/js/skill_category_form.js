/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, onMounted, onWillUpdateProps } from "@odoo/owl";

/**
 * Skill Category Form Controller
 * Handles button visibility based on active field state
 */
export class SkillCategoryFormController extends FormController {

    setup() {
        super.setup();
        this.orm = useService("orm");

        // Only apply to skill.category model
        if (this.props.resModel === 'skill.category') {
            onMounted(() => {
                this.updateButtonVisibility();
            });

            onWillUpdateProps(() => {
                this.updateButtonVisibility();
            });
        }
    }

    /**
     * Update button visibility based on active field value
     */
    updateButtonVisibility() {
        if (!this.model || !this.model.root) return;

        const activeFieldValue = this.model.root.data.active;
        const archiveBtn = document.querySelector('.btn-archive');
        const unarchiveBtn = document.querySelector('.btn-unarchive');

        if (archiveBtn && unarchiveBtn) {
            if (activeFieldValue) {
                // Record is active - show Archive button, hide Unarchive
                archiveBtn.style.display = 'inline-block';
                unarchiveBtn.style.display = 'none';
            } else {
                // Record is inactive - show Unarchive button, hide Archive
                archiveBtn.style.display = 'none';
                unarchiveBtn.style.display = 'inline-block';
            }
        }
    }

    /**
     * Override onRecordSaved to update button visibility
     */
    async onRecordSaved(record) {
        await super.onRecordSaved(record);
        setTimeout(() => {
            this.updateButtonVisibility();
        }, 100);
    }

    /**
     * Override load to update button visibility when record loads
     */
    async load() {
        await super.load();
        setTimeout(() => {
            this.updateButtonVisibility();
        }, 100);
    }
}

/**
 * Patch FormController for skill category specific behavior
 */
patch(FormController.prototype, {
    setup() {
        super.setup();

        if (this.props.resModel === 'skill.category') {
            this.setupSkillCategoryHandlers();
        }
    },

    /**
     * Setup skill category specific handlers
     */
    setupSkillCategoryHandlers() {
        onMounted(() => {
            this.handleSkillCategoryButtons();
            this.observeFieldChanges();
        });

        onWillUpdateProps(() => {
            setTimeout(() => {
                this.handleSkillCategoryButtons();
            }, 50);
        });
    },

    /**
     * Handle skill category button visibility
     */
    handleSkillCategoryButtons() {
        const record = this.model?.root;
        if (!record) return;

        const isActive = record.data.active;
        this.toggleArchiveButtons(isActive);
    },

    /**
     * Toggle archive/unarchive buttons
     */
    toggleArchiveButtons(isActive) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const archiveBtn = document.querySelector('.btn-archive');
            const unarchiveBtn = document.querySelector('.btn-unarchive');

            if (archiveBtn && unarchiveBtn) {
                if (isActive) {
                    archiveBtn.classList.remove('d-none');
                    unarchiveBtn.classList.add('d-none');
                } else {
                    archiveBtn.classList.add('d-none');
                    unarchiveBtn.classList.remove('d-none');
                }
            }
        }, 10);
    },

    /**
     * Fixed: Observe field changes for real-time updates
     */
    observeFieldChanges() {
        // Check if model and root exist before trying to access them
        if (!this.model || !this.model.root) {
            return;
        }

        // Use the correct event listener approach for Odoo 17
        try {
            // Listen for record updates
            this.model.root.model.bus.addEventListener('update', () => {
                if (this.props.resModel === 'skill.category') {
                    this.handleSkillCategoryButtons();
                }
            });
        } catch (error) {
            console.warn('Could not set up field change listener:', error);
            // Fallback: use periodic checks if event listener fails
            this.setupPeriodicCheck();
        }
    },

    /**
     * Fallback method for periodic button state checks
     */
    setupPeriodicCheck() {
        if (this.props.resModel === 'skill.category') {
            this.checkInterval = setInterval(() => {
                this.handleSkillCategoryButtons();
            }, 500);
        }
    },

    /**
     * Clean up interval on destroy
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        super.destroy();
    }
});

/**
 * Custom Form View for Skill Categories
 */
export class SkillCategoryFormView extends Component {
    static template = 'skill_category.FormView';

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");

        onWillStart(async () => {
            await this.loadData();
        });

        onMounted(() => {
            this.setupButtonHandlers();
        });
    }

    /**
     * Load initial data
     */
    async loadData() {
        // Load any required data here
    }

    /**
     * Setup button event handlers
     */
    setupButtonHandlers() {
        // Archive button handler
        const archiveBtn = document.querySelector('.btn-archive');
        if (archiveBtn) {
            archiveBtn.addEventListener('click', this.handleArchive.bind(this));
        }

        // Unarchive button handler
        const unarchiveBtn = document.querySelector('.btn-unarchive');
        if (unarchiveBtn) {
            unarchiveBtn.addEventListener('click', this.handleUnarchive.bind(this));
        }

        // Initial button state
        this.updateButtonState();
    }

    /**
     * Handle archive action
     */
    async handleArchive(event) {
        event.preventDefault();
        // Archive logic will be handled by the server method
        // This just updates the UI state
        this.updateButtonState(false);
    }

    /**
     * Handle unarchive action
     */
    async handleUnarchive(event) {
        event.preventDefault();
        // Unarchive logic will be handled by the server method
        // This just updates the UI state
        this.updateButtonState(true);
    }

    /**
     * Update button state based on active field
     */
    updateButtonState(isActive = null) {
        const activeField = document.querySelector('input[name="active"]');
        const archiveBtn = document.querySelector('.btn-archive');
        const unarchiveBtn = document.querySelector('.btn-unarchive');

        if (!archiveBtn || !unarchiveBtn) return;

        // Get active state from parameter or field
        const activeState = isActive !== null ? isActive :
                           (activeField ? activeField.checked : true);

        if (activeState) {
            archiveBtn.style.display = 'inline-block';
            unarchiveBtn.style.display = 'none';
        } else {
            archiveBtn.style.display = 'none';
            unarchiveBtn.style.display = 'inline-block';
        }
    }
}

/**
 * Registry registration for the form controller
 */
import { registry } from "@web/core/registry";

registry.category("views").add("skill_category_form", {
    ...registry.category("views").get("form"),
    Controller: SkillCategoryFormController,
});

/**
 * Alternative approach using field change listeners
 */
export class SkillCategoryFieldHandler extends Component {
    setup() {
        this.orm = useService("orm");

        onMounted(() => {
            this.setupFieldListener();
        });
    }

    /**
     * Setup field change listener
     */
    setupFieldListener() {
        // Listen for active field changes
        const activeField = document.querySelector('input[name="active"]');
        if (activeField) {
            activeField.addEventListener('change', (event) => {
                this.onActiveFieldChange(event.target.checked);
            });
        }

        // Initial setup
        this.onActiveFieldChange(activeField ? activeField.checked : true);
    }

    /**
     * Handle active field change
     */
    onActiveFieldChange(isActive) {
        this.toggleButtons(isActive);
    }

    /**
     * Toggle button visibility
     */
    toggleButtons(isActive) {
        const archiveBtn = document.querySelector('.btn-archive');
        const unarchiveBtn = document.querySelector('.btn-unarchive');

        if (archiveBtn && unarchiveBtn) {
            if (isActive) {
                archiveBtn.classList.remove('d-none');
                archiveBtn.style.display = 'inline-block';
                unarchiveBtn.classList.add('d-none');
                unarchiveBtn.style.display = 'none';
            } else {
                archiveBtn.classList.add('d-none');
                archiveBtn.style.display = 'none';
                unarchiveBtn.classList.remove('d-none');
                unarchiveBtn.style.display = 'inline-block';
            }
        }
    }
}

/**
 * Simple utility function for button toggling
 */
export function toggleSkillCategoryButtons() {
    const activeField = document.querySelector('input[name="active"]');
    const archiveBtn = document.querySelector('.btn-archive');
    const unarchiveBtn = document.querySelector('.btn-unarchive');

    if (activeField && archiveBtn && unarchiveBtn) {
        const isActive = activeField.checked;

        if (isActive) {
            archiveBtn.style.display = 'inline-block';
            unarchiveBtn.style.display = 'none';
        } else {
            archiveBtn.style.display = 'none';
            unarchiveBtn.style.display = 'inline-block';
        }
    }
}

/**
 * Initialize on DOM content loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Auto-initialize for skill category forms
    if (document.querySelector('form[data-model="skill.category"]')) {
        setTimeout(() => {
            toggleSkillCategoryButtons();
        }, 100);
    }
});

/**
 * Export for use in other modules
 */
export {
    SkillCategoryFormController,
    SkillCategoryFormView,
    SkillCategoryFieldHandler,
    toggleSkillCategoryButtons
};