import test from 'node:test'
import assert from 'node:assert/strict'
import {referralOverview} from '../src/views/anqi/users/referral-overview.js'
import {orderReferrer} from '../src/views/anqi/order-attribution.js'

test('distinguishes a new order snapshot from an unknown historical order', () => {
  assert.deepEqual(orderReferrer({referrerIdAtOrder:''}),{id:'',recorded:true})
  assert.deepEqual(orderReferrer({incomeSnapshot:{referral:{inviterId:'vip-a'}}}),{id:'vip-a',recorded:true})
  assert.deepEqual(orderReferrer({}),{id:'',recorded:false})
})

test('shows only directly bound customers and their orders without inventing rewards', () => {
  const inviter={id:'vip-a'}
  const members=[
    {id:'buyer-a',inviterId:'vip-a',createdAt:'2026-10-25T02:00:00Z'},
    {id:'buyer-b',inviterId:'buyer-a',createdAt:'2026-10-25T03:00:00Z'},
    {id:'buyer-c',inviterId:'vip-a',createdAt:'2026-10-25T04:00:00Z'},
    {id:'unbound',createdAt:'2026-10-25T05:00:00Z'}
  ]
  const orders=[
    {id:'paid',userId:'buyer-a',referrerIdAtOrder:'vip-a',total:3980,paymentStatus:'paid',status:'ready',createdAt:'2026-10-25T03:00:00Z'},
    {id:'before-bind',userId:'buyer-a',referrerIdAtOrder:'',total:100,paymentStatus:'paid',status:'completed',createdAt:'2026-10-25T02:30:00Z'},
    {id:'refunded',userId:'buyer-a',total:100,paymentStatus:'paid',refundStatus:'refunded',status:'completed',createdAt:'2026-10-25T04:00:00Z'},
    {id:'pending',userId:'buyer-c',total:200,paymentStatus:'pending',status:'pending',createdAt:'2026-10-25T05:00:00Z'},
    {id:'other',userId:'buyer-b',total:9800,paymentStatus:'paid',status:'ready',createdAt:'2026-10-25T06:00:00Z'},
    {id:'old-3980',userId:'unbound',total:3980,paymentStatus:'paid',status:'ready',createdAt:'2026-10-25T06:00:00Z'}
  ]
  const earnings=[
    {userId:'vip-a',orderId:'paid',source:'referral',amountCents:199000},
    {userId:'vip-a',orderId:'paid',source:'referral',amountCents:-99000},
    {userId:'vip-a',orderId:'paid',source:'pool',amountCents:500},
    {userId:'vip-b',orderId:'other',source:'referral',amountCents:490000}
  ]

  const plans=[{orderId:'paid',userId:'vip-a',source:'referral',tier:'first',percent:50}]
  const result=referralOverview(inviter,members,orders,earnings,plans)
  assert.deepEqual(result.map(customer=>customer.id),['buyer-c','buyer-a'])
  assert.deepEqual(result.find(customer=>customer.id==='buyer-a').orders.map(order=>order.id),['refunded','paid','before-bind'])
  assert.equal(result.find(customer=>customer.id==='buyer-a').paidTotal,4080)
  assert.equal(result.find(customer=>customer.id==='buyer-a').attributedTotal,3980)
  assert.equal(result.find(customer=>customer.id==='buyer-a').orders[1].referralTier,'first')
  assert.equal(result.find(customer=>customer.id==='buyer-a').referralEarned,1000)
  assert.equal(result.find(customer=>customer.id==='buyer-c').paidTotal,0)
})

test('historical display link shows an old purchase without changing attribution or rewards', () => {
  const inviter={id:'vip-a'}
  const members=[{id:'old-buyer',name:'微信用户',createdAt:'2026-10-25T05:00:00Z'}]
  const orders=[{id:'old-order',userId:'old-buyer',total:3980,paymentStatus:'paid',
    status:'ready',createdAt:'2026-10-25T05:25:00Z'}]
  const shares=[{userId:'vip-a',memberId:'old-buyer',source:'historicalDisplay'}]

  const [customer]=referralOverview(inviter,members,orders,[],[],shares)
  assert.equal(customer.displayOnly,true)
  assert.equal(customer.paidTotal,3980)
  assert.equal(customer.attributedTotal,0)
  assert.equal(customer.referralEarned,0)
  assert.equal(customer.orders[0].attribution.recorded,false)
  assert.deepEqual(referralOverview(inviter,members,orders,[],[],[]),[])
})
