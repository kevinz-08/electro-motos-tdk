import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { JwtUser } from '../strategies/jwt.strategy'

export { JwtUser }

/**
 * Usuario autenticado de la request. En endpoints con `@OptionalAuth()` puede ser
 * undefined (invitado) — tiparlo como `JwtUser | undefined` en esos handlers.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    return ctx.switchToHttp().getRequest().user as JwtUser
  },
)
