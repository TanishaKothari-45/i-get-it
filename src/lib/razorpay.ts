// Razorpay Checkout: their script draws the payment sheet (UPI, cards, netbanking). Loaded only when Pay is tapped.
type Order = { keyId: string; orderId: string; amount: number; month: number; email?: string }
export type Paid = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

function load(): Promise<any> {
  const w = window as any
  if (w.Razorpay) return Promise.resolve(w.Razorpay)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(w.Razorpay)
    s.onerror = () => reject(new Error('checkout'))
    document.head.appendChild(s)
  })
}

// Resolves with Razorpay's signed reply, or null if the reader closed the sheet.
// onFailed: a try that failed inside the sheet (declined card, UPI timeout). The sheet stays open so they can retry.
export async function checkout(o: Order, onFailed?: (reason: string) => void): Promise<Paid | null> {
  const Razorpay = await load()
  return new Promise((resolve) => {
    const r = new Razorpay({
      key: o.keyId,
      order_id: o.orderId,
      amount: o.amount * 100,
      currency: 'INR',
      name: 'I Get It',
      description: `Month ${o.month + 1}`,
      prefill: o.email ? { email: o.email } : undefined,
      theme: { color: '#d98b19' },
      handler: (reply: Paid) => resolve(reply),
      modal: { ondismiss: () => resolve(null) },
    })
    r.on('payment.failed', (e: any) => onFailed?.(String(e?.error?.description ?? 'The payment did not go through.')))
    r.open()
  })
}
