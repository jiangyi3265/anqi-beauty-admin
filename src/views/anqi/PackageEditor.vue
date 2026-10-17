<template>
 <section class="package-editor">
  <h3>套餐方案与服务次数</h3>
  <p class="help">顾客下单时选择方案和自选项目。修改仅用于新订单，已购买订单保留原项目和次数。</p>
  <el-tabs v-model="active">
   <el-tab-pane v-for="(plan,index) in plans" :key="plan.id" :label="plan.name||'未命名方案'" :name="plan.id">
    <el-form-item label="方案名称"><el-input v-model="plan.name" maxlength="120" :disabled="readonly"/></el-form-item>
    <h4>包含项目</h4>
    <div v-for="(item,i) in plan.services" :key="item.id" class="service-editor">
     <el-input v-model="item.name" placeholder="项目名称" aria-label="项目名称" :disabled="readonly" maxlength="120"/>
     <div class="numbers"><label>服务次数 <el-input-number v-model="item.total" :min="1" :max="999" :precision="0" :disabled="readonly"/></label><label>整项参考价值（元） <el-input-number v-model="item.referencePrice" :min="0" :precision="2" :disabled="readonly"/></label><el-button v-if="!readonly" link type="danger" @click="plan.services.splice(i,1)">删除项目</el-button></div>
    </div>
    <el-button v-if="!readonly" size="small" @click="plan.services.push(service())">添加包含项目</el-button>
    <div v-for="(group,g) in plan.groups" :key="group.id" class="choice-group">
     <el-form-item label="自选组名称"><el-input v-model="group.name" maxlength="120" :disabled="readonly"/></el-form-item>
     <el-form-item label="顾客须选几个项目"><el-input-number v-model="group.pick" :min="1" :max="Math.max(1,group.services.length)" :precision="0" :disabled="readonly"/></el-form-item>
     <div v-for="(item,i) in group.services" :key="item.id" class="service-editor">
      <el-input v-model="item.name" placeholder="可选项目名称" aria-label="可选项目名称" maxlength="120" :disabled="readonly"/>
      <div class="numbers"><label>服务次数 <el-input-number v-model="item.total" :min="1" :max="999" :precision="0" :disabled="readonly"/></label><label>整项参考价值（元） <el-input-number v-model="item.referencePrice" :min="0" :precision="2" :disabled="readonly"/></label><el-button v-if="!readonly" link type="danger" @click="group.services.splice(i,1)">删除项目</el-button></div>
      <el-select v-model="item.options" multiple filterable allow-create default-first-option :reserve-keyword="false" placeholder="项目细分类型：输入后按回车添加" aria-label="项目细分类型" :disabled="readonly" style="width:100%"><el-option v-for="option in item.options||[]" :key="option" :value="option" :label="option"/></el-select>
     </div>
     <el-button v-if="!readonly" size="small" @click="group.services.push(service())">添加可选项目</el-button>
     <el-button v-if="!readonly" size="small" link type="danger" @click="plan.groups.splice(g,1)">删除自选组</el-button>
    </div>
    <div v-if="!readonly" class="editor-actions"><el-button size="small" @click="plan.groups.push({id:uid(),name:'自选项目',pick:1,services:[service()]})">添加自选组</el-button><el-button v-if="plans.length>1" size="small" type="danger" plain @click="removePlan(index)">删除此方案</el-button></div>
   </el-tab-pane>
  </el-tabs>
  <el-button v-if="!readonly&&plans.length<10" @click="addPlan">添加方案</el-button>
 </section>
</template>
<script setup>
import {ref} from 'vue'
const props=defineProps({plans:{type:Array,required:true},readonly:Boolean})
const active=ref(props.plans[0]?.id||'')
const uid=()=> 'item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)
const service=()=>({id:uid(),name:'',total:1,referencePrice:0})
function addPlan(){const plan={id:uid(),name:'新方案',services:[service()],groups:[]};props.plans.push(plan);active.value=plan.id}
function removePlan(index){props.plans.splice(index,1);active.value=props.plans[0]?.id||''}
</script>
<style scoped>
.package-editor{width:100%;min-width:0}.help{font-size:13px;color:#747984;line-height:1.7}.service-editor{border:1px solid #e5e7ec;padding:12px;margin:12px 0;border-radius:6px}.numbers{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;align-items:end}.numbers label{font-size:12px;color:#60656f;display:flex;flex-direction:column;gap:6px}.choice-group{padding:16px;background:#f7f8fa;border-radius:6px;margin-top:20px}.editor-actions{display:flex;justify-content:space-between;gap:12px;margin:20px 0}h3{margin-top:4px}h4{margin-bottom:8px}
</style>
