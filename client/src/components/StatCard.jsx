function StatCard({ label, value, accent = "indigo" }) {
  const accentClasses = {
    indigo: "text-indigo-600 bg-indigo-50",
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    slate: "text-slate-600 bg-slate-100",
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2">
      <span className={`text-xs font-medium px-2 py-1 rounded-full w-fit ${accentClasses[accent]}`}>
        {label}
      </span>
      <span className="text-2xl font-bold text-slate-800">{value}</span>
    </div>
  );
}

export default StatCard;
