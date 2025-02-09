import { SetMetadata, Type } from '@nestjs/common';
import { ENTRY_PROVIDER_WATERMARK } from '@nestjs/common/constants';
import { isFunction, isString } from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { LazyMetadataStorage } from '../schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '../schema-builder/storages/type-metadata.storage';
import {
  addResolverMetadata,
  getClassName,
  getClassOrUndefined,
  getResolverTypeFn,
} from './resolvers.utils';

export type ResolverTypeFn = (of?: void) => Function;

/**
 * @publicApi
 *
 * Extracts the name property set through the @ObjectType() decorator (if specified)
 * @param nameOrType type reference
 */
function getObjectOrInterfaceTypeNameIfExists(
  nameOrType: Function,
): string | undefined {
  const ctor = getClassOrUndefined(nameOrType);
  const objectMetadata =
    TypeMetadataStorage.getObjectTypeMetadataByTarget(ctor);
  if (!objectMetadata) {
    const interfaceMetadata =
      TypeMetadataStorage.getInterfaceMetadataByTarget(ctor);
    if (!interfaceMetadata) {
      return;
    }
    return interfaceMetadata.name;
  }
  return objectMetadata.name;
}

/**
 * @publicApi
 *
 * Interface defining options that can be passed to `@Resolve()` decorator
 */
export interface ResolverOptions {
  /**
   * If `true`, type will not be registered in the schema.
   */
  isAbstract?: boolean;
}

/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(): MethodDecorator & ClassDecorator;
/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(name: string): MethodDecorator & ClassDecorator;
/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(
  options: ResolverOptions,
): MethodDecorator & ClassDecorator;
/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(
  classType: Function,
  options?: ResolverOptions,
): MethodDecorator & ClassDecorator;
/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(
  typeFunc: ResolverTypeFn,
  options?: ResolverOptions,
): MethodDecorator & ClassDecorator;
/**
 * @publicApi
 *
 * Object resolver decorator.
 */
export function Resolver(
  nameOrTypeOrOptions?:
    | string
    | ResolverTypeFn
    | Type<any>
    | Function
    | ResolverOptions,
  options?: ResolverOptions,
): MethodDecorator & ClassDecorator {
  return (
    target: object | Function,
    key?: string | symbol,
    descriptor?: any,
  ) => {
    if (typeof target === 'function') {
      SetMetadata(ENTRY_PROVIDER_WATERMARK, true)(target);
    }

    const [nameOrType, resolverOptions] =
      typeof nameOrTypeOrOptions === 'object' && nameOrTypeOrOptions !== null
        ? [undefined, nameOrTypeOrOptions]
        : [nameOrTypeOrOptions as string | ResolverTypeFn | Type<any>, options];

    let name = nameOrType && getClassName(nameOrType);

    if (isFunction(nameOrType)) {
      const objectName = getObjectOrInterfaceTypeNameIfExists(
        nameOrType as Function,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      objectName && (name = objectName);
    }
    addResolverMetadata(undefined, name, target, key, descriptor);

    if (!isString(nameOrType)) {
      LazyMetadataStorage.store(target as Type<unknown>, () => {
        const typeFn = getResolverTypeFn(nameOrType, target as Function);

        TypeMetadataStorage.addResolverMetadata({
          target: target as Function,
          typeFn: typeFn,
          isAbstract: (resolverOptions && resolverOptions.isAbstract) || false,
        });
      });
    }
  };
}
