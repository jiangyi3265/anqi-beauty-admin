import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatBusiness } from '../src/views/anqi/presentation.js'

test('订单列表按实际付款渠道展示，不能被下单时的选项覆盖', () => {
  assert.equal(formatBusiness({ paymentChoice: 'offline', paymentMode: 'wechat' }, 'paymentChoice'), '微信支付')
  assert.equal(formatBusiness({ paymentChoice: 'wechat', paymentMode: 'offline' }, 'paymentChoice'), '现金支付（门店收银）')
  assert.equal(formatBusiness({ paymentMode: 'wechat' }, 'paymentChoice'), '微信支付')
})

test('待付款订单保留顾客选择，未选择不冒充现金订单', () => {
  assert.equal(formatBusiness({ status: 'pending', paymentChoice: 'offline' }, 'paymentChoice'), '现金支付（门店收银）')
  assert.equal(formatBusiness({ status: 'pending', paymentChoice: 'wechat' }, 'paymentChoice'), '微信支付')
  assert.equal(formatBusiness({ status: 'pending' }, 'paymentChoice'), '待选择')
})
