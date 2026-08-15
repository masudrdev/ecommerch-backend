function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

export default function SalesChart({
  data = [],
  chartPeriod,
  handleChartPeriodChange,
  chartLoading,
}) {
  const maxRevenue = Math.max(...data.map((item) => item.revenue || 0), 1);
  const hasData = data.some((item) => Number(item.revenue || 0) > 0);

  const periods = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "90 Days", value: "90d" },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">Sales Chart</h2>

        <div className="flex flex-wrap gap-2">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleChartPeriodChange(item.value)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                chartPeriod === item.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {chartLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl bg-[#0F172A]">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Loading chart...
            </div>
          </div>
        ) : !data.length || !hasData ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-[#0F172A] p-6 text-center">
            <div className="text-4xl">📈</div>
            <h3 className="mt-3 text-lg font-semibold text-white">
              No sales data found
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Sales data will appear here after delivered or completed orders.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <div className="overflow-x-auto rounded-xl bg-[#0F172A]">
              <div
                className="flex h-64 min-w-max items-end gap-3 p-4"
                style={{ width: `${Math.max(data.length * 54, 320)}px` }}
              >
                {data.map((item) => {
                  const height = Math.max(
                    (item.revenue / maxRevenue) * 100,
                    6
                  );

                  return (
                    <div
                      key={item.date}
                      className="group relative flex w-10 shrink-0 flex-col items-center gap-2"
                    >
                      <div className="flex h-44 w-full items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-blue-700 to-blue-400 transition-all duration-500 hover:from-blue-600 hover:to-blue-300"
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 hidden w-36 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950 p-3 text-xs shadow-lg group-hover:block">
                        <p className="font-semibold text-white">{item.date}</p>
                        <p className="mt-1 text-gray-300">
                          Revenue:{" "}
                          <span className="font-semibold text-blue-300">
                            {money(item.revenue)}
                          </span>
                        </p>
                        <p className="mt-1 text-gray-300">
                          Orders:{" "}
                          <span className="font-semibold text-green-300">
                            {item.orders || 0}
                          </span>
                        </p>
                      </div>

                      <p className="max-w-[44px] truncate text-xs text-gray-400">
                        {item.date}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Swipe / scroll horizontally to view all chart data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}