# Shared Components - Loading States & Skeletons

This directory contains reusable loading and skeleton components for consistent UX across the application.

## Components

### Loading Components (`loading.tsx`)

#### `Spinner`
Animated loading spinner with size variants.

```tsx
import { Spinner } from '@/components/ui/spinner';

// Usage
<Spinner size="sm" />      // Small
<Spinner size="default" />  // Default
<Spinner size="lg" />       // Large
<Spinner size="xl" />       // Extra Large
<Spinner label="Custom loading message" />
```

#### `FullPageLoader`
Full-page overlay with backdrop blur for blocking interactions.

```tsx
import { FullPageLoader } from '@/components/shared/loading';

// Usage
<FullPageLoader message="Loading application..." />
```

#### `CenteredLoader`
Centered loading indicator for containers.

```tsx
import { CenteredLoader } from '@/components/shared/loading';

// Usage
<CenteredLoader message="Loading data..." />
```

#### `InlineLoader`
Inline loading indicator with optional message.

```tsx
import { InlineLoader } from '@/components/shared/loading';

// Usage
<InlineLoader message="Processing..." size="sm" />
<InlineLoader message="Loading content..." />
```

### Skeleton Components (`skeletons.tsx`)

#### `Skeleton`
Base skeleton component with pulse animation.

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Usage
<Skeleton className="h-10 w-full" />
<Skeleton className="h-4 w-3/4" />
```

#### Specialized Skeletons

##### `ProfileSkeleton`
Complete profile page skeleton with header and multiple cards.

```tsx
import { ProfileSkeleton } from '@/components/shared/skeletons';

if (isLoading) {
  return <ProfileSkeleton />;
}
```

##### `ProfileCardSkeleton`
Individual profile card skeleton.

```tsx
import { ProfileCardSkeleton } from '@/components/shared/skeletons';

<ProfileCardSkeleton />
```

##### `ApplicationCardSkeleton`
Skeleton for application list items.

```tsx
import { ApplicationCardSkeleton } from '@/components/shared/skeletons';

if (isLoading) {
  return (
    <>
      <ApplicationCardSkeleton />
      <ApplicationCardSkeleton />
      <ApplicationCardSkeleton />
    </>
  );
}
```

##### `JobPostingCardSkeleton`
Skeleton for job posting cards.

```tsx
import { JobPostingCardSkeleton } from '@/components/shared/skeletons';

<JobPostingCardSkeleton />
```

##### `FormFieldSkeleton`
Skeleton for form inputs.

```tsx
import { FormFieldSkeleton } from '@/components/shared/skeletons';

<FormFieldSkeleton />
```

##### `TableSkeleton`
Configurable table skeleton.

```tsx
import { TableSkeleton } from '@/components/shared/skeletons';

<TableSkeleton rows={5} columns={4} />
```

##### `TextSkeleton`
Skeleton for text content with configurable lines.

```tsx
import { TextSkeleton } from '@/components/shared/skeletons';

<TextSkeleton lines={3} />
```

##### `AvatarSkeleton`
Circular skeleton for avatars.

```tsx
import { AvatarSkeleton } from '@/components/shared/skeletons';

<AvatarSkeleton />
<AvatarSkeleton className="h-12 w-12" />
```

##### `ButtonSkeleton`
Skeleton for buttons.

```tsx
import { ButtonSkeleton } from '@/components/shared/skeletons';

<ButtonSkeleton />
<ButtonSkeleton className="w-32" />
```

##### `ImageSkeleton`
Skeleton for images with aspect ratio options.

```tsx
import { ImageSkeleton } from '@/components/shared/skeletons';

<ImageSkeleton aspectRatio="square" />   // 1:1
<ImageSkeleton aspectRatio="video" />    // 16:9
<ImageSkeleton aspectRatio="portrait" /> // 3:4
```

##### `DashboardSkeleton`
Full `/dashboard` skeleton — hero, stat strip and the card grid, sized to the
loaded layout so the swap doesn't shift content.

```tsx
import { DashboardSkeleton } from '@/components/shared/skeletons';

if (isLoading) return <DashboardSkeleton />;
```

##### `ListRowSkeleton` / `ListCardSkeleton`
Divided list rows inside a card — used by the job-postings list.

```tsx
import { ListCardSkeleton } from '@/components/shared/skeletons';

<ListCardSkeleton rows={3} />
```

##### `SessionCardSkeleton`
Skeleton for the session cards under `/settings/sessions`.

```tsx
import { SessionCardSkeleton } from '@/components/shared/skeletons';

<SessionCardSkeleton />
```

### Error State (`@/components/ui/error-state`)

#### `ErrorState`
The counterpart to a loading state: shown when the fetch fails. Same visual
rhythm as `EmptyState`, with a retry button wired to TanStack Query's
`refetch`. Title and description default to the localised
`common.errorState.*` strings.

```tsx
import { ErrorState } from '@/components/ui/error-state';

const { data, isLoading, isError, isFetching, refetch } = useApplications();

if (isLoading) return <ApplicationCardSkeleton />;
if (isError) return <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;
```

Pass `title` / `description` when the route already has more specific copy
(e.g. `analytics.page.errorTitle`).

### Button Loading State

The `Button` component now supports a `loading` prop for inline loading states.

```tsx
import { Button } from '@/components/ui/button';

<Button loading={isPending}>
  Submit
</Button>

// The spinner is automatically added when loading=true
// The button is automatically disabled when loading=true
```

## Accessibility

All loading components include proper ARIA attributes:
- `role="status"` - Indicates loading status
- `aria-label` - Descriptive text for screen readers
- `sr-only` class - Screen reader only text

## Design Principles

1. **Match skeleton shapes to actual content** - Skeletons should closely match the layout of the loaded content
2. **Use subtle animation** - Pulse animation is less distracting than spinner in most cases
3. **Maintain layout stability** - No content shift when loading completes
4. **Accessible** - All components include screen reader support
5. **Reusable** - Composable components that can be used across the app
6. **No flicker on fast loads** - Page-level skeletons carry the `loading-in`
   class (defined in `app/globals.css`), which fades them in after 150 ms. A
   load that finishes faster than that never shows a skeleton at all, and no
   artificial minimum display time is added. The animation is disabled under
   `prefers-reduced-motion: reduce`.

## Examples

### Profile Page Loading

```tsx
import { ProfileSkeleton } from '@/components/shared/skeletons';

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    // ... profile content
  );
}
```

### Application List Loading

```tsx
import { ApplicationCardSkeleton } from '@/components/shared/skeletons';

export default function ApplicationsPage() {
  const { data: applications, isLoading } = useApplications();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
      </div>
    );
  }

  return (
    // ... applications list
  );
}
```

### Button with Loading State

```tsx
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';

function SubmitForm() {
  const mutation = useMutation({ /* ... */ });

  return (
    <Button 
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
    >
      Submit Application
    </Button>
  );
}
```

## Demo Page

A demo page showcasing all loading components is available at `/demo-loading` (requires authentication).
