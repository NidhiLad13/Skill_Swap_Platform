/** @odoo-module **/

import { Component, onMounted, useState, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

/**
 * Enhanced OWL Component to convert deprecated attrs and states to Odoo 17+ syntax
 */
class AttrsStatesConverter extends Component {
    static template = "skill_swap_platform.AttrsStatesConverter";
    static props = {};

    setup() {
        this.state = useState({
            xmlInput: "",
            convertedXml: "",
            processing: false,
            conversions: [],
            showPreview: false,
            validationErrors: []
        });

        this.notification = useService("notification");
        this.textareaRef = useRef("xmlInput");
        this.outputRef = useRef("xmlOutput");

        onMounted(() => {
            this.loadSampleXml();
        });
    }

    /**
     * Load sample XML for demonstration
     */
    loadSampleXml() {
        this.state.xmlInput = `<!-- Sample XML with deprecated attrs and states -->
<button name="action_accept" type="object" string="Accept"
        attrs="{'invisible': ['|', ('state', '!=', 'pending'), ('provider_id', '!=', uid)]}"/>
<button name="action_reject" type="object" string="Reject"
        states="pending,in_progress"/>
<field name="meeting_location"
       attrs="{'invisible': [('meeting_type', '=', 'online')], 'required': [('meeting_type', '=', 'physical')]}"/>
<page string="Ratings" attrs="{'invisible': [('state', '!=', 'completed')]}"/>
<field name="description" attrs="{'readonly': [('state', 'in', ['done', 'cancelled'])]}"/>
<button name="action_validate" type="object" string="Validate"
        attrs="{'invisible': ['&', ('state', '=', 'draft'), ('user_id', '!=', uid)]}"/>`;
    }

    /**
     * Validate XML structure
     */
    validateXml(xmlString) {
        const errors = [];

        try {
            // Basic XML validation
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const parseErrors = xmlDoc.getElementsByTagName("parsererror");

            if (parseErrors.length > 0) {
                errors.push("Invalid XML syntax detected");
            }
        } catch (error) {
            errors.push("XML parsing error: " + error.message);
        }

        // Check for nested quotes issues
        const nestedQuotesPattern = /attrs="[^"]*"[^"]*"[^"]*"/g;
        if (nestedQuotesPattern.test(xmlString)) {
            errors.push("Potential nested quotes issue in attrs attribute");
        }

        return errors;
    }

    /**
     * Convert attrs syntax to new Odoo 17 syntax
     */
    convertAttrs(attrsString) {
        try {
            // More robust attrs parsing
            const attrsMatch = attrsString.match(/attrs="({.*})"/s);
            if (!attrsMatch) return null;

            const attrsContent = attrsMatch[1];
            const conversions = [];

            // Handle invisible conditions
            const invisibleMatch = attrsContent.match(/'invisible':\s*(\[.*?\](?:\])*)/s);
            if (invisibleMatch) {
                const condition = this.parseCondition(invisibleMatch[1]);
                conversions.push({
                    type: 'invisible',
                    condition: condition
                });
            }

            // Handle readonly conditions
            const readonlyMatch = attrsContent.match(/'readonly':\s*(\[.*?\](?:\])*)/s);
            if (readonlyMatch) {
                const condition = this.parseCondition(readonlyMatch[1]);
                conversions.push({
                    type: 'readonly',
                    condition: condition
                });
            }

            // Handle required conditions
            const requiredMatch = attrsContent.match(/'required':\s*(\[.*?\](?:\])*)/s);
            if (requiredMatch) {
                const condition = this.parseCondition(requiredMatch[1]);
                conversions.push({
                    type: 'required',
                    condition: condition
                });
            }

            return conversions;
        } catch (error) {
            console.error("Error parsing attrs:", error);
            return null;
        }
    }

    /**
     * Enhanced condition parsing with better logic handling
     */
    parseCondition(conditionStr) {
        try {
            // Remove outer brackets and normalize
            let condition = conditionStr.replace(/^\[|\]$/g, '').trim();

            // Handle complex nested conditions
            return this.parseComplexCondition(condition);
        } catch (error) {
            console.error("Error parsing condition:", error);
            return conditionStr;
        }
    }

    /**
     * Parse complex conditions with proper operator precedence
     */
    parseComplexCondition(condition) {
        // Handle OR conditions (|)
        if (condition.startsWith("'|'")) {
            condition = condition.substring(4).trim();
            const parts = this.splitLogicalConditions(condition);
            return `(${parts.map(part => this.parseComplexCondition(part)).join(' or ')})`;
        }

        // Handle AND conditions (&)
        if (condition.startsWith("'&'")) {
            condition = condition.substring(4).trim();
            const parts = this.splitLogicalConditions(condition);
            return `(${parts.map(part => this.parseComplexCondition(part)).join(' and ')})`;
        }

        // Handle NOT conditions ('!')
        if (condition.startsWith("'!'")) {
            condition = condition.substring(4).trim();
            const innerCondition = this.parseComplexCondition(condition);
            return `not (${innerCondition})`;
        }

        // Handle simple tuple conditions
        if (condition.startsWith('(') && condition.endsWith(')')) {
            return this.parseSimpleCondition(condition);
        }

        // Handle comma-separated conditions (implicit AND)
        const parts = this.splitConditions(condition);
        if (parts.length > 1) {
            return parts.map(part => this.parseSimpleCondition(part)).join(' and ');
        }

        return this.parseSimpleCondition(condition);
    }

    /**
     * Split logical conditions (for | and & operators)
     */
    splitLogicalConditions(condition) {
        const conditions = [];
        let current = '';
        let parenthesesCount = 0;
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < condition.length; i++) {
            const char = condition[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            }

            if (!inQuotes) {
                if (char === '(' || char === '[') {
                    parenthesesCount++;
                } else if (char === ')' || char === ']') {
                    parenthesesCount--;
                }
            }

            if (char === ',' && parenthesesCount === 0 && !inQuotes) {
                if (current.trim()) {
                    conditions.push(current.trim());
                }
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            conditions.push(current.trim());
        }

        return conditions;
    }

    /**
     * Split conditions handling nested parentheses and quotes
     */
    splitConditions(condition) {
        const conditions = [];
        let current = '';
        let parenthesesCount = 0;
        let bracketCount = 0;
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < condition.length; i++) {
            const char = condition[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            }

            if (!inQuotes) {
                if (char === '(') {
                    parenthesesCount++;
                } else if (char === ')') {
                    parenthesesCount--;
                } else if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                }
            }

            if (char === ',' && parenthesesCount === 0 && bracketCount === 0 && !inQuotes) {
                conditions.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            conditions.push(current.trim());
        }

        return conditions;
    }

    /**
     * Enhanced simple condition parsing
     */
    parseSimpleCondition(conditionStr) {
        try {
            // Remove outer parentheses if present
            conditionStr = conditionStr.replace(/^\(|\)$/g, '').trim();

            // Split by comma but handle quoted strings properly
            const parts = this.splitConditions(conditionStr);

            if (parts.length === 3) {
                let field = parts[0].replace(/^['"]|['"]$/g, '');
                let operator = parts[1].replace(/^['"]|['"]$/g, '');
                let value = parts[2].trim();

                // Handle different value types
                if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                } else if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }

                // Convert operators
                switch (operator) {
                    case '=':
                        operator = '==';
                        break;
                    case '!=':
                        operator = '!=';
                        break;
                    case 'in':
                        if (parts[2].includes('[') || parts[2].includes('(')) {
                            // Handle list/tuple values
                            const listMatch = parts[2].match(/[\[\(]([^\]\)]+)[\]\)]/);
                            if (listMatch) {
                                const values = listMatch[1].split(',').map(v =>
                                    `'${v.trim().replace(/^['"]|['"]$/g, '')}'`
                                ).join(', ');
                                return `${field} in (${values})`;
                            }
                        }
                        break;
                    case 'not in':
                        if (parts[2].includes('[') || parts[2].includes('(')) {
                            const listMatch = parts[2].match(/[\[\(]([^\]\)]+)[\]\)]/);
                            if (listMatch) {
                                const values = listMatch[1].split(',').map(v =>
                                    `'${v.trim().replace(/^['"]|['"]$/g, '')}'`
                                ).join(', ');
                                return `${field} not in (${values})`;
                            }
                        }
                        break;
                    case '>=':
                    case '<=':
                    case '>':
                    case '<':
                        // Keep comparison operators as-is
                        break;
                }

                // Handle special values
                if (value === 'True') value = 'true';
                if (value === 'False') value = 'false';
                if (value === 'uid') return `${field} ${operator} uid`;

                // Quote string values
                if (isNaN(value) && value !== 'true' && value !== 'false' && value !== 'uid') {
                    value = `'${value}'`;
                }

                return `${field} ${operator} ${value}`;
            }

            return conditionStr;
        } catch (error) {
            console.error("Error parsing simple condition:", error);
            return conditionStr;
        }
    }

    /**
     * Convert states syntax to invisible attribute
     */
    convertStates(statesString) {
        try {
            const statesMatch = statesString.match(/states="([^"]+)"/);
            if (!statesMatch) return null;

            const states = statesMatch[1].split(',').map(s => s.trim());
            const statesList = states.map(state => `'${state}'`).join(', ');

            return `invisible="state not in (${statesList})"`;
        } catch (error) {
            console.error("Error converting states:", error);
            return null;
        }
    }

    /**
     * Main conversion function with enhanced error handling
     */
    async convertXml() {
        this.state.processing = true;
        this.state.conversions = [];
        this.state.validationErrors = [];

        try {
            // Validate input XML
            const validationErrors = this.validateXml(this.state.xmlInput);
            if (validationErrors.length > 0) {
                this.state.validationErrors = validationErrors;
                this.notification.add(
                    `Validation errors found: ${validationErrors.join(', ')}`,
                    { type: "warning" }
                );
            }

            let convertedXml = this.state.xmlInput;
            const conversions = [];

            // Convert attrs with better regex
            const attrsRegex = /attrs="({[^}]*})"/gs;
            const attrsMatches = [...this.state.xmlInput.matchAll(attrsRegex)];

            for (const match of attrsMatches) {
                const fullMatch = match[0];
                const attrsConversions = this.convertAttrs(fullMatch);

                if (attrsConversions && attrsConversions.length > 0) {
                    let newAttributes = '';
                    attrsConversions.forEach(conv => {
                        newAttributes += ` ${conv.type}="${conv.condition}"`;
                    });

                    convertedXml = convertedXml.replace(fullMatch, newAttributes.trim());
                    conversions.push({
                        from: fullMatch,
                        to: newAttributes.trim(),
                        type: 'attrs'
                    });
                }
            }

            // Convert states
            const statesRegex = /states="([^"]+)"/g;
            const statesMatches = [...this.state.xmlInput.matchAll(statesRegex)];

            for (const match of statesMatches) {
                const fullMatch = match[0];
                const statesConversion = this.convertStates(fullMatch);

                if (statesConversion) {
                    convertedXml = convertedXml.replace(fullMatch, statesConversion);
                    conversions.push({
                        from: fullMatch,
                        to: statesConversion,
                        type: 'states'
                    });
                }
            }

            // Clean up deprecated widget attributes for Odoo 17
            convertedXml = this.cleanupDeprecatedWidgets(convertedXml);

            this.state.convertedXml = convertedXml;
            this.state.conversions = conversions;

            this.notification.add(
                `Successfully converted ${conversions.length} attributes`,
                { type: "success" }
            );

        } catch (error) {
            this.notification.add(
                `Error during conversion: ${error.message}`,
                { type: "danger" }
            );
            console.error("Conversion error:", error);
        } finally {
            this.state.processing = false;
        }
    }

    /**
     * Clean up deprecated widget attributes
     */
    cleanupDeprecatedWidgets(xmlString) {
        // Remove deprecated widget attributes that might cause issues
        const deprecatedWidgets = [
            'widget="mail_followers"',
            'widget="mail_thread"',
            'widget="mail_activity"'
        ];

        let cleanXml = xmlString;
        deprecatedWidgets.forEach(widget => {
            cleanXml = cleanXml.replace(new RegExp(widget, 'g'), '');
        });

        return cleanXml;
    }

    /**
     * Copy converted XML to clipboard
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.state.convertedXml);
            this.notification.add("Copied to clipboard!", { type: "success" });
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.state.convertedXml;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.notification.add("Copied to clipboard!", { type: "success" });
        }
    }

    /**
     * Clear all text areas
     */
    clearAll() {
        this.state.xmlInput = "";
        this.state.convertedXml = "";
        this.state.conversions = [];
        this.state.validationErrors = [];
    }

    /**
     * Download converted XML as file
     */
    downloadXml() {
        const blob = new Blob([this.state.convertedXml], { type: 'text/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted_xml.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notification.add("XML file downloaded!", { type: "success" });
    }

    /**
     * Load XML from file
     */
    async loadXmlFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            this.state.xmlInput = text;
            this.notification.add("XML file loaded successfully!", { type: "success" });
        } catch (error) {
            this.notification.add("Error loading file: " + error.message, { type: "danger" });
        }
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        this.state.showPreview = !this.state.showPreview;
    }

    /**
     * Format XML with proper indentation
     */
    formatXml(xml) {
        const formatted = xml.replace(/></g, '>\n<');
        const lines = formatted.split('\n');
        let indent = 0;
        let result = '';

        for (const line of lines) {
            if (line.match(/^<\/\w/)) {
                indent--;
            }
            result += '  '.repeat(indent) + line + '\n';
            if (line.match(/^<\w[^>]*[^\/]>$/)) {
                indent++;
            }
        }

        return result;
    }

    /**
     * Get conversion statistics
     */
    getConversionStats() {
        const stats = {
            total: this.state.conversions.length,
            attrs: this.state.conversions.filter(c => c.type === 'attrs').length,
            states: this.state.conversions.filter(c => c.type === 'states').length
        };
        return stats;
    }

    /**
     * Validate converted XML
     */
    validateConvertedXml() {
        if (!this.state.convertedXml) {
            this.notification.add("No converted XML to validate", { type: "warning" });
            return;
        }

        const errors = this.validateXml(this.state.convertedXml);
        if (errors.length === 0) {
            this.notification.add("Converted XML is valid!", { type: "success" });
        } else {
            this.notification.add(`Validation errors: ${errors.join(', ')}`, { type: "danger" });
        }
    }

    /**
     * Reset to sample XML
     */
    resetToSample() {
        this.loadSampleXml();
        this.state.convertedXml = "";
        this.state.conversions = [];
        this.state.validationErrors = [];
        this.notification.add("Reset to sample XML", { type: "info" });
    }

    /**
     * Export conversion report
     */
    exportReport() {
        const stats = this.getConversionStats();
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            conversions: this.state.conversions,
            validationErrors: this.state.validationErrors
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'conversion_report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notification.add("Conversion report exported!", { type: "success" });
    }

    /**
     * Handle drag and drop for XML files
     */
    onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    onDragLeave(event) {
        event.preventDefault();
    }

    async onDrop(event) {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                try {
                    const text = await file.text();
                    this.state.xmlInput = text;
                    this.notification.add("XML file loaded via drag & drop!", { type: "success" });
                } catch (error) {
                    this.notification.add("Error loading file: " + error.message, { type: "danger" });
                }
            } else {
                this.notification.add("Please drop an XML file", { type: "warning" });
            }
        }
    }
}

// Register the component
registry.category("actions").add("skill_swap_platform.attrs_states_converter", AttrsStatesConverter);

export default AttrsStatesConverter;