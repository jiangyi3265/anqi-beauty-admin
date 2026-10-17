<template>
  <div class="rule-part">
    <el-form-item label="是否启用"><el-switch :model-value="modelValue.enabled" @update:model-value="set('enabled',$event)" active-text="启用" inactive-text="关闭"/></el-form-item>
    <div class="rule-fields">
      <el-form-item label="计算方式"><el-select :model-value="modelValue.mode" @update:model-value="set('mode',$event)"><el-option value="fixed" label="固定金额（每笔订单）"/><el-option value="percent" label="按订单实付金额比例"/></el-select></el-form-item>
      <el-form-item :label="(periodic?'每期':'单次')+(modelValue.mode==='percent'?'比例（%）':'金额（元）')"><el-input-number :model-value="modelValue.value" :min="0" :max="modelValue.mode==='percent'?100:1000000" :precision="2" @update:model-value="set('value',$event)"/></el-form-item>
      <el-form-item label="起算条件"><el-select :model-value="modelValue.trigger" @update:model-value="set('trigger',$event)"><el-option value="paid" label="确认收款后"/><el-option value="completed" label="整套项目全部核销后"/></el-select></el-form-item>
      <el-form-item :label="periodic?'首次等待天数（0为立即）':'入账等待天数（0为立即）'"><el-input-number :model-value="modelValue.delayDays" :min="0" :max="3650" :precision="0" @update:model-value="set('delayDays',$event)"/></el-form-item>
      <template v-if="periodic"><el-form-item label="每隔多少天入账"><el-input-number :model-value="modelValue.intervalDays" :min="1" :max="3650" :precision="0" @update:model-value="set('intervalDays',$event)"/></el-form-item><el-form-item label="共入账多少期"><el-input-number :model-value="modelValue.periods" :min="1" :max="3660" :precision="0" @update:model-value="set('periods',$event)"/></el-form-item></template>
    </div>
  </div>
</template>
<script setup>
const props=defineProps({modelValue:{type:Object,required:true},periodic:Boolean});const emit=defineEmits(['update:modelValue'])
function set(key,value){emit('update:modelValue',{...props.modelValue,[key]:value,...(key==='mode'?{value:0}:{})})}
</script>
<style scoped>
.rule-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;max-width:820px}.rule-fields :deep(.el-select){width:100%}@media(max-width:650px){.rule-fields{grid-template-columns:1fr}}
</style>
