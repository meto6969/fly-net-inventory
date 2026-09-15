import React, { useState } from 'react';
import { FiLock, FiUser, FiLogIn } from 'react-icons/fi';
import { supabase } from './supabase'; 

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const trimmedUsername = username.trim();

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', trimmedUsername)
        .eq('password', password)
        .single();

      if (fetchError || !data) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة!');
        setIsLoading(false);
        return;
      }

      const userData = {
        role: data.role, 
        username: data.username,
        name: data.name,
        id: data.id
      };

      if (rememberMe) {
        localStorage.setItem('userSession', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('userSession', JSON.stringify(userData));
      }
      
      onLogin(userData);
      
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بقاعدة البيانات.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-800/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-md relative z-10">
        
        {/* 🌟 تم إضافة الشعار هنا */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.jpeg" alt="Fly Tech Logo" className="h-28 w-28 object-cover rounded-3xl shadow-2xl border-2 border-slate-600" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider mb-2">Fly Teck</h1>
          <p className="text-slate-400 text-sm">بوابة الدخول لنظام المخازن والعُهد</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-bold">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">اسم المستخدم</label>
            <div className="relative">
              <FiUser className="absolute right-4 top-3.5 text-slate-400" size={18} />
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم" dir="ltr" className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">كلمة المرور</label>
            <div className="relative">
              <FiLock className="absolute right-4 top-3.5 text-slate-400" size={18} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left tracking-widest" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-blue-500 focus:ring-blue-500" />
            <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer select-none">تذكرني والبقاء مسجلاً</label>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-70">
            {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><FiLogIn size={20} /><span>تسجيل الدخول</span></>}
          </button>
        </form>
      </div>
    </div>
  );
}