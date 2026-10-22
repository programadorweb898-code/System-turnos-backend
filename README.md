# System Turnos Backend

Backend del sistema multi-tenant de gestión y reserva de turnos.

## Estado

Proyecto en desarrollo.

## Puesta en marcha

Requiere **Node 22.9 o superior** (los scripts usan `--env-file-if-exists`).
`.env` se carga solo, pero es opcional: en despliegue las variables llegan por el
entorno. El proyecto no usa `dotenv`.

```bash
cp .env.example .env   # completar DATABASE_URL y JWT_SECRET
npm run build
npm run migration:run
npm start
```

`JWT_SECRET` se genera con `openssl rand -base64 48`. La app arranca sin él, pero
responde 500 en toda ruta autenticada hasta que exista.

### Desarrollo

```bash
npm run dev         # build + node --watch sobre dist/
npm run dev:build   # en otra terminal: tsc -w
```

Los entrypoints corren sobre `dist/`, no con `tsx`: tsx no emite la metadata de
decoradores que TypeORM necesita para mapear las entidades.

### Endpoints de estado

| Ruta | Uso |
| --- | --- |
| `GET /health` | Liveness. No toca la base: si responde, el proceso está vivo. |
| `GET /health/ready` | Readiness. Consulta la base; 503 si no responde. |

`/health/ready` solo comprueba conectividad, no el esquema. Si las migraciones no
están aplicadas responde 200 y el primer login falla con
`relation "users" does not exist`.

## Alta del primer negocio

El sistema no tiene registro público: sin un negocio y un usuario administrador
no existe ningún login posible. El comando `bootstrap:admin` los crea juntos en
una misma transacción, de modo que un fallo al hashear la contraseña no deja un
negocio huérfano.

```bash
npm run build          # el comando corre sobre dist/
npm run bootstrap:admin
```

Requiere en el entorno las variables `BOOTSTRAP_BUSINESS_NAME`,
`BOOTSTRAP_BUSINESS_SLUG`, `BOOTSTRAP_TIMEZONE`, `BOOTSTRAP_ADMIN_EMAIL` y
`BOOTSTRAP_ADMIN_PASSWORD` (mínimo 12 caracteres). El slug y el email tienen que
estar libres: el comando falla si ya existen, en lugar de sobrescribir datos en
uso. El negocio queda en estado `draft`, pendiente de publicación desde el panel.
