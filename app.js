// app.js - DOM interaction, Google Sheets Sync, and Dynamic Table Logic
import { FORMULA_CONFIG } from './formulas.js';

const scriptURL = 'https://script.google.com/macros/s/AKfycbxr9hTUySivmXw2NcZ7a6Twj5ugWZsW9LIBkeQFziScCYmSeJ-g1pwcICcDUq_O-G8ESA/exec';

function closeModal() { 
    document.getElementById('modalOverlay').style.display = 'none'; 
}

function syncAddress() { 
    if (document.getElementById('sameAddress').checked) { 
        document.getElementById('shipAddr').value = document.getElementById('billAddr').value; 
    } 
}

function toggleCarrier() {
    const method = document.getElementById('shipMethod').value;
    document.getElementById('carrierRow').style.display = (method === 'LTL') ? 'grid' : 'none';
}

function resetQuoteForm() {
    document.getElementById("quoteForm").reset();
    
    document.getElementById('searchPO').value = "";
    document.getElementById('custName').value = "";
    document.getElementById('custAcc').value = "";
    document.getElementById('poNum').value = "";
    document.getElementById('quotedBy').value = "";
    document.getElementById('billAddr').value = "";
    document.getElementById('shipAddr').value = "";
    document.getElementById('matCost').value = "";
    document.getElementById('doorCost').value = "";
    document.getElementById('ship').value = "";
    document.getElementById('sheets').value = "";
    document.getElementById('labor').value = "";
    document.getElementById('taxRate').value = "";
    document.getElementById('discount').value = "";
    document.getElementById('carrierName').value = "";

    document.getElementById('quoteDate').valueAsDate = new Date();
    document.getElementById('margPct').value = FORMULA_CONFIG.defaults.marginPercentage.toString();
    document.getElementById('quoteStatus').value = "Quote Approval Pending";
    document.getElementById('shipMethod').value = "DBS";
    document.getElementById('sameAddress').checked = false;

    document.querySelectorAll('#cabContainer .dynamic-row:not(:first-child)').forEach(el => el.remove());
    document.querySelectorAll('#doorContainer .dynamic-row:not(:first-child)').forEach(el => el.remove());
    
    document.querySelector('.cabName').value = "";
    document.querySelector('.cabCount').value = "";
    document.querySelector('.doorName').value = "";
    document.querySelector('.doorSqFt').value = "";

    toggleCarrier();
    runMath();
    
    alert("Form cleared completely.");
}

async function universalSearch(type) {
    let val = (type === 'po') ? document.getElementById('searchPO').value : document.getElementById('custName').value;
    if (!val) return alert("Search required.");
    try {
        const response = await fetch(`${scriptURL}?${type}=${encodeURIComponent(val)}`);
        const result = await response.json();
        if (result.status === "list") showSelectionList(result.data, type);
        else alert("Not found.");
    } catch (e) { 
        alert("Search Error."); 
    }
}

function showSelectionList(matches, type) {
    const list = document.getElementById('customerList'); 
    document.getElementById('modalTitle').innerText = (type === 'po') ? "Select Matching Quote" : "Select Previous Customer"; 
    list.innerHTML = "";
    
    matches.forEach(m => {
        const div = document.createElement('div'); 
        div.className = 'cust-item';
        div.innerHTML = (type === 'po') ? `<strong>PO: ${m.po}</strong><br><small>${m.customer}</small>` : `<strong>${m.name}</strong><br><small>Acc: ${m.account}</small>`;
        div.onclick = () => { 
            if(type === 'po') {
                fillForm(m.allData, true); 
            } else { 
                document.getElementById('custName').value = m.name; 
                document.getElementById('custAcc').value = m.account; 
                document.getElementById('shipAddr').value = m.ship; 
                document.getElementById('billAddr').value = m.bill; 
                checkAccountMargin();
            } 
            closeModal(); 
        };
        list.appendChild(div);
    });
    document.getElementById('modalOverlay').style.display = 'flex';
}

function fillForm(d, fullLoad) {
    document.getElementById('custName').value = d[1]; 
    document.getElementById('custAcc').value = d[2];
    if (fullLoad) {
        document.getElementById('poNum').value = d[3]; 
        document.getElementById('quotedBy').value = d[5]; 
        document.getElementById('shipMethod').value = d[6];
        toggleCarrier(); 
        document.getElementById('shipAddr').value = d[7]; 
        document.getElementById('billAddr').value = d[8];
        document.getElementById('matCost').value = d[11]; 
        document.getElementById('margPct').value = d[12]; 
        document.getElementById('doorCost').value = d[13]; 
        document.getElementById('ship').value = d[14]; 
        document.getElementById('sheets').value = d[15]; 
        document.getElementById('labor').value = d[16]; 
        document.getElementById('taxRate').value = d[17]; 
        document.getElementById('discount').value = d[21] || "";
        document.getElementById('quoteStatus').value = d[22] || "Quote Approval Pending";
        runMath(); 
        alert("Quote Loaded.");
    }
}

function runMath() {
    let sqft = 0; 
    document.querySelectorAll('.doorSqFt').forEach(el => sqft += parseFloat(el.value) || 0);
    
    const pricingInputs = {
        totalSqFt: sqft,
        matCost: document.getElementById('matCost').value,
        margPct: document.getElementById('margPct').value,
        doorCost: document.getElementById('doorCost').value,
        ship: document.getElementById('ship').value,
        sheets: document.getElementById('sheets').value,
        laborPerSheet: document.getElementById('labor').value,
        taxRate: document.getElementById('taxRate').value,
        discount: document.getElementById('discount').value
    };

    const results = FORMULA_CONFIG.calculateQuote(pricingInputs);
    const shippingCost = parseFloat(pricingInputs.ship) || 0;

    document.getElementById('outSubtotal').innerText = '$' + results.subtotal.toFixed(2); 
    document.getElementById('outShip').innerText = '$' + shippingCost.toFixed(2); 
    document.getElementById('outTax').innerText = '$' + results.taxAmount.toFixed(2); 
    document.getElementById('outTotal').innerText = '$' + (results.grandTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

async function saveToSheets() {
    const btn = document.getElementById('saveBtn'); 
    const po = document.getElementById('poNum').value; 
    if (!po) return alert("PO Number required."); 
    btn.innerText = "Syncing...";
    
    let cabs = "", doors = "";
    document.querySelectorAll('#cabContainer .dynamic-row').forEach(r => { 
        if(r.querySelector('.cabName').value) cabs += r.querySelector('.cabName').value + "(" + (r.querySelector('.cabCount').value || 0) + "); "; 
    });
    document.querySelectorAll('#doorContainer .dynamic-row').forEach(r => { 
        if(r.querySelector('.doorName').value) doors += r.querySelector('.doorName').value + "(" + (r.querySelector('.doorSqFt').value || 0) + "sqft); "; 
    });
    
    const formData = new URLSearchParams({ 
        Customer: document.getElementById('custName').value, 
        Account: document.getElementById('custAcc').value, 
        PO: po, 
        Date: document.getElementById('quoteDate').value, 
        By: document.getElementById('quotedBy').value, 
        ShipMethod: document.getElementById('shipMethod').value, 
        ShipAddr: document.getElementById('shipAddr').value, 
        BillAddr: document.getElementById('billAddr').value, 
        Cabinets: cabs, 
        Doors: doors, 
        MatCost: document.getElementById('matCost').value, 
        Margin: document.getElementById('margPct').value, 
        DoorCost: document.getElementById('doorCost').value, 
        Shipping: document.getElementById('ship').value, 
        Sheets: document.getElementById('sheets').value, 
        Labor: document.getElementById('labor').value, 
        TaxRate: document.getElementById('taxRate').value, 
        Discount: document.getElementById('discount').value, 
        Subtotal: document.getElementById('outSubtotal').innerText, 
        TaxAmount: document.getElementById('outTax').innerText, 
        GrandTotal: document.getElementById('outTotal').innerText, 
        QuoteStatus: document.getElementById('quoteStatus').value 
    });
    
    try { 
        await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: formData }); 
        btn.innerText = "✅ Synced"; 
    } catch (e) { 
        alert("Error."); 
    }
    setTimeout(() => { btn.innerText = "💾 Sync to Sheets"; }, 2000);
}

function addRow(id) {
    const div = document.createElement('div'); 
    div.className = 'dynamic-row';
    div.innerHTML = `<div><input type="text" class="${id==='cabContainer'?'cabName':'doorName'}" list="${id==='cabContainer'?'prevMaterials':'prevDoors'}"></div><div><input type="number" class="${id==='cabContainer'?'cabCount':'doorSqFt'}" oninput="runMath()"></div><button type="button" class="action-btn" style="background:#E53E3E" onclick="this.parentElement.remove(); runMath()">×</button>`;
    document.getElementById(id).appendChild(div);
}

function doPrint(type) {
    const header = document.getElementById('print-title');
    document.querySelectorAll('input, textarea').forEach(el => { el.setAttribute('value', el.value); });
    document.querySelectorAll('.dynamic-row').forEach(row => { if (!row.querySelector('input[type="text"]').value) row.style.display = 'none'; });
    if (type === 'customer') { 
        document.getElementById('pricingSection').classList.add('hide-for-print'); 
        header.innerText = "RTA CABINET QUOTE"; 
    } else { 
        document.getElementById('pricingSection').classList.remove('hide-for-print'); 
        header.innerText = "INTERNAL QUOTE"; 
    }
    window.print(); 
    header.innerText = "RTA CABINET QUOTE"; 
    document.getElementById('pricingSection').classList.remove('hide-for-print'); 
    document.querySelectorAll('.dynamic-row').forEach(row => row.style.display = "");
}

async function loadMaterialDropdowns() {
    try {
        const response = await fetch(`${scriptURL}?getMaterials=true`);
        const materials = await response.json();
        const matList = document.getElementById('prevMaterials'), doorList = document.getElementById('prevDoors');
        materials.cabs.forEach(m => { let opt = document.createElement('option'); opt.value = m; matList.appendChild(opt); });
        materials.doors.forEach(d => { let opt = document.createElement('option'); opt.value = d; doorList.appendChild(opt); });
    } catch (e) { 
        console.log("Dropdown load failed."); 
    }
}

function checkAccountMargin() {
    const accField = document.getElementById('custAcc');
    if (!accField) return;
    const targetMargin = FORMULA_CONFIG.getMarginForAccount(accField.value);
    document.getElementById('margPct').value = targetMargin;
    runMath();
}

window.closeModal = closeModal;
window.syncAddress = syncAddress;
window.toggleCarrier = toggleCarrier;
window.resetQuoteForm = resetQuoteForm;
window.universalSearch = universalSearch;
window.runMath = runMath;
window.saveToSheets = saveToSheets;
window.addRow = addRow;
window.doPrint = doPrint;
window.checkAccountMargin = checkAccountMargin;

window.onload = function() {
    document.getElementById('quoteDate').valueAsDate = new Date();
    loadMaterialDropdowns();
    
    const accInput = document.getElementById('custAcc');
    if (accInput) {
        accInput.addEventListener('input', checkAccountMargin);
        accInput.addEventListener('change', checkAccountMargin);
    }
};