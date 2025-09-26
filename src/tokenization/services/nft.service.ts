// path: backend/src/tokenization/services/nft.service.ts
// purpose: NFT creation, minting, trading, and marketplace service
// dependencies: IPFS, Metadata standards, Royalties, Collections, Marketplace

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BlockchainService } from './blockchain.service';
import { SmartContractService } from './smart-contract.service';
import { IpfsService } from './ipfs.service';

export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date';
    max_value?: number;
  }>;
  background_color?: string;
  youtube_url?: string;
}

export interface NftCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  banner?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  contractAddress?: string;
  blockchain: string;
  totalSupply: number;
  mintedSupply: number;
  floorPrice?: number;
  volume24h?: number;
  owners?: number;
  royalty?: {
    recipient: string;
    percentage: number;
  };
}

export interface NftListing {
  id: string;
  nftId: string;
  seller: string;
  price: string;
  currency: string;
  startTime: Date;
  endTime?: Date;
  isAuction: boolean;
  highestBid?: string;
  highestBidder?: string;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
}

export interface NftOffer {
  id: string;
  nftId: string;
  buyer: string;
  price: string;
  currency: string;
  expiresAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
}

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly blockchainService: BlockchainService,
    private readonly smartContractService: SmartContractService,
    private readonly ipfsService: IpfsService,
  ) {}

  async createCollection(
    tenantId: string,
    userId: string,
    collectionData: {
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
  ): Promise<NftCollection> {
    try {
      // Upload collection metadata to IPFS
      const metadataUri = await this.ipfsService.uploadJson({
        name: collectionData.name,
        description: collectionData.description,
        image: collectionData.image,
        external_link: collectionData.website,
      });

      // Create collection in database
      const collectionMetadata: Prisma.JsonObject = { metadataUri };
      if (collectionData.royalty?.recipient) {
        collectionMetadata.royaltyRecipient = collectionData.royalty.recipient;
      }

      const collection = await this.prisma.nftCollection.create({
        data: {
          tenantId,
          createdBy: userId,
          name: collectionData.name,
          description: collectionData.description,
          image: collectionData.image,
          banner: collectionData.banner,
          website: collectionData.website,
          discord: collectionData.discord,
          twitter: collectionData.twitter,
          blockchain: collectionData.blockchain,
          maxSupply: collectionData.maxSupply || 10000,
          royalty: collectionData.royalty?.percentage || 0,
        },
      });

      const collectionMetadataValue = (collection.metadata ?? {}) as Prisma.JsonObject;
      const rawRoyaltyRecipient = collectionMetadataValue['royaltyRecipient'];
      const royaltyRecipient = typeof rawRoyaltyRecipient === 'string' ? rawRoyaltyRecipient : undefined;
      const royaltyPercentage = collection.royalty ? Number(collection.royalty.toString()) : 0;

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        image: collection.image,
        banner: collection.banner,
        website: collection.website,
        discord: collection.discord,
        twitter: collection.twitter,
        blockchain: collection.blockchain,
        totalSupply: collection.maxSupply,
        mintedSupply: 0,
        royalty: royaltyRecipient
          ? { recipient: royaltyRecipient, percentage: royaltyPercentage }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Error creating NFT collection', error);
      throw error;
    }
  }

  async mintNft(
    tenantId: string,
    userId: string,
    mintData: {
      collectionId?: string;
      name: string;
      description: string;
      image: string;
      attributes: Array<{
        trait_type: string;
        value: string | number;
        display_type?: 'number' | 'date' | 'boost_number' | 'boost_percentage';
      }>;
      recipient: string;
      blockchain: string;
      royalty?: {
        recipient: string;
        percentage: number;
      };
    },
  ) {
    try {
      // Prepare metadata
      const metadata: NftMetadata = {
        name: mintData.name,
        description: mintData.description,
        image: mintData.image,
        attributes: mintData.attributes,
      };

      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadata(metadata);
      const royaltyPercentage = mintData.royalty?.percentage ?? 0;

      const metadataPayload: Prisma.JsonObject = {
        ...metadata,
        metadataUri,
        royaltyRecipient: mintData.royalty?.recipient ?? null,
      };

      // If part of a collection, use collection contract
      let contractAddress: string;
      if (mintData.collectionId) {
        const collection = await this.prisma.nftCollection.findUnique({
          where: { id: mintData.collectionId },
        });

        if (!collection?.contractAddress) {
          throw new BadRequestException('Collection contract not deployed');
        }

        contractAddress = collection.contractAddress;
      } else {
        // Deploy individual NFT contract
        const deployResult = await this.deployNftContract(
          tenantId,
          userId,
          mintData.blockchain,
          {
            name: mintData.name,
            symbol: 'NFT',
            baseURI: metadataUri,
          },
        );
        contractAddress = deployResult.contractAddress;
      }

      // Mint NFT on blockchain
      const mintResult = await this.mintOnBlockchain(
        mintData.blockchain,
        contractAddress,
        mintData.recipient,
        metadataUri,
      );

      // Persist NFT with blockchain data
      const nft = await this.prisma.nft.create({
        data: {
          tenant: { connect: { id: tenantId } },
          collection: mintData.collectionId
            ? { connect: { id: mintData.collectionId } }
            : undefined,
          userId,
          creator: userId,
          name: mintData.name,
          description: mintData.description,
          image: mintData.image,
          attributes: mintData.attributes as unknown as Prisma.JsonArray,
          metadata: metadataPayload,
          blockchain: mintData.blockchain,
          owner: mintData.recipient,
          royalty: royaltyPercentage,
          contractAddress,
          tokenId: mintResult.tokenId,
          transactionHash: mintResult.transactionHash,
          status: 'MINTED',
        },
      });

      return {
        nftId: nft.id,
        contractAddress,
        tokenId: mintResult.tokenId,
        transactionHash: mintResult.transactionHash,
        metadataUri,
        status: 'MINTED',
      };
    } catch (error) {
      this.logger.error('Error minting NFT', error);
      throw error;
    }
  }

  async uploadMetadata(metadata: NftMetadata): Promise<string> {
    try {
      // Validate metadata format
      this.validateMetadata(metadata);

      // Upload to IPFS
      return await this.ipfsService.uploadJson(metadata);
    } catch (error) {
      this.logger.error('Error uploading NFT metadata', error);
      throw error;
    }
  }

  async getUserNfts(
    tenantId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      collectionId?: string;
      blockchain?: string;
      status?: string;
    } = {},
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        collectionId,
        blockchain,
        status,
      } = options;

      const where: any = {
        tenantId,
        owner: userId, // Assuming owner field stores user ID
      };

      if (collectionId) where.collectionId = collectionId;
      if (blockchain) where.blockchain = blockchain;
      if (status) where.status = status;

      const [nfts, total] = await Promise.all([
        this.prisma.nft.findMany({
          where,
          include: {
            collection: {
              select: {
                name: true,
                image: true,
                royalty: true,
              },
            },
            listings: {
              where: { status: 'ACTIVE' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.nft.count({ where }),
      ]);

      // Enrich with market data
      const enrichedNfts = await Promise.all(
        nfts.map(async (nft) => {
          const marketData = await this.getNftMarketData(nft.id);
          return {
            ...nft,
            marketData,
            currentListing: nft.listings[0] || null,
          };
        }),
      );

      return {
        nfts: enrichedNfts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error getting user NFTs', error);
      throw error;
    }
  }

  async getNftDetails(tenantId: string, nftId: string) {
    try {
      const nft = await this.prisma.nft.findFirst({
        where: { id: nftId, tenantId },
        include: {
          collection: true,
          listings: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
          },
          offers: {
            where: { status: 'PENDING' },
            orderBy: { price: 'desc' },
          },
          transfers: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!nft) {
        throw new NotFoundException('NFT not found');
      }

      // Get market data
      const marketData = await this.getNftMarketData(nftId);

      // Get price history
      const priceHistory = await this.getNftPriceHistory(nftId);

      // Get similar NFTs
      const similarNfts = await this.getSimilarNfts(nft);

      return {
        ...nft,
        marketData,
        priceHistory,
        similarNfts,
      };
    } catch (error) {
      this.logger.error('Error getting NFT details', error);
      throw error;
    }
  }

  async listNftForSale(
    tenantId: string,
    userId: string,
    listingData: {
      nftId: string;
      price: string;
      currency: string;
      duration?: number; // days
      isAuction?: boolean;
      reservePrice?: string;
    },
  ): Promise<NftListing> {
    try {
      // Verify NFT ownership
      const nft = await this.prisma.nft.findFirst({
        where: {
          id: listingData.nftId,
          tenantId,
          owner: userId,
        },
      });

      if (!nft) {
        throw new BadRequestException('NFT not found or not owned by user');
      }

      // Check if already listed
      const existingListing = await this.prisma.nftListing.findFirst({
        where: {
          nftId: listingData.nftId,
          status: 'ACTIVE',
        },
      });

      if (existingListing) {
        throw new BadRequestException('NFT is already listed for sale');
      }

      // Create listing
      const endTime = listingData.duration
        ? new Date(Date.now() + listingData.duration * 24 * 60 * 60 * 1000)
        : undefined;

      const listing = await this.prisma.nftListing.create({
        data: {
          tenantId,
          nftId: listingData.nftId,
          seller: userId,
          price: listingData.price,
          currency: listingData.currency,
          startTime: new Date(),
          endTime,
          isAuction: listingData.isAuction ?? false,
          reservePrice: listingData.reservePrice,
          status: 'ACTIVE',
        },
      });

      // Update NFT status
      await this.prisma.nft.update({
        where: { id: listingData.nftId },
        data: { status: 'LISTED' },
      });

      return {
        id: listing.id,
        nftId: listing.nftId,
        seller: listing.seller,
        price: listing.price.toString(),
        currency: listing.currency,
        startTime: listing.createdAt,
        endTime: listing.endTime,
        isAuction: listing.isAuction,
        status: listing.status as any,
      };
    } catch (error) {
      this.logger.error('Error listing NFT for sale', error);
      throw error;
    }
  }

  async makeOffer(
    tenantId: string,
    userId: string,
    offerData: {
      nftId: string;
      price: string;
      currency: string;
      expiresIn?: number; // hours
    },
  ): Promise<NftOffer> {
    try {
      // Verify NFT exists and is not owned by the buyer
      const nft = await this.prisma.nft.findFirst({
        where: {
          id: offerData.nftId,
          tenantId,
          owner: { not: userId },
        },
      });

      if (!nft) {
        throw new BadRequestException('NFT not found or owned by user');
      }

      // Check if user has sufficient balance (mock check)
      const hasBalance = await this.checkUserBalance(
        userId,
        offerData.price,
        offerData.currency,
      );

      if (!hasBalance) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create offer
      const expiresAt = new Date(
        Date.now() + (offerData.expiresIn || 24) * 60 * 60 * 1000,
      );

      const offer = await this.prisma.nftOffer.create({
        data: {
          tenantId,
          nftId: offerData.nftId,
          buyer: userId,
          price: offerData.price,
          currency: offerData.currency,
          expiresAt,
          status: 'PENDING',
        },
      });

      return {
        id: offer.id,
        nftId: offer.nftId,
        buyer: offer.buyer,
        price: offer.price.toString(),
        currency: offer.currency,
        expiresAt: offer.expiresAt,
        status: offer.status as any,
      };
    } catch (error) {
      this.logger.error('Error making NFT offer', error);
      throw error;
    }
  }

  async acceptOffer(
    tenantId: string,
    userId: string,
    offerId: string,
  ) {
    try {
      // Get offer and verify ownership
      const offer = await this.prisma.nftOffer.findFirst({
        where: { id: offerId, tenantId },
        include: {
          nft: true,
        },
      });

      if (!offer) {
        throw new NotFoundException('Offer not found');
      }

      if (offer.nft.owner !== userId) {
        throw new BadRequestException('Not authorized to accept this offer');
      }

      if (offer.status !== 'PENDING') {
        throw new BadRequestException('Offer is no longer active');
      }

      if (offer.expiresAt < new Date()) {
        throw new BadRequestException('Offer has expired');
      }

      // Execute the sale
      const saleResult = await this.executeSale(
        tenantId,
        offer.nftId,
        offer.buyer,
        userId,
        offer.price.toString(),
        offer.currency,
      );

      // Update offer status
      await this.prisma.nftOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      });

      return saleResult;
    } catch (error) {
      this.logger.error('Error accepting NFT offer', error);
      throw error;
    }
  }

  async transferNft(
    tenantId: string,
    userId: string,
    transferData: {
      nftId: string;
      toAddress: string;
      blockchain: string;
    },
  ) {
    try {
      // Verify NFT ownership
      const nft = await this.prisma.nft.findFirst({
        where: {
          id: transferData.nftId,
          tenantId,
          owner: userId,
        },
      });

      if (!nft) {
        throw new BadRequestException('NFT not found or not owned by user');
      }

      // Validate recipient address
      const isValidAddress = await this.blockchainService.validateAddress(
        transferData.blockchain,
        transferData.toAddress,
      );

      if (!isValidAddress) {
        throw new BadRequestException('Invalid recipient address');
      }

      // Execute blockchain transfer
      const transferResult = await this.transferOnBlockchain(
        transferData.blockchain,
        nft.contractAddress,
        nft.tokenId,
        transferData.toAddress,
      );

      // Update NFT ownership
      await this.prisma.nft.update({
        where: { id: transferData.nftId },
        data: { owner: transferData.toAddress },
      });

      // Record transfer
      await this.prisma.nftTransfer.create({
        data: {
          tenantId,
          nftId: transferData.nftId,
          from: userId,
          to: transferData.toAddress,
          fromAddr: userId,
          toAddr: transferData.toAddress,
          txHash: transferResult.transactionHash,
        },
      });

      return {
        success: true,
        transactionHash: transferResult.transactionHash,
        message: 'NFT transferred successfully',
      };
    } catch (error) {
      this.logger.error('Error transferring NFT', error);
      throw error;
    }
  }

  async getMarketplaceNfts(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      collectionId?: string;
      blockchain?: string;
      minPrice?: string;
      maxPrice?: string;
      currency?: string;
      sortBy?: 'price' | 'created' | 'ending';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        collectionId,
        blockchain,
        minPrice,
        maxPrice,
        currency,
        sortBy = 'created',
        sortOrder = 'desc',
      } = options;

      const where: any = {
        tenantId,
        status: 'ACTIVE',
      };

      if (collectionId) {
        where.nft = { collectionId };
      }

      if (blockchain) {
        where.nft = { ...where.nft, blockchain };
      }

      if (minPrice || maxPrice || currency) {
        where.price = {};
        if (minPrice) where.price.gte = minPrice;
        if (maxPrice) where.price.lte = maxPrice;
        if (currency) where.currency = currency;
      }

      let orderBy: any = { createdAt: sortOrder };
      if (sortBy === 'price') {
        orderBy = { price: sortOrder };
      } else if (sortBy === 'ending') {
        orderBy = { endTime: sortOrder };
      }

      const [listings, total] = await Promise.all([
        this.prisma.nftListing.findMany({
          where,
          include: {
            nft: {
              include: {
                collection: {
                  select: { name: true, image: true },
                },
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.nftListing.count({ where }),
      ]);

      return {
        listings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error getting marketplace NFTs', error);
      throw error;
    }
  }

  // Private helper methods
  private validateMetadata(metadata: NftMetadata) {
    if (!metadata.name || !metadata.description || !metadata.image) {
      throw new BadRequestException('Missing required metadata fields');
    }

    if (!Array.isArray(metadata.attributes)) {
      throw new BadRequestException('Attributes must be an array');
    }

    for (const attr of metadata.attributes) {
      if (!attr.trait_type || attr.value === undefined) {
        throw new BadRequestException('Invalid attribute format');
      }
    }
  }

  private async deployNftContract(
    _tenantId: string,
    _userId: string,
    _blockchain: string,
    _contractData: {
      name: string;
      symbol: string;
      baseURI: string;
    },
  ) {
    // This would deploy an ERC-721 contract
    // For now, returning mock data
    return {
      contractAddress: '0x' + Math.random().toString(16).substr(2, 40),
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private async mintOnBlockchain(
    _blockchain: string,
    _contractAddress: string,
    _recipient: string,
    _metadataUri: string,
  ) {
    // This would interact with the smart contract to mint the NFT
    // For now, returning mock data
    return {
      tokenId: Math.floor(Math.random() * 10000).toString(),
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private async transferOnBlockchain(
    _blockchain: string,
    _contractAddress: string,
    _tokenId: string,
    _toAddress: string,
  ) {
    // This would execute the transfer on the blockchain
    return {
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    };
  }

  private async getNftMarketData(_nftId: string) {
    // Mock market data
    return {
      floorPrice: Math.random() * 10,
      lastSalePrice: Math.random() * 15,
      volume24h: Math.random() * 100,
      priceChange24h: (Math.random() - 0.5) * 20,
    };
  }

  private async getNftPriceHistory(_nftId: string) {
    // Mock price history
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      price: Math.random() * 10,
    }));
  }

  private async getSimilarNfts(_nft: any) {
    // Mock similar NFTs
    return [];
  }

  private async checkUserBalance(
    _userId: string,
    _amount: string,
    _currency: string,
  ): Promise<boolean> {
    // Mock balance check
    return true;
  }

  private async executeSale(
    tenantId: string,
    nftId: string,
    buyer: string,
    seller: string,
    price: string,
    currency: string,
  ) {
    // This would execute the actual sale transaction
    // Including payment processing, royalty distribution, etc.
    
    // Update NFT ownership
    await this.prisma.nft.update({
      where: { id: nftId },
      data: { 
        owner: buyer,
        status: 'OWNED',
      },
    });

    // Record sale
    await this.prisma.nftSale.create({
      data: {
        tenantId,
        nftId,
        buyer,
        seller,
        price,
        currency,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
      },
    });

    return {
      success: true,
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
      message: 'Sale completed successfully',
    };
  }
}
