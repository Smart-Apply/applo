import Link from 'next/link';
import type { Crumb } from '@/lib/seo/json-ld';

/**
 * Visible breadcrumb trail. Paired with the `BreadcrumbList` JSON-LD the
 * pages emit — Google wants the markup to describe a trail the visitor can
 * actually see and click, not a hidden one.
 *
 * The last crumb is the current page, so it is rendered as text and marked
 * `aria-current` rather than linking to itself.
 */
export function SeoBreadcrumbs({ crumbs, label }: { crumbs: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="seo-crumbs">
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.path}>
              {isLast ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={crumb.path}>{crumb.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
