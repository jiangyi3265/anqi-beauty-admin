<template>
 <el-dialog :model-value="true" title="股东认证" width="min(520px,94vw)" @close="$emit('close')">
  <div v-loading="loading">
   <p>{{member.name}} · {{member.phone||'未填写手机号'}}</p>
   <el-alert v-if="error" :title="error" type="error" :closable="false"/>
   <el-form label-position="top" :disabled="saving || loading" @submit.prevent="save(true)">
    <el-form-item label="已付款方案订单（核对购买凭证）"><el-select v-model="form.orderId"><el-option v-for="o in orders" :key="o.id" :value="o.id" :label="`${o.product?.name} · ¥${o.total} · ${o.number}`"/></el-select></el-form-item>
    <el-form-item label="分配方案（按购买方案自动匹配）"><span v-if="selectedPlan">{{selectedPlan.name}} · {{selectedPlan.units}}份</span><span v-else>请选择六档方案中已付款的套餐订单</span></el-form-item>
    <el-alert v-if="selectedPlan&&!planAvailable" title="该方案已停止新认证，请先在收益管理中启用。" type="warning" :closable="false"/>
    <p>购买套餐后仍需门店确认认证。每人按当前认证方案参与每日分配，已结算收益与购买权益保留。</p>
   </el-form>
  </div>
  <template #footer><el-button @click="$emit('close')">取消</el-button><el-button v-if="member.shareholder?.approved" :loading="saving" @click="save(false)">停止股东资格</el-button><el-button type="primary" :disabled="loading || !planAvailable || !form.orderId" :loading="saving" @click="save(true)">确认认证</el-button></template>
 </el-dialog>
</template>
<script setup>
import {ref,computed,watch,onMounted} from 'vue'
import request from '@/utils/request'
const props=defineProps({member:{type:Object,required:true}}),emit=defineEmits(['close','changed'])
const orders=ref([]),plans=ref([]),loading=ref(true),saving=ref(false),error=ref(''),form=ref({userId:props.member.id,revision:props.member.memberRevision||0,planId:props.member.shareholder?.planId||'',orderId:props.member.shareholder?.orderId||''})
const selectedPlan=computed(()=>{
 const order=orders.value.find(o=>o.id===form.value.orderId)
 if(!order)return null
 const price=order.product?.price??order.price??order.total
 const matched=order.product?.packagePlans?.length&&(order.quantity??1)===1?plans.value.find(p=>!p.legacy&&p.price===price):null
 if(matched)return matched
 const previous=props.member.shareholder
 return previous?.approved&&previous.orderId===order.id?plans.value.find(p=>p.legacy&&p.id===previous.planId):null
})
const planAvailable=computed(()=>selectedPlan.value&&(selectedPlan.value.enabled||selectedPlan.value.id===props.member.shareholder?.planId))
watch(selectedPlan,plan=>{form.value.planId=plan?.id||''})
onMounted(async()=>{try{const [a,b]=await Promise.all([request({url:'/anqi/shareholders'}),request({url:'/anqi/orders'})]);plans.value=a.data.rule.plans;orders.value=b.data.filter(o=>o.userId===props.member.id&&(o.package?.planId||o.product?.packagePlans?.length)&&o.paymentStatus==='paid'&&o.refundStatus!=='refunded'&&!['pending','cancelled','aftersale'].includes(o.status));if(!orders.value.some(o=>o.id===form.value.orderId))form.value.orderId=orders.value.length===1?orders.value[0].id:''}catch(e){error.value=e.message||'加载失败'}finally{loading.value=false}})
async function save(approved=true){if(saving.value||loading.value)return;saving.value=true;error.value='';try{await request({url:'/anqi/shareholders/member',method:'post',data:{...form.value,approved}});emit('changed');emit('close')}catch(e){error.value=e.message||'保存失败'}finally{saving.value=false}}
</script>
<style scoped>.el-select{width:100%}p{line-height:1.7;color:var(--el-text-color-secondary)}</style>
