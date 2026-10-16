import { z } from 'zod';
import { ClothingSize } from '@prisma/client';
export const sizesSchema = z.array(z.object({
  size: z.nativeEnum(ClothingSize), enabled: z.boolean(), stock: z.number().int().min(0).max(100000).nullable()
}).strict()).length(6).refine(rows => new Set(rows.map(row => row.size)).size === 6, 'Ogni taglia deve comparire una volta.');
export const templateSchema = z.object({ subject: z.string().min(1).max(200), text: z.string().min(1).max(10000) }).strict();
export const templatesSchema = z.object({ confirmation: templateSchema, threshold: templateSchema, refund: templateSchema, warning: templateSchema }).strict();
export const settingsInput = z.object({
  revision: z.number().int(), threshold: z.number().int().min(1).max(100000),
  unitPriceCents: z.number().int().min(50).max(1000000), currency: z.literal('eur'),
  maintenance: z.boolean(), closedMessage: z.string().trim().min(1).max(500),
  maxQuantity: z.number().int().min(1).max(100), maxPerCustomer: z.number().int().min(1).max(10000).nullable(),
  sizes: sizesSchema, refundMonths: z.number().int().min(1).max(24), warningDays: z.number().int().min(1).max(365),
  adminRecipients: z.array(z.string().trim().toLowerCase().email().max(120)).max(10),
  emailTemplates: templatesSchema, deliveryText: z.string().trim().min(1).max(2000),
  termsText: z.string().trim().min(100).max(20000)
}).strict().refine(v => !v.maxPerCustomer || v.maxQuantity <= v.maxPerCustomer, 'Il limite ordine supera quello cliente.');
export const orderInput = z.object({
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(120), size: z.nativeEnum(ClothingSize),
  quantity: z.number().int().min(1).max(100), terms: z.literal(true),
  termsVersionId: z.string().min(1).max(100), settingsRevision: z.number().int().positive(), checkoutKey: z.string().uuid(),
  turnstileToken: z.string().min(1).max(4096), website: z.string().max(0).optional()
}).strict();
export const defaultTemplates = {
  confirmation: { subject: 'RUSH PRE-SALE — ordine {orderNumber} confermato', text: 'Ciao {firstName},\n\nordine {orderNumber} confermato: taglia {size} × {quantity}, importo {amount} EUR.\nScadenza individuale: {expires}.\n{delivery}\n\nCondizioni accettate:\n{terms}' },
  threshold: { subject: 'RUSH PRE-SALE — SOGLIA RAGGIUNTA', text: 'Sono state prenotate {pieces} magliette. La produzione può essere avviata. La PRE-SALE resta aperta.' },
  refund: { subject: 'RUSH PRE-SALE — ordine {orderNumber} rimborsato', text: 'Ciao {firstName},\n\nil rimborso dell’ordine {orderNumber} è confermato da Stripe. L’accredito dipende dal metodo di pagamento utilizzato.' },
  warning: { subject: 'RUSH PRE-SALE — ordine {orderNumber} in scadenza', text: 'L’ordine {orderNumber} scade il {expires}. La produzione non risulta avviata.' }
};
export function initialTerms(threshold = 15, months = 2, delivery = 'La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.') {
  return `ATTENZIONE — PRE-SALE\n\nQuesta maglietta viene prodotta esclusivamente al raggiungimento di un minimo di ${threshold} pezzi pre-ordinati.\n\nLa maglietta non è quindi immediatamente disponibile.\n\nUna volta raggiunta la soglia minima, la produzione potrà essere avviata.\n\n${delivery}\n\nQualora la produzione non venga avviata entro ${months} mesi dalla data del pagamento, l'importo dell'ordine verrà automaticamente rimborsato.`;
}
