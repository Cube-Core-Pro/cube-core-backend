import type {
  BankingCustomer,
  BankingAccount,
  BankingTransaction,
  BankingCard,
  BankingPayment,
  BankingCounterparty,
  BankingAuthorization,
  BankingStatement,
  BankingWebhookEvent,
  BankingApplication,
  BankingCheckDeposit,
  BankingDispute,
  BankingReward,
  BankingSimulationDescriptor,
  BankingMandate,
  BankingRestrictionGroup,
  BankingRecall,
  BankingRestrictionGroupType,
} from '../types/banking.types';

export type BankingProviderId = 'unit' | 'treezor';
export const BANKING_PROVIDER_ENUM = {
  UNIT: 'unit',
  TREEZOR: 'treezor',
} as const satisfies Record<string, BankingProviderId>;
export const BANKING_PROVIDER_IDS: readonly BankingProviderId[] = Object.values(BANKING_PROVIDER_ENUM);

export interface BankingProvider {
  readonly id: BankingProviderId;
  readonly supportedCurrencies: string[];
  readonly regions: string[];

  // Customers
  createCustomer(dto: unknown): Promise<BankingCustomer>;
  getCustomer(customerId: string): Promise<BankingCustomer>;
  listCustomers(params?: Record<string, unknown>): Promise<{ data: BankingCustomer[]; total?: number }>;
  updateCustomer(customerId: string, dto: unknown): Promise<BankingCustomer>;

  // Applications (account onboarding, KYC flows)
  createApplication(dto: unknown): Promise<BankingApplication>;
  getApplication(applicationId: string): Promise<BankingApplication>;
  listApplications(params?: Record<string, unknown>): Promise<{ data: BankingApplication[]; total?: number }>;
  updateApplication(applicationId: string, dto: unknown): Promise<BankingApplication>;

  // Accounts
  createAccount(dto: unknown): Promise<BankingAccount>;
  getAccount(accountId: string): Promise<BankingAccount>;
  listAccounts(params?: Record<string, unknown>): Promise<{ data: BankingAccount[]; total?: number }>;
  updateAccount(accountId: string, dto: unknown): Promise<BankingAccount>;

  // Cards
  issueCard(dto: unknown): Promise<BankingCard>;
  getCard(cardId: string): Promise<BankingCard>;
  listCards(params?: Record<string, unknown>): Promise<{ data: BankingCard[]; total?: number }>;
  updateCard(cardId: string, dto: unknown): Promise<BankingCard>;
  manageCardControls(cardId: string, controls: unknown): Promise<BankingCard>;

  // Payments & Transfers
  createPayment(dto: unknown): Promise<BankingPayment>;
  getPayment(paymentId: string, params?: Record<string, unknown>): Promise<BankingPayment>;
  listPayments(params?: Record<string, unknown>): Promise<{ data: BankingPayment[]; total?: number }>;

  // Transactions
  listTransactions(params?: Record<string, unknown>): Promise<{ data: BankingTransaction[]; total?: number }>;
  getTransaction(transactionId: string): Promise<BankingTransaction>;

  // Counterparties / Beneficiaries
  createCounterparty(dto: unknown): Promise<BankingCounterparty>;
  getCounterparty(counterpartyId: string): Promise<BankingCounterparty>;
  listCounterparties(params?: Record<string, unknown>): Promise<{ data: BankingCounterparty[]; total?: number }>;

  // Authorizations & Disputes
  listAuthorizations(params?: Record<string, unknown>): Promise<{ data: BankingAuthorization[]; total?: number }>;
  getAuthorization(authorizationId: string): Promise<BankingAuthorization>;

  // Statements & Documents
  listStatements(params?: Record<string, unknown>): Promise<{ data: BankingStatement[]; total?: number }>;
  getStatement(statementId: string, format?: 'pdf' | 'html' | 'json'): Promise<BankingStatement>;

  // Webhooks & Events
  verifyWebhook(signature: string, payload: string): boolean;
  parseWebhookEvent(payload: string): BankingWebhookEvent;

  // Simulations / Sandbox utilities
  simulateOperation(kind: string, payload: unknown): Promise<unknown>;
  listSimulations(params?: Record<string, unknown>): Promise<{ data: BankingSimulationDescriptor[]; total?: number }>;

  // Check Deposits
  createCheckDeposit(dto: unknown): Promise<BankingCheckDeposit>;
  getCheckDeposit(checkDepositId: string): Promise<BankingCheckDeposit>;
  listCheckDeposits(params?: Record<string, unknown>): Promise<{ data: BankingCheckDeposit[]; total?: number }>;

  // Disputes
  createDispute(dto: unknown): Promise<BankingDispute>;
  getDispute(disputeId: string): Promise<BankingDispute>;
  listDisputes(params?: Record<string, unknown>): Promise<{ data: BankingDispute[]; total?: number }>;
  updateDispute(disputeId: string, dto: unknown): Promise<BankingDispute>;

  // Rewards
  listRewards(params?: Record<string, unknown>): Promise<{ data: BankingReward[]; total?: number }>;
  getReward(rewardId: string): Promise<BankingReward>;

  // Mandates (Treezor / future providers)
  createMandate(dto: unknown): Promise<BankingMandate>;
  getMandate(mandateId: string): Promise<BankingMandate>;
  listMandates(params?: Record<string, unknown>): Promise<{ data: BankingMandate[]; total?: number }>;
  updateMandate(mandateId: string, dto: unknown): Promise<BankingMandate>;
  cancelMandate(mandateId: string): Promise<BankingMandate>;

  // Restriction Groups
  listRestrictionGroups(type: BankingRestrictionGroupType, params?: Record<string, unknown>): Promise<{ data: BankingRestrictionGroup[]; total?: number }>;
  createRestrictionGroup(type: BankingRestrictionGroupType, dto: unknown): Promise<BankingRestrictionGroup>;
  getRestrictionGroup(type: BankingRestrictionGroupType, groupId: string): Promise<BankingRestrictionGroup>;
  updateRestrictionGroup(type: BankingRestrictionGroupType, groupId: string, dto: unknown): Promise<BankingRestrictionGroup>;

  // Recalls
  createRecall(dto: unknown): Promise<BankingRecall>;
  getRecall(recallId: string): Promise<BankingRecall>;
  listRecalls(params?: Record<string, unknown>): Promise<{ data: BankingRecall[]; total?: number }>;
  respondRecall(recallId: string, dto: unknown): Promise<BankingRecall>;
}
