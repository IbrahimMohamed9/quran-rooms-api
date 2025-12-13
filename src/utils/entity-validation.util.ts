import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Validates that an entity exists by ID using the provided service
 * @param id Entity ID to validate
 * @param service Service to use for validation (must have a findOne method)
 * @param entityName Name of the entity for error messages
 * @returns The entity if it exists
 * @throws BadRequestException if the entity doesn't exist
 */
export async function validateEntityExists<T>(
  id: number,
  service: { findOne: (id: number) => Promise<T> },
  entityName: string,
): Promise<T> {
  try {
    const entity = await service.findOne(id);
    if (!entity) {
      throw new NotFoundException(`${entityName} with ID ${id} not found`);
    }
    return entity;
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw new BadRequestException(`${entityName} with ID ${id} not found`);
    }
    throw error;
  }
}
