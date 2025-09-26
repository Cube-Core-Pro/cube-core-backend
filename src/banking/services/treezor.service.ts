import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  BankingRestrictionGroupType,
  BankingRecall,
} from '../types/banking.types';
import { TreezorRawService } from './treezor.raw.service';

type TreezorPaymentKind = 'payin' | 'payout' | 'transfer';

interface TreezorPaymentPayload extends Record<string, unknown> {
  paymentType?: TreezorPaymentKind | string;
  type?: TreezorPaymentKind | string;
}

@Injectable()
export class TreezorService extends TreezorRawService implements BankingProvider {
  readonly id = 'treezor' as const;
  readonly supportedCurrencies = ['EUR', 'CHF', 'GBP'];
  readonly regions = ['eu', 'europe', 'fr', 'de', 'es', 'it', 'nl'];
  private readonly webhookSecret?: string;

  constructor(cfg: ConfigService) {
    super(cfg);
    this.webhookSecret = cfg.get<string>('TREEZOR_WEBHOOK_SECRET') ?? undefined;
  }

  private mapMandate(payload: any): BankingMandate {
    return {
      id: String(payload?.id ?? payload?.mandateId ?? crypto.randomUUID()),
      provider: this.id,
      status: String(payload?.status ?? payload?.state ?? 'unknown'),
      type: String(payload?.type ?? payload?.mandateType ?? 'sepa_direct_debit'),
      debtorId: String(payload?.debtorId ?? payload?.debtor?.id ?? ''),
      creditorId: String(payload?.creditorId ?? payload?.creditor?.id ?? ''),
      reference: String(payload?.reference ?? payload?.mandateReference ?? ''),
      signatureDate: payload?.signatureDate?.toString(),
      createdAt: (payload?.created ?? payload?.createdAt ?? new Date().toISOString()).toString(),
      metadata: { raw: payload },
    };
  }

  private mapDispute(payload: any): BankingDispute {
    const amount = payload?.amount ?? payload?.value ?? payload?.disputedAmount ?? 0;
    const currency = payload?.currency ?? payload?.currencyCode ?? payload?.disputedCurrency ?? 'EUR';
    return {
      id: String(payload?.id ?? payload?.disputeId ?? crypto.randomUUID()),
      provider: this.id,
      status: String(payload?.status ?? payload?.state ?? 'unknown'),
      reason: String(payload?.reason ?? payload?.reasonCode ?? 'unspecified'),
      transactionId: String(payload?.transactionId ?? payload?.operationId ?? ''),
      amount: Number(amount),
      currency: String(currency),
      openedAt: (payload?.created ?? payload?.createdAt ?? new Date().toISOString()).toString(),
      resolvedAt: payload?.resolvedAt?.toString() ?? payload?.closedAt?.toString(),
      metadata: { raw: payload },
    };
  }

  private mapReward(payload: any): BankingReward {
    const amount = payload?.amount ?? payload?.value ?? payload?.rewardAmount ?? 0;
    const currency = payload?.currency ?? payload?.currencyCode ?? payload?.rewardCurrency ?? 'EUR';
    return {
      id: String(payload?.id ?? payload?.rewardId ?? crypto.randomUUID()),
      provider: this.id,
      type: String(payload?.type ?? payload?.rewardType ?? 'reward'),
      description: payload?.description,
      status: String(payload?.status ?? payload?.state ?? 'unknown'),
      amount: Number(amount),
      currency: String(currency),
      awardedAt: (payload?.created ?? payload?.createdAt ?? new Date().toISOString()).toString(),
      metadata: { raw: payload },
    };
  }

  private mapRestrictionGroup(type: BankingRestrictionGroupType, payload: any): BankingRestrictionGroup {
    const entries = payload?.values ?? payload?.rules ?? payload?.entries ?? [];
    return {
      id: String(payload?.id ?? payload?.groupId ?? crypto.randomUUID()),
      provider: this.id,
      groupType: type,
      name: String(payload?.name ?? payload?.label ?? 'restriction-group'),
      status: String(payload?.status ?? payload?.state ?? 'active'),
      entries: Array.isArray(entries) ? entries.map((entry: unknown) => String(entry)) : [],
      createdAt: (payload?.created ?? payload?.createdAt ?? new Date().toISOString()).toString(),
      updatedAt: payload?.updatedAt?.toString() ?? payload?.updated?.toString(),
      metadata: { raw: payload },
    };
  }

  private mapRecall(payload: any): BankingRecall {
    return {
      id: String(payload?.id ?? payload?.recallId ?? crypto.randomUUID()),
      provider: this.id,
      paymentId: String(payload?.paymentId ?? payload?.transactionId ?? ''),
      status: String(payload?.status ?? payload?.state ?? 'unknown'),
      reason: payload?.reason ?? payload?.reasonCode,
      requestedAt: (payload?.created ?? payload?.createdAt ?? new Date().toISOString()).toString(),
      respondedAt: payload?.respondedAt?.toString(),
      metadata: { raw: payload },
    };
  }

  private unsupported(feature: string): BadRequestException {
    return new BadRequestException(`${this.id} provider does not support ${feature}`);
  }

  // ---------------------------------------------------------------------------
  // Customers & Applications
  // ---------------------------------------------------------------------------

  async createCustomer(dto: unknown): Promise<BankingCustomer> {
    const user = await super.createUser(dto);
    return this.mapUserToCustomer(user);
  }

  async getCustomer(customerId: string): Promise<BankingCustomer> {
    const user = await super.getUser(customerId);
    return this.mapUserToCustomer(user);
  }

  async listCustomers(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCustomer>> {
    const payload = await super.listUsers(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((user: any) => this.mapUserToCustomer(user)),
    };
  }

  async updateCustomer(customerId: string, dto: unknown): Promise<BankingCustomer> {
    const user = await super.updateUser(customerId, dto);
    return this.mapUserToCustomer(user);
  }

  async createApplication(dto: unknown): Promise<BankingApplication> {
    const user = await super.createUser(dto);
    return this.mapUserToApplication(user);
  }

  async getApplication(applicationId: string): Promise<BankingApplication> {
    const review = await super.getUser(applicationId);
    return this.mapUserToApplication(review);
  }

  async listApplications(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingApplication>> {
    const payload = await super.listUsers(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((user: any) => this.mapUserToApplication(user)),
    };
  }

  async updateApplication(applicationId: string, dto: unknown): Promise<BankingApplication> {
    const user = await super.updateUser(applicationId, dto);
    return this.mapUserToApplication(user);
  }

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  async createAccount(dto: unknown): Promise<BankingAccount> {
    const wallet = await super.createWallet(dto);
    return this.mapWalletToAccount(wallet);
  }

  async getAccount(accountId: string): Promise<BankingAccount> {
    const wallet = await super.getWallet(accountId);
    return this.mapWalletToAccount(wallet);
  }

  async listAccounts(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingAccount>> {
    const payload = await super.listWallets(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((wallet: any) => this.mapWalletToAccount(wallet)),
    };
  }

  async updateAccount(accountId: string, dto: unknown): Promise<BankingAccount> {
    const wallet = await super.updateWallet(accountId, dto);
    return this.mapWalletToAccount(wallet);
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  async issueCard(dto: unknown): Promise<BankingCard> {
    const card = await super.createCard(dto);
    return this.mapCardToBankingCard(card);
  }

  async getCard(cardId: string): Promise<BankingCard> {
    const card = await super.getCard(cardId);
    return this.mapCardToBankingCard(card);
  }

  async listCards(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCard>> {
    const payload = await super.listCards(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((card: any) => this.mapCardToBankingCard(card)),
    };
  }

  async updateCard(cardId: string, dto: unknown): Promise<BankingCard> {
    const card = await super.updateCard(cardId, dto);
    return this.mapCardToBankingCard(card);
  }

  async manageCardControls(cardId: string, controls: unknown): Promise<BankingCard> {
    const card = await this.req<any>('post', `/cards/${cardId}/controls`, controls);
    return this.mapCardToBankingCard(card);
  }

  // ---------------------------------------------------------------------------
  // Payments & Transfers
  // ---------------------------------------------------------------------------

  async createPayment(dto: TreezorPaymentPayload): Promise<BankingPayment> {
    const type = this.resolvePaymentType(dto);

    switch (type) {
      case 'payin': {
        const payin = await super.createPayin(dto);
        return this.mapPaymentToBankingPayment(payin, 'payin');
      }
      case 'payout': {
        const payout = await super.createPayout(dto);
        return this.mapPaymentToBankingPayment(payout, 'payout');
      }
      case 'transfer': {
        const transfer = await super.createTransfer(dto);
        return this.mapPaymentToBankingPayment(transfer, 'transfer');
      }
      default:
        throw new BadRequestException('Unsupported Treezor payment type. Use payin|payout|transfer.');
    }
  }

  async getPayment(paymentId: string, params?: Record<string, unknown>): Promise<BankingPayment> {
    const type = this.resolvePaymentType(params ?? {});
    switch (type) {
      case 'payin':
        return this.mapPaymentToBankingPayment(await super.getPayin(paymentId), 'payin');
      case 'payout':
        return this.mapPaymentToBankingPayment(await super.getPayout(paymentId), 'payout');
      case 'transfer':
        return this.mapPaymentToBankingPayment(await super.getTransfer(paymentId), 'transfer');
      default:
        throw new BadRequestException('Specify payment type via ?type=payin|payout|transfer for Treezor.');
    }
  }

  async listPayments(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingPayment>> {
    const type = (params?.type ?? params?.paymentType) as string | undefined;
    if (type) {
      return this.listPaymentsByType(type, params);
    }

    const [payins, payouts, transfers] = await Promise.all([
      this.listPaymentsByType('payin', params),
      this.listPaymentsByType('payout', params),
      this.listPaymentsByType('transfer', params),
    ]);

    const data = [...payins.data, ...payouts.data, ...transfers.data];
    return { data, total: data.length };
  }

  private async listPaymentsByType(type: string, params?: Record<string, unknown>): Promise<PaginatedResponse<BankingPayment>> {
    switch (type.toLowerCase()) {
      case 'payin': {
        const payload = await super.listPayins(params);
        const normalized = this.normalizeCollection<any>(payload);
        return {
          ...normalized,
          data: normalized.data.map((item: any) => this.mapPaymentToBankingPayment(item, 'payin')),
        };
      }
      case 'payout': {
        const payload = await super.listPayouts(params);
        const normalized = this.normalizeCollection<any>(payload);
        return {
          ...normalized,
          data: normalized.data.map((item: any) => this.mapPaymentToBankingPayment(item, 'payout')),
        };
      }
      case 'transfer': {
        const payload = await super.listTransfers(params);
        const normalized = this.normalizeCollection<any>(payload);
        return {
          ...normalized,
          data: normalized.data.map((item: any) => this.mapPaymentToBankingPayment(item, 'transfer')),
        };
      }
      default:
        throw new BadRequestException('Unsupported Treezor payment list type.');
    }
  }

  private resolvePaymentType(payload: TreezorPaymentPayload): TreezorPaymentKind {
    const type = (payload.paymentType ?? payload.type ?? '').toString().toLowerCase();
    if (type === 'payin' || type === 'payout' || type === 'transfer') {
      return type;
    }

    throw new BadRequestException('Treezor payment operations require type/paymentType payin|payout|transfer.');
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async listTransactions(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingTransaction>> {
    const payload = await super.listTransactions(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((item: any) => this.mapTransactionToBanking(item)),
    };
  }

  async getTransaction(transactionId: string): Promise<BankingTransaction> {
    const txn = await super.getTransaction(transactionId);
    return this.mapTransactionToBanking(txn);
  }

  // ---------------------------------------------------------------------------
  // Counterparties & Beneficiaries
  // ---------------------------------------------------------------------------

  async createCounterparty(dto: unknown): Promise<BankingCounterparty> {
    const beneficiary = await super.createBeneficiary(dto);
    return this.mapBeneficiaryToCounterparty(beneficiary);
  }

  async getCounterparty(counterpartyId: string): Promise<BankingCounterparty> {
    const beneficiary = await super.getBeneficiary(counterpartyId);
    return this.mapBeneficiaryToCounterparty(beneficiary);
  }

  async listCounterparties(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingCounterparty>> {
    const payload = await super.listBeneficiaries(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((item: any) => this.mapBeneficiaryToCounterparty(item)),
    };
  }

  // ---------------------------------------------------------------------------
  // Authorizations (Card transactions)
  // ---------------------------------------------------------------------------

  async listAuthorizations(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingAuthorization>> {
    const payload = await super.listCardTransactions(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((item: any) => ({
        id: String(item?.id ?? item?.transactionId ?? ''),
        provider: this.id,
        status: String(item?.status ?? item?.state ?? 'unknown'),
        type: String(item?.transactionType ?? 'card'),
        amount: Number(item?.amount ?? 0),
        currency: String(item?.currency ?? item?.currencyCode ?? 'EUR'),
        cardId: item?.cardId,
        merchantName: item?.merchantName,
        merchantCategory: item?.mcc,
        createdAt: (item?.created ?? item?.createdAt ?? new Date().toISOString()).toString(),
        metadata: { raw: item },
      } as BankingAuthorization)),
    };
  }

  async getAuthorization(authorizationId: string): Promise<BankingAuthorization> {
    const txn = await super.getCardTransaction(authorizationId) as any;
    return {
      id: String(txn?.id ?? txn?.transactionId ?? ''),
      provider: this.id,
      status: String(txn?.status ?? txn?.state ?? 'unknown'),
      type: String(txn?.transactionType ?? 'card'),
      amount: Number(txn?.amount ?? 0),
      currency: String(txn?.currency ?? txn?.currencyCode ?? 'EUR'),
      cardId: txn?.cardId,
      merchantName: txn?.merchantName,
      merchantCategory: txn?.mcc,
      createdAt: (txn?.created ?? txn?.createdAt ?? new Date().toISOString()).toString(),
      metadata: { raw: txn },
    };
  }

  // ---------------------------------------------------------------------------
  // Statements & Documents
  // ---------------------------------------------------------------------------

  async listStatements(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingStatement>> {
    const walletId = (params?.walletId ?? params?.accountId) as string | undefined;
    const format = (params?.format as string | undefined) ?? 'computed';

    if (walletId) {
      const statement = await super.getAccountStatement(walletId, format as 'computed' | 'raw', params);
      return { data: [this.mapStatement(statement, params?.format as string | undefined)], total: 1 };
    }

    // Aggregate across wallets if none specified
    const wallets = await super.listWallets({ ...params, limit: params?.limit ?? 5 });
    const normalized = this.normalizeCollection<any>(wallets);
    const statements: BankingStatement[] = [];

    for (const wallet of normalized.data) {
      try {
        const statement = await super.getAccountStatement(wallet.id ?? wallet.walletId, format as 'computed' | 'raw', params);
        statements.push(this.mapStatement(statement, params?.format as string | undefined));
      } catch (error) {
        // Skip wallets without statements
      }
    }

    return { data: statements, total: statements.length };
  }

  async getStatement(statementId: string, format: 'pdf' | 'html' | 'json' = 'pdf'):
    Promise<BankingStatement> {
    // Treezor uses walletId rather than statementId; expect pattern walletId:period
    const [walletId] = statementId.split(':');
    if (!walletId) {
      throw new BadRequestException('Treezor statements expect identifier walletId:period.');
    }

    const params: Record<string, unknown> = {};
    if (statementId.includes(':')) {
      const [, period] = statementId.split(':');
      params.period = period;
    }

    const statement = await super.getAccountStatement(walletId, 'computed', params);
    const statementWithFormat = Object.assign({}, statement, { format });
    return this.mapStatement(statementWithFormat, format);
  }

  // ---------------------------------------------------------------------------
  // Webhooks & Simulation utilities
  // ---------------------------------------------------------------------------

  verifyWebhook(signature: string, payload: string): boolean {
    if (!this.webhookSecret) {
      return true;
    }

    const expected = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    return expected === signature;
  }

  parseWebhookEvent(payload: string): BankingWebhookEvent {
    return this.mapWebhook(payload);
  }

  async simulateOperation(kind: string, payload: unknown): Promise<unknown> {
    const normalized = kind.toLowerCase();
    switch (normalized) {
      case 'sca-proof':
        return super.simulateScaProof(payload);
      default:
        return this.req('post', `/simulations/${normalized}`, payload);
    }
  }

  async listSimulations(): Promise<PaginatedResponse<BankingSimulationDescriptor>> {
    return {
      data: [
        { id: 'sca-proof', provider: this.id, name: 'Strong Customer Authentication Proof', category: 'sca', description: 'Simulate SCA proof challenge', inputs: { challengeId: 'string', result: 'approved|declined' } },
        { id: 'card-topup', provider: this.id, name: 'Card Topup Simulation', category: 'cards', description: 'Simulate acquiring card topup flow', inputs: { cardId: 'string', amount: 'number' } },
      ],
      total: 2,
    };
  }

  // ---------------------------------------------------------------------------
  // Check Deposits (not supported)
  // ---------------------------------------------------------------------------

  createCheckDeposit(): Promise<BankingCheckDeposit> {
    return Promise.reject(this.unsupported('check deposits'));
  }

  getCheckDeposit(): Promise<BankingCheckDeposit> {
    return Promise.reject(this.unsupported('check deposits'));
  }

  listCheckDeposits(): Promise<PaginatedResponse<BankingCheckDeposit>> {
    return Promise.reject(this.unsupported('check deposits'));
  }

  // ---------------------------------------------------------------------------
  // Disputes (not supported)
  // ---------------------------------------------------------------------------

  async createDispute(dto: unknown): Promise<BankingDispute> {
    const payload = await super.createDispute(dto);
    return this.mapDispute(payload);
  }

  async getDispute(disputeId: string): Promise<BankingDispute> {
    const payload = await super.getDispute(disputeId);
    return this.mapDispute(payload);
  }

  async listDisputes(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingDispute>> {
    const payload = await super.listDisputes(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapDispute(entry)),
    };
  }

  async updateDispute(disputeId: string, dto: unknown): Promise<BankingDispute> {
    const payload = await super.updateDispute(disputeId, dto);
    return this.mapDispute(payload);
  }

  // ---------------------------------------------------------------------------
  // Rewards (not supported)
  // ---------------------------------------------------------------------------

  async listRewards(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingReward>> {
    const payload = await super.listRewards(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapReward(entry)),
    };
  }

  async getReward(rewardId: string): Promise<BankingReward> {
    const payload = await super.getReward(rewardId);
    return this.mapReward(payload);
  }

  // ---------------------------------------------------------------------------
  // Mandates
  // ---------------------------------------------------------------------------

  async createMandate(dto: unknown): Promise<BankingMandate> {
    const payload = await super.createMandate(dto);
    return this.mapMandate(payload);
  }

  async getMandate(mandateId: string): Promise<BankingMandate> {
    const payload = await super.getMandate(mandateId);
    return this.mapMandate(payload);
  }

  async listMandates(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingMandate>> {
    const payload = await super.listMandates(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapMandate(entry)),
    };
  }

  async updateMandate(mandateId: string, dto: unknown): Promise<BankingMandate> {
    const payload = await super.updateMandate(mandateId, dto);
    return this.mapMandate(payload);
  }

  async cancelMandate(mandateId: string): Promise<BankingMandate> {
    const payload = await super.cancelMandate(mandateId);
    return this.mapMandate(payload);
  }

  // ---------------------------------------------------------------------------
  // Restriction Groups
  // ---------------------------------------------------------------------------

  async listRestrictionGroups(type: BankingRestrictionGroupType, params?: Record<string, unknown>): Promise<PaginatedResponse<BankingRestrictionGroup>> {
    const payload = await this.callRestrictionGroup(type, 'list', undefined, params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapRestrictionGroup(type, entry)),
    };
  }

  async createRestrictionGroup(type: BankingRestrictionGroupType, dto: unknown): Promise<BankingRestrictionGroup> {
    const payload = await this.callRestrictionGroup(type, 'create', dto);
    return this.mapRestrictionGroup(type, payload);
  }

  async getRestrictionGroup(type: BankingRestrictionGroupType, groupId: string): Promise<BankingRestrictionGroup> {
    const payload = await this.callRestrictionGroup(type, 'get', undefined, undefined, groupId);
    return this.mapRestrictionGroup(type, payload);
  }

  async updateRestrictionGroup(type: BankingRestrictionGroupType, groupId: string, dto: unknown): Promise<BankingRestrictionGroup> {
    const payload = await this.callRestrictionGroup(type, 'update', dto, undefined, groupId);
    return this.mapRestrictionGroup(type, payload);
  }

  private callRestrictionGroup(
    type: BankingRestrictionGroupType,
    action: 'list' | 'create' | 'get' | 'update',
    dto?: unknown,
    params?: Record<string, unknown>,
    id?: string,
  ): Promise<any> {
    switch (type) {
      case 'country':
        if (action === 'list') return super.listCountryRestrictionGroups(params);
        if (action === 'create') return super.createCountryRestrictionGroup(dto);
        if (action === 'get') return super.getCountryRestrictionGroup(id!);
        break;
      case 'mcc':
        if (action === 'list') return super.listMccRestrictionGroups(params);
        if (action === 'create') return super.createMccRestrictionGroup(dto);
        if (action === 'get') return super.getMccRestrictionGroup(id!);
        break;
      case 'merchant':
        if (action === 'list') return super.listMerchantIdRestrictionGroups(params);
        if (action === 'create') return super.createMerchantIdRestrictionGroup(dto);
        if (action === 'get') return super.getMerchantIdRestrictionGroup(id!);
        break;
      default:
        throw new BadRequestException(`Unsupported restriction group type for ${this.id}: ${type}`);
    }

    if (action === 'update') {
      throw new BadRequestException(`${this.id} restriction groups do not support updates; recreate instead.`);
    }

    throw new BadRequestException(`Unsupported action for ${type} restriction groups on ${this.id}`);
  }

  // ---------------------------------------------------------------------------
  // Recalls
  // ---------------------------------------------------------------------------

  async createRecall(dto: unknown): Promise<BankingRecall> {
    const payload = await super.createRecall(dto);
    return this.mapRecall(payload);
  }

  async getRecall(recallId: string): Promise<BankingRecall> {
    const payload = await super.getRecall(recallId);
    return this.mapRecall(payload);
  }

  async listRecalls(params?: Record<string, unknown>): Promise<PaginatedResponse<BankingRecall>> {
    const payload = await super.listRecalls(params);
    const normalized = this.normalizeCollection<any>(payload);
    return {
      ...normalized,
      data: normalized.data.map((entry: any) => this.mapRecall(entry)),
    };
  }

  async respondRecall(recallId: string, dto: unknown): Promise<BankingRecall> {
    const payload = await super.respondToRecall(recallId, dto);
    return this.mapRecall(payload);
  }
}
