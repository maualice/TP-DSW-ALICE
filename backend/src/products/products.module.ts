import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductImage } from './entities';
import { CategoriesModule } from '../categories/categories.module';
import { CommonModule } from '../common/common.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    CategoriesModule,
    CommonModule,
  ],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
