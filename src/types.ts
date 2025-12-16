export enum UserRole {
  ADMIN = 'ADMIN',
  ASM = 'ASM', // Area Sales Manager
  RM = 'RM',   // Regional Manager
  ZM = 'ZM',   // Zonal Manager
  MR = 'MR'    // Medical Rep
}

export enum UserStatus {
  PROBATION = 'PROBATION',
  CONFIRMED = 'CONFIRMED'
}

// 👇 UPDATED: Added all missing categories here
export enum ExpenseCategory {
  HQ = 'HQ',
  EX_HQ = 'EX_HQ',
  OUTSTATION = 'OUTSTATION',
  FIELD_WORK = 'FIELD_WORK',
  MEETING = 'MEETING',
  LEAVE = 'LEAVE',
  HOLIDAY = 'HOLIDAY',
  SUNDAY = 'SUNDAY',
  ADMIN_DAY = 'ADMIN_DAY'
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED_ASM = 'APPROVED_ASM',
  APPROVED_ADMIN = 'APPROVED_ADMIN',
  REJECTED = 'REJECTED'
}

export enum CustomerType {
  DOCTOR = 'DOCTOR',
  CHEMIST = 'CHEMIST',
  STOCKIST = 'STOCKIST'
}

export enum CustomerCategory {
  A = 'A',
  B = 'B',
  C = 'C'
}

export interface Territory {
  id: string;
  name: string;
  category: ExpenseCategory; // e.g., 'HQ' or 'EX_HQ'
  fixedKm?: number;          // Auto-fill KM for this territory
  geoLat?: number;
  geoLng?: number;
  geoRadius?: number;        // In meters (e.g., 500m)
}

export interface RateConfig {
  hqAllowance: number;
  exHqAllowance: number;
  outstationAllowance: number;
  kmRate: number;
}

export interface Rates {
  [key: string]: RateConfig; // e.g. "MR_CONFIRMED": { ... }
}

export interface ExpenseEntry {
  id: string;
  date: string;
  towns: string;
  category: ExpenseCategory;
  territoryId?: string; // Link to Territory
  km: number;
  trainFare: number; // For Outstation
  miscAmount: number;
  dailyAllowance: number;
  travelAmount: number;
  totalAmount: number;
  remarks?: string;
}

export interface MonthlyExpenseSheet {
  id: string;
  userId: string;
  year: number;
  month: number;
  status: ExpenseStatus;
  entries: ExpenseEntry[];
  submittedAt?: string;
  approvedByAsmAt?: string;
  approvedByAdminAt?: string;
  rejectionReason?: string;
}

// --- TOUR PLAN TYPES ---
export enum TourPlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface TourPlanEntry {
  date: string;
  activityType: 'FIELD_WORK' | 'MEETING' | 'LEAVE' | 'HOLIDAY' | 'ADMIN_DAY' | 'SUNDAY';
  territoryId?: string;
  territoryName?: string;
  jointWorkWithUid?: string;
  objective?: string;
  notes?: string;
}

export interface MonthlyTourPlan {
  id: string;
  userId: string;
  year: number;
  month: number;
  status: TourPlanStatus;
  entries: TourPlanEntry[];
}

// --- USER & GENERIC TYPES ---
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  hqLocation: string;
  hqLat?: number;
  hqLng?: number;
  territories: Territory[];
  reportingManagerId?: string;
  password?: string; // Only for mock auth
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  category: CustomerCategory;
  territoryId: string;
  specialty?: string;
  email?: string;
  phone?: string;
  geoLat?: number;
  geoLng?: number;
  isTagged: boolean;
  lastMonthSales?: number;
}

// --- INVENTORY TYPES ---
export interface InventoryItem {
  id: string;
  name: string;
  type: 'SAMPLE' | 'GIFT' | 'INPUT';
  unitPrice: number;
}

export interface UserStock {
  userId: string; // The MR holding the stock
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface StockTransaction {
  id: string;
  date: string;
  fromUserId: string; // Admin or Manager
  toUserId: string;   // MR
  itemId: string;
  itemName: string;
  quantity: number;
  type: 'ISSUE' | 'RETURN' | 'DAMAGE';
}

// --- ATTENDANCE TYPES ---
export interface PunchRecord {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  verifiedTerritoryId?: string; // If GPS matches a territory
  verifiedTerritoryName?: string;
}

export interface DailyAttendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  punchIn: PunchRecord | null;
  punchOuts: PunchRecord[];
  isSyncedToSheets: boolean; // Has this updated the Expense Sheet yet?
}

// --- REPORTING TYPES ---
export interface VisitRecord {
  id: string;
  date: string;
  timestamp: string;
  userId: string;
  customerId: string;
  customerName: string;
  territoryId: string;

  // Location Proof
  geoLat: number;
  geoLng: number;
  isVerifiedLocation: boolean; // Within 50m of Tagged Loc

  // Joint Work
  jointWorkWithUid?: string;
  jointWorkName?: string;

  // Report Data
  productsDiscussed: string;
  feedback: string;
  actionsTaken?: string;

  // Samples Given
  itemsGiven?: {
    itemId: string;
    itemName: string;
    quantity: number;
  }[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

// --- SALES TARGETS ---
export interface SalesTarget {
  id: string;
  userId: string;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
}

// --- NEW TYPES FOR ANALYTICS ---
export interface PerformanceMetrics {
  salesAchieved: number;
  salesTarget: number;
  callAverage: number;
  attendanceDays: number;
  tourCompliance: number; // %
}

export interface AppraisalRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  managerId: string;
  score: number; // 1-5
  feedback: string;
  paramScores: {
    sales: number;
    discipline: number;
    reporting: number;
    productKnowledge: number;
  };
  createdAt: string;
}

// --- STOCKIST & SALES TYPES ---
export interface Stockist {
  id: string;
  name: string;
  gstin: string;
  territoryId: string;
  currentStock: Record<string, number>; // itemId -> qty
}

export interface PrimarySale {
  id: string;
  stockistId: string;
  date: string;
  invoiceNo: string;
  items: { itemId: string; quantity: number; amount: number }[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED';
}

export interface SecondarySale {
  id: string;
  stockistId: string;
  date: string;
  chemistName: string; // Or link to Customer
  items: { itemId: string; quantity: number; amount: number }[];
  totalAmount: number;
}