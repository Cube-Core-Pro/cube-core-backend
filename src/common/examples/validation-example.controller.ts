// path: backend/src/common/examples/validation-example.controller.ts
// purpose: Example controller demonstrating enterprise-grade validation usage
// dependencies: @nestjs/common, class-validator, multer

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  
  
  
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  Length,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Custom decorators and validators
import {
  ValidateBody,
  ValidateQuery,
  ValidateParams,
  ValidateFile,
  ValidateFiles,
  ValidateHeaders,
  ValidateIP,
} from '../decorators/validate-input.decorator';

import { IsUnique,  IsBusinessHours, IsCreditCard } from '../validators/custom.validators';
import { SecurityGuard, SecurityOptions } from '../guards/security.guard';
import { ParseUUIDPipe, ParseBooleanPipe, ParseArrayPipe } from '../pipes/validation.pipe';
import { ParseIntPipe } from '../pipes/parse-int.pipe';

// DTOs
import { PaginationDto, ContactInfoDto, AddressDto } from '../dto/base.dto';

// Example DTOs for this controller
class CreateUserDto {
  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  @IsEmail()
  @IsUnique('user', 'email')
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact?: ContactInfoDto;
}

class UserQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  roles?: string[];
}

class UserParamsDto {
  @IsUUID(4)
  id: string;
}

class PaymentDto {
  @IsNumber()
  @Min(1)
  @Max(999999999)
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsCreditCard()
  cardNumber: string;

  @IsString()
  @Length(3, 4)
  cvv: string;

  @IsString()
  @Length(5, 5)
  expiryDate: string; // MM/YY format
}

class BusinessHoursDto {
  @IsBusinessHours()
  hours: Array<{ start: string; end: string }>;
}

@ApiTags('Validation Examples')
@Controller('examples/validation')
@UseGuards(SecurityGuard)
export class ValidationExampleController {

  @Get()
  @ApiOperation({ summary: 'Get users with advanced query validation' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @ValidateQuery(UserQueryDto) query: UserQueryDto,
    @ValidateIP({ allowPrivate: true }) ip: string,
  ) {
    return {
      success: true,
      data: {
        users: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
        },
        filters: query,
        clientIp: ip,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID with UUID validation' })
  async getUserById(
    @ValidateParams(UserParamsDto) params: UserParamsDto,
  ) {
    return {
      success: true,
      data: {
        id: params.id,
        message: 'User found',
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create user with comprehensive validation' })
  @SecurityOptions({ 
    customRateLimit: { windowMs: 60000, maxRequests: 10 },
    requireHttps: true 
  })
  async createUser(
    @ValidateBody(CreateUserDto) createUserDto: CreateUserDto,
    @ValidateHeaders(['user-agent', 'content-type']) _headers: Record<string, string>,
  ) {
    return {
      success: true,
      data: {
        user: createUserDto,
        message: 'User created successfully',
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user with partial validation' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @ValidateBody(UpdateUserDto) updateUserDto: UpdateUserDto,
  ) {
    return {
      success: true,
      data: {
        id,
        updates: updateUserDto,
        message: 'User updated successfully',
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user with UUID validation' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: {
        id,
        message: 'User deleted successfully',
      },
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload single file with validation' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @ValidateFile({
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    }) file: Express.Multer.File,
  ) {
    return {
      success: true,
      data: {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        message: 'File uploaded successfully',
      },
    };
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files with validation' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @ValidateFiles({
      required: true,
      maxFiles: 5,
      maxSize: 2 * 1024 * 1024, // 2MB per file
      allowedTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
    }) files: Express.Multer.File[],
  ) {
    return {
      success: true,
      data: {
        files: files.map(file => ({
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        })),
        count: files.length,
        message: 'Files uploaded successfully',
      },
    };
  }

  @Post('payment')
  @ApiOperation({ summary: 'Process payment with credit card validation' })
  @SecurityOptions({ 
    requireHttps: true,
    customRateLimit: { windowMs: 300000, maxRequests: 3 }, // 3 attempts per 5 minutes
  })
  async processPayment(
    @ValidateBody(PaymentDto) paymentDto: PaymentDto,
  ) {
    return {
      success: true,
      data: {
        amount: paymentDto.amount,
        currency: paymentDto.currency,
        // Never return sensitive card data
        cardLast4: paymentDto.cardNumber.slice(-4),
        message: 'Payment processed successfully',
      },
    };
  }

  @Post('business-hours')
  @ApiOperation({ summary: 'Set business hours with custom validation' })
  async setBusinessHours(
    @ValidateBody(BusinessHoursDto) businessHoursDto: BusinessHoursDto,
  ) {
    return {
      success: true,
      data: {
        hours: businessHoursDto.hours,
        message: 'Business hours updated successfully',
      },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search with array parameter validation' })
  async search(
    @Query('tags', new ParseArrayPipe({ 
      items: 'string', 
      maxItems: 10, 
      minItems: 1 
    })) tags: string[],
    @Query('minPrice', new ParseIntPipe({ min: 0, optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ max: 999999, optional: true })) maxPrice?: number,
    @Query('inStock', new ParseBooleanPipe(true)) inStock?: boolean,
  ) {
    return {
      success: true,
      data: {
        filters: {
          tags,
          minPrice,
          maxPrice,
          inStock,
        },
        results: [],
        message: 'Search completed successfully',
      },
    };
  }

  @Post('bulk-operation')
  @ApiOperation({ summary: 'Bulk operation with array validation' })
  async bulkOperation(
    @Query('ids', new ParseArrayPipe({ 
      items: 'string', 
      maxItems: 100,
      minItems: 1 
    })) ids: string[],
    @Query('operation') operation: string,
  ) {
    // Validate each ID is a UUID
    const invalidIds = ids.filter(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
    
    if (invalidIds.length > 0) {
      return {
        success: false,
        message: 'Invalid UUIDs provided',
        errors: invalidIds.map(id => ({
          field: 'ids',
          message: `Invalid UUID: ${id}`,
          code: 'INVALID_UUID',
          value: id,
        })),
      };
    }

    return {
      success: true,
      data: {
        operation,
        processedIds: ids,
        count: ids.length,
        message: 'Bulk operation completed successfully',
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @SecurityOptions({ skipRateLimit: true, skipThreatDetection: true })
  async healthCheck() {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };
  }
}