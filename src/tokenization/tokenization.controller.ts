// path: backend/src/tokenization/tokenization.controller.ts
// purpose: Enterprise Tokenization & Blockchain REST API controller
// dependencies: NestJS, Swagger, Guards, DTOs, Multi-chain support

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlag } from '../auth/decorators/feature-flag.decorator';
import { TokenizationService } from './tokenization.service';
import { BlockchainService } from './services/blockchain.service';
import { SmartContractService } from './services/smart-contract.service';
import { NftService } from './services/nft.service';
import { WalletService } from './services/wallet.service';
import { TokenService } from './services/token.service';
import { DefiService } from './services/defi.service';
import { StakingService } from './services/staking.service';
import { CrossChainService } from './services/cross-chain.service';
import { Fortune500TokenizationConfig } from '../types/fortune500-types';

@ApiTags('Enterprise Tokenization & Blockchain')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@FeatureFlag('FEATURE_TOKENIZATION')
@Controller('api/tokenization')
export class TokenizationController {
  constructor(
    private readonly tokenizationService: TokenizationService,
    private readonly blockchainService: BlockchainService,
    private readonly smartContractService: SmartContractService,
    private readonly nftService: NftService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly defiService: DefiService,
    private readonly stakingService: StakingService,
    private readonly crossChainService: CrossChainService,
  ) {}

  // Dashboard & Overview
  @Get('dashboard')
  @ApiOperation({ summary: 'Get tokenization dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Request() req: any) {
    return this.tokenizationService.getDashboard(req.user.tenantId, req.user.id);
  }

  // Blockchain Networks
  @Get('networks')
  @ApiOperation({ summary: 'Get supported blockchain networks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Networks retrieved successfully' })
  async getSupportedNetworks() {
    return this.blockchainService.getSupportedNetworks();
  }

  @Get('networks/:networkId/stats')
  @ApiOperation({ summary: 'Get network statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Network stats retrieved successfully' })
  async getNetworkStats(@Param('networkId') networkId: string) {
    return this.blockchainService.getNetworkStats(networkId);
  }

  @Get('networks/:networkId/gas-price')
  @ApiOperation({ summary: 'Get optimal gas prices for network' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gas prices retrieved successfully' })
  async getOptimalGasPrice(@Param('networkId') networkId: string) {
    return this.blockchainService.getOptimalGasPrice(networkId);
  }

  // Wallets Management
  @Get('wallets')
  @ApiOperation({ summary: 'Get user wallets' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Wallets retrieved successfully' })
  async getUserWallets(@Request() req: any) {
    return this.walletService.getUserWallets(req.user.tenantId, req.user.id);
  }

  @Post('wallets')
  @ApiOperation({ summary: 'Create new wallet' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Wallet created successfully' })
  async createWallet(
    @Request() req: any,
    @Body() walletData: {
      name: string;
      blockchain: string;
      type: 'HOT' | 'COLD' | 'MULTISIG';
      description?: string;
    },
  ) {
    return this.walletService.createWallet(req.user.tenantId, req.user.id, walletData);
  }

  @Post('wallets/import')
  @ApiOperation({ summary: 'Import existing wallet' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Wallet imported successfully' })
  async importWallet(
    @Request() req: any,
    @Body() importData: {
      name: string;
      blockchain: string;
      address?: string;
      privateKey?: string;
      mnemonic?: string;
      type: 'ADDRESS_ONLY' | 'PRIVATE_KEY' | 'MNEMONIC';
    },
  ) {
    return this.walletService.importWallet(req.user.tenantId, req.user.id, importData);
  }

  @Get('wallets/:walletId/balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Balance retrieved successfully' })
  async getWalletBalance(
    @Request() req: any,
    @Param('walletId', ParseUUIDPipe) walletId: string,
  ) {
    return this.walletService.getWalletBalance(req.user.tenantId, req.user.id, walletId);
  }

  @Get('wallets/:walletId/transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transactions retrieved successfully' })
  async getWalletTransactions(
    @Request() req: any,
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    };
    return this.walletService.getWalletTransactions(req.user.tenantId, req.user.id, walletId, options);
  }

  // Token Management
  @Get('tokens')
  @ApiOperation({ summary: 'Get user tokens' })
  @ApiQuery({ name: 'blockchain', required: false, description: 'Filter by blockchain' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tokens retrieved successfully' })
  async getUserTokens(
    @Request() req: any,
    @Query('blockchain') blockchain?: string,
    @Query('status') status?: string,
  ) {
    return this.tokenService.getUserTokens(req.user.tenantId, req.user.id, { blockchain, status });
  }

  @Post('tokens/create')
  @ApiOperation({ summary: 'Create new token' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Token creation initiated' })
  async createToken(
    @Request() req: any,
    @Body() tokenData: {
      name: string;
      symbol: string;
      totalSupply: string;
      decimals: number;
      description?: string;
      logoUrl?: string;
      website?: string;
      whitepaper?: string;
      tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'BEP20' | 'SPL';
      blockchain: string;
      features: {
        mintable?: boolean;
        burnable?: boolean;
        pausable?: boolean;
        upgradeable?: boolean;
        governance?: boolean;
        staking?: boolean;
      };
      distribution: {
        publicSale: number;
        privateSale: number;
        team: number;
        advisors: number;
        treasury: number;
        liquidity: number;
        marketing: number;
        development: number;
      };
      vestingSchedule?: {
        cliff: number;
        duration: number;
        tge: number;
      };
    },
  ) {
    return this.tokenizationService.createToken(req.user.tenantId, req.user.id, tokenData);
  }

  @Get('tokens/:tokenId')
  @ApiOperation({ summary: 'Get token details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token details retrieved successfully' })
  async getTokenDetails(
    @Request() req: any,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.tokenService.getTokenDetails(req.user.tenantId, tokenId);
  }

  @Get('tokens/:tokenId/tokenomics')
  @ApiOperation({ summary: 'Get token economics analysis' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tokenomics retrieved successfully' })
  async getTokenomics(
    @Request() req: any,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.tokenizationService.getTokenomics(req.user.tenantId, tokenId);
  }

  @Post('tokens/:tokenId/mint')
  @ApiOperation({ summary: 'Mint additional tokens' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Minting initiated' })
  async mintTokens(
    @Request() req: any,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @Body() mintData: {
      amount: string;
      recipient: string;
      reason?: string;
    },
  ) {
    return this.tokenService.mintTokens(req.user.tenantId, req.user.id, tokenId, mintData);
  }

  @Post('tokens/:tokenId/burn')
  @ApiOperation({ summary: 'Burn tokens' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Burning initiated' })
  async burnTokens(
    @Request() req: any,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @Body() burnData: {
      amount: string;
      reason?: string;
    },
  ) {
    return this.tokenService.burnTokens(req.user.tenantId, req.user.id, tokenId, burnData);
  }

  // NFT Management
  @Get('nfts')
  @ApiOperation({ summary: 'Get user NFTs' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'collectionId', required: false, description: 'Filter by collection' })
  @ApiQuery({ name: 'blockchain', required: false, description: 'Filter by blockchain' })
  @ApiResponse({ status: HttpStatus.OK, description: 'NFTs retrieved successfully' })
  async getUserNfts(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('collectionId') collectionId?: string,
    @Query('blockchain') blockchain?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      collectionId,
      blockchain,
    };
    return this.nftService.getUserNfts(req.user.tenantId, req.user.id, options);
  }

  @Post('nfts/collections')
  @ApiOperation({ summary: 'Create NFT collection' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Collection created successfully' })
  async createNftCollection(
    @Request() req: any,
    @Body() collectionData: {
      name: string;
      description: string;
      image: string;
      banner?: string;
      website?: string;
      discord?: string;
      twitter?: string;
      blockchain: string;
      maxSupply?: number;
      royalty?: {
        recipient: string;
        percentage: number;
      };
    },
  ) {
    return this.nftService.createCollection(req.user.tenantId, req.user.id, collectionData);
  }

  @Post('nfts/mint')
  @ApiOperation({ summary: 'Mint new NFT' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiResponse({ status: HttpStatus.CREATED, description: 'NFT minting initiated' })
  async mintNft(
    @Request() req: any,
    @Body() nftData: {
      collectionId?: string;
      name: string;
      description: string;
      attributes: string; // JSON string
      recipient: string;
      blockchain: string;
      royalty?: string; // JSON string
    },
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const attributes = JSON.parse(nftData.attributes);
    const royalty = nftData.royalty ? JSON.parse(nftData.royalty) : undefined;
    
    const mintRequest = {
      ...nftData,
      attributes,
      royalty,
      image: image?.filename || nftData.name, // Use uploaded file or fallback
    };

    return this.nftService.mintNft(req.user.tenantId, req.user.id, mintRequest);
  }

  @Get('nfts/:nftId')
  @ApiOperation({ summary: 'Get NFT details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'NFT details retrieved successfully' })
  async getNftDetails(
    @Request() req: any,
    @Param('nftId', ParseUUIDPipe) nftId: string,
  ) {
    return this.nftService.getNftDetails(req.user.tenantId, nftId);
  }

  @Post('nfts/:nftId/list')
  @ApiOperation({ summary: 'List NFT for sale' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'NFT listed successfully' })
  async listNftForSale(
    @Request() req: any,
    @Param('nftId', ParseUUIDPipe) nftId: string,
    @Body() listingData: {
      price: string;
      currency: string;
      duration?: number;
      isAuction?: boolean;
      reservePrice?: string;
    },
  ) {
    return this.nftService.listNftForSale(req.user.tenantId, req.user.id, {
      nftId,
      ...listingData,
    });
  }

  @Post('nfts/:nftId/offer')
  @ApiOperation({ summary: 'Make offer on NFT' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Offer created successfully' })
  async makeNftOffer(
    @Request() req: any,
    @Param('nftId', ParseUUIDPipe) nftId: string,
    @Body() offerData: {
      price: string;
      currency: string;
      expiresIn?: number;
    },
  ) {
    return this.nftService.makeOffer(req.user.tenantId, req.user.id, {
      nftId,
      ...offerData,
    });
  }

  @Post('nfts/offers/:offerId/accept')
  @ApiOperation({ summary: 'Accept NFT offer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Offer accepted successfully' })
  async acceptNftOffer(
    @Request() req: any,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.nftService.acceptOffer(req.user.tenantId, req.user.id, offerId);
  }

  @Post('nfts/:nftId/transfer')
  @ApiOperation({ summary: 'Transfer NFT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'NFT transfer initiated' })
  async transferNft(
    @Request() req: any,
    @Param('nftId', ParseUUIDPipe) nftId: string,
    @Body() transferData: {
      toAddress: string;
      blockchain: string;
    },
  ) {
    return this.nftService.transferNft(req.user.tenantId, req.user.id, {
      nftId,
      ...transferData,
    });
  }

  // Marketplace
  @Get('marketplace/nfts')
  @ApiOperation({ summary: 'Get marketplace NFTs' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'collectionId', required: false, description: 'Filter by collection' })
  @ApiQuery({ name: 'blockchain', required: false, description: 'Filter by blockchain' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency filter' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Marketplace NFTs retrieved successfully' })
  async getMarketplaceNfts(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('collectionId') collectionId?: string,
    @Query('blockchain') blockchain?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('currency') currency?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      collectionId,
      blockchain,
      minPrice,
      maxPrice,
      currency,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };
    return this.nftService.getMarketplaceNfts(req.user.tenantId, options);
  }

  // Staking
  @Get('staking/pools')
  @ApiOperation({ summary: 'Get staking pools' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Staking pools retrieved successfully' })
  async getStakingPools(@Request() req: any) {
    return this.stakingService.getStakingPools(req.user.tenantId);
  }

  @Post('staking/stake')
  @ApiOperation({ summary: 'Stake tokens' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Staking initiated' })
  async stakeTokens(
    @Request() req: any,
    @Body() stakeData: {
      tokenId: string;
      amount: string;
      duration: number;
      stakingPoolId?: string;
    },
  ) {
    return this.tokenizationService.stakeTokens(req.user.tenantId, req.user.id, stakeData);
  }

  @Get('staking/positions')
  @ApiOperation({ summary: 'Get user staking positions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Staking positions retrieved successfully' })
  async getStakingPositions(@Request() req: any) {
    return this.stakingService.getActivePositions(req.user.tenantId, req.user.id);
  }

  @Post('staking/positions/:positionId/unstake')
  @ApiOperation({ summary: 'Unstake tokens' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unstaking initiated' })
  async unstakeTokens(
    @Request() req: any,
    @Param('positionId', ParseUUIDPipe) positionId: string,
  ) {
    return this.stakingService.unstakeTokens(req.user.tenantId, req.user.id, positionId);
  }

  @Post('staking/positions/:positionId/claim-rewards')
  @ApiOperation({ summary: 'Claim staking rewards' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rewards claimed successfully' })
  async claimStakingRewards(
    @Request() req: any,
    @Param('positionId', ParseUUIDPipe) positionId: string,
  ) {
    return this.stakingService.claimRewards(req.user.tenantId, req.user.id, positionId);
  }

  // DeFi
  @Get('defi/protocols')
  @ApiOperation({ summary: 'Get supported DeFi protocols' })
  @ApiResponse({ status: HttpStatus.OK, description: 'DeFi protocols retrieved successfully' })
  async getDefiProtocols(@Request() req: any) {
    return this.defiService.getSupportedProtocols(req.user.tenantId);
  }

  @Get('defi/positions')
  @ApiOperation({ summary: 'Get user DeFi positions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'DeFi positions retrieved successfully' })
  async getDefiPositions(@Request() req: any) {
    return this.defiService.getUserPositions(req.user.tenantId, req.user.id);
  }

  @Post('defi/liquidity/add')
  @ApiOperation({ summary: 'Add liquidity to pool' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Liquidity addition initiated' })
  async addLiquidity(
    @Request() req: any,
    @Body() liquidityData: {
      protocol: string;
      poolId: string;
      tokenA: string;
      tokenB: string;
      amountA: string;
      amountB: string;
      slippage: number;
    },
  ) {
    return this.defiService.addLiquidity(req.user.tenantId, req.user.id, liquidityData);
  }

  @Post('defi/swap')
  @ApiOperation({ summary: 'Swap tokens' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Token swap initiated' })
  async swapTokens(
    @Request() req: any,
    @Body() swapData: {
      protocol: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      minAmountOut: string;
      slippage: number;
    },
  ) {
    return this.defiService.swapTokens(req.user.tenantId, req.user.id, swapData);
  }

  // Cross-Chain
  @Get('cross-chain/bridges')
  @ApiOperation({ summary: 'Get supported bridges' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bridges retrieved successfully' })
  async getSupportedBridges() {
    return this.crossChainService.getSupportedBridges();
  }

  @Post('cross-chain/bridge')
  @ApiOperation({ summary: 'Bridge tokens across chains' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bridge transaction initiated' })
  async bridgeTokens(
    @Request() req: any,
    @Body() bridgeData: {
      tokenId: string;
      amount: string;
      fromChain: string;
      toChain: string;
      recipientAddress?: string;
    },
  ) {
    return this.tokenizationService.bridgeTokens(req.user.tenantId, req.user.id, bridgeData);
  }

  @Get('cross-chain/transactions')
  @ApiOperation({ summary: 'Get cross-chain transaction history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cross-chain transactions retrieved successfully' })
  async getCrossChainTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    };
    return this.crossChainService.getTransactionHistory(req.user.tenantId, req.user.id, options);
  }

  // Smart Contracts
  @Get('contracts/templates')
  @ApiOperation({ summary: 'Get smart contract templates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contract templates retrieved successfully' })
  async getContractTemplates() {
    return this.smartContractService.getContractTemplates();
  }

  @Post('contracts/deploy')
  @ApiOperation({ summary: 'Deploy smart contract' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Contract deployment initiated' })
  async deployContract(
    @Request() req: any,
    @Body() deployData: {
      templateId: string;
      networkId: string;
      constructorArgs: any[];
      gasPrice?: string;
      gasLimit?: string;
    },
  ) {
    // This would require proper private key management
    // For now, using a mock private key
    const mockPrivateKey = '0x' + '1'.repeat(64);
    
    return this.smartContractService.deployContract(
      req.user.tenantId,
      req.user.id,
      deployData.networkId,
      deployData.templateId,
      deployData.constructorArgs,
      mockPrivateKey,
      {
        gasPrice: deployData.gasPrice,
        gasLimit: deployData.gasLimit,
      },
    );
  }

  @Post('contracts/:contractAddress/call')
  @ApiOperation({ summary: 'Call smart contract method' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contract method called successfully' })
  async callContractMethod(
    @Request() req: any,
    @Param('contractAddress') contractAddress: string,
    @Body() callData: {
      networkId: string;
      methodName: string;
      args: any[];
      isWrite?: boolean;
      gasPrice?: string;
      gasLimit?: string;
      value?: string;
    },
  ) {
    const signerPrivateKey = callData.isWrite ? '0x' + '1'.repeat(64) : undefined;
    
    return this.smartContractService.callContractMethod(
      callData.networkId,
      contractAddress,
      callData.methodName,
      callData.args,
      signerPrivateKey,
      {
        gasPrice: callData.gasPrice,
        gasLimit: callData.gasLimit,
        value: callData.value,
      },
    );
  }

  @Get('contracts/:contractAddress/info')
  @ApiOperation({ summary: 'Get smart contract information' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contract info retrieved successfully' })
  async getContractInfo(
    @Param('contractAddress') contractAddress: string,
    @Query('networkId') networkId: string,
  ) {
    return this.smartContractService.getContractInfo(networkId, contractAddress);
  }

  // Transaction History
  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, description: 'Transaction type filter' })
  @ApiQuery({ name: 'blockchain', required: false, description: 'Blockchain filter' })
  @ApiQuery({ name: 'status', required: false, description: 'Status filter' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Date from filter' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Date to filter' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction history retrieved successfully' })
  async getTransactionHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('blockchain') blockchain?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      type,
      blockchain,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };
    return this.tokenizationService.getTransactionHistory(req.user.tenantId, req.user.id, options);
  }

  @Get('transactions/:txHash')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction details retrieved successfully' })
  async getTransactionDetails(
    @Param('txHash') txHash: string,
    @Query('networkId') networkId: string,
  ) {
    return this.blockchainService.getTransaction(networkId, txHash);
  }

  // Market Data
  @Get('market-data')
  @ApiOperation({ summary: 'Get cryptocurrency market data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Market data retrieved successfully' })
  async getMarketData() {
    return this.tokenizationService.getMarketData();
  }

  @Get('tokens/:tokenAddress/price')
  @ApiOperation({ summary: 'Get token price' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token price retrieved successfully' })
  async getTokenPrice(
    @Param('tokenAddress') tokenAddress: string,
    @Query('networkId') networkId: string,
  ) {
    const price = await this.blockchainService.getTokenPrice(tokenAddress, networkId);
    return { price, currency: 'USD' };
  }

  // Analytics & Reports
  @Get('analytics/portfolio')
  @ApiOperation({ summary: 'Get portfolio analytics' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (7d, 30d, 90d, 1y)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Portfolio analytics retrieved successfully' })
  async getPortfolioAnalytics(
    @Request() req: any,
    @Query('period') period: string = '30d',
  ) {
    return this.tokenService.getPortfolioAnalytics(req.user.tenantId, req.user.id, period);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Request() req: any,
    @Query('period') period: string = '30d',
  ) {
    return this.tokenService.getPerformanceMetrics(req.user.tenantId, req.user.id, period);
  }

  // Settings & Preferences
  @Get('settings')
  @ApiOperation({ summary: 'Get tokenization settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Settings retrieved successfully' })
  async getSettings(@Request() req: any) {
    return this.tokenService.getSettings(req.user.tenantId, req.user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update tokenization settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated successfully' })
  async updateSettings(
    @Request() req: any,
    @Body() settings: {
      defaultNetwork?: string;
      gasPreference?: 'slow' | 'standard' | 'fast';
      slippageTolerance?: number;
      notifications?: {
        transactions: boolean;
        priceAlerts: boolean;
        stakingRewards: boolean;
        nftActivity: boolean;
      };
      privacy?: {
        hideBalances: boolean;
        hideTransactions: boolean;
      };
    },
  ) {
    return this.tokenService.updateSettings(req.user.tenantId, req.user.id, settings);
  }
}
