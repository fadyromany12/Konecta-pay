import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, Send, Users, CheckCircle, AlertCircle, 
  Search, Download, ChevronRight, BarChart3, Calendar, 
  Settings, X, Eye, Calculator, FileDown, Plus, Trash2,
  Mail, Key, HelpCircle, UserPlus, FileUp, Save, Filter, CheckSquare,
  Database, Clock, RotateCcw, CreditCard, PieChart, Printer, ClipboardList,
  MessageSquare, Phone, ArrowLeft, Briefcase, DollarSign, Building2, Scissors,
  LogOut, Cloud, Lock, Loader2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  setDoc
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAqPwESS1hAcdEmkG0lsesgadeLDKgOQRw",
  authDomain: "konectapay-43d60.firebaseapp.com",
  projectId: "konectapay-43d60",
  storageBucket: "konectapay-43d60.firebasestorage.app",
  messagingSenderId: "291857733282",
  appId: "1:291857733282:web:bb1b3a3cca387f562fe9fb",
  measurementId: "G-VS6L9P0JKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONFIGURATION ---
const ADMIN_EMAILS = [
  "admin@konecta.com", 
  "finance@konecta.com",
  "manager@konecta.com" 
]; 

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
  { id: 'EG5441', name: 'Sarah Ahmed', role: 'CSR', email: 'sarah.ahmed@konecta.com', project: 'Vodafone UK', basic: 10000, bonus: 500, ot_135: 2, ot_17: 0, ph_hours: 0, overtime: 265, bank_name: 'CIB', iban: 'EG1200000000001234567890', currency: 'EGP', worked_days: 30 },
  { id: 'EG5442', name: 'Mohamed Ali', role: 'Team Leader', email: 'mohamed.ali@konecta.com', project: 'Orange Business', basic: 15000, bonus: 1200, ot_135: 0, ot_17: 8, ph_hours: 8, overtime: 1250, bank_name: 'QNB Alahli', iban: 'EG9800000000009876543210', currency: 'EGP', worked_days: 30 },
  { id: 'EG5443', name: 'Layla Youssef', role: 'QA Specialist', email: 'layla.youssef@konecta.com', project: 'Amazon DE', basic: 12000, bonus: 300, ot_135: 0, ot_17: 0, ph_hours: 0, overtime: 105, bank_name: 'HSBC', iban: 'EG5500000000005555555555', currency: 'EGP', worked_days: 25 },
];

// --- COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = "primary", onClick, disabled, className = "", icon: Icon }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all active:scale-95",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all active:scale-95",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95",
    success: "bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- COMPONENT: Login Screen ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading,FLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    FLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'employee';
      onLogin(userCredential.user, role);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error(err);
    } finally {
      FLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-900 p-8 text-center">
           <img src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" alt="Konecta Logo" className="h-16 w-auto mx-auto mb-4 bg-white rounded-lg p-2 shadow-lg" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Konecta Pay</h1>
          <p className="text-blue-200 text-sm mt-1">Secure Payroll Portal</p>
        </div>
        <div className="p-8">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100"><AlertCircle size={16}/> {error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="email" required className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="name@konecta.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="password" required className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <><LogOut size={18} className="rotate-180"/> Login to System</>}
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">Protected by Firebase Security • Konecta Egypt</div>
        </div>
      </div>
    </div>
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
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 rounded-r">
          <p className="text-amber-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={14}/> Warning: Enter Hours, Not Days!
          </p>
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

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleApply} className="flex-1">Apply Proration</Button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: PayslipDocument ---
const PayslipDocument = ({ employee, columns, period, standardDays, className = "" }) => {
  const safeColumns = columns || [];
  const filterZeroes = (cols) => cols.filter(col => {
    const val = employee[col.key] || 0;
    return MANDATORY_FIELDS.includes(col.key) || val !== 0;
  });

  const entitlementCols = filterZeroes(safeColumns.filter(c => c.type === 'entitlement'));
  const deductionCols = filterZeroes(safeColumns.filter(c => c.type === 'deduction'));
  
  const allEntitlements = safeColumns.filter(c => c.type === 'entitlement');
  const allDeductions = safeColumns.filter(c => c.type === 'deduction');

  const totalEarnings = allEntitlements.reduce((sum, col) => sum + (employee[col.key] || 0), 0);
  const totalDeductions = allDeductions.reduce((sum, col) => sum + (employee[col.key] || 0), 0);
  const netSalary = totalEarnings - totalDeductions;
  
  const date = new Date(period.year, period.month, 1);
  const startDay = 1;
  const lastDay = new Date(period.year, period.month + 1, 0).getDate(); 
  const monthName = MONTHS[period.month];
  const year = period.year;
  const salaryPeriodStr = `${monthName} ${startDay} - ${monthName} ${lastDay}, ${year}`;

  const ot135 = employee.ot_135 || 0;
  const ot17 = employee.ot_17 || 0;
  const phHours = employee.ph_hours || 0; 
  const otValue = employee.overtime || 0;

  const isProrated = employee.worked_days && employee.worked_days !== standardDays;

  return (
    <div className={`bg-white relative text-slate-800 h-full flex flex-col ${className}`}>
      <div className="h-2 w-full bg-gradient-to-r from-blue-700 to-blue-500"></div>
      
      <div className="p-8 flex-1">
        <div className="flex justify-between items-start mb-10">
          <div>
            <img src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" alt="Konecta Logo" className="h-12 w-auto mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global BPO Solutions</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Payslip</h1>
            <p className="text-sm font-medium text-blue-600">{salaryPeriodStr}</p>
            <p className="text-xs text-slate-400 mt-1">Konecta Egypt • Cairo Branch</p>
          </div>
        </div>

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
              {isProrated && <p className="text-sm text-orange-600 font-bold bg-orange-50 inline-block px-2 rounded">Prorated: {employee.worked_days} / {standardDays} Days</p>}
              <p className="text-sm text-slate-600 mt-1"><span className="text-slate-400">Currency:</span> {employee.currency || 'EGP'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
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
                    <td className="py-2.5 text-right font-medium text-green-700">+ {(employee[col.key] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                    <td className="py-2.5 text-right font-medium text-red-600">- {(employee[col.key] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 mb-4">
           <div className="grid grid-cols-2 gap-8">
             <div className="flex justify-between items-center text-sm font-medium text-slate-500"><span>Total Earnings</span><span className="text-green-600">{totalEarnings.toLocaleString()}</span></div>
             <div className="flex justify-between items-center text-sm font-medium text-slate-500"><span>Total Deductions</span><span className="text-red-600">({totalDeductions.toLocaleString()})</span></div>
           </div>
        </div>

        <div className="flex gap-4">
            <div className="bg-slate-900 text-white rounded-xl p-6 flex-1 flex justify-between items-center shadow-lg">
                <div><p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Net Payable</p><p className="text-xs text-slate-400">Transfer pending</p></div>
                <div className="text-right"><p className="text-3xl font-bold">{netSalary.toLocaleString()} <span className="text-lg font-normal text-slate-400">{employee.currency || 'EGP'}</span></p></div>
            </div>
            
            {(ot135 > 0 || ot17 > 0 || phHours > 0) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 w-48 flex flex-col justify-center">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Overtime Breakdown</p>
                    <div className="text-xs text-slate-600 space-y-0.5">
                        {ot135 > 0 && <div className="flex justify-between"><span>Day (1.35x)</span><span>{ot135}h</span></div>}
                        {ot17 > 0 && <div className="flex justify-between"><span>Night (1.7x)</span><span>{ot17}h</span></div>}
                        {phHours > 0 && <div className="flex justify-between"><span>PH (2x)</span><span>{phHours}h</span></div>}
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-100 font-bold text-blue-700 text-right">{otValue.toLocaleString()} {employee.currency || 'EGP'}</div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-slate-50 p-6 text-center border-t border-slate-100 mt-auto">
        <p className="text-xs text-slate-400 leading-relaxed">This is a system-generated document and acts as a valid proof of income.<br/>Confidential Information • Konecta Egypt Financial Dept.</p>
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

// --- VIEW: Employee Portal ---
const EmployeePortal = ({ user, onLogout }) => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    if (user?.email) {
      const q = query(
        collection(db, 'payslips'), 
        where('email', '==', user.email),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const slips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPayslips(slips);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" alt="Logo" className="h-10 w-auto" />
             <span className="font-bold text-blue-900 text-xl hidden sm:block">Konecta Employee</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-800">{user.email}</p>
               <p className="text-xs text-slate-500">Employee Account</p>
             </div>
             <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Logout">
               <LogOut size={20}/>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileText className="text-blue-600"/> My Payslips
        </h2>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading your records...</div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><FileText size={32}/></div>
            <h3 className="text-lg font-bold text-slate-700">No Payslips Yet</h3>
            <p className="text-slate-500 mt-1">Your payslips will appear here once payroll is processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payslips.map(slip => {
                const cols = slip.columns || [
                    { key: 'basic', label: 'Basic Salary', type: 'entitlement' },
                    { key: 'overtime', label: 'Overtime', type: 'entitlement' },
                    { key: 'bonus', label: 'Bonus', type: 'entitlement' }
                ];
                const net = cols.reduce((acc, col) => {
                    const val = slip[col.key] || 0;
                    return col.type === 'entitlement' ? acc + val : acc - val;
                }, 0);

                return (
                  <div key={slip.id} onClick={() => setSelectedSlip(slip)} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden group">
                    <div className="p-5">
                       <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                           {MONTHS[slip.period?.month || 0].substring(0,3)}
                         </div>
                         <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">Paid</span>
                       </div>
                       <h3 className="font-bold text-slate-800">{MONTHS[slip.period?.month || 0]} {slip.period?.year}</h3>
                       <p className="text-sm text-slate-500 mb-4">Payroll Period</p>
                       <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium">NET PAY</span>
                          <span className="text-lg font-bold text-slate-800">{net.toLocaleString()} EGP</span>
                       </div>
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </main>

      {/* Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl min-h-[800px] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white sticky top-0 z-10">
              <span className="font-semibold flex items-center gap-2"><FileText size={18}/> {MONTHS[selectedSlip.period?.month]} Payslip</span>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-700 rounded-full" title="Print" onClick={() => window.print()}><Printer size={18} /></button>
                <button onClick={() => setSelectedSlip(null)} className="p-2 hover:bg-slate-700 rounded-full"><X size={18} /></button>
              </div>
            </div>
            <PayslipDocument 
                employee={selectedSlip} 
                columns={selectedSlip.columns} 
                period={selectedSlip.period} 
                standardDays={30} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- VIEW: Admin Dashboard (Modified for Cloud) ---
const AdminDashboard = ({ user, onLogout }) => {
  const [view, setView] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [masterDB, setMasterDB] = useState([]);
  const [history, setHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [previewId, setPreviewId] = useState(null);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ serviceId: '', templateId: '', publicKey: '' });
  const [emailMessage, setEmailMessage] = useState("Dear Employee,\n\nPlease find attached your payslip for this month.\n\nBest regards,\nKonecta Financial Team");
  
  const [payrollSettings, setPayrollSettings] = useState({ daysPerMonth: 30, hoursPerDay: 8 });
  const [columns, setColumns] = useState([
    { key: 'basic', label: 'Basic Salary', type: 'entitlement' },
    { key: 'overtime', label: 'Overtime', type: 'entitlement' },
    { key: 'bonus', label: 'Bonus', type: 'entitlement' }
  ]);
  const [payrollPeriod, setPayrollPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

  const [showAddColModal, setShowAddColModal] = useState(false);
  const [showOTModal, setShowOTModal] = useState(false); 
  const [showProrationModal, setShowProrationModal] = useState(false); 
  const [newColData, setNewColData] = useState({ label: '', type: 'deduction' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploading, setUploading] = useState(false); 

  // --- SYNC WITH FIRESTORE ---
  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id }));
      setMasterDB(data);
    });
    const unsubLogs = onSnapshot(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc')), (snap) => {
      setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubHist = onSnapshot(query(collection(db, 'payroll_runs'), orderBy('date', 'desc')), (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const savedConfig = localStorage.getItem('konecta_email_config');
    if (savedConfig) setEmailConfig(JSON.parse(savedConfig));
    const savedMsg = localStorage.getItem('konecta_email_message');
    if (savedMsg) setEmailMessage(savedMsg);
    const savedPayrollSettings = localStorage.getItem('konecta_payroll_settings');
    if (savedPayrollSettings) setPayrollSettings(JSON.parse(savedPayrollSettings));

    return () => { unsubEmp(); unsubLogs(); unsubHist(); };
  }, []);

  const logAction = async (action, details) => {
    const newLog = {
      createdAt: serverTimestamp(),
      timestamp: new Date().toLocaleString(),
      user: user.email,
      action,
      details
    };
    await addDoc(collection(db, 'audit_logs'), newLog);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- ACTIONS ---
  const saveMasterDB = async () => {
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const emp of employees) {
          const existing = masterDB.find(m => m.id === emp.id);
          if (existing) {
              const ref = doc(db, 'employees', existing.firebaseId);
              batch.update(ref, emp);
          } else {
              const ref = doc(collection(db, 'employees'));
              batch.set(ref, emp);
          }
          count++;
      }
      await batch.commit();
      showNotification(`Synced ${count} records to Cloud Database!`);
      logAction('Database Sync', `Updated/Added ${count} employee records`);
    } catch (e) {
      console.error(e);
      showNotification('Failed to save to database', 'error');
    }
  };

  const startSendingProcess = async () => {
    const targetList = selectedIds.length > 0 ? employees.filter(e => selectedIds.includes(e.id)) : employees;
    setView('sending');
    setSendingProgress(0);

    const batch = writeBatch(db);
    targetList.forEach((emp) => {
        const docRef = doc(collection(db, "payslips"));
        batch.set(docRef, {
            ...emp,
            period: payrollPeriod,
            columns: columns,
            publishedBy: user.email,
            createdAt: serverTimestamp(),
            status: 'published'
        });
    });

    const totalAmount = targetList.reduce((sum, emp) => {
        let net = 0;
        columns.forEach(col => {
          const val = emp[col.key] || 0;
          col.type === 'entitlement' ? net += val : net -= val;
        });
        return sum + net;
    }, 0);

    const runRef = doc(collection(db, 'payroll_runs'));
    batch.set(runRef, {
        date: new Date().toISOString(),
        month: MONTHS[payrollPeriod.month],
        year: payrollPeriod.year,
        count: targetList.length,
        total: totalAmount,
        status: 'Completed',
        createdAt: serverTimestamp() // Fixed sorting issue
    });

    try {
      await batch.commit();
      setSendingProgress(100);
      logAction('Payroll Run', `Published ${targetList.length} payslips`);
      setTimeout(() => {
          setView('dashboard');
          showNotification(`Successfully published ${targetList.length} payslips!`);
          setSelectedIds([]);
      }, 1500);
    } catch (e) {
      console.error("Batch write failed: ", e);
      showNotification('Failed to publish payslips: ' + e.message, 'error');
      setView('review');
    }
  };

  const saveEmailConfig = () => {
    localStorage.setItem('konecta_email_config', JSON.stringify(emailConfig));
    localStorage.setItem('konecta_email_message', emailMessage);
    localStorage.setItem('konecta_payroll_settings', JSON.stringify(payrollSettings));
    setShowSettings(false);
    showNotification('Settings saved locally');
  };

  // --- Logic Helpers ---
  const calculateNet = (emp) => {
    let net = 0;
    columns.forEach(col => {
      const val = emp[col.key] || 0;
      col.type === 'entitlement' ? net += val : net -= val;
    });
    return net;
  };

  const handleFileUpload = (event) => {
    setUploading(true);
    const file = event.target.files[0];
    if (!file) { setUploading(false); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        let headerIndex = -1;
        for(let i=0; i< Math.min(lines.length, 5); i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('email') || line.includes('id') || line.includes('egid')) { headerIndex = i; break; }
        }
        
        if (headerIndex === -1) { 
          showNotification('Invalid CSV Headers', 'error'); 
          setUploading(false);
          return; 
        }

        const parseLine = (line) => {
            const res = [];
            let inQuote = false;
            let current = '';
            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') { inQuote = !inQuote; continue; }
                if (c === ',' && !inQuote) { res.push(current.trim()); current = ''; }
                else { current += c; }
            }
            res.push(current.trim());
            return res;
        };

        const headers = parseLine(lines[headerIndex]);
        const standardMap = {
            'name': 'name', 'email': 'email', 'id': 'id', 'egid': 'id',
            'project': 'project', 'role': 'role', 'bank': 'bank_name', 'iban': 'iban',
            'currency': 'currency', 'worked days': 'worked_days',
            'ot 1.35': 'ot_135', 'ot 1.7': 'ot_17', 'ph hours': 'ph_hours'
        };

        const newEmployees = [];
        const newColumns = [...columns]; 

        const columnMap = headers.map((h, idx) => {
            const lower = h.toLowerCase().replace(/['"]/g, '').trim();
            if (standardMap[lower]) return { type: 'standard', key: standardMap[lower] };
            let type = 'entitlement';
            let label = h.replace(/['"]/g, '').trim();
            if (lower.startsWith('(ded)') || lower.startsWith('-')) { type = 'deduction'; label = label.replace(/^(\(Ded\)|-)\s?/i, ''); }
            else if (lower.startsWith('(ent)') || lower.startsWith('+')) { type = 'entitlement'; label = label.replace(/^(\(Ent\)|\+)\s?/i, ''); }
            else { 
                const existing = newColumns.find(c => c.label.toLowerCase() === label.toLowerCase());
                if (existing) return { type: 'financial', key: existing.key };
            }
            const key = label.toLowerCase().replace(/\s+/g, '_');
            if (!newColumns.find(c => c.key === key)) newColumns.push({ key, label, type });
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
                id: `EG${Math.floor(Math.random()*9000)+1000}`, 
                basic: 0, ot_135: 0, ot_17: 0, ph_hours: 0, 
                bank_name: '', currency: 'EGP', worked_days: standardDays, base_values: {} 
            };
            vals.forEach((val, idx) => {
                if (idx >= columnMap.length) return;
                const map = columnMap[idx];
                if (!map) return;
                if (map.type === 'standard') emp[map.key] = ['ot_135','ot_17','ph_hours','worked_days'].includes(map.key) ? parseFloat(val)||0 : val;
                else if (map.type === 'financial') emp[map.key] = parseFloat(val.replace(/[$,]/g, '')) || 0;
            });
            
            const ratio = (emp.worked_days > 0 && standardDays > 0) ? (emp.worked_days / standardDays) : 1;
            emp.base_values.basic = Math.round((emp.basic || 0) / ratio);
            emp.overtime = calculateOvertimeValue(emp.basic, emp.ot_135, 1.35, currentDivisor) + 
                           calculateOvertimeValue(emp.basic, emp.ot_17, 1.7, currentDivisor) + 
                           calculateOvertimeValue(emp.basic, emp.ph_hours, 2, currentDivisor);
            if(!emp.name) emp.name = 'Unknown';
            newEmployees.push(emp);
        }
        setEmployees(newEmployees);
        setView('review');
      } catch (err) {
        console.error(err);
        showNotification('Error processing CSV', 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      showNotification('Error reading file', 'error');
      setUploading(false);
    };
    reader.readAsText(file);
  };

  const handleUpdateField = (id, field, value) => {
    const currentDivisor = payrollSettings.daysPerMonth * payrollSettings.hoursPerDay;
    const standardDays = payrollSettings.daysPerMonth;
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      let updatedEmp = { ...emp };
      if (!updatedEmp.base_values) updatedEmp.base_values = { basic: updatedEmp.basic || 0 };

      if (field === 'name') {
         updatedEmp.name = value;
         // Auto-generate email format: firstname.lastname@konecta.com
         updatedEmp.email = value.toLowerCase().trim().replace(/\s+/g, '.') + '@konecta.com';
      } else if (['role', 'project', 'id', 'email', 'bank_name', 'iban', 'currency'].includes(field)) {
         updatedEmp[field] = value;
      } else if (field === 'worked_days') {
         const newDays = parseFloat(value) || 0;
         updatedEmp.worked_days = newDays;
         const ratio = (standardDays > 0) ? (newDays / standardDays) : 1;
         updatedEmp.basic = Math.round((updatedEmp.base_values.basic || 0) * ratio);
      } else if (['ot_135', 'ot_17', 'ph_hours'].includes(field)) {
         updatedEmp[field] = parseFloat(value) || 0;
         const baseBasic = updatedEmp.base_values.basic || updatedEmp.basic || 0;
         updatedEmp.overtime = 
            calculateOvertimeValue(baseBasic, updatedEmp.ot_135 || 0, 1.35, currentDivisor) +
            calculateOvertimeValue(baseBasic, updatedEmp.ot_17 || 0, 1.7, currentDivisor) +
            calculateOvertimeValue(baseBasic, updatedEmp.ph_hours || 0, 2, currentDivisor);
      } else if (columns.find(c => c.key === field)) {
          updatedEmp[field] = parseFloat(value) || 0;
          if (field === 'basic') updatedEmp.base_values.basic = updatedEmp.basic; 
      }
      return updatedEmp;
    }));
  };

  const handleAddEmployee = () => {
    setEmployees([...employees, { id: `EG${Math.floor(Math.random()*9000)+1000}`, name: 'New Employee', email: 'new.employee@konecta.com', worked_days: payrollSettings.daysPerMonth }]);
  };

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Remove employee?')) {
      setEmployees(employees.filter(e => e.id !== id));
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
      logAction('Delete Employee', `Removed employee ID ${id}`);
    }
  };

  const handleDownloadTemplate = () => {
    const standardHeaders = ['Name', 'Email', 'Project', 'Title', 'EGID', 'Bank Name', 'IBAN', 'Currency', 'Worked Days', 'OT 1.35x', 'OT 1.7x', 'Public Holiday (2x)'];
    const financialHeaders = columns.map(c => `${c.type === 'entitlement' ? '(Ent)' : '(Ded)'} ${c.label}`);
    const headers = [...standardHeaders, ...financialHeaders];
    
    // Example Data
    const row = ['John Doe', 'john.doe@konecta.com', 'Vodafone', 'CSR', 'EG1234', 'CIB', 'EG1234567890123456789012', 'EGP', payrollSettings.daysPerMonth, '2', '5', '8', ...columns.map(()=>'0')];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `konecta_payroll_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        esc(emp.name), esc(emp.email), esc(emp.project || 'General'), esc(emp.role || ''),
        esc(emp.id), esc(emp.bank_name || ''), esc(emp.iban || ''), esc(emp.currency || 'EGP'),
        esc(emp.worked_days || 0), esc(emp.ot_135 || 0), esc(emp.ot_17 || 0), esc(emp.ph_hours || 0),
        ...columns.map(c => emp[c.key] || 0), net
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

  const handleApplyProration = (id, workedDays) => {
    handleUpdateField(id, 'worked_days', workedDays); 
    showNotification(`Proration applied`);
    logAction('Proration Applied', `Employee ${id}: Worked ${workedDays} days`);
  };

  const handleWhatsApp = (emp) => {
    const net = calculateNet(emp);
    const msg = `Hello ${emp.name},\nYour payslip for ${MONTHS[payrollPeriod.month]} is generated.\nNet Salary: ${net.toLocaleString()} EGP.\nCheck your email for details.`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

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

  const handleImportMock = () => {
    setEmployees(generateMockData()); 
    setView('review');
    showNotification('Loaded demo data');
  };

  // --- Sub-Components ---
  const PeriodSelector = () => (
    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
      <Calendar size={16} className="text-slate-500" />
      <select value={payrollPeriod.month} onChange={(e) => setPayrollPeriod({...payrollPeriod, month: parseInt(e.target.value)})} className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer">
        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <div className="w-px h-4 bg-slate-200"></div>
      <select value={payrollPeriod.year} onChange={(e) => setPayrollPeriod({...payrollPeriod, year: parseInt(e.target.value)})} className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer">
        {[0,1,2].map(i => <option key={i} value={2026+i}>{2026+i}</option>)}
      </select>
    </div>
  );

  const filteredEmployees = employees.filter(emp => 
    (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Views ---
  const BatchPrintView = () => (
    <div className="bg-slate-200 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
           <Button variant="secondary" onClick={() => setView('review')} icon={ArrowLeft}>Back</Button>
           <h2 className="text-xl font-bold text-slate-800">Batch Print Preview</h2>
         </div>
         <Button onClick={() => window.print()} icon={Printer}>Print / Save All as PDF</Button>
      </div>
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
         {(selectedIds.length > 0 ? employees.filter(e => selectedIds.includes(e.id)) : employees).map((emp) => (
           <div key={emp.id} className="mb-12 print:mb-0 print:h-screen print:flex print:flex-col print:justify-between print:break-after-page shadow-2xl print:shadow-none bg-white rounded-xl overflow-hidden">
             <PayslipDocument employee={emp} columns={columns} period={payrollPeriod} standardDays={payrollSettings.daysPerMonth} />
           </div>
         ))}
      </div>
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <img src="https://i.ibb.co/zh1JWQLB/konecta-favicon.jpg" alt="Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold text-blue-900 tracking-tight ml-2">konecta<span className="text-blue-400">pay</span></span>
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
        <div className="p-4 border-t border-slate-100">
           <div className="mb-4 flex items-center gap-2 px-2 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-green-500"></div> Cloud Sync Active</div>
           <button onClick={onLogout} className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-bold transition-colors"><LogOut size={16}/> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
           <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-slate-700 capitalize">{view === 'dashboard' && 'Financial Overview'}{view === 'upload' && 'Payroll Run'}{view === 'review' && 'Payroll Revision'}{view === 'sending' && 'Processing'}{view === 'audit' && 'System Audit Logs'}{view === 'history' && 'Transaction History'}{view === 'database' && 'Master Database'}</h1>
              {(view === 'upload' || view === 'review') && <PeriodSelector/>}
           </div>
           <div className="flex items-center gap-3"><span className="text-sm text-slate-500">Admin: <strong>{user.email}</strong></span></div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 relative">
           {notification && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white animate-in fade-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>{notification.message}</div>}

           {view === 'dashboard' && <Dashboard />}

           {view === 'upload' && (
              <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center animate-in zoom-in-95 duration-200">
                 <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Cloud size={40} /></div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Payroll Run</h2>
                 <p className="text-slate-500 mb-6">Import data to start processing for {MONTHS[payrollPeriod.month]}.</p>
                 <div className="space-y-3">
                   <div className="relative"><input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/><Button className="w-full py-3" icon={FileUp}>{uploading ? <Loader2 className="animate-spin" /> : 'Upload CSV File'}</Button></div>
                   <Button variant="secondary" onClick={handleDownloadTemplate} className="w-full" icon={Download}>Download Template</Button>
                   <Button variant="secondary" onClick={() => { setEmployees(masterDB); setView('review'); }} className="w-full" icon={Database}>Load from Master DB</Button>
                   <Button variant="secondary" onClick={handleImportMock} className="w-full">Load Demo Data</Button>
                 </div>
              </div>
           )}

           {view === 'review' && (
             <div className="h-full flex flex-col">
                <div className="flex justify-between items-end mb-6">
                   <div><h2 className="text-xl font-bold">Review Data</h2><p className="text-slate-500">Auto-calculate taxes or manually edit before sending.</p></div>
                   <div className="flex gap-2">
                      {selectedIds.length > 0 && <div className="bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in border border-blue-100"><span className="text-sm font-bold text-blue-800">{selectedIds.length} Selected</span><button onClick={handleBulkDelete} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium"><Trash2 size={16}/> Delete</button><div className="w-px h-4 bg-blue-200"></div><button onClick={startSendingProcess} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold"><Send size={16}/> Send Selected</button></div>}
                      <Button variant="secondary" icon={Save} onClick={saveMasterDB}>Save to Cloud DB</Button>
                      <Button variant="secondary" icon={FileDown} onClick={handleExportCSV}>Export CSV</Button>
                      <Button variant="secondary" icon={Printer} onClick={() => setView('print-batch')}>Print All</Button>
                      <Button variant="outline" icon={Scissors} onClick={() => setShowProrationModal(true)}>Prorate</Button>
                      <Button variant="outline" icon={Calculator} onClick={handleApplyEgyptianTax}>Auto-Calc Tax</Button>
                      <Button variant="outline" icon={Clock} onClick={() => setShowOTModal(true)}>Calc OT</Button>
                      <Button icon={Send} onClick={startSendingProcess}>Approve & Publish</Button>
                   </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                   <div className="p-4 border-b border-slate-200 flex gap-4">
                      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search employees..." className="w-full pl-9 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
                      <div className="flex gap-2"><Button variant="secondary" className="text-xs" icon={UserPlus} onClick={handleAddEmployee}>Add</Button><Button variant="secondary" className="text-xs" icon={Plus} onClick={() => setShowAddColModal(true)}>Column</Button></div>
                   </div>
                   <div className="overflow-auto flex-1">
                      <table className="w-full text-left text-sm text-slate-600">
                         <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold uppercase text-xs">
                            <tr>
                               <th className="px-6 py-4 w-12 bg-slate-50"><input type="checkbox" onChange={handleSelectAll} checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></th>
                               <th className="px-4 py-3 min-w-[200px]">Employee</th>
                               <th className="px-4 py-3 min-w-[150px]">Role / Project</th>
                               <th className="px-4 py-3 min-w-[200px]">Bank Details</th>
                               <th className="px-2 py-3 text-center">OT 1.35</th>
                               <th className="px-2 py-3 text-center">OT 1.7</th>
                               <th className="px-2 py-3 text-center">PH 2x</th>
                               <th className="px-4 py-3 text-center w-24">Worked Days<br/><span className="text-[9px] font-normal text-slate-400">PRORATION</span></th>
                               {columns.map(c => <th key={c.key} className={`px-4 py-3 min-w-[120px] border-l ${c.type==='entitlement'?'text-green-700 border-green-100':'text-red-600 border-red-100'}`}>{c.label}<span className="block text-[9px] font-normal opacity-70 uppercase">{c.type}</span></th>)}
                               <th className="px-4 py-3 border-l">Net Pay</th>
                               <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map(emp => {
                               const net = calculateNet(emp);
                               const isSelected = selectedIds.includes(emp.id);
                               const isProrated = emp.worked_days !== payrollSettings.daysPerMonth;
                               return (
                                  <tr key={emp.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                     <td className="px-6 py-4"><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(emp.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></td>
                                     <td className="px-4 py-4">
                                        <input type="text" value={emp.name} onChange={e => handleUpdateField(emp.id, 'name', e.target.value)} className="font-bold text-slate-800 bg-transparent w-full focus:outline-none mb-1"/>
                                        <div className="flex flex-col text-xs text-slate-400 gap-0.5">
                                           <span className="flex gap-1">EGID: <input value={emp.id} onChange={e => handleUpdateField(emp.id, 'id', e.target.value)} className="bg-transparent font-mono font-bold text-slate-500 focus:outline-none w-20"/></span>
                                           <input value={emp.email} onChange={e => handleUpdateField(emp.id, 'email', e.target.value)} className="bg-transparent w-full focus:outline-none focus:text-slate-600"/>
                                        </div>
                                     </td>
                                     <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1">
                                           <div className="flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 w-fit"><Briefcase size={10} className="text-slate-400"/><input value={emp.role} onChange={e => handleUpdateField(emp.id, 'role', e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 w-24 focus:outline-none" placeholder="Role"/></div>
                                           <div className="flex items-center gap-1 bg-blue-50 rounded px-1.5 py-0.5 w-fit"><span className="w-2 h-2 rounded-full bg-blue-400"></span><input value={emp.project} onChange={e => handleUpdateField(emp.id, 'project', e.target.value)} className="bg-transparent text-xs text-blue-700 w-24 focus:outline-none" placeholder="Project"/></div>
                                        </div>
                                     </td>
                                     <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                           <div className="flex items-center gap-1 text-slate-500"><Building2 size={10}/><input value={emp.bank_name || ''} onChange={e => handleUpdateField(emp.id, 'bank_name', e.target.value)} className="bg-transparent focus:outline-none w-24" placeholder="Bank Name"/></div>
                                           <div className="flex items-center gap-1 text-slate-500"><CreditCard size={10}/><input value={emp.iban || ''} onChange={e => handleUpdateField(emp.id, 'iban', e.target.value)} className="bg-transparent focus:outline-none w-32 font-mono" placeholder="IBAN"/></div>
                                           <div className="flex items-center gap-1 font-bold text-slate-700"><DollarSign size={10}/><input value={emp.currency || 'EGP'} onChange={e => handleUpdateField(emp.id, 'currency', e.target.value)} className="bg-transparent focus:outline-none w-8"/></div>
                                        </div>
                                     </td>
                                     <td className="px-2 py-4 text-center"><input type="number" className="w-10 bg-slate-50 border rounded text-center text-xs p-1 focus:outline-none focus:ring-1 focus:ring-blue-500" value={emp.ot_135||0} onChange={e => handleUpdateField(emp.id, 'ot_135', e.target.value)} /></td>
                                     <td className="px-2 py-4 text-center"><input type="number" className="w-10 bg-slate-50 border rounded text-center text-xs p-1 focus:outline-none focus:ring-1 focus:ring-blue-500" value={emp.ot_17||0} onChange={e => handleUpdateField(emp.id, 'ot_17', e.target.value)} /></td>
                                     <td className="px-2 py-4 text-center"><input type="number" className="w-10 bg-purple-50 border border-purple-200 rounded text-center text-xs p-1 focus:outline-none focus:ring-1 focus:ring-purple-500" value={emp.ph_hours||0} onChange={e => handleUpdateField(emp.id, 'ph_hours', e.target.value)} /></td>
                                     <td className="px-4 py-4 text-center">
                                        <input type="number" className={`w-12 border rounded text-center text-sm font-bold p-1 focus:outline-none ${isProrated ? 'border-orange-300 text-orange-600 bg-orange-50' : 'border-slate-200'}`} value={emp.worked_days||30} onChange={e => handleUpdateField(emp.id, 'worked_days', e.target.value)} />
                                        {isProrated && <span className="block text-[9px] font-bold text-orange-500 mt-1">PRORATED</span>}
                                     </td>
                                     {columns.map(col => (
                                         <td key={col.key} className={`px-4 py-4 border-l ${col.type==='entitlement'?'border-green-50 bg-green-50/20':'border-red-50 bg-red-50/20'}`}>
                                            <div className="flex items-center">
                                              <span className={`text-[10px] mr-1 font-bold ${col.type==='entitlement'?'text-green-500':'text-red-500'}`}>{col.type==='entitlement'?'+':'-'}</span>
                                              <input type="number" className={`w-20 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none text-sm ${col.key==='overtime'?'text-blue-600 font-bold':''}`} value={emp[col.key]||0} onChange={e => handleUpdateField(emp.id, col.key, e.target.value)} readOnly={col.key === 'overtime'} />
                                            </div>
                                         </td>
                                     ))}
                                     <td className="px-4 py-4 font-bold text-blue-900 border-l">{net.toLocaleString()}</td>
                                     <td className="px-4 py-4 flex justify-center gap-2">
                                        <button onClick={() => setPreviewId(emp.id)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"><Eye size={16}/></button>
                                        <button onClick={() => handleWhatsApp(emp)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-full transition-colors" title="WhatsApp"><Phone size={16}/></button>
                                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors" title="Delete"><Trash2 size={16}/></button>
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
              <div className="flex flex-col items-center justify-center h-full">
                 <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6"><Cloud size={48} className="animate-bounce"/></div>
                 <h2 className="text-2xl font-bold mb-2">Publishing to Cloud...</h2>
                 <p className="text-slate-500 mb-4">Employees will see their payslips instantly.</p>
                 <div className="w-64 bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{width: `${sendingProgress}%`}}></div></div>
              </div>
           )}
           
           {view === 'database' && (
              <div className="h-full flex flex-col">
                 <h2 className="text-xl font-bold mb-4">Master Employee Database</h2>
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-xs">
                          <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">EGID</th><th className="px-6 py-4">Basic</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {masterDB.map((emp, idx) => (
                             <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold">{emp.name}</td>
                                <td className="px-6 py-4">{emp.role}</td>
                                <td className="px-6 py-4">{emp.email}</td>
                                <td className="px-6 py-4 font-mono">{emp.id}</td>
                                <td className="px-6 py-4">{emp.basic}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {view === 'audit' && (
              <div className="h-full flex flex-col">
                 <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-xs">
                          <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Details</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {auditLogs.map((log) => (
                             <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                                <td className="px-6 py-4">{log.user}</td>
                                <td className="px-6 py-4 font-bold">{log.action}</td>
                                <td className="px-6 py-4 text-slate-500">{log.details}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {view === 'history' && (
              <div className="h-full flex flex-col">
                 <h2 className="text-xl font-bold mb-4">Payroll History</h2>
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-xs">
                          <tr><th className="px-6 py-4">Period</th><th className="px-6 py-4">Count</th><th className="px-6 py-4">Total Amount</th><th className="px-6 py-4">Status</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {history.map((run) => (
                             <tr key={run.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-blue-900">{run.month} {run.year}</td>
                                <td className="px-6 py-4">{run.count} Employees</td>
                                <td className="px-6 py-4 font-bold text-green-600">{run.total?.toLocaleString()} EGP</td>
                                <td className="px-6 py-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{run.status}</span></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      </main>

      {/* Modals */}
      <OvertimeModal 
        isOpen={showOTModal} 
        onClose={() => setShowOTModal(false)} 
        employees={employees} 
        onApply={(id, val) => {
           setEmployees(prev => prev.map(e => e.id === id ? {...e, overtime: (e.overtime||0)+val} : e));
           showNotification('Overtime added');
        }} 
        divisor={240}
      />

      <ProrationModal 
        isOpen={showProrationModal}
        onClose={() => setShowProrationModal(false)}
        employees={employees}
        columns={columns}
        standardDays={30}
        onApply={(id, days) => {
            const emp = employees.find(e => e.id === id);
            if(emp) {
                const ratio = days / 30;
                setEmployees(prev => prev.map(e => e.id === id ? {...e, worked_days: days, basic: Math.round(e.basic * ratio)} : e));
            }
        }}
      />

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

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Settings</h2>
            <div className="space-y-4">
               <div><label className="block text-xs font-bold text-slate-500">EmailJS Service ID</label><input className="w-full border p-2 rounded" value={emailConfig.serviceId} onChange={e => setEmailConfig({...emailConfig, serviceId: e.target.value})}/></div>
               <div><label className="block text-xs font-bold text-slate-500">EmailJS Template ID</label><input className="w-full border p-2 rounded" value={emailConfig.templateId} onChange={e => setEmailConfig({...emailConfig, templateId: e.target.value})}/></div>
               <div><label className="block text-xs font-bold text-slate-500">EmailJS Public Key</label><input className="w-full border p-2 rounded" value={emailConfig.publicKey} onChange={e => setEmailConfig({...emailConfig, publicKey: e.target.value})}/></div>
            </div>
            <div className="flex gap-2 mt-6">
               <Button onClick={saveEmailConfig} className="flex-1">Save</Button>
               <Button variant="secondary" onClick={() => setShowSettings(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {previewId && (
         <PayslipPreview 
            employee={employees.find(e => e.id === previewId)} 
            columns={columns} 
            period={payrollPeriod} 
            standardDays={30} 
            onClose={() => setPreviewId(null)}
         />
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // UPDATED: Check against the ADMIN_EMAILS list
        if (ADMIN_EMAILS.includes(currentUser.email)) {
          setRole('admin');
        } else {
          setRole('employee');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading secure portal...</div>;

  if (!user) {
    return <LoginScreen onLogin={(usr, r) => { setUser(usr); setRole(r); }} />;
  }

  return role === 'admin' 
    ? <AdminDashboard user={user} onLogout={handleLogout} /> 
    : <EmployeePortal user={user} onLogout={handleLogout} />;
}
