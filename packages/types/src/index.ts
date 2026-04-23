/**
 * Barrel del paquete @h2r/types.
 *
 * Este paquete es un contenedor vacío en Fase 0. Se irá llenando conforme se
 * construyan los controllers de NestJS y el ApiClient de apps/web:
 *
 *   - Fase 3: auth, products, orders, admin DTOs.
 *   - Fase 4: payment DTOs (Wompi integrity, webhook events).
 *   - Fase 5: respuestas paginadas compartidas.
 *
 * Convención: los DTOs de REQUEST y RESPONSE de la API viven acá para que
 * tanto el backend (validación con class-validator) como el frontend
 * (ApiClient tipado) importen el mismo contrato.
 */
export {}
