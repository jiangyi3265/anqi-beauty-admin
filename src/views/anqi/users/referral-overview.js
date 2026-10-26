import {orderReferrer} from '../order-attribution.js'

// Group existing records without changing attribution or rewards.
export function referralOverview(inviter, members, orders, earnings, plans = [], shares = []) {
  const historicalIds = new Set(shares.filter(share =>
    share.userId === inviter.id && share.source === 'historicalDisplay'
  ).map(share => share.memberId))
  const customers = members.filter(member =>
    member.inviterId === inviter.id || (!member.inviterId && historicalIds.has(member.id)))
  const ordersByCustomer = new Map(customers.map(member => [member.id, []]))
  const rewardsByOrder = new Map()
  const plansByOrder = new Map(plans.filter(plan => plan.userId === inviter.id && plan.source === 'referral').map(plan => [plan.orderId, plan]))

  for (const earning of earnings) {
    if (earning.userId !== inviter.id || earning.source !== 'referral' || !earning.orderId) continue
    const cents = Number.isSafeInteger(earning.amountCents)
      ? earning.amountCents
      : Math.round(Number(earning.amount || 0) * 100)
    rewardsByOrder.set(earning.orderId, (rewardsByOrder.get(earning.orderId) || 0) + cents)
  }

  for (const order of orders) {
    const purchases = ordersByCustomer.get(order.userId)
    if (!purchases) continue
    const attribution = orderReferrer(order)
    const plan = plansByOrder.get(order.id)
    purchases.push({ ...order, attribution, attributedHere: attribution.recorded && attribution.id === inviter.id,
      referralTier: plan?.tier || '', referralPercent: plan?.percent,
      referralEarned: (rewardsByOrder.get(order.id) || 0) / 100 })
  }

  const paid = order => order.paymentStatus === 'paid' && order.refundStatus !== 'refunded' &&
    !['cancelled', 'pending', 'aftersale'].includes(order.status)
  return customers.map(member => {
    const purchases = ordersByCustomer.get(member.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return {
      ...member,
      displayOnly: !member.inviterId && historicalIds.has(member.id),
      orders: purchases,
      paidTotal: purchases.reduce((sum, order) => sum + (paid(order) ? Number(order.total || 0) : 0), 0),
      attributedTotal: purchases.reduce((sum, order) => sum + (paid(order) && order.attributedHere ? Number(order.total || 0) : 0), 0),
      referralEarned: purchases.reduce((sum, order) => sum + order.referralEarned, 0)
    }
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
