export interface CreateCustomerDto {
  type: 'individual'|'business';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email: string;
  phone?: string;
  ssn?: string;
  ein?: string;
  address?: any;
}

export interface CreateAccountDto {
  customerId: string;
  type: string; // e.g., 'checking'
  currency?: string;
}

export interface AchTransferDto {
  fromAccountId: string;
  toRoutingNumber: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
}

export interface WireTransferDto {
  fromAccountId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryRouting: string;
  amount: number;
  description?: string;
}

export interface IssueCardDto {
  customerId: string;
  accountId: string;
  type: 'virtual'|'physical';
}

