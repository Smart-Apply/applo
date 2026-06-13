---
name: add-api-endpoint
description: Recipe for adding or changing a NestJS endpoint in apps/api. Use when creating a controller route, DTO, or service method in the Smart Apply backend, or when asked to "add an API endpoint", "expose a route", or "add a backend endpoint".
---

# Add a NestJS endpoint (Smart Apply API)

Follow the existing module layout under `apps/api/src/<module>/`: `*.controller.ts`, `*.service.ts`, `*.module.ts`, and `dto/`. A clean reference is `apps/api/src/job-postings/`.

## DTO (`dto/*.dto.ts`)
- Validate every field with `class-validator` (`@IsString`, `@IsOptional`, `@MaxLength`, `@IsEnum`, `@IsInt`, `@Min`/`@Max`, `@IsArray` + `@ArrayMaxSize`, …).
- Document each field with `@ApiProperty` / `@ApiPropertyOptional` from `@nestjs/swagger`.
- **Sanitize every user-supplied string** with `@Sanitize()` from `../../common/decorators/sanitize.decorator` (XSS protection). Use `@SanitizeArray()` / `@SanitizeUrl()` where appropriate.
- Use `@Type(() => …)` from `class-transformer` for nested objects and query coercion.

The global pipe (`apps/api/src/main.ts`) runs `whitelist: true, transform: true` — unknown properties are stripped, so an unvalidated field silently disappears. Declare everything.

## Controller (`*.controller.ts`)
- Class decorators: `@ApiTags('<group>')`, `@Controller('<path>')`, `@UseGuards(JwtAuthGuard)` (from `../common/guards/jwt-auth.guard`), `@ApiBearerAuth()`. Add `@SkipThrottle()` only for high-frequency reads, as the existing controllers do.
- Get the user with `@CurrentUser('id') userId: string` (from `../common/decorators/current-user.decorator`) — never trust an id from the body.
- Annotate responses with `@ApiOperation` + `@ApiResponse` (200/201/400/401/404…).
- Keep controllers thin: delegate to the service and return its result.
- For Premium-gated features, guard with `@RequiresFeature('<feature>')`, like the `mailbox-sync` module.

## Service (`*.service.ts`)
- All DB access through `PrismaService`, parameterised — never string-built SQL.
- Scope every query by `userId` for ownership; throw `NotFoundException` when a row isn't owned by the caller.
- No catch-and-ignore (`try {} catch {}`). Let Nest's exception filter handle thrown errors.

## Wiring + docs
- Register the controller/service/providers in the module; import the module in `app.module.ts` if new.
- **Update docs in the same change:** add the route to the "API Endpoints" section of `.github/copilot-instructions.md`, and update `README.md` + `ARCHITECTURE.md` if you added a module or changed the data model.

## Constraints
- TypeScript strict — no `any` (use `unknown` + a guard).
- 0 ESLint errors and warnings: `pnpm --filter @smart-apply/api lint`.
- Keep examples/placeholders profession-neutral — Smart Apply serves all industries, German-first copy.
