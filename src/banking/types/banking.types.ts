export interface BankingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BankingCustomer {
  id: string;
  provider: 'unit' | 'treezor';
  type: 'individual' | 'business';
  status: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  address?: BankingAddress;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingApplication {
  id: string;
  provider: 'unit' | 'treezor';
  status: string;
  customerId?: string;
  product?: string;
  submittedAt?: string;
  decisionedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingAccount {
  id: string;
  provider: 'unit' | 'treezor';
  customerId: string;
  type: string;
  status: string;
  currency: string;
  balance: number;
  availableBalance?: number;
  routingNumber?: string;
  accountNumber?: string;
  iban?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingCardLimits {
  daily?: number;
  monthly?: number;
  single?: number;
  currency?: string;
}

export interface BankingCard {
  id: string;
  provider: 'unit' | 'treezor';
  customerId: string;
  accountId: string;
  type: 'virtual' | 'physical';
  status: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  limits?: BankingCardLimits;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingPayment {
  id: string;
  provider: 'unit' | 'treezor';
  type: string;
  status: string;
  amount: number;
  currency: string;
  fromAccountId?: string;
  toAccountId?: string;
  counterpartyId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingTransaction {
  id: string;
  provider: 'unit' | 'treezor';
  accountId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  direction: 'credit' | 'debit';
  description?: string;
  merchantName?: string;
  merchantCategory?: string;
  createdAt: string;
  postedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingCounterparty {
  id: string;
  provider: 'unit' | 'treezor';
  name: string;
  routingNumber?: string;
  accountNumber?: string;
  iban?: string;
  currency?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingAuthorization {
  id: string;
  provider: 'unit' | 'treezor';
  status: string;
  type: string;
  amount: number;
  currency: string;
  cardId?: string;
  merchantName?: string;
  merchantCategory?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingStatement {
  id: string;
  provider: 'unit' | 'treezor';
  accountId: string;
  periodStart: string;
  periodEnd: string;
  format: 'pdf' | 'html' | 'json';
  url?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingWebhookEvent {
  id: string;
  provider: 'unit' | 'treezor';
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  nextPageToken?: string;
}

export interface BankingCheckDeposit {
  id: string;
  provider: 'unit' | 'treezor';
  status: string;
  amount: number;
  currency: string;
  accountId: string;
  customerId?: string;
  checkNumber?: string;
  description?: string;
  submittedAt: string;
  processedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingDispute {
  id: string;
  provider: 'unit' | 'treezor';
  status: string;
  reason: string;
  transactionId: string;
  amount: number;
  currency: string;
  openedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingReward {
  id: string;
  provider: 'unit' | 'treezor';
  type: string;
  description?: string;
  status: string;
  amount: number;
  currency: string;
  awardedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BankingSimulationDescriptor {
  id: string;
  provider: 'unit' | 'treezor';
  name: string;
  category?: string;
  description?: string;
  inputs?: Record<string, unknown>;
}

export interface BankingMandate {
  id: string;
  provider: 'unit' | 'treezor';
  status: string;
  type: string;
  debtorId: string;
  creditorId: string;
  reference: string;
  signatureDate?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type BankingRestrictionGroupType = 'country' | 'mcc' | 'merchant';
export const BANKING_RESTRICTION_GROUP_ENUM = {
  COUNTRY: 'country',
  MCC: 'mcc',
  MERCHANT: 'merchant',
} as const satisfies Record<string, BankingRestrictionGroupType>;
export const BANKING_RESTRICTION_GROUP_TYPES: readonly BankingRestrictionGroupType[] = Object.values(
  BANKING_RESTRICTION_GROUP_ENUM,
);

export interface BankingRestrictionGroup {
  id: string;
  provider: 'unit' | 'treezor';
  groupType: BankingRestrictionGroupType;
  name: string;
  status: string;
  entries: string[];
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BankingRecall {
  id: string;
  provider: 'unit' | 'treezor';
  paymentId: string;
  status: string;
  reason?: string;
  requestedAt: string;
  respondedAt?: string;
  metadata?: Record<string, unknown>;
}
