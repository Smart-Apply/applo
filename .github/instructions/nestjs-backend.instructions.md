---
applyTo: 'apps/api/src/**'
description: 'Recipe + guardrails for adding or changing a NestJS endpoint in the Smart Apply API (DTO + class-validator + @Sanitize, thin controller, ownership-scoped service, Swagger, doc sync).'
---

# Smart Apply API — endpoint recipe

These rules apply when editing anything under `apps/api/src/`. They complement (don't
replace) the global rules in [.github/copilot-instructions.md](../copilot-instructions.md).

## The shape of a feature module

A backend module lives at `apps/api/src/<feature>/` with:

- `<feature>.module.ts` — wires the controller + service (and any providers).
- `<feature>.controller.ts` — thin HTTP layer; no business logic.
- `<feature>.service.ts` — business logic; the **only** place that touches Prisma.
- `dto/` — request/response DTOs, re-exported from `dto/index.ts`.

Register the module in the appropriate parent module — don't add logic to `AppModule`
directly.

## DTOs (validate + sanitize at the boundary)

Every request body/query is a `class-validator` DTO. The global pipe runs with
`whitelist: true, forbidNonWhitelisted: true`, so unknown fields are rejected — keep DTOs
exact. Annotate for Swagger and **sanitize every user-supplied string**:

```ts
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateThingDto {
  @ApiProperty({ description: 'Thing title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @Sanitize()
  title: string;

  @ApiPropertyOptional({ description: 'Optional note', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize()
  note?: string;
}
```

- `@Sanitize()` (from `common/decorators/sanitize.decorator`) is **mandatory** on free-text
  string fields — it's the XSS defense. Numeric/enum/boolean fields don't need it.
- Always set a `@MaxLength` on strings. Use `@IsUrl()`, `@IsEmail()`, `@IsEnum()` etc. where
  the type is constrained.

## Controller (thin, guarded, documented, ownership-scoped at the signature)

```ts
@ApiTags('things')
@Controller('things')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ThingsController {
  constructor(private readonly thingsService: ThingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a thing' })
  @ApiResponse({ status: 201, type: ThingResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateThingDto,
  ): Promise<ThingResponseDto> {
    return this.thingsService.create(userId, dto);
  }
}
```

- Protect the controller (or method) with `@UseGuards(JwtAuthGuard)` from
  `common/guards/jwt-auth.guard` and add `@ApiBearerAuth()`.
- Get the caller via `@CurrentUser('id') userId: string` (from
  `common/decorators/current-user.decorator`) and **pass `userId` into the service** — never
  trust an id from the body/params to identify the owner.
- Document with `@ApiTags`, `@ApiOperation`, `@ApiResponse` so Swagger (`/docs`) stays useful.
- Controllers contain no business logic — they validate, delegate, and shape the response.

## Service (business logic + ownership enforcement)

```ts
@Injectable()
export class ThingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, id: string): Promise<ThingResponseDto> {
    const thing = await this.prisma.thing.findFirst({ where: { id, userId } });
    if (!thing) throw new NotFoundException('Thing not found');
    return toThingResponseDto(thing);
  }
}
```

- **Every** query/mutation is scoped to the authenticated user — include `userId` in the
  Prisma `where` (`findFirst({ where: { id, userId } })`, not `findUnique({ where: { id } })`).
  This is the IDOR defense; a user must never reach another user's rows by guessing an id.
- The service is the only layer that imports `PrismaService`. Return DTOs, not raw Prisma
  rows, so internal columns don't leak.
- For coded errors use the existing `common/exceptions/coded-http.exception` +
  `common/constants/error-codes` helpers rather than bare strings.
- No catch-and-ignore — handle or rethrow.

## Webhooks & rate limiting

- Public webhook routes (QStash, Microsoft Graph) must be added to the CSRF/throttle
  skip-list in [apps/api/src/main.ts](../../apps/api/src/main.ts) and verified by
  signature/`clientState` — don't leave them to silently fail CSRF.
- Don't touch `getSessionIdentifier` in `main.ts` — it must stay a **constant string** (see
  copilot-instructions.md for the `EBADCSRFTOKEN` regression history).

## When you finish

- Update Swagger decorators so `/docs` reflects the change.
- If you changed `schema.prisma`, generate a forward-only migration via the `/prisma-migrate`
  prompt and regenerate the client with `pnpm --filter @smart-apply/api prisma:generate`
  (never a bare `prisma generate`).
- If you added/changed an endpoint or module, update `README.md` + `ARCHITECTURE.md` +
  `.github/copilot-instructions.md` (API Endpoints / Backend Modules sections) in the same
  change set — doc sync is mandatory.
- Lint clean: `pnpm --filter @smart-apply/api lint` → **0 errors, 0 warnings**. No `any`
  (use `unknown` + a guard).
