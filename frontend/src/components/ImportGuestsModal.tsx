import { useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, AlertTriangle, CheckCircle2, ChevronDown,
  FileText, ArrowRight, Loader2, Users, SkipForward,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Category, Side } from '../types';
import { rsvpService, supabase } from '../services/supabase';

interface ContactDraft { name: string; phone: string; side: Side | null; category: Category; }

interface ImportGuestsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  userId: string;
  eventId: string;
}

type ImportStep = 'upload' | 'contacts-review' | 'map' | 'preview' | 'importing' | 'done';

interface ColumnMap {
  fullName:   number | null;
  phone:      number | null;
  side:       number | null;
  category:   number | null;
  companions: number | null;
  notes:      number | null;
}

interface ParsedRow {
  fullName:   string;
  phone:      string;
  side:       Side | null;
  category:   Category;
  companions: number;
  notes:      string;
  valid:      boolean;
  errors:     string[];
}

interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   number;
}

// ── Helpers ──────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    result.push(cur.trim());
    return result;
  });
}

function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-\(\)\.]/g, '');
  if (p.startsWith('+972')) p = '0' + p.slice(4);
  else if (p.startsWith('972') && p.length >= 12) p = '0' + p.slice(3);
  return p;
}

const PHONE_RE = /^0[2-9]\d{7,8}$/;

const CATEGORY_MAP: Record<string, Category> = {
  'משפחה': 'FAMILY', family: 'FAMILY',
  'חברים': 'FRIENDS', friends: 'FRIENDS',
  'עבודה': 'WORK',   work: 'WORK',
  'אחר': 'OTHER',   other: 'OTHER',
};

const SIDE_MAP: Record<string, Side> = {
  'חתן': 'GROOM', groom: 'GROOM',
  'כלה': 'BRIDE', bride: 'BRIDE',
  'משותף': 'SHARED', shared: 'SHARED', 'שניהם': 'SHARED',
};

function parseCategory(raw: string): Category {
  return CATEGORY_MAP[raw.trim().toLowerCase()] ?? CATEGORY_MAP[raw.trim()] ?? 'OTHER';
}

function parseSide(raw: string): Side | null {
  const key = raw.trim().toLowerCase();
  return SIDE_MAP[key] ?? SIDE_MAP[raw.trim()] ?? null;
}

const COL_PATTERNS: Record<keyof ColumnMap, RegExp> = {
  fullName:   /שם|name/i,
  phone:      /טלפון|נייד|phone|mobile|cell/i,
  side:       /^צד$|^side$/i,
  category:   /קטגוריה|category/i,
  companions: /מלווים|companion|guest/i,
  notes:      /הערות|note|remark|comment/i,
};

function autoDetect(headers: string[]): ColumnMap {
  const map: ColumnMap = { fullName: null, phone: null, side: null, category: null, companions: null, notes: null };
  (Object.keys(COL_PATTERNS) as (keyof ColumnMap)[]).forEach(field => {
    const idx = headers.findIndex(h => COL_PATTERNS[field].test(h));
    if (idx !== -1) map[field] = idx;
  });
  return map;
}

function buildRow(raw: string[], map: ColumnMap): ParsedRow {
  const get = (i: number | null) => (i !== null && i < raw.length ? raw[i] : '');
  const fullName   = get(map.fullName).trim();
  const rawPhone   = get(map.phone).trim();
  const phone      = normalizePhone(rawPhone);
  const side       = map.side !== null ? parseSide(get(map.side)) : null;
  const category   = map.category !== null ? parseCategory(get(map.category)) : 'OTHER';
  const companions = Math.max(0, parseInt(get(map.companions), 10) || 0);
  const notes      = get(map.notes).trim();

  const errors: string[] = [];
  if (!fullName)             errors.push('שם חסר');
  if (!rawPhone)             errors.push('טלפון חסר');
  else if (!PHONE_RE.test(phone)) errors.push('טלפון לא תקין');

  return { fullName, phone, side, category, companions, notes, valid: errors.length === 0, errors };
}

// ── Field labels ─────────────────────────────────────────────
const FIELDS: { key: keyof ColumnMap; label: string; required: boolean }[] = [
  { key: 'fullName',   label: 'שם מלא',    required: true  },
  { key: 'phone',      label: 'טלפון',      required: true  },
  { key: 'side',       label: 'צד',         required: false },
  { key: 'category',   label: 'קטגוריה',   required: false },
  { key: 'companions', label: 'מלווים',     required: false },
  { key: 'notes',      label: 'הערות',      required: false },
];

const catLabel: Record<Category, string> = {
  FAMILY: 'משפחה', FRIENDS: 'חברים', WORK: 'עבודה', OTHER: 'אחר',
};

const sideLabel: Record<Side, string> = {
  GROOM: 'צד החתן', BRIDE: 'צד הכלה', SHARED: 'משותף',
};

// ── Component ─────────────────────────────────────────────────
export const ImportGuestsModal = ({ open, onClose, onImported, userId, eventId }: ImportGuestsModalProps) => {

  const [step, setStep]         = useState<ImportStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rawRows, setRawRows]   = useState<string[][]>([]);
  const [colMap, setColMap]     = useState<ColumnMap>({ fullName: null, phone: null, side: null, category: null, companions: null, notes: null });
  const [progress, setProgress] = useState(0);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [savingContacts, setSavingContacts] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasContactsAPI = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const pickContacts = async () => {
    try {
      const raw = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      const parsed: ContactDraft[] = raw
        .filter((c: any) => c.name?.[0] && c.tel?.[0])
        .map((c: any) => ({
          name:     c.name[0].trim(),
          phone:    c.tel[0].replace(/[\s\-\(\)\.]/g, ''),
          side:     null,
          category: 'OTHER' as Category,
        }));
      if (parsed.length > 0) { setContacts(parsed); setStep('contacts-review'); }
    } catch { /* user cancelled */ }
  };

  const saveContacts = async () => {
    if (!contacts.length || !userId || !eventId) return;
    setSavingContacts(true);
    try {
      const { data: existing } = await supabase.from('guests').select('phone').eq('user_id', userId).eq('event_id', eventId);
      const existingPhones = new Set((existing ?? []).map((g: any) => normalizePhone(g.phone)));
      const toInsert = contacts
        .filter(c => !existingPhones.has(normalizePhone(c.phone)))
        .map(c => ({
          user_id: userId, full_name: c.name, phone: c.phone,
          event_id: eventId,
          rsvp_status: 'PENDING', companions: 0,
          side: c.side ?? null, category: c.category,
          rsvp_token: rsvpService.generateToken(),
        }));
      if (toInsert.length > 0) {
        await supabase.from('guests').insert(toInsert);
      }
      setResult({ imported: toInsert.length, skipped: contacts.length - toInsert.length, errors: 0 });
      setStep('done');
      if (toInsert.length > 0) onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, errors: contacts.length });
      setStep('done');
    } finally { setSavingContacts(false); }
  };

  const preview = useMemo<ParsedRow[]>(
    () => rawRows.map(r => buildRow(r, colMap)),
    [rawRows, colMap]
  );

  const validCount   = preview.filter(r => r.valid).length;
  const invalidCount = preview.filter(r => !r.valid).length;

  const reset = useCallback(() => {
    setStep('upload'); setDragging(false); setFileName('');
    setHeaders([]); setRawRows([]); setProgress(0); setResult(null);
    setContacts([]); setSavingContacts(false);
    setColMap({ fullName: null, phone: null, side: null, category: null, companions: null, notes: null });
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|txt|xlsx|xls|ods)$/i)) return;
    setFileName(file.name);
    const isExcel = /\.(xlsx|xls|ods)$/i.test(file.name);
    const reader = new FileReader();
    if (isExcel) {
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const all: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          .map((row: any) => (row as any[]).map(c => String(c ?? '').trim()));
        const nonEmpty = all.filter(r => r.some(c => c));
        if (nonEmpty.length < 2) return;
        const [head, ...body] = nonEmpty;
        setHeaders(head);
        setRawRows(body.filter(r => r.some(c => c.trim())));
        setColMap(autoDetect(head));
        setStep('map');
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = e => {
        const text = e.target?.result as string;
        const all  = parseCSV(text);
        if (all.length < 2) return;
        const [head, ...body] = all;
        setHeaders(head);
        setRawRows(body.filter(r => r.some(c => c.trim())));
        setColMap(autoDetect(head));
        setStep('map');
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const doImport = async () => {
    if (!userId || !eventId) return;
    setStep('importing');
    setProgress(0);

    const validRows = preview.filter(r => r.valid);
    if (!validRows.length) { setStep('done'); setResult({ imported: 0, skipped: 0, errors: 0 }); return; }

    try {
      // Load existing phones once for fast local dedup
      const { data: existing } = await supabase
        .from('guests')
        .select('phone')
        .eq('user_id', userId)
        .eq('event_id', eventId);
      const existingPhones = new Set((existing ?? []).map(g => normalizePhone(g.phone)));

      const toInsert: object[] = [];
      let skipped = 0;

      for (const row of validRows) {
        if (existingPhones.has(row.phone)) { skipped++; continue; }
        existingPhones.add(row.phone); // prevent double within the same import
        toInsert.push({
          user_id:     userId,
          event_id:    eventId,
          full_name:   row.fullName,
          phone:       row.phone,
          rsvp_status: 'PENDING',
          companions:  row.companions,
          side:        row.side ?? null,
          category:    row.category,
          notes:       row.notes || null,
          rsvp_token:  rsvpService.generateToken(),
        });
        setProgress(Math.round(((toInsert.length + skipped) / validRows.length) * 80));
      }

      let imported = 0, errors = 0;

      if (toInsert.length > 0) {
        // Batch insert in chunks of 50
        const CHUNK = 50;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const chunk = toInsert.slice(i, i + CHUNK);
          const { error } = await supabase.from('guests').insert(chunk);
          if (error) errors += chunk.length;
          else       imported += chunk.length;
          setProgress(80 + Math.round(((i + CHUNK) / toInsert.length) * 20));
        }
      }

      setProgress(100);
      setResult({ imported, skipped, errors });
      setStep('done');
      if (imported > 0) onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, errors: validRows.length });
      setStep('done');
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-ivory-100"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-charcoal-100"
            style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
            <button onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-charcoal-100 flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-4 h-4 text-charcoal-600" />
            </button>
            <h2 className="text-[16px] font-bold text-charcoal-900">ייבוא מוזמנים</h2>
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {(['upload', 'map', 'preview'] as ImportStep[]).map((s, i) => (
                <div key={s} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: step === s ? '#1A1916' : ['upload','map','preview','importing','done'].indexOf(step) > i ? '#10B981' : '#E5E3E1' }} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Upload ── */}
              {step === 'upload' && (
                <motion.div key="upload"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="px-5 py-6 space-y-5">
                  <div>
                    <h3 className="text-[22px] font-bold text-charcoal-900">ייבוא מוזמנים</h3>
                    <p className="text-[13px] text-charcoal-400 mt-1">בחר מקור ייבוא</p>
                  </div>

                  {/* Contacts picker — only on supported devices */}
                  {hasContactsAPI && (
                    <button
                      onClick={pickContacts}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-charcoal-100 bg-white active:scale-[0.98] transition-transform text-right"
                      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-charcoal-900 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] font-bold text-charcoal-900">ייבוא מאנשי קשר</p>
                        <p className="text-[12px] text-charcoal-400">בחר ישירות מרשימת הטלפונים</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-charcoal-300 -rotate-90 flex-shrink-0" />
                    </button>
                  )}

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className="relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed py-12 cursor-pointer transition-all"
                    style={{
                      borderColor: dragging ? '#1A1916' : '#CCC9C4',
                      background: dragging ? 'rgba(26,25,22,0.04)' : 'white',
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-charcoal-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-charcoal-500" strokeWidth={1.8} />
                    </div>
                    <p className="text-[14px] font-semibold text-charcoal-700">
                      {dragging ? 'שחרר כאן' : 'ייבוא קובץ CSV / Excel'}
                    </p>
                    <p className="text-[12px] text-charcoal-400">או לחץ לבחירה מהמכשיר</p>
                    <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.ods" className="hidden" onChange={onFileChange} />
                  </div>

                  {/* Format hint */}
                  <div className="bg-white rounded-2xl p-4 space-y-2"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                    <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest">פורמט מומלץ</p>
                    <div className="overflow-x-auto">
                      <table className="text-[12px] text-charcoal-600 w-full">
                        <thead>
                          <tr className="border-b border-charcoal-100">
                            {['שם מלא', 'טלפון', 'צד', 'קטגוריה', 'מלווים', 'הערות'].map(h => (
                              <th key={h} className="text-right pb-1 pr-3 font-bold text-charcoal-700">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {['ישראל ישראלי', '0541234567', 'חתן', 'משפחה', '1', ''].map((v, i) => (
                              <td key={i} className="pt-1.5 pr-3 text-charcoal-500">{v}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-charcoal-400">
                      נתמך: Excel (.xlsx/.xls), Google Sheets CSV, קידוד UTF-8
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── Contacts Review ── */}
              {step === 'contacts-review' && (
                <motion.div key="contacts-review"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="px-5 py-6 space-y-4">
                  <div>
                    <h3 className="text-[22px] font-bold text-charcoal-900">אנשי קשר ({contacts.length})</h3>
                    <p className="text-[13px] text-charcoal-400 mt-1">בחר קטגוריה לכל איש קשר</p>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    {contacts.map((c, idx) => (
                      <div key={idx} className={`flex items-center gap-3 px-4 py-3.5 ${idx < contacts.length - 1 ? 'border-b border-charcoal-100/60' : ''}`}>
                        <div className="w-9 h-9 rounded-xl bg-charcoal-100 flex items-center justify-center text-[11px] font-bold text-charcoal-600 flex-shrink-0">
                          {c.name.trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-charcoal-900 truncate">{c.name}</p>
                          <p className="text-[11px] text-charcoal-400" dir="ltr">{c.phone}</p>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <select
                            value={c.side ?? ''}
                            onChange={e => setContacts(prev => prev.map((x, i) => i === idx ? { ...x, side: (e.target.value || null) as Side | null } : x))}
                            className="text-[12px] font-semibold bg-charcoal-50 px-2.5 py-1.5 rounded-xl focus:outline-none"
                          >
                            <option value="">ללא צד</option>
                            <option value="GROOM">🤵 חתן</option>
                            <option value="BRIDE">👰 כלה</option>
                            <option value="SHARED">💑 משותף</option>
                          </select>
                          <select
                            value={c.category}
                            onChange={e => setContacts(prev => prev.map((x, i) => i === idx ? { ...x, category: e.target.value as Category } : x))}
                            className="text-[12px] font-semibold bg-charcoal-50 px-2.5 py-1.5 rounded-xl focus:outline-none"
                          >
                            <option value="FAMILY">משפחה</option>
                            <option value="FRIENDS">חברים</option>
                            <option value="WORK">עבודה</option>
                            <option value="OTHER">אחר</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => setStep('upload')}
                      className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-white text-[14px] font-semibold text-charcoal-700 active:scale-95 transition-transform flex-shrink-0"
                      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                      <ArrowRight className="w-4 h-4" />
                      חזרה
                    </button>
                    <button onClick={saveContacts} disabled={savingContacts}
                      className="flex-1 py-3.5 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                      {savingContacts ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {savingContacts ? 'שומר...' : `הוסף ${contacts.length} אנשי קשר`}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Map columns ── */}
              {step === 'map' && (
                <motion.div key="map"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="px-5 py-6 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-charcoal-400" strokeWidth={1.8} />
                      <span className="text-[12px] text-charcoal-500 truncate">{fileName}</span>
                    </div>
                    <h3 className="text-[22px] font-bold text-charcoal-900">מיפוי עמודות</h3>
                    <p className="text-[13px] text-charcoal-400 mt-1">
                      נמצאו {rawRows.length} שורות · {headers.length} עמודות
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    {FIELDS.map((field, idx) => (
                      <div key={field.key}
                        className={`flex items-center gap-3 px-4 py-3.5 ${idx < FIELDS.length - 1 ? 'border-b border-charcoal-100/60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-charcoal-900">
                            {field.label}
                            {field.required && <span className="text-red-400 mr-0.5">*</span>}
                          </p>
                          {colMap[field.key] !== null && (
                            <p className="text-[11px] text-green-600 mt-0.5">
                              ✓ זוהה אוטומטית
                            </p>
                          )}
                        </div>
                        {/* Column selector */}
                        <div className="relative flex-shrink-0">
                          <select
                            value={colMap[field.key] ?? ''}
                            onChange={e => setColMap(p => ({
                              ...p,
                              [field.key]: e.target.value === '' ? null : Number(e.target.value),
                            }))}
                            className="appearance-none bg-charcoal-50 text-[13px] font-semibold text-charcoal-800 pl-7 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-charcoal-200 transition"
                          >
                            <option value="">ללא</option>
                            {headers.map((h, i) => (
                              <option key={i} value={i}>{h || `עמודה ${i + 1}`}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep('preview')}
                    disabled={!colMap.fullName && colMap.fullName !== 0 || !colMap.phone && colMap.phone !== 0}
                    className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
                  >
                    תצוגה מקדימה ←
                  </button>
                </motion.div>
              )}

              {/* ── Step 3: Preview ── */}
              {step === 'preview' && (
                <motion.div key="preview"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="px-5 py-6 space-y-4">
                  <div>
                    <h3 className="text-[22px] font-bold text-charcoal-900">תצוגה מקדימה</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[12px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        ✓ {validCount} תקינים
                      </span>
                      {invalidCount > 0 && (
                        <span className="text-[12px] font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                          ✗ {invalidCount} בעיות
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    {preview.slice(0, 20).map((row, idx) => (
                      <div key={idx}
                        className={`flex items-start gap-3 px-4 py-3.5 ${idx < Math.min(preview.length, 20) - 1 ? 'border-b border-charcoal-100/60' : ''} ${row.valid ? '' : 'bg-red-50/40'}`}>
                        <div className="flex-shrink-0 mt-0.5">
                          {row.valid
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={2} />
                            : <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={2} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-charcoal-900 truncate">
                            {row.fullName || <span className="text-red-400 italic">שם חסר</span>}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[12px] text-charcoal-400" dir="ltr">
                              {row.phone || '—'}
                            </span>
                            {row.side && (
                              <span className="text-[11px] text-charcoal-400">{sideLabel[row.side]}</span>
                            )}
                            {row.category && (
                              <span className="text-[11px] text-charcoal-400">{catLabel[row.category]}</span>
                            )}
                            {row.companions > 0 && (
                              <span className="text-[11px] text-charcoal-400">+{row.companions} מלווים</span>
                            )}
                          </div>
                          {row.errors.length > 0 && (
                            <p className="text-[11px] text-red-500 mt-0.5">{row.errors.join(' · ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {preview.length > 20 && (
                      <div className="px-4 py-3 text-center text-[12px] text-charcoal-400 bg-charcoal-50/50">
                        ועוד {preview.length - 20} שורות נוספות
                      </div>
                    )}
                  </div>

                  {invalidCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <p className="text-[12px] text-amber-800 leading-relaxed">
                        {invalidCount} שורות עם בעיות <strong>לא יובאו</strong>. שאר {validCount} השורות יובאו.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <button onClick={() => setStep('map')}
                      className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-white text-[14px] font-semibold text-charcoal-700 active:scale-95 transition-transform flex-shrink-0"
                      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                      <ArrowRight className="w-4 h-4" />
                      חזרה
                    </button>
                    <button onClick={doImport} disabled={validCount === 0}
                      className="flex-1 py-3.5 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                      ייבא {validCount} מוזמנים
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Importing ── */}
              {step === 'importing' && (
                <motion.div key="importing"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] px-8 gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-charcoal-900 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between">
                      <p className="text-[14px] font-semibold text-charcoal-700">מייבא מוזמנים...</p>
                      <p className="text-[14px] font-bold text-charcoal-900">{progress}%</p>
                    </div>
                    <div className="h-2 bg-charcoal-100 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-charcoal-900 rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 5: Done ── */}
              {step === 'done' && result && (
                <motion.div key="done"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] px-8 gap-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center"
                    style={{ boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
                    <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.8} />
                  </motion.div>

                  <div>
                    <h3 className="text-[24px] font-bold text-charcoal-900 mb-1">הייבוא הושלם!</h3>
                    <p className="text-[14px] text-charcoal-400">הרשימה עודכנה</p>
                  </div>

                  <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                    {[
                      { icon: Users,        label: 'יובאו',     value: result.imported, color: '#10B981', bg: '#ECFDF5' },
                      { icon: SkipForward,  label: 'דולגו (כפול)', value: result.skipped, color: '#F59E0B', bg: '#FFFBEB' },
                      { icon: AlertTriangle,label: 'שגיאות',    value: result.errors,   color: '#F87171', bg: '#FFF1F2' },
                    ].filter(r => r.value > 0 || r.label === 'יובאו').map((r, i, arr) => (
                      <div key={r.label}
                        className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-charcoal-100/60' : ''}`}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: r.bg }}>
                          <r.icon className="w-4 h-4" style={{ color: r.color }} strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[14px] font-semibold text-charcoal-800">{r.label}</span>
                        <span className="text-[20px] font-bold" style={{ color: r.color }}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleClose}
                    className="w-full max-w-xs py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold active:scale-[0.98] transition-transform"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                    סגור
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
