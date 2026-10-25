<template>
 <el-tabs v-model="tab" class="member-tabs">
  <el-tab-pane label="会员列表" name="list">
   <Management :key="revision" resource="users" :fixed-actions="wideTable" :view-columns="memberColumns" :cell-text="memberText" @loading="resetOverview" @loaded="loadOverview">
    <template #member-summary>
     <div class="member-overview" v-loading="loading">
      <p v-if="!wideTable">左右滑动表格可查看完整信息，也可点击“查看详情”逐项核对。</p>
      <el-alert v-if="error" :title="error" type="warning" :closable="false" show-icon/>
      <template v-else-if="overview">
       <strong>{{ruleText}}</strong>
       <p>符合条件的办卡实付总额 <b>{{money(overview.total)}}</b> · {{overview.count}} 位会员 · {{updatedAt}} 更新</p>
       <p>个人占比 = 本人符合条件的办卡实付金额 ÷ 全部符合条件的办卡实付总额。占比是分红池份额；搜索、筛选或翻页不会改变分母。当前占比供核对，最终按结算时的数据确定。</p>
      </template>
     </div>
    </template>
    <template #member-columns>
     <el-table-column prop="name" label="会员姓名" min-width="110" :fixed="wideTable?'left':false" show-overflow-tooltip/>
     <el-table-column prop="phone" label="手机号" min-width="115"><template #default="{row}">{{row.phone||'未填写'}}</template></el-table-column>
     <el-table-column label="会员等级" min-width="130"><template #default="{row}"><el-tag v-if="metric(row)">{{metric(row).level}}</el-tag><span v-else>—</span><small v-if="row.membershipPreview?.displayOnly">测试展示不计入等级及分红</small></template></el-table-column>
     <el-table-column label="已购VIP套餐及方案" min-width="225"><template #default="{row}">
      <template v-if="metric(row)"><div v-for="order in metric(row).packages" :key="order.id" class="package-entry"><b>{{order.product.name}}</b><small>{{order.package?.planName||'未记录方案'}} · 实付 {{money(order.total)}}</small><small>{{order.number}} · {{packageStatus(order)}}</small></div><span v-if="!metric(row).packages.length">未购买VIP套餐</span></template><span v-else>—</span>
     </template></el-table-column>
     <el-table-column label="参与分红金额" min-width="150"><template #default="{row}"><template v-if="metric(row)"><b>{{money(metric(row).amount)}}</b><small>{{metric(row).reason}}</small></template><span v-else>—</span></template></el-table-column>
     <el-table-column label="当前分红占比" min-width="115"><template #default="{row}">{{metric(row)?percentage(metric(row).share):'—'}}</template></el-table-column>
    </template>
    <template #member-detail="{member}"><el-descriptions v-if="metric(member)" :column="1" border class="member-detail"><el-descriptions-item v-for="col in memberColumns.slice(2,7)" :key="col.key" :label="col.label">{{memberText(member,col.key)}}</el-descriptions-item></el-descriptions></template>
    <template #member-actions="{member}"><el-button v-if="canOperate" link type="primary" @click="openMember(member)">办理权益</el-button></template>
   </Management>
  </el-tab-pane>
  <el-tab-pane v-if="canOperate" label="会员权益办理" name="offline" lazy><OfflineMembers :key="openRevision" :initial-member-id="memberId" @changed="revision++"/></el-tab-pane>
 </el-tabs>
</template>
<script setup>
import {computed,ref} from 'vue'
import {useWindowSize} from '@vueuse/core'
const {width}=useWindowSize()
const wideTable=computed(()=>width.value>=1100)
import Management from '../Management.vue'
import OfflineMembers from './OfflineMembers.vue'
import useUserStore from '@/store/modules/user'
import request from '@/utils/request'
import {memberOverview,money,percentage} from './member-overview'
const tab=ref('list'),revision=ref(0),memberId=ref(''),openRevision=ref(0)
const overview=ref(null),loading=ref(false),error=ref(''),updatedAt=ref('')
let sequence=0
const memberColumns=[{key:'name',label:'会员姓名'},{key:'phone',label:'手机号'},{key:'memberLevel',label:'会员等级'},{key:'memberPackages',label:'已购VIP套餐及方案'},{key:'memberAmount',label:'参与分红金额'},{key:'memberShare',label:'当前分红占比'},{key:'memberReason',label:'分红资格说明'},{key:'points',label:'积分'},{key:'disabled',label:'账号状态'},{key:'invited',label:'礼品资格'},{key:'createdAt',label:'注册时间'}]
function resetOverview(){sequence++;overview.value=null;error.value='';loading.value=false}
function memberText(row,key){
 if(!['memberLevel','memberPackages','memberAmount','memberShare','memberReason'].includes(key))return undefined
 const value=metric(row);if(!value)return '—'
 return {memberLevel:value.level,memberPackages:value.packages.map(o=>`${o.product.name} / ${o.package?.planName||'未记录方案'} / 实付 ${money(o.total)} / ${packageStatus(o)}`).join('；')||'未购买VIP套餐',memberAmount:money(value.amount),memberShare:percentage(value.share),memberReason:value.reason}[key]
}
const allowed=k=>{const p=useUserStore().permissions;return p.includes('*:*:*')||p.includes('anqi:'+k)}
const canOperate=computed(()=>['users:list','users:edit','products:list','stores:list','orders:edit','earnings:list','earnings:edit'].every(allowed))
function openMember(member){memberId.value=member.id;openRevision.value++;tab.value='offline'}
function metric(row){return overview.value?.members.get(row.id)}
function packageStatus(o){return o.refundStatus==='refunded'?'已退款，不计等级':o.status==='cancelled'?'已取消':o.status==='aftersale'?'售后中':o.status==='completed'?'已完成':'已付款'}
const ruleText=computed(()=>{const p=overview.value.pool;return (p.enabled?'当前规则：':'分红池已关闭；配置规则：')+({daily:'每天',weekly:'每周',monthly:'每月'}[p.cycle]||'每期')+'从'+({revenue:'营业额',sales:'VIP办卡销售额',fixed:'固定基数'}[p.source]||'基数')+'提取 '+p.percent+'%，按实际办卡金额比例分配。'})
async function loadOverview(members){
 const seq=++sequence;overview.value=null;error.value='';loading.value=true
 try{
  if(!allowed('orders:list')||!allowed('earnings:list'))throw new Error('查看套餐与分红信息需要订单查看、收益查看权限；未取得的数据以“—”显示。')
  const [orders,rules]=await Promise.all([request({url:'/anqi/orders'}),request({url:'/anqi/incomeRules'})])
  if(seq!==sequence)return
  if(!Array.isArray(orders.data))throw new Error('套餐订单加载失败，请刷新重试')
  overview.value=memberOverview(members,orders.data,rules.data)
  updatedAt.value=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）'
 }catch(e){if(seq===sequence)error.value=e?.message||'套餐与分红数据加载失败，请刷新重试'}finally{if(seq===sequence)loading.value=false}
}
</script>
<style scoped>
.member-tabs{padding:16px 20px}.member-tabs :deep(.el-tabs__header){margin-bottom:0}
.member-overview{margin:12px 0 18px;min-height:30px}.member-overview p{margin:8px 0;color:var(--el-text-color-secondary);font-size:13px;line-height:1.7}
small{display:block;color:var(--el-text-color-secondary);font-size:12px;line-height:1.65;white-space:normal}.package-entry+.package-entry{margin-top:10px}.package-entry b{font-weight:500}
</style>
