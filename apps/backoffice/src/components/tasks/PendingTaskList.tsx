import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { PendingTask } from '@hosteleria/api-client';
import { describeTask } from '@/lib/tasks';

interface Props {
  slug: string;
  tasks: PendingTask[];
  localeNames: Record<string, string>;
}

/** Cada tarea es un enlace al sitio donde se arregla. */
export function PendingTaskList({ slug, tasks, localeNames }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {tasks.map(task => {
        const line = describeTask(task, slug, localeNames);
        return (
          <li key={line.id}>
            <Link
              href={line.href}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2.5 transition-colors hover:border-[color:var(--color-copper-300)]"
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold leading-[1.4] text-[color:var(--color-ink)]">{line.text}</span>
                {line.detail && <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[color:var(--color-muted)]">{line.detail}</span>}
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)]" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
