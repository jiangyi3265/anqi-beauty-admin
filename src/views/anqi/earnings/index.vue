<template>
  <main class="income-page">
    <header><div><h1>收益管理</h1><p>按套餐配置静态收益与邀请奖励，查看发放计划和实际入账明细。</p></div><el-button :loading="loading" :disabled="saving" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <el-tabs v-model="tab">
      <el-tab-pane name="rules" label="收益规则">
        <p class="help">静态收益给购买套餐的会员；动态收益按其注册时绑定的邀请关系逐级奖励。保存仅影响之后创建的新订单，未配置的套餐不产生收益。</p>
        <el-table :data="products" v-loading="loading" stripe empty-text="暂无VIP套餐，请先配置套餐商品">
          <el-table-column prop="name" label="套餐" min-width="190"/>
          <el-table-column label="静态收益" min-width="200"><template #default="{row}">{{staticText(ruleFor(row.id)?.static)}}</template></el-table-column>
          <el-table-column label="动态收益" min-width="140"><template #default="{row}">{{dynamicText(ruleFor(row.id))}}</template></el-table-column>
          <el-table-column label="版本" width="80"><template #default="{row}">{{ruleFor(row.id)?.revision||'未设置'}}</template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="95"><template #default="{row}"><el-button link type="primary" :disabled="saving||!!editing" @click="edit(row)">配置</el-button></template></el-table-column>
        </el-table>
        <section v-if="editing" ref="editorElement" class="editor">
          <h2>{{editing.name}}</h2><p class="help">正在编辑第 {{form.revision+1}} 版，旧订单沿用下单时的版本。停用规则会停止新订单参与，已生成的计划继续履行。</p>
          <el-form label-position="top" :disabled="saving" @submit.prevent="save">
            <h3>静态收益 · 购买会员</h3><RulePart v-model="form.static" periodic/>
            <h3>动态收益 · 邀请人</h3><p class="help">第1级是直接邀请人，第2级是邀请人的邀请人，依次类推。下单时没有该层级或该邀请人已停用时不奖励，也不向其他层级补位。</p>
            <div v-for="(part,index) in form.dynamic" :key="index" class="dynamic-level"><div class="level-heading"><h4>第 {{index+1}} 级邀请奖励</h4><el-button v-if="index===form.dynamic.length-1" link type="danger" @click="form.dynamic.pop()">移除此级</el-button></div><RulePart v-model="form.dynamic[index]"/></div>
            <el-button :disabled="form.dynamic.length>=10" @click="form.dynamic.push(blankPart())">添加一级邀请奖励（最多10级）</el-button>
            <h3>退款处理</h3><el-form-item label="整单退款时"><el-select v-model="form.refundPolicy" class="refund-select"><el-option value="reverse" label="取消未入账计划，并冲回已入账收益"/><el-option value="retain" label="取消未入账计划，保留已入账收益"/></el-select></el-form-item>
            <section class="preview" aria-label="收益试算"><h3>保存前试算</h3><el-form-item label="示例订单实付金额（元）"><el-input-number v-model="previewTotal" :min="0" :max="10000000" :precision="2"/></el-form-item><p>购买会员：每期 ¥{{money(previewStatic)}}，共 {{form.static.enabled?form.static.periods:0}} 期，合计 ¥{{money(previewStatic*(form.static.periods||0))}}。</p><p>全部配置层级都有合格邀请人时，动态收益合计 ¥{{money(previewDynamic)}}。</p><p class="help">此处为规则试算。到期金额会计入收益账本，当前不包含微信提现或自动转账。</p></section>
            <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon/>
            <div class="actions"><el-button type="primary" native-type="submit" :loading="saving">保存规则</el-button><el-button :disabled="saving" @click="editing=null">取消编辑</el-button></div>
          </el-form>
        </section>
      </el-tab-pane>
      <el-tab-pane name="plans" label="发放计划">
        <div class="filters"><el-input v-model="keyword" placeholder="搜索会员、套餐或订单编号" clearable/><el-select v-model="kind" clearable placeholder="全部收益类型"><el-option value="static" label="静态收益"/><el-option value="dynamic" label="动态收益"/></el-select></div>
        <el-table :data="filtered(plans)" v-loading="loading" stripe empty-text="暂无发放计划，启用规则后的新订单达到起算条件时自动生成">
          <el-table-column label="会员" min-width="120"><template #default="{row}">{{userName(row.userId)}}</template></el-table-column><el-table-column prop="productName" label="套餐" min-width="180"/><el-table-column label="类型" width="120"><template #default="{row}">{{typeText(row)}}</template></el-table-column><el-table-column label="每期金额" width="120"><template #default="{row}">¥{{money(row.amountCents/100)}}</template></el-table-column><el-table-column label="已入账/总期数" width="135"><template #default="{row}">{{row.posted}} / {{row.periods}}</template></el-table-column><el-table-column label="状态" width="100"><template #default="{row}">{{({active:'进行中',completed:'已全部入账',cancelled:'已取消'})[row.status]}}</template></el-table-column><el-table-column label="下一次到期" min-width="180"><template #default="{row}">{{row.status==='active'?date(new Date(Date.parse(row.startAt)+row.posted*row.intervalDays*86400000).toISOString()):'—'}}</template></el-table-column><el-table-column prop="orderId" label="来源订单编号" min-width="200"/><el-table-column prop="revision" label="规则版本" width="90"/>
        </el-table><p class="help">到期任务每分钟检查一次，停机后会补记。已停用会员暂停入账，恢复后继续补记到期计划。</p>
      </el-tab-pane>
      <el-tab-pane name="records" label="入账明细">
        <div class="filters"><el-input v-model="keyword" placeholder="搜索会员、项目或订单编号" clearable/><el-select v-model="kind" clearable placeholder="全部收益类型"><el-option value="static" label="静态收益"/><el-option value="dynamic" label="动态收益"/></el-select></div>
        <el-table :data="filtered(records).slice().reverse()" v-loading="loading" stripe empty-text="暂无入账记录">
          <el-table-column label="会员" min-width="120"><template #default="{row}">{{userName(row.userId)}}</template></el-table-column><el-table-column prop="name" label="说明" min-width="230"/><el-table-column label="类型" width="120"><template #default="{row}">{{typeText(row)}}</template></el-table-column><el-table-column label="变动金额" width="120"><template #default="{row}">{{row.amount>0?'+':''}}{{money(row.amount)}} 元</template></el-table-column><el-table-column label="记账时间" min-width="180"><template #default="{row}">{{date(row.createdAt)}}</template></el-table-column><el-table-column prop="orderId" label="来源订单编号" min-width="200"/>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>
<script setup>
import {ref,computed,onMounted,nextTick} from 'vue'
import {ElMessage} from 'element-plus'
import request from '@/utils/request'
import useUserStore from '@/store/modules/user'
import {chineseTime} from '../presentation'
import RulePart from './RulePart.vue'
const products=ref([]),rules=ref([]),plans=ref([]),records=ref([]),users=ref([]),loading=ref(false),saving=ref(false),error=ref(''),saveError=ref(''),tab=ref('rules'),editing=ref(null),form=ref({}),previewTotal=ref(0),editorElement=ref(null),keyword=ref(''),kind=ref('')
const allowed=p=>useUserStore().permissions.some(v=>v==='*:*:*'||v===p),canEdit=computed(()=>allowed('anqi:earnings:edit'))
const blankPart=()=>({enabled:false,mode:'fixed',value:0,trigger:'paid',delayDays:0})
const money=v=>Number(v||0).toFixed(2),date=v=>chineseTime(v),ruleFor=id=>rules.value.find(r=>r.productId===id)
const userName=id=>users.value.find(u=>u.id===id)?.name||id
const typeText=r=>r.type==='static'?'静态收益':r.type==='dynamic'?'动态 · 第'+r.level+'级':'历史收益'
const staticText=p=>p?.enabled?`${p.mode==='percent'?p.value+'%':'¥'+money(p.value)} / 期，共${p.periods}期`:'未启用'
const dynamicText=r=>r?.dynamic.some(p=>p.enabled)?r.dynamic.filter(p=>p.enabled).map(p=>'第'+p.level+'级').join('、'):'未启用'
function cents(p){return !p?.enabled?0:p.mode==='fixed'?Math.round(p.value*100):Math.floor((Math.round((previewTotal.value||0)*100)*Math.round(p.value*100)+5000)/10000)}
const previewStatic=computed(()=>cents(form.value.static)/100),previewDynamic=computed(()=>form.value.dynamic?.reduce((n,p)=>n+cents(p),0)/100||0)
function filtered(rows){const q=keyword.value.trim().toLowerCase();return rows.filter(r=>(!kind.value||r.type===kind.value)&&(!q||[r.name,r.productName,r.orderId,userName(r.userId)].join(' ').toLowerCase().includes(q)))}
let sequence=0
async function load(){const seq=++sequence;loading.value=true;error.value='';try{const [a,b,c,u]=await Promise.all([request({url:'/anqi/incomeRules'}),request({url:'/anqi/incomePlans'}),request({url:'/anqi/earnings'}),allowed('anqi:users:list')?request({url:'/anqi/users'}):Promise.resolve({data:[]})]);if(seq===sequence){products.value=a.data.products;rules.value=a.data.rules;plans.value=b.data;records.value=c.data;users.value=u.data}}catch(e){if(seq===sequence)error.value=e.message||'加载失败，请刷新重试'}finally{if(seq===sequence)loading.value=false}}
async function edit(product){editing.value=product;form.value=JSON.parse(JSON.stringify(ruleFor(product.id)||{revision:0,static:{...blankPart(),periods:1,intervalDays:1},dynamic:[],refundPolicy:'reverse'}));previewTotal.value=product.price;saveError.value='';await nextTick();editorElement.value?.scrollIntoView({block:'start',behavior:'smooth'})}
async function save(){if(saving.value)return;saving.value=true;saveError.value='';try{await request({url:'/anqi/incomeRules/'+editing.value.id,method:'put',data:form.value});editing.value=null;ElMessage.success('规则已保存，将用于新订单');await load()}catch(e){saveError.value=e.message||'保存失败，已保留填写内容'}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>
.income-page{padding:24px;color:var(--el-text-color-primary)}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}h1{font-size:24px;margin:0 0 10px}h2{font-size:21px;margin:0 0 12px}h3{font-size:18px;margin:28px 0 20px}h4{font-size:16px;margin:0}p{line-height:1.65;max-width:75ch;margin:0;color:var(--el-text-color-secondary)}.help{font-size:14px;margin:16px 0}.editor{border-top:1px solid var(--el-border-color);padding-top:28px;margin-top:28px}.dynamic-level{border-bottom:1px solid var(--el-border-color-lighter);padding-bottom:12px;margin-bottom:22px}.level-heading{display:flex;align-items:center;gap:24px;margin:20px 0}.refund-select{max-width:620px;width:100%}.preview{padding:1px 22px 12px;background:var(--el-fill-color-light);max-width:820px;margin:28px 0}.actions{display:flex;gap:12px;margin-top:24px}.filters{display:flex;gap:16px;margin:14px 0}.filters .el-input{max-width:360px}.filters .el-select{width:170px}@media(max-width:650px){.income-page{padding:16px}.filters{flex-wrap:wrap}header{align-items:flex-start}}
</style>
