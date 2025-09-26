import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnitService } from './unit.service';
import { TreezorService } from './treezor.service';
import type { BankingProvider, BankingProviderId } from '../providers/banking-provider.interface';

interface ResolveOptions {
  provider?: BankingProviderId | string | null;
  currency?: string | null;
  region?: string | null;
}

@Injectable()
export class BankingProviderRegistry {
  private readonly logger = new Logger(BankingProviderRegistry.name);
  private readonly providers: Record<BankingProviderId, BankingProvider>;

  constructor(
    private readonly config: ConfigService,
    private readonly unit: UnitService,
    private readonly treezor: TreezorService,
  ) {
    this.providers = {
      unit: this.unit,
      treezor: this.treezor,
    } as Record<BankingProviderId, BankingProvider>;
  }

  listProviders(): BankingProviderId[] {
    return Object.keys(this.providers) as BankingProviderId[];
  }

  resolveProvider(options: ResolveOptions = {}): BankingProvider {
    const explicit = options.provider?.toLowerCase() as BankingProviderId | undefined;
    if (explicit && this.providers[explicit]) {
      return this.providers[explicit];
    }

    const currency = options.currency?.toUpperCase();
    if (currency) {
      const byCurrency = this.matchByCurrency(currency);
      if (byCurrency) {
        return byCurrency;
      }
    }

    const region = options.region?.toLowerCase();
    if (region) {
      const byRegion = this.matchByRegion(region);
      if (byRegion) {
        return byRegion;
      }
    }

    const defaultProvider = this.config.get<string>('BANKING_DEFAULT_PROVIDER', 'unit') as BankingProviderId;
    const provider = this.providers[defaultProvider];
    if (!provider) {
      throw new BadRequestException(`Unsupported banking provider: ${defaultProvider}`);
    }

    return provider;
  }

  private matchByCurrency(currency: string): BankingProvider | null {
    for (const provider of Object.values(this.providers)) {
      if (provider.supportedCurrencies.includes(currency)) {
        return provider;
      }
    }
    return null;
  }

  private matchByRegion(region: string): BankingProvider | null {
    for (const provider of Object.values(this.providers)) {
      if (provider.regions.some((r) => r.toLowerCase() === region)) {
        return provider;
      }
    }
    return null;
  }
}
