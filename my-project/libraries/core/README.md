# @hed-hog/core

> **License**: MIT (Open Source) — Core is the only Open Source module of the HedHog Framework; the other modules are Enterprise and require a commercial license. See [LICENSE.md](./LICENSE.md).

Learn more about the HedHog Framework at **[hedhog.com](https://hedhog.com)**.

## 1. Module overview

The `@hed-hog/core` module is the core of the HedHog monorepo, responsible for providing essential core functionality for the system, including authentication, artificial intelligence, dashboard, system information, and management of users, roles, permissions and UI components. It integrates several submodules covering everything from security and authentication to management of customizable dashboards and AI agents.

## 2. Scope and responsibilities

- Authentication and authorization management, including MFA, WebAuthn, password recovery, sessions, and social login via OAuth (Google, Facebook, GitHub, Microsoft, Microsoft Entra ID, Apple, LinkedIn) with a multi-app callback hub.
- Artificial intelligence services for chat and AI agents with support for OpenAI and Gemini.
- Management of dashboards, components, roles, and associated users.
- Operating system, hardware, database, and installed-module information.
- Data validation and handling via DTOs and integration with the Prisma ORM.
- Internationalization and pagination support.

## 3. Endpoints

### AI Module (`/ai`)

| Method | Path                    | Auth         | Description                                        | Parameters / Query / Body                                                                                   | Response                                                                                      | Common Errors                          |
|--------|-------------------------|--------------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------------------------|
| POST   | `/ai/chat`              | Authenticated  | Chats with AI, optionally sending a file.     | Body: `ChatDTO` (message: string, provider?: 'openai'|'gemini', model?: string, systemPrompt?: string, file_id?: number)<br>File: optional | `{ provider: string, model: string, content: string }`                                       | 400: API key not configured      |
| POST   | `/ai/agent`             | Authenticated  | Creates an AI agent.                                | Body: `CreateAgentDTO` (slug: string, provider?: 'openai'|'gemini', model?: string, instructions?: string)   | Created or existing agent object                                                           | 400: Slug already exists                 |
| GET    | `/ai/agent`             | Authenticated  | Lists AI agents with pagination.                   | Query: pagination (page?: number, pageSize?: number, search?: string)                                         | Paginated list of agents                                                              | -                                   |
| GET    | `/ai/agent/id/:agentId` | Authenticated  | Gets an AI agent by ID.                           | Path param: `agentId` (int)                                                                                  | Agent object                                                                              | 404: Agent not found          |
| GET    | `/ai/agent/:slug`       | Authenticated  | Gets an AI agent by slug.                         | Path param: `slug` (string)                                                                                  | Agent object                                                                              | 404: Agent not found          |
| PATCH  | `/ai/agent/:agentId`    | Authenticated  | Updates an AI agent.                               | Path param: `agentId` (int)<br>Body: `UpdateAgentDTO` (slug?: string, provider?: 'openai'|'gemini', model?: string, instructions?: string) | Updated agent object                                                                   | 404: Agent not found<br>400: Duplicate slug |
| DELETE | `/ai/agent`             | Authenticated  | Bulk-deletes AI agents.                        | Body: `DeleteDTO` (ids: number[])                                                                             | `{ count: number }`                                                                         | 404: One or more agents not found |
| POST   | `/ai/agent/:slug/chat`  | Authenticated  | Chats with a specific AI agent, with an optional file. | Path param: `slug` (string)<br>Body: `ChatAgentDTO` (message: string, file_id?: number)<br>File: optional      | `{ slug: string, provider: string, model: string, content: string }`                        | 404: Agent not found          |

### Auth Module (`/auth`)

| Method | Path                                | Auth         | Description                                        | Parameters / Body                                                                                  | Response                                                                                      | Common Errors                          |
|--------|-------------------------------------|--------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------------------------|
| GET    | `/auth/verify`                      | Authenticated  | Verifies the authenticated user.                     | -                                                                                                | Authenticated user data                                                                | -                                   |
| GET    | `/auth/roles`                      | Public      | Returns the user's roles (if authenticated).       | -                                                                                                | `{ roles: string[] }`                                                                        | -                                   |
| POST   | `/auth/refresh`                    | Public      | Refreshes the access token using the refresh token.   | Body: `{ refreshToken?: string }`<br>Cookies: `rt` optional                                      | `{ accessToken: string, refreshToken?: string }`                                            | 400: Refresh token not provided    |
| POST   | `/auth/login`                      | Public      | Login with email and password.                           | Body: `LoginDTO` (email: string, password: string, refreshToken?: boolean)                       | Access and refresh tokens, or MFA required                                                | 400: Access denied                   |
| POST   | `/auth/login-email-verification`  | Public      | Login via email verification and code.         | Body: `LoginEmailVerificationDTO` (token: string, code: string)                                 | Access and refresh tokens                                                                  | 400: Invalid code or challenge not found |
| POST   | `/auth/login-email-verification-resend` | Public | Resends the email verification code.          | Body: `LoginEmailVerificationResendDTO` (token: string)                                         | New token for verification                                                                 | 400: Invalid or expired token     |
| POST   | `/auth/signup`                    | Public      | Sign-up with email and password.                        | Body: `CreateWithEmailAndPasswordDTO`                                                           | User created                                                                             | -                                   |
| POST   | `/auth/login-code`                | Public      | Login with an MFA code.                              | Body: `LoginWithCodeDTO` (token: string, code: string, methodType?: 'totp'|'email'|'recovery')   | Access and refresh tokens                                                                  | 400: Invalid MFA code            |
| POST   | `/auth/login-recovery-code`       | Public      | Login with an MFA recovery code.              | Body: `LoginWithRecoveryCodeDTO` (token: string, code: string)                                  | Access and refresh tokens                                                                  | 400: Invalid recovery code|
| POST   | `/auth/resend-mfa-code`           | Public      | Resends the MFA code by email.                      | Body: `ResendMfaCodeDTO` (token: string)                                                        | `{ success: true, hasEmailMfa: true }`                                                     | 400: No email MFA method configured    |
| POST   | `/auth/webauthn/generate`         | Public      | Generates options for WebAuthn authentication.            | Body: `{ mfaToken: string }`                                                                     | WebAuthn options                                                                            | 400: WebAuthn not configured       |
| POST   | `/auth/webauthn/verify`           | Public      | Verifies WebAuthn authentication.                     | Body: `{ mfaToken: string, assertionResponse: any }`                                            | Access and refresh tokens                                                                  | 400: Verification failed             |
| POST   | `/auth/forgot`                    | Public      | Requests password recovery via email.           | Body: `ForgetDTO` (email: string)                                                                | `{ success: true }`                                                                         | -                                   |
| POST   | `/auth/logout`                    | Public      | Logs out and invalidates the refresh token.                    | Body: `{ refreshToken?: string }`<br>Cookies: `rt` optional                                      | `{ success: true }`                                                                         | 400: Refresh token not provided    |
| POST   | `/auth/forgot-reset`              | Public      | Resets the password using a recovery code.             | Body: `ResetDTO` (password: string, code: string)                                               | Access and refresh tokens                                                                  | 400: Invalid or expired code    |

### OAuth Module (`/oauth`)

> **Multi-app hub pattern**: each provider only needs **one registered callback URL** (`${url}/callback/:provider`, with no flow suffix — GitHub uses `${api-url}/oauth/github/callback`, and Apple uses `${api-url}/oauth/apple/callback`, both because they only accept a single callback URL). The flow (`login`/`register`/`connect`) and the app that started the authentication (e.g. `training`) travel signed in the `state` parameter (`hhweb.<app>.<flow>.<signature>`, HMAC via `SecurityService`), never in the path. The app configured in the `url` setting acts as the **hub**: when it receives the callback from the provider, it either handles the flow locally or forwards the browser to the callback page of the app that started the flow, resolving the origin via the `app-urls` setting. Supported providers: Google, Facebook, GitHub, Microsoft, Microsoft Entra ID, Apple (Sign in with Apple), and LinkedIn.

| Method | Path                             | Auth         | Description                                                                                     | Parameters / Query / Body                                                        | Response                                                              | Common Errors                                                        |
|--------|----------------------------------|--------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------------|----------------------------------------------------------------------|
| GET    | `/oauth/github/callback`        | Public      | Exclusive GitHub bounce (the only callback URL accepted by the provider); forwards the `code` to the correct frontend. | Query: `code`, `state?`                                                          | 302 redirect to `${origin}/callback/github/<flow>?code=...&state=...` | -                                                                    |
| POST   | `/oauth/apple/callback`         | Public      | Exclusive Apple bounce: Apple requires `response_mode=form_post` when `scope` is requested, so it POSTs `code`/`state` instead of a GET redirect. This is converted back to a GET redirect, the same as the GitHub bounce. | Body: `code`, `state?`                                                           | 302 redirect to `${origin}/callback/apple/<flow>?code=...&state=...` | -                                                                    |
| GET    | `/oauth/:provider/login`        | Public      | Starts the login flow, redirecting to the provider's authorization screen.                | Path: `provider`<br>Query: `redirectApp?` (key in the initiating app's `app-urls`) | 302 redirect to the provider's authorization URL                    | 400: provider not enabled or not supported                       |
| GET    | `/oauth/:provider/register`     | Public      | Starts the sign-up flow via OAuth.                                                           | Path: `provider`<br>Query: `redirectApp?`                                        | 302 redirect to the provider's authorization URL                    | 400: provider not enabled or not supported                       |
| GET    | `/oauth/:provider/connect`      | Public      | Starts the flow to link an account to a user already authenticated in the target app.            | Path: `provider`<br>Query: `redirectApp?`                                        | 302 redirect to the provider's authorization URL                    | 400: provider not enabled or not supported                       |
| GET    | `/oauth/:provider/mobile/auth-url` | Public   | Returns the authorization URL for native apps (Electron/React Native) to intercept the redirect. | Path: `provider`<br>Query: `redirectUri` (native app's custom scheme)           | `{ authUrl: string }`                                                 | 400: invalid redirect URI or provider not enabled                |
| GET    | `/oauth/:provider/callback/login` | Public    | Exchanges the `code` for access tokens after the hub forwards to the app's login page.      | Path: `provider`<br>Query: `code`, `state?`, `redirectUri?`                       | `{ accessToken: string, refreshToken?: string }` + `rt` cookie (httpOnly) | 400: missing code, invalid origin, or callback already processed<br>409: callback being processed<br>503: provider failure |
| GET    | `/oauth/:provider/callback/register` | Public | Exchanges the `code` for tokens after signing up via OAuth.                                              | Path: `provider`<br>Query: `code`                                                | `{ accessToken: string, refreshToken?: string }` + `rt` cookie          | 400/409/503 — same cases as the login callback                     |
| GET    | `/oauth/:provider/callback/connect` | Authenticated | Links the provider account to the authenticated user.                                            | Path: `provider`<br>Query: `code`                                                | `{ accessToken: string, refreshToken?: string }` + `rt` cookie          | 400/409/503 — same cases as the login callback                     |
| DELETE | `/oauth/:provider`              | Authenticated  | Unlinks the provider account from the user.                                                      | Path: `provider`<br>Body: `{ email: string }`                                    | Disconnection result                                                | -                                                                    |

### System Module (`/system`)

| Method | Path       | Auth         | Description                         | Parameters / Body | Response                                                                                  | Common Errors |
|--------|------------|--------------|---------------------------------|-------------------|--------------------------------------------------------------------------------------------|--------------|
| GET    | `/system`  | Authenticated  | Returns system information. | -                 | Detailed information about the operating system, hardware, database, modules, and users | -            |

### Dashboard Core Module (`/dashboard-core`)

| Method | Path                      | Auth         | Description                                        | Parameters / Body                                                                                   | Response                                                                                      | Common Errors                          |
|--------|---------------------------|--------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------------------------|
| GET    | `/dashboard-core/home`    | Authenticated  | Returns the user's home dashboard.                | -                                                                                                 | Dashboard object or null                                                                     | 400: User not found          |
| GET    | `/dashboard-core/stats/overview/users` | Authenticated | User statistics.                         | -                                                                                                 | Aggregated user and session statistics                                                | -                                   |
| GET    | `/dashboard-core/stats/overview/mails` | Authenticated | Sent-email statistics.                  | -                                                                                                 | Aggregated statistics on sent emails                                                  | -                                   |
| GET    | `/dashboard-core/stats/overview/system` | Authenticated | System statistics (menus and routes).          | -                                                                                                 | Aggregated system statistics                                                          | -                                   |
| GET    | `/dashboard-core/config/overview` | Authenticated | Overview of the system settings.         | -                                                                                                 | Object with configuration                                                                    | -                                   |
| GET    | `/dashboard-core/widgets/me` | Authenticated | Widget data for the user.                  | -                                                                                                 | Aggregated data for the user's widgets                                                    | -                                   |
| GET    | `/dashboard-core/user-dashboards` | Authenticated | Lists the user's dashboards.                       | -                                                                                                 | List of dashboards associated with the user                                                  | -                                   |
| GET    | `/dashboard-core/templates` | Authenticated | Lists templates available for dashboards.      | -                                                                                                 | List of templates                                                                          | -                                   |
| POST   | `/dashboard-core/dashboard` | Authenticated | Creates a dashboard for the user.                        | Body: `{ name?: string; slug?: string; icon?: string | null; templateSlug?: string }`               | Created dashboard                                                                           | -                                   |
| PATCH  | `/dashboard-core/dashboard/order` | Authenticated | Reorders the user's dashboards.                     | Body: `{ slugs?: string[] }`                                                                      | Reordered dashboard                                                                       | -                                   |
| PATCH  | `/dashboard-core/dashboard/:slug` | Authenticated | Renames the user's dashboard.                       | Path param: `slug` (string)<br>Body: `{ name?: string; icon?: string | null }`                    | Updated dashboard                                                                      | -                                   |
| POST   | `/dashboard-core/dashboard/:slug/home` | Authenticated | Sets the dashboard as the user's home dashboard.              | Path param: `slug` (string)                                                                       | Success                                                                                   | -                                   |
| GET    | `/dashboard-core/dashboard/:slug/shares` | Authenticated | Lists the dashboard's shares.               | Path param: `slug` (string)                                                                       | List of users with access                                                              | -                                   |
| GET    | `/dashboard-core/shareable-users/:slug` | Authenticated | Lists users the dashboard can be shared with.         | Path param: `slug` (string)<br>Query: search?: string, page?: string, pageSize?: string           | Paginated list of users                                                                     | -                                   |
| POST   | `/dashboard-core/dashboard/:slug/share` | Authenticated | Shares the dashboard with users.                  | Path param: `slug` (string)<br>Body: `{ userId?: number; userIds?: number[] }`                   | Success                                                                                   | -                                   |
| DELETE | `/dashboard-core/dashboard/:slug/share/:sharedUserId` | Authenticated | Revokes a dashboard share.                | Path params: `slug` (string), `sharedUserId` (int)                                               | Success                                                                                   | -                                   |
| DELETE | `/dashboard-core/dashboard/:slug` | Authenticated | Removes the dashboard from the user.                          | Path param: `slug` (string)                                                                       | Success                                                                                   | -                                   |
| GET    | `/dashboard-core/access/:slug` | Authenticated | Checks the user's access to the dashboard.              | Path param: `slug` (string)                                                                       | `{ hasAccess: boolean, dashboard: object|null }`                                           | -                                   |
| GET    | `/dashboard-core/layout/:slug` | Authenticated | Gets the user's layout for the dashboard.              | Path param: `slug` (string)                                                                       | Array of widgets with positions and sizes                                                  | -                                   |
| POST   | `/dashboard-core/layout/:slug` | Authenticated | Saves the user's layout for the dashboard.               | Body: `{ layout: Array<{ i: string; x: number; y: number; w: number; h: number }> }`               | `{ success: true }`                                                                         | 403: Access denied                   |
| POST   | `/dashboard-core/widget/:slug` | Authenticated | Adds a widget to the user's dashboard.              | Body: `{ componentSlug: string }`                                                                 | Data for the added widget                                                                  | 403: Access denied                   |
| DELETE | `/dashboard-core/widget/:slug/:widgetId` | Authenticated | Removes a widget from the user's dashboard.                | Path params: `slug` (string), `widgetId` (string)                                                | "Not implemented yet" error                                                                  | -                                   |
| GET    | `/dashboard-core/:slug`   | Authenticated  | Gets dashboard items by slug.                  | Path param: `slug` (string), Query param: `locale?: string`                                       | List of dashboard items                                                                | -                                   |

### Dashboard Module (`/dashboard`)

| Method | Path           | Auth         | Description                      | Parameters / Body                                      | Response                      | Common Errors               |
|--------|----------------|--------------|------------------------------------|---------------------------------------------------------|------------------------------|----------------------------|
| GET    | `/dashboard`   | Authenticated  | Lists dashboards with pagination | Query: pagination (page?: number, pageSize?: number, search?: string) | Paginated list of dashboards      | -                          |
| GET    | `/dashboard/:id` | Authenticated | Gets a dashboard by ID         | Path param: `id` (int)                                 | Dashboard object             | 404: Dashboard not found |
| POST   | `/dashboard`   | Authenticated  | Creates a dashboard                | Body: `CreateDashboardDTO` (slug: string, locale: Record<string, { name: string }>) | Created dashboard             | -                          |
| PATCH  | `/dashboard/:id` | Authenticated | Updates a dashboard            | Path param: `id` (int), Body: `UpdateDashboardDTO`    | Updated dashboard         | 404: Dashboard not found |
| DELETE | `/dashboard/:id` | Authenticated | Deletes a dashboard             | Path param: `id` (int)                                 | `{ success: true }`          | 404: Dashboard not found |

### Dashboard Component Module (`/dashboard-component`)

| Method | Path                   | Auth         | Description                      | Parameters / Body                                               | Response                      | Common Errors                   |
|--------|------------------------|--------------|------------------------------------|------------------------------------------------------------------|------------------------------|-------------------------------|
| GET    | `/dashboard-component` | Authenticated  | Lists components with pagination | Query: pagination (page?: number, pageSize?: number, search?: string) | Paginated list of components     | -                             |
| GET    | `/dashboard-component/user` | Authenticated | Lists components by the user's roles | Query: pagination (page?: number, pageSize?: number, search?: string), User ID via token | Paginated list of components     | -                             |
| GET    | `/dashboard-component/:id` | Authenticated | Gets a component by ID       | Path param: `id` (int)                                         | Component object             | 404: Component not found |
| POST   | `/dashboard-component` | Authenticated  | Creates a component               | Body: `CreateDashboardComponentDTO`                            | Created component             | -                             |
| PATCH  | `/dashboard-component/:id` | Authenticated | Updates a component           | Path param: `id` (int), Body: `UpdateDashboardComponentDTO`   | Updated component         | 404: Component not found |
| DELETE | `/dashboard-component/:id` | Authenticated | Deletes a component             | Path param: `id` (int)                                         | `{ success: true }`           | 404: Component not found |
| POST   | `/dashboard-component/:id/preview` | Authenticated | Saves a component preview (image) | Path param: `id` (int), File: image (image/*)                 | `{ success: true, componentId: number, slug: string, library_slug: string, fileName: string, relativeUrl: string }` | 400: Invalid file<br>403: Dev environment only |

### Dashboard Component Role Module (`/dashboard-component-role`)

| Method | Path                          | Auth         | Description                          | Parameters / Body                                               | Response                      | Common Errors                   |
|--------|-------------------------------|--------------|---------------------------------------|------------------------------------------------------------------|------------------------------|-------------------------------|
| GET    | `/dashboard-component-role`   | Authenticated  | Lists relations with pagination or by component | Query: pagination (page?: number, pageSize?: number), Query param: componentId?: number | Paginated or list of relations | -                             |
| POST   | `/dashboard-component-role`   | Authenticated  | Creates a component-role relation      | Body: `CreateDashboardComponentRoleDTO`                         | Created relation                | Error if the relation already exists      |
| POST   | `/dashboard-component-role/batch` | Authenticated | Bulk-creates relations             | Body: `CreateDashboardComponentRoleBatchDTO`                    | { success: boolean, created: number, skipped: number, message: string } | -                      |
| DELETE | `/dashboard-component-role/:id` | Authenticated | Deletes a relation by ID             | Path param: `id` (int)                                          | `{ success: true }`           | 404: Relation not found    |
| DELETE | `/dashboard-component-role/component/:componentId/role/:roleId` | Authenticated | Deletes a relation by component and role | Path params: `componentId` (int), `roleId` (int)                | `{ success: true }`           | 404: Relation not found    |

### Dashboard Item Module (`/dashboard-item`)

| Method | Path               | Auth         | Description                      | Parameters / Body                                               | Response                      | Common Errors                   |
|--------|--------------------|--------------|------------------------------------|------------------------------------------------------------------|------------------------------|-------------------------------|
| GET    | `/dashboard-item`  | Authenticated  | Lists items with pagination and filter by dashboard | Query: pagination (page?: number, pageSize?: number), Query param: dashboardId?: number | Paginated list of items           | -                             |
| POST   | `/dashboard-item`  | Authenticated  | Creates an item                     | Body: `CreateDashboardItemDTO`                                 | Created item                  | -                             |
| DELETE | `/dashboard-item/:id` | Authenticated | Deletes an item by ID            | Path param: `id` (int)                                         | `{ success: true }`           | 404: Item not found       |

### Dashboard Role Module (`/dashboard-role`)

| Method | Path               | Auth         | Description                          | Parameters / Body                                               | Response                      | Common Errors                   |
|--------|--------------------|--------------|---------------------------------------|------------------------------------------------------------------|------------------------------|-------------------------------|
| GET    | `/dashboard-role`  | Authenticated  | Lists relations with pagination or by dashboard | Query: pagination (page?: number, pageSize?: number), Query param: dashboardId?: number | Paginated or list of relations | -                             |
| POST   | `/dashboard-role`  | Authenticated  | Creates a dashboard-role relation       | Body: `CreateDashboardRoleDTO`                                 | Created relation                | Error if the relation already exists      |
| POST   | `/dashboard-role/batch` | Authenticated | Bulk-creates relations             | Body: `CreateDashboardRoleBatchDTO`                            | { success: boolean, created: number, skipped: number, message: string } | -                      |
| DELETE | `/dashboard-role/:id` | Authenticated | Deletes a relation by ID             | Path param: `id` (int)                                         | `{ success: true }`           | 404: Relation not found    |
| DELETE | `/dashboard-role/dashboard/:dashboardId/role/:roleId` | Authenticated | Deletes a relation by dashboard and role | Path params: `dashboardId` (int), `roleId` (int)               | `{ success: true }`           | 404: Relation not found    |

### Dashboard User Module (`/dashboard-user`)

| Method | Path               | Auth         | Description                      | Parameters / Body                                               | Response                      | Common Errors                   |
|--------|--------------------|--------------|------------------------------------|------------------------------------------------------------------|------------------------------|-------------------------------|
| GET    | `/dashboard-user`  | Authenticated  | Lists relations with pagination   | Query: pagination (page?: number, pageSize?: number)            | Paginated list of relations        | -                             |
| GET    | `/dashboard-user/:id` | Authenticated | Gets a relation by ID           | Path param: `id` (int)                                         | Relation object                | -                             |
| POST   | `/dashboard-user`  | Authenticated  | Creates a relation                  | Body: `CreateDTO` (dashboard_id: number, user_id: number)      | Created relation                | -                             |
| PATCH  | `/dashboard-user/:id` | Authenticated | Updates a relation              | Path param: `id` (int), Body: `UpdateDTO`                      | Updated relation            | -                             |
| DELETE | `/dashboard-user`  | Authenticated  | Bulk-deletes relations       | Body: `DeleteDTO` (ids: number[])                              | `{ count: number }`           | 400: No id provided       |

## 4. Authentication and authorization rules

- Most endpoints require authentication via a JWT token.
- Public endpoints are explicitly marked.
- Access control is based on roles and permissions.
- MFA (Multi-Factor Authentication) is supported via TOTP, email, and recovery codes.
- WebAuthn is supported for strong authentication.
- Refresh tokens are managed via HTTP-only cookies or in the request body.
- Sensitive operations (create, update, delete) require authentication and the appropriate permissions.

## 5. Request/response structures

### Main DTOs of the AI module

- **ChatDTO**

```ts
{
  message: string; // required
  provider?: 'openai' | 'gemini'; // optional, default 'openai'
  model?: string; // optional
  systemPrompt?: string; // optional
  file_id?: number; // optional
}
```

- **ChatAgentDTO**

```ts
{
  message: string; // required
  file_id?: number; // optional
}
```

- **CreateAgentDTO**

```ts
{
  slug: string; // required
  provider?: 'openai' | 'gemini'; // optional, default 'openai'
  model?: string; // optional
  instructions?: string; // optional
}
```

- **UpdateAgentDTO**

```ts
{
  slug?: string;
  provider?: 'openai' | 'gemini';
  model?: string;
  instructions?: string;
}
```

- **DeleteDTO**

```ts
{
  ids: number[]; // array of IDs to delete, minimum 1 item
}
```

### Main DTOs of the Auth module

- **LoginDTO**

```ts
{
  email: string; // required, valid email
  password: string; // required, strong password, minimum 6 characters
  refreshToken?: boolean; // optional, default false
}
```

- **LoginEmailVerificationDTO**

```ts
{
  token: string; // required
  code: string; // required, PIN code
}
```

- **LoginEmailVerificationResendDTO**

```ts
{
  token: string; // required
}
```

- **LoginWithCodeDTO**

```ts
{
  code: string; // required
  token: string; // required, JWT
  methodType?: 'totp' | 'email' | 'recovery'; // optional
}
```

- **LoginWithRecoveryCodeDTO**

```ts
{
  code: string; // required
  token: string; // required, JWT
}
```

- **ForgetDTO**

```ts
{
  email: string; // required, valid email
}
```

- **ResetDTO**

```ts
{
  password: string; // required, minimum 8 characters
  code: string; // required
}
```

### Main DTOs of the Dashboard module

- **CreateDashboardDTO**

```ts
{
  slug: string; // required
  locale: Record<string, { name: string }>; // required
}
```

- **UpdateDashboardDTO**

```ts
{
  slug?: string;
  locale?: Record<string, { name: string }>;
}
```

- **CreateDashboardComponentDTO**

```ts
{
  slug: string;
  library_slug?: string;
  min_width?: number;
  max_width?: number;
  min_height?: number;
  max_height?: number;
  width: number;
  height: number;
  is_resizable?: boolean;
  locale: Record<string, { name: string; description?: string }>;
}
```

- **UpdateDashboardComponentDTO**

```ts
{
  slug?: string;
  library_slug?: string;
  min_width?: number;
  max_width?: number;
  min_height?: number;
  max_height?: number;
  width?: number;
  height?: number;
  is_resizable?: boolean;
  locale?: Record<string, { name: string; description?: string }>;
}
```

- **CreateDashboardRoleDTO**

```ts
{
  dashboard_id: number;
  role_id: number;
}
```

- **CreateDashboardRoleBatchDTO**

```ts
{
  dashboard_id: number;
  role_ids: number[];
}
```

- **CreateDashboardComponentRoleDTO**

```ts
{
  component_id: number;
  role_id: number;
}
```

- **CreateDashboardComponentRoleBatchDTO**

```ts
{
  component_id: number;
  role_ids: number[];
}
```

- **CreateDashboardItemDTO**

```ts
{
  component_id: number;
  dashboard_id: number;
  width: number;
  height: number;
  x_axis: number;
  y_axis: number;
}
```

- **UpdateDashboardLayoutDTO**

```ts
{
  dashboard_id: number;
  items: Array<{
    id: number;
    width: number;
    height: number;
    x_axis: number;
    y_axis: number;
  }>;
}
```

- **UpdateDashboardItemDTO**

```ts
{
  component_id?: number;
  dashboard_id?: number;
  width?: number;
  height?: number;
  x_axis?: number;
  y_axis?: number;
}
```

- **CreateDTO (DashboardUser)**

```ts
{
  dashboard_id: number;
  user_id: number;
}
```

- **UpdateDTO (DashboardUser)**

```ts
{
  dashboard_id?: number;
  user_id?: number;
}
```

- **DeleteDTO**

```ts
{
  ids: number[];
}
```

## 6. Common errors

- **400 Bad Request**

  - API key not configured for OpenAI or Gemini.
  - AI agent slug already exists.
  - Invalid or expired verification code.
  - Refresh token not provided.
  - Access denied due to invalid credentials.
  - MFA not configured or invalid code.
  - Attempt to delete non-existent items.
  - Invalid request to create duplicate relations.
  - Invalid file for component preview.
  - Preview operation available only in the development environment.
  - OAuth: provider not enabled (`oauth-<provider>-enabled` off) or not supported.
  - OAuth: integration profile not configured (`oauth-<provider>-profile-id` empty) or not found.
  - OAuth: missing authorization code, invalid mobile redirect URI, invalid callback origin (hub origin binding), or callback already processed.

- **404 Not Found**

  - AI agent not found by ID or slug.
  - Dashboard, component, or relation not found.
  - Verification challenge not found or expired.

- **403 Forbidden**

  - Access denied to dashboards or protected resources.
  - Attempt to save a preview outside the development environment.

- **409 Conflict**

  - OAuth: callback already being processed (idempotency lock by code).

- **503 Service Unavailable**

  - OAuth: failure communicating with the provider (upstream).

## 7. Database (YAML tables)

### ai_agent

```yaml
purpose: Stores AI agents configured in the system.
columns:
  - id: integer, PK, auto-increment
  - slug: string, unique, not null
  - provider: enum('openai', 'gemini'), not null
  - model: string, nullable
  - instructions: string, nullable
  - external_agent_id: string, nullable
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
defaults:
  - created_at: NOW()
  - updated_at: NOW()
nullability:
  - model: nullable
  - instructions: nullable
  - external_agent_id: nullable
integrity:
  - unique slug
indexes:
  - id (PK)
  - slug (unique)
enums:
  - provider: ['openai', 'gemini']
```

### user

```yaml
purpose: Stores the system's users.
columns:
  - id: integer, PK, auto-increment
  - name: string, not null
  - photo_id: integer, nullable
  - last_login_at: timestamp, nullable
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - PK on id
indexes:
  - id (PK)
```

### user_mfa

```yaml
purpose: Stores users' multi-factor authentication methods.
columns:
  - id: integer, PK, auto-increment
  - user_id: integer, FK to user.id, not null
  - name: string, not null
  - type: enum('totp', 'email', 'webauthn'), not null
  - verified_at: timestamp, nullable
  - suspended_until: timestamp, nullable
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - FK user_id references user.id
indexes:
  - id (PK)
enums:
  - type: ['totp', 'email', 'webauthn']
```

### user_identifier

```yaml
purpose: User identifiers, such as emails.
columns:
  - id: integer, PK, auto-increment
  - user_id: integer, FK to user.id, not null
  - type: string, not null (e.g.: 'email')
  - value: string, not null
  - verified_at: timestamp, nullable
  - enabled: boolean, not null, default true
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - FK user_id references user.id
indexes:
  - id (PK)
```

### user_session

```yaml
purpose: Sessions of authenticated users.
columns:
  - id: integer, PK, auto-increment
  - user_id: integer, FK to user.id, not null
  - token: string, not null
  - ip_address: string, nullable
  - user_agent: string, nullable
  - created_at: timestamp, not null, default NOW()
  - expires_at: timestamp, not null
  - revoked_at: timestamp, nullable
integrity:
  - FK user_id references user.id
indexes:
  - id (PK)
```

### user_activity

```yaml
purpose: Log of user activities.
columns:
  - id: integer, PK, auto-increment
  - user_id: integer, FK to user.id, not null
  - action: string, not null
  - created_at: timestamp, not null, default NOW()
integrity:
  - FK user_id references user.id
indexes:
  - id (PK)
```

### role

```yaml
purpose: System roles for access control.
columns:
  - id: integer, PK, auto-increment
  - slug: string, unique, not null
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - unique slug
indexes:
  - id (PK)
  - slug (unique)
```

### role_user

```yaml
purpose: Many-to-many relation between users and roles.
columns:
  - id: integer, PK, auto-increment
  - user_id: integer, FK to user.id, not null
  - role_id: integer, FK to role.id, not null
integrity:
  - FK user_id references user.id
  - FK role_id references role.id
indexes:
  - id (PK)
```

### dashboard

```yaml
purpose: The system's configurable dashboards.
columns:
  - id: integer, PK, auto-increment
  - slug: string, unique, not null
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - unique slug
indexes:
  - id (PK)
  - slug (unique)
```

### dashboard_component

```yaml
purpose: Components that can be used in dashboards.
columns:
  - id: integer, PK, auto-increment
  - slug: string, unique, not null
  - library_slug: string, nullable
  - min_width: integer, nullable
  - max_width: integer, nullable
  - min_height: integer, nullable
  - max_height: integer, nullable
  - width: integer, not null
  - height: integer, not null
  - is_resizable: boolean, not null, default true
  - created_at: timestamp, not null, default NOW()
  - updated_at: timestamp, not null, default NOW()
integrity:
  - unique slug
indexes:
  - id (PK)
  - slug (unique)
```

### dashboard_role

```yaml
purpose: Relation between dashboards and roles for access control.
columns:
  - id: integer, PK, auto-increment
  - dashboard_id: integer, FK to dashboard.id, not null
  - role_id: integer, FK to role.id, not null
integrity:
  - FK dashboard_id references dashboard.id
  - FK role_id references role.id
indexes:
  - id (PK)
```

### dashboard_user

```yaml
purpose: Relation between dashboards and users.
columns:
  - id: integer, PK, auto-increment
  - dashboard_id: integer, FK to dashboard.id, not null
  - user_id: integer, FK to user.id, not null
  - is_home: boolean, not null, default false
integrity:
  - FK dashboard_id references dashboard.id
  - FK user_id references user.id
indexes:
  - id (PK)
```

### dashboard_item

```yaml
purpose: Items (widgets) within dashboards.
columns:
  - id: integer, PK, auto-increment
  - dashboard_id: integer, FK to dashboard.id, not null
  - component_id: integer, FK to dashboard_component.id, not null
  - width: integer, not null
  - height: integer, not null
  - x_axis: integer, not null
  - y_axis: integer, not null
integrity:
  - FK dashboard_id references dashboard.id
  - FK component_id references dashboard_component.id
indexes:
  - id (PK)
```

### dashboard_component_role

```yaml
purpose: Relation between dashboard components and roles.
columns:
  - id: integer, PK, auto-increment
  - component_id: integer, FK to dashboard_component.id, not null
  - role_id: integer, FK to role.id, not null
integrity:
  - FK component_id references dashboard_component.id
  - FK role_id references role.id
indexes:
  - id (PK)
```

### oauth_mobile_state_token

```yaml
purpose: Single-use signed state for the OAuth flow started by native apps (mobile/desktop), binding the app's redirect URI to the provider and the flow.
columns:
  - id: bigint, PK, auto-increment
  - token_hash: string, unique, not null
  - provider: string, not null
  - redirect_uri: string, not null (native app's custom scheme)
  - flow_type: string, not null ('login' | 'register' | 'connect')
  - expires_at: timestamptz, not null
  - consumed_at: timestamptz, nullable (marks single use)
  - created_at: timestamptz, not null, default NOW()
integrity:
  - unique token_hash
indexes:
  - id (PK)
  - expires_at
  - (provider, redirect_uri)
```

> Used only by the mobile flow (`GET /oauth/:provider/mobile/auth-url`). The multi-app web hub (signed `state`, `hhweb.<app>.<flow>.<sig>`) is stateless — the HMAC signature is verified without database persistence.

## 8. Relevant business rules

- AI agents can be created, updated, and deleted, with direct integration with the OpenAI and Gemini APIs.
- AI chat supports file attachments, with text extraction for PDFs and text files.
- Mandatory MFA can be configured, with support for email, TOTP, and WebAuthn.
- Access and refresh tokens are managed securely, including HTTP-only cookies.
- Dashboards are personalized per user, with role-based access control.
- Dashboard and widget layouts can be saved and retrieved per user.
- The system collects usage statistics, sessions, sent emails, and account security data.
- Strict validations are applied via DTOs and validation classes.
- Batch create operations avoid duplication and return counts of created and skipped items.
- Removing widgets from a user's dashboard is not yet implemented.
- Dashboard component previews are allowed only in the development environment and accept images only.
- Email MFA sends codes to all email addresses associated with the user.
- WebAuthn is supported for strong authentication with challenge generation and verification.
- **OAuth — one callback URL per provider**: the flow (login/register/connect) and the initiating app travel signed in the `state`, never in the path; each provider is enabled/disabled individually via the `oauth-<provider>-enabled` setting, without removing the configured credentials (`oauth-<provider>-profile-id`, pointing to an `integration_profile`).
- **OAuth — multi-app hub**: the app in the `url` setting (e.g. admin) receives the callback from the provider and, if the `state` indicates a different initiating app, forwards the browser to that app's corresponding callback page, resolving the origin via `app-urls`. Exchanging the `code` for tokens is only accepted when the request's `Origin`/`Referer` header matches the origin signed in the `state` (origin binding), preventing code interception between apps.
- **OAuth — email auto-linking**: on login, if no `user_account` exists for the provider but an enabled email `user_identifier` matching the OAuth profile's email already exists, the flow becomes an automatic connection (`connect`) to the existing account instead of creating a new user; a new account (`register`) is only created when no user matches the email.
- **OAuth — roles on sign-up**: new users registered via OAuth receive the roles configured in the `oauth-role-assignment` setting.
- **OAuth — mobile**: native apps use `/oauth/:provider/mobile/auth-url` with a signed state persisted in `oauth_mobile_state_token` (10-minute TTL, single use).
- **OAuth — Apple (Sign in with Apple)**: no static `client_secret` — the `private_key` (EC `.p8` key) signs a `client_secret` JWT (ES256, `iss`=team ID, `sub`=Services ID, `kid`=key ID, short TTL) on each code exchange. Since scopes require `response_mode=form_post`, the callback is `POST /oauth/apple/callback` (a single URL, on the backend), converted to the same GET redirect used by the other providers. Identity comes from the `id_token` (decoded JWT, without signature verification — delivered directly by Apple in the server-to-server exchange); the name is only sent by Apple on the first authorization and is not captured, so the user's name falls back to the local part of the email.
- **OAuth — LinkedIn**: uses "Sign In with LinkedIn using OpenID Connect" (`scope=openid profile email`), with identity obtained in a single call to `GET /v2/userinfo` (standard OIDC claims), without the legacy pair of calls `/v2/me` + `/v2/emailAddress`.

## 9. Quick usage guide (examples)

### Create an AI agent

```http
POST /ai/agent
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "my-agent",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "instructions": "Be a friendly assistant."
}
```

Response:

```json
{
  "id": 1,
  "slug": "my-agent",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "instructions": "Be a friendly assistant.",
  "external_agent_id": "abc123",
  "created_at": "2024-06-01T12:00:00Z",
  "updated_at": "2024-06-01T12:00:00Z"
}
```

### Chat with an AI agent

```http
POST /ai/agent/my-agent/chat
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form-data:
- message: "Hi, how are you?"
- file: (optional file)
```

Response:

```json
{
  "slug": "my-agent",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "content": "Hello! I'm doing well, thanks for asking."
}
```

### Login with email and password

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "strongPassword123"
}
```

Response:

```json
{
  "accessToken": "<jwt_access_token>",
  "refreshToken": "<jwt_refresh_token>"
}
```

### OAuth login started by another app (multi-app hub)

An app other than the hub (e.g. `training`, key `training` in the `app-urls` setting) starts the login by redirecting the browser to:

```http
GET /oauth/google/login?redirectApp=training
```

The backend responds with a 302 `redirect` to Google's authorization URL, containing `state=hhweb.training.login.<signature>`. After consent, Google redirects to the single registered callback (`${url}/callback/google`, the hub). The hub reads the `state`, resolves `training` via `app-urls`, and forwards the browser to `${training-origin}/callback/google/login?code=...&state=...`. The `training` app then exchanges the code:

```http
GET /oauth/google/callback/login?code=<code>&state=hhweb.training.login.<signature>
```

Response:

```json
{
  "accessToken": "<jwt_access_token>"
}
```

The `refreshToken` is set in the httpOnly `rt` cookie (it is not returned in the body, except when the call provides `redirectUri`, used by the mobile flow).

### Get system information

```http
GET /system
Authorization: Bearer <token>
```

Response (abbreviated example):

```json
{
  "os": {
    "name": "Linux",
    "platform": "linux",
    "version": "5.15.0",
    "architecture": "x64",
    "uptime": 123456,
    "cpu": {
      "model": "Intel(R) Xeon(R)",
      "speed": 2400,
      "physicalCores": 4,
      "virtualCores": 8
    },
    "memory": {
      "total": 17179869184,
      "free": 8589934592
    },
    "disk": [
      {
        "filesystem": "/dev/sda1",
        "size": 500107862016,
        "free": 250053931008,
        "mountpoint": "/"
      }
    ]
  },
  "modules": [
    {
      "name": "@hedhog/core",
      "version": "^1.0.0",
      "latestVersion": "1.0.1",
      "upToDate": false
    }
  ],
  "users": {
    "total": 100,
    "admin": 5,
    "active": 80,
    "activities": []
  },
  "database": {
    "connections": 10,
    "size": 104857600,
    "queriesPerSecond": 50
  }
}
```

---

This README documents the `@hed-hog/core` module based on the current source code and definitions, providing a detailed technical overview for developers and integrators of the system.
