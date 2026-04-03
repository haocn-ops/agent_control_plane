import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AdminWeek8ReadinessMetric = {
  label: string;
  count: number | string;
  status: string;
  tone?: "strong" | "default" | "subtle";
  detail?: string;
  href?: string;
  active?: boolean;
};

export function AdminWeek8ReadinessCard({
  description,
  metrics,
  primaryAction,
}: {
  description?: string;
  metrics: AdminWeek8ReadinessMetric[];
  primaryAction?: { label: string; href: string };
}) {
  if (!metrics.length) {
    return null;
  }

  return (
    <Card className="rounded-2xl border border-border bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-sm font-semibold">
          <span>Week 8 readiness summary</span>
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="text-[0.65rem] font-medium text-foreground underline underline-offset-4"
            >
              {primaryAction.label}
            </Link>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted">
        {description ? <p className="text-xs text-foreground">{description}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => {
            const tileClasses = [
              "flex flex-col gap-1 rounded-2xl border bg-card/70 p-3 shadow-sm transition",
              metric.active ? "border-foreground/80 bg-foreground/10" : "border-border",
              metric.href ? "hover:border-foreground" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const tileContent = (
              <div key={metric.label} className={tileClasses}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{metric.label}</p>
                  <Badge variant={metric.tone ?? "default"}>{metric.status}</Badge>
                </div>
                <p className="text-lg font-semibold text-foreground">{metric.count}</p>
                {metric.detail ? (
                  <p className="text-[0.7rem] text-muted">{metric.detail}</p>
                ) : null}
              </div>
            );

            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className="text-inherit"
                aria-current={metric.active ? "true" : undefined}
              >
                {tileContent}
              </Link>
            ) : (
              tileContent
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
