'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';
import type { settingsInput } from '@/lib/operational-schema';
type Form = z.infer<typeof settingsInput>;
type Meta = { presaleOpen: boolean; productionStatus: string; productionStartedAt: string | null; productionCompletedAt: string | null };
type History = { id: string; actor: string; action: string; createdAt: string; before: unknown; after: unknown };
type Version = { id: string; version: number; text: string; createdAt: string; createdBy: string };
type Preview = { productionStarted: boolean; truncated: boolean; due: { id: string; orderNumber: string; amountCents: number; expiresAt: string }[]; warnings: { id: string; orderNumber: string; expiresAt: string }[]; pending: { id: string; orderId: string; status: string; lastError: string | null; order: { orderNumber: string } }[] };
const fields = ['revision', 'threshold', 'unitPriceCents', 'currency', 'maintenance', 'closedMessage', 'maxQuantity', 'maxPerCustomer', 'sizes', 'refundMonths', 'warningDays', 'adminRecipients', 'emailTemplates', 'deliveryText'] as const;
function canonical(form: Form) {
  return `ATTENZIONE — PRE-SALE\n\nQuesta maglietta viene prodotta esclusivamente al raggiungimento di un minimo di ${form.threshold} pezzi pre-ordinati.\n\nLa maglietta non è quindi immediatamente disponibile.\n\nUna volta raggiunta la soglia minima, la produzione potrà essere avviata.\n\n${form.deliveryText}\n\nQualora la produzione non venga avviata entro ${form.refundMonths} mesi dalla data del pagamento, l'importo dell'ordine verrà automaticamente rimborsato.`;
}
export function AdminSettings() {
  const [form, setForm] = useState<Form>();
  const [meta, setMeta] = useState<Meta>();
  const [versions, setVersions] = useState<Version[]>([]), [history, setHistory] = useState<History[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>();
  const [preview, setPreview] = useState<Preview>();
  const [email, setEmail] = useState(''), [recipientText, setRecipientText] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/settings', { cache: 'no-store' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    const values = Object.fromEntries(fields.map(key => [key, data.settings[key]]));
    setForm({ ...values, termsText: data.terms.text } as Form); setMeta(data.settings); setVersions(data.versions); setHistory(data.history); setRecipientText(data.settings.adminRecipients.join(', '));
  }, []);
  // Fetch editable settings once after mounting; state is set after network completion.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  function edit<K extends keyof Form>(key: K, value: Form[K]) { setForm(f => f ? { ...f, [key]: value } : f); setMessage(''); }
  async function action(url: string, data?: object, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(url, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, ...(confirmation ? { confirm: true } : {}) }) } : { cache: 'no-store' });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Operazione non riuscita.');
      if (url === '/api/admin/expiry' && !data) setPreview(result);
      else if (url === '/api/admin/diagnostics' && !data) setDiagnostics(result);
      else {
        await load();
        setMessage(result.sent ? 'Email accettata dal provider. Verifica la ricezione nella casella autorizzata.' : 'Operazione completata: ' + JSON.stringify(result));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Operazione non disponibile.'); } finally { setBusy(false); }
  }
  if (!form || !meta) return <main className="admin-wrap"><Link href="/admin">← ADMIN</Link><p role={error ? 'alert' : 'status'}>{error || 'Caricamento impostazioni…'}</p></main>;
  return <main className="admin-wrap admin-settings">
    <header className="admin-header"><div><p className="eyebrow">RUSH · BACK OFFICE</p><h1>IMPOSTAZIONI</h1></div><Link href="/admin">← DASHBOARD E ORDINI</Link></header>
    <nav className="admin-actions">{[['presale', 'PRE-SALE'], ['produzione', 'PRODUZIONE'], ['rimborsi', 'RIMBORSI'], ['email', 'EMAIL'], ['condizioni', 'CONDIZIONI'], ['diagnostica', 'DIAGNOSTICA']].map(([id, title]) => <a href={'#' + id} key={id}>{title}</a>)}</nav>
    {error && <p className="error-box" role="alert">{error}</p>}{message && <p className="threshold-badge" role="status">{message}</p>}
    <form onSubmit={event => { event.preventDefault(); action('/api/admin/settings', { ...form, adminRecipients: recipientText.split(',').map(s => s.trim()).filter(Boolean) }); }}>
    <fieldset disabled={busy}>
      <section id="presale" className="settings-section"><h2>A · PRE-SALE</h2><p>La soglia è il minimo di produzione e non limita le vendite. La disponibilità per taglia è un massimo totale: include ordini pagati e prenotazioni in attesa di esito Stripe. Vuoto significa illimitata.</p>
      <div className="settings-grid">
        <label>Soglia minima pezzi<input type="number" min={1} max={100000} value={form.threshold} onChange={e => edit('threshold', Number(e.target.value))} required /></label>
        <label>Prezzo unitario (centesimi EUR)<input type="number" min={50} max={1000000} value={form.unitPriceCents} onChange={e => edit('unitPriceCents', Number(e.target.value))} required /></label>
        <label>Valuta<input value="EUR" readOnly /></label>
        <label>Quantità massima per ordine<input type="number" min={1} max={100} value={form.maxQuantity} onChange={e => edit('maxQuantity', Number(e.target.value))} required /></label>
        <label>Massimo per cliente (email, facoltativo)<input type="number" min={1} max={10000} value={form.maxPerCustomer ?? ''} onChange={e => edit('maxPerCustomer', e.target.value ? Number(e.target.value) : null)} /></label>
        <label>Messaggio di chiusura<input value={form.closedMessage} onChange={e => edit('closedMessage', e.target.value)} maxLength={500} required /></label>
      </div><label className="check-row"><input type="checkbox" checked={form.maintenance} onChange={e => edit('maintenance', e.target.checked)} /><span>Modalità manutenzione (blocca nuovi checkout; usa la chiusura per annullare anche quelli aperti)</span></label>
      <p>PRE-SALE attuale: <strong>{meta.presaleOpen ? 'APERTA' : 'CHIUSA'}</strong></p>
      <button type="button" onClick={() => action('/api/admin/presale', { open: !meta.presaleOpen }, meta.presaleOpen ? 'Chiudere e annullare i checkout aperti?' : 'Riaprire la PRE-SALE?')}>{meta.presaleOpen ? 'CHIUDI PRE-SALE' : 'APRI PRE-SALE'}</button>
      <h3>Taglie e disponibilità</h3><p className="fine-print">Il limite cliente è basato sull’email normalizzata e non identifica una persona attraverso indirizzi diversi.</p>
      {form.sizes.map((size, i) => <div className="settings-size" key={size.size}><strong>{size.size}</strong><label><input type="checkbox" checked={size.enabled} onChange={e => edit('sizes', form.sizes.map((s, j) => j === i ? { ...s, enabled: e.target.checked } : s))} /> Attiva</label><label>Disponibilità massima<input type="number" min={0} max={100000} value={size.stock ?? ''} onChange={e => edit('sizes', form.sizes.map((s, j) => j === i ? { ...s, stock: e.target.value ? Number(e.target.value) : null } : s))} /></label><button type="button" disabled={i === 0} aria-label={'Sposta ' + size.size + ' prima'} onClick={() => { const sizes = [...form.sizes]; [sizes[i - 1], sizes[i]] = [sizes[i], sizes[i - 1]]; edit('sizes', sizes); }}>↑</button></div>)}
      </section>
      <section id="produzione" className="settings-section"><h2>B · PRODUZIONE</h2><p>Stato: <strong>{meta.productionStatus.replaceAll('_', ' ')}</strong></p><p>Avviata: {meta.productionStartedAt ?? 'non avviata'} · Completata: {meta.productionCompletedAt ?? 'non completata'}</p>
      {!meta.productionStartedAt && <button type="button" onClick={() => action('/api/admin/production', { status: 'PRODUZIONE_AVVIATA' }, 'Avviare definitivamente la produzione? I rimborsi automatici verranno disabilitati; serve la soglia raggiunta e nessun rimborso automatico ambiguo.')}>AVVIA PRODUZIONE</button>}
      {meta.productionStatus === 'PRODUZIONE_AVVIATA' && <button type="button" onClick={() => action('/api/admin/production', { status: 'PRODUZIONE_COMPLETATA' }, 'Confermare definitivamente la produzione completata?')}>COMPLETA PRODUZIONE</button>}
      </section>
      <section id="rimborsi" className="settings-section"><h2>C · RIMBORSI E SCADENZE</h2><div className="settings-grid"><label>Durata nuovi ordini (mesi calendario)<input type="number" min={1} max={24} value={form.refundMonths} onChange={e => edit('refundMonths', Number(e.target.value))} required /></label><label>Preavviso nuovi ordini (giorni)<input type="number" min={1} max={365} value={form.warningDays} onChange={e => edit('warningDays', Number(e.target.value))} required /></label></div>
      <p>Scadenze e condizioni degli ordini esistenti restano inalterate. Cambiare durata o soglia richiede l’aggiornamento delle condizioni prima del salvataggio.</p>
      <div className="admin-actions"><button type="button" onClick={() => action('/api/admin/expiry')}>SIMULA · DRY-RUN</button><button type="button" onClick={() => action('/api/admin/expiry', {}, 'Autorizzi adesso il controllo effettivo? Potrà richiedere rimborsi Stripe TEST, accodare avvisi e inviare email solo ai destinatari consentiti.')} >ESEGUI CONTROLLO TEST</button><Link href="/admin">RIMBORSO SINGOLO E RETRY NEGLI ORDINI</Link></div>
      {preview && <div aria-live="polite"><p>Produzione avviata: {preview.productionStarted ? 'sì, nessun nuovo rimborso automatico' : 'no'} · Scaduti: {preview.due.length} · Preavvisi: {preview.warnings.length} · Rimborsi da riconciliare: {preview.pending.length}</p>{preview.truncated && <p>Anteprima limitata a 1.000 ordini.</p>}<ul>{preview.due.map(o => <li key={o.id}>{o.orderNumber} · {(o.amountCents / 100).toFixed(2)} EUR · {o.expiresAt}</li>)}{preview.warnings.map(o => <li key={o.id}>PREAVVISO · {o.orderNumber} · {o.expiresAt}</li>)}{preview.pending.map(o => <li key={o.id}>{o.order.orderNumber} · {o.status} · {o.lastError ?? 'in attesa di Stripe'}</li>)}</ul></div>}
      </section>
      <section id="email" className="settings-section"><h2>D · EMAIL E NOTIFICHE</h2><label>Destinatari amministrativi (separati da virgola)<input value={recipientText} onChange={e => setRecipientText(e.target.value)} maxLength={1200} /></label>
      <p>Mittente, credenziali e allowlist restano nelle variabili d’ambiente. Il mittente deve essere verificato in Resend.</p><p className="fine-print">Segnaposto: {'{orderNumber}, {firstName}, {size}, {quantity}, {amount}, {expires}, {delivery}, {terms}, {pieces} (solo soglia).'}</p>
      {Object.entries(form.emailTemplates).map(([key, template]) => <details key={key}><summary>{({ confirmation: 'Conferma pagamento', threshold: 'Soglia raggiunta', refund: 'Rimborso confermato', warning: 'Preavviso scadenza' } as Record<string, string>)[key]}</summary><label>Oggetto<input value={template.subject} maxLength={200} required onChange={e => edit('emailTemplates', { ...form.emailTemplates, [key]: { ...template, subject: e.target.value } })} /></label><label>Testo<textarea rows={6} value={template.text} maxLength={10000} required onChange={e => edit('emailTemplates', { ...form.emailTemplates, [key]: { ...template, text: e.target.value } })} /></label></details>)}
      <label>Email autorizzata per il test<input type="text" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button type="button" disabled={!email} onClick={() => action('/api/admin/diagnostics', { action: 'email-test', email }, 'Inviare una email reale di prova all’indirizzo indicato e autorizzato?')}>INVIA EMAIL DI PROVA</button>
      </section>
      <section id="condizioni" className="settings-section"><h2>E · CONDIZIONI E TESTI</h2><label>Testo consegna<textarea rows={3} value={form.deliveryText} onChange={e => edit('deliveryText', e.target.value)} maxLength={2000} required /></label>
      <label>Condizioni PRE-SALE<textarea rows={13} value={form.termsText} onChange={e => edit('termsText', e.target.value)} minLength={100} maxLength={20000} required /></label>
      <button type="button" onClick={() => { if (window.confirm('Rigenerare il testo base con soglia, durata e consegna correnti? Le aggiunte non salvate verranno sostituite.')) edit('termsText', canonical(form)); }}>AGGIORNA TESTO BASE DA IMPOSTAZIONI</button>
      <p>Le clausole concordate restano obbligatorie. Ogni modifica crea una nuova versione; il testo accettato negli ordini precedenti non cambia.</p>
      <details><summary>Storico condizioni ({versions.length} versioni recenti)</summary>{versions.map(v => <details key={v.id}><summary>Versione {v.version} · {v.createdAt} · {v.createdBy}</summary><pre>{v.text}</pre></details>)}</details>
      </section>
      <section className="settings-section"><h2>F · PROVA AI</h2><p>Disabilitata in questa versione: SPEC.md non richiede la prova AI. Nessuna immagine viene caricata o generata dalla demo.</p></section>
      <div className="admin-actions"><button className="button-primary" type="submit">SALVA IMPOSTAZIONI · REVISIONE {form.revision}</button><button type="button" onClick={() => { if (window.confirm('Ricaricare e scartare le modifiche non salvate?')) load().catch(e => setError(e.message)); }}>RICARICA</button></div>
    </fieldset></form>
    <section id="diagnostica" className="settings-section"><h2>G · DIAGNOSTICA</h2><p>I controlli non mostrano segreti. Lo stato configurato non certifica una connessione al provider.</p><div className="admin-actions"><button disabled={busy} onClick={() => action('/api/admin/diagnostics')}>VERIFICA DATABASE E CONFIGURAZIONE</button><button disabled={busy} onClick={() => action('/api/admin/diagnostics', { action: 'reconcile-checkouts' }, 'Riconciliare con Stripe TEST i checkout in sospeso e annullare quelli aperti se la PRE-SALE è chiusa?')}>RICONCILIA CHECKOUT TEST</button></div>{diagnostics && <pre>{JSON.stringify(diagnostics, null, 2)}</pre>}</section>
    <section className="settings-section"><h2>STORICO OPERAZIONI</h2>{history.length ? history.map(h => <details key={h.id}><summary>{h.createdAt} · {h.actor} · {h.action}</summary><pre>{JSON.stringify({ prima: h.before, dopo: h.after }, null, 2)}</pre></details>) : <p>Nessuna operazione registrata.</p>}</section>
  </main>;
}
