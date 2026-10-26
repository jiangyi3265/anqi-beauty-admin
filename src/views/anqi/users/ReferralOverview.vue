<template>
 <el-dialog :model-value="true" :title="`${member.name || '会员'} · 邀请客户`" width="960px" @update:model-value="emit('close')">
  <div v-loading="loading" class="referral-overview">
   <p>会员编号：{{member.id.slice(0, 8).toUpperCase()}}。这里显示已绑定或经门店核实补录的邀请顾客。</p>
   <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
   <template v-else-if="!loading">
    <p>邀请顾客 {{customers.length}} 位 · 其中下单时归属本会员的有效订单 {{money(attributedTotal)}} · 已入账推荐收益 {{money(earnedTotal)}}</p>
    <el-table :data="customers" row-key="id" empty-text="暂无已绑定的邀请顾客">
     <el-table-column type="expand">
      <template #default="{row}">
       <el-table :data="row.orders" empty-text="这位顾客暂无订单" size="small">
        <el-table-column prop="number" label="订单号" min-width="155"/>
        <el-table-column label="购买内容" min-width="160"><template #default="{row:order}">{{order.product?.name || order.productName || '商品已删除'}}</template></el-table-column>
        <el-table-column label="订单金额" width="125"><template #default="{row:order}">{{money(order.total)}}</template></el-table-column>
        <el-table-column label="状态" width="105"><template #default="{row:order}">{{orderStatus(order)}}</template></el-table-column>
        <el-table-column label="下单时推荐人" width="145"><template #default="{row:order}">{{referrerText(order)}}</template></el-table-column>
        <el-table-column label="奖励档次" width="105"><template #default="{row:order}">{{order.referralTier?`${order.referralTier==='first'?'首单':'后续'} ${order.referralPercent}%`:'—'}}</template></el-table-column>
        <el-table-column label="已入账推荐收益" width="145"><template #default="{row:order}">{{money(order.referralEarned)}}</template></el-table-column>
       </el-table>
      </template>
     </el-table-column>
     <el-table-column label="顾客" min-width="175"><template #default="{row}">{{row.name&&row.name!=='微信用户'?row.name:'微信用户（姓名待核实）'}}<small>{{row.phone || '未留手机号'}} · {{row.id.slice(0, 8).toUpperCase()}}</small><small v-if="row.displayOnly">历史补录，仅展示</small></template></el-table-column>
     <el-table-column label="订单数" width="90"><template #default="{row}">{{row.orders.length}}</template></el-table-column>
     <el-table-column label="顾客有效订单实付" width="160"><template #default="{row}">{{money(row.paidTotal)}}</template></el-table-column>
     <el-table-column label="下单时归属本会员" width="160"><template #default="{row}">{{money(row.attributedTotal)}}</template></el-table-column>
     <el-table-column label="已入账推荐收益" width="155"><template #default="{row}">{{money(row.referralEarned)}}</template></el-table-column>
     <el-table-column label="注册时间" width="180"><template #default="{row}">{{formatDate(row.createdAt)}}</template></el-table-column>
    </el-table>
    <p>展开顾客可查看其全部订单；历史补录只展示购买记录，不改变订单归属和收益。推荐收益只显示实际已入账的金额。</p>
   </template>
  </div>
 </el-dialog>
</template>
<script setup>
import {computed,onMounted,ref} from 'vue'
import request from '@/utils/request'
import useUserStore from '@/store/modules/user'
import {money} from './member-overview'
import {referralOverview} from './referral-overview'

const props=defineProps({member:{type:Object,required:true}})
const emit=defineEmits(['close'])
const loading=ref(true),error=ref(''),customers=ref([])
const attributedTotal=computed(()=>customers.value.reduce((sum,member)=>sum+member.attributedTotal,0))
const earnedTotal=computed(()=>customers.value.reduce((sum,member)=>sum+member.referralEarned,0))
const formatDate=value=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—'
function referrerText(order){
 const {id,recorded}=order.attribution
 return !recorded?'历史订单未记录':!id?'未关联':id===props.member.id?'本会员':id.slice(0,8).toUpperCase()
}
function orderStatus(order){
 if(order.refundStatus==='refunded')return '已退款'
 return {pending:'待付款',ready:'待使用',shipping:'待交付',completed:'已完成',aftersale:'售后中',cancelled:'已取消'}[order.status] || order.status || '—'
}
onMounted(async()=>{
 try{
  const permissions=useUserStore().permissions
  const canReadShares=permissions.includes('*:*:*')||permissions.includes('anqi:shares:list')
  const resources=['users','orders','earnings','incomePlans']
  const [users,orders,earnings,plans,shares]=await Promise.all([
   ...resources.map(resource=>request({url:'/anqi/'+resource})),
   canReadShares?request({url:'/anqi/shares'}):Promise.resolve({data:[]})
  ])
  if(![users.data,orders.data,earnings.data,plans.data,shares.data].every(Array.isArray))throw new Error('邀请数据不完整，请刷新重试')
  customers.value=referralOverview(props.member,users.data,orders.data,earnings.data,plans.data,shares.data)
 }catch(e){error.value=e?.message||'邀请数据加载失败，请重试'}
 finally{loading.value=false}
})
</script>
<style scoped>
.referral-overview{min-height:90px}.referral-overview p{color:var(--el-text-color-secondary);line-height:1.7;font-size:13px}small{display:block;color:var(--el-text-color-secondary)}
</style>
