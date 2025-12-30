import { Users } from "lucide-react"

interface RemoteUsersPanelProps {
  remoteUsers: Record<string, string | undefined> | undefined
}

export function RemoteUsersPanel({ remoteUsers }: RemoteUsersPanelProps) {
  const count = Object.keys(remoteUsers || {}).length

  return (
    <section className="flex flex-col p-2 h-full min-h-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            Connected peers
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {count}
        </span>
      </div>

      <div className="flex-1 min-h-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-2 overflow-y-auto space-y-2">
        {count === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
            No remote users connected yet.
          </p>
        ) : (
          Object.entries(remoteUsers || {}).map(([id, name]) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 px-2 py-2 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-[10px] font-semibold text-white shadow-sm shadow-blue-600/20 dark:shadow-blue-500/20">
                  {String(name || id)
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {id}
                  </span>
                </div>
              </div>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
