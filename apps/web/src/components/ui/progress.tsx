import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Completion in percent (0–100). Ignored while `indeterminate`. */
    value?: number
    /**
     * Renders a looping sweep instead of a fill — for "work has started but
     * there is no percentage yet" (e.g. the PENDING window before the first
     * SSE progress event arrives).
     */
    indeterminate?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value, indeterminate = false, ...props }, ref) => {
        // `Number.isFinite` rather than `value ?? 0`: callers derive the value
        // from divisions that can yield NaN (a 0-of-0 usage quota), and NaN
        // would survive the clamp and render `translateX(-NaN%)` — an invalid
        // declaration the CSSOM drops, leaving a bar that looks 100 % full.
        const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value as number)) : 0

        return (
            <div
                ref={ref}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
                className={cn(
                    "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
                    className
                )}
                {...props}
            >
                {indeterminate ? (
                    <div className="motion-progress-indeterminate h-full bg-primary" />
                ) : (
                    <div
                        className="h-full w-full flex-1 bg-primary transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${100 - clamped}%)` }}
                    />
                )}
            </div>
        )
    }
)
Progress.displayName = "Progress"

export { Progress }
