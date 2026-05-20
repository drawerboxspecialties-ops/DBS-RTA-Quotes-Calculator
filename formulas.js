// formulas.js - Isolated RTA Cabinet Cost Configurations & Financial Logic

export const FORMULA_CONFIG = {
    // Baseline fallback parameter if an account number isn't listed below
    defaults: {
        marginPercentage: 40
    },

    // 1. Grouped Account Margin Matrix
    // Group your accounts into clean lists under their designated margin rate
    marginGroups: [
        {
            margin: 35,
            accounts: ["1", "1004", "1015", "1022", "2014"] // All these accounts get 35%
        },
        {
            margin: 30,
            accounts: ["C005510", "1008", "1099"]                 // All these accounts get 30%
        },
        {
            margin: 32,
            accounts: ["1003", "1105", "2001"]                 // All these accounts get 32%
        }
    ],

    /**
     * Loops through the grouped margin lists to look for an account match
     * @param {string|number} accountNum - Raw account identifier from the UI
     */
    getMarginForAccount(accountNum) {
        if (!accountNum) return this.defaults.marginPercentage;
        
        // Clean up formatting to prevent casing or spacing errors
        const cleanAccount = accountNum.toString().trim().toLowerCase();
        
        // Look for a group where the accounts array includes this account number
        const matchedGroup = this.marginGroups.find(group => 
            group.accounts.some(acc => acc.toString().trim().toLowerCase() === cleanAccount)
        );
        
        // If a match is found, return that group's margin; otherwise, drop back to shop default (40)
        return matchedGroup ? matchedGroup.margin : this.defaults.marginPercentage;
    },

    /**
     * Executes pricing matrix math based on shop specifications
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
