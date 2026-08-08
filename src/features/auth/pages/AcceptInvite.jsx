import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/apiClient";
import PasswordInput from "@/components/PasswordInput";
import logo from "@/assets/goget-mark.png";

export default function AcceptInvite() {
  const { token } = useParams();
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .getInvite(token)
      .then((data) => {
        if (cancelled) return;
        setInvite(data);
        setFullName(data.full_name || "");
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "This invitation link is invalid.");
      })
      .finally(() => {
        if (!cancelled) setLoadingInvite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await acceptInvite({ token, password, full_name: fullName });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="GOGET CRM" className="h-20 mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            GOGET CRM
          </h1>
        </div>

        {loadingInvite && (
          <p className="text-center text-sm text-slate-500">Checking your invitation…</p>
        )}

        {!loadingInvite && loadError && (
          <div className="text-center space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {loadError}
            </div>
            <Link to="/login" className="text-primary font-semibold hover:underline text-sm">
              Go to sign in
            </Link>
          </div>
        )}

        {!loadingInvite && !loadError && invite && (
          <>
            <p className="text-sm text-slate-500 text-center mb-6">
              You've been invited to join <span className="font-semibold text-slate-700">{invite.firm_name}</span> on
              GOGET CRM as <span className="font-semibold text-slate-700">{invite.role}</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Email
                </label>
                <input
                  value={invite.email}
                  disabled
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Confirm Password
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-purple-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-opacity"
              >
                {submitting ? "Joining…" : "Accept & Join"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
