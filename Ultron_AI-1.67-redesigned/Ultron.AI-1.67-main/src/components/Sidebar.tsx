import type { Conversation } from "~/lib/ultron";
import { APP_TAGLINE, APP_VERSION, timeAgo } from "~/lib/ultron";
import { IconGear, IconPlus, IconTrash, ULTRONMark } from "~/components/icons";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  view: "chat" | "settings";
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
};

export function Sidebar({
  conversations,
  activeId,
  view,
  onNewChat,
  onSelect,
  onDelete,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-graphite-700/60 bg-graphite-900">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <ULTRONMark size={27} />
        <div className="leading-tight">
          <div className="text-[13.5px] font-semibold tracking-[0.16em] text-ink">ULTRON</div>
          <div className="mt-0.5 text-[10.5px] text-ink-muted">{APP_TAGLINE}</div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3.5 pb-4">
        <button
          type="button"
          onClick={onNewChat}
          className="group flex h-9 w-full items-center justify-center gap-2 rounded-[9px] border border-graphite-600/70 bg-graphite-800 text-[12.5px] font-medium text-ink/90 transition-all duration-150 ease-out hover:border-crimson/40 hover:bg-graphite-800/80 hover:text-ink active:scale-[0.985]"
        >
          <IconPlus size={14} className="text-ink-muted transition-colors group-hover:text-crimson" />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex min-h-0 flex-1 flex-col px-2.5">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted/70">
          Recent
        </div>
        <div className="ultron-scroll min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          <ul className="space-y-[3px]">
            {conversations.map((c) => {
              const active = c.id === activeId && view === "chat";
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={
                      "flex w-full flex-col items-stretch rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 ease-out " +
                      (active ? "bg-graphite-800" : "hover:bg-graphite-800/60")
                    }
                  >
                    {active && (
                      <span className="pointer-events-none absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-crimson" />
                    )}
                    <span
                      className={
                        "truncate pr-6 text-[12.5px] leading-snug " +
                        (active ? "font-medium text-ink" : "text-ink-soft")
                      }
                    >
                      {c.title}
                    </span>
                    <span className="mt-0.5 text-[10.5px] text-ink-muted">
                      {c.messages.length > 0
                        ? `${timeAgo(c.updatedAt)} · ${c.messages.length} msg${c.messages.length === 1 ? "" : "s"}`
                        : timeAgo(c.updatedAt)}
                    </span>
                  </button>
                  {/* Delete affordance — revealed on hover */}
                  <button
                    type="button"
                    title="Delete conversation"
                    aria-label={`Delete ${c.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className="absolute right-1.5 top-2 flex h-6 w-6 items-center justify-center rounded-md text-ink-muted/60 opacity-0 transition-all duration-150 ease-out hover:bg-crimson-soft hover:text-crimson focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <IconTrash size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Bottom: version + settings */}
      <div className="border-t border-graphite-700/60 px-3 pb-3.5 pt-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className={
            "flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors duration-150 ease-out " +
            (view === "settings"
              ? "bg-graphite-800 text-ink"
              : "text-ink-soft hover:bg-graphite-800/60 hover:text-ink")
          }
        >
          <IconGear size={15} className={view === "settings" ? "text-crimson" : "text-ink-muted"} />
          Settings
        </button>
        <div className="mt-2.5 px-2.5 text-[10px] tracking-wide text-ink-muted/50">
          ULTRON v{APP_VERSION} · UI preview
        </div>
      </div>
    </aside>
  );
}
