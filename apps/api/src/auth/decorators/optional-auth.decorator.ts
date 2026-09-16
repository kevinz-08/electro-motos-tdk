import { SetMetadata } from '@nestjs/common'

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth'

/**
 * Autenticación opcional (guest checkout, README §22.4).
 *
 * - Sin header Authorization → la request pasa y `@CurrentUser()` es undefined (invitado).
 * - Con header Authorization → se valida el JWT como siempre; un token inválido o vencido
 *   responde 401 (no se degrada silenciosamente a invitado, para que el frontend renueve la sesión).
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true)
