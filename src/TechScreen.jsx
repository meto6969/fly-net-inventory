import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { FiTool, FiLogOut, FiBox, FiRefreshCw, FiLayers, FiShoppingCart, FiX, FiUser, FiPhone, FiCheckCircle } from 'react-icons/fi';

export default function TechScreen({ user, onLogout }) {
  const [myItems, setMyItems] = useState([]);
  const [mainItems, setMainItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [dispenseQty, setDispenseQty] = useState(1);
  const [itemPrice, setItemPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMyItems = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [{ data: mainData }, { data, error }] = await Promise.all([
        supabase.from('inventory_main').select('id, customerPrice'),
        supabase.from('inventory_techs').select('*').eq('techUsername', user.username).order('itemName')
      ]);

      if (mainData) setMainItems(mainData);
      
      if (!error && data) {
        const groupedRaw = data.reduce((acc, item) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return acc;
          const itemIdStr = String(item.itemId);
          if (acc[itemIdStr]) {
            acc[itemIdStr].quantity += qty;
          } else {
            acc[itemIdStr] = { ...item, quantity: qty };
          }
          return acc;
        }, {});
        setMyItems(Object.values(groupedRaw));
      }
    } catch (err) {
      console.error("Error fetching tech items:", err);
    }
    if (!isBackground) setLoading(false);
  };

  useEffect(() => {
    fetchMyItems(false);

    // 🌟 الاستماع اللحظي للفني (لتحديث عهدته تلقائياً إذا قام الأدمن بصرف مواد له)
    const techRealtimeChannel = supabase
      .channel('tech_screen_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_techs', filter: `techUsername=eq.${user.username}` }, () => {
        fetchMyItems(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(techRealtimeChannel);
    };
  }, [user.username]);

  const totalItemsCount = myItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemSelect = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    setIsFree(false);
    
    if (id) {
      const mainItem = mainItems.find(m => String(m.id) === String(id));
      if (mainItem) {
        setItemPrice(mainItem.customerPrice || 0);
      } else {
        setItemPrice(0);
      }
    } else {
      setItemPrice('');
    }
  };

  const toggleFree = () => {
    if (!isFree) {
      setItemPrice(0);
      setIsFree(true);
    } else {
      const mainItem = mainItems.find(m => String(m.id) === String(selectedItemId));
      setItemPrice(mainItem ? mainItem.customerPrice : 0);
      setIsFree(false);
    }
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemId || dispenseQty < 1 || itemPrice === '') {
      alert('الرجاء إكمال جميع البيانات بشكل صحيح.');
      return;
    }

    const selectedItem = myItems.find(i => String(i.itemId) === String(selectedItemId));
    const qtyToSell = Number(dispenseQty);

    if (!selectedItem || selectedItem.quantity < qtyToSell) {
      alert("الكمية المطلوبة أكبر من المتوفر في عهدتك!");
      return;
    }

    setIsSubmitting(true);

    const updatedItems = myItems.map(i => {
      if (String(i.itemId) === String(selectedItemId)) {
        return { ...i, quantity: i.quantity - qtyToSell };
      }
      return i;
    }).filter(i => i.quantity > 0);

    setMyItems(updatedItems);
    setIsDispenseModalOpen(false);
    setMsg('✅ تم الصرف بنجاح!');
    setTimeout(() => setMsg(''), 3000);

    setCustomerName('');
    setCustomerPhone('');
    setSelectedItemId('');
    setDispenseQty(1);
    setItemPrice('');
    setIsFree(false);
    setIsSubmitting(false);

    try {
      const { data: rows } = await supabase
        .from('inventory_techs')
        .select('*')
        .eq('techUsername', user.username)
        .eq('itemId', selectedItemId);

      let remainingToDeduct = qtyToSell;
      for (let row of rows) {
        if (remainingToDeduct <= 0) break;
        if (Number(row.quantity) <= remainingToDeduct) {
          await supabase.from('inventory_techs').delete().eq('id', row.id);
          remainingToDeduct -= Number(row.quantity);
        } else {
          await supabase.from('inventory_techs').update({ quantity: Number(row.quantity) - remainingToDeduct }).eq('id', row.id);
          remainingToDeduct = 0;
        }
      }

      const finalPrice = isFree ? 0 : Number(itemPrice);
      const totalAmount = finalPrice * qtyToSell;
      const todayDate = new Date().toISOString().split('T')[0];
      const freeLabel = isFree ? ' (مجاني)' : '';
      const noteStr = `بيع مباشر (مواد): ${selectedItem.itemName} | العدد: ${qtyToSell} | المشتري: ${customerName} - ${customerPhone}${freeLabel}`;

      await supabase.from('safe_manual_entries').insert([{
        amount: totalAmount,
        date: todayDate,
        note: noteStr,
        is_paid: true,
        created_by: user.username
      }]);

      fetchMyItems(true);
    } catch (err) {
      console.error("خطأ في مزامنة الخلفية:", err);
      fetchMyItems(true);
    }
  };

  const currentTotalDispensePrice = (Number(itemPrice) || 0) * Number(dispenseQty);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-20" dir="rtl">
      
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg mb-6 flex justify-between items-center relative overflow-hidden max-w-4xl mx-auto">
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <p className="text-blue-300 text-sm font-bold flex items-center gap-2 mb-1"><FiTool /> حساب الفني (اللوجستيات)</p>
          <h2 className="text-2xl font-black">{user.name}</h2>
          <p className="text-slate-400 text-xs mt-1" dir="ltr">@{user.username}</p>
        </div>
        <button onClick={onLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-2xl transition-all relative z-10" title="تسجيل الخروج">
          <FiLogOut size={24} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        
        {msg && (
          <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 mb-6 rounded-l-xl flex items-center gap-2 shadow-sm animate-fade-in">
            <FiCheckCircle className="text-emerald-500" size={20} />
            <p className="text-emerald-800 font-bold">{msg}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl">
              <FiBox size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">عهدتي الحالية</h3>
              <p className="text-xs text-slate-500 font-bold">إجمالي القطع: <span className="text-blue-600">{totalItemsCount}</span></p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setIsDispenseModalOpen(true)} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md shadow-emerald-600/20">
              <FiShoppingCart size={18} /> صرف مواد
            </button>
            <button onClick={() => fetchMyItems(false)} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center justify-center transition-colors">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
            <FiRefreshCw className="animate-spin text-blue-500 text-3xl" /> جاري مطابقة العُهدة...
          </div>
        ) : myItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-200 border-dashed">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><FiBox size={32}/></div>
            <p className="text-slate-500 font-bold text-lg">لا توجد مواد في عهدتك حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myItems.map((item, index) => (
              <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 text-slate-400 p-3 rounded-2xl border border-slate-100 hidden sm:block">
                    <FiLayers size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base mb-1">{item.itemName}</h4>
                    <p className="text-xs text-slate-400 font-bold bg-slate-100 w-fit px-2 py-1 rounded-lg">{item.category}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-xs font-bold text-blue-500 mb-1">الكمية</span>
                  <span className="text-2xl font-black text-blue-700 leading-none">{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {isDispenseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiShoppingCart className="text-emerald-400"/> صرف مواد لمشترك</h2>
              <button onClick={() => setIsDispenseModalOpen(false)} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleDispenseSubmit} className="space-y-4">
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiUser/> اسم المشترك</label>
                    <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="الاسم الكامل" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiPhone/> رقم الهاتف</label>
                    <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XX XXX XXXX" dir="ltr" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none text-right" />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">المادة المراد صرفها</label>
                    <select required value={selectedItemId} onChange={handleItemSelect} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-700">
                      <option value="">اختر المادة...</option>
                      {myItems.map(i => (
                        <option key={i.itemId} value={i.itemId}>
                          {i.itemName} (المتوفر: {i.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">العدد (الكمية)</label>
                      <input type="number" min="1" required value={dispenseQty} onChange={(e) => setDispenseQty(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 outline-none font-black text-center" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">السعر للمفرد (د.ع)</label>
                      <input type="number" min="0" required disabled={isFree} value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className={`w-full border rounded-xl py-2.5 px-3 outline-none font-bold transition-colors ${isFree ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-100'}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={toggleFree} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${isFree ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                      {isFree ? 'إلغاء المجاني' : 'صرف مجاني (بدون أجور)'}
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-100 mt-4">
                  <span className="font-bold">الإجمالي المطلوب:</span>
                  <span className="font-black text-2xl">{currentTotalDispensePrice.toLocaleString()} <span className="text-sm font-bold">د.ع</span></span>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2">
                  {isSubmitting ? <FiRefreshCw className="animate-spin" /> : <><FiCheckCircle /> تأكيد الصرف والخصم الفوري</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}