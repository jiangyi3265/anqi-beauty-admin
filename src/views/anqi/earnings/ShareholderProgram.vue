<template>
  <section class="program" v-loading="loading">
    <h2>股东每日分配</h2>
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    <el-form v-if="data" label-position="top" :disabled="saving || !canEdit" @submit.prevent="savePool">
      <div class="daily">
        <el-form-item :label="`今日公共积分池（${data.today.date}，1积分对应1元）`">
          <el-input-number v-model="amount" :min="0" :max="10000000" :precision="2" :disabled="data.today.status!=='pending' && data.today.status!=='empty'"/>
        </el-form-item>
        <el-button type="primary" native-type="submit" :disabled="!data.rule.enabled || !['empty','pending'].includes(data.today.status)">保存今日总额</el-button>
      </div>
      <p>{{data.members.length}} 位股东，共 {{data.totalUnits}} 份。{{statusText[data.today.status]}}；每天 {{data.rule.settleTime}}（北京时间）结算。</p>
    </el-form>
    <el-collapse v-if="data" class="settings">
      <el-collapse-item title="方案与结算设置" name="settings">
        <el-form label-position="top" :disabled="saving || !canEdit" @submit.prevent="saveSettings">
          <el-switch v-model="form.enabled" active-text="启用股东分配"/>
          <el-table :data="form.plans" empty-text="请添加分配方案">
            <el-table-column label="方案名称" min-width="160"><template #default="{row}"><el-input v-model="row.name" maxlength="40"/></template></el-table-column>
            <el-table-column label="份数" width="180"><template #default="{row}"><el-input-number v-model="row.units" :min="1" :max="100000" :precision="0"/></template></el-table-column>
            <el-table-column label="可供认证选择" width="120"><template #default="{row}"><el-switch v-model="row.enabled"/></template></el-table-column>
          </el-table>
          <el-button @click="addPlan">添加方案</el-button>
          <el-form-item label="每日结算时间（北京时间）"><el-time-select v-model="form.settleTime" start="00:00" end="23:59" step="00:30"/></el-form-item>
          <p>保存后当天生效，已结算记录保留。停用方案只停止新选，已有股东继续按该方案份数参与。</p>
          <el-button type="primary" native-type="submit">保存设置</el-button>
        </el-form>
      </el-collapse-item>
      <el-collapse-item title="微信到账情况" name="transfers">
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
import {ref,onMounted} from 'vue'
import {ElMessage} from 'element-plus'
import request from '@/utils/request'
defineProps({canEdit:Boolean})
const emit=defineEmits(['changed'])
const data=ref(null),form=ref({plans:[]}),amount=ref(0),loading=ref(false),saving=ref(false),error=ref('')
const statusText={empty:'今天尚未录入',pending:'待结算',settled:'已结算',noMembers:'无符合条件股东，未分配'}
async function load(){loading.value=true;try{data.value=(await request({url:'/anqi/shareholders'})).data;form.value=JSON.parse(JSON.stringify(data.value.rule));amount.value=data.value.today.amount}catch(e){error.value=e.message||'加载失败'}finally{loading.value=false}}
async function save(key,body){if(saving.value)return;saving.value=true;error.value='';try{await request({url:'/anqi/shareholders/'+key,method:'post',data:body});ElMessage.success('已保存，当日生效');await load();emit('changed')}catch(e){error.value=e.message||'保存失败，填写内容已保留'}finally{saving.value=false}}
function saveSettings(){return save('program',form.value)}
function savePool(){return save('pool',{date:data.value.today.date,amount:amount.value,revision:data.value.today.revision})}
function addPlan(){form.value.plans.push({id:crypto.randomUUID(),name:'',units:1,enabled:true})}
onMounted(load)
</script>
<style scoped>
.program{border:1px solid var(--el-border-color);border-radius:8px;padding:20px;margin:0 0 24px;max-width:900px}.daily{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.settings{margin-top:16px}p{font-size:13px;color:var(--el-text-color-secondary);line-height:1.7;margin:12px 0}.el-form-item{margin-top:16px}.el-table{margin:16px 0}
</style>
