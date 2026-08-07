import type { SVGProps } from 'react';

const paths: Record<string, React.ReactNode> = {
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  map: <><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" /><path d="M9 4v14M15 6v14" /></>,
  board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
  archive: <><path d="M4 7h16v13H4zM3 4h18v3H3z" /><path d="M9 11h6" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  fit: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
  undo: <><path d="m9 7-5 5 5 5" /><path d="M4 12h9a7 7 0 0 1 7 7" /></>,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M20 12h-9a7 7 0 0 0-7 7" /></>,
  layout: <><rect x="3" y="8" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 11h3V6h3M12 11v7h3" /></>,
  zoomIn: <><circle cx="10" cy="10" r="6" /><path d="M10 7v6M7 10h6m2.5 5.5L21 21" /></>,
  zoomOut: <><circle cx="10" cy="10" r="6" /><path d="M7 10h6m2.5 5.5L21 21" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  child: <><circle cx="6" cy="7" r="2" /><circle cx="18" cy="17" r="2" /><path d="M8 7h4v10h4" /></>,
  sibling: <><circle cx="5" cy="7" r="2" /><circle cx="19" cy="7" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7 7h10M12 7v9" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /><path d="M10 11v6M14 11v6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 20h14" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M5 20h14" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1 1-1 1.8M12 17h.01" /></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  back: <path d="m15 18-6-6 6-6" />,
  settings: <><path strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" /><path strokeWidth="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></>,
};

export function Icon({ name, size = 20, ...props }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
