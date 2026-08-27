function Navbar({ userName = "Manager" }) {
  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-4">
      <h1 className="text-xl font-semibold text-slate-800">NexOra</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{userName}</span>
        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium">
          {userName.charAt(0)}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
