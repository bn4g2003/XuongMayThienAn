# 1. **General Framework Rules**

1. **Do NOT wrap any component or page with `<App>` from Ant Design.** The
   global wrapper is already provided in: `src/providers/AppThemeProvider.tsx`

2. **Do NOT use static AntD APIs**, including:

   - `message.success()`
   - `notification.error()`
   - `Modal.confirm()`
   - or any other static call.

3. Copilot must always use:

```tsx
"use client";
import { App } from "antd";
const { message, notification, modal } = App.useApp();
```

4. All AntD components used inside the App Router must be **client components**.

5. Only use **AntD v6 APIs**. No deprecated props or legacy components.

6. Never import or generate:

```
@ant-design/nextjs-registry
```

7. All styling and UI must follow theme tokens defined in:

```
src/providers/AppThemeProvider.tsx
```

8. New pages must follow the layout and structural style of:

```
src/app/(dashboard)/admin/users/page.tsx
```

9. Always use existing shared components whenever possible (e.g., `CommonTable`,
   `FilterList`, form components, layout wrappers).

---

# 2. **Next.js App Router Rules**

1. Every file that uses AntD, filters, TanStack Query, or client-side UI must
   start with `"use client"`.
2. Do NOT manually push filter parameters into the URL unless explicitly
   required.
3. Routing and dialogs must follow the App Router conventions only.

---

# 3. **TanStack Query Rules (Mandatory)**

All data fetching must use TanStack Query.

### Fetching example:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["customers", query],
  queryFn: () => api.customers.list(query),
});
```

### Mutation example:

```tsx
const mutation = useMutation({
  mutationFn: api.customers.update,
  onSuccess() {
    message.success("Updated successfully");
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  },
});
```

Forbidden:

- `fetch()` inside component bodies
- SWR
- Axios directly in UI files
- React Query v3 syntax

---

# 4. **Global Filtering Rules (`useFilter`)**

Copilot must always use **the existing filtering system**:

```
src/hooks/useFilter.ts
```

Copilot may NOT rewrite or replace any part of the filtering logic.

### Required imports:

```tsx
const {
  query,
  pagination,
  updateQuery,
  updateQueries,
  reset,
  applyFilter,
  handlePageChange,
} = useFilter();
```

### Required behaviors:

- `updateQuery(key, value)` for single-filter updates
- `updateQueries([{ key, value }])` for batch updates
- `reset()` to clear filters
- `handlePageChange(page, pageSize)` for pagination
- `applyFilter(data)` for client-side filtering

Forbidden:

- Manual `.filter()` logic
- Custom filter state
- Custom search logic
- Custom pagination code
- Adding debounce manually

---

# 5. **Query Serialization Rules (`buildQueryParams`)**

Copilot must always use:

```
src/utils/buildQuery.ts
```

### Usage:

```tsx
import { buildQueryParams } from "@/utils/buildQuery";

const qs = buildQueryParams(query);
await fetch(`/api/customers?${qs}`);
```

### Required serialization:

- Arrays must be joined using **commas**, e.g.:

  ```
  status=active,inactive
  group=A,B,C
  ```

Forbidden:

- `status=active&status=inactive`
- Multiple URLSearchParams append for arrays
- JSON.stringify
- Custom serializers

---

# 6. **WrapperContent Rules (MANDATORY)**

All search, filtering, refreshing, column settings, and mobile option UI **must
be rendered exclusively via**:

```
src/components/WrapperContent.tsx
```

Copilot must NEVER implement custom UI for:

- Search input
- Filter forms
- Filter modals
- Reset filter buttons
- Column visibility settings
- Mobile options menu
- Reload button

### Required WrapperContent structure:

```tsx
<WrapperContent
  title="Customers"
  header={{
    buttonBackTo: "/dashboard",
    searchInput: {
      placeholder: "Search customers",
      filterKeys: ["name", "email"],
    },
    filters: {
      fields: FILTER_FIELDS,
      query,
      onApplyFilter: updateQueries,
      onReset: reset,
    },
    columnSettings: {
      columns: columnSettings,
      onChange: setColumnSettings,
      onReset: resetColumnSettings,
    },
    refetchDataWithKeys: ["customers"],
  }}
  isLoading={customersLoading}
  isRefetching={customersRefetching}
  isNotAccessible={false}
  isEmpty={!customers?.length}
>
```

WrapperContent handles:

- Desktop inline filters
- Mobile filter modal
- Search debounce
- Column settings popover
- Reset button
- Data refetch
- Empty state
- Permission denied state

Copilot must **not** rebuild these.

---

# 7. **Table Rules (STRICT)**

Copilot must follow these rules when generating AntD tables:

### Required column properties:

- `title`
- `dataIndex`
- `key`
- **`width` is required**
- `align`
- optional: `render`

### Fixed columns (mandatory):

- **First TWO columns:** `fixed: "left"`
- **Last TWO columns:** `fixed: "right"`

### Numeric fields:

```ts
align: "left";
```

### Table component must include:

```tsx
<Table columns={columns} dataSource={data} scroll={{ x: true }} bordered />
```

Forbidden:

- Columns without width
- No fixed columns
- Tables without scroll
- Custom manual table components

---

# 8. **List Page Required Structure**

Every list page must follow this exact template:

```tsx
"use client";

import useFilter from "@/hooks/useFilter";
import WrapperContent from "@/components/WrapperContent";
import CommonTable from "@/components/CommonTable";
import { buildQueryParams } from "@/utils/buildQuery";

export default function Page() {
  const {
    query,
    pagination,
    updateQuery,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api.customers.list(query),
  });

  const customers = applyFilter(data ?? []);

  return (
    <WrapperContent
      title="Customers"
      header={{
        searchInput: { placeholder: "Search...", filterKeys: ["name", "code"] },
        filters: {
          fields: FILTER_FIELDS,
          query,
          onApplyFilter: updateQueries,
          onReset: reset,
        },
        columnSettings: {
          columns: columnSettings,
          onChange: setColumnSettings,
          onReset: resetColumnSettings,
        },
        refetchDataWithKeys: ["customers"],
      }}
      isLoading={isLoading}
      isEmpty={!customers?.length}
    >
      <CommonTable
        columns={columns}
        dataSource={customers}
        pagination={{ ...pagination, onChange: handlePageChange }}
        loading={isLoading}
        paging
      />
    </WrapperContent>
  );
}
```

Forbidden:

- Custom filter/search UI
- Custom pagination
- Custom layout structure
- Using Table directly without WrapperContent

---

# 9. **Reporting / Analytics Rules**

- Use AntD `Statistic` for KPIs.
- Use **Recharts** for charts.
- Chart colors must follow AntD theme tokens.
- Layout must follow existing dashboard/report styling.

---

# 10. **Forbidden Patterns (Global)**

Copilot must NEVER generate:

- Static AntD APIs
- Deprecated AntD props
- fetch() in components
- Custom filtering logic
- Custom pagination
- Manual query string building
- URL appending filters manually
- Tables without width
- Tables without fixed first and last columns
- Filter UI outside WrapperContent
- Layouts inconsistent with Admin Users page
- Theme overrides outside AppThemeProvider
- Custom column setting UI

# **11. QueryKey Normalization Rule (TanStack Query)**

Copilot must **never** use raw objects inside `queryKey`. Objects break
referential stability and cause infinite refetch loops. Instead, all filter
parameters must be converted into a **stable primitive** before being used in
the `queryKey`.

### ❌ Forbidden

```ts
useQuery({
  queryKey: ["debts-summary", query], // DO NOT PUT OBJECTS IN QUERY KEY
  queryFn: async () => { ... },
});
```

### ✔ Required

```ts
useQuery({
  queryKey: ["debts-summary", SuperJSON.stringify(query)],
  queryFn: async () => {
    const res = await fetch(`/api/reports/debts?type=summary&${qs}`);
    const body = await res.json();
    return body.success ? body.data : null;
  },
});
```

### ✔ Extended requirements

- Always serialize filter params to a stable primitive:

  - `SuperJSON.stringify(query)` (preferred)
  - `JSON.stringify(query)` (fallback)

- Never place nested objects, arrays, or spread objects into the query key.

- If multiple query groups exist, Copilot must combine them as:

  ```ts
  queryKey: [
    "report-customer",
    Object.values(customerQuery).join(","),
    Object.values(dateQuery).join(","),
  ];
  ```

- When using `useFilter`, the query key must depend **only** on `filter.query`
  after being serialized.

# **12. Multi-Value Query Parameter Rule (Comma-Separated Params)**

Whenever the client sends any query parameter whose value contains **commas**,
Copilot must treat this as **multiple values for filtering**, not a single
string. The API must always detect this pattern and convert it into an array
before performing database queries.

---

## ✔ Required API Behavior

Whenever a query param contains a comma:

```ts
?status=active,inactive
?branchId=1,2,3
?category=shoes,hats
```

The API **must always**:

1. **Split the value by comma**
2. **Trim whitespace**
3. **Filter out empty values**
4. **Use array filtering logic in Prisma/SQL**

### Required server-side helper:

```ts
function parseMultiValue(param?: string | string[]) {
  if (!param) return [];

  if (Array.isArray(param)) {
    return param
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return param
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
```

### Required usage inside API route:

```ts
const statuses = parseMultiValue(searchParams.status);

const data = await db.orders.findMany({
  where: statuses.length > 0 ? { status: { in: statuses } } : {},
});
```

---

## ❌ Forbidden

Copilot must **not** treat comma-separated string as a single raw value:

```ts
// NEVER do this
const status = req.query.status; // "active,inactive"
db.orders.findMany({ where: { status } });
```

This produces incorrect results.

---

## ✔ Required Client Behavior

Copilot must always serialize multi-select filters as comma-separated strings:

```ts
SuperJSON.stringify(query);
```

Examples:

```ts
filter.query = {
  status: ["active", "inactive"],      // client state
}

// must serialize to:
?status=active,inactive
```

---

## ✔ Required Rule Summary for Copilot

**If a query parameter contains commas, it must be parsed as multiple tokens on
the server. If a filter contains multiple values, the client must serialize it
using commas. Every API endpoint must check for commas and split them into an
array before querying.**

# **13. Statistic Style Rule (Ant Design v6 Only)**

Copilot must **never** use deprecated styling props from Ant Design v4/v5 when
generating `<Statistic />` components.

### ❌ Forbidden (v4/v5 APIs)

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  valueStyle={{ color: "#cf1322" }} // ❌ DO NOT USE valueStyle
/>
```

- `valueStyle`, `titleStyle`, `prefixStyle`, and `suffixStyle` are **removed**
  in AntD v6.
- Copilot must not generate these props under any circumstance.

---

## ✔ Required (Ant Design v6)

Copilot must always use the **new `styles` API** introduced in Ant Design v6:

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  styles={{
    content: { color: "#cf1322" },
  }}
/>
```

### ✔ Notes for Copilot

- All custom styling for Statistic must use `styles={{ ... }}` (AntD v6
  pattern).
- `content` controls the number/value color.
- Every style-related change must follow the new v6 structure.

---

## ✔ Extended Requirements

Copilot must follow these constraints:

- Use:

  ```ts
  styles={{
    content: { ... },
    title: { ... },
    prefix: { ... },
    suffix: { ... },
  }}
  ```

  when necessary.

- **Never generate**:

  - `valueStyle`
  - `titleStyle`
  - `prefixStyle`
  - `suffixStyle`

- All Statistic components **must use the v6 API exclusively**.

# **14. Backend-Filtered Data Rule (Do NOT Re-filter on Client)**

When data has **already been filtered by the backend**, Copilot must **never**
apply any additional client-side filtering using `applyFilter()`.

`applyFilter()` is only allowed for **purely client-side data**, not for data
returned from API endpoints.

---

### ❌ Forbidden

```ts
// Data already filtered by backend
const data = await fetch(...);

// ❌ Copilot must NOT do this:
const finalData = applyFilter(data);
```

This causes:

- double filtering
- incorrect results
- broken pagination
- inconsistent UI
- unnecessary performance overhead

---

### ✔ Required

```ts
// Use backend-filtered data directly
const finalData = data;
```

---

## **Copilot Must Follow These Rules**

### 1. If the API request includes filters (e.g., `?page=1&limit=10&status=active`)

→ The backend owns all filtering logic. → Client **must not** apply
`applyFilter()`.

### 2. `applyFilter()` is only allowed for:

- local static arrays
- dropdown options
- small client-only datasets
- preview data
- non-paginated, non-API lists

### 3. When using `<CommonTable paging={true} />`

→ Copilot must assume backend pagination → Client-side filtering is **strictly
forbidden**.

### 4. When using `useFilter` with backend queries:

- Copilot must use `query` only to build query string
- **Do not apply `applyFilter()`** to the fetched data

---

## ✔ Rule Summary for Copilot

> **If data comes from the backend with filters applied, Copilot must never call
> `applyFilter()` on that data. `applyFilter()` is strictly for client-side only
> datasets.**


# **15. API Migration Rule (Next.js App Router → tRPC)**

Copilot must migrate every API endpoint originally written using the Next.js App Router (e.g., `/api/.../route.ts`) into tRPC **without changing any behavior**, including:

* input parameters
* validation
* filters
* database queries
* success responses
* error formats
* HTTP semantics
* business logic
* pagination
* sorting
* permission checks

Everything must be functionally identical after migration.

---

## ✔ Required Behavior

### 1. **Input Params Must Match Exactly**

Copilot must map all incoming parameters from Next Router to tRPC input schemas.

Example:

```ts
// Old Next.js App Router (req.json() or searchParams)
const { id, status } = await req.json();
```

Must become:

```ts
input: z.object({
  id: z.number(),
  status: z.string().optional(),
})
```

### Required rules:

* Query params → become tRPC input
* Body JSON → become tRPC input
* Path params → MUST be included in input schema
* Types must match the old API exactly
* Optional fields remain optional

---

### 2. **Error Handling Must Match Exactly**

Copilot must reproduce the same error structure the old API returned.

Example old API:

```ts
return NextResponse.json(
  { success: false, message: "Branch not found" },
  { status: 404 }
);
```

Required in tRPC:

```ts
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Branch not found",
});
```

### Notes:

* Choose the correct `TRPCError` code matching the old HTTP status:

  * 400 → `BAD_REQUEST`
  * 401 → `UNAUTHORIZED`
  * 403 → `FORBIDDEN`
  * 404 → `NOT_FOUND`
  * 409 → `CONFLICT`
  * 500 → `INTERNAL_SERVER_ERROR`

Copilot must never invent new messages or change the format.

---

### 3. **Success Response Must Match Exactly**

Old API:

```ts
return NextResponse.json({
  success: true,
  data,
});
```

Required in tRPC:

```ts
return {
  success: true,
  data,
};
```

No renaming.
No restructuring.
No adding fields.

---

### 4. **Database Logic Must Remain 100% Identical**

Whether you were using Prisma, pg, raw SQL…
Copilot must NOT modify logic.

* same queries
* same filters
* same joins
* same sorting
* same pagination
* same limit/offset
* same grouping
* same business rule

If old API checks permission before querying, tRPC must do the same.

---

### 5. **Path Structure Must Be Converted Properly**

Old:

```
/api/branches/[id]/route.ts
/api/reports/debts?type=summary
```

tRPC must convert into:

```ts
branchRouter.getById.query()
reportRouter.debtsSummary.query()
```

Naming convention:

* lowercase
* camelCase procedure names
* same domain grouping as your folder structure

---

### 6. **Input Normalization Must Match Next.js Behavior**

If old API used:

```ts
const id = Number(searchParams.get("id"));
```

Copilot must not change it into:

```ts
input.id: z.string()
```

→ Must stay `z.number()`.

If old API used comma-separated filtering (your rule #12),
Copilot must apply the same logic inside tRPC.

---

### 7. **Copilot Must Not Invent New Features**

Forbidden:

* New response structure
* New keys
* New validation
* New error messages
* New database logic
* New pagination method
* New sort logic
* New filter logic

The tRPC version must behave EXACTLY like the old API.

---

### 8. **Copilot Must Use Your Existing tRPC Config**

Copilot must respect:

* your `router.ts`
* your `context`
* your middleware
* your protected/unprotected procedures
* your database instance (`db`)
* your error formatting rules

---

## ✔ Rule Summary (short for Copilot)

> When converting any Next.js App Router API to tRPC, Copilot must preserve **100% of the original behavior**, including params, validation, queries, success responses, error formats, and business logic.
>
> The tRPC version must feel identical to the old API from the client's perspective.

