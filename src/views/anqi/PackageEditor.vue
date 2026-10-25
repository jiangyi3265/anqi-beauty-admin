<template>
 <section class="package-editor">
  <h3>套餐方案与服务次数</h3>
  <p class="help">从商品管理选择项目，服务填次数，实物填领取数量。实物到店领取，库存仍按整套套餐管理，不联扣单品库存。修改仅用于新订单，已购买订单保留原项目和次数。</p>
  <el-tabs v-model="active">
   <el-tab-pane v-for="(plan,index) in plans" :key="plan.id" :label="plan.name||'未命名方案'" :name="plan.id">
    <el-form-item label="方案名称"><el-input v-model="plan.name" maxlength="120" :disabled="readonly"/></el-form-item>
    <h4>包含项目</h4>
    <div v-for="(item,i) in plan.services" :key="item.id" class="service-editor">
     <el-select v-if="!readonly" :model-value="item.productId" filterable :placeholder="item.name||'搜索已录入商品或服务'" style="width:100%" @change="id=>chooseProduct(item,id)"><el-option v-for="p in selectable" :key="p.id" :value="p.id" :label="p.name+' · '+(p.kind==='goods'?'实物 到店领取':'服务')+(p.code?' · '+p.code:'')"/></el-select><p v-if="item.name" class="help">{{item.name}} · {{item.kind==='goods'?'实物商品 到店领取':'服务项目'}}{{!item.productId?'（原有项目）':''}}</p>
     <div class="numbers"><label>{{item.kind==='goods'?'领取数量（件）':'服务次数'}} <el-input-number v-model="item.total" :min="1" :max="999" :precision="0" :disabled="readonly"/></label><label>整项参考价值（元） <el-input-number v-model="item.referencePrice" :min="0" :precision="2" :disabled="readonly"/></label><el-button v-if="!readonly" link type="danger" @click="plan.services.splice(i,1)">删除项目</el-button></div>
    </div>
    <el-button v-if="!readonly" size="small" @click="plan.services.push(service())">添加包含项目</el-button>
    <div v-for="(group,g) in plan.groups" :key="group.id" class="choice-group">
     <el-form-item label="自选组名称"><el-input v-model="group.name" maxlength="120" :disabled="readonly"/></el-form-item>
     <el-form-item label="顾客须选几个项目"><el-input-number v-model="group.pick" :min="1" :max="Math.max(1,group.services.length)" :precision="0" :disabled="readonly"/></el-form-item>
     <div v-for="(item,i) in group.services" :key="item.id" class="service-editor">
      <el-select v-if="!readonly" :model-value="item.productId" filterable :placeholder="item.name||'搜索已录入商品或服务'" style="width:100%" @change="id=>chooseProduct(item,id)"><el-option v-for="p in selectable" :key="p.id" :value="p.id" :label="p.name+' · '+(p.kind==='goods'?'实物 到店领取':'服务')+(p.code?' · '+p.code:'')"/></el-select><p v-if="item.name" class="help">{{item.name}} · {{item.kind==='goods'?'实物商品 到店领取':'服务项目'}}{{!item.productId?'（原有项目）':''}}</p>
      <div class="numbers"><label>{{item.kind==='goods'?'领取数量（件）':'服务次数'}} <el-input-number v-model="item.total" :min="1" :max="999" :precision="0" :disabled="readonly"/></label><label>整项参考价值（元） <el-input-number v-model="item.referencePrice" :min="0" :precision="2" :disabled="readonly"/></label><el-button v-if="!readonly" link type="danger" @click="group.services.splice(i,1)">删除项目</el-button></div>
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
import {ref,computed} from 'vue'
const props=defineProps({plans:{type:Array,required:true},readonly:Boolean,products:{type:Array,default:()=>[]},productId:String})
const selectable=computed(()=>props.products.filter(p=>p.id!==props.productId&&!p.packagePlans?.length&&['service','goods'].includes(p.kind)))
function chooseProduct(item,id){const p=selectable.value.find(p=>p.id===id);if(!p)return;item.productId=p.id;item.name=p.name;item.kind=p.kind;item.total=1;item.referencePrice=Number(p.referencePrice??p.price??0);delete item.options}
const active=ref(props.plans[0]?.id||'')
const uid=()=> 'item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)
const service=()=>({id:uid(),name:'',total:1,referencePrice:0})
function addPlan(){const plan={id:uid(),name:'新方案',services:[service()],groups:[]};props.plans.push(plan);active.value=plan.id}
function removePlan(index){props.plans.splice(index,1);active.value=props.plans[0]?.id||''}
</script>
<style scoped>
.package-editor{width:100%;min-width:0}.help{font-size:13px;color:#747984;line-height:1.7}.service-editor{border:1px solid #e5e7ec;padding:12px;margin:12px 0;border-radius:6px}.numbers{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;align-items:end}.numbers label{font-size:12px;color:#60656f;display:flex;flex-direction:column;gap:6px}.choice-group{padding:16px;background:#f7f8fa;border-radius:6px;margin-top:20px}.editor-actions{display:flex;justify-content:space-between;gap:12px;margin:20px 0}h3{margin-top:4px}h4{margin-bottom:8px}
</style>
