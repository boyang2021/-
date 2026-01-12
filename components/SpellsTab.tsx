
import React, { useState, useMemo } from 'react';
import { AppState, Action, Spell, CharacterSpellMetadata } from '../types';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const SpellsTab: React.FC<Props> = ({ state, dispatch }) => {
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(state.spells[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});

  const filteredSpells = useMemo(() => {
    return state.spells.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchLevel = filterLevel === 'all' || s.level === filterLevel;
      const matchConc = !filterType.includes('concentration') || s.concentration;
      const matchRitual = !filterType.includes('ritual') || s.ritual;
      return matchSearch && matchLevel && matchConc && matchRitual;
    });
  }, [state.spells, searchTerm, filterLevel, filterType]);

  const selectedSpell = useMemo(() => state.spells.find(s => s.id === selectedSpellId), [state.spells, selectedSpellId]);
  
  const characterMetadata = useMemo(() => 
    state.characterSpells.find(cs => cs.spell_id === selectedSpellId) || {
      spell_id: selectedSpellId || '', known: false, prepared: false, favorite: false, notes: ''
    }, [state.characterSpells, selectedSpellId]);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/).map(row => row.split(','));
      setCsvData(rows.filter(r => r.length > 1));
      setShowCsvImport(true);
    };
    reader.readAsText(file);
  };

  const processCsvImport = () => {
    if (Object.keys(mapping).length === 0) return;
    const dataRows = csvData.slice(1);
    const newSpells: Spell[] = dataRows.map((row, i) => ({
      id: `csv_${Date.now()}_${i}`,
      name: row[mapping.name] || 'Unknown',
      level: parseInt(row[mapping.level]) || 0,
      casting_time: row[mapping.casting_time] || '1 action',
      range: row[mapping.range] || 'Self',
      duration: row[mapping.duration] || 'Instantaneous',
      components: (row[mapping.components] || '').split('').filter(c => ['V', 'S', 'M'].includes(c)) as any[],
      concentration: (row[mapping.concentration] || '').toLowerCase().includes('yes') || (row[mapping.concentration] || '').toLowerCase().includes('true'),
      ritual: (row[mapping.ritual] || '').toLowerCase().includes('yes') || (row[mapping.ritual] || '').toLowerCase().includes('true'),
      classes: [],
      tags: [],
      description: row[mapping.description] || ''
    }));
    dispatch({ type: 'ADD_SPELLS', spells: newSpells });
    setShowCsvImport(false);
    setCsvData([]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[900px] gap-12 animate-fade-in">
      
      {/* Sidebar - Spell Codex Navigation */}
      <aside className="w-full lg:w-[400px] flex flex-col gap-8">
        <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-white/5 space-y-8">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-600 flex items-center">
            <span className="material-icons mr-3 text-amber-500">menu_book</span> 奥秘检索
          </h2>
          
          <div className="relative group">
            <span className="material-icons absolute left-6 top-5 text-slate-700">search</span>
            <input 
              type="text" 
              placeholder="寻找古老的咒语..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-sm outline-none focus:border-amber-500/40 transition-all font-black placeholder:font-normal placeholder:text-slate-800 text-white"
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setFilterType(prev => prev.includes('concentration') ? prev.filter(t => t !== 'concentration') : [...prev, 'concentration'])}
              className={`flex-1 text-[10px] font-black py-4 rounded-2xl border transition-all uppercase tracking-widest ${filterType.includes('concentration') ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-950 border-white/5 text-slate-600'}`}
            >专注</button>
            <button 
              onClick={() => setFilterType(prev => prev.includes('ritual') ? prev.filter(t => t !== 'ritual') : [...prev, 'ritual'])}
              className={`flex-1 text-[10px] font-black py-4 rounded-2xl border transition-all uppercase tracking-widest ${filterType.includes('ritual') ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-950 border-white/5 text-slate-600'}`}
            >仪式</button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] shadow-2xl border border-white/5 flex-1 flex flex-col overflow-hidden">
          <div className="flex overflow-x-auto p-6 border-b border-white/5 space-x-3 no-scrollbar bg-slate-950/20">
            {['all', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
              <button 
                key={lvl} 
                onClick={() => setFilterLevel(lvl as any)}
                className={`flex-shrink-0 w-12 h-12 rounded-2xl text-[11px] font-black transition-all ${filterLevel === lvl ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-600 hover:bg-white/5'}`}
              >{lvl === 'all' ? '∞' : lvl}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
            {filteredSpells.map(s => {
              const meta = state.characterSpells.find(cs => cs.spell_id === s.id);
              const isActive = selectedSpellId === s.id;
              return (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedSpellId(s.id)}
                  className={`p-6 rounded-[2rem] cursor-pointer transition-all border-2 ${isActive ? 'bg-amber-500/5 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'bg-slate-950 border-transparent hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`font-black text-lg tracking-tighter ${isActive ? 'text-white' : 'text-slate-400'}`}>{s.name}</span>
                    <span className="text-[10px] font-black text-slate-700">Lv {s.level}</span>
                  </div>
                  <div className="flex gap-2">
                    {meta?.prepared && <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border border-emerald-500/10">PREPARED</span>}
                    {s.concentration && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border border-amber-500/10">CONC</span>}
                  </div>
                </div>
              ))}
            {filteredSpells.length === 0 && (
              <div className="py-32 text-center text-slate-800">
                <span className="material-icons block text-5xl mb-4 opacity-10">auto_awesome</span>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">奥秘尚未显现</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-950/40 border-t border-white/5">
            <label className="block w-full text-center py-5 bg-slate-900 border border-white/5 rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] cursor-pointer hover:bg-amber-500 hover:text-slate-950 transition-all text-slate-600">
              铭刻新法术 (CSV) <input type="file" hidden accept=".csv" onChange={handleCsvFile} />
            </label>
          </div>
        </div>
      </aside>

      {/* Main Panel - Ancient Grimoire Detail */}
      <article className="flex-1 bg-slate-900 rounded-[4rem] border border-white/5 shadow-2xl overflow-y-auto no-scrollbar relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        
        {selectedSpell ? (
          <div className="p-16 xl:p-24 animate-fade-in relative z-10">
            <div className="flex flex-col xl:flex-row justify-between items-start gap-12 mb-16">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">LEVEL {selectedSpell.level}</span>
                  <span className="text-slate-600 font-black uppercase tracking-[0.5em] text-[10px]">{selectedSpell.school || '秘法系'}</span>
                </div>
                <h1 className="text-7xl font-black text-white tracking-[-0.05em]">{selectedSpell.name}</h1>
              </div>
              <button 
                onClick={() => dispatch({ type: 'UPDATE_CHARACTER_SPELL', metadata: { ...characterMetadata, prepared: !characterMetadata.prepared }})}
                className={`flex-shrink-0 px-12 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all shadow-2xl ${characterMetadata.prepared ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {characterMetadata.prepared ? '咒语已就绪' : '将咒语刻入心神'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
              {[
                { label: '施法时间', value: selectedSpell.casting_time, icon: 'bolt' },
                { label: '法术距离', value: selectedSpell.range, icon: 'straighten' },
                { label: '持续时间', value: selectedSpell.duration, icon: 'hourglass_empty' },
                { label: '法术成分', value: selectedSpell.components.join(', ') || '无', icon: 'auto_fix_normal' }
              ].map(info => (
                <div key={info.label} className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-white/5 group hover:border-amber-500/20 transition-all">
                  <span className="material-icons text-slate-700 text-xl mb-4 group-hover:text-amber-500 transition-colors">{info.icon}</span>
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{info.label}</div>
                  <div className="text-sm font-black text-white">{info.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-12">
              <div className="bg-slate-950/20 p-12 rounded-[3rem] border border-white/5">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 flex items-center">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-4"></span>
                   奥秘效应描述
                 </h4>
                 <div className="whitespace-pre-wrap text-slate-300 leading-loose text-lg font-medium selection:bg-amber-500/40">
                   {selectedSpell.description}
                 </div>
              </div>
              
              {selectedSpell.higher_level && (
                <div className="bg-blue-500/5 p-12 rounded-[3rem] border border-blue-500/10">
                  <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6">更高等阶施放</h4>
                  <div className="text-md text-blue-300/70 italic leading-relaxed">
                    {selectedSpell.higher_level}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-32 text-center">
            <div className="bg-slate-950 w-32 h-32 rounded-[3rem] flex items-center justify-center mb-10 border border-white/5 shadow-2xl">
              <span className="material-icons text-slate-900 text-6xl">menu_book</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-[0.3em]">尚未翻开任何书页</h2>
            <p className="text-sm text-slate-900 mt-4 font-bold max-w-xs">知识是抵抗遗忘的唯一盾牌，选择一个奥秘以开始研读。</p>
          </div>
        )}
      </article>

      {/* Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 z-[300] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[4rem] p-16 w-full max-w-3xl shadow-2xl border border-white/10 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <h2 className="text-5xl font-black mb-12 flex justify-between items-center text-white tracking-tighter">
              CSV 铭刻仪式
              <button onClick={() => setShowCsvImport(false)} className="material-icons text-slate-600 hover:text-white">close</button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {['name', 'level', 'description', 'casting_time', 'range', 'duration', 'components', 'concentration', 'ritual'].map(field => (
                <div key={field} className="flex flex-col space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">{field}</label>
                  <select 
                    className="bg-slate-950 border border-white/5 p-6 rounded-2xl font-black outline-none focus:border-amber-500 appearance-none text-amber-500"
                    onChange={e => setMapping(prev => ({...prev, [field]: parseInt(e.target.value)}))}
                  >
                    <option value="">- 对应数据列 -</option>
                    {csvData[0].map((header, idx) => <option key={idx} value={idx}>{header}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={processCsvImport} className="w-full bg-amber-500 text-slate-950 font-black py-8 rounded-[2.5rem] shadow-2xl shadow-amber-500/20 uppercase tracking-[0.4em] text-xl">开始导入奥秘库</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpellsTab;
