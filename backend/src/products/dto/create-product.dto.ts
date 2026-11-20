import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MeasurementUnit } from '../enums/measurement-unit.enum';

class ImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'ferreteria/products/hammer-1' })
  @IsString()
  publicId: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product title (unique)',
    example: 'Martillo de Carpintero Stanley',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({
    description: 'Product price in ARS',
    example: 4999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'Product description',
    example: 'Martillo con mango de fibra de vidrio, cabeza de 16 oz.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Product slug for SEO (auto-generated if omitted)',
    example: 'martillo_carpintero_stanley',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description:
      'Product stock quantity (supports decimals for METER, KG, LITER)',
    example: 25,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({
    description: 'Minimum stock level to trigger replenishment alerts',
    example: 5,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiProperty({
    description: 'Unit of measurement for stock',
    example: 'UNIT',
    enum: MeasurementUnit,
    required: false,
  })
  @IsEnum(MeasurementUnit)
  @IsOptional()
  unit?: MeasurementUnit;

  @ApiProperty({
    description: 'Dynamic technical specifications as key-value pairs (JSONB)',
    example: { potencia_w: 700, diametro_disco_mm: 115, rpm: 11000 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, string | number>;

  @ApiProperty({
    description: 'Product brand',
    example: 'Stanley',
    required: false,
  })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({
    description: 'Product tags for search',
    example: ['martillo', 'carpintería'],
    required: false,
  })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'UUID of the category this product belongs to',
    example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false, type: [ImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];
}
