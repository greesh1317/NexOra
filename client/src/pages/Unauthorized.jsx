import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Access restricted</h1>
        <p className="text-sm text-slate-500 mb-6">
          Your account role doesn't have access to that page.
        </p>
        <Link
          to="/login"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;
