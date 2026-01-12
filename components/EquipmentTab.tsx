
import React, { useState } from 'react';
import { AppState, Action, EquipmentItem, InventoryItem, StatKey } from '../types';
import { EMPTY_BONUS } from '../constants';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: {
    baseStats: Record<StatKey, number>;
    equipmentBonus: Record<StatKey, number>;
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
      (Object.entries(equipment.slots) as [string, EquipmentItem | null][]).forEach(([slot, item]) => {
        if (item?.id === editingItem.id) {
          dispatch({ type: 'EQUIP_ITEM', slot: slot as any, item: editingItem });
        }
      });
    }
    setEditingItem(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12" onDragOver={e => e.preventDefault()} onDrop={handleDropToNonSlot}>
      
      {/* Visual Armor Doll System */}
      <section className="xl:col-span-5 flex flex-col items-center gap-10 bg-slate-900/50 rounded-[4rem] p-12 border border-white/5 relative shadow-2xl">
        <h2 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">装备槽位集成</h2>
        
        <div className="grid grid-cols-2 gap-8 w-full max-w-sm">
          {slotsOrder.map(slot => {
            const item = equipment.slots[slot];
            return (
              <div 
                key={slot} 
                draggable={!!item} 
                onDragStart={() => handleSlotDrag(slot)} 
                onDragOver={e => e.preventDefault()} 
                onDrop={(e) => { e.stopPropagation(); handleDropToSlot(slot); }}
                className={`relative h-36 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center p-6 group ${item ? 'bg-slate-900 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-slate-950 border-dashed border-white/5 hover:border-slate-700'}`}
              >
                <span className="absolute top-4 left-6 text-[9px] font-black text-slate-700 uppercase tracking-widest">{slot}</span>
                {item ? (
                  <div className="text-center w-full h-full flex flex-col justify-center animate-fade-in">
                    <span className="text-sm font-black text-slate-200 truncate mb-2">{item.name}</span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                       {Object.entries(item.statBonus).map(([s, v]) => (v as number) !== 0 && (
                         <span key={s} className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-lg border border-amber-500/10 uppercase">{s} +{v}</span>
                       ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/95 rounded-[2.3rem] transition-all gap-4">
                      <button onClick={() => setEditingItem(item)} className="p-3 bg-white text-slate-950 rounded-full material-icons text-lg hover:bg-amber-500 transition-all">edit</button>
                      <button onClick={(e) => { e.stopPropagation(); dispatch({type:'UNEQUIP_ITEM', slot}); }} className="p-3 bg-rose-600 text-white rounded-full material-icons text-lg hover:bg-rose-500 transition-all">delete</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-800">
                    <span className="material-icons text-4xl">add_moderator</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Inventory & Stats Summary */}
      <section className="xl:col-span-7 space-y-12">
        {/* Backpack Content */}
        <div className="bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center text-white">
                <span className="material-icons text-amber-500 mr-4">inventory_2</span> 
                行囊物品
              </h3>
              <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-widest">拖拽以着装至槽位</p>
            </div>
            <button 
              onClick={() => dispatch({type:'ADD_INVENTORY_ITEM', item: { id: 'inv_'+Date.now(), name: '新遗物', type: 'misc', description: '待鉴定的物品...', quantity: 1, statBonus: { ...EMPTY_BONUS }, otherModifiers: [], tags: [] }})} 
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-[1.5rem] text-[11px] font-black tracking-widest transition shadow-xl"
            >
              新增物品
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
            {inventory.map(item => (
              <div 
                key={item.id} 
                draggable 
                onDragStart={() => handleInvDrag(item.id)} 
                className="bg-slate-950/50 border border-white/5 p-8 rounded-[2.5rem] hover:border-amber-500/40 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="font-black text-lg text-slate-100 tracking-tighter">{item.name}</span>
                  <div className="flex gap-2">
                     <button onClick={() => setEditingItem(item)} className="material-icons text-slate-600 hover:text-white transition-colors text-lg">tune</button>
                     <button onClick={() => dispatch({type: 'DELETE_INVENTORY_ITEM', id: item.id})} className="material-icons text-slate-800 hover:text-rose-500 transition-colors text-lg">delete</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {Object.entries(item.statBonus).map(([s, v]) => (v as number) !== 0 && (
                    <span key={s} className="bg-slate-900 text-amber-500 text-[10px] font-black px-3 py-1 rounded-xl border border-white/5 uppercase">
                      {s} +{v}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-auto">
                   <div className="flex gap-2">
                      {item.tags.map(t => <span key={t} className="text-[8px] font-black text-slate-600 uppercase border border-slate-800 px-1.5 rounded">#{t}</span>)}
                   </div>
                   <span className="text-[10px] font-black text-slate-700">QTY: {item.quantity}</span>
                </div>
                <div className="h-1 w-0 group-hover:w-full bg-amber-500 absolute bottom-0 left-0 transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
              </div>
            ))}
            {inventory.length === 0 && (
               <div className="col-span-2 py-32 text-center bg-slate-950/20 border-2 border-dashed border-white/5 rounded-[3rem]">
                 <span className="material-icons text-slate-800 text-6xl mb-4">backpack</span>
                 <p className="text-slate-700 font-black uppercase tracking-widest text-xs">空空如也的行囊</p>
               </div>
            )}
          </div>
        </div>

        {/* Totals Comparison Card */}
        <div className="bg-slate-900 rounded-[3rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12">六维数值修正综览</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            {(Object.keys(state.character.stats) as StatKey[]).map(s => {
              const baseValue = state.character.stats[s];
              const totalValue = derived.totalStats[s] || 0;
              const diff = totalValue - baseValue;
              
              return (
                <div key={s} className="space-y-3">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">{s} TOTAL</span>
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-white tabular-nums tracking-tighter">{totalValue}</span>
                    {diff !== 0 && (
                      <span className={`text-[11px] font-black px-3 py-1 rounded-xl ${diff > 0 ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>
                        {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Item Forger Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[3.5rem] p-14 w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 animate-scale-in">
            <h2 className="text-4xl font-black mb-12 flex justify-between items-center text-white tracking-tighter">
              装备重铸
              <button onClick={() => setEditingItem(null)} className="material-icons text-slate-600 hover:text-white transition-colors">close</button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">物品全称</label>
                <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-xl outline-none focus:border-amber-500 transition-all text-white"/>
                
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">描述</label>
                <textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full h-32 bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 transition-all text-slate-400 resize-none"/>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {(Object.keys(EMPTY_BONUS) as StatKey[]).map(s => (
                  <div key={s}>
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">{s} 修正</label>
                    <input 
                      type="number" 
                      value={editingItem.statBonus[s]} 
                      onChange={e => updateBonus(s, e.target.value)} 
                      className="w-full bg-slate-950 border-2 border-white/5 p-5 rounded-2xl font-black outline-none focus:border-amber-500 transition-all text-amber-500 text-center text-2xl"
                    />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveEdit} className="w-full bg-amber-500 text-slate-950 font-black py-6 rounded-[2rem] mt-12 shadow-2xl shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest text-lg">
              完成重铸
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default EquipmentTab;
