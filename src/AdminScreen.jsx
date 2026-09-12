import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { FiBox, FiTool, FiLayers, FiPlus, FiTrash2, FiMinus, FiCheckCircle, FiUser, FiDollarSign, FiCalendar, FiX, FiRefreshCw, FiEdit2, FiSave, FiList, FiShoppingCart, FiTrendingUp, FiLogOut } from 'react-icons/fi';

let globalMainItems = null;
let globalTechItems = null;
let globalCategories = null;
let globalTechs = null;
let globalFinanceData = null;
let globalRawTicketsInv = null;
let globalRawManualEntriesInv = null;
let globalAllUsersInv = null;

const getLocalTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('main'); 
  
  const [mainItems, setMainItems] = useState(globalMainItems || []);
  const [techItems, setTechItems] = useState(globalTechItems || []);
  const [categories, setCategories] = useState(globalCategories || []);
  const [techs, setTechs] = useState(globalTechs || []);
  const [financeData, setFinanceData] = useState(globalFinanceData || []); 
  
  const [rawTickets, setRawTickets] = useState(globalRawTicketsInv || []);
  const [rawManualEntries, setRawManualEntries] = useState(globalRawManualEntriesInv || []);
  const [allUsers, setAllUsers] = useState(globalAllUsersInv || []);

  const [loading, setLoading] = useState(!globalMainItems);
  const [msg, setMsg] = useState('');
  
  const [financeStartDate, setFinanceStartDate] = useState('');
  const [financeEndDate, setFinanceEndDate] = useState('');
  
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(getLocalTodayDate()); 
  const [manualNote, setManualNote] = useState('');
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  const [isEditTotalModalOpen, setIsEditTotalModalOpen] = useState(false);
  const [newTotalAmount, setNewTotalAmount] = useState('');

  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: 0, alertQty: 0, wholesalePrice: 0, customerPrice: 0 });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemData, setEditItemData] = useState(null);

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellItemData, setSellItemData] = useState(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellCustomerName, setSellCustomerName] = useState('');
  const [isSelling, setIsSelling] = useState(false);

  const [allocation, setAllocation] = useState({ itemId: '', techUsername: '', quantity: 1 });
  const [newCategory, setNewCategory] = useState('');

  const currentUser = user?.name || "أمين المخزن";

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    try {
      const [
        usersRes,
        mainRes,
        techRes,
        catRes,
        ticketsRes,
        manualRes
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('inventory_main').select('*').order('name'),
        supabase.from('inventory_techs').select('*').order('lastUpdated', { ascending: false }),
        supabase.from('inventory_categories').select('*').order('name'),
        supabase.from('tickets').select('*').eq('status', 'Done'),
        supabase.from('safe_manual_entries').select('*')
      ]);

      const usersData = usersRes.data || [];
      const mainData = mainRes.data || [];
      const techData = techRes.data || [];
      const catData = catRes.data || [];
      const ticketsData = ticketsRes.data || [];
      const manualData = manualRes.data || [];

      globalAllUsersInv = usersData; setAllUsers(usersData);
      globalRawTicketsInv = ticketsData; setRawTickets(ticketsData);
      globalRawManualEntriesInv = manualData; setRawManualEntries(manualData);

      const groupedFinance = {};

      if (ticketsData.length > 0) {
        ticketsData.forEach(ticket => {
          const actualDate = ticket.completed_at || ticket.created_at || ticket.dateCreated;
          if (!actualDate) return;
          
          const dateObj = new Date(actualDate);
          if (isNaN(dateObj.getTime())) return;

          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          const amount = Number(ticket.materials_amount) || 0;
          
          if (amount > 0) {
            if (!groupedFinance[dateStr]) groupedFinance[dateStr] = { date: dateStr, total: 0, ticketsTotal: 0, ticketsProfit: 0, unpaidTicketsTotal: 0, manualNotes: [] };
            
            if (ticket.is_paid === false) {
               groupedFinance[dateStr].unpaidTicketsTotal += amount;
            } else {
               groupedFinance[dateStr].ticketsTotal += amount;
               groupedFinance[dateStr].total += amount; 
            }
          }
        });
      }

      if (manualData.length > 0) {
        manualData.forEach(entry => {
          const actualDate = entry.date || entry.created_at;
          if (!actualDate) return;
          
          const d = new Date(actualDate);
          if (isNaN(d.getTime())) return;

          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const amount = Number(entry.amount) || 0;
          
          if (!groupedFinance[dateStr]) groupedFinance[dateStr] = { date: dateStr, total: 0, ticketsTotal: 0, ticketsProfit: 0, unpaidTicketsTotal: 0, manualNotes: [] };
          groupedFinance[dateStr].total += amount;

          let itemProfit = 0;
          if (entry.note && entry.note.includes('بيع مباشر (مواد)')) {
            const parts = entry.note.split('|').map(p => p.trim());
            const itemNameMatch = parts[0].replace('بيع مباشر (مواد):', '').trim();
            const qtyStr = parts.find(p => p.includes('العدد:')) || '';
            const qty = Number(qtyStr.replace('العدد:', '').trim()) || 1;
            const isFree = amount === 0 && entry.note.includes('(مجاني)');

            const matchedItem = mainData.find(i => i.name === itemNameMatch);
            if (matchedItem) {
              const wholesale = Number(matchedItem.wholesalePrice) || 0;
              if (isFree) {
                itemProfit = 0; // المواد المجانية لا تحسب كخسارة في قاصة الإيرادات اليومية بل تكلفة مخزنية
              } else {
                itemProfit = amount - (wholesale * qty);
              }
            }
          }

          groupedFinance[dateStr].ticketsProfit += itemProfit;

          groupedFinance[dateStr].manualNotes.push({
            id: entry.id, 
            amount: amount,
            note: entry.note || 'إيراد يدوي بدون ملاحظات',
            profit: itemProfit
          });
        });
      }

      const financeArray = Object.values(groupedFinance).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      globalMainItems = mainData; setMainItems(mainData);
      globalTechItems = techData; setTechItems(techData);
      globalCategories = catData; setCategories(catData);
      
      const techsData = usersData.filter(u => u.role === 'tech');
      setTechs(techsData); globalTechs = techsData;
      
      globalFinanceData = financeArray;
      setFinanceData(financeArray);

    } catch (error) {
      console.error("خطأ في جلب بيانات المخازن", error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 ربط الاستماع الفوري الحقيقي بكل جداول النظام لتحديث الإدارة فوراً
  useEffect(() => {
    fetchData();

    const realtimeChannel = supabase
      .channel('admin_live_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_manual_entries' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_techs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_main' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const salesList = useMemo(() => {
    let list = [];

    rawManualEntries.forEach(entry => {
      if (entry.note && entry.note.includes('بيع مباشر (مواد)')) {
        const parts = entry.note.split('|').map(p => p.trim());
        const itemName = parts[0].replace('بيع مباشر (مواد):', '').trim();
        const qtyStr = parts.find(p => p.includes('العدد:')) || '';
        const qty = Number(qtyStr.replace('العدد:', '').trim()) || 1;
        const buyerPart = parts.find(p => p.includes('المشتري:')) || '';
        const buyerInfo = buyerPart.replace('المشتري:', '').trim();

        const sellPrice = Number(entry.amount) || 0;
        const isFree = sellPrice === 0 && entry.note.includes('(مجاني)');
        
        const matchedItem = mainItems.find(i => i.name === itemName);
        const wholesalePrice = matchedItem ? Number(matchedItem.wholesalePrice) * qty : 0;
        const profit = isFree ? 0 : (matchedItem ? sellPrice - wholesalePrice : 0);

        const actualDate = entry.created_at || entry.date;
        
        let sellerName = 'المكتب (الإدارة)';
        const adminId = entry.created_by || entry.user_id || entry.username;
        if (adminId) {
           const userObj = allUsers.find(u => u.username === adminId);
           sellerName = userObj ? userObj.name : adminId;
        }

        list.push({
          id: `manual_${entry.id}`,
          date: actualDate,
          displayDate: formatDate(actualDate),
          seller: sellerName,
          sellerType: 'office',
          itemName: itemName,
          buyer: buyerInfo || 'زبون مباشر',
          quantity: qty,
          sellPrice: sellPrice,
          isFree: isFree,
          profit: profit,
          profitKnown: !!matchedItem
        });
      }
    });

    rawTickets.forEach(t => {
      const matAmount = Number(t.materials_amount) || 0;
      if (matAmount > 0) {
        const actualDate = t.completed_at || t.created_at || t.dateCreated;
        
        let techName = t.technician;
        const techObj = allUsers.find(u => u.username === t.technician);
        if (techObj) techName = techObj.name;

        list.push({
          id: `ticket_${t.id}`,
          date: actualDate,
          displayDate: formatDate(actualDate),
          seller: techName,
          sellerType: 'tech',
          itemName: 'مواد صيانة (تذكرة)',
          buyer: t.customerName || 'مشترك',
          quantity: '-',
          sellPrice: matAmount,
          isFree: false,
          profit: 0,
          profitKnown: false
        });
      }
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rawManualEntries, rawTickets, mainItems, allUsers]);

  const totalSalesAmount = salesList.reduce((sum, item) => sum + item.sellPrice, 0);
  const totalProfitAmount = salesList.reduce((sum, item) => sum + item.profit, 0);

  const handleAddManualMoney = async (e) => {
    e.preventDefault();
    setIsAddingMoney(true);
    try {
      const { error } = await supabase.from('safe_manual_entries').insert([
        { amount: Number(manualAmount), date: manualDate, note: manualNote || 'إيراد يدوي', is_paid: true }
      ]);
      if (error) throw error;
      
      showMsg('✅ تم إضافة المبلغ للقاصة بنجاح');
      setIsAddMoneyModalOpen(false);
      setManualAmount('');
      setManualNote('');
      fetchData(); 
    } catch (err) {
      alert("حدث خطأ أثناء الإضافة: " + err.message);
    }
    setIsAddingMoney(false);
  };

  const handleDeleteManualEntry = async (entryId) => {
    if (!entryId) return;
    if(window.confirm("هل أنت متأكد من حذف هذه الحركة المالية؟ سيؤثر هذا على إجمالي القاصة.")) {
      try {
        const { error } = await supabase.from('safe_manual_entries').delete().eq('id', entryId);
        if (error) throw error;
        showMsg('✅ تم حذف الحركة بنجاح');
        fetchData(); 
      } catch (error) {
        alert("حدث خطأ أثناء الاتصال: " + error.message);
      }
    }
  };

  const handleEditTotalSubmit = async (e, currentTotal) => {
    e.preventDefault();
    setIsAddingMoney(true);
    const newTotal = Number(newTotalAmount);
    const difference = newTotal - currentTotal;
    
    if (difference === 0) {
      setIsEditTotalModalOpen(false);
      setIsAddingMoney(false);
      return;
    }
    
    const todayDate = getLocalTodayDate();
    const noteStr = difference > 0 ? `تسوية حسابات (زيادة رصيد)` : `تسوية حسابات (سحب رصيد)`;

    try {
      const { error } = await supabase.from('safe_manual_entries').insert([
        { amount: difference, date: todayDate, note: noteStr, is_paid: true }
      ]);
      if (error) throw error;
      
      showMsg('✅ تم تعديل الرصيد الإجمالي بنجاح');
      setIsEditTotalModalOpen(false);
      fetchData(); 
    } catch (err) {
      alert("حدث خطأ أثناء تعديل الرصيد: " + err.message);
    }
    setIsAddingMoney(false);
  };

  const openSellModal = (item) => {
    setSellItemData(item);
    setSellQuantity(1);
    setSellCustomerName('');
    setIsSellModalOpen(true);
  };

  const handleSellItemSubmit = async (e) => {
    e.preventDefault();
    
    if (sellQuantity < 1 || sellQuantity > sellItemData.quantity) {
      alert("الكمية المطلوبة غير متوفرة في المخزن!");
      return;
    }

    setIsSelling(true);
    try {
      const totalPrice = Number(sellItemData.customerPrice) * sellQuantity;
      const customerNameDisplay = sellCustomerName ? sellCustomerName : 'زبون مباشر (بدون اسم)';
      const noteStr = `بيع مباشر (مواد): ${sellItemData.name} | العدد: ${sellQuantity} | المشتري: ${customerNameDisplay}`;
      
      const todayDate = getLocalTodayDate();
      const adminUsername = user?.username || 'المكتب (الإدارة)';

      const { error: invError } = await supabase.from('inventory_main')
        .update({ quantity: sellItemData.quantity - sellQuantity })
        .eq('id', sellItemData.id);
      if (invError) throw invError;

      const { error: safeError } = await supabase.from('safe_manual_entries').insert([
        { amount: totalPrice, date: todayDate, note: noteStr, is_paid: true, created_by: adminUsername }
      ]);
      if (safeError) throw safeError;

      showMsg('✅ تمت عملية البيع بنجاح وخصم المادة وإضافة المبلغ للقاصة!');
      setIsSellModalOpen(false);
      setSellItemData(null);
      fetchData(); 
    } catch (err) {
      alert("حدث خطأ أثناء البيع: " + err.message);
    }
    setIsSelling(false);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory) return;
    const { error } = await supabase.from('inventory_categories').insert([{ name: newCategory }]);
    if (!error) {
      setNewCategory('');
      showMsg('تمت إضافة القسم بنجاح');
      fetchData();
    }
  };

  const handleDeleteCategory = async (id) => {
    if(window.confirm("هل أنت متأكد من حذف هذا القسم؟")) {
      await supabase.from('inventory_categories').delete().eq('id', id);
      fetchData();
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('inventory_main').insert([newItem]);
    if (!error) {
      setNewItem({ name: '', category: '', quantity: 0, alertQty: 0, wholesalePrice: 0, customerPrice: 0 });
      showMsg('تمت إضافة المادة للمخزن بنجاح');
      fetchData();
    }
  };

  const handleDeleteItem = async (id) => {
    if(window.confirm("هل أنت متأكد من حذف هذه المادة؟")) {
      await supabase.from('inventory_main').delete().eq('id', id);
      fetchData();
    }
  };

  const openEditModal = (item) => {
    setEditItemData({ ...item });
    setIsEditModalOpen(true);
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory_main').update({
        name: editItemData.name,
        category: editItemData.category,
        quantity: editItemData.quantity,
        alertQty: editItemData.alertQty,
        wholesalePrice: editItemData.wholesalePrice,
        customerPrice: editItemData.customerPrice
      }).eq('id', editItemData.id);

      if (error) throw error;

      showMsg('تم تعديل المادة بنجاح');
      setIsEditModalOpen(false);
      setEditItemData(null);
      fetchData();
    } catch (err) {
      alert("حدث خطأ أثناء التعديل: " + err.message);
    }
  };

  const handleDeleteTechItemForce = async (techUsername, itemId, currentQty, techName) => {
    const qty = Number(currentQty) || 0;
    const confirmMessage = qty > 0 
      ? `هل أنت متأكد من إزالة هذه المادة نهائياً من ذمة ${techName}؟\n\n⚠️ ملاحظة: سيتم إرجاع (${qty}) إلى المخزن الرئيسي تلقائياً.` 
      : `هل أنت متأكد من إزالة هذه المادة نهائياً من ذمة ${techName}؟`;

    if(window.confirm(confirmMessage)) {
      try {
        if (qty > 0) {
          const mainItem = mainItems.find(i => String(i.id) === String(itemId));
          if (mainItem) {
             await supabase.from('inventory_main').update({ quantity: Number(mainItem.quantity) + qty }).eq('id', itemId);
          }
        }
        
        await supabase.from('inventory_techs')
          .delete()
          .eq('techUsername', techUsername)
          .eq('itemId', itemId);
          
        showMsg('تمت إزالة المادة من ذمة الفني بنجاح');
        fetchData();
      } catch (error) {
        alert("حدث خطأ أثناء الحذف!");
      }
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    await updateTechInventory(allocation.techUsername, allocation.itemId, Number(allocation.quantity), 'add');
    setAllocation({ itemId: '', techUsername: '', quantity: 1 });
  };

  const updateTechInventory = async (techUsername, itemId, changeQty, action = 'add') => {
    const item = mainItems.find(i => String(i.id) === String(itemId));
    const tech = techs.find(t => String(t.username) === String(techUsername));

    if (!item || !tech || changeQty <= 0) return;

    const existingTechItem = techItems.find(ti => String(ti.techUsername) === String(techUsername) && String(ti.itemId) === String(itemId));

    if (action === 'add') {
      if (Number(item.quantity) < changeQty) {
        alert("الكمية المطلوبة أكبر من المتوفر في المخزن الرئيسي!");
        return;
      }
      
      await supabase.from('inventory_main').update({ quantity: Number(item.quantity) - changeQty }).eq('id', item.id);
      
      if (existingTechItem) {
        await supabase.from('inventory_techs').update({ quantity: Number(existingTechItem.quantity) + changeQty, lastUpdated: new Date() }).eq('id', existingTechItem.id);
      } else {
        await supabase.from('inventory_techs').insert([{
          techUsername: tech.username, techName: tech.name, itemId: item.id, itemName: item.name, category: item.category, quantity: changeQty, lastUpdated: new Date()
        }]);
      }
      showMsg(`تم إضافة ${changeQty} إلى عهدة ${tech.name}`);

    } else if (action === 'remove') {
      if (!existingTechItem || Number(existingTechItem.quantity) < changeQty) {
        alert("الفني لا يملك هذه الكمية لخصمها!");
        return;
      }
      
      await supabase.from('inventory_main').update({ quantity: Number(item.quantity) + changeQty }).eq('id', item.id);
      
      const newTechQty = Number(existingTechItem.quantity) - changeQty;
      if (newTechQty === 0) {
        await supabase.from('inventory_techs').delete().eq('id', existingTechItem.id);
      } else {
        await supabase.from('inventory_techs').update({ quantity: newTechQty, lastUpdated: new Date() }).eq('id', existingTechItem.id);
      }
      showMsg(`تم سحب ${changeQty} من عهدة ${tech.name} وإعادتها للمخزن`);
    }

    fetchData();
  };

  const groupedTechItemsRaw = techItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) return acc; 

    if (!acc[item.techUsername]) {
      acc[item.techUsername] = {
        name: item.techName,
        username: item.techUsername,
        itemsMap: {}
      };
    }

    const itemIdStr = String(item.itemId);
    if (acc[item.techUsername].itemsMap[itemIdStr]) {
      acc[item.techUsername].itemsMap[itemIdStr].quantity += qty;
    } else {
      acc[item.techUsername].itemsMap[itemIdStr] = { ...item, quantity: qty };
    }
    
    return acc;
  }, {});

  const groupedTechItems = {};
  Object.keys(groupedTechItemsRaw).forEach(tech => {
    groupedTechItems[tech] = {
      ...groupedTechItemsRaw[tech],
      items: Object.values(groupedTechItemsRaw[tech].itemsMap)
    };
  });

  let filteredFinance = financeData;
  if (financeStartDate) {
    filteredFinance = filteredFinance.filter(record => new Date(record.date) >= new Date(financeStartDate));
  }
  if (financeEndDate) {
    filteredFinance = filteredFinance.filter(record => new Date(record.date) <= new Date(financeEndDate));
  }
  
  const totalFinanceSum = filteredFinance.reduce((sum, record) => sum + record.total, 0);
  const totalDailyMaterialsSum = filteredFinance.reduce((sum, record) => sum + (record.ticketsTotal + (record.manualNotes.reduce((s, m) => s + (m.amount > 0 ? m.amount : 0), 0))), 0);
  const totalDailyProfitSum = filteredFinance.reduce((sum, record) => sum + (record.ticketsProfit || 0), 0);

  const totalInventoryCapital = mainItems.reduce((sum, item) => sum + ((Number(item.wholesalePrice) || 0) * (Number(item.quantity) || 0)), 0);
  const totalExpectedProfit = mainItems.reduce((sum, item) => {
    const profit = (Number(item.customerPrice) || 0) - (Number(item.wholesalePrice) || 0);
    return sum + (profit * (Number(item.quantity) || 0));
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-600/30">
                <FiBox size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">إدارة المخازن والعُهد</h2>
                <p className="text-slate-500 text-sm mt-1">مرحباً بك، {currentUser}</p>
              </div>
            </div>
            <button onClick={onLogout} className="md:hidden bg-red-50 text-red-500 p-2 rounded-lg">
              <FiLogOut size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 items-center">
            <button onClick={() => setActiveTab('main')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'main' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>المخزن الرئيسي</button>
            <button onClick={() => setActiveTab('techs')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'techs' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>عُهد الفنيين</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>الأقسام</button>
            <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'finance' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>قاصة المواد</button>
            <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${activeTab === 'sales' ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
               <FiShoppingCart /> المبيعات
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>
            <button onClick={onLogout} className="hidden md:flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold text-sm transition-colors">
              <FiLogOut /> خروج
            </button>
          </div>
        </div>

        {msg && (
          <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 mb-6 rounded-l-lg flex items-center gap-2 animate-fade-in">
            <FiCheckCircle className="text-emerald-500" />
            <p className="text-emerald-700 font-bold">{msg}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 text-blue-600 font-bold">جاري تحميل البيانات...</div>
        ) : (
          <>
            {activeTab === 'main' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
                <div className="xl:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><FiPlus className="text-blue-600"/> إضافة مادة للمخزن</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">اسم المادة</label>
                        <input type="text" required value={newItem.name} onChange={(e)=>setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">القسم</label>
                        <select required value={newItem.category} onChange={(e)=>setNewItem({...newItem, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none">
                          <option value="">اختر القسم...</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">الكمية</label>
                          <input type="number" min="0" required value={newItem.quantity} onChange={(e)=>setNewItem({...newItem, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">حد التنبيه (النواقص)</label>
                          <input type="number" min="0" value={newItem.alertQty} onChange={(e)=>setNewItem({...newItem, alertQty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">سعر الشراء (الجملة)</label>
                          <input type="number" min="0" value={newItem.wholesalePrice} onChange={(e)=>setNewItem({...newItem, wholesalePrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" placeholder="مثال: 35000" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">سعر البيع (للمشترك)</label>
                          <input type="number" min="0" required value={newItem.customerPrice} onChange={(e)=>setNewItem({...newItem, customerPrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" placeholder="مثال: 45000" />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-2 transition-colors">إضافة للمخزن</button>
                    </form>
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">جرد المخزن الرئيسي</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                          <tr>
                            <th className="p-4 font-bold">المادة</th>
                            <th className="p-4 font-bold">القسم</th>
                            <th className="p-4 font-bold">سعر الشراء</th>
                            <th className="p-4 font-bold">سعر البيع</th>
                            <th className="p-4 font-bold text-blue-600 bg-blue-50/50">إجمالي الربح (الصافي)</th>
                            <th className="p-4 font-bold text-center">الكمية المتوفرة</th>
                            <th className="p-4 font-bold text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mainItems.map(item => {
                            const profitPerItem = (Number(item.customerPrice) || 0) - (Number(item.wholesalePrice) || 0);
                            const totalProfit = profitPerItem * (Number(item.quantity) || 0);
                            
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                <td className="p-4 text-slate-500 text-sm">{item.category}</td>
                                <td className="p-4 text-slate-600 font-medium">{item.wholesalePrice || 0} د.ع</td>
                                <td className="p-4 text-emerald-600 font-bold">{item.customerPrice || 0} د.ع</td>
                                <td className="p-4 text-blue-600 font-black bg-blue-50/20">
                                  {totalProfit > 0 ? `+${totalProfit.toLocaleString()}` : totalProfit.toLocaleString()} د.ع
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${Number(item.quantity) <= Number(item.alertQty) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="p-4 text-center flex items-center justify-center gap-1">
                                  <button onClick={() => openSellModal(item)} disabled={item.quantity < 1} className="p-2 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors" title="بيع مباشر للمشترك"><FiShoppingCart size={18} /></button>
                                  <div className="w-px h-4 bg-slate-200"></div>
                                  <button onClick={() => openEditModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors" title="تعديل المادة"><FiEdit2 size={18} /></button>
                                  <div className="w-px h-4 bg-slate-200"></div>
                                  <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors" title="حذف المادة"><FiTrash2 size={18} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {mainItems.length > 0 && (
                          <tfoot className="bg-slate-900 text-white">
                            <tr>
                              <td colSpan="2" className="p-4 font-bold text-left text-emerald-200 border-l border-slate-700">
                                إجمالي المخزن الرئيسي:
                              </td>
                              <td colSpan="2" className="p-4 text-center font-bold border-l border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">رأس المال (إجمالي سعر الشراء)</div>
                                <span className="text-orange-400 text-lg">{totalInventoryCapital.toLocaleString()} د.ع</span>
                              </td>
                              <td className="p-4 text-center font-black border-l border-slate-700">
                                <div className="text-xs text-slate-400 mb-1 font-bold">إجمالي الربح المتوقع</div>
                                <span className="text-emerald-400 text-lg">+{totalExpectedProfit.toLocaleString()} د.ع</span>
                              </td>
                              <td className="p-4 text-center font-bold border-l border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">إجمالي القطع المتوفرة</div>
                                <span className="text-blue-400 text-lg">{mainItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</span>
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'techs' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
                <div className="xl:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><FiTool className="text-blue-600"/> صرف عهدة لفني</h3>
                    <form onSubmit={handleAllocate} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">الفني المستلم</label>
                        <select required value={allocation.techUsername} onChange={(e)=>setAllocation({...allocation, techUsername: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none">
                          <option value="">اختر الفني...</option>
                          {techs.map(t => <option key={t.id} value={t.username}>{t.name} (@{t.username})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">المادة المراد صرفها</label>
                        <select required value={allocation.itemId} onChange={(e)=>setAllocation({...allocation, itemId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none">
                          <option value="">اختر المادة...</option>
                          {mainItems.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.name} (باقي: {i.quantity})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">الكمية المصروفة</label>
                        <input type="number" min="1" required value={allocation.quantity} onChange={(e)=>setAllocation({...allocation, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-2 transition-colors">تأكيد الصرف</button>
                    </form>
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
                    <h3 className="font-bold text-slate-800 mb-4">بطاقات عُهد الفنيين المجمعة</h3>
                    
                    {Object.keys(groupedTechItems).length === 0 ? (
                      <div className="text-center py-10 text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        لا توجد عُهد مصروفة لأي فني حالياً.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(groupedTechItems).map((techGroup, index) => (
                          <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-slate-800 text-white p-4 flex items-center gap-3">
                              <div className="bg-slate-700 p-2 rounded-full"><FiUser size={20}/></div>
                              <div>
                                <h4 className="font-bold">{techGroup.name}</h4>
                                <p className="text-xs text-slate-400" dir="ltr">@{techGroup.username}</p>
                              </div>
                            </div>
                            <div className="p-4 space-y-3 bg-slate-50 min-h-[120px]">
                              {techGroup.items.map(item => (
                                <div key={item.itemId} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{item.itemName}</p>
                                    <p className="text-xs text-slate-400">{item.category}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => updateTechInventory(techGroup.username, item.itemId, 1, 'add')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors"><FiPlus size={14}/></button>
                                    <span className="font-black text-slate-700 min-w-[20px] text-center">{item.quantity}</span>
                                    <button onClick={() => updateTechInventory(techGroup.username, item.itemId, 1, 'remove')} className="bg-amber-50 hover:bg-amber-100 text-amber-500 p-1.5 rounded-lg transition-colors"><FiMinus size={14}/></button>
                                    
                                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                                    <button 
                                      onClick={() => handleDeleteTechItemForce(techGroup.username, item.itemId, item.quantity, techGroup.name)} 
                                      className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-1.5 rounded-lg transition-colors" 
                                      title="إزالة المادة نهائياً من العهدة وتنظيف السجلات المكررة"
                                    >
                                      <FiTrash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl animate-fade-in">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FiLayers className="text-blue-600"/> إضافة قسم جديد</h3>
                  <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input type="text" required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="مثال: كابلات ضوئية" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl transition-colors">إضافة</button>
                  </form>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4">الأقسام الحالية</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        {cat.name}
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 bg-white rounded-full p-1"><FiTrash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-600/10 flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    <div>
                      <p className="text-emerald-100 text-xs font-bold mb-1 flex justify-between items-center">
                        المجموع الكلي للقاصة (للفترة المحددة)
                        <button onClick={() => { setNewTotalAmount(totalFinanceSum); setIsEditTotalModalOpen(true); }} className="bg-white/20 hover:bg-white/40 p-1.5 rounded-lg transition-all backdrop-blur-sm" title="تسوية الرصيد">
                          <FiEdit2 size={14} />
                        </button>
                      </p>
                      <h3 className="text-3xl font-black mt-2" dir="ltr">
                        {totalFinanceSum.toLocaleString()} <span className="text-sm font-normal">د.ع</span>
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold mb-1">رأس مال المخزن (سعر الشراء)</p>
                      <h3 className="text-2xl font-black text-slate-800">{totalInventoryCapital.toLocaleString()} <span className="text-sm text-slate-400 font-normal">د.ع</span></h3>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                      <FiBox size={28} />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold mb-1">الأرباح المتوقعة (للمواد المتوفرة)</p>
                      <h3 className="text-2xl font-black text-emerald-600">+{totalExpectedProfit.toLocaleString()} <span className="text-sm text-slate-400 font-normal">د.ع</span></h3>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-2xl text-orange-500">
                      <FiTrendingUp size={28} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><FiDollarSign size={22} /></div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">سجل إيرادات قاصة المواد</h3>
                      <p className="text-xs text-slate-400 mt-0.5">تجميع المبالغ المستلمة من الفنيين والمبالغ المضافة يدوياً</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-xs text-slate-400 font-bold">من:</span>
                        <input type="date" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" />
                      </div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-xs text-slate-400 font-bold">إلى:</span>
                        <input type="date" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" />
                      </div>
                      {(financeStartDate || financeEndDate) && (
                        <button onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); }} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl font-bold transition-colors">
                          مسح
                        </button>
                      )}
                    </div>

                    <button onClick={() => setIsAddMoneyModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 text-sm">
                      <FiPlus size={18} /> إضافة مبلغ
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4 px-6 flex items-center gap-2"><FiCalendar size={14} /> التاريخ</th>
                          <th className="py-4 px-6 text-center">مبلغ المواد اليومي</th>
                          <th className="py-4 px-6 text-center">ربح المبلغ اليومي</th>
                          <th className="py-4 px-6 text-left">إجمالي القاصة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredFinance.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-slate-400 font-medium">
                              لا توجد مبالغ مسجلة في هذه الفترة المحددة.
                            </td>
                          </tr>
                        ) : (
                          filteredFinance.map((record, idx) => {
                            const dailyMaterials = record.ticketsTotal + (record.manualNotes.reduce((s, m) => s + (m.amount > 0 ? m.amount : 0), 0));
                            const dailyProfit = record.ticketsProfit || 0;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-slate-700" dir="ltr">{record.date}</td>
                                <td className="py-4 px-6 text-center font-bold text-slate-800">{dailyMaterials.toLocaleString()} د.ع</td>
                                <td className="py-4 px-6 text-center font-black text-emerald-600">+{dailyProfit.toLocaleString()} د.ع</td>
                                <td className="py-4 px-6 font-black text-blue-600 text-left">{record.total.toLocaleString()} د.ع</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {filteredFinance.length > 0 && (
                        <tfoot className="bg-slate-900 text-white font-bold text-base">
                          <tr>
                            <td className="py-4 px-6 text-emerald-200">الإجمالي الكلي:</td>
                            <td className="py-4 px-6 text-center text-white">{totalDailyMaterialsSum.toLocaleString()} د.ع</td>
                            <td className="py-4 px-6 text-center text-emerald-400">+{totalDailyProfitSum.toLocaleString()} د.ع</td>
                            <td className="py-4 px-6 text-blue-400 text-left">{totalFinanceSum.toLocaleString()} د.ع</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'sales' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in max-w-6xl mx-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><FiShoppingCart className="text-orange-500"/> قائمة المبيعات الشاملة</h3>
                  <div className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200">
                    إجمالي الحركات: {salesList.length}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
                      <tr>
                        <th className="p-4 font-bold">التاريخ والوقت</th>
                        <th className="p-4 font-bold">بواسطة (البائع)</th>
                        <th className="p-4 font-bold">المادة وبيانات المشترك</th>
                        <th className="p-4 font-bold text-center">الكمية</th>
                        <th className="p-4 font-bold text-emerald-700 bg-emerald-50 text-center">مبلغ البيع</th>
                        <th className="p-4 font-bold text-blue-700 bg-blue-50 text-center">الربح الصافي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {salesList.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">لا توجد مبيعات مسجلة حتى الآن.</td></tr>
                      ) : (
                        salesList.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-700 text-xs" dir="ltr">{sale.displayDate}</td>
                            <td className="p-4 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${sale.sellerType === 'office' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                  <FiUser size={14} />
                                </div>
                                {sale.seller}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{sale.itemName}</div>
                              <div className="text-xs text-slate-500 mt-0.5 bg-slate-50 p-1 rounded w-fit border border-slate-100">
                                👤 <span className="font-bold text-slate-700">{sale.buyer}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-black text-slate-600">{sale.quantity}</td>
                            
                            <td className="p-4 text-center font-black text-emerald-600 bg-emerald-50/30">
                              {sale.isFree ? (
                                <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-black">مجاني</span>
                              ) : (
                                `${sale.sellPrice.toLocaleString()} د.ع`
                              )}
                            </td>

                            <td className="p-4 text-center font-black text-blue-600 bg-blue-50/30">
                              {sale.isFree ? (
                                <span className="text-slate-400 text-xs font-bold">مجاني</span>
                              ) : sale.profitKnown ? (
                                `+${sale.profit.toLocaleString()} د.ع`
                              ) : (
                                <span className="text-xs text-slate-400">غير محدد</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {salesList.length > 0 && (
                      <tfoot className="bg-slate-900 text-white">
                        <tr>
                          <td colSpan="4" className="p-5 font-black text-lg text-emerald-200 border-l border-slate-700">المجاميع الكلية:</td>
                          <td className="p-5 text-center font-black text-emerald-400 text-xl border-l border-slate-700">{totalSalesAmount.toLocaleString()} د.ع</td>
                          <td className="p-5 text-center font-black text-blue-400 text-xl">+{totalProfitAmount.toLocaleString()} د.ع</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

          </>
        )}

      </div>

      {isSellModalOpen && sellItemData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiShoppingCart className="text-emerald-400"/> بيع مادة مباشرة</h2>
              <button onClick={() => { setIsSellModalOpen(false); setSellItemData(null); }} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <p className="text-slate-500 text-xs font-bold mb-1">المادة المطلوبة:</p>
                <p className="text-lg font-black text-slate-800">{sellItemData.name}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm font-bold text-emerald-600">السعر: {sellItemData.customerPrice.toLocaleString()} د.ع</span>
                  <span className="text-sm font-bold text-blue-600">متوفر: {sellItemData.quantity}</span>
                </div>
              </div>

              <form onSubmit={handleSellItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم المشتري / ملاحظات (اختياري)</label>
                  <input type="text" value={sellCustomerName} onChange={(e) => setSellCustomerName(e.target.value)} placeholder="مثال: مشترك زار المكتب..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الكمية المباعة</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200 w-fit">
                    <button type="button" onClick={() => setSellQuantity(Math.max(1, sellQuantity - 1))} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-600 font-bold text-xl shadow-sm">-</button>
                    <span className="font-black text-xl w-8 text-center text-slate-800">{sellQuantity}</span>
                    <button type="button" onClick={() => setSellQuantity(Math.min(sellItemData.quantity, sellQuantity + 1))} className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-xl shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-100 mt-2">
                  <span className="font-bold">الإجمالي المطلوب:</span>
                  <span className="font-black text-2xl">{(sellItemData.customerPrice * sellQuantity).toLocaleString()} <span className="text-sm font-bold">د.ع</span></span>
                </div>

                <button type="submit" disabled={isSelling || sellItemData.quantity < 1} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  {isSelling ? <FiRefreshCw className="animate-spin" /> : <><FiCheckCircle /> تأكيد البيع وخصم المخزن</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editItemData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiEdit2 className="text-blue-400"/> تعديل بيانات المادة</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditItemData(null); }} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم المادة</label>
                  <input type="text" required value={editItemData.name} onChange={(e)=>setEditItemData({...editItemData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">القسم</label>
                  <select required value={editItemData.category} onChange={(e)=>setEditItemData({...editItemData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none">
                    <option value="">اختر القسم...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الكمية الإجمالية</label>
                    <input type="number" min="0" required value={editItemData.quantity} onChange={(e)=>setEditItemData({...editItemData, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">حد التنبيه</label>
                    <input type="number" min="0" value={editItemData.alertQty} onChange={(e)=>setEditItemData({...editItemData, alertQty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">سعر الشراء</label>
                    <input type="number" min="0" value={editItemData.wholesalePrice} onChange={(e)=>setEditItemData({...editItemData, wholesalePrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">سعر البيع</label>
                    <input type="number" min="0" required value={editItemData.customerPrice} onChange={(e)=>setEditItemData({...editItemData, customerPrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  <FiSave /> حفظ التعديلات
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAddMoneyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiDollarSign className="text-emerald-400"/> إضافة إيراد جديد للقاصة</h2>
              <button onClick={() => setIsAddMoneyModalOpen(false)} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddManualMoney} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ (د.ع)</label>
                  <input type="number" required min="1" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="مثال: 50000" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">التاريخ</label>
                  <input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">البيان / ملاحظات (اختياري)</label>
                  <input type="text" value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="مثال: تسديد ديون سابقة من فني..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none" />
                </div>
                <button type="submit" disabled={isAddingMoney} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  {isAddingMoney ? <FiRefreshCw className="animate-spin" /> : <><FiCheckCircle /> تأكيد وإضافة</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isEditTotalModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiEdit2 className="text-emerald-400"/> تسوية رصيد القاصة</h2>
              <button onClick={() => setIsEditTotalModalOpen(false)} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            <div className="p-6">
              <div className="text-sm text-slate-500 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="mb-2">الرصيد الحالي للفترة المحددة هو:</p>
                <p className="text-xl font-black text-slate-800">{totalFinanceSum.toLocaleString()} د.ع</p>
                <p className="text-xs mt-3 leading-relaxed">أدخل الرصيد النهائي الذي تريده، وسيقوم النظام أوتوماتيكياً بإضافة حركة (تسوية حسابات) بفرق المبلغ للحفاظ على دقة السجلات التاريخية.</p>
              </div>
              <form onSubmit={(e) => handleEditTotalSubmit(e, totalFinanceSum)} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الرصيد الجديد للقاصة (د.ع)</label>
                  <input type="number" required value={newTotalAmount} onChange={(e) => setNewTotalAmount(e.target.value)} className="w-full bg-white border-2 border-emerald-500 rounded-xl py-3 px-4 focus:ring-4 focus:ring-emerald-100 outline-none font-black text-lg text-emerald-700" />
                </div>
                <button type="submit" disabled={isAddingMoney} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  {isAddingMoney ? <FiRefreshCw className="animate-spin" /> : <><FiSave /> حفظ الرصيد النهائي</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}