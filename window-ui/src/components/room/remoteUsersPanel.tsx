import { Users } from "lucide-react"

interface RemoteUsersPanelProps {
  remoteUsers: Record<string, string | undefined> | undefined
}

export function RemoteUsersPanel({ remoteUsers }: RemoteUsersPanelProps) {
  const count = Object.keys(remoteUsers || {}).length

  return (
    <section className="flex flex-col p-2 h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            Connected peers
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {count}
        </span>
      </div>

      <div className="flex-1 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 px-2 py-2 overflow-y-auto space-y-2">
        {count === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
            No remote users connected yet.
          </p>
        ) : (
          Object.entries(remoteUsers || {}).map(([id, name]) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg bg-white/90 dark:bg-gray-900/90 px-2 py-2 shadow-sm border border-gray-200/70 dark:border-gray-700/70"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-semibold text-white">
                  {String(name || id)
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                    {name || "Unknown"}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {id}
                  </span>
                </div>
              </div>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
