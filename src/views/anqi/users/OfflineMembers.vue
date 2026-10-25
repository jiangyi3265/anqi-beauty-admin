<template>
 <section class="offline-members" v-loading="loading">
  <header><div><h2>会员权益办理</h2><p>直接选择已注册的客户，设置权益、收益资格并补录线下套餐，保存后同步到该账号。无需另建档案或再次关联微信。</p></div><el-button :disabled="saving" @click="load">刷新资料</el-button></header>
  <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
  <div class="member-picker"><el-select v-model="selectedId" filterable clearable placeholder="搜索姓名、手机号或会员编号" :disabled="saving" @change="chooseMember"><el-option v-for="m in members" :key="m.id" :value="m.id" :label="memberLabel(m)"/></el-select><el-button :disabled="saving" @click="newMember">尚未注册？先建线下档案</el-button></div>
  <section v-if="editor==='profile'" class="work-area">
   <h3>{{selected?'客户资料与资格':'新建线下客户'}}</h3>
   <p v-if="selected" class="help">会员编号：{{selected.id}} · {{selected.wechatBound?'已关联微信':'尚未关联微信'}}。请凭本人信息核实档案。</p>
   <el-form label-position="top" :disabled="saving" @submit.prevent="saveProfile">
    <div class="fields"><el-form-item label="客户姓名"><el-input v-model="form.name" maxlength="40"/></el-form-item><el-form-item label="手机号"><el-input v-model="form.phone" maxlength="11"/></el-form-item>
     <el-form-item label="直接推荐人（只能选超级VIP会员）"><el-select v-model="form.inviterId" clearable filterable placeholder="没有推荐人可留空"><el-option v-for="m in members.filter(m=>m.id!==selectedId&&!m.disabled&&(m.superVip||m.id===form.inviterId))" :key="m.id" :value="m.id" :label="memberLabel(m)"/></el-select></el-form-item>
    </div>
    <div class="switches"><el-form-item label="账号访问"><el-switch v-model="form.disabled" :active-value="false" :inactive-value="true" active-text="允许使用" inactive-text="停用"/></el-form-item><el-form-item label="贵宾卡十选三"><el-switch v-model="form.invited" active-text="有领取资格" inactive-text="未开通"/></el-form-item><el-form-item label="静态收益资格"><el-switch v-model="form.incomeAccess.static" active-text="参与" inactive-text="不参与"/></el-form-item><el-form-item label="动态收益资格"><el-switch v-model="form.incomeAccess.dynamic" active-text="可获推荐奖励" inactive-text="不参与"/></el-form-item></div>
    <p class="help">收益资格沿用「收益管理」的规则。静态资格用于后续分红结算及新订单；动态资格用于之后创建的推荐订单。已有发放计划、已入账金额不会因修改开关被重写。仅开通资格不会生成收益。</p>
    <el-form-item label="线下约定或本次修改说明"><el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" show-word-limit/></el-form-item>
    <el-button type="primary" native-type="submit" :loading="saving">{{selected?'保存资料与资格':'建立客户档案'}}</el-button>
   </el-form>
  </section>
  <section v-if="selected" class="work-area">
   <div class="section-heading"><h3>{{selected.name}} · 办理业务</h3><el-tag :type="selected.wechatBound?'success':'info'">{{selected.wechatBound?'已注册会员':'线下档案'}}</el-tag></div>
   <p>静态：{{data.pool?.enabled?`${{revenue:'营业额',sales:'办卡销售额',fixed:'固定基数'}[data.pool.source]||''}分红池 ${data.pool.percent}%，${data.pool.activityDays?data.pool.activityDays+'天一轮':'不分活动轮次'}`:'按后台已启用的套餐规则'}}；动态：{{data.referral?.enabled?`直接推荐首单 ${data.referral.firstPercent}%，后续 ${data.referral.laterPercent}%`:'按后台已启用的套餐规则'}}。</p>
   <div class="actions"><el-button :disabled="saving||selected.disabled" @click="startGrant">补录线下套餐</el-button><el-button v-if="selected.source==='offline'&&!selected.wechatBound" :disabled="saving" @click="startBind">关联微信会员</el-button></div>
  </section>
  <section v-if="editor==='grant'&&selected" class="work-area">
   <h3>补录已购套餐</h3><p class="help">填写实际收款和已用次数，保存后剩余服务可在小程序预约。历史补录不扣减现售库存，不重复发放推荐奖励；未结算周期按原有办卡日期及分红规则参与，已结算周期不重算。</p>
   <el-form label-position="top" :disabled="saving" @submit.prevent="saveGrant">
    <div class="fields"><el-form-item label="VIP套餐"><el-select v-model="grant.productId" @change="changeProduct"><el-option v-for="p in data.products" :key="p.id" :value="p.id" :label="p.name"/></el-select></el-form-item><el-form-item label="服务门店"><el-select v-model="grant.storeId"><el-option v-for="s in data.stores" :key="s.id" :value="s.id" :label="s.name"/></el-select></el-form-item><el-form-item label="套餐方案"><el-select v-model="grant.planId" @change="changePlan"><el-option v-for="p in product?.packagePlans||[]" :key="p.id" :value="p.id" :label="p.name"/></el-select></el-form-item></div>
    <section v-for="g in plan?.groups||[]" :key="g.id" class="choices"><h4>{{g.name}}，选 {{g.pick}} 项</h4><el-checkbox-group v-model="choices[g.id]" :max="g.pick"><div v-for="s in g.services" :key="s.id" class="choice"><el-checkbox :label="s.id">{{s.name}} · {{s.total}}次</el-checkbox><el-select v-if="choices[g.id]?.includes(s.id)&&s.options?.length" v-model="options[g.id+':'+s.id]" placeholder="护理类型"><el-option v-for="o in s.options" :key="o" :value="o" :label="o"/></el-select></div></el-checkbox-group></section>
    <el-table :data="services" empty-text="先选择套餐方案"><el-table-column prop="name" label="服务项目" min-width="180"/><el-table-column prop="total" label="原有次数或件数" width="100"/><el-table-column label="已用次数或已领件数" width="190"><template #default="{row}"><el-input-number v-model="grant.used[row.id]" :min="0" :max="row.total" :precision="0"/></template></el-table-column><el-table-column label="剩余数量" width="100"><template #default="{row}">{{row.total-(grant.used[row.id]||0)}}</template></el-table-column></el-table>
    <div class="fields after-table"><el-form-item label="实际已付金额（元）"><el-input-number v-model="grant.total" :step="0.01" :min="0.01" :max="10000000" :precision="2"/></el-form-item><el-form-item label="实际收款时间（北京时间）"><el-date-picker v-model="grant.paidAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="按北京时间填写"/></el-form-item><el-form-item label="线下单据编号（防止重复录入）"><el-input v-model="grant.reference" maxlength="80"/></el-form-item></div>
    <el-form-item label="收益处理"><el-radio-group v-model="grant.incomeTreatment"><el-radio label="historical">历史补录，不重复发奖励</el-radio><el-radio label="apply">今日新收款，按现行规则发放</el-radio></el-radio-group></el-form-item>
    <p v-if="grant.incomeTreatment==='apply'" class="help">保存会按现行规则生成收益计划并入账。仅适用于今天的新收款、未使用套餐，请确认这笔奖励尚未在线下结算。</p>
    <el-form-item label="收款凭证及线下约定说明"><el-input v-model="grant.note" type="textarea" :rows="3" maxlength="500"/></el-form-item>
    <div class="review"><strong>本次录入：{{selected.name}} · {{product?.name||'未选套餐'}} · ¥{{grant.total||0}}</strong><p>剩余权益 {{services.reduce((n,s)=>n+s.total-(grant.used[s.id]||0),0)}} 份（服务预约，实物到店领取）。{{grant.incomeTreatment==='historical'?'不补发历史奖励。':'按当前规则计入收益。'}}</p><el-checkbox v-model="grant.confirmed">已核实本人、线下收款和剩余次数</el-checkbox></div>
    <div class="actions"><el-button type="primary" native-type="submit" :loading="saving" :disabled="!grant.confirmed">确认补录</el-button><el-button @click="chooseMember">返回资料</el-button></div>
   </el-form>
  </section>
  <section v-if="editor==='bind'&&selected" class="work-area">
   <h3>关联客户本人的微信账号</h3><p class="help">让客户先在小程序微信登录一次，打开首页「邀请码」，核对页面上客户本人的8位会员编号（超级VIP会员显示为“我的邀请码”）后选择对应账号。关联后请客户重新登录，线下权益和收益将显示在原档案下。已产生订单或推荐关系的微信账号请直接补录，不进行合并。</p>
   <el-form label-position="top" :disabled="saving" @submit.prevent="saveBind"><el-form-item label="客户刚登录的微信会员"><el-select v-model="binding.targetId" filterable><el-option v-for="m in members.filter(m=>m.wechatBound&&!m.disabled&&m.source!=='offline')" :key="m.id" :value="m.id" :label="memberLabel(m)"/></el-select></el-form-item><el-form-item label="客户提供的8位会员编号"><el-input v-model="binding.targetCode" maxlength="8" placeholder="客户小程序首页 → 邀请码 → 会员编号"/></el-form-item><el-form-item label="身份核实说明"><el-input v-model="binding.note" type="textarea" :rows="2" maxlength="500"/></el-form-item><el-checkbox v-model="binding.confirmed">已向客户本人核对邀请码、姓名和手机号</el-checkbox><div class="actions"><el-button type="primary" native-type="submit" :loading="saving" :disabled="!binding.confirmed">确认关联微信</el-button><el-button @click="chooseMember">返回资料</el-button></div></el-form>
  </section>
  <p v-if="message" role="status" class="success">{{message}}</p>
 </section>
</template>
<script setup>
import {computed,onMounted,ref} from 'vue'
import request from '@/utils/request'
const emit=defineEmits(['changed'])
const props=defineProps({initialMemberId:{type:String,default:''}})
const data=ref({members:[],products:[],stores:[]}),loading=ref(false),saving=ref(false),error=ref(''),message=ref(''),selectedId=ref(''),editor=ref(''),form=ref({}),grant=ref({}),binding=ref({}),choices=ref({}),options=ref({})
const members=computed(()=>data.value.members),selected=computed(()=>members.value.find(m=>m.id===selectedId.value)),product=computed(()=>data.value.products.find(p=>p.id===grant.value.productId)),plan=computed(()=>product.value?.packagePlans.find(p=>p.id===grant.value.planId))
const services=computed(()=>[...(plan.value?.services||[]).map(s=>({...s,id:'fixed:'+s.id})),...(plan.value?.groups||[]).flatMap(g=>g.services.filter(s=>choices.value[g.id]?.includes(s.id)).map(s=>({...s,id:g.id+':'+s.id})))])
const uid=()=>crypto.randomUUID()
const memberLabel=m=>`${m.name} · ${m.phone||'未留手机号'} · 邀请码 ${m.id.slice(0,8).toUpperCase()} · ${m.id}`
async function load(){loading.value=true;error.value='';try{data.value=(await request({url:'/anqi/legacyMembers'})).data;return true}catch(e){error.value=e.message||'加载失败';return false}finally{loading.value=false}}
function chooseMember(){error.value='';message.value='';editor.value=selected.value?'profile':'';const m=selected.value;if(m)form.value={name:m.name,phone:m.phone||'',inviterId:m.inviterId||'',invited:!!m.invited,disabled:!!m.disabled,incomeAccess:{static:m.incomeAccess?.static!==false,dynamic:m.incomeAccess?.dynamic!==false},note:m.adminNote||'',revision:m.memberRevision||0}}
function newMember(){selectedId.value='';chooseMember();editor.value='profile';form.value={requestId:uid(),name:'',phone:'',inviterId:'',invited:false,disabled:false,incomeAccess:{static:true,dynamic:true},note:''}}
async function act(url,method,body,success){if(saving.value)return;saving.value=true;error.value='';message.value='';try{const r=(await request({url,method,data:body})).data;if(!selectedId.value)selectedId.value=r.id;const refreshed=await load();if(refreshed)chooseMember();else{editor.value='';error.value='保存已成功，但刷新失败。请点击刷新资料后继续办理。'}message.value=success;emit('changed')}catch(e){error.value=e.message||'保存失败，填写内容已保留'}finally{saving.value=false}}
function saveProfile(){return act('/anqi/legacyMembers'+(selected.value?'/'+selectedId.value:''),selected.value?'put':'post',form.value,'客户资料与资格已保存。')}
function startGrant(){error.value='';message.value='';editor.value='grant';grant.value={action:'grant',requestId:uid(),revision:selected.value.memberRevision||0,productId:'',planId:'',storeId:'',total:undefined,paidAt:'',reference:'',incomeTreatment:'historical',note:'',used:{},confirmed:false};choices.value={};options.value={}}
function changeProduct(){grant.value.planId=product.value?.packagePlans[0]?.id||'';grant.value.total=product.value?.memberPrice??product.value?.price;changePlan()}
function changePlan(){choices.value=Object.fromEntries((plan.value?.groups||[]).map(g=>[g.id,[]]));options.value={};grant.value.used={};grant.value.confirmed=false}
function saveGrant(){if(!grant.value.confirmed)return;const groups=Object.fromEntries((plan.value?.groups||[]).map(g=>[g.id,(choices.value[g.id]||[]).map(serviceId=>({serviceId,...(options.value[g.id+':'+serviceId]?{option:options.value[g.id+':'+serviceId]}:{})}))]));const used=Object.fromEntries(services.value.map(s=>[s.id,grant.value.used[s.id]||0]));return act('/anqi/legacyMembers/'+selectedId.value,'post',{...grant.value,paidAt:grant.value.paidAt?grant.value.paidAt+'+08:00':'',used,packageSelection:{planId:grant.value.planId,groups}},'线下套餐已录入，剩余服务已同步到会员账号。')}
function startBind(){editor.value='bind';error.value='';message.value='';binding.value={action:'bind',revision:selected.value.memberRevision||0,targetId:'',targetCode:'',note:'',confirmed:false}}
function saveBind(){if(binding.value.confirmed)return act('/anqi/legacyMembers/'+selectedId.value,'post',binding.value,'微信已关联，请客户重新登录小程序查看原有权益。')}
onMounted(async()=>{if(await load()){selectedId.value=props.initialMemberId;chooseMember()}})
</script>
<style scoped>
.offline-members{padding:24px;color:var(--el-text-color-primary)}header,.section-heading{display:flex;align-items:center;justify-content:space-between;gap:20px}h2{margin:0 0 12px;font-size:24px}h3{font-size:19px;margin:0 0 18px}h4{font-size:15px;margin:16px 0}p{max-width:75ch;font-size:14px;line-height:1.7;color:var(--el-text-color-secondary)}.member-picker{display:flex;gap:12px;margin:26px 0}.member-picker .el-select{max-width:650px;flex:1}.work-area{border-top:1px solid var(--el-border-color);padding:26px 0;margin-top:20px}.fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.fields .el-select,.fields .el-date-editor{width:100%}.switches{display:flex;flex-wrap:wrap;gap:36px}.help{margin:0 0 22px}.actions{display:flex;gap:12px;margin:22px 0 0}.choices{margin-bottom:24px}.choice{display:flex;gap:20px;align-items:center;margin:6px 0}.choice .el-select{width:220px}.after-table{margin-top:26px}.review{padding:20px;background:var(--el-fill-color-light);margin-top:20px}.success{color:var(--el-color-success);margin-top:20px}@media(max-width:900px){.fields{grid-template-columns:1fr}.member-picker,header{align-items:stretch;flex-direction:column}}
</style>
