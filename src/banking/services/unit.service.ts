import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import type { BankingProvider } from '../providers/banking-provider.interface';
import type {
  BankingAccount,
  BankingApplication,
  BankingAuthorization,
  BankingCard,
  BankingCounterparty,
  BankingCustomer,
  BankingPayment,
  BankingStatement,
  BankingTransaction,
  BankingWebhookEvent,
  PaginatedResponse,
  BankingCheckDeposit,
  BankingDispute,
  BankingReward,
  BankingSimulationDescriptor,
  BankingMandate,
  BankingRestrictionGroup,
  BankingRecall,
  BankingRestrictionGroupType,
} from '../types/banking.types';

type UnitHttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

interface UnitRequestOptions {
  method: UnitHttpMethod;
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
}

interface UnitCollectionResponse<T> {
  data: T[];
  total?: number;
  nextPageToken?: string;
  meta?: { total?: number };
}

interface PaymentPayload {
  paymentType?: 'ach' | 'wire' | 'book' | 'card' | 'achReturn' | 'achCollection';
  type?: 'ach' | 'wire' | 'book' | 'card';
  [key: string]: unknown;
}

@Injectable()
export class UnitService implements BankingProvider {
  readonly id = 'unit' as const;
  readonly supportedCurrencies = ['USD'];
  readonly regions = ['us', 'usa', 'united-states', 'north-america'];

  private readonly logger = new Logger(UnitService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly cfg: ConfigService) {
    const baseUrl = this.cfg.get<string>('UNIT_BASE_URL') ?? 'https://api.s.unit.sh';
    const apiKey = this.cfg.get<string>('UNIT_API_KEY');

    if (!apiKey) {
      this.logger.warn('UNIT_API_KEY not configured – requests will fail until provided');
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: {
        Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private async request<T>(options: UnitRequestOptions): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method: options.method,
        url: options.url,
        data: options.data,
        params: options.params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message;
      this.logger.error(`Unit API error (${options.method.toUpperCase()} ${options.url}): ${message}`);
      throw error;
    }
  }

  private normalizeCollection<T>(payload: unknown): PaginatedResponse<T> {
    if (!payload) {
      return { data: [] };
    }

    if (Array.isArray((payload as UnitCollectionResponse<T>).data)) {
      const typed = payload as UnitCollectionResponse<T>;
      return {
        data: typed.data,
        total: typed.meta?.total ?? typed.total,
        nextPageToken: typed.nextPageToken,
      };
    }

    if (Array.isArray(payload)) {
      return { data: payload as T[] };
    }

    const asRecord = payload as Record<string, unknown>;
    if (Array.isArray(asRecord.items)) {
      return {
        data: asRecord.items as T[],
        total: (asRecord.total ?? asRecord.count) as number | undefined,
        nextPageToken: asRecord.nextPageToken as string | undefined,
      };
    }

    return { data: [] };
  }

  private mapCheckDeposit(payload: any): BankingCheckDeposit {
    return {
      id: String(payload?.id ?? payload?.checkDepositId ?? crypto.randomUUID()),
      provider: this.id,
      status: String(payload?.status ?? 'unknown'),
      amount: Number(payload?.amount ?? 0),
      currency: String(payload?.currency ?? 'USD'),
      accountId: String(payload?.accountId ?? payload?.depositAccountId ?? ''),
      customerId: payload?.customerId ?? payload?.customer?.id,
      checkNumber: payload?.checkNumber,
      description: payload?.description,
      submittedAt: (payload?.createdAt ?? payload?.submittedAt ?? new Date().toISOString()).toString(),
      processedAt: payload?.processedAt?.toString(),
      metadata: { raw: payload },
    };
  }

  private mapDispute(payload: any): BankingDispute {
    return {
      id: String(payload?.id ?? payload?.disputeId ?? crypto.randomUUID()),
      provider: this.id,
      status: String(payload?.status ?? 'unknown'),
      reason: String(payload?.reason ?? payload?.reasonCode ?? 'unspecified'),
      transactionId: String(payload?.transactionId ?? payload?.transaction?.id ?? ''),
      amount: Number(payload?.amount ?? 0),
      currency: String(payload?.currency ?? 'USD'),
      openedAt: (payload?.createdAt ?? payload?.openedAt ?? new Date().toISOString()).toString(),
      resolvedAt: payload?.resolvedAt?.toString(),
      metadata: { raw: payload },
    };
  }

  private mapReward(payload: any): BankingReward {
    return {
      id: String(payload?.id ?? payload?.rewardId ?? crypto.randomUUID()),
      provider: this.id,
      type: String(payload?.type ?? payload?.rewardType ?? 'reward'),
      description: payload?.description,
      status: String(payload?.status ?? 'unknown'),
      amount: Number(payload?.amount ?? 0),
      currency: String(payload?.currency ?? 'USD'),
      awardedAt: (payload?.createdAt ?? payload?.awardedAt ?? new Date().toISOString()).toString(),
      metadata: { raw: payload },
    };
  }

  private mapSimulation(payload: any): BankingSimulationDescriptor {
    return {
      id: String(payload?.id ?? payload?.simulationId ?? payload?.name ?? crypto.randomUUID()),
      provider: this.id,
      name: String(payload?.name ?? payload?.id ?? 'simulation'),
      category: payload?.category,
      description: payload?.description,
      inputs: payload?.inputs,
    };
  }

  private mapMandate(payload: any): BankingMandate {
    return {
      id: String(payload?.id ?? payload?.mandateId ?? crypto.randomUUID()),
      provider: this.id,
      status: String(payload?.status ?? 'unknown'),
      type: String(payload?.type ?? payload?.mandateType ?? 'mandate'),
      debtorId: String(payload?.debtorId ?? payload?.debtor?.id ?? ''),
      creditorId: String(payload?.creditorId ?? payload?.creditor?.id ?? ''),
      reference: String(payload?.reference ?? payload?.mandateReference ?? ''),
      signatureDate: payload?.signatureDate?.toString(),
      createdAt: (payload?.createdAt ?? new Date().toISOString()).toString(),
      metadata: { raw: payload },
    };
  }

  private mapRestrictionGroup(type: BankingRestrictionGroupType, payload: any): BankingRestrictionGroup {
    return {
      id: String(payload?.id ?? payload?.groupId ?? crypto.randomUUID()),
      provider: this.id,
      groupType: type,
      name: String(payload?.name ?? payload?.label ?? 'group'),
      status: String(payload?.status ?? 'active'),
      entries: (payload?.values ?? payload?.entries ?? []).map((value: unknown) => String(value)),
      createdAt: (payload?.createdAt ?? payload?.created ?? new Date().toISOString()).toString(),
      updatedAt: payload?.updatedAt?.toString() ?? payload?.updated?.toString(),
      metadata: { raw: payload },
    };
  }

  private mapRecall(payload: any): BankingRecall {
    return {
      id: String(payload?.id ?? payload?.recallId ?? crypto.randomUUID()),
      provider: this.id,
      paymentId: String(payload?.paymentId ?? payload?.transactionId ?? ''),
      status: String(payload?.status ?? 'unknown'),
      reason: payload?.reason,
      requestedAt: (payload?.createdAt ?? payload?.requestedAt ?? new Date().toISOString()).toString(),
      respondedAt: payload?.respondedAt?.toString(),
      metadata: { raw: payload },
    };
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async createCustomer(dto: unknown): Promise<BankingCustomer> {
    return this.request<BankingCustomer>({ method: 'post', url: '/customers', data: dto });
  }

  async getCustomer(customerId: string): Promise<BankingCustomer> {
    return this.request<BankingCustomer>({ method: 'get', url: `/customers/${customerId}` });
  }

  async listCustomers(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCustomer>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/customers', params });
    return this.normalizeCollection<BankingCustomer>(payload);
  }

  async updateCustomer(customerId: string, dto: unknown): Promise<BankingCustomer> {
    return this.request<BankingCustomer>({ method: 'patch', url: `/customers/${customerId}`, data: dto });
  }

  // ---------------------------------------------------------------------------
  // Applications
  // ---------------------------------------------------------------------------

  async createApplication(dto: unknown): Promise<BankingApplication> {
    return this.request<BankingApplication>({ method: 'post', url: '/applications', data: dto });
  }

  async getApplication(applicationId: string): Promise<BankingApplication> {
    return this.request<BankingApplication>({ method: 'get', url: `/applications/${applicationId}` });
  }

  async listApplications(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingApplication>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/applications', params });
    return this.normalizeCollection<BankingApplication>(payload);
  }

  async updateApplication(applicationId: string, dto: unknown): Promise<BankingApplication> {
    return this.request<BankingApplication>({ method: 'patch', url: `/applications/${applicationId}`, data: dto });
  }

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  async createAccount(dto: unknown): Promise<BankingAccount> {
    return this.request<BankingAccount>({ method: 'post', url: '/accounts', data: dto });
  }

  async getAccount(accountId: string): Promise<BankingAccount> {
    return this.request<BankingAccount>({ method: 'get', url: `/accounts/${accountId}` });
  }

  async listAccounts(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingAccount>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/accounts', params });
    return this.normalizeCollection<BankingAccount>(payload);
  }

  async updateAccount(accountId: string, dto: unknown): Promise<BankingAccount> {
    return this.request<BankingAccount>({ method: 'patch', url: `/accounts/${accountId}`, data: dto });
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  async issueCard(dto: unknown): Promise<BankingCard> {
    return this.request<BankingCard>({ method: 'post', url: '/cards', data: dto });
  }

  async getCard(cardId: string): Promise<BankingCard> {
    return this.request<BankingCard>({ method: 'get', url: `/cards/${cardId}` });
  }

  async listCards(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCard>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/cards', params });
    return this.normalizeCollection<BankingCard>(payload);
  }

  async updateCard(cardId: string, dto: unknown): Promise<BankingCard> {
    return this.request<BankingCard>({ method: 'patch', url: `/cards/${cardId}`, data: dto });
  }

  async manageCardControls(cardId: string, controls: unknown): Promise<BankingCard> {
    return this.request<BankingCard>({ method: 'post', url: `/cards/${cardId}/controls`, data: controls });
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async createPayment(dto: PaymentPayload): Promise<BankingPayment> {
    const { endpoint, method } = this.resolvePaymentEndpoint(dto);
    return this.request<BankingPayment>({ method, url: endpoint, data: dto });
  }

  async getPayment(paymentId: string, params?: Record<string, unknown>): Promise<BankingPayment> {
    return this.request<BankingPayment>({ method: 'get', url: `/payments/${paymentId}`, params });
  }

  async listPayments(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingPayment>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/payments', params });
    return this.normalizeCollection<BankingPayment>(payload);
  }

  private resolvePaymentEndpoint(payload: PaymentPayload): { endpoint: string; method: UnitHttpMethod } {
    const type = (payload.paymentType || payload.type || '').toString().toLowerCase();

    switch (type) {
      case 'ach':
        return { endpoint: '/payments/ach', method: 'post' };
      case 'achcollection':
      case 'ach_collection':
        return { endpoint: '/payments/ach-collections', method: 'post' };
      case 'achreturn':
      case 'ach_return':
        return { endpoint: '/payments/ach-returns', method: 'post' };
      case 'wire':
        return { endpoint: '/payments/wire', method: 'post' };
      case 'book':
        return { endpoint: '/payments/book', method: 'post' };
      case 'card':
        return { endpoint: '/payments/card', method: 'post' };
      default:
        throw new BadRequestException(
          'Unsupported Unit payment type. Provide paymentType one of ach|wire|book|card|achCollection|achReturn',
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async listTransactions(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingTransaction>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/transactions', params });
    return this.normalizeCollection<BankingTransaction>(payload);
  }

  async getTransaction(transactionId: string): Promise<BankingTransaction> {
    return this.request<BankingTransaction>({ method: 'get', url: `/transactions/${transactionId}` });
  }

  // ---------------------------------------------------------------------------
  // Counterparties
  // ---------------------------------------------------------------------------

  async createCounterparty(dto: unknown): Promise<BankingCounterparty> {
    return this.request<BankingCounterparty>({ method: 'post', url: '/counterparties', data: dto });
  }

  async getCounterparty(counterpartyId: string): Promise<BankingCounterparty> {
    return this.request<BankingCounterparty>({ method: 'get', url: `/counterparties/${counterpartyId}` });
  }

  async listCounterparties(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCounterparty>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/counterparties', params });
    return this.normalizeCollection<BankingCounterparty>(payload);
  }

  // ---------------------------------------------------------------------------
  // Authorizations & Disputes
  // ---------------------------------------------------------------------------

  async listAuthorizations(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingAuthorization>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/authorizations', params });
    return this.normalizeCollection<BankingAuthorization>(payload);
  }

  async getAuthorization(authorizationId: string): Promise<BankingAuthorization> {
    return this.request<BankingAuthorization>({ method: 'get', url: `/authorizations/${authorizationId}` });
  }

  // ---------------------------------------------------------------------------
  // Statements & Documents
  // ---------------------------------------------------------------------------

  async listStatements(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingStatement>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/statements', params });
    return this.normalizeCollection<BankingStatement>(payload);
  }

  async getStatement(statementId: string, format: 'pdf' | 'html' | 'json' = 'pdf'):
    Promise<BankingStatement> {
    return this.request<BankingStatement>({
      method: 'get',
      url: `/statements/${statementId}`,
      params: { format },
    });
  }

  // ---------------------------------------------------------------------------
  // Webhooks & Events
  // ---------------------------------------------------------------------------

  verifyWebhook(signature: string, payload: string): boolean {
    const secret = this.cfg.get<string>('UNIT_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('UNIT_WEBHOOK_SECRET not configured, webhook verification skipped');
      return true;
    }

    const expected = Buffer.from(signature, 'hex');
    const digest = Buffer.from(crypto.createHmac('sha256', secret).update(payload).digest('hex'), 'hex');

    return expected.length === digest.length && require('crypto').timingSafeEqual(expected, digest);
  }

  parseWebhookEvent(payload: string): BankingWebhookEvent {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      id: (parsed.id as string) ?? (parsed['eventId'] as string) ?? 'unknown',
      provider: this.id,
      type: (parsed.type as string) ?? 'unit.event',
      createdAt: (parsed['createdAt'] as string) ?? new Date().toISOString(),
      payload: parsed,
    };
  }

  // ---------------------------------------------------------------------------
  // Sandbox Simulations
  // ---------------------------------------------------------------------------

  async simulateOperation(kind: string, payload: unknown): Promise<unknown> {
    const normalized = kind.toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Simulation kind must be provided');
    }

    return this.request<unknown>({ method: 'post', url: `/simulations/${normalized}`, data: payload });
  }

  async listSimulations(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingSimulationDescriptor>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/simulations', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapSimulation(entry)),
    };
  }

  // ---------------------------------------------------------------------------
  // Check Deposits
  // ---------------------------------------------------------------------------

  async createCheckDeposit(dto: unknown): Promise<BankingCheckDeposit> {
    const payload = await this.request<unknown>({ method: 'post', url: '/check-deposits', data: dto });
    return this.mapCheckDeposit(payload);
  }

  async getCheckDeposit(checkDepositId: string): Promise<BankingCheckDeposit> {
    const payload = await this.request<unknown>({ method: 'get', url: `/check-deposits/${checkDepositId}` });
    return this.mapCheckDeposit(payload);
  }

  async listCheckDeposits(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCheckDeposit>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/check-deposits', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapCheckDeposit(entry)),
    };
  }

  // ---------------------------------------------------------------------------
  // Disputes
  // ---------------------------------------------------------------------------

  async createDispute(dto: unknown): Promise<BankingDispute> {
    const payload = await this.request<unknown>({ method: 'post', url: '/disputes', data: dto });
    return this.mapDispute(payload);
  }

  async getDispute(disputeId: string): Promise<BankingDispute> {
    const payload = await this.request<unknown>({ method: 'get', url: `/disputes/${disputeId}` });
    return this.mapDispute(payload);
  }

  async listDisputes(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingDispute>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/disputes', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapDispute(entry)),
    };
  }

  async updateDispute(disputeId: string, dto: unknown): Promise<BankingDispute> {
    const payload = await this.request<unknown>({ method: 'patch', url: `/disputes/${disputeId}`, data: dto });
    return this.mapDispute(payload);
  }

  // ---------------------------------------------------------------------------
  // Rewards
  // ---------------------------------------------------------------------------

  async listRewards(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingReward>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/rewards', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapReward(entry)),
    };
  }

  async getReward(rewardId: string): Promise<BankingReward> {
    const payload = await this.request<unknown>({ method: 'get', url: `/rewards/${rewardId}` });
    return this.mapReward(payload);
  }

  // ---------------------------------------------------------------------------
  // Mandates (Unit fallback)
  // ---------------------------------------------------------------------------

  async createMandate(dto: unknown): Promise<BankingMandate> {
    const payload = await this.request<unknown>({ method: 'post', url: '/mandates', data: dto });
    return this.mapMandate(payload);
  }

  async getMandate(mandateId: string): Promise<BankingMandate> {
    const payload = await this.request<unknown>({ method: 'get', url: `/mandates/${mandateId}` });
    return this.mapMandate(payload);
  }

  async listMandates(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingMandate>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/mandates', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapMandate(entry)),
    };
  }

  async updateMandate(mandateId: string, dto: unknown): Promise<BankingMandate> {
    const payload = await this.request<unknown>({ method: 'patch', url: `/mandates/${mandateId}`, data: dto });
    return this.mapMandate(payload);
  }

  async cancelMandate(mandateId: string): Promise<BankingMandate> {
    const payload = await this.request<unknown>({ method: 'post', url: `/mandates/${mandateId}/cancel` });
    return this.mapMandate(payload);
  }

  // ---------------------------------------------------------------------------
  // Restriction Groups (Unit - treat as card restrictions)
  // ---------------------------------------------------------------------------

  async listRestrictionGroups(type: BankingRestrictionGroupType, params?: Record<string, unknown>): Promise<PaginatedResponse<BankingRestrictionGroup>> {
    const payload = await this.request<unknown>({ method: 'get', url: `/restriction-groups/${type}`, params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapRestrictionGroup(type, entry)),
    };
  }

  async createRestrictionGroup(type: BankingRestrictionGroupType, dto: unknown): Promise<BankingRestrictionGroup> {
    const payload = await this.request<unknown>({ method: 'post', url: `/restriction-groups/${type}`, data: dto });
    return this.mapRestrictionGroup(type, payload);
  }

  async getRestrictionGroup(type: BankingRestrictionGroupType, groupId: string): Promise<BankingRestrictionGroup> {
    const payload = await this.request<unknown>({ method: 'get', url: `/restriction-groups/${type}/${groupId}` });
    return this.mapRestrictionGroup(type, payload);
  }

  async updateRestrictionGroup(type: BankingRestrictionGroupType, groupId: string, dto: unknown): Promise<BankingRestrictionGroup> {
    const payload = await this.request<unknown>({ method: 'patch', url: `/restriction-groups/${type}/${groupId}`, data: dto });
    return this.mapRestrictionGroup(type, payload);
  }

  // ---------------------------------------------------------------------------
  // Recalls
  // ---------------------------------------------------------------------------

  async createRecall(dto: unknown): Promise<BankingRecall> {
    const payload = await this.request<unknown>({ method: 'post', url: '/recalls', data: dto });
    return this.mapRecall(payload);
  }

  async getRecall(recallId: string): Promise<BankingRecall> {
    const payload = await this.request<unknown>({ method: 'get', url: `/recalls/${recallId}` });
    return this.mapRecall(payload);
  }

  async listRecalls(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingRecall>> {
    const payload = await this.request<unknown>({ method: 'get', url: '/recalls', params });
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapRecall(entry)),
    };
  }

  async respondRecall(recallId: string, dto: unknown): Promise<BankingRecall> {
    const payload = await this.request<unknown>({ method: 'post', url: `/recalls/${recallId}/respond`, data: dto });
    return this.mapRecall(payload);
  }
}
