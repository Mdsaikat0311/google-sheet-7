import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  RotateCcw,
  Hourglass,
  Ban,
  Calendar,
  ChevronDown,
  TrendingUp,
  Download,
  RefreshCw,
  Layers,
  ShoppingBag,
  ExternalLink,
  Search,
  CheckCircle2,
  Phone,
  Globe,
  MessageCircle,
  Video,
  Share2,
  ChevronRight,
  Package,
} from 'lucide-react';
import { Order, Sheet1ProductReport } from '../types';
import { fetchSheet1Reports, DEFAULT_SPREADSHEET_ID } from '../services/sheets';
import {
  INITIAL_CUSTOMER_ANALYTICS,
} from '../data/initialOrders';

interface ReportsViewProps {
  spreadsheetId?: string;
  orders?: Order[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  spreadsheetId = DEFAULT_SPREADSHEET_ID,
  orders = [],
}) => {
  const [sheetProducts, setSheetProducts] = useState<Sheet1ProductReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'sources' | 'customers'>('products');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load Sheet 1 Report Data
  const loadSheet1Data = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchSheet1Reports(spreadsheetId);
      if (result.products && result.products.length > 0) {
        setSheetProducts(result.products);
        setLastUpdated(
          new Date().toLocaleTimeString('bn-BD', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch (err) {
      console.error('Failed to load Sheet 1 reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSheet1Data();
  }, [spreadsheetId]);

  // Aggregate stats across all products in Sheet 1
  const aggregatedStats = useMemo(() => {
    if (!sheetProducts.length) {
      return {
        totalLead: 0,
        totalConfirm: 0,
        confirmRate: '0%',
        totalDelivery: 0,
        deliveryRate: '0%',
        totalPending: 0,
        totalPartial: 0,
        totalQuantity: 0,
        totalCancel: 0,
        cancelRate: '0%',
      };
    }

    // If a specific product is selected
    if (selectedProduct !== 'all') {
      const p = sheetProducts.find((item) => item.productName === selectedProduct);
      if (p) {
        return {
          totalLead: p.overall.lead,
          totalConfirm: p.overall.confirm,
          confirmRate: p.overall.confirmRate,
          totalDelivery: p.overall.delivery,
          deliveryRate: p.overall.deliveryRate,
          totalPending: p.overall.pending,
          totalPartial: p.overall.partial,
          totalQuantity: p.overall.quantity,
          totalCancel: p.overall.cancel,
          cancelRate: p.overall.cancelRate,
        };
      }
    }

    // Sum overall across all products
    const lead = sheetProducts.reduce((sum, p) => sum + p.overall.lead, 0);
    const confirm = sheetProducts.reduce((sum, p) => sum + p.overall.confirm, 0);
    const delivery = sheetProducts.reduce((sum, p) => sum + p.overall.delivery, 0);
    const pending = sheetProducts.reduce((sum, p) => sum + p.overall.pending, 0);
    const partial = sheetProducts.reduce((sum, p) => sum + p.overall.partial, 0);
    const quantity = sheetProducts.reduce((sum, p) => sum + p.overall.quantity, 0);
    const cancel = sheetProducts.reduce((sum, p) => sum + p.overall.cancel, 0);

    return {
      totalLead: lead,
      totalConfirm: confirm,
      confirmRate: lead > 0 ? `${((confirm / lead) * 100).toFixed(1)}%` : '0%',
      totalDelivery: delivery,
      deliveryRate: confirm > 0 ? `${((delivery / confirm) * 100).toFixed(1)}%` : '0%',
      totalPending: pending,
      totalPartial: partial,
      totalQuantity: quantity,
      totalCancel: cancel,
      cancelRate: confirm > 0 ? `${((cancel / confirm) * 100).toFixed(1)}%` : '0%',
    };
  }, [sheetProducts, selectedProduct]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return sheetProducts.filter((p) => {
      const matchesSearch =
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sources.some((s) => s.source.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = selectedProduct === 'all' || p.productName === selectedProduct;
      return matchesSearch && matchesFilter;
    });
  }, [sheetProducts, searchTerm, selectedProduct]);

  // Aggregate sources across all products
  const sourceAnalytics = useMemo(() => {
    const sourceMap: {
      [key: string]: {
        name: string;
        lead: number;
        confirm: number;
        delivery: number;
        partial: number;
        pending: number;
        quantity: number;
        cancel: number;
      };
    } = {};

    sheetProducts.forEach((p) => {
      p.sources.forEach((s) => {
        const cleanName = s.sourceName || 'Unknown';
        if (!sourceMap[cleanName]) {
          sourceMap[cleanName] = {
            name: cleanName,
            lead: 0,
            confirm: 0,
            delivery: 0,
            partial: 0,
            pending: 0,
            quantity: 0,
            cancel: 0,
          };
        }
        sourceMap[cleanName].lead += s.lead;
        sourceMap[cleanName].confirm += s.confirm;
        sourceMap[cleanName].delivery += s.delivery;
        sourceMap[cleanName].partial += s.partial;
        sourceMap[cleanName].pending += s.pending;
        sourceMap[cleanName].quantity += s.quantity;
        sourceMap[cleanName].cancel += s.cancel;
      });
    });

    const list = Object.values(sourceMap);
    const totalLead = list.reduce((sum, item) => sum + item.lead, 0);

    const colors: { [key: string]: string } = {
      Website: '#3b82f6',
      Messenger: '#8b5cf6',
      Whatsapp: '#10b981',
      Tiktok: '#ec4899',
      'Call Direct': '#f59e0b',
      INCOMPLETE: '#ef4444',
      Youtube: '#dc2626',
    };

    return list.map((item) => ({
      ...item,
      percentage: totalLead > 0 ? Math.round((item.lead / totalLead) * 100) : 0,
      color: colors[item.name] || '#6b7280',
    }));
  }, [sheetProducts]);

  // Match live orders from Sheet 2 to each product
  const getRelatedOrdersForProduct = (productName: string): Order[] => {
    if (!orders || orders.length === 0) return [];
    const pLower = productName.toLowerCase();
    return orders.filter((o) => {
      const variant = (o.variant || '').toLowerCase();
      const prod = (o.product || '').toLowerCase();
      return (
        variant.includes(pLower) ||
        pLower.includes(variant) ||
        prod.includes(pLower) ||
        pLower.includes(prod)
      );
    });
  };

  // Live customer analytics derived from orders
  const derivedCustomerAnalytics = useMemo(() => {
    if (!orders || orders.length === 0) return INITIAL_CUSTOMER_ANALYTICS;

    const customerMap: {
      [key: string]: {
        name: string;
        phone: string;
        address: string;
        totalOrders: number;
        totalSpend: number;
        lastOrder: string;
      };
    } = {};

    orders.forEach((o) => {
      const phoneKey = o.customerPhone ? o.customerPhone.trim() : o.customerName;
      if (!customerMap[phoneKey]) {
        customerMap[phoneKey] = {
          name: o.customerName,
          phone: o.customerPhone,
          address: o.customerAddress,
          totalOrders: 0,
          totalSpend: 0,
          lastOrder: o.date || '08/09/26',
        };
      }
      customerMap[phoneKey].totalOrders += 1;
      customerMap[phoneKey].totalSpend += o.amount || o.total || 0;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        phone: c.phone,
        address: c.address,
        totalOrders: c.totalOrders,
        avgOrderValue: Math.round(c.totalSpend / (c.totalOrders || 1)),
        lastOrder: c.lastOrder,
        status: (c.totalOrders > 1 ? 'Active' : 'Active') as 'Active' | 'Inactive',
      }));
  }, [orders]);

  const getTimeLabel = () => {
    if (timeRange === 'today') return 'আজ';
    if (timeRange === 'week') return 'এই সপ্তাহ';
    return 'এই মাস';
  };

  const getSourceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('website')) return <Globe className="w-3.5 h-3.5 text-blue-400" />;
    if (n.includes('messenger')) return <MessageCircle className="w-3.5 h-3.5 text-purple-400" />;
    if (n.includes('whatsapp')) return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
    if (n.includes('tiktok')) return <Video className="w-3.5 h-3.5 text-pink-400" />;
    if (n.includes('call')) return <Phone className="w-3.5 h-3.5 text-amber-400" />;
    return <Share2 className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12151f] border border-[#1e2436] p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
              শীট ১ রিলেশন রিপোর্ট
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
              Sheet 1 Live Sync
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Google Sheet 1 থেকে সংগৃহীত প্রোডাক্ট অর্ডার ও সেলস সোর্স রিলেশন পারফরম্যান্স
            {lastUpdated && ` • শেষ আপডেট: ${lastUpdated}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={() => loadSheet1Data(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a2030] hover:bg-[#232c42] border border-[#2d3852] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="শীট ১ থেকে পুনরায় ডেটা রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'রিফ্রেশ হচ্ছে...' : 'রিয়েলটাইম রিফ্রেশ'}</span>
          </button>

          {/* Direct Sheet 1 link */}
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1c2234] border border-[#222a3d] text-gray-300 text-xs font-medium transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">গুগল শীট ১</span>
          </a>

          {/* Time Filter */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1d2334] border border-[#22293d] text-gray-200 text-xs font-semibold shadow-sm transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <span>[ {getTimeLabel()} ▾ ]</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-[#161a26] border border-[#273046] rounded-xl shadow-xl py-1 z-30 animate-fadeIn">
                {(['today', 'week', 'month'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setTimeRange(r);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#202638] ${
                      timeRange === r ? 'text-pink-400 font-bold' : 'text-gray-300'
                    }`}
                  >
                    {r === 'today' ? 'আজ' : r === 'week' ? 'এই সপ্তাহ' : 'এই মাস'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards (Sheet 1 Dynamic Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: মোট অর্ডার লিড */}
        <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
            <span className="truncate">মোট অর্ডার লিড</span>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {aggregatedStats.totalLead} টি
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                কনফার্ম: <span className="text-purple-300 font-bold">{aggregatedStats.totalConfirm}</span> টি
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Metric 2: সামগ্রিক কনফার্মেশন রেট */}
        <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-pink-500/40 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-400">
            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
            <span className="truncate">কনফার্মেশন রেট</span>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-pink-400 tracking-tight">
                {aggregatedStats.confirmRate}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                ডেলিভারি: <span className="text-emerald-400 font-bold">{aggregatedStats.totalDelivery}</span> টি
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Metric 3: ডেলিভারি সাকসেস রেট */}
        <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">ডেলিভারি রেট</span>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                {aggregatedStats.deliveryRate}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                পার্শিয়াল: <span className="text-amber-400 font-bold">{aggregatedStats.totalPartial}</span> টি
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Metric 4: মোট সেলস কোয়ান্টিটি ও ক্যান্সেল */}
        <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">কোয়ান্টিটি / ক্যান্সেল</span>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {aggregatedStats.totalQuantity} টি
              </div>
              <div className="text-[11px] text-rose-400 mt-0.5">
                ক্যান্সেল: {aggregatedStats.totalCancel} ({aggregatedStats.cancelRate})
              </div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Ban className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Product Filter Pills & Search Bar */}
      <div className="bg-[#12151f] border border-[#1e2436] p-3.5 sm:p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[#0e1017] p-1 rounded-xl border border-[#1e2436]">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'products'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              প্রোডাক্ট রিলেশন
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sources'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              সোর্স এনালিটিক্স
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'customers'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              কাস্টমার ডাটা
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="প্রোডাক্ট বা সোর্স খুঁজুন..."
              className="w-full bg-[#161a26] border border-[#242c40] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Product Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedProduct('all')}
            className={`px-3 py-1 rounded-lg shrink-0 font-medium transition-all ${
              selectedProduct === 'all'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold'
                : 'bg-[#161a26] text-gray-400 border border-[#20273a] hover:text-gray-200'
            }`}
          >
            সব প্রোডাক্ট ({sheetProducts.length})
          </button>
          {sheetProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p.productName)}
              className={`px-3 py-1 rounded-lg shrink-0 font-medium transition-all flex items-center gap-1.5 ${
                selectedProduct === p.productName
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-bold'
                  : 'bg-[#161a26] text-gray-400 border border-[#20273a] hover:text-gray-200'
              }`}
            >
              <span>{p.productName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#20273a] text-gray-300">
                {p.overall.lead}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab View 1: Product Relation Cards & Matrix */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              শীট ১ প্রোডাক্ট রিলেশন তালিকা ({filteredProducts.length} টি)
            </h3>
            <span className="text-xs text-gray-400">
              কার্ডে ক্লিক করে সোর্স বিশ্লেষণ ও রিলেটেড লাইভ অর্ডার দেখুন
            </span>
          </div>

          {loading ? (
            <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-12 text-center">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-300 font-medium">Sheet 1 থেকে ডেটা লোড হচ্ছে...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-8 text-center text-gray-400 text-xs">
              কোনো প্রোডাক্ট পাওয়া যায়নি।
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map((product) => {
                const isExpanded = expandedProductId === product.id;
                const relatedLiveOrders = getRelatedOrdersForProduct(product.productName);

                return (
                  <div
                    key={product.id}
                    className="bg-[#12151f] border border-[#1e2436] hover:border-purple-500/30 rounded-2xl p-4 sm:p-5 transition-all overflow-hidden"
                  >
                    {/* Top Row: Product Title + Metrics Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1c2232]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 font-black">
                          {product.productName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">
                              {product.productName}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1b2234] text-gray-300 border border-[#29344e]">
                              মোট লিড: {product.overall.lead}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                            শীট ১ হেডার: {product.rawHeader}
                          </p>
                        </div>
                      </div>

                      {/* Summary Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold">
                          কনফার্ম: <span className="text-white font-bold">{product.overall.confirm}</span> ({product.overall.confirmRate})
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
                          ডেলিভারি: <span className="text-white font-bold">{product.overall.delivery}</span> ({product.overall.deliveryRate})
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold">
                          কোয়ান্টিটি: <span className="text-white font-bold">{product.overall.quantity}</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold">
                          ক্যান্সেল: <span className="text-white font-bold">{product.overall.cancel}</span> ({product.overall.cancelRate})
                        </div>

                        {/* Expand / Collapse Button */}
                        <button
                          onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1b2234] hover:bg-[#252e46] border border-[#283552] text-xs text-pink-400 font-semibold transition-all ml-auto"
                        >
                          <span>{isExpanded ? 'সংক্ষেপ করুন' : 'বিস্তারিত রিলেশন'}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar of Conversion */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                        <span>কনভার্সন পারফরম্যান্স</span>
                        <span>
                          সাকসেস: <strong className="text-emerald-400">{product.overall.delivery}</strong> /{' '}
                          কনফার্ম: <strong className="text-purple-400">{product.overall.confirm}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#181d2a] h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{
                            width: `${
                              product.overall.lead > 0
                                ? (product.overall.delivery / product.overall.lead) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-emerald-500 h-full"
                          title="Delivered"
                        />
                        <div
                          style={{
                            width: `${
                              product.overall.lead > 0
                                ? ((product.overall.confirm - product.overall.delivery) /
                                    product.overall.lead) *
                                  100
                                : 0
                            }%`,
                          }}
                          className="bg-purple-500 h-full"
                          title="Confirmed"
                        />
                        <div
                          style={{
                            width: `${
                              product.overall.lead > 0
                                ? (product.overall.cancel / product.overall.lead) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-rose-500 h-full"
                          title="Cancelled"
                        />
                      </div>
                    </div>

                    {/* Expanded Content: Sources Matrix & Related Sheet 2 Orders */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#1c2232] space-y-4 animate-fadeIn">
                        {/* Section A: সোর্স ভিত্তিক বিস্তার (Source Performance) */}
                        <div>
                          <h5 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5 text-pink-400" />
                            সোর্স ভিত্তিক বিস্তার (Sheet 1 Source Matrix):
                          </h5>
                          <div className="overflow-x-auto rounded-xl border border-[#1f2638] bg-[#0d1017]">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-[#1c2336] bg-[#141926] text-gray-400">
                                  <th className="py-2 px-3 font-semibold">সোর্স (Channel)</th>
                                  <th className="py-2 px-3 font-semibold">শেয়ার %</th>
                                  <th className="py-2 px-3 font-semibold">লিড (Lead)</th>
                                  <th className="py-2 px-3 font-semibold">কনফার্ম (Confirm)</th>
                                  <th className="py-2 px-3 font-semibold">ডেলিভারি (Delivery)</th>
                                  <th className="py-2 px-3 font-semibold">কোয়ান্টিটি (Qty)</th>
                                  <th className="py-2 px-3 font-semibold">ক্যান্সেল (Cancel)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#181f2f]">
                                {product.sources.map((s, sIdx) => (
                                  <tr key={sIdx} className="hover:bg-[#131722] transition-colors">
                                    <td className="py-2 px-3 font-medium text-white flex items-center gap-2">
                                      {getSourceIcon(s.sourceName)}
                                      <span>{s.sourceName}</span>
                                    </td>
                                    <td className="py-2 px-3 text-pink-300 font-mono">
                                      {s.sharePercent}
                                    </td>
                                    <td className="py-2 px-3 text-gray-200 font-bold">{s.lead}</td>
                                    <td className="py-2 px-3 text-purple-300">
                                      {s.confirm} {s.confirmRate && `(${s.confirmRate})`}
                                    </td>
                                    <td className="py-2 px-3 text-emerald-400">
                                      {s.delivery} {s.deliveryRate && `(${s.deliveryRate})`}
                                    </td>
                                    <td className="py-2 px-3 text-blue-300">{s.quantity}</td>
                                    <td className="py-2 px-3 text-rose-400">
                                      {s.cancel} {s.cancelRate && `(${s.cancelRate})`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Section B: রিলেটেড লাইভ অর্ডার (Live Orders from Sheet 2) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                              রিলেটেড লাইভ অর্ডার (Sheet 2 Orders): {relatedLiveOrders.length} টি
                            </h5>
                            <span className="text-[11px] text-gray-400">
                              মোট COD মূল্য: ৳
                              {relatedLiveOrders.reduce(
                                (sum, o) => sum + (o.amount || o.total || 0),
                                0
                              )}
                            </span>
                          </div>

                          {relatedLiveOrders.length === 0 ? (
                            <div className="bg-[#0e1119] border border-[#1f2638] rounded-xl p-3 text-center text-gray-500 text-xs">
                              এই প্রোডাক্টের সাথে মিলে যাওয়া কোনো লাইভ অর্ডার Sheet 2 তে খুঁজে পাওয়া যায়নি।
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-[#1f2638] bg-[#0d1017]">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-[#1c2336] bg-[#141926] text-gray-400">
                                    <th className="py-2 px-3 font-semibold">ইনভয়েস / ID</th>
                                    <th className="py-2 px-3 font-semibold">গ্রাহক</th>
                                    <th className="py-2 px-3 font-semibold">ফোন</th>
                                    <th className="py-2 px-3 font-semibold">ঠিকানা</th>
                                    <th className="py-2 px-3 font-semibold">সোর্স</th>
                                    <th className="py-2 px-3 font-semibold">মূল্য (COD)</th>
                                    <th className="py-2 px-3 font-semibold">অর্ডার স্ট্যাটাস</th>
                                    <th className="py-2 px-3 font-semibold">স্টেডফাস্ট</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#181f2f]">
                                  {relatedLiveOrders.slice(0, 10).map((o, oIdx) => (
                                    <tr key={oIdx} className="hover:bg-[#131722] transition-colors">
                                      <td className="py-2 px-3 font-mono text-pink-400 font-bold">
                                        #{o.id}
                                      </td>
                                      <td className="py-2 px-3 font-medium text-white">
                                        {o.customerName}
                                      </td>
                                      <td className="py-2 px-3 text-gray-300 font-mono">
                                        {o.customerPhone || '—'}
                                      </td>
                                      <td className="py-2 px-3 text-gray-400 truncate max-w-[140px]">
                                        {o.customerAddress || '—'}
                                      </td>
                                      <td className="py-2 px-3 text-gray-300">{o.source}</td>
                                      <td className="py-2 px-3 text-emerald-400 font-mono font-semibold">
                                        ৳{o.amount || o.total}
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                          {o.status}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-[11px] text-gray-400">
                                        {o.steadfastStatus || 'No Sellect'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Tab View 2: Sales Source Analytics & Comparison Chart */}
      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Source Matrix */}
          <div className="lg:col-span-7 bg-[#12151f] border border-[#1e2436] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                সেলস সোর্স অনুযায়ী পারফরম্যান্স
              </h3>
              <span className="text-xs text-gray-400">Sheet 1 থেকে মোট চ্যানেল পরিসংখ্যান</span>
            </div>

            <div className="space-y-3">
              {sourceAnalytics.map((src, i) => (
                <div
                  key={i}
                  className="bg-[#0e1119] border border-[#1e2436] rounded-xl p-3.5 hover:border-[#2d3852] transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: src.color }}
                      />
                      <span className="text-xs font-bold text-white">{src.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#171c2a] text-pink-300 border border-pink-500/20 font-mono">
                        {src.percentage}% শেয়ার
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-200">
                      লিড: <strong className="text-white">{src.lead}</strong> টি
                    </div>
                  </div>

                  {/* Metrics Bar for this source */}
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-400 pt-2 border-t border-[#181d2c]">
                    <div>
                      কনফার্ম:{' '}
                      <span className="text-purple-300 font-bold">{src.confirm}</span>
                    </div>
                    <div>
                      ডেলিভারি:{' '}
                      <span className="text-emerald-400 font-bold">{src.delivery}</span>
                    </div>
                    <div>
                      কোয়ান্টিটি:{' '}
                      <span className="text-blue-300 font-bold">{src.quantity}</span>
                    </div>
                    <div>
                      ক্যান্সেল:{' '}
                      <span className="text-rose-400 font-bold">{src.cancel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SVG Donut Chart for Sources */}
          <div className="lg:col-span-5 bg-[#12151f] border border-[#1e2436] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                সোর্স শেয়ার পাই-চার্ট (Sheet 1)
              </h3>

              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#1a2030"
                      strokeWidth="14"
                      fill="transparent"
                    />
                    {(() => {
                      let accumulatedPercent = 0;
                      return sourceAnalytics.map((s, idx) => {
                        const dashLength = s.percentage * 2.387;
                        const dashOffset = -(accumulatedPercent * 2.387);
                        accumulatedPercent += s.percentage;
                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="38"
                            stroke={s.color}
                            strokeWidth="14"
                            strokeDasharray={`${dashLength} 300`}
                            strokeDashoffset={`${dashOffset}`}
                            fill="transparent"
                            className="transition-all duration-1000"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-white">
                      {aggregatedStats.totalLead}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">মোট লিড</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 pt-4 border-t border-[#1c2232] text-xs">
              {sourceAnalytics.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-gray-300">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono text-gray-400">
                    {item.percentage}% ({item.lead} টি)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Tab View 3: Customer Analytics Table */}
      {activeTab === 'customers' && (
        <div className="bg-[#12151f] border border-[#1e2436] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              কাস্টমার এনালিটিক্স (Sheet 2 Live Data)
            </h3>
            <span className="text-xs text-gray-400">টপ রিপিট কাস্টমার তালিকা</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1c2232] text-xs text-gray-400 font-semibold">
                  <th className="py-2.5 px-4">
                    কাস্টমার নাম
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Customer Name</span>
                  </th>
                  <th className="py-2.5 px-4">
                    ফোন নম্বর
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Phone</span>
                  </th>
                  <th className="py-2.5 px-4">
                    মোট অর্ডার
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Total Orders</span>
                  </th>
                  <th className="py-2.5 px-4">
                    গড় অর্ডার মূল্য
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Avg. Order Value</span>
                  </th>
                  <th className="py-2.5 px-4">
                    ঠিকানা
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Address</span>
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    স্ট্যাটাস
                    <br />
                    <span className="text-[10px] text-gray-600 font-normal">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171b26]">
                {derivedCustomerAnalytics.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#161a26] transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-200 text-xs">{c.name}</td>
                    <td className="py-3 px-4 text-pink-300 font-mono text-xs">{c.phone || '—'}</td>
                    <td className="py-3 px-4 text-gray-300 text-xs font-bold">
                      {c.totalOrders} টি
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                      ৳{c.avgOrderValue}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs truncate max-w-[160px]">
                      {c.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
