<template>
 <el-dialog :model-value="true" title="股东认证" width="min(520px,94vw)" @close="$emit('close')">
  <div v-loading="loading">
   <p>{{member.name}} · {{member.phone||'未填写手机号'}}</p>
   <el-alert v-if="error" :title="error" type="error" :closable="false"/>
   <el-form label-position="top" :disabled="saving || loading" @submit.prevent="save(true)">
    <el-form-item label="已付款订单（核对购买凭证）"><el-select v-model="form.orderId"><el-option v-for="o in orders" :key="o.id" :value="o.id" :label="`${o.product?.name} · ¥${o.total} · ${o.number}`"/></el-select></el-form-item>
    <el-form-item label="分配方案"><el-select v-model="form.planId"><el-option v-for="p in plans" :key="p.id" :value="p.id" :label="`${p.name} · ${p.units}份`"/></el-select></el-form-item>
    <p>核对后确认，即可获得股东资格。已结算收益与购买权益保留。</p>
   </el-form>
  </div>
  <template #footer><el-button @click="$emit('close')">取消</el-button><el-button v-if="member.shareholder?.approved" :loading="saving" @click="save(false)">停止股东资格</el-button><el-button type="primary" :disabled="loading || !form.planId || !form.orderId" :loading="saving" @click="save(true)">确认认证</el-button></template>
 </el-dialog>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import request from '@/utils/request'
const props=defineProps({member:{type:Object,required:true}}),emit=defineEmits(['close','changed'])
const orders=ref([]),plans=ref([]),loading=ref(true),saving=ref(false),error=ref(''),form=ref({userId:props.member.id,revision:props.member.memberRevision||0,planId:props.member.shareholder?.planId||'',orderId:props.member.shareholder?.orderId||''})
onMounted(async()=>{try{const [a,b]=await Promise.all([request({url:'/anqi/shareholders'}),request({url:'/anqi/orders'})]);plans.value=a.data.rule.plans.filter(p=>p.enabled||p.id===form.value.planId);orders.value=b.data.filter(o=>o.userId===props.member.id&&o.paymentStatus==='paid'&&o.refundStatus!=='refunded'&&!['pending','cancelled','aftersale'].includes(o.status));if(!form.value.orderId&&orders.value.length===1)form.value.orderId=orders.value[0].id}catch(e){error.value=e.message||'加载失败'}finally{loading.value=false}})
async function save(approved=true){if(saving.value||loading.value)return;saving.value=true;error.value='';try{await request({url:'/anqi/shareholders/member',method:'post',data:{...form.value,approved}});emit('changed');emit('close')}catch(e){error.value=e.message||'保存失败'}finally{saving.value=false}}
</script>
<style scoped>.el-select{width:100%}p{line-height:1.7;color:var(--el-text-color-secondary)}</style>
