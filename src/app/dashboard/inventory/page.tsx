'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit2,
  Trash2,
  PlusCircle,
  MinusCircle,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  DollarSign,
  Calendar,
  X,
  ChevronDown,
} from 'lucide-react';
import { IngredientData } from '@/lib/types';
import { formatNPR } from '@/lib/utils';
import { playChime } from '@/lib/audio';

const INVENTORY_CATEGORIES = [
  'All',
  'Meat & Poultry',
  'Vegetables & Produce',
  'Dairy & Eggs',
  'Grains & Spices',
  'Oils & Sauces',
  'Beverages',
  'Packaging',
  'General',
];

const STANDARD_UNITS = ['kg', 'g', 'ltr', 'ml', 'pcs', 'packets', 'cans', 'boxes', 'bundles'];

export default function IngredientInventoryPage() {
  const [ingredients, setIngredients] = useState<IngredientData[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalEstimatedValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IngredientData | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<{
    item: IngredientData;
    mode: 'add' | 'subtract';
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'Meat & Poultry',
    currentStock: '10',
    unit: 'kg',
    minAlertStock: '3',
    costPerUnit: '',
    supplier: '',
    notes: '',
  });
  const [adjustAmount, setAdjustAmount] = useState('1');
  const [adjustReason, setAdjustReason] = useState('Daily kitchen usage');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hotel/inventory');
      if (res.ok) {
        const data = await res.json();
        setIngredients(data.ingredients || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesLowStock = !lowStockOnly || item.currentStock <= item.minAlertStock;

      return matchesSearch && matchesCat && matchesLowStock;
    });
  }, [ingredients, searchQuery, selectedCategory, lowStockOnly]);

  // Seed default essentials if list is empty
  const handleSeedEssentials = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/hotel/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedEssentials: true }),
      });
      if (res.ok) {
        await fetchInventory();
        playChime('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add / Edit submission
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Ingredient name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        currentStock: parseFloat(formData.currentStock) || 0,
        unit: formData.unit.trim(),
        minAlertStock: parseFloat(formData.minAlertStock) || 0,
        costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : null,
        supplier: formData.supplier.trim() || null,
        notes: formData.notes.trim() || null,
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/hotel/inventory/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/hotel/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save ingredient');
      }

      setIsAddModalOpen(false);
      setEditingItem(null);
      resetForm();
      await fetchInventory();
      playChime('success');
    } catch (err: any) {
      setFormError(err.message || 'Error saving ingredient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick adjust submission
  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const qty = parseFloat(adjustAmount);
    if (!qty || qty <= 0) {
      alert('Please enter a valid positive quantity');
      return;
    }

    const delta = adjustingItem.mode === 'add' ? qty : -qty;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/hotel/inventory/${adjustingItem.item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockDelta: delta,
          reason: adjustReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Adjustment failed');
      }

      setAdjustingItem(null);
      setAdjustAmount('1');
      await fetchInventory();
      playChime('message');
    } catch (err: any) {
      alert(err.message || 'Error updating stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete ingredient
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    try {
      const res = await fetch(`/api/hotel/inventory/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIngredients((prev) => prev.filter((i) => i.id !== id));
        fetchInventory();
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting item');
    }
  };

  const openEditModal = (item: IngredientData) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      currentStock: String(item.currentStock),
      unit: item.unit,
      minAlertStock: String(item.minAlertStock),
      costPerUnit: item.costPerUnit ? String(item.costPerUnit) : '',
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Meat & Poultry',
      currentStock: '10',
      unit: 'kg',
      minAlertStock: '3',
      costPerUnit: '',
      supplier: '',
      notes: '',
    });
    setFormError(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-extrabold text-white">
                Ingredient & Raw Material Inventory
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Monitor ingredient quantities left, log kitchen usage, and avoid 86ing dishes during peak hours
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          {ingredients.length === 0 && (
            <button
              onClick={handleSeedEssentials}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Load Kitchen Essentials</span>
            </button>
          )}

          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-2.5 rounded-xl dark-btn text-stone-300 hover:text-white transition"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl gold-btn text-black text-xs font-bold flex items-center space-x-2 shadow-gold-glow hover:scale-105 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="p-5 rounded-3xl bg-[#16171B] border border-white/[0.08] shadow-premium-card flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 font-medium block">Tracked Ingredients</span>
            <span className="text-3xl font-serif font-black text-white mt-1 block">
              {stats.totalCount} <span className="text-xs font-sans text-stone-500">items</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-stone-800 border border-white/[0.06] text-stone-300 flex items-center justify-center">
            <Package className="w-5 h-5 text-gold-400" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="p-5 rounded-3xl bg-[#16171B] border border-amber-500/30 shadow-gold-glow flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-300 font-medium block">Low Stock Alert</span>
            <span className="text-3xl font-serif font-black text-amber-400 mt-1 block">
              {stats.lowStockCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Depleted / Out of Stock */}
        <div className="p-5 rounded-3xl bg-[#16171B] border border-red-500/30 shadow-pink-glow flex items-center justify-between">
          <div>
            <span className="text-xs text-red-400 font-medium block">Out of Stock (0 Left)</span>
            <span className="text-3xl font-serif font-black text-red-400 mt-1 block">
              {stats.outOfStockCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Estimated Value */}
        <div className="p-5 rounded-3xl bg-[#16171B] border border-emerald-500/30 shadow-premium-card flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-medium block">Est. Inventory Value</span>
            <span className="text-2xl sm:text-3xl font-serif font-black text-emerald-300 mt-1 block">
              {formatNPR(stats.totalEstimatedValue)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if items need attention */}
      {(stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#16171B] to-red-500/15 border border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                <span>Kitchen Attention Required</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                  {stats.lowStockCount + stats.outOfStockCount} Items Low / Out
                </span>
              </h4>
              <p className="text-xs text-stone-300 mt-0.5">
                Certain key ingredients have dropped below their minimum safety buffer. Reorder or update stock to prevent dishes becoming unavailable.
              </p>
            </div>
          </div>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
              lowStockOnly
                ? 'bg-amber-400 text-black shadow-gold-glow'
                : 'bg-stone-800 text-stone-200 border border-white/10 hover:border-amber-400/40'
            }`}
          >
            <span>{lowStockOnly ? 'Showing Low Stock Only' : 'Filter Low Stock Items'}</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#16171B]/90 border border-white/[0.08] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ingredient, category, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {INVENTORY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-gold-500 text-black shadow-gold-glow font-bold'
                  : 'bg-stone-900/80 text-stone-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients Grid / Cards */}
      {loading && ingredients.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mx-auto mb-3 shadow-gold-glow" />
          <p className="text-xs text-stone-400">Loading ingredient records...</p>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="p-16 text-center bg-[#16171B]/60 border border-white/[0.06] rounded-3xl backdrop-blur">
          <Boxes className="w-12 h-12 text-stone-600 mx-auto mb-2 opacity-50" />
          <h3 className="font-serif font-bold text-white text-base">No ingredients found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All' || lowStockOnly
              ? 'Try adjusting your search query or category filters.'
              : 'Start by clicking "Add Ingredient" or "Load Kitchen Essentials" to track remaining stock.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredIngredients.map((item) => {
            const isOutOfStock = item.currentStock <= 0;
            const isLowStock = !isOutOfStock && item.currentStock <= item.minAlertStock;
            const ratio = item.minAlertStock > 0 ? (item.currentStock / item.minAlertStock) * 100 : 100;
            const fillWidth = Math.min(100, Math.max(0, ratio));

            return (
              <div
                key={item.id}
                className={`bg-[#16171B]/90 backdrop-blur-xl border rounded-3xl p-5 shadow-premium-card flex flex-col justify-between transition-all duration-300 ${
                  isOutOfStock
                    ? 'border-red-500/50 shadow-pink-glow ring-1 ring-red-500/30'
                    : isLowStock
                    ? 'border-amber-500/50 shadow-gold-glow ring-1 ring-amber-500/30'
                    : 'border-white/[0.08] hover:border-gold-500/30'
                }`}
              >
                <div>
                  {/* Top Bar: Category Pill & Status Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-800 text-stone-300 border border-white/5 truncate max-w-[150px]">
                      {item.category}
                    </span>

                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 border border-red-500/40 text-red-400 flex items-center space-x-1 shrink-0">
                        <XCircle className="w-3 h-3" />
                        <span>Out of Stock</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center space-x-1 shrink-0 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Healthy</span>
                      </span>
                    )}
                  </div>

                  {/* Main Stock Counter */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-white text-base leading-snug line-clamp-1">
                        {item.name}
                      </h3>
                      {item.supplier && (
                        <p className="text-[11px] text-stone-400 mt-0.5 flex items-center space-x-1">
                          <span>Vendor:</span>
                          <span className="text-stone-300 font-medium">{item.supplier}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline space-x-1 justify-end">
                        <span
                          className={`text-2xl font-serif font-black ${
                            isOutOfStock
                              ? 'text-red-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-gold-400'
                          }`}
                        >
                          {item.currentStock}
                        </span>
                        <span className="text-xs font-semibold text-stone-400 uppercase">
                          {item.unit}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">
                        Min Alert: {item.minAlertStock} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-500'
                            : isLowStock
                            ? 'bg-amber-400 shadow-gold-glow'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${isOutOfStock ? 0 : Math.max(5, fillWidth)}%` }}
                      />
                    </div>
                  </div>

                  {/* Notes / Details */}
                  {item.notes && (
                    <p className="text-[11px] text-stone-400/90 mt-3 p-2 bg-stone-950/60 rounded-xl border border-white/5 line-clamp-2 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                  {/* Quick Usage (-) */}
                  <button
                    onClick={() => setAdjustingItem({ item, mode: 'subtract' })}
                    title="Log Kitchen Used Amount"
                    className="flex-1 py-1.5 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-red-300 border border-white/5 text-[11px] font-semibold flex items-center justify-center space-x-1 transition"
                  >
                    <MinusCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Used</span>
                  </button>

                  {/* Quick Restock (+) */}
                  <button
                    onClick={() => setAdjustingItem({ item, mode: 'add' })}
                    title="Restock Incoming Quantity"
                    className="flex-1 py-1.5 px-2 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/30 text-[11px] font-bold flex items-center justify-center space-x-1 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-gold-400" />
                    <span>Restock</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit Item Details"
                    className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    title="Delete Ingredient"
                    className="p-1.5 rounded-xl text-stone-500 hover:text-red-400 hover:bg-stone-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD / EDIT INGREDIENT                               */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#16171B] border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-white">
                  {editingItem ? 'Edit Ingredient' : 'Add New Ingredient'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveIngredient} className="mt-4 space-y-4">
              {/* Ingredient Name */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken (Breast), Basmati Rice, Mustard Oil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400"
                  >
                    {INVENTORY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 uppercase"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current Stock & Low Stock Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Current Quantity Left
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    placeholder="e.g. 15"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-300 block mb-1">
                    Low Stock Alert Trigger
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5"
                    value={formData.minAlertStock}
                    onChange={(e) => setFormData({ ...formData, minAlertStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-amber-500/30 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Cost Per Unit & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Cost per Unit (NPR, optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 380"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kalimati Mandi, DDC"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Notes (Storage location, shelf life, prep notes)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freezer #2, reorder on Tuesdays"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl gold-btn text-black text-xs font-bold shadow-gold-glow flex items-center space-x-1.5"
                >
                  <span>{editingItem ? 'Save Changes' : 'Create Ingredient'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: QUICK RESTOCK / LOG USAGE                           */}
      {/* ============================================================ */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#16171B] border border-white/[0.1] rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2">
                {adjustingItem.mode === 'add' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif font-bold text-sm text-white">
                    {adjustingItem.mode === 'add' ? 'Restock Stock' : 'Log Kitchen Usage'}
                  </h3>
                  <span className="text-[11px] text-stone-400 block truncate max-w-[200px]">
                    {adjustingItem.item.name}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setAdjustingItem(null)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdjust} className="mt-4 space-y-4">
              <div className="p-3 bg-stone-950/70 border border-white/5 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-stone-400">Current Balance:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {adjustingItem.item.currentStock} {adjustingItem.item.unit}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  {adjustingItem.mode === 'add' ? 'Quantity Added +' : 'Quantity Used -'} ({adjustingItem.item.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  autoFocus
                  placeholder={`Amount in ${adjustingItem.item.unit}`}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-white/10 rounded-xl text-base font-bold font-mono text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Reason / Purpose
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400"
                >
                  {adjustingItem.mode === 'add' ? (
                    <>
                      <option value="New stock delivery">New stock delivery</option>
                      <option value="Morning market purchase">Morning market purchase</option>
                      <option value="Supplier shipment">Supplier shipment</option>
                      <option value="Audit correction">Audit inventory correction</option>
                    </>
                  ) : (
                    <>
                      <option value="Daily kitchen usage">Daily kitchen cooking usage</option>
                      <option value="Prep batch cooked">Dish prep batch cooked</option>
                      <option value="Spoilage or waste">Spoilage / expired waste</option>
                      <option value="Damaged pack">Damaged packaging</option>
                      <option value="Audit correction">Audit inventory correction</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                    adjustingItem.mode === 'add'
                      ? 'gold-btn text-black shadow-gold-glow'
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-pink-glow'
                  }`}
                >
                  <span>{adjustingItem.mode === 'add' ? 'Confirm Restock' : 'Deduct Used Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
