export function copyDraft(row, resource) {
  const copy = JSON.parse(JSON.stringify(row))
  delete copy.id
  delete copy.createdAt
  copy.enabled = false
  if (resource === 'homeModules') {
    copy.title = `${copy.title || '模块'}（复制）`
    copy.publishStatus = 'draft'
  } else {
    copy.name = `${copy.name || '记录'}（复制）`
  }
  if (resource === 'products') {
    copy.status = 'draft'
    copy.sold = 0
    copy.code = ''
    for (const sku of copy.skus || []) sku.code = ''
  }
  return copy
}

export function parseSkuAttributes(value) {
  const entries = String(value || '').split(/[,，]/).map(v => v.trim()).filter(Boolean)
  return Object.fromEntries(entries.map(entry => {
    const separator = entry.search(/[:：]/)
    const key = entry.slice(0, separator).trim()
    const value = entry.slice(separator + 1).trim()
    if (separator < 1 || !key || !value) throw new Error('规格属性请按“颜色:白,容量:30ml”填写')
    return [key, value]
  }))
}

export function relatedResources(resource) {
  const related = []
  if (['orders', 'appointments', 'claims', 'shares', 'addresses', 'earnings', 'paymentAudits', 'ledger', 'redemptions'].includes(resource)) related.push('users')
  if (['orders', 'appointments'].includes(resource)) related.push('stores')
  if (['appointments', 'paymentAudits'].includes(resource)) related.push('orders')
  if (['claims', 'activities'].includes(resource)) related.push('products')
  if (resource === 'products') related.push('categories')
  if (resource === 'config') related.push('products', 'categories', 'activities', 'stores')
  return related
}
