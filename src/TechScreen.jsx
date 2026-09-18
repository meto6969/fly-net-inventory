import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { openDB } from 'idb';
import { FiBox, FiLogOut, FiShoppingCart, FiX, FiCheckCircle, FiAlertCircle, FiWifiOff, FiRefreshCw, FiPlus, FiTrash2, FiUser, FiPhone, FiDollarSign, FiPrinter } from 'react-icons/fi';

const getLocalTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// تهيئة قاعدة البيانات المحلية للأوفلاين
const initDB = async () => {
  return openDB('flyteck-offline-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export default function TechScreen({ user, onLogout }) {
  const [techInventory, setTechInventory] = useState([]);
  const [mainItems, setMainItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // حالات نافذة الصرف (السلة)
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [dispenseCustomerName, setDispenseCustomerName] = useState('');
  const [dispenseCustomerPhone, setDispenseCustomerPhone] = useState('');
  const [subscriptionFee, setSubscriptionFee] = useState(''); 
  
  // 🌟 قائمة البائعين الجديدة
  const sellerOptions = ['حسن زهير', 'مصطفى', 'زينب', 'فاطمة'];
  const [selectedSeller, setSelectedSeller] = useState('');

  // حالات إضافة مادة واحدة للسلة
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);

  // حالة بيانات الطباعة
  const [printData, setPrintData] = useState(null);

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); processQueue(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkPendingSync();
    fetchData();

    const realtimeChannel = supabase
      .channel('tech_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_techs', filter: `techUsername=eq.${user.username}` }, () => fetchData())
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const fetchData = async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return; 
    }
    try {
      const [techRes, mainRes] = await Promise.all([
        supabase.from('inventory_techs').select('*').eq('techUsername', user.username),
        supabase.from('inventory_main').select('id, customerPrice')
      ]);
      if (techRes.error) throw techRes.error;
      
      const techData = techRes.data || [];
      const mainData = mainRes.data || [];
      
      const combinedData = techData.map(tItem => {
        const mItem = mainData.find(m => String(m.id) === String(tItem.itemId));
        return { ...tItem, customerPrice: mItem ? mItem.customerPrice : 0 };
      });

      setTechInventory(combinedData);
      setMainItems(mainData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingSync = async () => {
    try {
      const db = await initDB();
      const allItems = await db.getAll('sync-queue');
      setPendingSyncCount(allItems.length);
    } catch (e) {
      console.error(e);
    }
  };

  const saveToQueue = async (action) => {
    try {
      const db = await initDB();
      await db.add('sync-queue', action);
      checkPendingSync();
    } catch (error) {
      console.error("Error saving to offline queue", error);
    }
  };

  const processQueue = async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const db = await initDB();
      const queue = await db.getAll('sync-queue');
      
      if (queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      showMsg('⏳ جاري مزامنة العمليات المعلقة مع السيرفر...');
      
      for (const item of queue) {
        if (item.type === 'dispense_item') {
           const { techItemId, deductQty, amount, date, note, created_by } = item.payload;
           
           if (techItemId) {
             const { data: currentTechItem } = await supabase.from('inventory_techs').select('quantity').eq('id', techItemId).single();
             if (currentTechItem) {
                await supabase.from('inventory_techs').update({ quantity: Number(currentTechItem.quantity) - deductQty }).eq('id', techItemId);
             }
           }
           
           await supabase.from('safe_manual_entries').insert([{
             amount: amount,
             date: date,
             note: note,
             is_paid: false, 
             created_by: created_by
           }]);
        }
        await db.delete('sync-queue', item.id);
      }
      
      showMsg('✅ تمت مزامنة جميع العمليات بنجاح!');
      checkPendingSync();
      fetchData();
    } catch (error) {
      console.error("Error processing queue", error);
      showMsg('⚠️ حدث خطأ أثناء المزامنة، سيتم المحاولة لاحقاً.');
    }
    setIsSyncing(false);
  };

  const handleItemSelect = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    const item = techInventory.find(i => String(i.itemId) === String(id));
    if (item) {
      setCustomPrice(item.customerPrice);
    } else {
      setCustomPrice('');
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedItemId || selectedQty < 1) return;

    const item = techInventory.find(i => String(i.itemId) === String(selectedItemId));
    if (!item) return;

    const existingCartItem = cart.find(c => String(c.itemId) === String(selectedItemId));
    const totalWanted = existingCartItem ? existingCartItem.qty + Number(selectedQty) : Number(selectedQty);

    if (totalWanted > item.quantity) {
      alert(`عذراً! الكمية المتوفرة في عهدتك من ${item.itemName} هي ${item.quantity} فقط.`);
      return;
    }

    const priceToUse = isFree ? 0 : Number(customPrice);

    if (existingCartItem) {
      setCart(cart.map(c => String(c.itemId) === String(selectedItemId) ? { ...c, qty: c.qty + Number(selectedQty), price: priceToUse, isFree: isFree } : c));
    } else {
      setCart([...cart, { 
        techItemId: item.id, 
        itemId: item.itemId, 
        itemName: item.itemName, 
        qty: Number(selectedQty), 
        price: priceToUse, 
        isFree: isFree 
      }]);
    }

    setSelectedItemId('');
    setSelectedQty(1);
    setCustomPrice('');
    setIsFree(false);
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(cart.filter(c => String(c.itemId) !== String(itemId)));
  };

  // 🌟 دالة للطباعة فقط (لا تحفظ في المخزن)
  const handlePrintOnly = () => {
    const subFeeNum = Number(subscriptionFee) || 0;
    const totalMaterialsPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    if (cart.length === 0 && subFeeNum === 0) {
      alert("الفاتورة فارغة! يرجى إضافة مواد أو أجور اشتراك للطباعة.");
      return;
    }

    const invoiceNum = Math.floor(100000 + Math.random() * 900000);

    // التحقق من البائع: إما من القائمة (إذا كان shop) أو اسم المستخدم الحالي
    const finalSeller = user?.username === 'shop' ? (selectedSeller || 'غير محدد') : (user?.name || 'غير محدد');

    setPrintData({
      invoiceNumber: invoiceNum,
      displayDate: formatDate(new Date().toISOString()),
      seller: finalSeller,
      buyer: `${dispenseCustomerName || 'زبون نقدي'} - ${dispenseCustomerPhone || '-'}`,
      items: cart.map(c => ({
        itemName: c.itemName,
        quantity: c.qty,
        sellPrice: c.price,
        isFree: c.isFree,
      })),
      subscriptionPrice: subFeeNum,
      materialsPrice: totalMaterialsPrice
    });

    setTimeout(() => window.print(), 300);
  };

  // 🌟 دالة للحفظ والتأكيد فقط
  const handleCartSubmit = async (e) => {
    e.preventDefault();
    if (!dispenseCustomerName || !dispenseCustomerPhone) {
      alert("يرجى إدخال اسم المشترك ورقم هاتفه أولاً.");
      return;
    }
    
    // التحقق من اختيار البائع إذا كان الحساب shop
    if (user?.username === 'shop' && !selectedSeller) {
      alert("يرجى اختيار اسم البائع من القائمة.");
      return;
    }
    
    const subFeeNum = Number(subscriptionFee) || 0;
    if (cart.length === 0 && subFeeNum === 0) {
      alert("الفاتورة فارغة! يرجى إضافة مواد أو أجور اشتراك.");
      return;
    }

    setIsDispensing(true);
    const todayDate = getLocalTodayDate();
    let currentOfflineStatus = !navigator.onLine;
    const exactTimestamp = new Date().toISOString(); 

    const finalSeller = user?.username === 'shop' ? selectedSeller : user?.name;

    try {
      if (subFeeNum > 0) {
        const subNoteStr = `أجور اشتراك | المشتري: ${dispenseCustomerName} - ${dispenseCustomerPhone} | البائع: ${finalSeller}`;
        
        if (currentOfflineStatus) {
          await saveToQueue({
            type: 'dispense_item',
            payload: { techItemId: null, deductQty: 0, amount: subFeeNum, date: todayDate, note: subNoteStr, created_by: user.username }
          });
        } else {
          await supabase.from('safe_manual_entries').insert([{
            amount: subFeeNum,
            date: exactTimestamp,
            note: subNoteStr,
            is_paid: false, 
            created_by: user.username
          }]);
        }
      }

      for (const cartItem of cart) {
        const totalPrice = cartItem.price * cartItem.qty;
        const freeLabel = cartItem.isFree ? ' (مجاني)' : '';
        const noteStr = `بيع مباشر (مواد): ${cartItem.itemName} | العدد: ${cartItem.qty} | المشتري: ${dispenseCustomerName} - ${dispenseCustomerPhone}${freeLabel} | البائع: ${finalSeller}`;

        if (currentOfflineStatus) {
          await saveToQueue({
            type: 'dispense_item',
            payload: { techItemId: cartItem.techItemId, deductQty: cartItem.qty, amount: totalPrice, date: todayDate, note: noteStr, created_by: user.username }
          });
          const updatedInventory = techInventory.map(i => {
            if (String(i.itemId) === String(cartItem.itemId)) {
              return { ...i, quantity: i.quantity - cartItem.qty };
            }
            return i;
          });
          setTechInventory(updatedInventory);
        } else {
          const techItemData = techInventory.find(i => String(i.itemId) === String(cartItem.itemId));
          await supabase.from('inventory_techs')
            .update({ quantity: techItemData.quantity - cartItem.qty })
            .eq('id', cartItem.techItemId);

          await supabase.from('safe_manual_entries').insert([{
            amount: totalPrice,
            date: exactTimestamp,
            note: noteStr,
            is_paid: false, 
            created_by: user.username
          }]);
        }
      }

      showMsg(currentOfflineStatus ? '⚠️ تم الحفظ محلياً (لا يوجد إنترنت).' : '✅ تمت عملية الصرف بنجاح!');
      setIsDispenseModalOpen(false);
      setCart([]);
      setDispenseCustomerName('');
      setDispenseCustomerPhone('');
      setSubscriptionFee('');
      setSelectedSeller('');
      if (!currentOfflineStatus) fetchData();

    } catch (err) {
      alert("حدث خطأ أثناء الصرف: " + err.message);
    }
    setIsDispensing(false);
  };

  const totalCartMaterialsAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalGrandAmount = totalCartMaterialsAmount + (Number(subscriptionFee) || 0);

  return (
    <>
    {/* 🌟 كود الـ CSS المخصص لضبط حجم الورقة للطابعات الحرارية */}
    <style type="text/css">
      {`
        @media print {
          @page {
            size: 80mm auto !important;
            margin: 0 !important;
          }
          body, html {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}
    </style>

    <div className="min-h-screen bg-slate-50 font-sans print:hidden" dir="rtl">
      
      {msg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border-r-4 min-w-[300px] ${msg.includes('⚠️') || msg.includes('⏳') ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-emerald-50 border-emerald-500 text-emerald-800'}`}>
          {msg.includes('⚠️') || msg.includes('⏳') ? <FiAlertCircle size={22}/> : <FiCheckCircle size={22}/>}
          <p className="font-bold text-sm">{msg}</p>
        </div>
      )}

      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-xl shadow-sm">
            <img src="/logo.jpeg" alt="Fly Teck" className="h-10 w-10 object-cover rounded-lg" />
          </div>
          <div>
            <h1 className="font-black text-lg">نظام الفنيين</h1>
            <p className="text-slate-400 text-xs mt-0.5">مرحباً، {user?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isOffline ? (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-400/20">
              <FiWifiOff size={16} /> <span className="hidden sm:inline">أوفلاين</span>
            </div>
          ) : (
            pendingSyncCount > 0 && (
              <button onClick={processQueue} disabled={isSyncing} className="flex items-center gap-2 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-400/20 transition-colors">
                <FiRefreshCw className={isSyncing ? 'animate-spin' : ''} size={16} /> 
                <span className="hidden sm:inline">مزامنة ({pendingSyncCount})</span>
              </button>
            )
          )}
          <div className="w-px h-6 bg-slate-700 mx-1"></div>
          <button onClick={onLogout} className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 p-2 rounded-lg transition-colors" title="تسجيل خروج">
            <FiLogOut size={22} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FiBox className="text-blue-600" /> عُهدتي الحالية
          </h2>
          <button onClick={() => setIsDispenseModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all shadow-md">
            <FiShoppingCart size={18} /> صرف لمشترك / اشتراك
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-blue-600 font-bold">جاري تحميل العُهدة...</div>
        ) : techInventory.filter(i => i.quantity > 0).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FiBox size={32} />
            </div>
            <h3 className="text-slate-600 font-bold text-lg mb-2">عُهدتك فارغة حالياً</h3>
            <p className="text-slate-400 text-sm">لم يتم صرف أي مواد لك من المخزن الرئيسي بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {techInventory.filter(i => i.quantity > 0).map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{item.itemName}</h3>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{item.category}</span>
                  </div>
                  <div className="bg-blue-50 text-blue-700 w-12 h-12 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                    <span className="text-xs font-bold opacity-70 mb-[-4px]">العدد</span>
                    <span className="font-black text-xl">{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDispenseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-fade-in relative max-h-[95vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiShoppingCart className="text-blue-400"/> فاتورة مشتريات (مواد / اشتراكات)</h2>
              <button onClick={() => { setIsDispenseModalOpen(false); setCart([]); setDispenseCustomerName(''); setDispenseCustomerPhone(''); setSubscriptionFee(''); setSelectedSeller(''); }} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiUser/> اسم المشترك (إجباري)</label>
                  <input type="text" value={dispenseCustomerName} onChange={(e) => setDispenseCustomerName(e.target.value)} placeholder="الاسم الكامل" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiPhone/> رقم الهاتف (إجباري)</label>
                  <input type="tel" value={dispenseCustomerPhone} onChange={(e) => setDispenseCustomerPhone(e.target.value)} placeholder="07XX XXX XXXX" dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-100 outline-none text-right" />
                </div>
                
                {/* 🌟 إخفاء القائمة المنسدلة إذا كان الحساب غير shop */}
                {user?.username === 'shop' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiUser/> اسم الموظف البائع</label>
                    <select value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-700">
                      <option value="">اختر البائع...</option>
                      {sellerOptions.map(seller => (
                        <option key={seller} value={seller}>{seller}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-5">
                <label className="block text-sm font-black text-amber-900 mb-2 flex items-center gap-2"><FiDollarSign/> أجور الاشتراك / التركيب</label>
                <input 
                  type="number" 
                  min="0" 
                  value={subscriptionFee} 
                  onChange={(e) => setSubscriptionFee(e.target.value)} 
                  placeholder="أدخل المبلغ إن وجد (اختياري)..." 
                  className="w-full bg-white border border-amber-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-amber-300 outline-none font-bold text-amber-800" 
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 space-y-4">
                <label className="block text-sm font-black text-slate-700 border-b pb-2 mb-2">إضافة مواد للفاتورة (إن وجدت)</label>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">المادة المراد صرفها</label>
                  <select value={selectedItemId} onChange={handleItemSelect} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-sm">
                    <option value="">اختر المادة...</option>
                    {techInventory.filter(i => i.quantity > 0).map(item => (
                      <option key={item.id} value={item.itemId}>{item.itemName} (المتوفر: {item.quantity})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">العدد (الكمية)</label>
                    <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-200">
                      <button type="button" onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                      <span className="font-black text-slate-800">{selectedQty}</span>
                      <button type="button" onClick={() => setSelectedQty(selectedQty + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-200 text-blue-700 font-bold">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">السعر للمفرد (د.ع)</label>
                    <input 
                      type="number" 
                      min="0" 
                      disabled={isFree || !selectedItemId}
                      value={customPrice} 
                      onChange={(e) => setCustomPrice(e.target.value)} 
                      className={`w-full border rounded-xl py-2 px-3 outline-none font-bold h-[40px] text-sm ${isFree || !selectedItemId ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-blue-200 text-blue-700 focus:ring-2 focus:ring-blue-100'}`} 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button type="button" onClick={() => setIsFree(!isFree)} disabled={!selectedItemId} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${isFree ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'} disabled:opacity-50`}>
                    {isFree ? 'إلغاء المجاني' : 'صرف مجاني (بدون أجور)'}
                  </button>
                  <button type="button" onClick={handleAddToCart} disabled={!selectedItemId} className="bg-slate-800 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50">
                    <FiPlus size={16}/> إدراج بالسلة
                  </button>
                </div>
              </div>

              {cart.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-500 mb-2">المواد المضافة ({cart.length}):</p>
                  <div className="space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {cart.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{c.itemName}</span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {c.isFree ? <span className="text-rose-500">مجاني</span> : `${Number(c.price).toLocaleString()} د.ع للمفرد`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{c.qty}</span>
                          <button type="button" onClick={() => handleRemoveFromCart(c.itemId)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><FiTrash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-100 mt-4">
                <span className="font-bold text-sm">الإجمالي المطلوب للجميع:</span>
                <span className="font-black text-2xl">
                  {totalGrandAmount === 0 && cart.some(c => c.isFree) ? 'مجاني' : totalGrandAmount.toLocaleString()} 
                  {totalGrandAmount > 0 && <span className="text-sm font-bold mr-1">د.ع</span>}
                </span>
              </div>

              {/* 🌟 تعديل الأزرار: الطباعة فقط، والتأكيد للإدارة فقط */}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={handlePrintOnly} className="flex-1 bg-slate-800 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                  <FiPrinter /> طباعة الوصل فقط
                </button>
                <button type="button" onClick={handleCartSubmit} disabled={isDispensing || (cart.length === 0 && !subscriptionFee)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isDispensing ? <FiRefreshCw className="animate-spin" /> : <><FiCheckCircle /> تأكيد الحفظ بالمخزن</>}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>

    {/* 🌟 واجهة طباعة الوصل المخصصة لطابعات 80mm */}
    {printData && (
      <div className="hidden print:block w-[76mm] bg-white text-black font-sans mx-auto text-xs leading-tight p-2" dir="rtl">
         {/* ترويسة الوصل */}
         <div className="text-center mb-3">
           <img src="/logo.jpeg" className="w-14 h-14 mx-auto grayscale" alt="Logo" />
           <h2 className="font-black text-xl mt-1">Fly Teck</h2>
           <p className="text-[10px] font-bold border-b border-black pb-1 mt-1">وصل استلام</p>
         </div>

         {/* معلومات الفاتورة */}
         <div className="mb-3 space-y-1.5 text-[11px] font-bold">
           <p>رقم الفاتورة: <span className="font-normal">{printData.invoiceNumber}</span></p>
           <p>التاريخ: <span className="font-normal" dir="ltr">{printData.displayDate}</span></p>
           <p>البائع: <span className="font-normal">{printData.seller}</span></p>
           <p>المشترك: <span className="font-normal">{printData.buyer.split(' - ')[0]}</span></p>
           <p>الهاتف: <span className="font-normal">{printData.buyer.split(' - ')[1] || '-'}</span></p>
         </div>

         {/* جدول المواد */}
         {printData.items && printData.items.length > 0 && (
             <table className="w-full text-[11px] font-bold border-t border-b border-black mb-3">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-right py-1">المادة</th>
                    <th className="text-center py-1">العدد</th>
                    <th className="text-left py-1">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.filter(i => !i.isSubscription).map((it, i) => (
                    <tr key={i}>
                      <td className="py-1 border-b border-gray-300 border-dashed max-w-[40mm] truncate">{it.itemName}</td>
                      <td className="py-1 text-center border-b border-gray-300 border-dashed">{it.quantity}</td>
                      <td className="py-1 text-left border-b border-gray-300 border-dashed">{it.isFree ? 'مجاني' : it.sellPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
         )}

         {/* المجاميع */}
         <div className="text-sm font-black space-y-1">
           {printData.subscriptionPrice > 0 && (
             <div className="flex justify-between text-xs font-bold">
               <span>الاشتراك / التركيب:</span>
               <span>{printData.subscriptionPrice.toLocaleString()}</span>
             </div>
           )}
           <div className="flex justify-between border-t border-black pt-1 mt-1">
             <span>الإجمالي المطلوب:</span>
             <span>{(printData.materialsPrice + printData.subscriptionPrice).toLocaleString()} د.ع</span>
           </div>
         </div>

         {/* تذييل الوصل */}
         <div className="text-center text-[9px] mt-6 pt-2 border-t border-dashed border-black">
           <p className="font-bold mb-1">شكراً لتعاملكم معنا!</p>
            <p>الكراده قرب تقاطع الاورزدي</p>
           <p>07713663013 - 07713836983</p>
         </div>
      </div>
    )}
    </>
  );
}