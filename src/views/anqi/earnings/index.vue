<template>
  <main class="income-page">
    <header><div><h1>收益管理</h1><p>按套餐配置静态收益与邀请奖励，查看发放计划和实际入账明细。</p></div><el-button :loading="loading" :disabled="saving" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <el-tabs v-model="tab">
      <el-tab-pane name="rules" label="收益规则">
        <section class="referral" aria-label="推荐奖励">
          <div class="referral-head"><div><h2>推荐奖励 · 直接推荐人</h2><p class="help">{{referralText}}</p></div><el-button v-if="canEdit&&!referralEditing" type="primary" plain :disabled="saving||!!editing" @click="editReferral">配置</el-button></div>
          <el-form v-if="referralEditing" label-position="top" :disabled="saving" @submit.prevent="saveReferral">
            <p class="help">只奖励被推荐人注册时绑定的直接推荐人。首单指被推荐人第一笔已付款且未退款的适用订单，按付款时间判断，启用前的历史订单也计入。启用后各套餐的多级动态收益不再发放，避免重复奖励。保存只影响之后创建的订单。</p>
            <el-form-item label="是否启用"><el-switch v-model="referralForm.enabled" active-text="启用" inactive-text="关闭"/></el-form-item>
            <div class="referral-fields">
              <el-form-item label="首单奖励比例（%）"><el-input-number v-model="referralForm.firstPercent" :min="0" :max="100" :precision="2"/></el-form-item>
              <el-form-item label="后续订单奖励比例（%）"><el-input-number v-model="referralForm.laterPercent" :min="0" :max="100" :precision="2"/></el-form-item>
              <el-form-item label="适用订单"><el-select v-model="referralForm.scope"><el-option value="all" label="所有已付款订单"/><el-option value="vip" label="仅VIP套餐订单"/></el-select></el-form-item>
              <el-form-item label="起算条件"><el-select v-model="referralForm.trigger"><el-option value="paid" label="确认收款后"/><el-option value="completed" label="订单完成后（套餐全部核销后）"/></el-select></el-form-item>
              <el-form-item label="入账等待天数（0为立即）"><el-input-number v-model="referralForm.delayDays" :min="0" :max="3650" :precision="0"/></el-form-item>
              <el-form-item label="推荐有效天数（从被推荐人注册起算，0为不限）"><el-input-number v-model="referralForm.durationDays" :min="0" :max="3650" :precision="0"/></el-form-item>
              <el-form-item label="推荐人须办卡"><el-switch v-model="referralForm.requireCard" active-text="推荐人本人办了VIP卡才计奖励" inactive-text="不限"/></el-form-item>
            </div>
            <el-form-item label="整单退款时"><el-select v-model="referralForm.refundPolicy" class="refund-select"><el-option value="reverse" label="取消未入账计划，并冲回已入账奖励"/><el-option value="retain" label="取消未入账计划，保留已入账奖励"/></el-select></el-form-item>
            <section class="preview" aria-label="推荐奖励试算"><h3>保存前试算</h3><el-form-item label="示例订单实付金额（元）"><el-input-number v-model="referralPreviewTotal" :min="0" :max="10000000" :precision="2"/></el-form-item><p>首单：推荐人得 ¥{{money(referralCents(referralForm.firstPercent)/100)}}；之后每单：推荐人得 ¥{{money(referralCents(referralForm.laterPercent)/100)}}。</p></section>
            <el-alert v-if="referralError" :title="referralError" type="error" :closable="false" show-icon/>
            <div class="actions"><el-button type="primary" native-type="submit" :loading="saving">保存推荐奖励</el-button><el-button :disabled="saving" @click="referralEditing=false">取消编辑</el-button></div>
          </el-form>
        </section>
        <section class="referral" aria-label="分红池">
          <div class="referral-head"><div><h2>分红池 · 办卡会员（静态收益）</h2><p class="help">{{poolText}}</p></div><el-button v-if="canEdit&&!poolEditing" type="primary" plain :disabled="saving||!!editing" @click="editPool">配置</el-button></div>
          <el-form v-if="poolEditing" label-position="top" :disabled="saving" @submit.prevent="savePool">
            <p class="help">每个周期按北京时间结束后自动结算一次，按办卡金额比例分配奖池。设置活动天数（如3天）时，每轮第1天分给当天办卡的会员，第2天分给第1–2天办卡的会员，第3天分给第1–3天办卡的会员，之后开始新一轮；活动天数为0时分给全部持有已付款、未退款VIP套餐的会员，分到元角分，零头按比例补齐。退款或停用的会员从下一期起不再参与，已发分红不冲回。启用后各套餐的静态收益不再对新订单发放。不补发启用前或关闭期间的周期。</p>
            <el-form-item label="是否启用"><el-switch v-model="poolForm.enabled" active-text="启用" inactive-text="关闭"/></el-form-item>
            <div class="referral-fields">
              <el-form-item label="奖池来源"><el-select v-model="poolForm.source"><el-option value="revenue" label="当期营业额（全部已付款订单）× 比例"/><el-option value="sales" label="当期新增办卡金额 × 比例"/><el-option value="fixed" label="固定奖池：基数 × 比例"/></el-select></el-form-item>
              <el-form-item label="结算周期"><el-select v-model="poolForm.cycle"><el-option value="daily" label="每天"/><el-option value="weekly" label="每周（7天）"/><el-option value="monthly" label="每月"/></el-select></el-form-item>
              <el-form-item v-if="poolForm.source==='fixed'" label="奖池基数（元）"><el-input-number v-model="poolForm.baseAmount" :min="0" :max="100000000" :precision="2"/></el-form-item>
              <el-form-item label="奖池比例（%）"><el-input-number v-model="poolForm.percent" :min="0" :max="100" :precision="2"/></el-form-item>
              <el-form-item label="每轮活动天数（0为不分轮次）"><el-input-number v-model="poolForm.activityDays" :min="0" :max="365" :precision="0" :disabled="poolForm.cycle!=='daily'"/></el-form-item>
              <el-form-item label="开始日期（北京时间，留空为今天）"><el-date-picker v-model="poolForm.startDate" type="date" value-format="YYYY-MM-DD" placeholder="今天" :disabled-date="d=>beijingDay(d.getTime()+86400000-1)<beijingDay(Date.now())"/></el-form-item>
            </div>
            <section class="preview" aria-label="分红池试算"><h3>保存前试算</h3><p>{{poolPreview}}</p></section>
            <el-alert v-if="poolError" :title="poolError" type="error" :closable="false" show-icon/>
            <div class="actions"><el-button type="primary" native-type="submit" :loading="saving">保存分红池</el-button><el-button :disabled="saving" @click="poolEditing=false">取消编辑</el-button></div>
          </el-form>
        </section>
        <h2 class="package-title">VIP套餐收益</h2>
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
            <h3>静态收益 · 购买会员</h3><el-alert v-if="pool.enabled" type="warning" :closable="false" show-icon title="分红池已启用，新订单不再发放此处的静态收益；如需恢复，请先在上方关闭分红池。"/><RulePart v-model="form.static" periodic/>
            <h3>动态收益 · 邀请人</h3><el-alert v-if="referral.enabled" type="warning" :closable="false" show-icon title="推荐奖励已启用，新订单不再发放此处的动态收益；如需恢复，请先在上方关闭推荐奖励。"/><p class="help">第1级是直接邀请人，第2级是邀请人的邀请人，依次类推。下单时没有该层级或该邀请人已停用时不奖励，也不向其他层级补位。</p>
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
      <el-tab-pane name="pool" label="分红记录">
        <p class="help">分红池每期结算一次，金额已计入对应会员的静态收益；会员明细见「入账明细」中类型为「分红池」的记录。</p>
        <el-table :data="poolOverview.settlements||[]" v-loading="loading" stripe empty-text="暂无分红记录，启用分红池后每期结束自动生成">
          <el-table-column prop="label" label="结算周期" min-width="200"/>
          <el-table-column label="活动" width="130"><template #default="{row}">{{row.activityRound?`第${row.activityRound}轮第${row.activityDay}天`:'—'}}</template></el-table-column>
          <el-table-column label="当日营业额" width="140"><template #default="{row}">{{row.revenueCents==null?'—':'¥'+money(row.revenueCents/100)}}</template></el-table-column>
          <el-table-column label="奖池" width="130"><template #default="{row}">¥{{money(row.poolCents/100)}}</template></el-table-column>
          <el-table-column label="实发" width="130"><template #default="{row}">¥{{money(row.distributedCents/100)}}</template></el-table-column>
          <el-table-column prop="members" label="参与会员" width="100"/>
          <el-table-column label="办卡总额" width="150"><template #default="{row}">¥{{money(row.totalWeightCents/100)}}</template></el-table-column>
          <el-table-column label="结算时间" min-width="180"><template #default="{row}">{{date(row.createdAt)}}</template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane name="payouts" label="收益兑现">
        <p class="help">门店线下把收益付给会员后，在这里登记。系统只记账、不会转账；登记后会员在小程序「我的收益」里能看到已兑现和待兑现金额。登记错了可以撤销，原记录会保留。</p>
        <div class="payout-totals"><div><span>会员累计收益</span><strong>¥{{money(payoutData.totals.earned)}}</strong></div><div><span>已兑现</span><strong>¥{{money(payoutData.totals.paidOut)}}</strong></div><div><span>待兑现合计</span><strong>¥{{money(payoutData.totals.available)}}</strong></div></div>
        <div class="filters"><el-input v-model="payoutKeyword" placeholder="搜索会员姓名或手机号" clearable/></div>
        <el-table :data="payoutMembers" v-loading="loading" stripe empty-text="暂无有收益的会员">
          <el-table-column label="会员" min-width="140"><template #default="{row}">{{row.name||'未填写姓名'}}<span v-if="row.disabled" class="muted">（已停用）</span></template></el-table-column>
          <el-table-column prop="phone" label="手机号" width="130"/>
          <el-table-column label="累计收益" width="130"><template #default="{row}">¥{{money(row.earned)}}</template></el-table-column>
          <el-table-column label="已兑现" width="130"><template #default="{row}">¥{{money(row.paidOut)}}</template></el-table-column>
          <el-table-column label="待兑现" width="130"><template #default="{row}"><span :class="{negative:row.available<0}">¥{{money(row.available)}}</span></template></el-table-column>
          <el-table-column label="最近兑现" min-width="170"><template #default="{row}">{{row.lastPayoutAt?date(row.lastPayoutAt):'—'}}</template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="110"><template #default="{row}"><el-button link type="primary" :disabled="saving||row.available<=0" @click="openPayout(row)">登记兑现</el-button></template></el-table-column>
        </el-table>
        <p class="help">待兑现为负数时，说明会员兑现后又发生了退款冲回，需要和会员线下核对。</p>
        <h3>兑现记录</h3>
        <el-table :data="payoutData.payouts" v-loading="loading" stripe empty-text="暂无兑现记录">
          <el-table-column label="登记时间" min-width="170"><template #default="{row}">{{date(row.createdAt)}}</template></el-table-column>
          <el-table-column label="会员" min-width="120"><template #default="{row}">{{row.userName||userName(row.userId)}}</template></el-table-column>
          <el-table-column label="金额" width="120"><template #default="{row}">¥{{money(row.amount)}}</template></el-table-column>
          <el-table-column prop="methodName" label="方式" width="100"/>
          <el-table-column prop="note" label="备注" min-width="160"/>
          <el-table-column prop="actor" label="登记人" width="110"/>
          <el-table-column label="状态" min-width="170"><template #default="{row}">{{row.status==='paid'?'已兑现':'已撤销：'+(row.cancelReason||'')}}</template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="90"><template #default="{row}"><el-button v-if="row.status==='paid'" link type="danger" :disabled="saving" @click="cancelPayout(row)">撤销</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="payoutDialog" title="登记收益兑现" width="520px" destroy-on-close>
      <el-form label-position="top" :disabled="saving" @submit.prevent="submitPayout">
        <p class="help">会员：{{payoutForm.name||'未填写姓名'}}{{payoutForm.phone?'（'+payoutForm.phone+'）':''}}，待兑现 ¥{{money(payoutForm.available)}}</p>
        <el-form-item label="本次兑现金额（元）"><el-input-number v-model="payoutForm.amount" :min="0.01" :max="payoutForm.available" :precision="2"/></el-form-item>
        <el-form-item label="兑现方式"><el-select v-model="payoutForm.method"><el-option v-for="(label,key) in payoutData.methods" :key="key" :value="key" :label="label"/></el-select></el-form-item>
        <el-form-item label="备注（如转账单号，会员可以看到）"><el-input v-model="payoutForm.note" maxlength="200" show-word-limit/></el-form-item>
        <el-checkbox v-model="payoutForm.confirmed">我已经线下把这笔钱付给会员</el-checkbox>
        <el-alert v-if="payoutError" :title="payoutError" type="error" :closable="false" show-icon class="payout-error"/>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="payoutDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!payoutForm.confirmed||!(payoutForm.amount>0)" @click="submitPayout">确认登记</el-button></template>
    </el-dialog>
  </main>
</template>
<script setup>
import {ref,computed,onMounted,nextTick} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import request from '@/utils/request'
import useUserStore from '@/store/modules/user'
import {chineseTime} from '../presentation'
import RulePart from './RulePart.vue'
const products=ref([]),rules=ref([]),plans=ref([]),records=ref([]),users=ref([]),loading=ref(false),saving=ref(false),error=ref(''),saveError=ref(''),tab=ref('rules'),editing=ref(null),form=ref({}),previewTotal=ref(0),editorElement=ref(null),keyword=ref(''),kind=ref('')
const allowed=p=>useUserStore().permissions.some(v=>v==='*:*:*'||v===p),canEdit=computed(()=>allowed('anqi:earnings:edit'))
const blankPart=()=>({enabled:false,mode:'fixed',value:0,trigger:'paid',delayDays:0})
const money=v=>Number(v||0).toFixed(2),date=v=>chineseTime(v),ruleFor=id=>rules.value.find(r=>r.productId===id)
const userName=id=>users.value.find(u=>u.id===id)?.name||id
const typeText=r=>r.source==='pool'?'分红池':r.type==='static'?'静态收益':r.source==='referral'?'推荐 · '+(r.tier==='first'?'首单':'后续'):r.type==='dynamic'?'动态 · 第'+r.level+'级':'历史收益'
const staticText=p=>pool.value.enabled?'由分红池替代':p?.enabled?`${p.mode==='percent'?p.value+'%':'¥'+money(p.value)} / 期，共${p.periods}期`:'未启用'
const dynamicText=r=>referral.value.enabled?'由推荐奖励替代':r?.dynamic.some(p=>p.enabled)?r.dynamic.filter(p=>p.enabled).map(p=>'第'+p.level+'级').join('、'):'未启用'
function cents(p){return !p?.enabled?0:p.mode==='fixed'?Math.round(p.value*100):Math.floor((Math.round((previewTotal.value||0)*100)*Math.round(p.value*100)+5000)/10000)}
const previewStatic=computed(()=>cents(form.value.static)/100),previewDynamic=computed(()=>form.value.dynamic?.reduce((n,p)=>n+cents(p),0)/100||0)
function filtered(rows){const q=keyword.value.trim().toLowerCase();return rows.filter(r=>(!kind.value||r.type===kind.value)&&(!q||[r.name,r.productName,r.orderId,userName(r.userId)].join(' ').toLowerCase().includes(q)))}
let sequence=0
async function load(){const seq=++sequence;loading.value=true;error.value='';try{const [a,b,c,u,d]=await Promise.all([request({url:'/anqi/incomeRules'}),request({url:'/anqi/incomePlans'}),request({url:'/anqi/earnings'}),allowed('anqi:users:list')?request({url:'/anqi/users'}):Promise.resolve({data:[]}),request({url:'/anqi/earnings/payouts'})]);if(seq===sequence){products.value=a.data.products;rules.value=a.data.rules;referral.value=a.data.referral||{};pool.value=a.data.pool||{};poolOverview.value=a.data.poolOverview||{settlements:[]};plans.value=b.data;records.value=c.data;users.value=u.data;payoutData.value={...emptyPayouts(),...d.data}}}catch(e){if(seq===sequence)error.value=e.message||'加载失败，请刷新重试'}finally{if(seq===sequence)loading.value=false}}
async function edit(product){editing.value=product;form.value=JSON.parse(JSON.stringify(ruleFor(product.id)||{revision:0,static:{...blankPart(),periods:1,intervalDays:1},dynamic:[],refundPolicy:'reverse'}));previewTotal.value=product.price;saveError.value='';await nextTick();editorElement.value?.scrollIntoView({block:'start',behavior:'smooth'})}
async function save(){if(saving.value)return;saving.value=true;saveError.value='';try{await request({url:'/anqi/incomeRules/'+editing.value.id,method:'put',data:form.value});editing.value=null;ElMessage.success('规则已保存，将用于新订单');await load()}catch(e){saveError.value=e.message||'保存失败，已保留填写内容'}finally{saving.value=false}}
const referral=ref({}),referralEditing=ref(false),referralForm=ref({}),referralError=ref(''),referralPreviewTotal=ref(6980)
const referralText=computed(()=>{const r=referral.value;if(!r.revision)return '未启用。默认首单 50%、之后每单 10%，适用所有已付款订单，不限期；点击“配置”后启用。';const scope=r.scope==='vip'?'仅VIP套餐订单':'所有已付款订单',limit=r.durationDays?`注册后 ${r.durationDays} 天内`:'不限期';return `${r.enabled?'已启用':'已关闭'}：首单 ${r.firstPercent}%，之后每单 ${r.laterPercent}%，${scope}，${limit}${r.requireCard?'，推荐人须已办VIP卡（办卡前的订单不补发）':''}（第 ${r.revision} 版）`})
function referralCents(percent){return Math.floor((Math.round((referralPreviewTotal.value||0)*100)*Math.round((percent||0)*100)+5000)/10000)}
function editReferral(){referralForm.value=JSON.parse(JSON.stringify(referral.value));referralError.value='';referralEditing.value=true}
async function saveReferral(){if(saving.value)return;saving.value=true;referralError.value='';try{await request({url:'/anqi/incomeRules/referral',method:'put',data:referralForm.value});referralEditing.value=false;ElMessage.success('推荐奖励已保存，将用于新订单');await load()}catch(e){referralError.value=e.message||'保存失败，已保留填写内容'}finally{saving.value=false}}
const pool=ref({}),poolOverview=ref({settlements:[]}),poolEditing=ref(false),poolForm=ref({}),poolError=ref('')
const cycleNames={daily:'每天',weekly:'每周',monthly:'每月'},periodsPerMonth={daily:30,weekly:30/7,monthly:1}
const beijingDay=ms=>new Date(ms+8*3600000).toISOString().slice(0,10)
const fixedPool=r=>Math.round((r.baseAmount||0)*(r.percent||0))/100
const poolSize=r=>r.source==='fixed'?`奖池 ¥${money(fixedPool(r))}（¥${money(r.baseAmount)} × ${r.percent}%）`:r.source==='sales'?`奖池为当期新增办卡金额 × ${r.percent}%`:`奖池为当期营业额 × ${r.percent}%`
const poolText=computed(()=>{const r=pool.value,o=poolOverview.value;if(!r.revision)return '未启用。默认每天结算，奖池为当天营业额（全部已付款订单）× 5%，3天一轮：按办卡金额比例分给本轮已办卡的会员；点击“配置”后启用。';const live=r.enabled&&r.source!=='fixed'?`本期到目前${r.source==='sales'?'新增办卡':'营业额'} ¥${money(o.currentIncome)}，预计奖池 ¥${money(o.estimatedPool)}；`:'';const round=o.activity?`第 ${o.activity.round} 轮活动第 ${o.activity.day} 天（每轮 ${o.activity.days} 天）；`:'';return r.enabled?`已启用：${cycleNames[r.cycle]}结算，${poolSize(r)}；${round}${live}当前参与 ${o.members||0} 位办卡会员，办卡总额 ¥${money(o.totalWeight)}，下一次结算 ${o.nextSettlementAt?date(o.nextSettlementAt):'—'}（第 ${r.revision} 版）`:`已关闭：${cycleNames[r.cycle]}结算，${poolSize(r)}（第 ${r.revision} 版）`})
const poolPreview=computed(()=>{const f=poolForm.value,o=poolOverview.value,total=o.totalWeight||0,pct=f.percent||0;const share=amount=>total?`按当前 ${o.members} 位会员（办卡总额 ¥${money(total)}），办卡 ¥6,980 的会员每期约得 ¥${money(amount*6980/total)}。`:'当前暂无办卡会员，有会员办卡后才会分配。';if(f.source==='fixed'){const each=fixedPool(f);return `每期奖池 ¥${money(each)}，${cycleNames[f.cycle]}结算，每月预计支出约 ¥${money(each*periodsPerMonth[f.cycle])}。${share(each)}`}const what=f.source==='sales'?'当期新增办卡金额':'当期营业额（全部已付款订单）';const rounds=f.cycle==='daily'&&f.activityDays>0?`每 ${f.activityDays} 天一轮，第1天分给当天办卡的会员，之后每天累加本轮已办卡的会员，第 ${f.activityDays+1} 天开始新一轮。`:'';return `每期奖池 = ${what} × ${pct}%，例如当期${f.source==='sales'?'新增办卡':'营业额'} ¥100,000 时奖池为 ¥${money(1000*pct)}，营业额为 0 时不分配。${rounds}${share(1000*pct)}`})
function editPool(){poolForm.value=JSON.parse(JSON.stringify(pool.value));poolError.value='';poolEditing.value=true}
async function savePool(){if(saving.value)return;saving.value=true;poolError.value='';try{await request({url:'/anqi/incomeRules/pool',method:'put',data:poolForm.value});poolEditing.value=false;ElMessage.success('分红池已保存');await load()}catch(e){poolError.value=e.message||'保存失败，已保留填写内容'}finally{saving.value=false}}
// 收益兑现：每次打开登记框生成一个登记编号，网络重试不会重复登记
const emptyPayouts=()=>({members:[],payouts:[],totals:{earned:0,paidOut:0,available:0},methods:{}})
const payoutData=ref(emptyPayouts()),payoutKeyword=ref(''),payoutDialog=ref(false),payoutForm=ref({}),payoutError=ref('')
const payoutMembers=computed(()=>{const q=payoutKeyword.value.trim();return payoutData.value.members.filter(m=>!q||[m.name,m.phone].join(' ').includes(q))})
const requestId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)
function openPayout(row){payoutForm.value={userId:row.userId,name:row.name,phone:row.phone,available:row.available,amount:row.available,method:'wechat',note:'',confirmed:false,requestId:requestId()};payoutError.value='';payoutDialog.value=true}
async function submitPayout(){if(saving.value)return;saving.value=true;payoutError.value='';const f=payoutForm.value;try{await request({url:'/anqi/earnings/payouts',method:'post',data:{action:'payout',userId:f.userId,amount:f.amount,method:f.method,note:f.note,confirmed:f.confirmed,requestId:f.requestId}});payoutDialog.value=false;ElMessage.success(`已登记兑现 ¥${money(f.amount)}，会员小程序里会同步显示`);await load()}catch(e){payoutError.value=e.message||'登记失败，请稍后重试；重试不会重复登记'}finally{saving.value=false}}
async function cancelPayout(row){let reason;try{({value:reason}=await ElMessageBox.prompt(`撤销后，${row.userName||'该会员'}的待兑现会加回 ¥${money(row.amount)}。原记录会保留。`,'撤销兑现登记',{confirmButtonText:'确认撤销',cancelButtonText:'不撤销',inputPlaceholder:'请填写撤销原因',inputPattern:/\S/,inputErrorMessage:'请填写撤销原因'}))}catch{return}
  if(saving.value)return;saving.value=true;try{await request({url:'/anqi/earnings/payouts',method:'post',data:{action:'cancel',id:row.id,reason}});ElMessage.success('已撤销这笔兑现登记');await load()}catch(e){ElMessage.error(e.message||'撤销失败，请稍后重试')}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>
.income-page{padding:24px;color:var(--el-text-color-primary)}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}h1{font-size:24px;margin:0 0 10px}h2{font-size:21px;margin:0 0 12px}h3{font-size:18px;margin:28px 0 20px}h4{font-size:16px;margin:0}p{line-height:1.65;max-width:75ch;margin:0;color:var(--el-text-color-secondary)}.help{font-size:14px;margin:16px 0}.editor{border-top:1px solid var(--el-border-color);padding-top:28px;margin-top:28px}.dynamic-level{border-bottom:1px solid var(--el-border-color-lighter);padding-bottom:12px;margin-bottom:22px}.level-heading{display:flex;align-items:center;gap:24px;margin:20px 0}.refund-select{max-width:620px;width:100%}.preview{padding:1px 22px 12px;background:var(--el-fill-color-light);max-width:820px;margin:28px 0}.actions{display:flex;gap:12px;margin-top:24px}.filters{display:flex;gap:16px;margin:14px 0}.filters .el-input{max-width:360px}.filters .el-select{width:170px}@media(max-width:650px){.income-page{padding:16px}.filters{flex-wrap:wrap}header{align-items:flex-start}}
.referral{border:1px solid var(--el-border-color-lighter);border-radius:8px;padding:4px 20px 12px;margin:8px 0 28px;max-width:900px}.referral-head{display:flex;justify-content:space-between;align-items:center;gap:20px}.referral h2{margin:16px 0 0}.referral-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;max-width:820px}.referral-fields :deep(.el-select){width:100%}.package-title{margin-top:8px}.payout-totals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:820px;margin:8px 0 20px}.payout-totals div{border:1px solid var(--el-border-color-lighter);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}.payout-totals span{font-size:13px;color:var(--el-text-color-secondary)}.payout-totals strong{font-size:22px}.negative{color:var(--el-color-danger)}.muted{color:var(--el-text-color-secondary)}.payout-error{margin-top:14px}@media(max-width:650px){.referral-fields{grid-template-columns:1fr}}
</style>
