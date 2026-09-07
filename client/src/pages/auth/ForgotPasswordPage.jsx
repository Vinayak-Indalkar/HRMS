import React, { useState } from 'react';
import { Building2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export const ForgotPasswordPage = ({ onNavigateToLogin, onNavigateToReset }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to request reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block bg-white p-2.5 rounded-2xl shadow-xl mb-3">
          <img
            src="/logo.png"
            alt="Quantira Technologies"
            className="h-10 w-auto object-contain mx-auto"
          />
        </div>
        <h2 className="text-xl font-bold text-white">Reset Account Password</h2>
        <p className="mt-1 text-xs text-slate-400">Quantira Technologies Account Recovery</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-100">
          {result ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Reset Token Generated</h3>
              <p className="text-xs text-slate-600 mt-2 mb-4 leading-relaxed">
                For evaluation purposes, a simulation reset token has been generated:
              </p>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs font-semibold text-slate-800 break-all mb-5">
                Token: {result.reset_token || 'demo-token'}
              </div>
              <button
                type="button"
                onClick={() => onNavigateToReset(email, result.reset_token)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all mb-2"
              >
                Proceed to Set New Password
              </button>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
              >
                {loading ? 'Sending...' : 'Generate Reset Token'}
              </button>

              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
