import * as crypto from 'crypto';

import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ProductImage } from './product-image.entity';
import { Category } from '../../categories/entities/category.entity';
import { MeasurementUnit } from '../enums/measurement-unit.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ColumnNumericTransformer } from '../../common/transformers';

@Entity('products')
@Unique('UQ_product_sku', ['sku'])
export class Product {
  @ApiProperty({
    example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
    description: 'Product ID',
    uniqueItems: true,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'FER-260817-A3F9B2',
    description: 'Auto-generated SKU code (Stock Keeping Unit)',
    uniqueItems: true,
  })
  @Column('text')
  sku: string;

  @ApiProperty({
    example: 'Martillo de Carpintero Stanley',
    description: 'Product Title',
    uniqueItems: true,
  })
  @Column('text', { unique: true })
  title: string;

  @ApiProperty({
    example: 4999.99,
    description: 'Product price in ARS',
  })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  price: number;

  @ApiProperty({
    example: 'Martillo con mango de fibra de vidrio, cabeza de 16 oz.',
    description: 'Product description',
    default: null,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    example: 'martillo_carpintero_stanley',
    description: 'Product SLUG - for SEO',
    uniqueItems: true,
  })
  @Column('text', { unique: true })
  slug: string;

  @ApiProperty({
    example: 25,
    description: 'Product stock (supports decimals for METER, KG, LITER units)',
    default: 0,
  })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  stock: number;

  @ApiProperty({
    example: 5,
    description: 'Minimum stock level to trigger replenishment alerts',
    default: 5,
  })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 3,
    default: 5,
    name: 'min_stock',
    transformer: new ColumnNumericTransformer(),
  })
  minStock: number;

  @ApiProperty({
    example: 'UNIT',
    description: 'Unit of measurement for stock',
    enum: MeasurementUnit,
    default: MeasurementUnit.UNIT,
  })
  @Column({
    type: 'enum',
    enum: MeasurementUnit,
    default: MeasurementUnit.UNIT,
  })
  unit: MeasurementUnit;

  @ApiProperty({
    example: { potencia_w: 700, diametro_disco_mm: 115, rpm: 11000 },
    description: 'Dynamic technical specifications (JSONB key-value)',
    nullable: true,
  })
  @Column('jsonb', { nullable: true, default: {} })
  specifications: Record<string, string | number>;

  @ApiProperty({
    example: 'Stanley',
    description: 'Product brand',
    nullable: true,
  })
  @Column('text', { nullable: true })
  brand: string;

  @ApiProperty({
    example: ['martillo', 'carpintería', 'stanley'],
    description: 'Product tags for search',
  })
  @Column('text', { array: true, default: [] })
  tags: string[];

  @ApiProperty()
  @OneToMany(() => ProductImage, (productImage) => productImage.product, {
    cascade: true,
    eager: true,
  })
  images?: ProductImage[];

  @ApiProperty({ type: () => Category, description: 'Product category' })
  @ManyToOne(() => Category, (category) => category.products, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  // TODO: Relación ManyToOne con User a habilitar al implementar AuthModule

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateSku() {
    if (!this.sku) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      this.sku = `FER-${yy}${mm}${dd}-${suffix}`;
    }
  }

  private normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replaceAll(' ', '_')
      .replaceAll("'", '');
  }

  @BeforeInsert()
  checkSlugInsert() {
    if (!this.slug) {
      this.slug = this.title;
    }
    this.slug = this.normalizeSlug(this.slug);
  }

  @BeforeUpdate()
  checkSlugUpdate() {
    if (this.slug) {
      this.slug = this.normalizeSlug(this.slug);
    }
  }
}
