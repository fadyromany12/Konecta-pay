import { db } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, Send, Users, CheckCircle, AlertCircle, 
  Search, Download, ChevronRight, BarChart3, Calendar, 
  Settings, X, Eye, Calculator, FileDown, Plus, Trash2,
  Mail, Key, HelpCircle, UserPlus, FileUp, Save, Filter, CheckSquare,
  Database, Clock, RotateCcw, CreditCard, PieChart, Printer, ClipboardList,
  MessageSquare, Phone, ArrowLeft, Briefcase, DollarSign, Building2, Scissors
} from 'lucide-react';

// --- CONFIGURATION ---
// To enable real emails:
// 1. Run: npm install @emailjs/browser
// 2. Uncomment the import below:
// import emailjs from '@emailjs/browser';

// --- CONSTANTS ---
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MANDATORY_FIELDS = ['basic', 'social_ins', 'income_tax'];

const PRESET_COLUMNS = {
  entitlements: ["Transportation", "Meal Allowance", "Shift Allowance", "KPI Bonus"],
  deductions: ["Medical Insurance", "Social Security", "Absenteeism", "Loan Repayment", "Lateness Penalty", "Income Tax"]
};

// Updated Overtime Rates
const OVERTIME_RATES = {
  day: 1.35,      // Day Shift
  night: 1.7,     // Night Shift
  holiday: 2    // Public Holiday (Same as Night per request)
};

// --- LOGIC: Tax Calculator ---
const calculateEgyptDeductions = (grossSalary) => {
  const insuranceCap = 12600;
  const insurableWage = Math.min(grossSalary, insuranceCap);
  const socialInsurance = Math.round(insurableWage * 0.11);

  const personalExemptionMonthly = 1666;
  let taxableIncomeMonthly = grossSalary - socialInsurance - personalExemptionMonthly;
  if (taxableIncomeMonthly < 0) taxableIncomeMonthly = 0;
  
  const annualTaxable = taxableIncomeMonthly * 12;
  let annualTax = 0;

  if (annualTaxable > 40000) {
    if (annualTaxable <= 55000) annualTax += (annualTaxable - 40000) * 0.10;
    else {
      annualTax += 1500;
      if (annualTaxable <= 70000) annualTax += (annualTaxable - 55000) * 0.15;
      else {
        annualTax += 2250;
        if (annualTaxable <= 200000) annualTax += (annualTaxable - 70000) * 0.20;
        else {
          annualTax += 26000;
          if (annualTaxable <= 400000) annualTax += (annualTaxable - 200000) * 0.225;
          else {
            annualTax += 45000;
            annualTax += (annualTaxable - 400000) * 0.25;
          }
        }
      }
    }
  }

  const monthlyTax = Math.round(annualTax / 12);
  return { socialInsurance, monthlyTax };
};

// --- LOGIC: Overtime Calculator ---
const calculateOvertimeValue = (basicSalary, hours, rate, divisor = 240) => {
  if (divisor === 0) return 0;
  const hourlyRate = basicSalary / divisor; 
  return Math.round(hourlyRate * hours * rate);
};

// --- LOGIC: Mock Data ---
const generateMockData = () => [
  { id: 'eg5441', name: 'Sarah Ahmed', role: 'CSR', email: 'sarah.ahmed@konecta.com', project: 'Vodafone UK', basic: 4500, bonus: 500, ot_135: 2, ot_17: 0, ph_hours: 0, overtime: 265, bank_name: 'CIB', iban: 'EG1200000000001234567890', currency: 'EGP', worked_days: 30 },
  { id: 'eg5442', name: 'Mohamed Ali', role: 'Team Leader', email: 'mohamed.ali@konecta.com', project: 'Orange Business', basic: 7200, bonus: 1200, ot_135: 0, ot_17: 8, ph_hours: 8, overtime: 1250, bank_name: 'QNB Alahli', iban: 'EG9800000000009876543210', currency: 'EGP', worked_days: 30 },
  { id: 'eg5443', name: 'Layla Youssef', role: 'QA Specialist', email: 'layla.youssef@konecta.com', project: 'Amazon DE', basic: 5800, bonus: 300, ot_135: 0, ot_17: 0, ph_hours: 0, overtime: 105, bank_name: 'HSBC', iban: 'EG5500000000005555555555', currency: 'EGP', worked_days: 30 },
];

// --- COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = "primary", onClick, disabled, className = "", icon: Icon }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-green-600 text-white hover:bg-green-700",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- COMPONENT: Overtime Modal ---
const OvertimeModal = ({ isOpen, onClose, onApply, employees, divisor = 240 }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [hours, setHours] = useState(0);
  const [rate, setRate] = useState(1.35);

  if (!isOpen) return null;

  const handleApply = () => {
    const emp = employees.find(e => e.id === selectedEmpId);
    if (emp) {
      const val = calculateOvertimeValue(emp.basic || 0, hours, rate, divisor);
      onApply(selectedEmpId, val);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Clock size={20} className="text-blue-600"/> Overtime Calculator</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
        </div>
        
        <label className="block text-sm font-bold text-slate-700 mb-1">Select Employee</label>
        <select className="w-full p-2 border border-slate-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setSelectedEmpId(e.target.value)}>
          <option value="">-- Choose Employee --</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
        </select>

        <label className="block text-sm font-bold text-slate-700 mb-1">Hours Worked</label>
        <input type="number" className="w-full p-2 border border-slate-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 5" />

        <label className="block text-sm font-bold text-slate-700 mb-1">Overtime Rate</label>
        <select className="w-full p-2 border border-slate-300 rounded-lg mb-6 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={rate} onChange={e => setRate(parseFloat(e.target.value))}>
          <option value="1.35">Day (1.35x)</option>
          <option value="1.7">Night (1.7x)</option>
          <option value="2">Public Holiday (2x)</option>
        </select>
        
        <div className="text-xs text-slate-500 mb-4 bg-slate-100 p-2 rounded">
           Calculation based on divisor: <strong>{divisor} hours/month</strong>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleApply} className="flex-1">Calculate & Add</Button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: Proration Modal ---
const ProrationModal = ({ isOpen, onClose, onApply, employees, columns, standardDays = 30 }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [daysWorked, setDaysWorked] = useState(standardDays);
  const [selectedCols, setSelectedCols] = useState(['basic']); 

  if (!isOpen) return null;

  const toggleCol = (key) => {
    if (selectedCols.includes(key)) setSelectedCols(selectedCols.filter(k => k !== key));
    else setSelectedCols([...selectedCols, key]);
  };

  const handleApply = () => {
    if (selectedEmpId && daysWorked >= 0) {
      onApply(selectedEmpId, daysWorked, selectedCols);
      onClose();
    }
  };

  const entitlements = columns.filter(c => c.type === 'entitlement');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Scissors size={20} className="text-orange-500"/> Proration Tool</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
        </div>
        
        <p className="text-xs text-slate-500 mb-4">Calculate partial salary for mid-month joiners or unpaid leave.</p>

        <label className="block text-sm font-bold text-slate-700 mb-1">Select Employee</label>
        <select className="w-full p-2 border border-slate-300 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setSelectedEmpId(e.target.value)}>
          <option value="">-- Choose Employee --</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <div className="flex gap-4 mb-4">
           <div className="flex-1">
             <label className="block text-sm font-bold text-slate-700 mb-1">Actual Days Worked</label>
             <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={daysWorked} onChange={e => setDaysWorked(parseFloat(e.target.value))} />
           </div>
           <div className="flex-1">
             <label className="block text-sm font-bold text-slate-700 mb-1">Standard Days</label>
             <input type="number" className="w-full p-2 border border-slate-100 bg-slate-100 rounded-lg text-sm text-slate-500" value={standardDays} disabled />
           </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-2">Apply Proration To:</label>
        <div className="grid grid-cols-2 gap-2 mb-6 max-h-40 overflow-y-auto border p-2 rounded-lg border-slate-100">
          {entitlements.map(col => (
            <label key={col.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={selectedCols.includes(col.key)} onChange={() => toggleCol(col.key)} className="rounded text-blue-600 focus:ring-blue-500" />
              {col.label}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleApply} className="flex-1">Apply Proration</Button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: PayslipDocument (Redesigned & Smart) ---
const PayslipDocument = ({ employee, columns, period, standardDays, className = "" }) => {
  // Filter logic: Hide zero values unless mandatory
  const filterZeroes = (cols) => cols.filter(col => {
    const val = employee[col.key] || 0;
    return MANDATORY_FIELDS.includes(col.key) || val !== 0;
  });

  const entitlementCols = filterZeroes(columns.filter(c => c.type === 'entitlement'));
  const deductionCols = filterZeroes(columns.filter(c => c.type === 'deduction'));
  
  const allEntitlements = columns.filter(c => c.type === 'entitlement');
  const allDeductions = columns.filter(c => c.type === 'deduction');

  const totalEarnings = allEntitlements.reduce((sum, col) => sum + (employee[col.key] || 0), 0);
  const totalDeductions = allDeductions.reduce((sum, col) => sum + (employee[col.key] || 0), 0);
  const netSalary = totalEarnings - totalDeductions;
  
  // Salary Period Logic
  const date = new Date(period.year, period.month - 1, 1);
  const startDay = 1;
  const lastDay = new Date(period.year, period.month, 0).getDate(); 
  const monthName = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const salaryPeriodStr = `${monthName} ${startDay} - ${monthName} ${lastDay}, ${year}`;

  const ot135 = employee.ot_135 || 0;
  const ot17 = employee.ot_17 || 0;
  const phHours = employee.ph_hours || 0; 
  const otValue = employee.overtime || 0;

  // Proration Display
  const isProrated = employee.worked_days && employee.worked_days !== standardDays;

  return (
    <div className={`bg-white relative text-slate-800 h-full flex flex-col ${className}`}>
      {/* Decorative Top Bar */}
      <div className="h-2 w-full bg-gradient-to-r from-blue-700 to-blue-500"></div>
      
      <div className="p-8 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <img 
               src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" 
               alt="Konecta Logo" 
               className="h-12 w-auto mb-2" 
            />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global BPO Solutions</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Payslip</h1>
            <p className="text-sm font-medium text-blue-600">{salaryPeriodStr}</p>
            <p className="text-xs text-slate-400 mt-1">Konecta Egypt • Cairo Branch</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee Details</p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-800">{employee.name}</p>
              <p className="text-sm text-slate-600 font-medium flex items-center gap-2"><Briefcase size={14}/> {employee.role || 'N/A'}</p>
              <p className="text-sm text-slate-500">{employee.project || 'General Project'}</p>
              <p className="text-xs font-mono text-slate-400 mt-1">EGID: <span className="font-bold text-slate-600">{employee.id}</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</p>
            <div className="space-y-1">
              <p className="text-sm text-slate-600"><span className="text-slate-400">Bank:</span> {employee.bank_name || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="text-slate-400">IBAN:</span> {employee.iban || 'N/A'}</p>
              {isProrated && (
                 <p className="text-sm text-orange-600 font-bold bg-orange-50 inline-block px-2 rounded">
                   Prorated: {employee.worked_days} / {standardDays} Days
                 </p>
              )}
              <p className="text-sm text-slate-600 mt-1"><span className="text-slate-400">Currency:</span> {employee.currency || 'EGP'}</p>
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Earnings */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-green-500">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Plus size={14} strokeWidth={3}/></div>
              <h3 className="font-bold text-slate-700">Earnings</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {entitlementCols.map(col => (
                  <tr key={col.key}>
                    <td className="py-2.5 text-slate-600">{col.label}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">{(employee[col.key] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-red-500">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><Trash2 size={14} strokeWidth={3}/></div>
              <h3 className="font-bold text-slate-700">Deductions</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {deductionCols.map(col => (
                  <tr key={col.key}>
                    <td className="py-2.5 text-slate-600">{col.label}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">{(employee[col.key] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Overtime Info */}
        <div className="border-t border-slate-200 pt-4 mb-4">
           <div className="grid grid-cols-2 gap-8">
             <div className="flex justify-between items-center text-sm font-medium text-slate-500">
               <span>Total Earnings</span>
               <span className="text-green-600">{totalEarnings.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center text-sm font-medium text-slate-500">
               <span>Total Deductions</span>
               <span className="text-red-600">({totalDeductions.toLocaleString()})</span>
             </div>
           </div>
        </div>

        {/* Net Pay & Overtime Tile */}
        <div className="flex gap-4">
            <div className="bg-slate-900 text-white rounded-xl p-6 flex-1 flex justify-between items-center shadow-lg">
                <div>
                    <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Net Payable</p>
                    <p className="text-xs text-slate-400">Transfer pending</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold">{netSalary.toLocaleString()} <span className="text-lg font-normal text-slate-400">{employee.currency || 'EGP'}</span></p>
                </div>
            </div>
            
            {/* Overtime Tile (Updated) */}
            {(ot135 > 0 || ot17 > 0 || phHours > 0) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 w-48 flex flex-col justify-center">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Overtime Breakdown</p>
                    <div className="text-xs text-slate-600 space-y-0.5">
                        {ot135 > 0 && <div className="flex justify-between"><span>Day (1.35x)</span><span>{ot135}h</span></div>}
                        {ot17 > 0 && <div className="flex justify-between"><span>Night (1.7x)</span><span>{ot17}h</span></div>}
                        {phHours > 0 && <div className="flex justify-between"><span>PH (2x)</span><span>{phHours}h</span></div>}
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-100 font-bold text-blue-700 text-right">
                        {otValue.toLocaleString()} {employee.currency || 'EGP'}
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Footer */}
      <div className="bg-slate-50 p-6 text-center border-t border-slate-100 mt-auto">
        <p className="text-xs text-slate-400 leading-relaxed">
          This is a system-generated document and acts as a valid proof of income.<br/>
          Confidential Information • Konecta Egypt Financial Dept.
        </p>
      </div>
    </div>
  );
};

// --- COMPONENT: PayslipPreview (Individual Modal) ---
const PayslipPreview = ({ employee, columns, period, standardDays, onClose }) => {
  if (!employee) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl min-h-[800px] rounded-xl shadow-2xl overflow-hidden flex flex-col transform transition-all scale-100">
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
          <span className="font-semibold flex items-center gap-2"><FileText size={18}/> Preview</span>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-700 rounded-full" title="Print" onClick={() => window.print()}><Printer size={18} /></button>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full"><X size={18} /></button>
          </div>
        </div>
        <PayslipDocument employee={employee} columns={columns} period={period} standardDays={standardDays} />
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [previewId, setPreviewId] = useState(null);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ serviceId: '', templateId: '', publicKey: '' });
  const [emailMessage, setEmailMessage] = useState("Dear Employee,\n\nPlease find attached your payslip for this month.\n\nBest regards,\nKonecta Financial Team");
  
  // NEW: Payroll Settings State (Default 30 Days)
  const [payrollSettings, setPayrollSettings] = useState({
    daysPerMonth: 30, // Updated to 30
    hoursPerDay: 8
  });

  // Payroll State
  const [columns, setColumns] = useState([
    { key: 'basic', label: 'Basic Salary', type: 'entitlement' },
    { key: 'overtime', label: 'Overtime Value', type: 'entitlement' }, // Standard OT Column
    { key: 'bonus', label: 'Bonus', type: 'entitlement' }
  ]);
  const [payrollPeriod, setPayrollPeriod] = useState({ 
    month: new Date().getMonth(), 
    year: new Date().getFullYear() 
  });

  const [showAddColModal, setShowAddColModal] = useState(false);
  const [showOTModal, setShowOTModal] = useState(false); 
  const [showProrationModal, setShowProrationModal] = useState(false); // NEW
  const [newColData, setNewColData] = useState({ label: '', type: 'deduction' });

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // History, Database & Audit State
  const [history, setHistory] = useState([]);
  const [masterDB, setMasterDB] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    // Keep Settings & Email configs in localStorage (they are specific to the user's browser)
    const savedConfig = localStorage.getItem('konecta_email_config');
    if (savedConfig) setEmailConfig(JSON.parse(savedConfig));
    const savedMsg = localStorage.getItem('konecta_email_message');
    if (savedMsg) setEmailMessage(savedMsg);
    const savedPayrollSettings = localStorage.getItem('konecta_payroll_settings');
    if (savedPayrollSettings) setPayrollSettings(JSON.parse(savedPayrollSettings));

    // Load Data from Firebase Firestore
    const loadFirebaseData = async () => {
      try {
        // Load Master DB
        const dbSnap = await getDocs(collection(db, 'employees'));
        setMasterDB(dbSnap.docs.map(d => d.data()));

        // Load History (Sort newest first)
        const histSnap = await getDocs(collection(db, 'history'));
        setHistory(histSnap.docs.map(d => d.data()).sort((a,b) => b.id - a.id));

        // Load Audit Logs (Sort newest first)
        const logsSnap = await getDocs(collection(db, 'auditLogs'));
        setAuditLogs(logsSnap.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
      } catch (error) {
        console.error("Error loading Firebase data:", error);
        // Fallback to empty if offline or failing
      }
    };

    loadFirebaseData();
  }, []);

  const saveEmailConfig = () => {
    localStorage.setItem('konecta_email_config', JSON.stringify(emailConfig));
    localStorage.setItem('konecta_email_message', emailMessage);
    localStorage.setItem('konecta_payroll_settings', JSON.stringify(payrollSettings)); // Save Payroll Settings
    setShowSettings(false);
    showNotification('Settings saved successfully');
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const logAction = async (action, details) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      user: 'Admin', 
      action,
      details
    };
    try {
      // Save to Firebase
      await setDoc(doc(db, 'auditLogs', String(newLog.id)), newLog);
      // Update UI state
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (error) {
      console.error("Error logging action to Firebase:", error);
    }
  };

  const saveToHistory = async (currentBatch) => {
    const totalAmount = currentBatch.reduce((sum, emp) => sum + calculateNet(emp), 0);
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      month: MONTHS[payrollPeriod.month],
      year: payrollPeriod.year,
      count: currentBatch.length,
      total: totalAmount,
      status: 'Completed',
      employees: currentBatch
    };
    try {
      // Save to Firebase
      await setDoc(doc(db, 'history', String(newEntry.id)), newEntry);
      // Update UI state
      setHistory(prev => [newEntry, ...prev]);
      logAction('Payroll Run', `Sent payslips to ${currentBatch.length} employees`);
    } catch (error) {
      console.error("Error saving history to Firebase:", error);
    }
  };

  const saveToMasterDB = async () => {
    try {
      const batch = writeBatch(db);
      const newDB = [...masterDB];
      let addedCount = 0;
      let updatedCount = 0;

      employees.forEach(emp => {
        // Prepare batch write for Firebase
        const empRef = doc(db, 'employees', String(emp.id));
        batch.set(empRef, emp); // Upserts the employee

        // Update local state arrays
        const index = newDB.findIndex(dbEmp => dbEmp.id === emp.id);
        if (index >= 0) {
          newDB[index] = emp;
          updatedCount++;
        } else {
          newDB.push(emp);
          addedCount++;
        }
      });

      // Commit the batch to Firebase
      await batch.commit();
      setMasterDB(newDB);
      showNotification(`Database updated in Cloud: ${addedCount} added, ${updatedCount} updated.`);
      logAction('Database Update', `Updated ${updatedCount}, Added ${addedCount} records`);
    } catch (error) {
      console.error("Error saving DB to Firebase:", error);
      showNotification('Failed to save to cloud database', 'error');
    }
  };

  // --- Logic Implementations ---
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(emp.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.project && emp.project.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredEmployees.map(e => e.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(sid => sid !== id)) : setSelectedIds([...selectedIds, id]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} employees?`)) {
      setEmployees(employees.filter(e => !selectedIds.includes(e.id)));
      logAction('Bulk Delete', `Removed ${selectedIds.length} employees`);
      setSelectedIds([]);
      showNotification('Selected employees removed');
    }
  };

  const handleAddColumn = (label, type) => {
    const key = label.toLowerCase().replace(/\s+/g, '_');
    if (columns.find(c => c.key === key)) {
      showNotification('Column already exists', 'error');
      return;
    }
    setColumns([...columns, { key, label, type }]);
    logAction('Column Added', `Added ${label} (${type})`);
    showNotification(`Added ${label} (${type})`);
  };

// --- NEW: Smart CSV/TSV Import ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        
        let headerIndex = -1;
        for(let i=0; i< Math.min(lines.length, 5); i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('email') || line.includes('id') || line.includes('egid') || line.includes('name')) {
                headerIndex = i;
                break;
            }
        }
        
        if (headerIndex === -1) {
             showNotification('Could not find valid headers (Name, Email, EGID)', 'error');
             return;
        }

        // Auto-detect separator: supports both Excel copy-paste (Tabs) and standard CSVs (Commas)
        const separator = lines[headerIndex].includes('\t') ? '\t' : ',';

        const parseLine = (line) => {
            const res = [];
            let current = '';
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') { inQuote = !inQuote; continue; }
                if (c === separator && !inQuote) { res.push(current.trim()); current = ''; }
                else { current += c; }
            }
            res.push(current.trim());
            return res;
        };

        const headers = parseLine(lines[headerIndex]);
        
        // Map standard text/info headers
        const standardMap = {
            'name': 'name', 'employee': 'name', 
            'email': 'email', 'e-mail': 'email',
            'id': 'id', 'egid': 'id', 'eg id': 'id', 'employee id': 'id',
            'project': 'project', 'department': 'project',
            'title': 'role', 'role': 'role', 'job title': 'role',
            'ot 1.35': 'ot_135', 'day ot': 'ot_135',
            'ot 1.7': 'ot_17', 'night ot': 'ot_17', 'ot hours': 'ot_17',
            'holiday hours': 'ph_hours', 'ph hours': 'ph_hours', 'public holiday': 'ph_hours',
            'bank': 'bank_name', 'bank name': 'bank_name',
            'iban': 'iban', 'account number': 'iban',
            'currency': 'currency',
            'worked days': 'worked_days', 'days worked': 'worked_days'
        };

        const newEmployees = [];
        const newColumns = [...columns]; 

        // Smart Analysis of Headers
        const columnMap = headers.map((h, idx) => {
            const lower = h.toLowerCase().replace(/['"]/g, '').trim();
            if (!lower) return null;
            
            if (standardMap[lower]) return { type: 'standard', key: standardMap[lower] };

            let type = 'entitlement';
            let label = h.replace(/['"]/g, '').trim();
            
            // Detect dynamic (Ded) or (Ent) columns
            if (lower.startsWith('(ded)') || lower.startsWith('deduction') || lower.startsWith('-')) {
                type = 'deduction';
                label = label.replace(/^(\(Ded\)|\(ded\)|Deduction:|Deduction|-) ?/i, '');
            } else if (lower.startsWith('(ent)') || lower.startsWith('entitlement') || lower.startsWith('+')) {
                type = 'entitlement';
                label = label.replace(/^(\(Ent\)|\(ent\)|Entitlement:|Entitlement|\+) ?/i, '');
            } else {
                const existing = newColumns.find(c => c.label.toLowerCase() === label.toLowerCase());
                if (existing) return { type: 'financial', key: existing.key };
            }

            // Bind your custom template columns to the app's internal calculation keys
            let key = label.toLowerCase().replace(/\s+/g, '_');
            if (key === 'basic_salary') key = 'basic';
            if (key === 'overtime_value') key = 'overtime';
            if (key === 'social_insurance') key = 'social_ins';

            // Add dynamic column if it doesn't exist
            if (!newColumns.find(c => c.key === key)) {
                newColumns.push({ key, label, type });
            }
            return { type: 'financial', key };
        });

        setColumns(newColumns);

        const currentDivisor = payrollSettings.daysPerMonth * payrollSettings.hoursPerDay;
        const standardDays = payrollSettings.daysPerMonth;

        for (let i = headerIndex + 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const vals = parseLine(lines[i]);
            if (vals.length < 2) continue; 

            const emp = { 
                id: `eg${Math.floor(Math.random()*9000)+1000}`, 
                basic: 0, bonus: 0, 
                ot_135: 0, ot_17: 0, ph_hours: 0, 
                bank_name: '', iban: '', currency: 'EGP', 
                worked_days: standardDays, base_values: {} 
            };
            
            vals.forEach((val, idx) => {
                if (idx >= columnMap.length) return;
                const map = columnMap[idx];
                if (!map) return;

                if (map.type === 'standard') {
                    if (['ot_135', 'ot_17', 'ph_hours', 'worked_days'].includes(map.key)) {
                       emp[map.key] = parseFloat(val) || 0;
                    } else {
                       emp[map.key] = val;
                    }
                } else if (map.type === 'financial') {
                    emp[map.key] = parseFloat(val.replace(/[$,]/g, '')) || 0;
                }
            });

            // Initialize base values for Proration Tool
            const ratio = (emp.worked_days > 0 && standardDays > 0) ? (emp.worked_days / standardDays) : 1;
            emp.base_values.basic = Math.round((emp.basic || 0) / ratio);
            
            newColumns.filter(c => c.type === 'entitlement' && c.key !== 'overtime' && c.key !== 'bonus').forEach(col => {
               const val = emp[col.key] || 0;
               emp.base_values[col.key] = Math.round(val / ratio);
            });

            // Override OT if user explicitly provided a pre-calculated Overtime Value
            if (emp.overtime === undefined || emp.overtime === 0) {
              const basic = emp.basic || 0;
              const otVal = 
                  calculateOvertimeValue(basic, emp.ot_135 || 0, 1.35, currentDivisor) +
                  calculateOvertimeValue(basic, emp.ot_17 || 0, 1.7, currentDivisor) +
                  calculateOvertimeValue(basic, emp.ph_hours || 0, 2, currentDivisor);
              
              emp.overtime = otVal;
            }

            if (!emp.name) emp.name = 'Unknown';
            newEmployees.push(emp);
        }

        if (newEmployees.length > 0) {
            setEmployees(newEmployees);
            setView('review');
            showNotification(`Imported ${newEmployees.length} records.`);
        }
    };
    reader.readAsText(file);
  };

  // --- NEW: Smart Template Download ---
  const handleDownloadTemplate = () => {
    // 1. Standard details
    const standardHeaders = ['Name', 'Email', 'Project', 'Title', 'EGID', 'Bank Name', 'IBAN', 'Currency', 'Worked Days', 'OT 1.35', 'OT 1.7', 'Public Holiday'];
    
    // 2. Fixed core columns as you requested
    const coreFinancials = [
        '(Ent) Basic Salary', 
        '(Ent) Overtime Value', 
        '(Ent) Bonus', 
        '(Ded) Social Insurance', 
        '(Ded) Income Tax'
    ];

    // 3. Any extra columns the user created dynamically in the app UI
    const customFinancials = columns
        .filter(c => !['basic', 'overtime', 'bonus', 'social_ins', 'income_tax'].includes(c.key))
        .map(c => `${c.type === 'entitlement' ? '(Ent)' : '(Ded)'} ${c.label}`);
    
    const financialHeaders = [...coreFinancials, ...customFinancials];
    const headerRow = [...standardHeaders, ...financialHeaders].join(',');
    
    // Test data from your prompt mapping to the specific headers
    const row1 = ['Sarah Ahmed', 'sarah.ahmed@konecta.com', 'Vodafone UK', 'CSR', 'eg5441', 'CIB', 'EG1200000000001234567890', 'EGP', '30', '2', '0', '0', '4500', '265', '500', '579', '0', ...customFinancials.map(()=>'0')].join(',');
    const row2 = ['Mohamed Ali', 'mohamed.ali@konecta.com', 'Orange Business', 'Team Leader', 'eg5442', 'QNB Alahli', 'EG9800000000009876543210', 'EGP', '30', '0', '8', '8', '7200', '1250', '1200', '1062', '530', ...customFinancials.map(()=>'0')].join(',');
    const row3 = ['Layla Youssef', 'layla.youssef@konecta.com', 'Amazon DE', 'QA Specialist', 'eg5443', 'HSBC', 'EG5500000000005555555555', 'EGP', '30', '0', '0', '0', '5800', '105', '300', '683', '52', ...customFinancials.map(()=>'0')].join(',');

    const csvContent = "data:text/csv;charset=utf-8," + headerRow + "\n" + row1 + "\n" + row2 + "\n" + row3;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `konecta_payroll_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadFromDB = () => {
    if (masterDB.length === 0) {
      showNotification('Database is empty.', 'error');
      return;
    }
    setEmployees(masterDB);
    setView('review');
    showNotification(`Loaded ${masterDB.length} employees.`);
  };

  const handleImportMock = () => {
    // Generate mock data and apply base value logic
    const mock = generateMockData();
    const standardDays = payrollSettings.daysPerMonth;
    
    const processedMock = mock.map(emp => {
       const worked = emp.worked_days || standardDays;
       // Mock data assumes full salary values
       return {
         ...emp,
         worked_days: worked,
         base_values: {
            basic: emp.basic,
            // Add others if present in mock
         }
       };
    });

    setEmployees(processedMock);
    setView('review');
    showNotification('Loaded demo data');
  };

  const handleAddEmployee = () => {
    const standardDays = payrollSettings.daysPerMonth;
    const newEmp = { 
        id: `eg${Math.floor(Math.random()*9000)+1000}`, 
        name: 'New Employee', 
        role: 'CSR', 
        email: 'employee@konecta.com', 
        project: 'General', 
        basic: 0, 
        bonus: 0, 
        worked_days: standardDays,
        base_values: { basic: 0 }
    };
    setEmployees([...employees, newEmp]);
    logAction('Add Employee', `Added new employee ${newEmp.id}`);
    showNotification('Row added');
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Remove employee?')) {
      setEmployees(employees.filter(e => e.id !== id));
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
      logAction('Delete Employee', `Removed employee ID ${id}`);
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) return;
    
    const standardHeaders = ['Name', 'Email', 'Project', 'Title', 'EGID', 'Bank Name', 'IBAN', 'Currency', 'Worked Days', 'OT 1.35', 'OT 1.7', 'Public Holiday'];
    const financialHeaders = columns.map(c => `${c.type === 'entitlement' ? '(Ent)' : '(Ded)'} ${c.label}`);
    const headers = [...standardHeaders, ...financialHeaders, 'Net Pay'];

    const csvRows = employees.map(emp => {
      const net = calculateNet(emp);
      const esc = (val) => val == null ? '' : '"' + String(val).replace(/"/g, '""') + '"';
      
      const row = [
        esc(emp.name), 
        esc(emp.email), 
        esc(emp.project || 'General'), 
        esc(emp.role || ''),
        esc(emp.id), 
        esc(emp.bank_name || ''),
        esc(emp.iban || ''),
        esc(emp.currency || 'EGP'),
        esc(emp.worked_days || 0),
        esc(emp.ot_135 || 0),
        esc(emp.ot_17 || 0),
        esc(emp.ph_hours || 0),
        ...columns.map(c => emp[c.key] || 0), 
        net
      ];
      return row.join(',');
    });
    
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Konecta_${MONTHS[payrollPeriod.month]}_${payrollPeriod.year}.csv`;
    link.click();
    logAction('Export CSV', 'Exported current payroll data');
  };

  // --- NEW: Batch Print / Download All ---
  const handleBatchPrint = () => {
    setView('print-batch');
    setTimeout(() => {
        window.print();
    }, 500);
  };

  const handleApplyEgyptianTax = () => {
    let newCols = [...columns];
    if (!newCols.find(c => c.key === 'social_ins')) newCols.push({ key: 'social_ins', label: 'Social Insurance', type: 'deduction' });
    if (!newCols.find(c => c.key === 'income_tax')) newCols.push({ key: 'income_tax', label: 'Income Tax', type: 'deduction' });
    setColumns(newCols);
    setEmployees(prev => prev.map(emp => {
      const gross = newCols.filter(c => c.type === 'entitlement').reduce((sum, c) => sum + (emp[c.key] || 0), 0);
      const { socialInsurance, monthlyTax } = calculateEgyptDeductions(gross);
      return { ...emp, social_ins: socialInsurance, income_tax: monthlyTax };
    }));
    logAction('Tax Calculation', 'Applied Egyptian tax rules');
    showNotification('Tax applied!');
  };

  const handleApplyOvertime = (id, amount) => {
    if (!columns.find(c => c.key === 'overtime')) {
      setColumns([...columns, { key: 'overtime', label: 'Overtime', type: 'entitlement' }]);
    }
    // Simple addition for manual button
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, overtime: (emp.overtime || 0) + amount } : emp));
    showNotification(`Added ${amount} EGP Overtime`);
    logAction('Overtime Applied', `Added ${amount} EGP to Employee ${id}`);
  };

  // --- NEW: Apply Proration (Global Button) ---
  const handleApplyProration = (id, workedDays, colKeys) => {
    // This is for the modal tool
    handleUpdateField(id, 'worked_days', workedDays); // Reuse logic
    showNotification(`Proration applied`);
    logAction('Proration Applied', `Employee ${id}: Worked ${workedDays} days`);
  };

  const handleWhatsApp = (emp) => {
    const net = calculateNet(emp);
    const msg = `Hello ${emp.name},\nYour payslip for ${MONTHS[payrollPeriod.month]} is generated.\nNet Salary: ${net.toLocaleString()} EGP.\nCheck your email for details.`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // --- REFACTORED: Unified Update Field (Handles OT Calculation & Proration) ---
  const handleUpdateField = (id, field, value) => {
    const currentDivisor = payrollSettings.daysPerMonth * payrollSettings.hoursPerDay;
    const standardDays = payrollSettings.daysPerMonth;

    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      
      let updatedEmp = { ...emp };
      
      // Ensure base_values exist
      if (!updatedEmp.base_values) updatedEmp.base_values = { basic: updatedEmp.basic || 0 };

      // Handle simple text fields
      if (['name', 'role', 'project', 'id', 'email', 'bank_name', 'iban', 'currency'].includes(field)) {
         updatedEmp[field] = value;
         if (field === 'name') updatedEmp.email = value.toLowerCase().trim().replace(/\s+/g, '.') + '@konecta.com';
      } 
      // Handle Worked Days (Proration Trigger)
      else if (field === 'worked_days') {
         const newDays = parseFloat(value) || 0;
         updatedEmp.worked_days = newDays;
         const ratio = (standardDays > 0) ? (newDays / standardDays) : 1;
         
         // Update Basic Salary based on stored BASE
         updatedEmp.basic = Math.round((updatedEmp.base_values.basic || 0) * ratio);
         
         // Update other entitlements (except OT/Bonus)
         columns.filter(c => c.type === 'entitlement' && c.key !== 'overtime' && c.key !== 'bonus').forEach(col => {
             const baseVal = updatedEmp.base_values[col.key];
             if (baseVal !== undefined) {
                 updatedEmp[col.key] = Math.round(baseVal * ratio);
             }
         });
      }
      // Handle Numeric Hours (OT Calc)
      else if (['ot_135', 'ot_17', 'ph_hours'].includes(field)) {
         updatedEmp[field] = parseFloat(value) || 0;
         const baseBasic = updatedEmp.base_values.basic || updatedEmp.basic || 0;
         
         const otVal = 
            calculateOvertimeValue(baseBasic, updatedEmp.ot_135 || 0, 1.35, currentDivisor) +
            calculateOvertimeValue(baseBasic, updatedEmp.ot_17 || 0, 1.7, currentDivisor) +
            calculateOvertimeValue(baseBasic, updatedEmp.ph_hours || 0, 2, currentDivisor);
            
         updatedEmp.overtime = otVal;
      }
      // Handle Money Fields
      else if (columns.find(c => c.key === field)) {
          const newVal = parseFloat(value) || 0;
          updatedEmp[field] = newVal;
          
          const ratio = (updatedEmp.worked_days > 0 && standardDays > 0) ? (updatedEmp.worked_days / standardDays) : 1;
          
          if (field === 'basic' || (columns.find(c => c.key === field).type === 'entitlement' && field !== 'overtime' && field !== 'bonus')) {
             updatedEmp.base_values[field] = Math.round(newVal / ratio);
          }

          if (field === 'basic') {
             const baseBasic = updatedEmp.base_values.basic;
             const otVal = 
                calculateOvertimeValue(baseBasic, updatedEmp.ot_135 || 0, 1.35, currentDivisor) +
                calculateOvertimeValue(baseBasic, updatedEmp.ot_17 || 0, 1.7, currentDivisor) +
                calculateOvertimeValue(baseBasic, updatedEmp.ph_hours || 0, 2, currentDivisor);
             updatedEmp.overtime = otVal;
          }
      }

      return updatedEmp;
    }));
  };

  const startSendingProcess = async () => {
    if (!emailConfig.publicKey) {
      alert("Please configure EmailJS first!");
      setShowSettings(true);
      return;
    }
    const targetList = selectedIds.length > 0 ? employees.filter(e => selectedIds.includes(e.id)) : employees;
    setView('sending');
    setSendingProgress(0);
    
    // emailjs.init(emailConfig.publicKey);

    for (let i = 0; i < targetList.length; i++) {
      const net = calculateNet(targetList[i]);
      const templateParams = {
        to_email: targetList[i].email,
        to_name: targetList[i].name,
        net_pay: net.toLocaleString(),
        hr_id: targetList[i].id,
        project: targetList[i].project,
        month: `${MONTHS[payrollPeriod.month]} ${payrollPeriod.year}`,
        message_body: emailMessage
      };

      // await emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
      await new Promise(resolve => setTimeout(resolve, 300));
      setSendingProgress(Math.round(((i + 1) / targetList.length) * 100));
    }

    saveToHistory(targetList);

    setTimeout(() => {
      setView('dashboard');
      showNotification(`Sent to ${targetList.length} employees`);
      setSelectedIds([]);
    }, 1000);
  };

  const calculateNet = (emp) => {
    let net = 0;
    columns.forEach(col => {
      const val = emp[col.key] || 0;
      col.type === 'entitlement' ? net += val : net -= val;
    });
    return net;
  };

  // --- COMPONENT: Period Selector ---
  const PeriodSelector = () => (
    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
      <Calendar size={16} className="text-slate-500" />
      <select 
        value={payrollPeriod.month} 
        onChange={(e) => setPayrollPeriod({...payrollPeriod, month: parseInt(e.target.value)})}
        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
      >
        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <div className="w-px h-4 bg-slate-200"></div>
      <select 
        value={payrollPeriod.year} 
        onChange={(e) => setPayrollPeriod({...payrollPeriod, year: parseInt(e.target.value)})}
        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
      >
        {[0,1,2].map(i => <option key={i} value={2024+i}>{2024+i}</option>)}
      </select>
    </div>
  );

  // --- VIEWS ---
  // New View: Batch Print
  const BatchPrintView = () => (
    <div className="bg-slate-200 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
           <Button variant="secondary" onClick={() => setView('review')} icon={ArrowLeft}>Back</Button>
           <h2 className="text-xl font-bold text-slate-800">Batch Print Preview</h2>
         </div>
         <div className="flex gap-2">
            <div className="text-xs text-slate-500 max-w-xs text-right hidden lg:block">
              For batch PDF download: Click 'Print / Save All' and select 'Save as PDF' in the print dialog. This generates a single PDF with all selected payslips, each on a new page.
            </div>
            <Button onClick={() => window.print()} icon={Printer}>Print / Save All as PDF</Button>
         </div>
      </div>
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
         {/* Filter employees if selection is active */}
         {(selectedIds.length > 0 ? employees.filter(e => selectedIds.includes(e.id)) : employees).map((emp, index) => (
           <div key={emp.id} className="mb-12 print:mb-0 print:h-screen print:flex print:flex-col print:justify-between print:break-after-page shadow-2xl print:shadow-none bg-white rounded-xl overflow-hidden">
             <PayslipDocument employee={emp} columns={columns} period={payrollPeriod} standardDays={payrollSettings.daysPerMonth} />
           </div>
         ))}
      </div>
    </div>
  );

  const AuditView = () => (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-slate-800">Audit Logs</h2><p className="text-slate-500">Track all system activities and changes.</p></div>
        <Button variant="secondary" onClick={() => { localStorage.removeItem('konecta_audit_logs'); setAuditLogs([]); showNotification('Logs Cleared'); }} icon={Trash2}>Clear Logs</Button>
      </div>
      <Card className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr><th className="px-6 py-4">Timestamp</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.length === 0 ? <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No logs found.</td></tr> : auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                <td className="px-6 py-4">{log.user}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{log.action}</td>
                <td className="px-6 py-4 text-slate-500">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const HistoryView = () => (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-slate-800">Payroll History</h2><p className="text-slate-500">Archive of all sent payslips.</p></div>
        <Button variant="secondary" onClick={() => { localStorage.removeItem('konecta_payroll_history'); setHistory([]); showNotification('History Cleared'); }} icon={Trash2}>Clear History</Button>
      </div>
      <Card className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr><th className="px-6 py-4">Period</th><th className="px-6 py-4">Date Sent</th><th className="px-6 py-4">Employees</th><th className="px-6 py-4">Total</th><th className="px-6 py-4">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No history found.</td></tr> : history.map((batch) => (
              <tr key={batch.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-blue-900">{batch.month} {batch.year}</td>
                <td className="px-6 py-4">{new Date(batch.date).toLocaleDateString()}</td>
                <td className="px-6 py-4">{batch.count}</td>
                <td className="px-6 py-4 font-bold text-green-600">{batch.total.toLocaleString()} EGP</td>
                <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Sent</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const DatabaseView = () => (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-slate-800">Employee Database</h2><p className="text-slate-500">Master record of all employees.</p></div>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={() => {localStorage.removeItem('konecta_employee_db'); setMasterDB([]); showNotification('DB Cleared');}} icon={Trash2}>Clear DB</Button>
           <Button variant="primary" icon={Save} onClick={saveToMasterDB}>Save Changes</Button>
        </div>
      </div>
      <Card className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Title/Role</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Project</th><th className="px-6 py-4">EGID</th><th className="px-6 py-4">Base Salary</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {masterDB.length === 0 ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400">Database is empty. Upload/Save data from Review tab.</td></tr> : masterDB.map((emp, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{emp.name}</td>
                <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp.role || 'N/A'}</td>
                <td className="px-6 py-4">{emp.email}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{emp.project || 'General'}</span></td>
                <td className="px-6 py-4 font-mono text-slate-500">{emp.id}</td>
                <td className="px-6 py-4">{emp.basic.toLocaleString()} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const Dashboard = () => {
    const lastBatch = history.length > 0 ? history[0] : null;
    const totalDisbursedAllTime = history.reduce((sum, b) => sum + b.total, 0);
    
    // Analytics: Spending by Role
    const spendingByRole = masterDB.reduce((acc, emp) => {
      const role = emp.role || 'Other';
      acc[role] = (acc[role] || 0) + (emp.basic || 0);
      return acc;
    }, {});
    const maxSpending = Math.max(...Object.values(spendingByRole), 1);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex justify-between items-start"><div><p className="text-slate-500 text-sm font-medium">Last Batch Sent</p><h3 className="text-xl font-bold text-slate-800 mt-1">{lastBatch ? new Date(lastBatch.date).toLocaleDateString() : 'No Data'}</h3></div><div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Clock size={24} /></div></div>
            {lastBatch && <p className="text-xs text-slate-500 mt-2">{lastBatch.count} Employees ({lastBatch.month})</p>}
          </Card>
          <Card className="p-6 border-l-4 border-l-green-500">
             <div className="flex justify-between items-start"><div><p className="text-slate-500 text-sm font-medium">Total Disbursed (History)</p><h3 className="text-xl font-bold text-slate-800 mt-1">{totalDisbursedAllTime > 1000000 ? (totalDisbursedAllTime/1000000).toFixed(2) + 'M' : (totalDisbursedAllTime/1000).toFixed(1) + 'K'} EGP</h3></div><div className="bg-green-50 p-3 rounded-lg text-green-600"><BarChart3 size={24} /></div></div>
          </Card>
          <Card className="p-6 border-l-4 border-l-purple-500">
             <div className="flex justify-between items-start"><div><p className="text-slate-500 text-sm font-medium">Database Size</p><h3 className="text-xl font-bold text-slate-800 mt-1">{masterDB.length} Records</h3></div><div className="bg-purple-50 p-3 rounded-lg text-purple-600"><Database size={24} /></div></div>
          </Card>
        </div>
        
        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 col-span-1 md:col-span-2">
             <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={20}/> Cost Distribution by Role</h3>
             {Object.keys(spendingByRole).length === 0 ? <p className="text-slate-400 italic">Load database to see analytics.</p> : (
               <div className="space-y-3">
                 {Object.entries(spendingByRole).map(([role, amount]) => (
                   <div key={role}>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium text-slate-700">{role}</span>
                       <span className="text-slate-500">{amount.toLocaleString()} EGP</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2.5">
                       <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(amount/maxSpending)*100}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </Card>
          
          <Card className="p-8 flex flex-col items-center justify-center text-center h-full border border-slate-100 bg-slate-50">
             <div className="w-16 h-16 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mb-4"><RotateCcw size={32} /></div>
             <h3 className="text-xl font-bold text-slate-800">Start Payroll</h3>
             <p className="text-slate-500 mt-2 max-w-xs mb-4">Launch a new payroll run for this month.</p>
             <Button onClick={() => setView('upload')} icon={ChevronRight}>New Run</Button>
          </Card>
        </div>
      </div>
    );
  };

  if (view === 'print-batch') return <BatchPrintView />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {/* UPDATED LOGO */}
            <img 
               src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" 
               alt="Konecta Logo" 
               className="h-8 w-auto" 
            />
            <span className="text-xl font-bold text-blue-900 tracking-tight ml-2">
              konecta<span className="text-blue-400">pay</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Dashboard</button>
          <button onClick={() => setView('upload')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'upload' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={20} /> Payroll Run</button>
          <button onClick={() => setView('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'database' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Database size={20} /> Database</button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Clock size={20} /> History</button>
          <button onClick={() => setView('audit')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'audit' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} /> Audit Logs</button>
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Settings size={20} /> Settings</button>
        </nav>
        <div className="p-4 border-t border-slate-100"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden"><div className="w-full h-full bg-blue-900 text-white flex items-center justify-center">FM</div></div><div><p className="text-sm font-bold text-slate-800">Financial Mgr.</p><p className="text-xs text-slate-500">Konecta Egypt</p></div></div></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-700 capitalize">{view === 'dashboard' && 'Financial Overview'}{view === 'upload' && 'Payroll Run'}{view === 'review' && 'Payroll Revision'}{view === 'sending' && 'Processing'}{view === 'audit' && 'System Audit Logs'}{view === 'history' && 'Transaction History'}{view === 'database' && 'Master Database'}</h1>
            {/* Added Period Selector to Upload view as well */}
            {(view === 'review' || view === 'upload') && <PeriodSelector />}
          </div>
          <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">System Date: {new Date().toLocaleDateString('en-GB')}</div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {notification && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white animate-in fade-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>{notification.message}</div>}
          {view === 'dashboard' && <Dashboard />}
          {view === 'history' && <HistoryView />}
          {view === 'database' && <DatabaseView />}
          {view === 'audit' && <AuditView />}
          {view === 'upload' && (
            <div className="max-w-xl mx-auto mt-10">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><FileText size={40} /></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Payroll Run: {MONTHS[payrollPeriod.month]} {payrollPeriod.year}</h2>
                <div className="flex flex-col gap-3 mt-6">
                  <div className="relative"><input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Button className="w-full py-3" icon={FileUp}>Upload CSV File</Button></div>
                  <Button variant="secondary" onClick={handleDownloadTemplate} className="w-full" icon={Download}>Download Template</Button>
                  <Button variant="primary" icon={Database} onClick={handleLoadFromDB} className="w-full">Load from Master DB</Button>
                  <Button variant="secondary" onClick={handleImportMock} className="w-full">Load Demo Data (Test)</Button>
                </div>
              </div>
            </div>
          )}
          {view === 'review' && (
             <div className="h-full flex flex-col relative">
               <div className="flex justify-between items-end mb-6">
                 <div><h2 className="text-2xl font-bold text-slate-800">Review & Revise</h2><p className="text-slate-500">Auto-calculate taxes or manually edit before sending.</p></div>
                 <div className="flex gap-3">
                   {selectedIds.length > 0 && <div className="bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in border border-blue-100"><span className="text-sm font-bold text-blue-800">{selectedIds.length} Selected</span><button onClick={handleBulkDelete} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium"><Trash2 size={16}/> Delete</button><div className="w-px h-4 bg-blue-200"></div><button onClick={startSendingProcess} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold"><Send size={16}/> Send Selected</button></div>}
                   <Button variant="secondary" icon={Save} onClick={saveToMasterDB}>Save to DB</Button>
                   <Button variant="secondary" icon={FileDown} onClick={handleExportCSV}>Export CSV</Button>
                   {/* NEW: Batch Download Button */}
                   <Button variant="secondary" icon={Printer} onClick={handleBatchPrint}>Download All (PDF)</Button>
                   <Button variant="outline" icon={Scissors} onClick={() => setShowProrationModal(true)}>Prorate</Button>
                   <Button variant="outline" icon={Calculator} onClick={handleApplyEgyptianTax}>Auto-Calc Tax</Button>
                   <Button variant="outline" icon={Clock} onClick={() => setShowOTModal(true)}>Calc OT</Button>
                   <Button icon={Send} onClick={startSendingProcess}>Approve & Send {selectedIds.length > 0 ? 'Selected' : 'All'}</Button>
                 </div>
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col relative">
                 <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center gap-4">
                    <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search by name, EGID, project or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="flex gap-2"><Button variant="secondary" className="text-xs py-1" icon={UserPlus} onClick={handleAddEmployee}>Add Employee</Button><Button variant="secondary" className="text-xs py-1" icon={Plus} onClick={() => setShowAddColModal(true)}>Add Column</Button></div>
                 </div>
                 <div className="overflow-auto h-full">
                   <table className="w-full text-left text-sm text-slate-600">
                     <thead className="bg-white text-xs uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                       <tr>
                         <th className="px-6 py-4 w-12 bg-slate-50"><input type="checkbox" onChange={handleSelectAll} checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></th>
                         <th className="px-6 py-4 min-w-[150px] bg-slate-50">Employee</th>
                         <th className="px-6 py-4 bg-slate-50">Role / Project</th>
                         <th className="px-6 py-4 bg-slate-50 min-w-[180px]">Bank Details</th>
                         {/* New OT Headers */}
                         <th className="px-2 py-4 bg-slate-50 w-16 text-center text-xs font-bold text-slate-600">OT<br/><span className="text-[9px] text-slate-400 font-normal">1.35x</span></th>
                         <th className="px-2 py-4 bg-slate-50 w-16 text-center text-xs font-bold text-slate-600">OT<br/><span className="text-[9px] text-slate-400 font-normal">1.7x</span></th>
                         <th className="px-2 py-4 bg-slate-50 w-16 text-center text-xs font-bold text-slate-600">PH<br/><span className="text-[9px] text-slate-400 font-normal">2x</span></th>
                         
                         <th className="px-6 py-4 bg-slate-50 w-24">Worked Days<br/><span className="text-[10px] text-slate-400 font-normal">Proration</span></th>
                         {columns.map(col => (<th key={col.key} className={`px-6 py-4 min-w-[120px] bg-slate-50 border-l ${col.type === 'entitlement' ? 'border-green-100 text-green-700' : 'border-red-100 text-red-600'}`}>{col.label} <span className="text-[10px] opacity-70 block">{col.type}</span></th>))}
                         <th className="px-6 py-4 font-bold text-slate-800 bg-slate-50 border-l">Net Pay</th><th className="px-6 py-4 text-center bg-slate-50 sticky right-0">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredEmployees.map((emp) => {
                         const net = calculateNet(emp);
                         const isSelected = selectedIds.includes(emp.id);
                         const hasOvertime = (emp.overtime || 0) > 0;
                         const isProrated = (emp.worked_days !== payrollSettings.daysPerMonth);
                         
                         return (
                           <tr key={emp.id} className={`transition-colors group ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}>
                             <td className={`px-6 py-4 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(emp.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></td>
                             <td className={`px-6 py-4 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                               <input 
                                type="text" 
                                value={emp.name} 
                                onChange={(e) => handleUpdateField(emp.id, 'name', e.target.value)}
                                className="w-full bg-transparent border-b border-dashed border-transparent focus:border-blue-300 focus:outline-none font-medium text-slate-900"
                                placeholder="Name"
                               />
                               <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-slate-400">EGID:</span>
                                <input 
                                  type="text" 
                                  value={emp.id} 
                                  onChange={(e) => handleUpdateField(emp.id, 'id', e.target.value)}
                                  className="w-20 text-xs font-mono font-bold text-slate-500 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-300"
                                />
                               </div>
                               <input 
                                  type="text" 
                                  value={emp.email} 
                                  onChange={(e) => handleUpdateField(emp.id, 'email', e.target.value)}
                                  className="w-full text-xs text-slate-400 bg-transparent focus:outline-none focus:text-slate-600 mt-1"
                                  placeholder="Email"
                               />
                             </td>
                             <td className={`px-6 py-4 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                               <div className="flex flex-col gap-1">
                                 <input 
                                  type="text" 
                                  value={emp.role} 
                                  onChange={(e) => handleUpdateField(emp.id, 'role', e.target.value)}
                                  className="w-full text-xs font-bold text-slate-700 bg-slate-100 rounded px-1 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-200"
                                  placeholder="Job Title"
                                 />
                                 <input 
                                  type="text" 
                                  value={emp.project} 
                                  onChange={(e) => handleUpdateField(emp.id, 'project', e.target.value)}
                                  className="w-full text-xs text-blue-600 bg-blue-50 rounded px-1 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-200"
                                  placeholder="Project"
                                 />
                               </div>
                             </td>

                             {/* Bank Details Column */}
                             <td className={`px-6 py-4 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                               <div className="space-y-1">
                                 <div className="flex items-center gap-1">
                                   <Building2 size={12} className="text-slate-400"/>
                                   <input 
                                    type="text" 
                                    value={emp.bank_name || ''} 
                                    onChange={(e) => handleUpdateField(emp.id, 'bank_name', e.target.value)}
                                    className="w-full text-xs bg-transparent border-b border-dashed border-transparent focus:border-blue-300 focus:outline-none placeholder-slate-300"
                                    placeholder="Bank Name"
                                   />
                                 </div>
                                 <div className="flex items-center gap-1">
                                   <CreditCard size={12} className="text-slate-400"/>
                                   <input 
                                    type="text" 
                                    value={emp.iban || ''} 
                                    onChange={(e) => handleUpdateField(emp.id, 'iban', e.target.value)}
                                    className="w-full text-xs font-mono text-slate-500 bg-transparent border-b border-dashed border-transparent focus:border-blue-300 focus:outline-none placeholder-slate-300"
                                    placeholder="IBAN"
                                   />
                                 </div>
                                 <div className="flex items-center gap-1">
                                   <DollarSign size={12} className="text-slate-400"/>
                                   <input 
                                    type="text" 
                                    value={emp.currency || 'EGP'} 
                                    onChange={(e) => handleUpdateField(emp.id, 'currency', e.target.value)}
                                    className="w-12 text-xs font-bold text-slate-700 bg-transparent border-b border-dashed border-transparent focus:border-blue-300 focus:outline-none"
                                    placeholder="Curr"
                                   />
                                 </div>
                               </div>
                             </td>
                             
                             {/* OT 1.35x */}
                             <td className={`px-2 py-4 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                               <input 
                                 type="number" 
                                 value={emp.ot_135 || 0} 
                                 onChange={(e) => handleUpdateField(emp.id, 'ot_135', e.target.value)}
                                 className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-center text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                               />
                             </td>
                             {/* OT 1.7x */}
                             <td className={`px-2 py-4 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                               <input 
                                 type="number" 
                                 value={emp.ot_17 || 0} 
                                 onChange={(e) => handleUpdateField(emp.id, 'ot_17', e.target.value)}
                                 className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-center text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                               />
                             </td>
                             {/* Public Holiday 2x */}
                             <td className={`px-2 py-4 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                               <input 
                                 type="number" 
                                 value={emp.ph_hours || 0} 
                                 onChange={(e) => handleUpdateField(emp.id, 'ph_hours', e.target.value)}
                                 className="w-12 bg-purple-50 border border-purple-200 rounded px-1 py-1 text-center text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                               />
                             </td>

                             {/* Worked Days Input (Proration) */}
                             <td className={`px-6 py-4 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                               <div className="flex flex-col items-center">
                                 <input 
                                   type="number" 
                                   value={emp.worked_days || payrollSettings.daysPerMonth} 
                                   onChange={(e) => handleUpdateField(emp.id, 'worked_days', e.target.value)}
                                   className={`w-16 border rounded px-2 py-1 text-center focus:ring-2 focus:outline-none ${isProrated ? 'bg-orange-50 border-orange-200 focus:ring-orange-500 text-orange-700 font-bold' : 'bg-white border-slate-200 focus:ring-blue-500'}`}
                                 />
                                 {isProrated && <span className="text-[9px] text-orange-500 font-bold mt-1">PRORATED</span>}
                               </div>
                             </td>

                             {columns.map(col => (<td key={col.key} className={`px-6 py-4 border-l ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'} ${col.type === 'entitlement' ? 'border-green-50' : 'border-red-50'}`}><div className="flex items-center"><span className={`text-xs mr-1 ${col.type === 'entitlement' ? 'text-green-400' : 'text-red-400'}`}>{col.type === 'entitlement' ? '+' : '-'}</span><input type="number" value={emp[col.key] || 0} onChange={(e) => handleUpdateField(emp.id, col.key, e.target.value)} className={`w-20 bg-transparent border-b border-dashed border-slate-300 focus:outline-none ${col.key === 'overtime' ? 'font-bold text-blue-600' : ''}`} readOnly={col.key === 'overtime'} /></div></td>))}
                             <td className={`px-6 py-4 border-l ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                                <div className="flex flex-col">
                                  <span className="font-bold text-blue-900">{net.toLocaleString()}</span>
                                  {hasOvertime && <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded inline-block w-fit mt-1 font-bold">+OT Included</span>}
                                </div>
                             </td>
                             <td className={`px-6 py-4 text-center sticky right-0 flex justify-center gap-2 ${isSelected ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-white group-hover:bg-slate-50'}`}>
                               <button onClick={() => setPreviewId(emp.id)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors" title="Preview PDF"><Eye size={18} /></button>
                               {/* WhatsApp Button */}
                               <button onClick={() => handleWhatsApp(emp)} className="text-green-600 hover:bg-green-100 p-2 rounded-full transition-colors" title="Send via WhatsApp"><Phone size={18} /></button>
                               <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-full transition-colors" title="Delete Row"><Trash2 size={18} /></button>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
          )}
          {view === 'sending' && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-8 relative">
                <Send size={40} className={`transform transition-transform duration-500 ${sendingProgress < 100 ? '-translate-x-1 translate-y-1' : 'translate-x-6 -translate-y-6 opacity-0'}`} />
                {sendingProgress === 100 && <CheckCircle size={40} className="absolute text-green-500 animate-in fade-in zoom-in" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{sendingProgress === 100 ? 'Sent Successfully!' : 'Sending Payslips...'}</h2>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-4"><div className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${sendingProgress}%` }}></div></div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      <OvertimeModal 
        isOpen={showOTModal} 
        onClose={() => setShowOTModal(false)} 
        employees={employees} 
        onApply={handleApplyOvertime} 
        divisor={payrollSettings.daysPerMonth * payrollSettings.hoursPerDay}
      />

      <ProrationModal 
        isOpen={showProrationModal} 
        onClose={() => setShowProrationModal(false)} 
        employees={employees} 
        columns={columns}
        onApply={handleApplyProration}
        standardDays={payrollSettings.daysPerMonth}
      />

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings size={24} className="text-blue-600" /> System Settings</h2>
            
            <div className="space-y-6">
              {/* Payroll Configuration Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Clock size={16}/> Payroll Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Standard Days/Month</label>
                    <input 
                      type="number" 
                      value={payrollSettings.daysPerMonth} 
                      onChange={(e) => setPayrollSettings({...payrollSettings, daysPerMonth: parseFloat(e.target.value) || 0})} 
                      className="w-full p-2 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Standard Hours/Day</label>
                    <input 
                      type="number" 
                      value={payrollSettings.hoursPerDay} 
                      onChange={(e) => setPayrollSettings({...payrollSettings, hoursPerDay: parseFloat(e.target.value) || 0})} 
                      className="w-full p-2 border border-slate-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Current Divisor: {payrollSettings.daysPerMonth * payrollSettings.hoursPerDay} Hours
                  </span>
                </div>
              </div>

              {/* Email Configuration Section */}
              <div>
                <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Mail size={16}/> Email Service (EmailJS)</h3>
                <div className="space-y-3">
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Service ID</label><input type="text" value={emailConfig.serviceId} onChange={(e) => setEmailConfig({...emailConfig, serviceId: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="service_xxxxx" /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Template ID</label><input type="text" value={emailConfig.templateId} onChange={(e) => setEmailConfig({...emailConfig, templateId: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="template_xxxxx" /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Public Key</label><input type="text" value={emailConfig.publicKey} onChange={(e) => setEmailConfig({...emailConfig, publicKey: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="public_key_xxxxx" /></div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><MessageSquare size={16}/> Email Body Template</label>
                <textarea 
                  value={emailMessage} 
                  onChange={(e) => setEmailMessage(e.target.value)} 
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm h-20 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter message..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8"><Button variant="secondary" className="flex-1" onClick={() => setShowSettings(false)}>Cancel</Button><Button className="flex-1" onClick={saveEmailConfig}>Save All Settings</Button></div>
          </div>
        </div>
      )}
      {previewId && <PayslipPreview employee={employees.find(e => e.id === previewId)} columns={columns} period={payrollPeriod} standardDays={payrollSettings.daysPerMonth} onClose={() => setPreviewId(null)} />}
      {showAddColModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-slate-200 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-800">Add Custom Column</h3>
              <button onClick={() => setShowAddColModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLUMNS.entitlements.map(name => (
                    <button key={name} onClick={() => { setNewColData({label: name, type: 'entitlement'}); }} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newColData.label === name ? 'bg-green-100 border-green-300 text-green-700 ring-1 ring-green-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-green-200'}`}>
                      + {name}
                    </button>
                  ))}
                  {PRESET_COLUMNS.deductions.map(name => (
                    <button key={name} onClick={() => { setNewColData({label: name, type: 'deduction'}); }} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newColData.label === name ? 'bg-red-100 border-red-300 text-red-700 ring-1 ring-red-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-200'}`}>
                      - {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Column Name</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Transportation"
                  value={newColData.label}
                  onChange={e => setNewColData({...newColData, label: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setNewColData({...newColData, type: 'entitlement'})}
                    className={`py-3 text-sm font-bold rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${newColData.type === 'entitlement' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:border-green-200'}`}
                  >
                    <Plus size={16}/> Entitlement (Add)
                  </button>
                   <button 
                    onClick={() => setNewColData({...newColData, type: 'deduction'})}
                    className={`py-3 text-sm font-bold rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${newColData.type === 'deduction' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:border-red-200'}`}
                  >
                    <Trash2 size={16}/> Deduction (Cut)
                  </button>
                </div>
              </div>

              <Button className="w-full py-3 mt-4" onClick={() => { if(!newColData.label) return; handleAddColumn(newColData.label, newColData.type); setShowAddColModal(false); }}>
                Add Column to Table
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
