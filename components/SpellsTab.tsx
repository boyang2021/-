
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
    const headers = csvData[0];
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
    <div className="flex flex-col lg:flex-row h-[700px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm relative">
      
      {/* CSV Import Modal Overlay */}
      {showCsvImport && (
        <div className="absolute inset-0 z-[100] bg-white p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">CSV 字段映射</h2>
            <button onClick={() => setShowCsvImport(false)} className="material-icons">close</button>
          </div>
          <p className="text-sm text-slate-500 mb-4">请将 CSV 列关联到法术字段：</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 overflow-y-auto">
            {['name', 'level', 'description', 'casting_time', 'range', 'duration', 'components', 'concentration', 'ritual'].map(field => (
              <div key={field} className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">{field}</label>
                <select 
                  className="border rounded p-2 text-sm"
                  onChange={e => setMapping(prev => ({...prev, [field]: parseInt(e.target.value)}))}
                >
                  <option value="">-- 选择列 --</option>
                  {csvData[0].map((header, idx) => <option key={idx} value={idx}>{header}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-auto flex justify-end">
            <button onClick={processCsvImport} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-bold">执行导入</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 bg-slate-800 text-white">
          <h2 className="font-bold flex items-center mb-4">
            <span className="material-icons text-amber-400 mr-2">menu_book</span> 法术库
          </h2>
          <input 
            type="text" placeholder="搜索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-700 border-none rounded p-2 text-sm outline-none mb-3"
          />
          <div className="flex gap-2">
            <button 
              onClick={() => setFilterType(prev => prev.includes('concentration') ? prev.filter(t => t !== 'concentration') : [...prev, 'concentration'])}
              className={`text-[9px] font-bold px-2 py-0.5 rounded border transition ${filterType.includes('concentration') ? 'bg-amber-500 border-amber-500' : 'border-slate-600 text-slate-400'}`}
            >专注</button>
            <button 
              onClick={() => setFilterType(prev => prev.includes('ritual') ? prev.filter(t => t !== 'ritual') : [...prev, 'ritual'])}
              className={`text-[9px] font-bold px-2 py-0.5 rounded border transition ${filterType.includes('ritual') ? 'bg-amber-500 border-amber-500' : 'border-slate-600 text-slate-400'}`}
            >仪式</button>
          </div>
        </div>

        <div className="flex overflow-x-auto p-2 border-b space-x-1 no-scrollbar bg-white">
          {['all', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
            <button key={lvl} onClick={() => setFilterLevel(lvl as any)}
              className={`flex-shrink-0 px-3 py-1 rounded text-xs font-bold transition ${filterLevel === lvl ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
            >{lvl === 'all' ? '全部' : lvl}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSpells.map(s => {
            const meta = state.characterSpells.find(cs => cs.spell_id === s.id);
            return (
              <div key={s.id} onClick={() => setSelectedSpellId(s.id)}
                className={`p-3 border-b cursor-pointer transition ${selectedSpellId === s.id ? 'bg-white border-l-4 border-l-amber-500' : 'hover:bg-white/50'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-800 text-sm truncate pr-2">{s.name}</span>
                  <span className="text-[10px] font-black text-slate-300">Lvl {s.level}</span>
                </div>
                <div className="flex mt-1 space-x-1">
                  {meta?.prepared && <span className="material-icons text-[12px] text-green-500">check_circle</span>}
                  {s.concentration && <span className="text-[9px] font-bold text-amber-600">C</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-white border-t space-y-2">
          <label className="block w-full text-center py-2 bg-slate-100 rounded text-xs font-bold cursor-pointer hover:bg-slate-200">
            CSV 导入 <input type="file" hidden accept=".csv" onChange={handleCsvFile} />
          </label>
        </div>
      </aside>

      {/* Detail Pane */}
      <article className="flex-1 overflow-y-auto bg-white p-8">
        {selectedSpell ? (
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black text-slate-800 mb-2">{selectedSpell.name}</h1>
            <div className="text-amber-600 font-bold uppercase tracking-wider text-sm mb-6">
              Level {selectedSpell.level} {selectedSpell.school}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">施法时间</div>
                <div className="text-xs font-bold">{selectedSpell.casting_time}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">距离</div>
                <div className="text-xs font-bold">{selectedSpell.range}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">持续时间</div>
                <div className="text-xs font-bold">{selectedSpell.duration}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">成分</div>
                <div className="text-xs font-bold">{selectedSpell.components.join(', ')}</div>
              </div>
            </div>

            <div className="flex gap-4 mb-8 border-b pb-8">
              <button 
                onClick={() => dispatch({ type: 'UPDATE_CHARACTER_SPELL', metadata: { ...characterMetadata, prepared: !characterMetadata.prepared }})}
                className={`px-4 py-2 rounded text-sm font-bold border transition ${characterMetadata.prepared ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-green-200 text-green-600'}`}
              >{characterMetadata.prepared ? '已准备' : '准备法术'}</button>
            </div>

            <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-sm">{selectedSpell.description}</div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300">请选择法术</div>
        )}
      </article>
    </div>
  );
};

export default SpellsTab;
