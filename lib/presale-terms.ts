export function presaleTermsForThreshold(threshold: number) {
  return [
  `Questa maglietta viene prodotta esclusivamente al raggiungimento di un minimo di ${threshold} pezzi pre-ordinati.`,
  'La maglietta non è quindi immediatamente disponibile.',
  'Una volta raggiunta la soglia minima, la produzione potrà essere avviata.',
  'La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.',
  "Qualora la produzione non venga avviata entro 2 mesi dalla data del pagamento, l'importo dell'ordine verrà automaticamente rimborsato."
  ] as const;
}

export const presaleTerms = presaleTermsForThreshold(15);

export const presaleTermsAcceptance = 'Ho letto e accetto le condizioni della PRE-SALE.';
