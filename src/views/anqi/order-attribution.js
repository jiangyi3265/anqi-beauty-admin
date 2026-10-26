// Old orders only prove attribution when a referral snapshot was recorded.
export function orderReferrer(order) {
  if (Object.prototype.hasOwnProperty.call(order, 'referrerIdAtOrder')) {
    return { id: order.referrerIdAtOrder || '', recorded: true }
  }
  const id = order.incomeSnapshot?.referral?.inviterId || ''
  return { id, recorded: !!id }
}
