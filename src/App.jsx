import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import AdminScreen from './AdminScreen';
import TechScreen from './TechScreen';

export default function App() {
  const [userSession, setUserSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // التحقق من وجود تسجيل دخول مسبق عند تحديث الصفحة
  useEffect(() => {
    const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (session) {
      setUserSession(JSON.parse(session));
    }
    setIsLoading(false);
  }, []);

  // دالة تسجيل الخروج الموحدة
  const handleLogout = () => {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
    setUserSession(null);
  };

  // شاشة التحميل الأولية
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p>جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  // 1. إذا لم يكن مسجلاً، اظهر شاشة الدخول
  if (!userSession) {
    return <LoginScreen onLogin={setUserSession} />;
  }

  // 2. توجيه أمين المخزن (الإدارة)
  if (userSession.role === 'admin') {
    return <AdminScreen user={userSession} onLogout={handleLogout} />;
  }

  // 3. توجيه الفني
  if (userSession.role === 'tech') {
    return <TechScreen user={userSession} onLogout={handleLogout} />;
  }

  // 4. في حال وجود خطأ في الصلاحيات (Role غير معروف)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-bold font-sans gap-4" dir="rtl">
      <p className="text-red-500 text-lg">حدث خطأ: دور المستخدم ({userSession.role}) غير مدعوم في هذا النظام!</p>
      <button onClick={handleLogout} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl transition-colors">
        تسجيل خروج والعودة
      </button>
    </div>
  );
}