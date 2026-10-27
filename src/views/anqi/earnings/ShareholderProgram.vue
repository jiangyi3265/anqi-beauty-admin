<template>
  <section class="program" v-loading="loading">
    <h2>{{rechargeMode?'会员分红设置':'股东每日分配'}}</h2>
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    <p v-if="rechargeMode">新分红按充值到账后的有效份数分到会员余额，由会员申请提现。原每日定时分配已停止。</p>
    <el-form v-if="data && !rechargeMode" label-position="top" :disabled="saving || !canEdit" @submit.prevent="savePool">
      <div class="daily">
        <el-form-item :label="`VIP积分池（${data.today.date}，1积分对应1元）`">
          <el-input-number v-model="amount" :min="0" :max="10000000" :precision="2" :disabled="data.today.status!=='pending' && data.today.status!=='empty'"/>
        </el-form-item>
        <el-button type="primary" native-type="submit" :disabled="!data.rule.enabled || !['empty','pending'].includes(data.today.status)">保存今日总额</el-button>
      </div>
      <p>所有人都可在小程序“我的”查看VIP积分池。每天手动录入当日总积分，保存会替换今日总额；次日北京时间0点自动从0开始，历史分配和个人收益保留。</p>
      <p>{{data.members.length}} 位股东，共 {{data.totalUnits}} 份。{{statusText[data.today.status]}}；每天 {{data.rule.settleTime}}（北京时间）结算。</p>
      <p>个人静态收益 = 当日积分池 ÷ 全部有效认证会员总份数 × 个人份数。此前认证的会员持续参与，每人按当前认证方案计一次；金额精确到分，尾差补齐至当日总额。</p>
    </el-form>
    <el-alert v-if="data&&!rechargeMode&&!data.transferReady" title="微信自动转账未启用：积分池仍可结算记账，但不会自动到账。请先由运维配置转账通道，再使用自动发放。" type="warning" :closable="false" show-icon/>
    <el-collapse v-if="data" class="settings">
      <el-collapse-item title="方案与结算设置" name="settings">
        <el-form label-position="top" :disabled="saving || !canEdit" @submit.prevent="saveSettings">
          <el-switch v-model="form.enabled" active-text="启用股东分配"/>
          <el-table :data="form.plans">
            <el-table-column label="方案名称" min-width="160"><template #default="{row}">{{row.name}}{{row.legacy?'（旧认证保留）':''}}</template></el-table-column>
            <el-table-column label="分红份数" width="120"><template #default="{row}">{{row.units}} 份</template></el-table-column>
            <el-table-column label="接受新认证" width="120"><template #default="{row}"><span v-if="row.legacy">不再新选</span><el-switch v-else v-model="row.enabled"/></template></el-table-column>
          </el-table>
          <el-form-item v-if="!rechargeMode" label="每日结算时间（北京时间）"><el-time-select v-model="form.settleTime" start="00:00" end="23:59" step="00:30"/></el-form-item>
          <p>六档方案份数固定，由认证订单自动匹配。停用只停止新认证，已有有效认证会员继续参与；已结算记录保留。</p>
          <el-button type="primary" native-type="submit">保存设置</el-button>
        </el-form>
      </el-collapse-item>
      <el-collapse-item :title="rechargeMode?'历史转账与异常处理':'微信到账情况'" name="transfers">
        <p>{{data.transferReady?'转账通道已配置，实际结果以微信回执为准。':'微信转账暂未启用，分配记账与实际到账分开记录。'}}</p>
        <el-table :data="data.transfers" empty-text="暂无自动转账记录"><el-table-column prop="date" label="日期"/><el-table-column prop="userId" label="会员编号"/><el-table-column prop="amount" label="金额"/><el-table-column prop="statusText" label="状态"/><el-table-column prop="error" label="说明"/><el-table-column v-if="canEdit" label="操作"><template #default="{row}"><el-button v-if="['failed','cancelled','blocked'].includes(row.status)" :disabled="saving" @click="save('transfer',{id:row.id,action:'retry'})">核对后重试</el-button></template></el-table-column></el-table>
      </el-collapse-item>
      <el-collapse-item title="分配记录" name="history">
        <el-table :data="data.pools" empty-text="暂无记录">
          <el-table-column prop="date" label="日期"/>
          <el-table-column label="总额"><template #default="{row}">{{(row.amountCents/100).toFixed(2)}}</template></el-table-column>
          <el-table-column prop="totalUnits" label="总份数"/>
          <el-table-column label="状态"><template #default="{row}">{{statusText[row.status]}}</template></el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>
<script setup>
import {ref,computed,onMounted} from 'vue'
import {ElMessage} from 'element-plus'
import request from '@/utils/request'
defineProps({canEdit:Boolean})
const emit=defineEmits(['changed'])
const data=ref(null),form=ref({plans:[]}),amount=ref(0),loading=ref(false),saving=ref(false),error=ref('')
const rechargeMode=computed(()=>data.value?.rule.fundingMode==='recharge')
const statusText={held:'旧手填金额待核对，未分配',empty:'今天尚未录入',pending:'待结算',settled:'已结算',noMembers:'无符合条件股东，未分配'}
async function load(){loading.value=true;try{data.value=(await request({url:'/anqi/shareholders'})).data;form.value=JSON.parse(JSON.stringify(data.value.rule));amount.value=data.value.today.amount}catch(e){error.value=e.message||'加载失败'}finally{loading.value=false}}
async function save(key,body){if(saving.value)return;saving.value=true;error.value='';try{await request({url:'/anqi/shareholders/'+key,method:'post',data:body});ElMessage.success('已保存，当日生效');await load();emit('changed')}catch(e){error.value=e.message||'保存失败，填写内容已保留'}finally{saving.value=false}}
function saveSettings(){return save('program',form.value)}
function savePool(){return save('pool',{date:data.value.today.date,amount:amount.value,revision:data.value.today.revision})}
onMounted(load)
</script>
<style scoped>
.program{border:1px solid var(--el-border-color);border-radius:8px;padding:20px;margin:0 0 24px;max-width:900px}.daily{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.settings{margin-top:16px}p{font-size:13px;color:var(--el-text-color-secondary);line-height:1.7;margin:12px 0}.el-form-item{margin-top:16px}.el-table{margin:16px 0}
</style>
