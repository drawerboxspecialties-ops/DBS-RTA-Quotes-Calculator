// formulas.js - Isolated RTA Cabinet Cost Configurations & Financial Logic

export const FORMULA_CONFIG = {
    // Baseline fallback parameters if no account match is found
    defaults: {
        marginPercentage: 40
    },

    // 1. Account-Specific Default Margin Matrix
    // Add or adjust your shop's customer account numbers and specific margins here
    accountMargins: {
        "1001": 35,  // Account 1 -> 35% Margin
        "1002": 30,  // Account 2 -> 30% Margin
        "1003": 32,  // Account 3 -> 32% Margin
        "1004": 35   // Account 4 -> 35% Margin
    },

    /**
     * Looks up if a specific account number has a contracted margin tier
     * @param {string|number} accountNum - Raw account identifier from the UI
     */
    getMarginForAccount(accountNum) {
        if (!accountNum) return this.defaults.marginPercentage;
        
        // Clean up the input string for exact matching consistency
        const cleanAccount = accountNum.toString().trim().toLowerCase();
        
        const match = Object.keys(this.accountMargins).find(
            key => key.toLowerCase() === cleanAccount
        );
        
        return match ? this.accountMargins[match] : this.defaults.marginPercentage;
    },

    /**
     * Executes pricing matrix math based on shop specifications
     * @param {Object} data - Form entry variables gathered from the UI
     */
    calculateQuote(data) {
        const totalSqFt = parseFloat(data.totalSqFt) || 0;
        const matCost = parseFloat(data.matCost) || 0;
        const margPct = parseFloat(data.margPct) !== undefined ? parseFloat(data.margPct) : this.defaults.marginPercentage;
        const doorCost = parseFloat(data.doorCost) || 0;
        const ship = parseFloat(data.ship) || 0;
        const sheets = parseFloat(data.sheets) || 0;
        const laborPerSheet = parseFloat(data.laborPerSheet) || 0;
        const taxRate = parseFloat(data.taxRate) || 0;
        const discount = parseFloat(data.discount) || 0;

        const totalLabor = sheets * laborPerSheet;

        let subtotal = 0;
        const marginDenominator = 1 - (margPct / 100);
        
        if (marginDenominator !== 0) {
            subtotal = (matCost / marginDenominator) + (totalSqFt * doorCost) + totalLabor - discount;
        } else {
            subtotal = (totalSqFt * doorCost) + totalLabor - discount;
        }

        const taxAmount = subtotal * (taxRate / 100);
        const grandTotal = subtotal + taxAmount + ship;

        return { subtotal, taxAmount, grandTotal };
    }
};