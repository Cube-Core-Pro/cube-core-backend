// path: src/banking/dto/treezor.dto.ts
// purpose: Treezor API DTOs - Complete type definitions for European Banking
// dependencies: class-validator, class-transformer

import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, } from 'class-validator';import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

export enum TreezorUserType {
  NATURAL = 'natural',
  LEGAL = 'legal'
}

export enum TreezorUserStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REFUSED = 'refused',
  CANCELED = 'canceled'
}

export enum TreezorWalletStatus {
  VALIDATED = 'validated',
  REFUSED = 'refused',
  CANCELED = 'canceled'
}

export enum TreezorCardType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual'
}

export enum TreezorCardStatus {
  PENDING = 'pending',
  ACTIVATED = 'activated',
  BLOCKED = 'blocked',
  EXPIRED = 'expired',
  CANCELED = 'canceled'
}

export enum TreezorPaymentType {
  PAYIN = 'payin',
  PAYOUT = 'payout',
  TRANSFER = 'transfer'
}

export enum TreezorPaymentStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REFUSED = 'refused',
  CANCELED = 'canceled'
}

// ============================================================================
// USER DTOs
// ============================================================================

export class CreateTreezorUserDto {
  @ApiProperty({ description: 'User type', enum: TreezorUserType })
  @IsEnum(TreezorUserType)
  userTypeId: TreezorUserType;

  @ApiProperty({ description: 'User tag (external reference)' })
  @IsString()
  userTag: string;

  @ApiProperty({ description: 'User status', enum: TreezorUserStatus })
  @IsEnum(TreezorUserStatus)
  userStatus: TreezorUserStatus;

  @ApiProperty({ description: 'Parent user ID' })
  @IsOptional()
  @IsString()
  parentUserId?: string;

  @ApiProperty({ description: 'Parent type' })
  @IsOptional()
  @IsString()
  parentType?: string;

  @ApiProperty({ description: 'Control IP address' })
  @IsOptional()
  @IsString()
  controllerIp?: string;

  // Natural person fields
  @ApiPropertyOptional({ description: 'Title (Mr, Mrs, etc.)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiPropertyOptional({ description: 'Middle names' })
  @IsOptional()
  @IsString()
  middleNames?: string;

  @ApiPropertyOptional({ description: 'Birthday (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({ description: 'Address line 3' })
  @IsOptional()
  @IsString()
  address3?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Country (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Nationality (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Nationality other' })
  @IsOptional()
  @IsString()
  nationalityOther?: string;

  @ApiPropertyOptional({ description: 'Place of birth' })
  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @ApiPropertyOptional({ description: 'Country of birth (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  birthCountry?: string;

  @ApiPropertyOptional({ description: 'Occupation' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ description: 'Income range' })
  @IsOptional()
  @IsString()
  incomeRange?: string;

  // Legal entity fields
  @ApiPropertyOptional({ description: 'Legal name' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Legal registration number' })
  @IsOptional()
  @IsString()
  legalRegistrationNumber?: string;

  @ApiPropertyOptional({ description: 'Legal TIN (Tax Identification Number)' })
  @IsOptional()
  @IsString()
  legalTin?: string;

  @ApiPropertyOptional({ description: 'Legal registration date' })
  @IsOptional()
  @IsDateString()
  legalRegistrationDate?: string;

  @ApiPropertyOptional({ description: 'Legal form' })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiPropertyOptional({ description: 'Legal share capital' })
  @IsOptional()
  @IsNumber()
  legalShareCapital?: number;

  @ApiPropertyOptional({ description: 'Legal sector' })
  @IsOptional()
  @IsString()
  legalSector?: string;

  @ApiPropertyOptional({ description: 'Legal annual turnover' })
  @IsOptional()
  @IsString()
  legalAnnualTurnOver?: string;

  @ApiPropertyOptional({ description: 'Legal net income range' })
  @IsOptional()
  @IsString()
  legalNetIncomeRange?: string;

  @ApiPropertyOptional({ description: 'Legal number of employee range' })
  @IsOptional()
  @IsString()
  legalNumberOfEmployeeRange?: string;

  // Tax residences
  @ApiPropertyOptional({ description: 'Tax country' })
  @IsOptional()
  @IsString()
  taxCountry?: string;

  @ApiPropertyOptional({ description: 'Tax number' })
  @IsOptional()
  @IsString()
  taxNumber?: string;
}

export class UpdateTreezorUserDto {
  @ApiPropertyOptional({ description: 'User status', enum: TreezorUserStatus })
  @IsOptional()
  @IsEnum(TreezorUserStatus)
  userStatus?: TreezorUserStatus;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Address line 1' })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Country (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number' })
  @IsOptional()
  @IsString()
  mobile?: string;
}

// ============================================================================
// WALLET DTOs
// ============================================================================

export class CreateTreezorWalletDto {
  @ApiProperty({ description: 'Wallet type ID' })
  @IsNumber()
  walletTypeId: number;

  @ApiProperty({ description: 'Tariff ID' })
  @IsNumber()
  tariffId: number;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Currency (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Event name' })
  @IsString()
  eventName: string;

  @ApiPropertyOptional({ description: 'Event message' })
  @IsOptional()
  @IsString()
  eventMessage?: string;

  @ApiPropertyOptional({ description: 'Event alias' })
  @IsOptional()
  @IsString()
  eventAlias?: string;

  @ApiPropertyOptional({ description: 'Event date' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ description: 'Event payload URL' })
  @IsOptional()
  @IsString()
  eventPayloadUrl?: string;

  @ApiPropertyOptional({ description: 'Wallet tag (external reference)' })
  @IsOptional()
  @IsString()
  walletTag?: string;
}

export class UpdateTreezorWalletDto {
  @ApiPropertyOptional({ description: 'Wallet status', enum: TreezorWalletStatus })
  @IsOptional()
  @IsEnum(TreezorWalletStatus)
  walletStatus?: TreezorWalletStatus;

  @ApiPropertyOptional({ description: 'Event name' })
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ description: 'Event message' })
  @IsOptional()
  @IsString()
  eventMessage?: string;
}

// ============================================================================
// CARD DTOs
// ============================================================================

export class CreateTreezorCardDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: 'Wallet card transaction ID' })
  @IsString()
  walletCardtransactionId: string;

  @ApiProperty({ description: 'Card type', enum: TreezorCardType })
  @IsEnum(TreezorCardType)
  cardType: TreezorCardType;

  @ApiProperty({ description: 'Card tag (external reference)' })
  @IsString()
  cardTag: string;

  @ApiPropertyOptional({ description: 'Card print' })
  @IsOptional()
  @IsString()
  cardPrint?: string;

  @ApiPropertyOptional({ description: 'Batch delivery ID' })
  @IsOptional()
  @IsString()
  batchDeliveryId?: string;

  @ApiPropertyOptional({ description: 'Delivery title' })
  @IsOptional()
  @IsString()
  deliveryTitle?: string;

  @ApiPropertyOptional({ description: 'Delivery firstname' })
  @IsOptional()
  @IsString()
  deliveryFirstname?: string;

  @ApiPropertyOptional({ description: 'Delivery lastname' })
  @IsOptional()
  @IsString()
  deliveryLastname?: string;

  @ApiPropertyOptional({ description: 'Delivery address 1' })
  @IsOptional()
  @IsString()
  deliveryAddress1?: string;

  @ApiPropertyOptional({ description: 'Delivery address 2' })
  @IsOptional()
  @IsString()
  deliveryAddress2?: string;

  @ApiPropertyOptional({ description: 'Delivery address 3' })
  @IsOptional()
  @IsString()
  deliveryAddress3?: string;

  @ApiPropertyOptional({ description: 'Delivery postcode' })
  @IsOptional()
  @IsString()
  deliveryPostcode?: string;

  @ApiPropertyOptional({ description: 'Delivery city' })
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @ApiPropertyOptional({ description: 'Delivery country' })
  @IsOptional()
  @IsString()
  deliveryCountry?: string;

  @ApiPropertyOptional({ description: 'Is live' })
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;

  @ApiPropertyOptional({ description: 'PIN' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ description: 'Anonymous' })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Send to parent' })
  @IsOptional()
  @IsBoolean()
  sendToParent?: boolean;

  @ApiPropertyOptional({ description: 'MCC restriction group ID' })
  @IsOptional()
  @IsString()
  mccRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Merchant restriction group ID' })
  @IsOptional()
  @IsString()
  merchantRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Country restriction group ID' })
  @IsOptional()
  @IsString()
  countryRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Limits ATM year' })
  @IsOptional()
  @IsNumber()
  limitsAtmYear?: number;

  @ApiPropertyOptional({ description: 'Limits ATM month' })
  @IsOptional()
  @IsNumber()
  limitsAtmMonth?: number;

  @ApiPropertyOptional({ description: 'Limits ATM week' })
  @IsOptional()
  @IsNumber()
  limitsAtmWeek?: number;

  @ApiPropertyOptional({ description: 'Limits ATM day' })
  @IsOptional()
  @IsNumber()
  limitsAtmDay?: number;

  @ApiPropertyOptional({ description: 'Limits ATM all' })
  @IsOptional()
  @IsNumber()
  limitsAtmAll?: number;

  @ApiPropertyOptional({ description: 'Limits payment year' })
  @IsOptional()
  @IsNumber()
  limitsPaymentYear?: number;

  @ApiPropertyOptional({ description: 'Limits payment month' })
  @IsOptional()
  @IsNumber()
  limitsPaymentMonth?: number;

  @ApiPropertyOptional({ description: 'Limits payment week' })
  @IsOptional()
  @IsNumber()
  limitsPaymentWeek?: number;

  @ApiPropertyOptional({ description: 'Limits payment day' })
  @IsOptional()
  @IsNumber()
  limitsPaymentDay?: number;

  @ApiPropertyOptional({ description: 'Limits payment all' })
  @IsOptional()
  @IsNumber()
  limitsPaymentAll?: number;
}

export class UpdateTreezorCardDto {
  @ApiPropertyOptional({ description: 'Card status', enum: TreezorCardStatus })
  @IsOptional()
  @IsEnum(TreezorCardStatus)
  cardStatus?: TreezorCardStatus;

  @ApiPropertyOptional({ description: 'MCC restriction group ID' })
  @IsOptional()
  @IsString()
  mccRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Merchant restriction group ID' })
  @IsOptional()
  @IsString()
  merchantRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Country restriction group ID' })
  @IsOptional()
  @IsString()
  countryRestrictionGroupId?: string;

  @ApiPropertyOptional({ description: 'Limits ATM year' })
  @IsOptional()
  @IsNumber()
  limitsAtmYear?: number;

  @ApiPropertyOptional({ description: 'Limits ATM month' })
  @IsOptional()
  @IsNumber()
  limitsAtmMonth?: number;

  @ApiPropertyOptional({ description: 'Limits ATM week' })
  @IsOptional()
  @IsNumber()
  limitsAtmWeek?: number;

  @ApiPropertyOptional({ description: 'Limits ATM day' })
  @IsOptional()
  @IsNumber()
  limitsAtmDay?: number;

  @ApiPropertyOptional({ description: 'Limits ATM all' })
  @IsOptional()
  @IsNumber()
  limitsAtmAll?: number;

  @ApiPropertyOptional({ description: 'Limits payment year' })
  @IsOptional()
  @IsNumber()
  limitsPaymentYear?: number;

  @ApiPropertyOptional({ description: 'Limits payment month' })
  @IsOptional()
  @IsNumber()
  limitsPaymentMonth?: number;

  @ApiPropertyOptional({ description: 'Limits payment week' })
  @IsOptional()
  @IsNumber()
  limitsPaymentWeek?: number;

  @ApiPropertyOptional({ description: 'Limits payment day' })
  @IsOptional()
  @IsNumber()
  limitsPaymentDay?: number;

  @ApiPropertyOptional({ description: 'Limits payment all' })
  @IsOptional()
  @IsNumber()
  limitsPaymentAll?: number;
}

// ============================================================================
// PAYMENT DTOs
// ============================================================================

export class CreateTreezorPayinDto {
  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: 'Payin tag (external reference)' })
  @IsString()
  payinTag: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Amount in cents' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Payin date' })
  @IsOptional()
  @IsDateString()
  payinDate?: string;

  @ApiPropertyOptional({ description: 'Mean of payment' })
  @IsOptional()
  @IsString()
  meanOfPayment?: string;

  @ApiPropertyOptional({ description: 'Mean of payment ID' })
  @IsOptional()
  @IsString()
  meanOfPaymentId?: string;

  @ApiPropertyOptional({ description: 'Access signature' })
  @IsOptional()
  @IsString()
  accessSignature?: string;

  @ApiPropertyOptional({ description: 'Access tag' })
  @IsOptional()
  @IsString()
  accessTag?: string;

  @ApiPropertyOptional({ description: 'Access user ID' })
  @IsOptional()
  @IsString()
  accessUserId?: string;

  @ApiPropertyOptional({ description: 'Access user IP' })
  @IsOptional()
  @IsString()
  accessUserIp?: string;

  @ApiPropertyOptional({ description: 'Payment acceptor ID' })
  @IsOptional()
  @IsString()
  paymentAcceptorId?: string;

  @ApiPropertyOptional({ description: 'Distributor fee' })
  @IsOptional()
  @IsNumber()
  distributorFee?: number;

  @ApiPropertyOptional({ description: 'Message to user' })
  @IsOptional()
  @IsString()
  messageToUser?: string;

  @ApiPropertyOptional({ description: 'Subtotal items' })
  @IsOptional()
  @IsNumber()
  subtotalItems?: number;

  @ApiPropertyOptional({ description: 'Subtotal services' })
  @IsOptional()
  @IsNumber()
  subtotalServices?: number;

  @ApiPropertyOptional({ description: 'Subtotal tax' })
  @IsOptional()
  @IsNumber()
  subtotalTax?: number;
}

export class CreateTreezorPayoutDto {
  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: 'Beneficiary ID' })
  @IsString()
  beneficiaryId: string;

  @ApiProperty({ description: 'Payout tag (external reference)' })
  @IsString()
  payoutTag: string;

  @ApiProperty({ description: 'Amount in cents' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Payout date' })
  @IsOptional()
  @IsDateString()
  payoutDate?: string;

  @ApiPropertyOptional({ description: 'Access signature' })
  @IsOptional()
  @IsString()
  accessSignature?: string;

  @ApiPropertyOptional({ description: 'Access tag' })
  @IsOptional()
  @IsString()
  accessTag?: string;

  @ApiPropertyOptional({ description: 'Access user ID' })
  @IsOptional()
  @IsString()
  accessUserId?: string;

  @ApiPropertyOptional({ description: 'Access user IP' })
  @IsOptional()
  @IsString()
  accessUserIp?: string;
}

export class CreateTreezorTransferDto {
  @ApiProperty({ description: 'Wallet debit ID' })
  @IsString()
  walletDebitId: string;

  @ApiProperty({ description: 'Wallet credit ID' })
  @IsString()
  walletCreditId: string;

  @ApiProperty({ description: 'Transfer tag (external reference)' })
  @IsString()
  transferTag: string;

  @ApiProperty({ description: 'Amount in cents' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Transfer date' })
  @IsOptional()
  @IsDateString()
  transferDate?: string;
}

// ============================================================================
// BENEFICIARY DTOs
// ============================================================================

export class CreateTreezorBeneficiaryDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Beneficiary tag (external reference)' })
  @IsString()
  beneficiaryTag: string;

  @ApiProperty({ description: 'Nickname' })
  @IsString()
  nickName: string;

  @ApiProperty({ description: 'Name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'IBAN' })
  @IsString()
  iban: string;

  @ApiProperty({ description: 'BIC' })
  @IsString()
  bic: string;

  @ApiPropertyOptional({ description: 'Sepa creditor identifier' })
  @IsOptional()
  @IsString()
  sepaCreditorIdentifier?: string;

  @ApiPropertyOptional({ description: 'USAC' })
  @IsOptional()
  @IsString()
  usac?: string;

  @ApiPropertyOptional({ description: 'Court decision' })
  @IsOptional()
  @IsBoolean()
  courtDecision?: boolean;
}

export class UpdateTreezorBeneficiaryDto {
  @ApiPropertyOptional({ description: 'Nickname' })
  @IsOptional()
  @IsString()
  nickName?: string;

  @ApiPropertyOptional({ description: 'Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'IBAN' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'BIC' })
  @IsOptional()
  @IsString()
  bic?: string;
}

// ============================================================================
// DOCUMENT DTOs
// ============================================================================

export class UploadTreezorDocumentDto {
  @ApiProperty({ description: 'Document type ID' })
  @IsNumber()
  documentTypeId: number;

  @ApiProperty({ description: 'Document tag (external reference)' })
  @IsString()
  documentTag: string;

  @ApiProperty({ description: 'Name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'File content (base64)' })
  @IsString()
  fileContent: string;

  @ApiPropertyOptional({ description: 'Residence ID' })
  @IsOptional()
  @IsNumber()
  residenceId?: number;
}

// ============================================================================
// MANDATE DTOs (SEPA Direct Debit)
// ============================================================================

export class CreateTreezorMandateDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Mandate tag (external reference)' })
  @IsString()
  mandateTag: string;

  @ApiProperty({ description: 'Unique mandate reference' })
  @IsString()
  uniqueMandateReference: string;

  @ApiProperty({ description: 'Debtor name' })
  @IsString()
  debtorName: string;

  @ApiProperty({ description: 'Debtor address' })
  @IsString()
  debtorAddress: string;

  @ApiProperty({ description: 'Debtor IBAN' })
  @IsString()
  debtorIban: string;

  @ApiProperty({ description: 'Debtor BIC' })
  @IsString()
  debtorBic: string;

  @ApiProperty({ description: 'Sequence type' })
  @IsString()
  sequenceType: string;

  @ApiPropertyOptional({ description: 'Is paper' })
  @IsOptional()
  @IsBoolean()
  isPaper?: boolean;

  @ApiPropertyOptional({ description: 'Signed date' })
  @IsOptional()
  @IsDateString()
  signedDate?: string;
}

// ============================================================================
// VIRTUAL IBAN DTOs
// ============================================================================

export class CreateTreezorVirtualIbanDto {
  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: 'Virtual IBAN tag (external reference)' })
  @IsString()
  virtualIbanTag: string;

  @ApiProperty({ description: 'Reference' })
  @IsString()
  reference: string;

  @ApiPropertyOptional({ description: 'Type ID' })
  @IsOptional()
  @IsNumber()
  typeId?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class TreezorApiResponse<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ description: 'Response metadata' })
  meta?: any;

  @ApiPropertyOptional({ description: 'Response links' })
  links?: any;
}

export class TreezorErrorResponse {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Error details' })
  details?: any;
}