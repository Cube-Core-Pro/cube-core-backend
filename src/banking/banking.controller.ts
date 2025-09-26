import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Headers,
  Req,
  ParseEnumPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { BankingService } from './banking.service';
import { BankingProviderRegistry } from './services/provider-registry.service';
import type { BankingProvider, BankingProviderId } from './providers/banking-provider.interface';
import { BANKING_PROVIDER_ENUM } from './providers/banking-provider.interface';
import type { BankingRestrictionGroupType } from './types/banking.types';
import { BANKING_RESTRICTION_GROUP_ENUM } from './types/banking.types';
import {
  CreateCheckDepositDto,
  CreateDisputeDto,
  UpdateDisputeDto,
  CreateMandateDto,
  UpdateMandateDto,
  CreateRestrictionGroupDto,
  UpdateRestrictionGroupDto,
  RespondRecallDto,
  CreateRecallDto,
  CreatePaymentTypedDto,
} from './dto/banking.dto';

@Controller('banking')
export class BankingController {
  constructor(
    private readonly svc: BankingService,
    private readonly providers: BankingProviderRegistry,
  ) {}

  @Get('health')
  health() {
    return this.svc.health();
  }

  // ---------------------------------------------------------------------------
  // Customers & Applications
  // ---------------------------------------------------------------------------

  @Post(':provider/customers')
  createCustomer(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createCustomer(body);
  }

  @Get(':provider/customers')
  listCustomers(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listCustomers(filters);
  }

  @Get(':provider/customers/:id')
  getCustomer(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') customerId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getCustomer(customerId);
  }

  @Post(':provider/applications')
  createApplication(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createApplication(body);
  }

  @Get(':provider/applications')
  listApplications(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listApplications(filters);
  }

  @Get(':provider/applications/:id')
  getApplication(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') applicationId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getApplication(applicationId);
  }

  @Patch(':provider/applications/:id')
  updateApplication(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') applicationId: string,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateApplication(applicationId, body);
  }

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  @Post(':provider/accounts')
  createAccount(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createAccount(body);
  }

  @Get(':provider/accounts')
  listAccounts(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listAccounts(filters);
  }

  @Get(':provider/accounts/:id')
  getAccount(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') accountId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getAccount(accountId);
  }

  @Patch(':provider/accounts/:id')
  updateAccount(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') accountId: string,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateAccount(accountId, body);
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  @Post(':provider/cards')
  issueCard(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).issueCard(body);
  }

  @Get(':provider/cards')
  listCards(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listCards(filters);
  }

  @Get(':provider/cards/:id')
  getCard(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') cardId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getCard(cardId);
  }

  @Patch(':provider/cards/:id')
  updateCard(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') cardId: string,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateCard(cardId, body);
  }

  @Post(':provider/cards/:id/controls')
  manageCardControls(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') cardId: string,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).manageCardControls(cardId, body);
  }

  // ---------------------------------------------------------------------------
  // Payments & Transfers
  // ---------------------------------------------------------------------------

  @Post(':provider/payments')
  createPayment(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, type } = query;
    if (type && !body.paymentType) {
      body.paymentType = type;
    }
    return this.resolve(providerId, currency as string | undefined).createPayment(body);
  }

  @Post(':provider/payments/:type')
  createTypedPayment(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('type') type: string,
    @Body() body: CreatePaymentTypedDto,
    @Query('currency') currency?: string,
  ) {
    const payload = Object.assign({}, body as unknown, {
      paymentType: body.paymentType ?? type,
    }) as Record<string, unknown>;
    return this.resolve(providerId, currency).createPayment(payload);
  }

  @Get(':provider/payments')
  listPayments(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listPayments(filters);
  }

  @Get(':provider/payments/:id')
  getPayment(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') paymentId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).getPayment(paymentId, filters);
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  @Get(':provider/transactions')
  listTransactions(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listTransactions(filters);
  }

  @Get(':provider/transactions/:id')
  getTransaction(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') transactionId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getTransaction(transactionId);
  }

  // ---------------------------------------------------------------------------
  // Counterparties
  // ---------------------------------------------------------------------------

  @Post(':provider/counterparties')
  createCounterparty(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createCounterparty(body);
  }

  @Get(':provider/counterparties')
  listCounterparties(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listCounterparties(filters);
  }

  @Get(':provider/counterparties/:id')
  getCounterparty(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') counterpartyId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getCounterparty(counterpartyId);
  }

  // ---------------------------------------------------------------------------
  // Authorizations
  // ---------------------------------------------------------------------------

  @Get(':provider/authorizations')
  listAuthorizations(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listAuthorizations(filters);
  }

  @Get(':provider/authorizations/:id')
  getAuthorization(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') authorizationId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getAuthorization(authorizationId);
  }

  // ---------------------------------------------------------------------------
  // Statements
  // ---------------------------------------------------------------------------

  @Get(':provider/statements')
  listStatements(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listStatements(filters);
  }

  @Get(':provider/statements/:id')
  getStatement(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') statementId: string,
    @Query('format') format?: 'pdf' | 'html' | 'json',
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getStatement(statementId, format);
  }

  // ---------------------------------------------------------------------------
  // Check Deposits
  // ---------------------------------------------------------------------------

  @Post(':provider/check-deposits')
  createCheckDeposit(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: CreateCheckDepositDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createCheckDeposit(body);
  }

  @Get(':provider/check-deposits')
  listCheckDeposits(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listCheckDeposits(filters);
  }

  @Get(':provider/check-deposits/:id')
  getCheckDeposit(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') depositId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getCheckDeposit(depositId);
  }

  // ---------------------------------------------------------------------------
  // Disputes
  // ---------------------------------------------------------------------------

  @Post(':provider/disputes')
  createDispute(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: CreateDisputeDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createDispute(body);
  }

  @Get(':provider/disputes')
  listDisputes(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listDisputes(filters);
  }

  @Get(':provider/disputes/:id')
  getDispute(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') disputeId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getDispute(disputeId);
  }

  @Patch(':provider/disputes/:id')
  updateDispute(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') disputeId: string,
    @Body() body: UpdateDisputeDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateDispute(disputeId, body);
  }

  // ---------------------------------------------------------------------------
  // Rewards
  // ---------------------------------------------------------------------------

  @Get(':provider/rewards')
  listRewards(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listRewards(filters);
  }

  @Get(':provider/rewards/:id')
  getReward(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') rewardId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getReward(rewardId);
  }

  // ---------------------------------------------------------------------------
  // Mandates
  // ---------------------------------------------------------------------------

  @Post(':provider/mandates')
  createMandate(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: CreateMandateDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createMandate(body);
  }

  @Get(':provider/mandates')
  listMandates(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listMandates(filters);
  }

  @Get(':provider/mandates/:id')
  getMandate(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') mandateId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getMandate(mandateId);
  }

  @Patch(':provider/mandates/:id')
  updateMandate(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') mandateId: string,
    @Body() body: UpdateMandateDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateMandate(mandateId, body);
  }

  @Post(':provider/mandates/:id/cancel')
  cancelMandate(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') mandateId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).cancelMandate(mandateId);
  }

  // ---------------------------------------------------------------------------
  // Restriction Groups
  // ---------------------------------------------------------------------------

  @Get(':provider/restriction-groups/:type')
  listRestrictionGroups(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('type', new ParseEnumPipe(BANKING_RESTRICTION_GROUP_ENUM)) type: BankingRestrictionGroupType,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listRestrictionGroups(type, filters);
  }

  @Post(':provider/restriction-groups/:type')
  createRestrictionGroup(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('type', new ParseEnumPipe(BANKING_RESTRICTION_GROUP_ENUM)) type: BankingRestrictionGroupType,
    @Body() body: CreateRestrictionGroupDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createRestrictionGroup(type, body);
  }

  @Get(':provider/restriction-groups/:type/:id')
  getRestrictionGroup(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('type', new ParseEnumPipe(BANKING_RESTRICTION_GROUP_ENUM)) type: BankingRestrictionGroupType,
    @Param('id') groupId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getRestrictionGroup(type, groupId);
  }

  @Patch(':provider/restriction-groups/:type/:id')
  updateRestrictionGroup(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('type', new ParseEnumPipe(BANKING_RESTRICTION_GROUP_ENUM)) type: BankingRestrictionGroupType,
    @Param('id') groupId: string,
    @Body() body: UpdateRestrictionGroupDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).updateRestrictionGroup(type, groupId, body);
  }

  // ---------------------------------------------------------------------------
  // Recalls
  // ---------------------------------------------------------------------------

  @Post(':provider/recalls')
  createRecall(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Body() body: CreateRecallDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).createRecall(body);
  }

  @Get(':provider/recalls')
  listRecalls(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query() query: Record<string, unknown>,
  ) {
    const { currency, ...filters } = query;
    return this.resolve(providerId, currency as string | undefined).listRecalls(filters);
  }

  @Get(':provider/recalls/:id')
  getRecall(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') recallId: string,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).getRecall(recallId);
  }

  @Post(':provider/recalls/:id/respond')
  respondRecall(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('id') recallId: string,
    @Body() body: RespondRecallDto,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).respondRecall(recallId, body);
  }

  // ---------------------------------------------------------------------------
  // Simulations
  // ---------------------------------------------------------------------------

  @Get(':provider/simulations')
  listSimulations(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).listSimulations();
  }

  @Post(':provider/simulations/:kind')
  simulateOperation(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Param('kind') kind: string,
    @Body() body: unknown,
    @Query('currency') currency?: string,
  ) {
    return this.resolve(providerId, currency).simulateOperation(kind, body);
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  @Post(':provider/webhook')
  webhook(
    @Param('provider', new ParseEnumPipe(BANKING_PROVIDER_ENUM)) providerId: BankingProviderId,
    @Headers('x-signature') signatureLegacy: string,
    @Headers('x-unit-signature') signatureUnit: string,
    @Headers('x-treezor-signature') signatureTreezor: string,
    @Req() req: Request,
  ) {
    const provider = this.resolve(providerId);
    const raw = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
    const signature = signatureUnit || signatureTreezor || signatureLegacy || '';
    return { verified: provider.verifyWebhook(signature, raw) };
  }

  private resolve(providerId: BankingProviderId, currency?: string): BankingProvider {
    return this.providers.resolveProvider({ provider: providerId, currency });
  }
}
