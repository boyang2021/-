import React, { useState } from 'react';
import { AppState, Action, EquipmentItem, InventoryItem, StatKey } from '../types';
import { EMPTY_BONUS } from '../constants';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Fix: Provide explicit type for derived stats instead of any to prevent "unknown" type inference errors
  derived: {
    totalStats: Record<StatKey, number>;
    hpMax: number;
    saveDc: number;
    pb: number;
  };
}

const EquipmentTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { equipment, inventory } = state;
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [draggedInvId, setDraggedInvId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);

  const slotsOrder: (keyof AppState['equipment']['slots'])[] = [
    'head', 'chest', 'hands', 'feet', 'weapon', 'offhand', 'accessory'
  ];

  // Drag Handlers
  const handleInvDrag = (id: string) => { setDraggedInvId(id); setDraggedSlot(null); };
  const handleSlotDrag = (slot: string) => { setDraggedSlot(slot); setDraggedInvId(null); };
  const handleDropToSlot = (slot: keyof AppState['equipment']['slots']) => {
    if (draggedInvId) {
      const item = inventory.find(i => i.id === draggedInvId);
      if (item) dispatch({ type: 'EQUIP_ITEM', slot, item: { ...item } });
    }
  };
  const handleDropToNonSlot = () => {
    if (draggedSlot) dispatch({ type: 'UNEQUIP_ITEM', slot: draggedSlot as any });
  };

  const updateBonus = (stat: StatKey, val: string) => {
    if (!editingItem) return;
    const num = parseInt(val) || 0;
    setEditingItem({ ...editingItem, statBonus: { ...editingItem.statBonus, [stat]: num } });
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const invExists = inventory.find(i => i.id === editingItem.id);
    if (invExists) {
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', id: editingItem.id, payload: editingItem });
    } else {
      // It's equipped, find slot and update
      // Fix: Add explicit type to Object.entries to resolve 'unknown' property access error on item
      (Object.entries(equipment.slots) as [string, EquipmentItem | null][]).forEach(([slot, item]) => {
        if (item?.id === editingItem.id) {
          dispatch({ type: 'EQUIP_ITEM', slot: slot as any, item: editingItem });
        }
      });
    }
    setEditingItem(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" onDragOver={e => e.preventDefault()} onDrop={handleDropToNonSlot}>
      {/* Visual Slots */}
      <section className="lg:col-span-5 bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm relative">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 text-center">当前角色着装</h2>
        <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
          {slotsOrder.map(slot => {
            const item = equipment.slots[slot];
            return (
              <div key={slot} draggable={!!item} onDragStart={() => handleSlotDrag(slot)} onDragOver={e => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); handleDropToSlot(slot); }}
                className={`relative h-28 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-4 transition-all ${item ? 'border-amber-400 bg-amber-50/50 shadow-inner' : 'border-slate-100 bg-slate-50/30'}`}
              >
                <span className="absolute top-2 left-3 text-[8px] font-black text-slate-300 uppercase">{slot}</span>
                {item ? (
                  <div className="text-center group w-full h-full flex flex-col justify-center">
                    <span className="text-xs font-black text-slate-800 leading-tight block">{item.name}</span>
                    <button onClick={() => setEditingItem(item)} className="mt-2 text-[10px] font-bold text-amber-600 hover:underline">编辑属性</button>
                    <button onClick={(e) => { e.stopPropagation(); dispatch({type:'UNEQUIP_ITEM', slot}); }} className="absolute -top-1 -right-1 bg-white text-red-500 w-5 h-5 rounded-full border border-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"><span className="material-icons text-[12px]">delete</span></button>
                  </div>
                ) : <span className="material-icons text-slate-100 text-3xl">add</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Inventory */}
      <section className="lg:col-span-7 space-y-6">
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center"><span className="material-icons text-amber-500 mr-2 text-sm">inventory_2</span> 物品栏</h3>
            <button onClick={() => dispatch({type:'ADD_INVENTORY_ITEM', item: { id: 'inv_'+Date.now(), name: '新物品', type: 'misc', description: '属性待定', quantity: 1, statBonus: { ...EMPTY_BONUS }, otherModifiers: [], tags: [] }})} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-700 transition">NEW ITEM</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto no-scrollbar">
            {inventory.map(item => (
              <div key={item.id} draggable onDragStart={() => handleInvDrag(item.id)} className="bg-slate-800 border border-slate-700 p-4 rounded-2xl hover:border-amber-500/50 transition cursor-grab active:cursor-grabbing group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm">{item.name}</span>
                  <button onClick={() => setEditingItem(item)} className="material-icons text-xs text-slate-500 hover:text-white">edit</button>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {/* Fix: Explicitly cast 'v' to number to avoid 'unknown' comparison error */}
                  {Object.entries(item.statBonus).map(([s, v]) => (v as number) !== 0 && <span key={s} className="text-[9px] font-black text-amber-500 uppercase">{s} {(v as number) > 0 ? '+' : ''}{v as number}</span>)}
                </div>
                <div className="text-[9px] text-slate-500 italic">拖拽上身进行装备</div>
              </div>
            ))}
          </div>
        </div>

        {/* Final Stats Preview */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">数值最终汇总 (含装备)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {(Object.keys(state.character.stats) as StatKey[]).map(s => {
              // Fix: Explicitly cast to number and ensure types are resolved before numeric comparison to avoid "unknown" operator errors
              const baseValue: number = state.character.stats[s];
              const totalValue: number = derived.totalStats[s] || 0;
              
              return (
                <div key={s}>
                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{s} TOTAL</div>
                  <div className="text-2xl font-black text-slate-800 tabular-nums">
                    {totalValue}
                    {totalValue > baseValue && <span className="text-emerald-500 text-xs ml-1">↑</span>}
                    {totalValue < baseValue && <span className="text-red-500 text-xs ml-1">↓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
            <h2 className="text-xl font-black mb-6 flex justify-between uppercase">编辑装备属性 <button onClick={() => setEditingItem(null)} className="material-icons">close</button></h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">名称</label>
                <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full border-b focus:border-amber-500 outline-none py-2 font-bold text-lg"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(EMPTY_BONUS) as StatKey[]).map(s => (
                  <div key={s}>
                    <label className="text-[10px] font-black text-slate-400 uppercase">{s} 加成</label>
                    <input type="number" value={editingItem.statBonus[s]} onChange={e => updateBonus(s, e.target.value)} className="w-full border p-2 rounded-lg font-bold outline-none focus:border-amber-500"/>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveEdit} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-8 shadow-lg active:scale-95 transition">保存修改</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default EquipmentTab;