<template><el-tabs v-model="tab" class="member-tabs"><el-tab-pane label="会员列表" name="list"><Management :key="revision" resource="users"/></el-tab-pane><el-tab-pane v-if="canOperate" label="线下客户办理" name="offline" lazy><OfflineMembers @changed="revision++"/></el-tab-pane></el-tabs></template>
<script setup>
import {computed,ref} from 'vue'
import Management from '../Management.vue'
import OfflineMembers from './OfflineMembers.vue'
import useUserStore from '@/store/modules/user'
const tab=ref('list'),revision=ref(0)
const canOperate=computed(()=>{const p=useUserStore().permissions;return p.includes('*:*:*')||['users:list','users:edit','products:list','stores:list','orders:edit','earnings:list','earnings:edit'].every(k=>p.includes('anqi:'+k))})
</script>
<style scoped>.member-tabs{padding:16px 20px}.member-tabs :deep(.el-tabs__header){margin-bottom:0}</style>
