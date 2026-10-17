<template>
  <main class="staff-page">
    <header class="staff-header"><div><h1>员工排班</h1><p>按门店安排出勤或休假。已有预约占用的班次，需要先处理预约才能调整。</p></div><el-button :loading="loading" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <el-tabs v-model="tab" @tab-change="closeEditor">
      <el-tab-pane label="班次安排" name="shifts">
        <div class="staff-filters">
          <el-select v-model="storeFilter" placeholder="全部门店" clearable aria-label="按门店筛选"><el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id"/></el-select>
          <el-date-picker v-model="dateFilter" type="date" value-format="YYYY-MM-DD" placeholder="全部日期" aria-label="按日期筛选"/>
          <el-button v-if="canEdit" type="primary" :disabled="loading||!!error" @click="editShift()">新增排班</el-button>
        </div>
        <p v-if="selectedStore" class="staff-help">{{selectedStore.schedulingEnabled?'此门店已按员工排班开放预约。':'此门店尚未启用排班预约，录好班次后可在门店管理中启用。'}} 每次预约占用 {{selectedStore.appointmentDurationMinutes||60}} 分钟。</p>
        <el-table v-loading="loading" :data="visibleShifts" stripe empty-text="还没有班次。先添加员工，再选择门店和日期安排出勤。">
          <el-table-column label="日期" prop="date" width="120"/><el-table-column label="员工" min-width="120"><template #default="{row}">{{staffName(row.staffId)}}</template></el-table-column>
          <el-table-column label="门店" min-width="160"><template #default="{row}">{{storeName(row.storeId)}}</template></el-table-column>
          <el-table-column label="时段" width="140"><template #default="{row}">{{row.startTime}} 至 {{row.endTime}}</template></el-table-column>
          <el-table-column label="安排" width="95"><template #default="{row}"><el-tag :type="row.status==='leave'?'info':'success'">{{row.status==='leave'?'休假':'出勤'}}</el-tag></template></el-table-column>
          <el-table-column label="备注" prop="note" min-width="150" show-overflow-tooltip/>
          <el-table-column v-if="canEdit" label="操作" width="145"><template #default="{row}"><el-button link type="primary" :disabled="ended(row)" @click="editShift(row)">修改</el-button><el-button link type="danger" :disabled="ended(row)||saving" @click="removeShift(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="员工档案" name="staff">
        <div class="staff-filters"><el-button v-if="canEdit" type="primary" :disabled="loading||!!error" @click="editStaff()">添加员工</el-button></div>
        <el-table v-loading="loading" :data="staff" stripe empty-text="尚未添加员工。录入姓名后即可安排班次。">
          <el-table-column label="姓名" prop="name" min-width="120"/><el-table-column label="职务" prop="title" min-width="120"/><el-table-column label="联系电话" prop="phone" min-width="150"/>
          <el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.enabled?'success':'info'">{{row.enabled?'在职':'已停用'}}</el-tag></template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="100"><template #default="{row}"><el-button link type="primary" @click="editStaff(row)">修改</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <section v-if="editor" ref="editorElement" class="staff-editor" aria-label="排班编辑区">
      <h2>{{editor==='staff'?(form.id?'修改员工':'添加员工'):(form.id?'修改班次':'新增排班')}}</h2>
      <el-form label-position="top" @submit.prevent="save">
        <div v-if="editor==='staff'" class="staff-form-grid">
          <el-form-item label="员工姓名" required><el-input v-model="form.name" maxlength="40"/></el-form-item>
          <el-form-item label="职务"><el-input v-model="form.title" maxlength="40" placeholder="如美容师、店长"/></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="11" placeholder="选填，仅后台可见"/></el-form-item>
          <el-form-item label="员工状态"><el-switch v-model="form.enabled" active-text="在职" inactive-text="停用"/></el-form-item>
        </div>
        <div v-else class="staff-form-grid">
          <el-form-item label="员工" required><el-select v-model="form.staffId" filterable placeholder="选择在职员工"><el-option v-for="s in staff.filter(s=>s.enabled)" :key="s.id" :label="s.name" :value="s.id"/></el-select></el-form-item>
          <el-form-item label="门店" required><el-select v-model="form.storeId" placeholder="选择门店"><el-option v-for="s in stores.filter(s=>s.enabled!==false)" :key="s.id" :label="s.name" :value="s.id"/></el-select></el-form-item>
          <el-form-item :label="form.id?'日期':'排班日期（可多选，最多31天）'" required><el-date-picker v-if="form.id" v-model="form.date" type="date" value-format="YYYY-MM-DD"/><el-date-picker v-else v-model="form.dates" type="dates" value-format="YYYY-MM-DD" placeholder="选择一个或多个日期"/></el-form-item>
          <el-form-item label="出勤或休假"><el-radio-group v-model="form.status"><el-radio value="working" label="working">出勤</el-radio><el-radio value="leave" label="leave">休假</el-radio></el-radio-group></el-form-item>
          <el-form-item label="开始时间" required><el-time-select v-model="form.startTime" start="00:00" step="00:15" end="23:45" placeholder="选择开始时间"/></el-form-item>
          <el-form-item label="结束时间" required><el-time-select v-model="form.endTime" start="00:15" step="00:15" end="23:45" placeholder="选择结束时间"/></el-form-item>
          <el-form-item label="备注"><el-input v-model="form.note" maxlength="300" placeholder="如上午班、调休"/></el-form-item>
        </div>
        <p class="staff-help">{{editor==='staff'?'停用员工会保留历史记录；仍有未完成预约时不能停用。':'同一员工在不同门店也不能重复排班。休假需先调整原出勤班次，午休可拆成上午、下午两个班次。'}}</p>
        <el-alert v-if="saveError" :title="saveError" type="error" :closable="false" show-icon/>
        <div class="staff-actions"><el-button type="primary" :loading="saving" native-type="submit">保存</el-button><el-button :disabled="saving" @click="closeEditor">取消</el-button></div>
      </el-form>
    </section>
  </main>
</template>

<script setup>
import {ref,computed,onMounted,nextTick} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import request from '@/utils/request'
import useUserStore from '@/store/modules/user'
const staff=ref([]),shifts=ref([]),stores=ref([]),tab=ref('shifts'),storeFilter=ref(''),dateFilter=ref(''),loading=ref(false),saving=ref(false),error=ref(''),saveError=ref(''),editor=ref(''),form=ref({}),editorElement=ref(null)
const canEdit=computed(()=>useUserStore().permissions.some(p=>['*:*:*','anqi:staff:edit'].includes(p)))
const selectedStore=computed(()=>stores.value.find(s=>s.id===storeFilter.value))
const visibleShifts=computed(()=>shifts.value.filter(s=>(!storeFilter.value||s.storeId===storeFilter.value)&&(!dateFilter.value||s.date===dateFilter.value)).sort((a,b)=>b.date.localeCompare(a.date)||a.startTime.localeCompare(b.startTime)))
const staffName=id=>staff.value.find(s=>s.id===id)?.name||'原员工'
const storeName=id=>stores.value.find(s=>s.id===id)?.name||'原门店'
const ended=s=>Date.parse(s.date+'T'+s.endTime+':00+08:00')<=Date.now()
let sequence=0
async function load(){const seq=++sequence;loading.value=true;error.value='';try{const values=await Promise.all(['staff','shifts','stores'].map(r=>request({url:'/anqi/'+r})));if(seq===sequence)[staff.value,shifts.value,stores.value]=values.map(r=>r.data||[])}catch(e){if(seq===sequence)error.value=e.message||'加载失败，请刷新重试'}finally{if(seq===sequence)loading.value=false}}
function closeEditor(){editor.value='';saveError.value=''}
async function showEditor(type){editor.value=type;saveError.value='';await nextTick();editorElement.value?.scrollIntoView({block:'nearest',behavior:'smooth'})}
function editStaff(row){form.value=row?{...row}:{name:'',title:'',phone:'',enabled:true};showEditor('staff')}
function editShift(row){form.value=row?{...row}:{staffId:'',storeId:storeFilter.value||'',dates:dateFilter.value?[dateFilter.value]:[],startTime:'09:00',endTime:'18:00',status:'working',note:''};showEditor('shifts')}
async function save(){
  if(saving.value)return
  if(editor.value==='staff'&&!form.value.name?.trim())return ElMessage.warning('请填写员工姓名')
  if(editor.value==='shifts'&&(!form.value.staffId||!form.value.storeId||(!form.value.id&&!form.value.dates?.length)))return ElMessage.warning('请完整选择员工、门店和日期')
  saving.value=true;saveError.value=''
  try{await request({url:'/anqi/'+editor.value+(form.value.id?'/'+form.value.id:editor.value==='shifts'?'/batch':''),method:form.value.id?'put':'post',data:{...form.value}});closeEditor();ElMessage.success('已保存');await load()}catch(e){saveError.value=e.message||'保存失败，已保留填写内容'}finally{saving.value=false}
}
async function removeShift(row){try{await ElMessageBox.confirm('删除此班次后，对应时段将不再接受该员工的预约。已有预约时系统会阻止删除。','删除班次',{type:'warning'});saving.value=true;await request({url:'/anqi/shifts/'+row.id,method:'delete'});ElMessage.success('班次已删除');await load()}catch(e){if(!['cancel','close'].includes(e))ElMessage.error(e.message||'删除失败')}finally{saving.value=false}}
onMounted(load)
</script>

<style scoped>
.staff-page{padding:24px;color:var(--el-text-color-primary)}
.staff-header{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}
h1{font-size:24px;margin:0 0 10px}h2{font-size:20px;margin:0 0 20px}p{line-height:1.65;margin:0;color:var(--el-text-color-secondary);max-width:72ch}
.staff-filters{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 16px}.staff-filters .el-select{width:220px}
.staff-help{margin:12px 0 20px;font-size:14px}.staff-editor{margin-top:28px;border-top:1px solid var(--el-border-color);padding-top:24px}
.staff-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;max-width:900px}.staff-form-grid :deep(.el-select),.staff-form-grid :deep(.el-date-editor){width:100%}
.staff-actions{display:flex;gap:12px;margin-top:20px}@media(max-width:700px){.staff-page{padding:16px}.staff-header{align-items:flex-start}.staff-form-grid{grid-template-columns:1fr}.staff-filters>*{width:100%!important}}
</style>
