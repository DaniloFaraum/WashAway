export const DEV_API_PORT = 3003
export const DEV_API_BASE_URL = `http://localhost:${DEV_API_PORT}`

// Back-end real (Express + Prisma + PostgreSQL, ver WashAway/.specs/backend.specs.md).
// É o padrão agora; DEV_API_BASE_URL (json-server) continua disponível como fallback
// manual — defina EXPO_PUBLIC_API_BASE_URL=http://localhost:3003 pra usar o json-server.
export const BACKEND_API_PORT = 4000
export const BACKEND_API_BASE_URL = `http://localhost:${BACKEND_API_PORT}`
