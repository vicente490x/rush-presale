export function seller() {
  return {
    name: process.env.SELLER_NAME || 'Dati del venditore da completare',
    address: process.env.SELLER_ADDRESS || 'Sede da completare',
    taxId: process.env.SELLER_TAX_ID || 'Dati fiscali da completare',
    privacyEmail: process.env.PRIVACY_EMAIL || 'Contatto privacy da completare',
    supportEmail: process.env.SUPPORT_EMAIL || 'Contatto assistenza da completare',
    withdrawalPolicy: process.env.WITHDRAWAL_POLICY || 'Procedura di recesso e assistenza da completare prima della vendita.'
  };
}
