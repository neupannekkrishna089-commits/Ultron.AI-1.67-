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
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-graphite-700/70 bg-graphite-900">
      {/* Wordmark */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <ULTRONMark size={26} />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-[0.14em] text-ink">ULTRON</div>
            <div className="text-[10.5px] text-ink-muted">{APP_TAGLINE}</div>
          </div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-crimson text-[13px] font-semibold text-white transition-all duration-150 ease-out hover:bg-crimson-hover active:scale-[0.98]"
          style={{ boxShadow: "0 0 22px rgba(220, 30, 58, 0.18)" }}
        >
          <IconPlus size={15} />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex min-h-0 flex-1 flex-col px-2">
        <div className="px-2 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted/80">
          Recent
        </div>
        <div className="ultron-scroll min-h-0 flex-1 overflow-y-auto pb-2 pr-0.5">
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId && view === "chat";
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={
                      "flex w-full flex-col items-stretch rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out " +
                      (active
                        ? "bg-crimson/10 ring-1 ring-inset ring-crimson/25"
                        : "hover:bg-graphite-800")
                    }
                  >
                    <span
                      className={
                        "truncate pr-6 text-[13px] leading-snug " +
                        (active ? "font-medium text-ink" : "text-ink/90")
                      }
                    >
                      {c.title}
                    </span>
                    <span className="mt-0.5 text-[11px] text-ink-muted">
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
                    className="absolute right-1.5 top-2 flex h-6 w-6 items-center justify-center rounded-md text-ink-muted/70 opacity-0 transition-all duration-150 ease-out hover:bg-crimson/15 hover:text-crimson focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <IconTrash size={13.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Bottom: version + settings */}
      <div className="border-t border-graphite-700/70 px-3 pb-3 pt-2">
        <div className="px-2 pb-1.5 text-[10.5px] text-ink-muted/70">
          ULTRON v{APP_VERSION} · UI preview
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className={
            "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 ease-out " +
            (view === "settings"
              ? "bg-crimson/10 text-crimson ring-1 ring-inset ring-crimson/25"
              : "text-ink/85 hover:bg-graphite-800 hover:text-ink")
          }
        >
          <IconGear size={15} />
          Settings
        </button>
      </div>
    </aside>
  );
}
