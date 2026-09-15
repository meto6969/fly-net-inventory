import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { FiBox, FiTool, FiLayers, FiPlus, FiTrash2, FiMinus, FiCheckCircle, FiUser, FiDollarSign, FiCalendar, FiX, FiRefreshCw, FiEdit2, FiSave, FiList, FiShoppingCart, FiTrendingUp, FiLogOut, FiAlertCircle, FiSearch, FiPhone } from 'react-icons/fi';

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
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'main';
  });

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);
  
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

  const [salesFilterTech, setSalesFilterTech] = useState('');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(getLocalTodayDate()); 
  const [manualNote, setManualNote] = useState('');
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  const [isWithdrawMoneyModalOpen, setIsWithdrawMoneyModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(getLocalTodayDate());
  const [withdrawNote, setWithdrawNote] = useState('');
  const [isWithdrawingMoney, setIsWithdrawingMoney] = useState(false);

  const [isEditTotalModalOpen, setIsEditTotalModalOpen] = useState(false);
  const [newTotalAmount, setNewTotalAmount] = useState('');

  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: 0, alertQty: 0, wholesalePrice: 0, customerPrice: 0 });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemData, setEditItemData] = useState(null);

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellItemData, setSellItemData] = useState(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellCustomerName, setSellCustomerName] = useState('');
  const [sellCustomerPhone, setSellCustomerPhone] = useState('');
  const [sellIsFree, setSellIsFree] = useState(false);
  const [sellCustomPrice, setSellCustomPrice] = useState('');
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
            if (!groupedFinance[dateStr]) groupedFinance[dateStr] = { date: dateStr, total: 0, ticketsTotal: 0, ticketsProfit: 0, freeCost: 0, freeCount: 0, unpaidTicketsTotal: 0, manualNotes: [] };
            if (ticket.is_paid === true) {
               groupedFinance[dateStr].ticketsTotal += amount;
               groupedFinance[dateStr].total += amount; 
            } else {
               groupedFinance[dateStr].unpaidTicketsTotal += amount;
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
          const isPaid = entry.is_paid !== false;
          
          if (!groupedFinance[dateStr]) groupedFinance[dateStr] = { date: dateStr, total: 0, ticketsTotal: 0, ticketsProfit: 0, freeCost: 0, freeCount: 0, unpaidTicketsTotal: 0, manualNotes: [] };
          
          if (isPaid) {
            groupedFinance[dateStr].total += amount;
          }

          let itemProfit = 0;
          let itemFreeCost = 0;
          let isFree = false;

          if (entry.note && entry.note.includes('بيع مباشر (مواد)')) {
            const parts = entry.note.split('|').map(p => p.trim());
            const itemNameMatch = parts[0].replace('بيع مباشر (مواد):', '').trim();
            const qtyStr = parts.find(p => p.includes('العدد:')) || '';
            const qty = Number(qtyStr.replace('العدد:', '').trim()) || 1;
            isFree = amount === 0 && entry.note.includes('(مجاني)');

            const matchedItem = mainData.find(i => i.name === itemNameMatch);
            if (matchedItem) {
              const wholesale = Number(matchedItem.wholesalePrice) || 0;
              if (isFree) {
                itemFreeCost = wholesale * qty;
                if (isPaid) {
                  groupedFinance[dateStr].freeCost += itemFreeCost;
                  groupedFinance[dateStr].freeCount += qty;
                }
              } else {
                itemProfit = amount - (wholesale * qty);
                if (isPaid) {
                  groupedFinance[dateStr].ticketsProfit += itemProfit;
                }
              }
            }
          }

          groupedFinance[dateStr].manualNotes.push({
            id: entry.id, 
            amount: amount,
            note: entry.note || 'إيراد يدوي بدون ملاحظات',
            profit: itemProfit,
            freeCost: itemFreeCost,
            isFree: isFree,
            isPaid: isPaid
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
        const freeCost = isFree ? wholesalePrice : 0;

        const actualDate = entry.created_at || entry.date;
        
        let sellerName = 'المكتب (الإدارة)';
        let sellerType = 'office';
        
        const adminId = entry.created_by || entry.user_id || entry.username;
        if (adminId) {
           const userObj = allUsers.find(u => u.username === adminId);
           if (userObj) {
             sellerName = userObj.name;
             sellerType = userObj.role;
           } else {
             sellerName = adminId;
           }
        }

        const receiverPart = parts.find(p => p.includes('المستلم:')) || '';
        const receiverInfo = receiverPart.replace('المستلم:', '').trim();

        list.push({
          id: entry.id,
          source: 'manual',
          date: actualDate,
          displayDate: formatDate(actualDate),
          seller: sellerName,
          sellerType: sellerType,
          itemName: itemName,
          buyer: buyerInfo || 'زبون مباشر',
          quantity: qty,
          sellPrice: sellPrice,
          isFree: isFree,
          profit: profit,
          wholesaleCost: freeCost,
          profitKnown: !!matchedItem,
          isPaid: entry.is_paid !== false,
          receiverInfo: receiverInfo
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
          id: t.id,
          source: 'ticket',
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
          wholesaleCost: 0,
          profitKnown: false,
          isPaid: t.is_paid === true,
          receiverInfo: t.payment_receiver ? `${t.payment_receiver} (${formatDate(t.payment_date)})` : ''
        });
      }
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rawManualEntries, rawTickets, mainItems, allUsers]);

  const uniqueSellers = useMemo(() => {
    const sellers = new Set();
    salesList.forEach(sale => {
      if (sale.seller) {
        sellers.add(sale.seller);
      }
    });
    return Array.from(sellers).sort();
  }, [salesList]);

  const filteredSalesList = useMemo(() => {
    let list = salesList;
    
    if (salesFilterTech) {
      list = list.filter(sale => sale.seller === salesFilterTech);
    }
    
    if (salesStartDate) {
      const start = new Date(salesStartDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(sale => new Date(sale.date) >= start);
    }
    
    if (salesEndDate) {
      const end = new Date(salesEndDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(sale => new Date(sale.date) <= end);
    }

    if (salesSearchQuery) {
      const query = salesSearchQuery.toLowerCase();
      list = list.filter(sale => sale.buyer.toLowerCase().includes(query));
    }
    
    return list;
  }, [salesList, salesFilterTech, salesStartDate, salesEndDate, salesSearchQuery]);

  const totalSalesAmount = filteredSalesList.reduce((sum, item) => sum + (item.isPaid ? item.sellPrice : 0), 0);
  const totalProfitAmount = filteredSalesList.reduce((sum, item) => sum + (item.isPaid ? item.profit : 0), 0);
  const totalFreeCostAmount = filteredSalesList.reduce((sum, item) => sum + ((item.isPaid && item.isFree) ? (item.wholesaleCost || 0) : 0), 0);
  const totalFreeQty = filteredSalesList.reduce((sum, item) => sum + ((item.isPaid && item.isFree) ? item.quantity : 0), 0);
  const totalPendingAmount = filteredSalesList.reduce((sum, item) => sum + (!item.isPaid && !item.isFree ? item.sellPrice : 0), 0);

  const togglePaymentStatus = async (sale) => {
    const newStatus = !sale.isPaid;
    const receiverInfoStr = newStatus ? ` | المستلم: ${user?.name} (${getLocalTodayDate()})` : '';

    try {
      if (sale.source === 'manual') {
        const entry = rawManualEntries.find(e => e.id === sale.id);
        if (!entry) return;
        
        let updatedNote = entry.note;
        if (newStatus) {
           updatedNote += receiverInfoStr;
        } else {
           updatedNote = updatedNote.split(' | المستلم:')[0];
        }

        await supabase.from('safe_manual_entries').update({ 
          is_paid: newStatus,
          note: updatedNote
        }).eq('id', sale.id);

      } else if (sale.source === 'ticket') {
        await supabase.from('tickets').update({ 
          is_paid: newStatus,
          payment_receiver: newStatus ? user?.name : null,
          payment_date: newStatus ? new Date().toISOString() : null
        }).eq('id', sale.id);
      }
      
      showMsg(newStatus ? '✅ تم استلام المبلغ بنجاح!' : '⚠️ تم إرجاع العملية لحالة غير مستلم.');
      fetchData(); 
    } catch (err) {
      alert("حدث خطأ أثناء تغيير الحالة!");
    }
  };

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
    } catch (err) {
      alert("حدث خطأ أثناء الإضافة: " + err.message);
    }
    setIsAddingMoney(false);
  };

  const handleWithdrawMoney = async (e) => {
    e.preventDefault();
    if (!withdrawNote) {
      alert("يرجى كتابة سبب السحب.");
      return;
    }
    setIsWithdrawingMoney(true);
    try {
      const { error } = await supabase.from('safe_manual_entries').insert([
        { amount: -Math.abs(Number(withdrawAmount)), date: withdrawDate, note: withdrawNote, is_paid: true, created_by: user?.username || 'المكتب (الإدارة)' }
      ]);
      if (error) throw error;
      
      showMsg('✅ تم سحب المبلغ بنجاح');
      setIsWithdrawMoneyModalOpen(false);
      setWithdrawAmount('');
      setWithdrawNote('');
    } catch (err) {
      alert("حدث خطأ أثناء السحب: " + err.message);
    }
    setIsWithdrawingMoney(false);
  };

  const handleDeleteManualEntry = async (entryId) => {
    if (!entryId) return;
    if(window.confirm("هل أنت متأكد من حذف هذه الحركة المالية؟ سيؤثر هذا على إجمالي القاصة.")) {
      try {
        const { error } = await supabase.from('safe_manual_entries').delete().eq('id', entryId);
        if (error) throw error;
        showMsg('✅ تم حذف الحركة بنجاح');
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
    } catch (err) {
      alert("حدث خطأ أثناء تعديل الرصيد: " + err.message);
    }
    setIsAddingMoney(false);
  };

  const openSellModal = (item) => {
    setSellItemData(item);
    setSellQuantity(1);
    setSellCustomerName('');
    setSellCustomerPhone('');
    setSellCustomPrice(item.customerPrice);
    setSellIsFree(false);
    setIsSellModalOpen(true);
  };

  const toggleSellFree = () => {
    if (!sellIsFree) {
      setSellCustomPrice(0);
      setSellIsFree(true);
    } else {
      setSellCustomPrice(sellItemData.customerPrice);
      setSellIsFree(false);
    }
  };

  const handleSellItemSubmit = async (e) => {
    e.preventDefault();
    if (sellQuantity < 1 || sellQuantity > sellItemData.quantity) {
      alert("الكمية المطلوبة غير متوفرة في المخزن!");
      return;
    }
    if (!sellCustomerName || !sellCustomerPhone) {
      alert("يرجى إدخال اسم المشترك ورقم هاتفه.");
      return;
    }

    setIsSelling(true);

    const finalPrice = sellIsFree ? 0 : Number(sellCustomPrice);
    const totalPrice = finalPrice * sellQuantity;
    const freeLabel = sellIsFree ? ' (مجاني)' : '';
    const noteStr = `بيع مباشر (مواد): ${sellItemData.name} | العدد: ${sellQuantity} | المشتري: ${sellCustomerName} - ${sellCustomerPhone}${freeLabel} | المستلم: ${user?.name} (${getLocalTodayDate()})`;
    const todayDate = getLocalTodayDate();
    const adminUsername = user?.username || 'المكتب (الإدارة)';

    const updatedMainItems = mainItems.map(item => {
      if (item.id === sellItemData.id) {
        return { ...item, quantity: item.quantity - sellQuantity };
      }
      return item;
    });
    setMainItems(updatedMainItems);
    
    setIsSellModalOpen(false);
    setSellItemData(null);
    showMsg('✅ تمت عملية البيع بنجاح وخصم المادة!');

    try {
      await supabase.from('inventory_main').update({ quantity: sellItemData.quantity - sellQuantity }).eq('id', sellItemData.id);
      await supabase.from('safe_manual_entries').insert([{ amount: totalPrice, date: todayDate, note: noteStr, is_paid: true, created_by: adminUsername }]);
    } catch (err) {
      console.error("حدث خطأ أثناء البيع في الخلفية: ", err.message);
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
    }
  };

  const handleDeleteCategory = async (id) => {
    if(window.confirm("هل أنت متأكد من حذف هذا القسم؟")) {
      await supabase.from('inventory_categories').delete().eq('id', id);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('inventory_main').insert([newItem]);
    if (!error) {
      setNewItem({ name: '', category: '', quantity: 0, alertQty: 0, wholesalePrice: 0, customerPrice: 0 });
      showMsg('تمت إضافة المادة للمخزن بنجاح');
    }
  };

  const handleDeleteItem = async (id) => {
    if(window.confirm("هل أنت متأكد من حذف هذه المادة؟")) {
      await supabase.from('inventory_main').delete().eq('id', id);
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
        await supabase.from('inventory_techs').delete().eq('techUsername', techUsername).eq('itemId', itemId);
        showMsg('تمت إزالة المادة من ذمة الفني بنجاح');
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
        await supabase.from('inventory_techs').insert([{ techUsername: tech.username, techName: tech.name, itemId: item.id, itemName: item.name, category: item.category, quantity: changeQty, lastUpdated: new Date() }]);
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
  };

  const groupedTechItemsRaw = techItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) return acc; 
    if (!acc[item.techUsername]) acc[item.techUsername] = { name: item.techName, username: item.techUsername, itemsMap: {} };
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
    groupedTechItems[tech] = { ...groupedTechItemsRaw[tech], items: Object.values(groupedTechItemsRaw[tech].itemsMap) };
  });

  let filteredFinance = financeData;
  if (financeStartDate) filteredFinance = filteredFinance.filter(record => new Date(record.date) >= new Date(financeStartDate));
  if (financeEndDate) filteredFinance = filteredFinance.filter(record => new Date(record.date) <= new Date(financeEndDate));
  
  const totalFinanceSum = filteredFinance.reduce((sum, record) => sum + record.total, 0);
  const totalDailyMaterialsSum = filteredFinance.reduce((sum, record) => sum + (record.ticketsTotal + (record.manualNotes.reduce((s, m) => s + ((m.amount > 0 && m.note && m.note.includes('بيع مباشر') && m.isPaid) ? m.amount : 0), 0))), 0);
  
  const totalDailyProfitSum = filteredFinance.reduce((sum, record) => sum + (record.ticketsProfit || 0), 0);
  const totalFreeItemsCost = filteredFinance.reduce((sum, record) => sum + (record.freeCost || 0), 0);
  const totalFreeItemsCount = filteredFinance.reduce((sum, record) => sum + (record.freeCount || 0), 0);

  const totalWithdrawalsSum = filteredFinance.reduce((sum, record) => sum + record.manualNotes.reduce((s, m) => s + (m.amount < 0 && !m.note.includes('سحب رصيد') ? Math.abs(m.amount) : 0), 0), 0);

  const totalInventoryCapital = mainItems.reduce((sum, item) => sum + ((Number(item.wholesalePrice) || 0) * (Number(item.quantity) || 0)), 0);
  const totalExpectedProfit = mainItems.reduce((sum, item) => {
    const profit = (Number(item.customerPrice) || 0) - (Number(item.wholesalePrice) || 0);
    return sum + (profit * (Number(item.quantity) || 0));
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans" dir="rtl">
      
      {/* 🌟 نافذة التنبيهات العائمة التي حلت مشكلة دفع الجداول (Layout Shift) */}
      {msg && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in min-w-[320px] max-w-[90%] border-r-4 ${msg.includes('⚠️') ? 'bg-amber-50 border-amber-500' : 'bg-emerald-50 border-emerald-500'}`}>
          {msg.includes('⚠️') ? <FiAlertCircle className="text-amber-500 shrink-0" size={24} /> : <FiCheckCircle className="text-emerald-500 shrink-0" size={24} />}
          <p className={`font-bold text-sm md:text-base ${msg.includes('⚠️') ? 'text-amber-800' : 'text-emerald-800'}`}>{msg}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                <img src="/logo.jpeg" alt="Fly Teck" className="h-12 w-12 object-cover rounded-lg" />
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
                            <th className="p-4 font-bold text-center">إجمالي الربح (الصافي)</th>
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
                                <td className={`p-4 text-center font-black bg-slate-50/20 ${totalProfit > 0 ? 'text-blue-600' : totalProfit < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                  {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} د.ع
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
                                <span className={`text-lg ${totalExpectedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {totalExpectedProfit > 0 ? '+' : ''}{totalExpectedProfit.toLocaleString()} د.ع
                                </span>
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
                      <div className="text-center py-10 text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">لا توجد عُهد مصروفة حالياً.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(groupedTechItems).map((techGroup, index) => (
                          <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
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
                                    <button onClick={() => updateTechInventory(techGroup.username, item.itemId, 1, 'add')} className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><FiPlus size={14}/></button>
                                    <span className="font-black text-slate-700 min-w-[20px] text-center">{item.quantity}</span>
                                    <button onClick={() => updateTechInventory(techGroup.username, item.itemId, 1, 'remove')} className="bg-amber-50 text-amber-500 p-1.5 rounded-lg"><FiMinus size={14}/></button>
                                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                                    <button onClick={() => handleDeleteTechItemForce(techGroup.username, item.itemId, item.quantity, techGroup.name)} className="bg-red-50 text-red-500 p-1.5 rounded-lg"><FiTrash2 size={14} /></button>
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
                    <input type="text" required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="مثال: كابلات ضوئية" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none" />
                    <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl">إضافة</button>
                  </form>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4">الأقسام الحالية</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        {cat.name}
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 bg-white rounded-full p-1"><FiTrash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold mb-1">الأرباح المتوقعة (للمواد المتوفرة)</p>
                      <h3 className={`text-2xl font-black ${totalExpectedProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {totalExpectedProfit > 0 ? '+' : ''}{totalExpectedProfit.toLocaleString()} <span className="text-sm text-slate-400 font-normal">د.ع</span>
                      </h3>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-2xl text-orange-500"><FiTrendingUp size={28} /></div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold mb-1">رأس مال المخزن (سعر الشراء)</p>
                      <h3 className="text-2xl font-black text-slate-800">{totalInventoryCapital.toLocaleString()} <span className="text-sm text-slate-400 font-normal">د.ع</span></h3>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><FiBox size={28} /></div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    <div>
                      <p className="text-emerald-100 text-xs font-bold mb-1 flex justify-between items-center">
                        المجموع الكلي للقاصة (للفترة المحددة)
                        <button onClick={() => { setNewTotalAmount(totalFinanceSum); setIsEditTotalModalOpen(true); }} className="bg-white/20 hover:bg-white/40 p-1.5 rounded-lg transition-all" title="تسوية الرصيد">
                          <FiEdit2 size={14} />
                        </button>
                      </p>
                      <h3 className="text-3xl font-black mt-2" dir="ltr">
                        {totalFinanceSum.toLocaleString()} <span className="text-sm font-normal">د.ع</span>
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-500"><FiAlertCircle size={20}/></div>
                    <div>
                      <h3 className="font-bold text-rose-800 text-sm">المواد المصروفة مجانياً (خسارة تشغيلية)</h3>
                      <p className="text-xs text-rose-600 mt-0.5">عدد المواد المجانية المصروفة: <span className="font-black">{totalFreeItemsCount}</span> قطعة</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-rose-500 font-bold mb-0.5">التكلفة الإجمالية (خسارة)</p>
                    <p className="font-black text-rose-700 text-xl">-{totalFreeItemsCost.toLocaleString()} <span className="text-xs font-normal">د.ع</span></p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><FiDollarSign size={22} /></div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">سجل إيرادات قاصة المواد</h3>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-1 px-2"><span className="text-xs text-slate-400 font-bold">من:</span><input type="date" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" /></div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-1 px-2"><span className="text-xs text-slate-400 font-bold">إلى:</span><input type="date" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" /></div>
                      {(financeStartDate || financeEndDate) && <button onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); }} className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-xl font-bold">مسح</button>}
                    </div>
                    <button onClick={() => setIsAddMoneyModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 text-sm transition-all"><FiPlus size={18} /> إضافة مبلغ</button>
                    <button onClick={() => setIsWithdrawMoneyModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 text-sm transition-all shadow-sm"><FiMinus size={18} /> سحب مبلغ</button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4 px-6 flex items-center gap-2"><FiCalendar size={14} /> التاريخ</th>
                          <th className="py-4 px-6 text-center">مبلغ المواد اليومي</th>
                          <th className="py-4 px-6 text-center text-blue-600 bg-blue-50/50">ربح المبلغ اليومي</th>
                          <th className="py-4 px-6 text-center text-rose-600 bg-rose-50/50">عدد المجاني</th>
                          <th className="py-4 px-6 text-center text-rose-600 bg-rose-50/50">تكلفة المجاني (خسارة)</th>
                          <th className="py-4 px-6 text-center text-red-600 bg-red-50/50">المبلغ المسحوب</th>
                          <th className="py-4 px-6 text-center text-slate-500 bg-slate-50">تفاصيل السحب / الإضافة</th>
                          <th className="py-4 px-6 text-left">الرصيد النهائي للقاصة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredFinance.length === 0 ? (
                          <tr><td colSpan="8" className="py-12 text-center text-slate-400 font-medium">لا توجد مبالغ مسجلة.</td></tr>
                        ) : (
                          filteredFinance.map((record, idx) => {
                            const dailyMaterials = record.ticketsTotal + (record.manualNotes.reduce((s, m) => s + ((m.amount > 0 && m.note && m.note.includes('بيع مباشر') && m.isPaid) ? m.amount : 0), 0));
                            
                            const dailyProfit = record.ticketsProfit || 0;
                            const dailyFreeCost = record.freeCost || 0;
                            const dailyFreeCount = record.freeCount || 0;
                            const dailyWithdrawals = record.manualNotes.reduce((s, m) => s + (m.amount < 0 && !m.note.includes('سحب رصيد') ? Math.abs(m.amount) : 0), 0);
                            
                            const dailyOtherNotes = record.manualNotes.filter(m => !m.note.includes('بيع مباشر') && !m.note.includes('سحب رصيد') && !m.note.includes('زيادة رصيد')).map(m => m.amount > 0 ? `إضافة: ${m.note}` : `سحب: ${m.note}`).join(' ، ');

                            return (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-slate-700" dir="ltr">{record.date}</td>
                                <td className="py-4 px-6 text-center font-bold text-slate-800">{dailyMaterials.toLocaleString()} د.ع</td>
                                <td className={`py-4 px-6 text-center font-black ${dailyProfit > 0 ? 'text-blue-600' : dailyProfit < 0 ? 'text-red-500' : 'text-slate-600'} bg-blue-50/20`}>
                                  {dailyProfit > 0 ? '+' : ''}{dailyProfit.toLocaleString()} د.ع
                                </td>
                                <td className="py-4 px-6 text-center font-black text-rose-500 bg-rose-50/20">{dailyFreeCount > 0 ? dailyFreeCount : '-'}</td>
                                <td className="py-4 px-6 text-center font-black text-rose-500 bg-rose-50/20">{dailyFreeCost > 0 ? `-${dailyFreeCost.toLocaleString()} د.ع` : '-'}</td>
                                <td className="py-4 px-6 text-center font-black text-red-500 bg-red-50/20">{dailyWithdrawals > 0 ? `-${dailyWithdrawals.toLocaleString()} د.ع` : '-'}</td>
                                <td className="py-4 px-6 text-center text-xs text-slate-500 font-bold" title={dailyOtherNotes}>{dailyOtherNotes || '-'}</td>
                                
                                <td className="py-4 px-6 font-black text-emerald-700 text-left">{record.total.toLocaleString()} د.ع</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {filteredFinance.length > 0 && (
                        <tfoot className="bg-slate-900 text-white font-bold text-base">
                          <tr>
                            <td className="py-4 px-6 text-emerald-200">المجاميع الكلية:</td>
                            <td className="py-4 px-6 text-center text-white">{totalDailyMaterialsSum.toLocaleString()} د.ع</td>
                            <td className={`py-4 px-6 text-center ${totalDailyProfitSum > 0 ? 'text-blue-400' : totalDailyProfitSum < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                              {totalDailyProfitSum > 0 ? '+' : ''}{totalDailyProfitSum.toLocaleString()} د.ع
                            </td>
                            <td className="py-4 px-6 text-center text-rose-400">{totalFreeItemsCount > 0 ? totalFreeItemsCount : '-'}</td>
                            <td className="py-4 px-6 text-center text-rose-400">-{totalFreeItemsCost.toLocaleString()} د.ع</td>
                            <td className="py-4 px-6 text-center text-red-400">{totalWithdrawalsSum > 0 ? `-${totalWithdrawalsSum.toLocaleString()} د.ع` : '-'}</td>
                            <td className="py-4 px-6 text-center text-slate-400">-</td>

                            <td className="py-4 px-6 text-emerald-400 text-left">{totalFinanceSum.toLocaleString()} د.ع</td>
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
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><FiShoppingCart className="text-orange-500"/> قائمة المبيعات والذمم الشاملة</h3>
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-xl text-sm font-black border border-amber-200 shadow-sm flex items-center gap-2">
                      <FiAlertCircle /> مبالغ غير مستلمة: {totalPendingAmount.toLocaleString()} د.ع
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200">
                      إجمالي الحركات: {filteredSalesList.length}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 flex-grow min-w-[250px]">
                    <FiSearch className="text-slate-400 ml-1" size={18} />
                    <input 
                      type="text" 
                      value={salesSearchQuery} 
                      onChange={(e) => setSalesSearchQuery(e.target.value)} 
                      placeholder="بحث عن اسم المشترك أو رقم الهاتف..." 
                      className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-xs text-slate-400 font-bold">الفني (البائع):</span>
                      <select value={salesFilterTech} onChange={(e) => setSalesFilterTech(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                        <option value="">الكل</option>
                        {uniqueSellers.map((sellerName, idx) => (
                          <option key={idx} value={sellerName}>{sellerName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-xs text-slate-400 font-bold">من:</span>
                      <input type="date" value={salesStartDate} onChange={(e) => setSalesStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" />
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-xs text-slate-400 font-bold">إلى:</span>
                      <input type="date" value={salesEndDate} onChange={(e) => setSalesEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" />
                    </div>
                  </div>
                  
                  {(salesFilterTech || salesStartDate || salesEndDate || salesSearchQuery) && (
                    <button onClick={() => { setSalesFilterTech(''); setSalesStartDate(''); setSalesEndDate(''); setSalesSearchQuery(''); }} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold transition-colors">
                      مسح الفلاتر
                    </button>
                  )}
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
                        <th className="p-4 font-bold text-center">حالة الاستلام</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredSalesList.length === 0 ? (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400 font-bold">لا توجد حركات مطابقة للبحث.</td></tr>
                      ) : (
                        filteredSalesList.map((sale) => (
                          <tr key={sale.id} className={`transition-colors ${!sale.isPaid && !sale.isFree ? 'bg-amber-50/30 hover:bg-amber-50' : 'hover:bg-slate-50'}`}>
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
                            
                            <td className={`p-4 text-center font-black ${sale.isFree ? 'bg-slate-50/50 text-rose-500' : !sale.isPaid ? 'bg-amber-50 text-amber-700' : 'text-emerald-600 bg-emerald-50/30'}`}>
                              {sale.isFree ? <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-black">مجاني</span> : `${sale.sellPrice.toLocaleString()} د.ع`}
                            </td>

                            <td className={`p-4 text-center font-black ${sale.isFree ? 'bg-slate-50/30' : !sale.isPaid ? 'bg-amber-50/50 text-slate-400' : sale.profit > 0 ? 'text-blue-600 bg-blue-50/30' : sale.profit < 0 ? 'text-red-500 bg-red-50/30' : 'text-slate-600 bg-slate-50/30'}`}>
                              {sale.isFree ? (
                                <div className="text-rose-600 text-[10px] leading-tight font-bold">
                                  <span>تكلفة المجاني:</span><br/>
                                  <span>-{sale.wholesaleCost.toLocaleString()} د.ع</span>
                                </div>
                              ) : !sale.isPaid ? (
                                <span className="text-xs">معلق</span>
                              ) : sale.profitKnown ? (
                                <span>{sale.profit > 0 ? '+' : ''}{sale.profit.toLocaleString()} د.ع</span>
                              ) : (
                                <span className="text-xs text-slate-400">غير محدد</span>
                              )}
                            </td>

                            <td className="p-4 text-center">
                              {sale.isFree ? (
                                <span className="text-xs font-bold text-slate-400">لا ينطبق</span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <button 
                                    onClick={() => togglePaymentStatus(sale)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm border ${sale.isPaid ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                                  >
                                    {sale.isPaid ? '✔️ مستلم' : '⏳ غير مستلم'}
                                  </button>
                                  {sale.isPaid && sale.receiverInfo && (
                                    <span className="text-[10px] text-slate-400 font-bold leading-tight max-w-[120px]" title={sale.receiverInfo}>استلم: {sale.receiverInfo.split('(')[0]}</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredSalesList.length > 0 && (
                      <tfoot className="bg-slate-900 text-white">
                        <tr>
                          <td colSpan="3" className="p-5 font-black text-lg text-emerald-200 border-l border-slate-700">مجاميع المبالغ المستلمة:</td>
                          <td className="p-5 text-center font-black text-white border-l border-slate-700">
                            المجاني: {totalFreeQty} <br/> <span className="text-xs text-slate-400 font-normal">مادة</span>
                          </td>
                          <td className="p-5 text-center font-black text-emerald-400 text-xl border-l border-slate-700">{totalSalesAmount.toLocaleString()} د.ع</td>
                          <td className="p-5 text-center font-black text-xl flex flex-col justify-center gap-1 border-l border-slate-700">
                            <span className={`${totalProfitAmount > 0 ? 'text-blue-400' : totalProfitAmount < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                              {totalProfitAmount > 0 ? '+' : ''}{totalProfitAmount.toLocaleString()} د.ع
                            </span>
                            {totalFreeCostAmount > 0 && <span className="text-xs text-rose-400 font-bold bg-rose-900/30 py-0.5 px-2 rounded w-fit mx-auto">خسارة المجاني: -{totalFreeCostAmount.toLocaleString()}</span>}
                          </td>
                          <td className="p-5 text-center font-black">
                             <div className="text-amber-400 text-sm">ديون معلقة:</div>
                             <div className="text-amber-300">{totalPendingAmount.toLocaleString()} د.ع</div>
                          </td>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiShoppingCart className="text-emerald-400"/> بيع مادة مباشرة</h2>
              <button onClick={() => { setIsSellModalOpen(false); setSellItemData(null); }} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                <p className="text-slate-500 text-xs font-bold mb-1">المادة المطلوبة:</p>
                <p className="text-lg font-black text-slate-800">{sellItemData.name}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm font-bold text-slate-500">متوفر: {sellItemData.quantity}</span>
                </div>
              </div>

              <form onSubmit={handleSellItemSubmit} className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiUser/> اسم المشترك (إجباري)</label>
                    <input type="text" required value={sellCustomerName} onChange={(e) => setSellCustomerName(e.target.value)} placeholder="الاسم الكامل" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><FiPhone/> رقم الهاتف (إجباري)</label>
                    <input type="tel" required value={sellCustomerPhone} onChange={(e) => setSellCustomerPhone(e.target.value)} placeholder="07XX XXX XXXX" dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-emerald-100 outline-none text-right" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">العدد (الكمية)</label>
                    <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button type="button" onClick={() => setSellQuantity(Math.max(1, sellQuantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-200 text-slate-600 font-bold shadow-sm">-</button>
                      <span className="font-black text-lg text-slate-800">{sellQuantity}</span>
                      <button type="button" onClick={() => setSellQuantity(Math.min(sellItemData.quantity, sellQuantity + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold shadow-sm">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">السعر للمفرد (د.ع)</label>
                    <input 
                      type="number" 
                      min="0" 
                      required 
                      disabled={sellIsFree}
                      value={sellCustomPrice} 
                      onChange={(e) => setSellCustomPrice(e.target.value)} 
                      className={`w-full border rounded-xl py-2 px-3 outline-none font-bold transition-colors h-[44px] ${sellIsFree ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-emerald-200 text-emerald-700 focus:ring-2 focus:ring-emerald-100'}`} 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pb-1 mt-[-5px]">
                  <button type="button" onClick={toggleSellFree} className={`w-1/2 py-2 rounded-xl text-xs font-bold border transition-colors ${sellIsFree ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {sellIsFree ? 'إلغاء المجاني' : 'صرف مجاني'}
                  </button>
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex justify-between items-center border border-emerald-100 mt-2">
                  <span className="font-bold">الإجمالي المطلوب:</span>
                  <span className="font-black text-2xl">
                    {sellIsFree ? 'مجاني' : (Number(sellCustomPrice) * sellQuantity).toLocaleString()} 
                    {!sellIsFree && <span className="text-sm font-bold mr-1">د.ع</span>}
                  </span>
                </div>

                <button type="submit" disabled={isSelling || sellItemData.quantity < 1} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  {isSelling ? <FiRefreshCw className="animate-spin" /> : <><FiCheckCircle /> تأكيد البيع واستلام المبلغ</>}
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

      {isWithdrawMoneyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in relative">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiMinus className="text-red-400"/> سحب مبلغ من القاصة</h2>
              <button onClick={() => setIsWithdrawMoneyModalOpen(false)} className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-colors"><FiX /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleWithdrawMoney} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ المراد سحبه (د.ع)</label>
                  <input type="number" required min="1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="مثال: 25000" className="w-full bg-slate-50 border border-red-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-red-100 outline-none font-bold text-red-600" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">التاريخ</label>
                  <input type="date" required value={withdrawDate} onChange={(e) => setWithdrawDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-red-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">سبب السحب / ملاحظة <span className="text-red-500">*</span></label>
                  <input type="text" required value={withdrawNote} onChange={(e) => setWithdrawNote(e.target.value)} placeholder="مثال: شراء قرطاسية للمكتب..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-red-100 outline-none" />
                </div>
                <button type="submit" disabled={isWithdrawingMoney} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2">
                  {isWithdrawingMoney ? <FiRefreshCw className="animate-spin" /> : <><FiMinus /> تأكيد السحب وخصم القاصة</>}
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