import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, Auth } from "firebase/auth";
import {
    getFirestore, collection, doc, getDoc, setDoc, getDocs, query, where,
    updateDoc, deleteDoc, writeBatch, orderBy, enableIndexedDbPersistence, Firestore
} from 'firebase/firestore';
import {
    MonthlyExpenseSheet,
    UserProfile,
    Rates,
    ExpenseStatus,
    ExpenseCategory,
    DailyAttendance,
    MonthlyTourPlan,
    TourPlanStatus,
    Customer,
    VisitRecord,
    UserStock,
    InventoryItem,
    SalesTarget,
    Notification,
    StockTransaction,
    UserRole,
    AppraisalRecord,
    PerformanceMetrics,
    Stockist,
    PrimarySale,
    SecondarySale
} from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---
// In production, these should be in .env
const firebaseConfig = {
    apiKey: "AIzaSyDummyKey",
    authDomain: "tertius-integrity.firebaseapp.com",
    projectId: "tertius-integrity",
    storageBucket: "tertius-integrity.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// --- INITIALIZATION ---
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // enableIndexedDbPersistence(db).catch(err => console.log("Persistence error", err));
} catch (e) {
    console.warn("Firebase init failed (expected in pure offline/mock mode if no config)", e);
}

// --- CONSTANTS ---
const USERS_COL = 'users';
const RATES_COL = 'rates';
const SHEETS_COL = 'expense_sheets';
const ATTENDANCE_COL = 'attendance';
const CUSTOMERS_COL = 'customers';
const VISITS_COL = 'visits';
const TOUR_PLAN_COL = 'tour_plans';
const STOCK_COL = 'user_stock';
const INV_ITEMS_COL = 'inventory_items';
const TRANSACTIONS_COL = 'stock_transactions';
const TARGETS_COL = 'sales_targets';
const NOTIFICATIONS_COL = 'notifications';
const APPRAISALS_COL = 'appraisals';
const STOCKISTS_COL = 'stockists';
const PRIMARY_SALES_COL = 'primary_sales';
const SECONDARY_SALES_COL = 'secondary_sales';

// --- MOCK DATA ---
const DEFAULT_RATES: Rates = {
    'MR_CONFIRMED': { hqAllowance: 250, exHqAllowance: 350, outstationAllowance: 550, kmRate: 3.5 },
    'ASM_CONFIRMED': { hqAllowance: 300, exHqAllowance: 450, outstationAllowance: 700, kmRate: 4.5 },
    'ADMIN_CONFIRMED': { hqAllowance: 500, exHqAllowance: 800, outstationAllowance: 1200, kmRate: 8.0 }
};

const MOCK_USERS: UserProfile[] = [
    {
        uid: 'admin1',
        email: 'admin@tertius.com',
        displayName: 'Admin User',
        role: UserRole.ADMIN,
        status: 'CONFIRMED' as any,
        hqLocation: 'Head Office',
        territories: [],
        password: '123456' // 👈 Added Password
    },
    {
        uid: 'asm1',
        email: 'asm@tertius.com',
        displayName: 'Amit ASM',
        role: UserRole.ASM,
        status: 'CONFIRMED' as any,
        hqLocation: 'Delhi',
        territories: [{ id: 't1', name: 'North Delhi', category: ExpenseCategory.HQ, fixedKm: 0 }],
        password: '123456' // 👈 Added Password
    },
    {
        uid: 'mr1',
        email: 'mr@tertius.com',
        displayName: 'Rahul MR',
        role: UserRole.MR,
        status: 'CONFIRMED' as any,
        hqLocation: 'Delhi',
        territories: [{ id: 't2', name: 'Rohini', category: ExpenseCategory.HQ, fixedKm: 0 }, { id: 't3', name: 'Pitampura', category: ExpenseCategory.EX_HQ, fixedKm: 20 }],
        reportingManagerId: 'asm1',
        password: '123456' // 👈 Added Password
    }
];

const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
    { id: 'p1', name: 'Tertius-D 10mg', type: 'SAMPLE', unitPrice: 0 },
    { id: 'p2', name: 'Tertius-Cal 500mg', type: 'SAMPLE', unitPrice: 0 },
    { id: 'g1', name: 'Pen', type: 'GIFT', unitPrice: 50 },
    { id: 'g2', name: 'Notepad', type: 'GIFT', unitPrice: 30 },
    { id: 'l1', name: 'Visual Aid', type: 'INPUT', unitPrice: 500 }
];

// --- ROBUST SANITIZER ---
const sanitize = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            const val = obj[key];
            if (val === undefined) newObj[key] = null;
            else newObj[key] = sanitize(val);
        }
        return newObj;
    }
    return obj;
};

export const getUser = async (input?: string, password?: string): Promise<UserProfile | null> => {
    if (!auth) return null;
    try {
        // 1. Check for CURRENTLY LOGGED IN user (Auto-login)
        if (!input && !password) {
            return new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth!, async (user) => {
                    unsubscribe();
                    if (user) {
                        if (!db) { resolve(null); return; }
                        const userDoc = await getDoc(doc(db, USERS_COL, user.uid));
                        resolve(userDoc.exists() ? userDoc.data() as UserProfile : null);
                    } else {
                        resolve(null);
                    }
                });
            });
        }

        // 2. HARDCODED SUPER ADMIN
        if (input === 'mohdshea@gmail.com' && password === 'ayahplus') {
            return { uid: 'admin_mohdshea', email: 'mohdshea@gmail.com', displayName: 'Mohd Shea (Super Admin)', role: UserRole.ADMIN, status: 'CONFIRMED' as any, hqLocation: 'Head Office', territories: [] };
        }

        // 3. 👇 NEW: CHECK MOCK USERS ARRAY (The Fix)
        if (input && password === '123456') {
            const mockUser = MOCK_USERS.find(u => u.email === input);
            if (mockUser) return mockUser;
        }

        // 4. CHECK FIREBASE DATABASE (Your existing logic)
        if (input && password && db) {
            // ... (keep your existing database query logic here) ...
            const q = query(collection(db, USERS_COL), where("email", "==", input));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const user = snap.docs[0].data() as UserProfile;
                if (user.password === password) return user;
            }

            // Fallback to Firebase Auth
            try {
                const uc = await signInWithEmailAndPassword(auth, input, password);
                const userDoc = await getDoc(doc(db, USERS_COL, uc.user.uid));
                if (userDoc.exists()) return userDoc.data() as UserProfile;
            } catch (e) { }
        }
        return null;
    } catch (error) {
        console.error("Auth Error:", error);
        return null;
    }
};

export const logoutUser = async () => {
    if (auth) await firebaseSignOut(auth);
};

// --- USER & TEAM SERVICES ---
export const saveUser = async (user: UserProfile): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, USERS_COL, user.uid), sanitize(user));
};

export const getRates = async (): Promise<Rates> => {
    if (!db) return DEFAULT_RATES;
    try {
        const snap = await getDoc(doc(db, RATES_COL, 'global'));
        if (snap.exists()) return snap.data() as Rates;
    } catch (e) { }
    return DEFAULT_RATES;
};

export const saveRates = async (rates: Rates): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, RATES_COL, 'global'), sanitize(rates));
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!db) return MOCK_USERS;
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map(d => d.data() as UserProfile);
};

export const deleteUser = async (uid: string): Promise<void> => {
    if (!db) return;
    await deleteDoc(doc(db, USERS_COL, uid));
};

export const getTeamMembers = async (managerId: string): Promise<UserProfile[]> => {
    if (!db) return [];
    const q = query(collection(db, USERS_COL), where("reportingManagerId", "==", managerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
};

// --- EXPENSE SHEET SERVICES ---
export const getExpenseSheet = async (userId: string, year: number, month: number): Promise<MonthlyExpenseSheet> => {
    const id = `${userId}_${year}_${month}`;
    if (!db) return { id, userId, year, month, status: ExpenseStatus.DRAFT, entries: [] };
    const snap = await getDoc(doc(db, SHEETS_COL, id));
    if (snap.exists()) return snap.data() as MonthlyExpenseSheet;
    const newSheet: MonthlyExpenseSheet = { id, userId, year, month, status: ExpenseStatus.DRAFT, entries: [] };
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayStr = date.toISOString().split('T')[0];
        const isSunday = date.getDay() === 0;
        newSheet.entries.push({
            id: uuidv4(), date: dayStr, towns: '',
            category: isSunday ? ExpenseCategory.SUNDAY : ExpenseCategory.HQ,
            km: 0, trainFare: 0, miscAmount: 0, remarks: '', dailyAllowance: 0, travelAmount: 0, totalAmount: 0
        });
    }
    return newSheet;
};

export const saveExpenseSheet = async (sheet: MonthlyExpenseSheet): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, SHEETS_COL, sheet.id), sanitize(sheet));
};

export const getPendingSheetsForAdmin = async (): Promise<MonthlyExpenseSheet[]> => {
    if (!db) return [];
    const q = query(collection(db, SHEETS_COL), where("status", "in", [ExpenseStatus.APPROVED_ASM, ExpenseStatus.SUBMITTED]));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MonthlyExpenseSheet);
};

export const getPendingSheetsForAsm = async (asmId: string): Promise<MonthlyExpenseSheet[]> => {
    if (!db) return [];
    const team = await getTeamMembers(asmId);
    const teamIds = team.map(t => t.uid);
    if (teamIds.length === 0) return [];
    const q = query(collection(db, SHEETS_COL), where("status", "==", ExpenseStatus.SUBMITTED));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MonthlyExpenseSheet).filter(s => teamIds.includes(s.userId));
};

// --- ATTENDANCE SERVICES ---
export const getDailyAttendance = async (userId: string, dateStr: string): Promise<DailyAttendance> => {
    const id = `${userId}_${dateStr}`;
    if (!db) return { id, userId, date: dateStr, punchIn: null, punchOuts: [], isSyncedToSheets: false };
    const snap = await getDoc(doc(db, ATTENDANCE_COL, id));
    if (snap.exists()) return snap.data() as DailyAttendance;
    return { id, userId, date: dateStr, punchIn: null, punchOuts: [], isSyncedToSheets: false };
};

export const saveDailyAttendance = async (attendance: DailyAttendance): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, ATTENDANCE_COL, attendance.id), sanitize(attendance));
};

export const getAllAttendance = async (): Promise<DailyAttendance[]> => {
    if (!db) return [];
    const snap = await getDocs(collection(db, ATTENDANCE_COL));
    return snap.docs.map(d => d.data() as DailyAttendance);
};

// --- CUSTOMER & VISIT SERVICES ---
export const getAllCustomers = async (): Promise<Customer[]> => {
    if (!db) return [];
    const snap = await getDocs(collection(db, CUSTOMERS_COL));
    return snap.docs.map(d => d.data() as Customer);
};

export const getCustomersByTerritory = async (territoryId: string): Promise<Customer[]> => {
    if (!db) return [];
    const q = query(collection(db, CUSTOMERS_COL), where("territoryId", "==", territoryId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Customer);
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, CUSTOMERS_COL, customer.id), sanitize(customer));
};

export const getAllVisits = async (): Promise<VisitRecord[]> => {
    if (!db) return [];
    const snap = await getDocs(collection(db, VISITS_COL));
    return snap.docs.map(d => d.data() as VisitRecord);
};

export const getVisits = async (userId: string, date: string): Promise<VisitRecord[]> => {
    if (!db) return [];
    const q = query(collection(db, VISITS_COL), where("userId", "==", userId), where("date", "==", date));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as VisitRecord);
};

export const getVisitsForCustomer = async (customerId: string): Promise<VisitRecord[]> => {
    if (!db) return [];
    const q = query(collection(db, VISITS_COL), where("customerId", "==", customerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as VisitRecord);
};

export const saveVisit = async (visit: VisitRecord): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, VISITS_COL, visit.id), sanitize(visit));

    // Deduct Stock
    if (visit.itemsGiven && visit.itemsGiven.length > 0) {
        for (const gift of visit.itemsGiven) {
            const q = query(collection(db, STOCK_COL), where("userId", "==", visit.userId), where("itemId", "==", gift.itemId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docRef = snap.docs[0].ref;
                const current = snap.docs[0].data().quantity || 0;
                await updateDoc(docRef, { quantity: Math.max(0, current - gift.quantity) });
            }
        }
    }
};

export const updateCustomerSales = async (customerId: string, amount: number): Promise<void> => {
    if (!db) return;
    const customerRef = doc(db, CUSTOMERS_COL, customerId);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
        const current = snap.data().lastMonthSales || 0;
        await updateDoc(customerRef, { lastMonthSales: current + amount });
    }
};

// --- TOUR PLAN SERVICES ---
export const getTourPlan = async (userId: string, year: number, month: number): Promise<MonthlyTourPlan> => {
    const id = `${userId}_${year}_${month}`;
    if (!db) return { id, userId, year, month, status: TourPlanStatus.DRAFT, entries: [] };
    const snap = await getDoc(doc(db, TOUR_PLAN_COL, id));
    if (snap.exists()) return snap.data() as MonthlyTourPlan;
    const entries = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayOfWeek = date.getDay();
        let type: any = dayOfWeek === 0 ? 'HOLIDAY' : 'FIELD_WORK';
        entries.push({ date: date.toISOString().split('T')[0], activityType: type });
    }
    return { id, userId, year, month, status: TourPlanStatus.DRAFT, entries };
};

export const saveTourPlan = async (plan: MonthlyTourPlan): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, TOUR_PLAN_COL, plan.id), sanitize(plan));
};

export const getPendingTourPlansForAdmin = async (): Promise<MonthlyTourPlan[]> => {
    if (!db) return [];
    const q = query(collection(db, TOUR_PLAN_COL), where("status", "==", TourPlanStatus.SUBMITTED));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MonthlyTourPlan);
};

export const getPendingTourPlansForAsm = async (asmId: string): Promise<MonthlyTourPlan[]> => {
    if (!db) return [];
    const team = await getTeamMembers(asmId);
    const teamIds = team.map(t => t.uid);
    if (teamIds.length === 0) return [];
    const q = query(collection(db, TOUR_PLAN_COL), where("status", "==", TourPlanStatus.SUBMITTED));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MonthlyTourPlan).filter(p => teamIds.includes(p.userId));
};

// --- INVENTORY & SALES SERVICES ---
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    if (!db) return MOCK_INVENTORY_ITEMS;
    const snap = await getDocs(collection(db, INV_ITEMS_COL));
    // If empty, return mocks to start
    if (snap.empty) return MOCK_INVENTORY_ITEMS;
    return snap.docs.map(d => d.data() as InventoryItem);
};

export const getUserStock = async (userId: string): Promise<UserStock[]> => {
    if (!db) return [];
    const q = query(collection(db, STOCK_COL), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserStock);
};

// Updated signature to handle empty strings/undefined for Admin
export const getStockTransactions = async (userId?: string): Promise<StockTransaction[]> => {
    if (!db) return [];
    const q = query(collection(db, TRANSACTIONS_COL), orderBy("date", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map(d => d.data() as StockTransaction);
    if (!userId) return all; // Admin sees all
    return all.filter(t => t.toUserId === userId || t.fromUserId === userId);
};

// Updated to take simplified object and construct Transaction
export const distributeStock = async (params: { toUserId: string; itemId: string; quantity: number }): Promise<void> => {
    if (!db) return;
    const { toUserId, itemId, quantity } = params;

    const items = await getInventoryItems();
    const item = items.find(i => i.id === itemId);
    const itemName = item ? item.name : 'Unknown Item';

    const transaction: StockTransaction = {
        id: uuidv4(),
        date: new Date().toISOString(),
        fromUserId: 'admin1',
        toUserId, // Fixed Property Name
        itemId,
        itemName,
        quantity,
        type: 'ISSUE'
    };

    await setDoc(doc(db, TRANSACTIONS_COL, transaction.id), sanitize(transaction));

    // Update User Stock
    const q = query(collection(db, STOCK_COL), where("userId", "==", toUserId), where("itemId", "==", itemId));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const stockDoc = snap.docs[0];
        const currentQty = stockDoc.data().quantity || 0;
        await updateDoc(stockDoc.ref, { quantity: currentQty + quantity });
    } else {
        const newStock: UserStock = {
            userId: toUserId,
            itemId,
            itemName,
            quantity
        };
        const newId = `${toUserId}_${itemId}`;
        await setDoc(doc(db, STOCK_COL, newId), sanitize(newStock));
    }
};

export const getSalesTarget = async (userId: string, month: number, year: number): Promise<SalesTarget | null> => {
    if (!db) return null;
    const id = `tgt_${userId}_${month}_${year}`;
    const snap = await getDoc(doc(db, TARGETS_COL, id));
    if (snap.exists()) return snap.data() as SalesTarget;
    return null;
};

export const setSalesTarget = async (target: SalesTarget): Promise<void> => {
    if (!db) return;
    const id = target.id === 'new' ? `tgt_${target.userId}_${target.month}_${target.year}` : target.id;
    await setDoc(doc(db, TARGETS_COL, id), sanitize({ ...target, id }));
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    if (!db) return [];
    const q = query(collection(db, NOTIFICATIONS_COL), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Notification);
};

export const markNotificationRead = async (id: string) => {
    if (!db) return;
    await updateDoc(doc(db, NOTIFICATIONS_COL, id), { isRead: true });
};

// --- APPRAISAL SERVICES ---
export const getAppraisals = async (userId?: string): Promise<AppraisalRecord[]> => {
    if (!db) return [];
    let q;
    if (userId) {
        q = query(collection(db, APPRAISALS_COL), where("userId", "==", userId));
    } else {
        q = query(collection(db, APPRAISALS_COL));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AppraisalRecord);
};

export const saveAppraisal = async (record: AppraisalRecord): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, APPRAISALS_COL, record.id), sanitize(record));
};

export const calculatePerformanceMetrics = async (userId: string, month: number, year: number): Promise<PerformanceMetrics> => {
    const target = await getSalesTarget(userId, month, year);
    const salesAchieved = target ? target.achievedAmount : 0;
    const salesTarget = target ? target.targetAmount : 100000;
    // Mock calculations for now
    const attendanceDays = 22;
    const callAverage = 10;
    const tourCompliance = 90;
    return { salesAchieved, salesTarget, callAverage, attendanceDays, tourCompliance };
};

// --- STOCKIST SERVICES ---
export const getStockists = async (): Promise<Stockist[]> => {
    if (!db) return [];
    const snap = await getDocs(collection(db, STOCKISTS_COL));
    return snap.docs.map(d => d.data() as Stockist);
};

export const saveStockist = async (stockist: Stockist): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, STOCKISTS_COL, stockist.id), sanitize(stockist));
};

export const recordPrimarySale = async (sale: PrimarySale): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, PRIMARY_SALES_COL, sale.id), sanitize(sale));

    const stockistRef = doc(db, STOCKISTS_COL, sale.stockistId);
    const stockistSnap = await getDoc(stockistRef);
    if (stockistSnap.exists()) {
        const stockist = stockistSnap.data() as Stockist;
        const currentStock = stockist.currentStock || {};

        sale.items.forEach(item => {
            currentStock[item.itemId] = (currentStock[item.itemId] || 0) + item.quantity;
        });

        await updateDoc(stockistRef, { currentStock });
    }
};

export const recordSecondarySale = async (sale: SecondarySale): Promise<void> => {
    if (!db) return;
    await setDoc(doc(db, SECONDARY_SALES_COL, sale.id), sanitize(sale));

    const stockistRef = doc(db, STOCKISTS_COL, sale.stockistId);
    const stockistSnap = await getDoc(stockistRef);
    if (stockistSnap.exists()) {
        const stockist = stockistSnap.data() as Stockist;
        const currentStock = stockist.currentStock || {};

        sale.items.forEach(item => {
            currentStock[item.itemId] = Math.max(0, (currentStock[item.itemId] || 0) - item.quantity);
        });

        await updateDoc(stockistRef, { currentStock });
    }
};

export const getPrimarySales = async (stockistId?: string): Promise<PrimarySale[]> => {
    if (!db) return [];
    let q;
    if (stockistId) {
        q = query(collection(db, PRIMARY_SALES_COL), where("stockistId", "==", stockistId));
    } else {
        q = query(collection(db, PRIMARY_SALES_COL));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PrimarySale);
};

export const getSecondarySales = async (stockistId?: string): Promise<SecondarySale[]> => {
    if (!db) return [];
    let q;
    if (stockistId) {
        q = query(collection(db, SECONDARY_SALES_COL), where("stockistId", "==", stockistId));
    } else {
        q = query(collection(db, SECONDARY_SALES_COL));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SecondarySale);
};

export const syncAttendanceToGoogleSheets = async (attendance: DailyAttendance): Promise<void> => {
    console.log("Mock syncing to Google Sheets", attendance);
};

export const getDashboardStats = async (userId: string): Promise<any> => {
    return {
        totalSales: 150000,
        targetAchievement: 75,
        activeStockists: 5,
        pendingApprovals: 2,
        avgCalls: 11
    };
};