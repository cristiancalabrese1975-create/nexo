// Errores de dominio con status HTTP explícito. Los módulos tiran estos
// errores; el plugin de Fastify (plugins/errorHandler.ts) los traduce a
// respuesta JSON. Nunca se expone el mensaje de un error no controlado.
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class NotFoundError extends AppError {
  constructor(entidad: string, id?: string) {
    super(id ? `${entidad} '${id}' no encontrado.` : `${entidad} no encontrado.`, 404, 'not_found')
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly detalles?: unknown) {
    super(message, 400, 'validation_error')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciales inválidas.') {
    super(message, 401, 'unauthorized')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tenés permiso para esta acción.') {
    super(message, 403, 'forbidden')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'conflict')
  }
}
