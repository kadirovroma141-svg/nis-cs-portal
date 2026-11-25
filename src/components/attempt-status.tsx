import { Badge } from "@/components/ui/badge";
import type { AttemptStatus } from "@/lib/db-types";
import { T } from "@/components/ui/t";

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  switch (status) {
    case "IN_PROGRESS":
      return <Badge tone="info"><T s="In progress" /></Badge>;
    case "SUBMITTED":
      return <Badge tone="warning"><T s="Marking" /></Badge>;
    case "REVIEW_REQUIRED":
      return <Badge tone="warning"><T s="Teacher review" /></Badge>;
    case "GRADED":
      return <Badge tone="success"><T s="Graded" /></Badge>;
  }
}
