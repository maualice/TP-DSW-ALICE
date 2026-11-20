import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUUID } from 'class-validator';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { Product, ProductImage } from './entities';
import { Category } from '../categories/entities/category.entity';
import { MeasurementUnit } from './enums/measurement-unit.enum';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  /** Nombre de la constraint UNIQUE del SKU en PostgreSQL */
  private static readonly SKU_CONSTRAINT = 'UQ_product_sku';
  /** Máximo de reintentos por colisión de SKU */
  private static readonly MAX_SKU_RETRIES = 3;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { images = [], categoryId, ...productDetails } = createProductDto;

    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
      isActive: true,
    });
    if (!category) {
      throw new NotFoundException(
        `Active category with id "${categoryId}" not found`,
      );
    }

    const unit = productDetails.unit ?? MeasurementUnit.UNIT;
    this.validateStockByUnit(
      unit,
      productDetails.stock,
      productDetails.minStock,
    );

    // Retry loop: cada intento crea una nueva instancia con un SKU nuevo
    for (
      let attempt = 0;
      attempt < ProductsService.MAX_SKU_RETRIES;
      attempt++
    ) {
      try {
        const product = this.productRepository.create({
          ...productDetails,
          category,
          images: images.map((image) =>
            this.productImageRepository.create({
              url: image.url,
              publicId: image.publicId,
            }),
          ),
        });

        await this.productRepository.save(product);
        return { ...product, images };
      } catch (error) {
        if (
          error.code === '23505' &&
          error.constraint === ProductsService.SKU_CONSTRAINT
        ) {
          continue; // Reintentar con una nueva instancia y un nuevo SKU
        }
        this.handleDBExceptions(error);
      }
    }

    throw new InternalServerErrorException(
      'Could not generate a unique SKU after multiple attempts',
    );
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0, categoryId } = paginationDto;

    const where = categoryId ? { category: { id: categoryId } } : {};

    const [products, totalProducts] = await this.productRepository.findAndCount(
      {
        take: limit,
        skip: offset,
        where,
        relations: { images: true, category: true },
        order: { title: 'ASC' },
      },
    );

    return {
      count: totalProducts,
      pages: Math.ceil(totalProducts / limit),
      products: products.map((product) => ({
        ...product,
        images: product.images?.map((img) => img.url),
      })),
    };
  }

  async findOne(term: string) {
    let product: Product | null;

    if (isUUID(term)) {
      product = await this.productRepository.findOne({
        where: { id: term },
        relations: { images: true, category: true },
      });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .leftJoinAndSelect('prod.images', 'prodImages')
        .leftJoinAndSelect('prod.category', 'category')
        .where(
          'UPPER(prod.title) = :title OR prod.slug = :slug OR UPPER(prod.sku) = :sku',
          {
            title: term.toUpperCase(),
            slug: term.toLowerCase(),
            sku: term.toUpperCase(),
          },
        )
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with "${term}" not found`);
    }

    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, categoryId, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({ id, ...toUpdate });

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    // Usar la unit del DTO si se envió, o la existente del producto
    const effectiveUnit = toUpdate.unit ?? product.unit;
    this.validateStockByUnit(effectiveUnit, toUpdate.stock, toUpdate.minStock);

    // Cambiar categoría si se proporciona
    if (categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: categoryId,
        isActive: true,
      });
      if (!category) {
        throw new NotFoundException(
          `Active category with id "${categoryId}" not found`,
        );
      }
      product.category = category;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map((image) =>
          this.productImageRepository.create({
            url: image.url,
            publicId: image.publicId,
          }),
        );
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  /**
   * Valida que el stock y minStock sean coherentes con la unidad de medida.
   * UNIT y PACK solo aceptan valores enteros.
   * METER, KG y LITER aceptan decimales.
   */
  private validateStockByUnit(
    unit: MeasurementUnit,
    stock?: number,
    minStock?: number,
  ): void {
    const integerOnlyUnits = [MeasurementUnit.UNIT, MeasurementUnit.PACK];
    if (!integerOnlyUnits.includes(unit)) return;

    if (stock !== undefined && !Number.isInteger(stock)) {
      throw new BadRequestException(
        `Stock must be an integer for unit "${unit}". Received: ${stock}`,
      );
    }
    if (minStock !== undefined && !Number.isInteger(minStock)) {
      throw new BadRequestException(
        `MinStock must be an integer for unit "${unit}". Received: ${minStock}`,
      );
    }
  }

  private handleDBExceptions(error: any): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
