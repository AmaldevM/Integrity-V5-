// src/types.ts

export enum UserRole {
  ADMIN = 'ADMIN',
  ZM = 'ZM',
  RM = 'RM',
  ASM = 'ASM',
  MR = 'MR'
}

export enum UserStatus {
  TRAINEE = 'TRAINEE',
  CONFIRMED = 'CONFIRMED'
}

export enum ExpenseCategory {
  HQ = 'HQ',
  EX_HQ = 'EX_HQ',
  OUTSTATION = 'OUTSTATION',
  HOLIDAY = 'HOLIDAY',
  SUNDAY = 'SUNDAY'
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED_ASM = 'APPROVED_ASM',
  APPROVED_ADMIN = 'APPROVED_ADMIN',
  REJECTED = 'REJECTED'
}

export interface RateConfig {
  hqAllowance: number;
  exHqAllowance: number;
  outstationAllowance: number;
  kmRate: number;
}

export type Rates = Record<string, RateConfig>;

export interface Territory {
  id: string;
  name: string;
  category: ExpenseCategory;
  fixedKm: number;
  geoLat?: number;
  geoLng?: number;
  geoRadius?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  hqLocation: string;
  state?: string;
  reportingManagerId?: string;
  territories: Territory[];
  hqLat?: number;
  hqLng?: number;
  password?: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  territoryId?: string;
  towns: string;
  category: ExpenseCategory;
  km: number;
  trainFare: number;
  miscAmount: number;
  remarks: string;
  dailyAllowance: number;
  travelAmount: number;
  totalAmount: number;
}

export interface MonthlyExpenseSheet {
  id: string;
  userId: string;
  month: number;
  year: number;
  status: ExpenseStatus;
  entries: ExpenseEntry[];
  submittedAt?: string;
  approvedByAsmAt?: string;
  approvedByAdminAt?: string;
  rejectionReason?: string;
}

// --- Attendance ---

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface PunchRecord {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  location: GeoLocationData;
  verifiedTerritoryId?: string | null;
  verifiedTerritoryName?: string | null;
}

export interface DailyAttendance {
  id: string;
  userId: string;
  date: string;
  punchIn: PunchRecord | null;
  punchOuts: PunchRecord[];
  isSyncedToSheets: boolean;
}

// --- Field Reporting & Customers ---

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
  lastMonthSales: number;
}

export interface VisitRecord {
  id: string;
  date: string;
  timestamp: string;
  userId: string;
  customerId: string;
  customerName: string;
  territoryId: string;
  geoLat: number;
  geoLng: number;
  isVerifiedLocation: boolean;
  jointWorkWithUid?: string;
  jointWorkName?: string;
  productsDiscussed?: string;
  feedback?: string;
  actionsTaken?: string;
  itemsGiven?: { itemId: string; itemName: string; quantity: number }[];
}

// --- Tour Plan ---

export enum TourPlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface TourPlanEntry {
  date: string;
  territoryId?: string;
  territoryName?: string;
  activityType: 'FIELD_WORK' | 'MEETING' | 'LEAVE' | 'HOLIDAY' | 'ADMIN_DAY';
  jointWorkWithUid?: string;
  notes?: string;
}

export interface MonthlyTourPlan {
  id: string;
  userId: string;
  month: number;
  year: number;
  status: TourPlanStatus;
  entries: TourPlanEntry[];
}

// --- Inventory & Stockist ---

export type InventoryType = 'SAMPLE' | 'GIFT' | 'INPUT';

export interface InventoryItem {
  id: string;
  name: string;
  type: InventoryType;
  unitPrice: number;
}

export interface UserStock {
  userId: string;
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface StockTransaction {
  id: string;
  date: string;
  fromUserId: string;
  toUserId: string;  // Corrected property name
  itemId: string;
  itemName: string;
  quantity: number;
  type: 'ISSUE' | 'RETURN' | 'DISTRIBUTE_TO_DOCTOR';
}

export interface Stockist {
  id: string;
  name: string;
  territoryId: string;
  currentStock: { [itemId: string]: number };
}

export interface PrimarySale {
  id: string;
  date: string;
  stockistId: string;
  items: { itemId: string; quantity: number; rate: number; amount: number }[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'DELIVERED';
}

export interface SecondarySale {
  id: string;
  date: string;
  stockistId: string;
  customerId: string;
  mrId: string;
  items: { itemId: string; quantity: number; rate: number; amount: number }[];
  totalAmount: number;
}

// --- Performance ---

export interface SalesTarget {
  id: string;
  userId: string;
  month: number;
  year: number;
  targetAmount: number;
  achievedAmount: number;
}

export interface PerformanceMetrics {
  salesAchieved: number;
  salesTarget: number;
  callAverage: number;
  attendanceDays: number;
  tourCompliance: number;
}

export interface AppraisalRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  metrics: PerformanceMetrics;
  managerRating?: number;
  adminRating?: number;
  comments?: string;
  finalScore: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.HQ]: 'HQ (Headquarter)',
  [ExpenseCategory.EX_HQ]: 'Ex-HQ',
  [ExpenseCategory.OUTSTATION]: 'Outstation',
  [ExpenseCategory.HOLIDAY]: 'Holiday',
  [ExpenseCategory.SUNDAY]: 'Sunday',
};

// --- Performance Appraisal Types ---

export interface PerformanceMetrics {
  salesAchieved: number;
  salesTarget: number;
  callAverage: number;
  attendanceDays: number;
  tourCompliance: number;
}

export interface AppraisalRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  metrics: PerformanceMetrics;
  managerRating?: number; // 1-5
  adminRating?: number; // 1-5
  comments?: string;
  finalScore: number; // Calculated score
  createdAt: string;
}

export interface Stockist {
  id: string;
  name: string;
  territoryId: string;
  email?: string;
  phone?: string;
  address?: string;
  currentStock: { [itemId: string]: number }; // itemId -> quantity
}

export interface PrimarySale {
  id: string;
  date: string;
  stockistId: string;
  items: { itemId: string; quantity: number; rate: number; amount: number }[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'DELIVERED';
}

export interface SecondarySale {
  id: string;
  date: string;
  stockistId: string;
  customerId: string; // Doctor/Clinic
  items: { itemId: string; quantity: number; rate: number; amount: number }[];
  totalAmount: number;
  mrId: string; // MR who facilitated the sale
}
