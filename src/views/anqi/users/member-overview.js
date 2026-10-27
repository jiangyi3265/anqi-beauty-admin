// Read-only projection of the vipLevel / income.poolHolders rules.
export function memberOverview(members, orders, rules, now = Date.now()) {
  const pool = rules.pool, overview = rules.poolOverview
  if (!pool || !overview || overview.totalWeight == null || !Number.isFinite(Number(overview.totalWeight)) || Number(overview.totalWeight)<0) throw new Error('分红规则不完整，请刷新重试')
  const since = overview.activity ? Date.parse(overview.activity.start) : -Infinity
  const end = now + 1, totalCents = Math.round(Number(overview.totalWeight) * 100)
  const result = new Map()
  for (const member of members) {
    const packages = orders.filter(o => o.userId === member.id && (o.package?.planId || o.product?.packagePlans?.length) && o.paymentStatus === 'paid')
    const valid = packages.filter(o => o.refundStatus !== 'refunded' && !['cancelled', 'pending', 'aftersale'].includes(o.status))
    const top = valid.reduce((best, o) => !best || Number(o.product.memberPrice ?? o.product.price) > Number(best.product.memberPrice ?? best.product.price) ? o : best, null)
    const name = top ? String(top.product.name || 'VIP').replace(/套餐$/, '') : ''
    const certificate = member.shareholder
    const certified = !member.mergedInto && certificate?.approved && Date.parse(certificate.approvedAt) <= end &&
      rules.shareholders?.rule?.plans.some(p => p.id === certificate.planId) &&
      valid.some(o => o.id === certificate.orderId && Date.parse(o.paidAt) <= end)
    const eligible = packages.filter(o => (!o.offlineRequestId || Date.parse(o.createdAt) < end) && Date.parse(o.paidAt) < end && Date.parse(o.paidAt) >= since && !['cancelled', 'pending'].includes(o.status) && !(o.refundStatus === 'refunded' && !(Date.parse(o.refundAt) >= end)))
    const cents = !certified || member.disabled || member.incomeAccess?.static === false ? 0 : eligible.reduce((n, o) => {
      const value = Math.round(Number(o.total) * 100)
      return n + (Number.isSafeInteger(value) && value > 0 ? value : 0)
    }, 0)
    const active = pool.enabled && !!pool.startDate && Date.parse(pool.startDate + 'T00:00:00+08:00') <= now
    const reason = !pool.enabled ? '分红池未启用' : !active ? '分红尚未开始' : member.disabled ? '账号已停用' : !certified ? '未认证股东' : member.incomeAccess?.static === false ? '未开通静态收益资格' : !cents ? '暂无符合本期条件的办卡金额' : '参与分红'
    result.set(member.id, { level: name ? (name.endsWith('会员') ? name : name + '会员') : '普通会员', packages, amount: cents / 100, share: active && cents > 0 && totalCents > 0 ? cents / totalCents * 100 : 0, reason })
  }
  if(rules.shareholders?.rule?.activatedAt){
    const source=rules.shareholders,total=source.totalUnits;
    for(const member of members){const row=result.get(member.id),holding=source.members.find(m=>m.userId===member.id);row.units=holding?.units||0;row.share=total?row.units/total*100:0;row.reason=holding?holding.planName+' · 参与分配':member.shareholder?.approved?'暂无有效分配资格':'未认证股东';}
    return {members:result,total,count:source.members.length,pool,shareholderMode:true,shareholderEnabled:source.rule.enabled};
  }
  const shownTotal=[...result.values()].reduce((sum,row)=>sum+Math.round(row.amount*100),0)
  if(shownTotal!==totalCents)throw new Error('会员与分红数据正在更新，请点击刷新重新核对，暂不显示占比')
  return { members: result, total: totalCents / 100, count: overview.members, pool }
}
export const money = value => '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const percentage = value => value > 0 && value < 0.01 ? '<0.01%' : value.toFixed(2) + '%'
