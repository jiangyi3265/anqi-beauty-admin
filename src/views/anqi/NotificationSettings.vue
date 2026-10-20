<template>
 <section class="notification-settings">
  <el-alert title="顾客主动授权后，按微信订阅次数发送服务通知。开启开关不等于已发送，实际结果见下方记录。" type="info" :closable="false" show-icon/>
  <el-form label-position="top"><el-form-item label="允许顾客订阅服务消息"><el-switch v-model="config.subscriptionEnabled" :disabled="readonly"/></el-form-item><el-form-item label="发送预约与订单提醒"><el-switch v-model="config.messageReminderEnabled" :disabled="readonly"/></el-form-item></el-form>
  <div class="toolbar"><el-button :loading="loading" @click="loadTemplates">从微信读取已有模板</el-button><el-button @click="loadRecords">刷新发送记录</el-button></div>
  <p v-if="loaded&&!templates.length" class="notice">该小程序尚无订阅模板。请先在微信公众平台添加服务通知模板，再点击读取；配置完成并保存后才可开启提醒。</p>
  <article v-for="(label,event) in events" :key="event" class="event-editor"><h3>{{label}}</h3><el-switch v-model="rule(event).enabled" :disabled="readonly" active-text="启用此场景"/><el-select v-model="rule(event).templateId" :disabled="readonly" filterable allow-create placeholder="选择模板，或输入已有模板ID" @change="chooseTemplate(event)"><el-option v-for="template in templates" :key="template.templateId" :label="template.title" :value="template.templateId"/></el-select>
   <p v-if="selectedTemplate(event)" class="template-copy">{{selectedTemplate(event).content}}</p>
   <div v-for="key in Object.keys(rule(event).fields)" :key="key" class="field-row"><code>{{key}}</code><el-select v-model="rule(event).fields[key]" :disabled="readonly" placeholder="对应业务内容"><el-option v-for="(title,source) in sourceNames" :key="source" :value="source" :label="title"/></el-select><el-button v-if="!readonly" link @click="delete rule(event).fields[key]">移除</el-button></div>
   <div v-if="!readonly" class="field-row"><el-input v-model="draftKeys[event]" placeholder="手动添加微信字段，如 thing1"/><el-button @click="addField(event)">添加字段</el-button></div>
  </article>
  <h3>最近发送记录</h3><el-table :data="records" empty-text="暂无服务通知记录"><el-table-column prop="createdAt" label="创建时间" min-width="180"/><el-table-column label="场景" width="110"><template #default="{row}">{{events[row.event]||row.event}}</template></el-table-column><el-table-column label="状态" width="140"><template #default="{row}">{{states[row.status]||row.status}}</template></el-table-column><el-table-column prop="error" label="结果说明" min-width="240"/><el-table-column prop="attempts" label="发送次数" width="90"/></el-table>
 </section>
</template>
<script setup>
import {ref} from 'vue'
import {ElMessage} from 'element-plus'
import request from '@/utils/request'
const props=defineProps({config:{type:Object,required:true},readonly:Boolean})
const events={appointmentBooked:'预约成功',appointmentCancelled:'预约取消',appointmentCompleted:'服务完成',orderPaid:'确认收款',orderShipped:'商品发货'}
const sourceNames={project:'项目名称',store:'服务门店',date:'服务日期',time:'服务时间',status:'服务状态',orderNumber:'订单编号',amount:'订单金额'}
const states={pending:'待发送',sending:'发送中',sent:'微信已接收',failed:'发送失败',unknown:'结果未确认',not_subscribed:'顾客未订阅',skipped:'提醒已关闭'}
const templates=ref([]),records=ref([]),loading=ref(false),loaded=ref(false),draftKeys=ref({})
function rule(event){props.config.notificationTemplates||={};return props.config.notificationTemplates[event]||=( {enabled:false,templateId:'',fields:{}} )}
function selectedTemplate(event){return templates.value.find(t=>t.templateId===rule(event).templateId)}
function chooseTemplate(event){const t=selectedTemplate(event);if(t)rule(event).fields=Object.fromEntries(t.fields.map(key=>[key,rule(event).fields[key]||'project']))}
function addField(event){const key=String(draftKeys.value[event]||'').trim();if(!/^(thing|time|date|phrase|character_string|number|amount|name|phone_number)\d+$/.test(key))return ElMessage.warning('请填写微信模板中的字段名，如 thing1');rule(event).fields[key]='project';draftKeys.value[event]=''}
async function loadTemplates(){loading.value=true;try{const r=await request({url:'/anqi/notificationTemplates'});templates.value=r.data.templates||[];loaded.value=true}catch(e){ElMessage.error(e.message||'微信模板读取失败')}finally{loading.value=false}}
async function loadRecords(){try{const r=await request({url:'/anqi/notifications'});records.value=r.data||[]}catch(e){ElMessage.error(e.message||'记录加载失败')}}
loadRecords()
</script>
<style scoped>
.notification-settings{margin-top:20px}.toolbar{display:flex;gap:12px;margin:16px 0}.event-editor{padding:20px 0;border-bottom:1px solid #eadfd9}.event-editor h3{margin:0 0 14px}.event-editor>.el-select{display:block;margin:14px 0;max-width:600px}.field-row{display:flex;gap:14px;align-items:center;margin:10px 0;max-width:600px}.field-row code{min-width:130px}.template-copy,.notice{white-space:pre-wrap;color:#786d67;line-height:1.7;font-size:13px}
</style>
