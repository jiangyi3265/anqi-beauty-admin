<template>
  <section class="wallet-program" v-loading="loading && !data">
    <header><h2>充值分红与会员提现</h2><el-button :disabled="busy" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    <template v-if="data">
      <template v-if="!data.enabled">
        <p>充值确认到账后，按有效认证会员的份数分到小程序余额；会员自行申请提现。</p>
        <p v-if="data.pendingLegacy.length">有 {{data.pendingLegacy.length}} 笔旧手填积分池。切换后保留为待核对记录，不当作真实充值分配。</p>
        <el-button v-if="canEdit" type="primary" :loading="busy" @click="activate">启用充值分配</el-button>
      </template>
      <template v-else>
        <el-alert v-if="!data.rechargeReady" title="充值通道暂未开通。配置完成后才能创建真实充值单。" type="warning" :closable="false"/>
        <el-form class="recharge-form" label-position="top" :disabled="busy || !canEdit || !data.rechargeReady" @submit.prevent="createRecharge">
          <el-form-item label="充值分红金额（元）"><el-input-number v-model="amount" :min="0.01" :max="20000000" :step="0.01" :precision="2" :disabled="!!requestId"/></el-form-item>
          <el-button type="primary" native-type="submit" :loading="busy">{{requestId ? '查询上次提交结果' : '创建充值单'}}</el-button>
        </el-form>
        <p>创建充值单后，按该单提供的银行账户付款。系统核实资金进入商户运营账户后自动分配；重复刷新不会重复入账。</p>
        <el-alert v-if="!data.withdrawalReady" title="微信提现通道暂未开通：会员余额保留，暂不能申请微信提现。" type="warning" :closable="false"/>
        <el-collapse>
          <el-collapse-item v-if="data.heldLegacy.length" title="旧待分配记录（待核对，未发钱）" name="legacy">
            <el-table :data="data.heldLegacy"><el-table-column prop="date" label="日期"/><el-table-column prop="amount" label="原手填金额"/></el-table>
          </el-collapse-item>
        </el-collapse>
        <h3>充值与分配记录</h3>
        <el-table :data="data.recharges" row-key="id" :expand-row-keys="expanded" empty-text="暂无充值单">
          <el-table-column type="expand"><template #default="{row}">
            <div class="recharge-detail">
              <template v-if="row.bankAccount && row.status==='awaiting'">
                <p><strong>请按此充值单付款 ¥{{money(row.amount)}}，不要重复转入。</strong></p>
                <p>收款户名：{{row.bankAccount.bank_account_name}}</p><p>收款账号：{{row.bankAccount.bank_account_no}}</p>
                <p>开户银行：{{row.bankAccount.bank_name}}<span v-if="row.bankAccount.bank_code"> · 联行号 {{row.bankAccount.bank_code}}</span></p>
                <p>银行到账可能延迟，请以核实结果为准。</p>
              </template>
              <p v-if="row.error">{{row.error}}</p>
              <el-table v-if="row.allocations.length" :data="row.allocations"><el-table-column prop="name" label="会员"/><el-table-column prop="userId" label="会员编号"/><el-table-column prop="units" label="份数"/><el-table-column prop="amount" label="分配金额"/></el-table>
            </div>
          </template></el-table-column>
          <el-table-column prop="number" label="充值单号" min-width="260"/>
          <el-table-column label="金额" width="120"><template #default="{row}">¥{{money(row.amount)}}</template></el-table-column>
          <el-table-column prop="statusText" label="状态" min-width="180"/>
          <el-table-column label="创建时间" min-width="170"><template #default="{row}">{{chineseTime(row.createdAt)}}</template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="140"><template #default="{row}">
            <el-button v-if="row.status==='funded'" link type="primary" :disabled="busy" @click="distribute(row)">核对后分配</el-button>
            <el-button v-else-if="!['distributed','closed'].includes(row.status)" link type="primary" :disabled="busy" @click="save('sync',{id:row.id})">核实到账</el-button>
          </template></el-table-column>
        </el-table>
        <h3>会员提现记录</h3>
        <el-table :data="data.withdrawals" empty-text="暂无提现申请">
          <el-table-column prop="name" label="会员"/><el-table-column prop="amount" label="金额"/>
          <el-table-column prop="statusText" label="状态"/><el-table-column prop="error" label="说明" min-width="200"/>
          <el-table-column label="申请时间" min-width="170"><template #default="{row}">{{chineseTime(row.createdAt)}}</template></el-table-column>
        </el-table>
      </template>
    </template>
  </section>
</template>
<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import request from '@/utils/request'
import {chineseTime} from '../presentation'
defineProps({canEdit: Boolean})
const emit = defineEmits(['changed'])
const data = ref(null), loading = ref(false), busy = ref(false), error = ref(''), amount = ref(100), requestId = ref('')
const expanded = ref([])
const money = value => Number(value || 0).toFixed(2)
async function load() {
  if (loading.value) return
  loading.value = true
  try { data.value = (await request({url: '/anqi/wallet'})).data; error.value = '' }
  catch (e) { error.value = e.message || '加载失败，请重试' }
  finally { loading.value = false }
}
async function save(key, body) {
  if (busy.value) return false
  busy.value = true; error.value = ''
  try {
    const result = await request({url: '/anqi/wallet/' + key, method: 'post', data: body})
    if (key === 'recharge') expanded.value = [result.data.id]
    ElMessage.success(key === 'recharge' ? '充值单已创建，请展开记录查看付款账户' : '已提交')
    await load(); emit('changed'); return true
  } catch (e) { error.value = e.message || '提交失败，请重试'; return false }
  finally { busy.value = false }
}
async function activate() {
  try {
    await ElMessageBox.confirm('切换后，新分红以真实充值到账为准。原手填待分配金额保留为待核对，不自动发钱；已有收益和购买权益保留。', '启用充值分配', {type: 'warning'})
  } catch { return }
  await save('activate', {revision: data.value.revision, pending: data.value.pendingLegacy, confirmed: true})
}
async function createRecharge() {
  if (!requestId.value) requestId.value = 'recharge-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  if (await save('recharge', {amount: amount.value, requestId: requestId.value})) requestId.value = ''
}
async function distribute(row) {
  try { await ElMessageBox.confirm('这笔资金已核实到账。确认按当前符合条件的会员份数分配？', '核对后分配') }
  catch { return }
  await save('distribute', {id: row.id, confirmed: true})
}
let timer
onMounted(() => { load(); timer = setInterval(() => {
  if (!busy.value && (data.value?.recharges.some(r => ['created','awaiting','unknown'].includes(r.status)) || data.value?.withdrawals.some(r => ['pending','sending','unknown','processing','waiting'].includes(r.status)))) load()
}, 5000) })
onUnmounted(() => clearInterval(timer))
</script>
<style scoped>
.wallet-program{border:1px solid var(--el-border-color);border-radius:8px;padding:20px;margin-bottom:24px;min-width:0}.wallet-program header{display:flex;align-items:center;justify-content:space-between;gap:16px}.recharge-form{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:20px}.recharge-form .el-form-item{margin:0}.recharge-detail{padding:8px 24px;overflow-wrap:anywhere}.wallet-program p{font-size:14px;line-height:1.7;color:var(--el-text-color-secondary)}.wallet-program .el-alert{margin:12px 0}.wallet-program h3{margin-top:24px}
</style>
