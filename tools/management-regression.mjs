import assert from 'node:assert/strict'
import { copyDraft, parseSkuAttributes, relatedResources } from '../src/views/anqi/management-utils.js'
import { formatBusiness, detailFields } from '../src/views/anqi/presentation.js'

for (const resource of ['products', 'stores', 'categories', 'activities', 'alliances', 'rewards']) {
  const original = { id: 'existing', name: '原记录', enabled: true, image: '/static/cover.jpg', gallery: ['/static/environment.jpg'], price: 598, points: 100, stock: 3, code: 'OLD', skus: [{ code: 'OLD-SKU', name: '单次', price: 598 }] }
  const clone = copyDraft(original, resource)
  assert.equal(clone.id, undefined)
  assert.equal(clone.enabled, false)
  assert.equal(clone.name, '原记录（复制）')
  assert.equal(clone.image, original.image)
  assert.equal(clone.price, 598)
  clone.gallery.push('/new.jpg')
  assert.equal(original.gallery.length, 1)
  assert.equal(original.enabled, true)
  if (resource === 'products') {
    assert.equal(clone.status, 'draft')
    assert.equal(clone.code, '')
    assert.equal(clone.skus[0].code, '')
    assert.equal(original.skus[0].code, 'OLD-SKU')
  }
}
assert.deepEqual(parseSkuAttributes('颜色：白，容量:30ml, 型号：A:B'), { 颜色: '白', 容量: '30ml', 型号: 'A:B' })
assert.deepEqual(parseSkuAttributes(''), {})
for (const value of ['颜色白', '颜色：', '：白']) assert.throws(() => parseSkuAttributes(value))
for (const resource of ['ledger', 'redemptions', 'paymentAudits']) assert.ok(relatedResources(resource).includes('users'))
assert.ok(relatedResources('paymentAudits').includes('orders'))
for (const resource of ['rewards', 'ledger', 'redemptions', 'audit']) assert.ok(detailFields[resource]?.length)
assert.equal(formatBusiness({ spec: 'single', product: { selectedSku: { name: '大瓶 100ml' } } }, 'spec'), '大瓶 100ml')
assert.equal(formatBusiness({ amount: 10 }, 'amount'), '¥10.00')
console.log('PASS: six resource copies preserve originals; Chinese/ASCII SKU attributes; member/order references; details; order SKU snapshots')
