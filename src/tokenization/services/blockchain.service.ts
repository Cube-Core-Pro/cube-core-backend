// path: backend/src/tokenization/services/blockchain.service.ts
// purpose: Multi-chain blockchain service for Ethereum, BSC, Polygon, Solana, etc.
// dependencies: Ethers.js, Web3.js, Solana Web3, RPC providers, Gas optimization

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface BlockchainNetwork {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  chainId: number;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
  gasPrice?: string;
  gasLimit?: number;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
}

export interface BlockchainMarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
}

export interface TokenBalance {
  address: string;
  balance: string;
  decimals: number;
  symbol: string;
  name: string;
  value?: number;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private solanaConnection: Connection;
  private networks: Map<string, BlockchainNetwork> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.initializeNetworks();
    this.initializeProviders();
  }

  private initializeNetworks() {
    const networks: BlockchainNetwork[] = [
      {
        id: 'ethereum',
        name: 'Ethereum Mainnet',
        symbol: 'ETH',
        rpcUrl: this.config.get('ETHEREUM_RPC_URL') || 'https://mainnet.infura.io/v3/YOUR_KEY',
        chainId: 1,
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: false,
      },
      {
        id: 'ethereum-goerli',
        name: 'Ethereum Goerli',
        symbol: 'ETH',
        rpcUrl: this.config.get('ETHEREUM_GOERLI_RPC_URL') || 'https://goerli.infura.io/v3/YOUR_KEY',
        chainId: 5,
        blockExplorer: 'https://goerli.etherscan.io',
        nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: true,
      },
      {
        id: 'bsc',
        name: 'Binance Smart Chain',
        symbol: 'BNB',
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        chainId: 56,
        blockExplorer: 'https://bscscan.com',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        isTestnet: false,
      },
      {
        id: 'bsc-testnet',
        name: 'BSC Testnet',
        symbol: 'BNB',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        chainId: 97,
        blockExplorer: 'https://testnet.bscscan.com',
        nativeCurrency: { name: 'Test BNB', symbol: 'BNB', decimals: 18 },
        isTestnet: true,
      },
      {
        id: 'polygon',
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: 137,
        blockExplorer: 'https://polygonscan.com',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        isTestnet: false,
      },
      {
        id: 'polygon-mumbai',
        name: 'Polygon Mumbai',
        symbol: 'MATIC',
        rpcUrl: 'https://rpc-mumbai.maticvigil.com',
        chainId: 80001,
        blockExplorer: 'https://mumbai.polygonscan.com',
        nativeCurrency: { name: 'Test MATIC', symbol: 'MATIC', decimals: 18 },
        isTestnet: true,
      },
      {
        id: 'avalanche',
        name: 'Avalanche C-Chain',
        symbol: 'AVAX',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        chainId: 43114,
        blockExplorer: 'https://snowtrace.io',
        nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        isTestnet: false,
      },
      {
        id: 'arbitrum',
        name: 'Arbitrum One',
        symbol: 'ETH',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        chainId: 42161,
        blockExplorer: 'https://arbiscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: false,
      },
      {
        id: 'optimism',
        name: 'Optimism',
        symbol: 'ETH',
        rpcUrl: 'https://mainnet.optimism.io',
        chainId: 10,
        blockExplorer: 'https://optimistic.etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        isTestnet: false,
      },
    ];

    networks.forEach(network => {
      this.networks.set(network.id, network);
    });
  }

  private initializeProviders() {
    try {
      // Initialize EVM providers
      this.networks.forEach((network, networkId) => {
        if (network.rpcUrl) {
          const provider = new ethers.JsonRpcProvider(network.rpcUrl);
          this.providers.set(networkId, provider);
        }
      });

      // Initialize Solana connection
      const solanaRpc = this.config.get('SOLANA_RPC_URL') || clusterApiUrl('mainnet-beta');
      this.solanaConnection = new Connection(solanaRpc, 'confirmed');

      this.logger.log('Blockchain providers initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing blockchain providers', error);
    }
  }

  async getProvider(networkId: string): Promise<ethers.JsonRpcProvider> {
    const provider = this.providers.get(networkId);
    if (!provider) {
      throw new BadRequestException(`Unsupported network: ${networkId}`);
    }
    return provider;
  }

  async getNetwork(networkId: string): Promise<BlockchainNetwork> {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new BadRequestException(`Unknown network: ${networkId}`);
    }
    return network;
  }

  async getSupportedNetworks(): Promise<BlockchainNetwork[]> {
    return Array.from(this.networks.values());
  }

  async getBlockNumber(networkId: string): Promise<number> {
    try {
      if (networkId === 'solana') {
        return await this.solanaConnection.getSlot();
      }

      const provider = await this.getProvider(networkId);
      return await provider.getBlockNumber();
    } catch (error) {
      this.logger.error(`Error getting block number for ${networkId}`, error);
      throw error;
    }
  }

  async getGasPrice(networkId: string): Promise<string> {
    try {
      const cacheKey = `gas-price:${networkId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }

      const provider = await this.getProvider(networkId);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;
      const gasPriceString = gasPrice.toString();

      // Cache for 30 seconds
      await this.redis.setex(cacheKey, 30, gasPriceString);

      return gasPriceString;
    } catch (error) {
      this.logger.error(`Error getting gas price for ${networkId}`, error);
      throw error;
    }
  }

  async estimateGas(
    networkId: string,
    transaction: {
      to: string;
      data?: string;
      value?: string;
      from?: string;
    },
  ): Promise<string> {
    try {
      const provider = await this.getProvider(networkId);
      const gasEstimate = await provider.estimateGas(transaction);
      return gasEstimate.toString();
    } catch (error) {
      this.logger.error(`Error estimating gas for ${networkId}`, error);
      throw error;
    }
  }

  async getBalance(networkId: string, address: string): Promise<string> {
    try {
      if (networkId === 'solana') {
        const publicKey = new PublicKey(address);
        const balance = await this.solanaConnection.getBalance(publicKey);
        return (balance / 1e9).toString(); // Convert lamports to SOL
      }

      const provider = await this.getProvider(networkId);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error(`Error getting balance for ${address} on ${networkId}`, error);
      throw error;
    }
  }

  async getTokenBalance(
    networkId: string,
    tokenAddress: string,
    walletAddress: string,
  ): Promise<TokenBalance> {
    try {
      const cacheKey = `token-balance:${networkId}:${tokenAddress}:${walletAddress}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const provider = await this.getProvider(networkId);
      
      // ERC-20 ABI for balance and metadata
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)',
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol(),
        contract.name(),
      ]);

      const tokenBalance: TokenBalance = {
        address: tokenAddress,
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
        name,
      };

      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, JSON.stringify(tokenBalance));

      return tokenBalance;
    } catch (error) {
      this.logger.error(`Error getting token balance for ${tokenAddress}`, error);
      throw error;
    }
  }

  async getTransaction(networkId: string, txHash: string): Promise<any> {
    try {
      if (networkId === 'solana') {
        return await this.solanaConnection.getTransaction(txHash);
      }

      const provider = await this.getProvider(networkId);
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash).catch(() => null),
      ]);

      return {
        ...tx,
        receipt,
        status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
      };
    } catch (error) {
      this.logger.error(`Error getting transaction ${txHash} on ${networkId}`, error);
      throw error;
    }
  }

  async sendTransaction(
    networkId: string,
    signedTransaction: string,
  ): Promise<TransactionResult> {
    try {
      if (networkId === 'solana') {
        // Handle Solana transaction
        const signature = await this.solanaConnection.sendRawTransaction(
          Buffer.from(signedTransaction, 'hex'),
        );
        return {
          hash: signature,
          status: 'pending',
        };
      }

      const provider = await this.getProvider(networkId);
      const tx = await provider.broadcastTransaction(signedTransaction);

      return {
        hash: tx.hash,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`Error sending transaction on ${networkId}`, error);
      throw error;
    }
  }

  async waitForTransaction(
    networkId: string,
    txHash: string,
    confirmations: number = 1,
  ): Promise<TransactionResult> {
    try {
      if (networkId === 'solana') {
        // Wait for Solana transaction confirmation
        const confirmation = await this.solanaConnection.confirmTransaction(txHash);
        return {
          hash: txHash,
          status: confirmation.value.err ? 'failed' : 'confirmed',
          confirmations: 1,
        };
      }

      const provider = await this.getProvider(networkId);
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      let confirmationCount = confirmations;
      const receiptConfirmations = (receipt as unknown as {
        confirmations?: number | (() => Promise<number>);
      }).confirmations;
      if (typeof receiptConfirmations === 'function') {
        confirmationCount = await receiptConfirmations();
      } else if (typeof receiptConfirmations === 'number') {
        confirmationCount = receiptConfirmations;
      }

      return {
        hash: txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations: confirmationCount,
      };
    } catch (error) {
      this.logger.error(`Error waiting for transaction ${txHash}`, error);
      throw error;
    }
  }

  async getMarketData(): Promise<BlockchainMarketAsset[]> {
    try {
      const cacheKey = 'blockchain:market-data';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as BlockchainMarketAsset[];
      }

      // Mock market data - in production, integrate with CoinGecko, CoinMarketCap, etc.
      const marketData: BlockchainMarketAsset[] = [
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2450.32,
          change24h: 3.45,
          volume24h: 15420000000,
          marketCap: 294500000000,
        },
        {
          id: 'binancecoin',
          symbol: 'BNB',
          name: 'BNB',
          price: 315.67,
          change24h: -1.23,
          volume24h: 1240000000,
          marketCap: 47200000000,
        },
        {
          id: 'matic-network',
          symbol: 'MATIC',
          name: 'Polygon',
          price: 0.87,
          change24h: 5.67,
          volume24h: 420000000,
          marketCap: 8500000000,
        },
        {
          id: 'solana',
          symbol: 'SOL',
          name: 'Solana',
          price: 98.45,
          change24h: 2.34,
          volume24h: 890000000,
          marketCap: 42300000000,
        },
      ];

      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, JSON.stringify(marketData));

      return marketData;
    } catch (error) {
      this.logger.error('Error getting market data', error);
      return [];
    }
  }

  async validateAddress(networkId: string, address: string): Promise<boolean> {
    try {
      if (networkId === 'solana') {
        try {
          new PublicKey(address);
          return true;
        } catch {
          return false;
        }
      }

      // For EVM chains
      return ethers.isAddress(address);
    } catch (error) {
      this.logger.error(`Error validating address ${address}`, error);
      return false;
    }
  }

  async getOptimalGasPrice(networkId: string): Promise<{
    slow: string;
    standard: string;
    fast: string;
  }> {
    try {
      const cacheKey = `optimal-gas:${networkId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const provider = await this.getProvider(networkId);
      const feeData = await provider.getFeeData();
      const currentGasPrice = feeData.gasPrice ?? 0n;

      const slow = (currentGasPrice * 90n) / 100n; // 10% below current
      const standard = currentGasPrice;
      const fast = (currentGasPrice * 120n) / 100n; // 20% above current

      const gasPrices = {
        slow: slow.toString(),
        standard: standard.toString(),
        fast: fast.toString(),
      };

      // Cache for 30 seconds
      await this.redis.setex(cacheKey, 30, JSON.stringify(gasPrices));

      return gasPrices;
    } catch (error) {
      this.logger.error(`Error getting optimal gas price for ${networkId}`, error);
      throw error;
    }
  }

  async getNetworkStats(networkId: string): Promise<{
    blockNumber: number;
    gasPrice: string;
    networkId: number;
    isHealthy: boolean;
  }> {
    try {
      const network = await this.getNetwork(networkId);
      const provider = await this.getProvider(networkId);

      const [blockNumber, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
      ]);

      const gasPrice = feeData.gasPrice ?? 0n;

      return {
        blockNumber,
        gasPrice: gasPrice.toString(),
        networkId: network.chainId,
        isHealthy: true,
      };
    } catch (error) {
      this.logger.error(`Error getting network stats for ${networkId}`, error);
      return {
        blockNumber: 0,
        gasPrice: '0',
        networkId: 0,
        isHealthy: false,
      };
    }
  }

  async getTokenPrice(tokenAddress: string, networkId: string): Promise<number> {
    try {
      const cacheKey = `token-price:${networkId}:${tokenAddress}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return parseFloat(cached);
      }

      // Mock price data - integrate with DEX aggregators like 1inch, 0x, etc.
      const mockPrice = Math.random() * 100;

      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, mockPrice.toString());

      return mockPrice;
    } catch (error) {
      this.logger.error(`Error getting token price for ${tokenAddress}`, error);
      return 0;
    }
  }
}
