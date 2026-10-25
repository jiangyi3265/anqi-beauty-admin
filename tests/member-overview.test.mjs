import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {memberOverview} from '../src/views/anqi/users/member-overview.js'
const income=createRequire(import.meta.url)('../../anqi-beauty-app/server/income.cjs')
const now=Date.parse('2026-10-25T02:00:00Z')
const users=[{id:'a'},{id:'b'},{id:'off',disabled:true},{id:'no',incomeAccess:{static:false}},{id:'preview',membershipPreview:{displayOnly:true,name:'黄金VIP会员'}}]
const order=(id,userId,total,extra={})=>({id,userId,total,product:{name:total===13800?'铂金VIP套餐':'钻石VIP套餐',price:total,packagePlans:[{}]},paymentStatus:'paid',status:'ready',paidAt:'2026-10-24T02:00:00Z',createdAt:'2026-10-24T02:00:00Z',...extra})
function run(orders,extra={}){
 const db={users:structuredClone(users),orders,products:[],config:{poolReward:{enabled:true,percent:5,source:'revenue',cycle:'daily',activityDays:0,startDate:'2026-10-22',...extra}}}
 const clock=Date.now;Date.now=()=>now;let rules;try{rules=income.manage(db,'GET')}finally{Date.now=clock};const before=JSON.stringify(db)
 const view=memberOverview(db.users,orders,rules,now)
 assert.equal(JSON.stringify(db),before,'projection must not mutate data')
 return view
}
test('real payments determine shares; preview is not a paid membership',()=>{
 const v=run([order('1','a',13800),order('2','b',26800)])
 assert.equal(v.members.get('a').level,'铂金VIP会员');assert.equal(v.members.get('a').amount,13800)
 assert.ok(Math.abs(v.members.get('a').share-13800/40600*100)<1e-10)
 assert.equal(v.members.get('preview').amount,0);assert.equal(v.members.get('preview').level,'普通会员')
})
test('multiple cards use paid total; refunds, pending and disabled accounts excluded',()=>{
 const v=run([order('1','a',13800),order('2','a',26800),order('3','b',500,{refundStatus:'refunded',refundAt:'2026-10-24T03:00:00Z'}),order('4','off',100),order('5','no',100),order('6','b',100,{paymentStatus:'unpaid',status:'pending'})])
 assert.equal(v.total,40600);assert.equal(v.members.get('a').amount,40600);assert.equal(v.members.get('a').share,100);assert.equal(v.members.get('a').level,'钻石VIP会员')
 for(const id of ['b','off','no'])assert.equal(v.members.get(id).amount,0)
})
test('pool off has no payable share and missing rules fail visibly',()=>{
 const v=run([order('1','a',13800)],{enabled:false});assert.equal(v.members.get('a').share,0)
 assert.throws(()=>memberOverview(users,[],{},now),/规则不完整/)
})
test('backend period eligibility is retained for historical imports and future payments',()=>{
 const v=run([order('1','a',13800,{offlineRequestId:'x',createdAt:'2026-10-26T00:00:00Z'}),order('2','b',26800,{paidAt:'2026-10-26T00:00:00Z'})]);assert.equal(v.members.get('a').amount,0);assert.equal(v.members.get('b').amount,0)
})
test('discounted payment, rather than package list price, determines weight',()=>{
 const a=order('1','a',10000);a.product.price=13800;a.product.name='铂金VIP套餐'
 const v=run([a,order('2','b',30000)]);assert.equal(v.members.get('a').amount,10000);assert.equal(v.members.get('a').share,25);assert.equal(v.members.get('a').level,'铂金VIP会员')
})
test('inconsistent snapshots and absent totals never produce misleading shares',()=>{
 assert.throws(()=>memberOverview(users,[order('1','a',13800)],{pool:{enabled:true},poolOverview:{totalWeight:1}},now),/正在更新/)
 assert.throws(()=>memberOverview(users,[],{pool:{},poolOverview:{totalWeight:null}},now),/规则不完整/)
})
test('empty data and future start date are handled without division by zero',()=>{
 const empty=run([]);assert.equal(empty.total,0);assert.equal(empty.members.get('a').share,0)
 const future=run([order('1','a',13800)],{startDate:'2026-12-01'});assert.equal(future.members.get('a').share,0);assert.equal(future.members.get('a').reason,'分红尚未开始')
})
test('activity windows match backend weights',()=>{
 const v=run([order('1','a',13800,{paidAt:'2026-10-21T02:00:00Z'}),order('2','b',26800,{paidAt:'2026-10-25T01:00:00Z'})],{activityDays:3})
 assert.equal(v.members.get('a').amount,0);assert.equal(v.members.get('b').share,100)
})
